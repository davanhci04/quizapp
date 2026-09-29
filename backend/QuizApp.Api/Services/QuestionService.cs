using Microsoft.EntityFrameworkCore;
using QuizApp.Api.Data;
using QuizApp.Api.DTOs;
using QuizApp.Api.Entities;

namespace QuizApp.Api.Services;

public interface IQuestionService
{
    Task<PagedResult<QuestionListItemDto>> ListAsync(QuestionQuery query);
    Task<ServiceResult<QuestionDto>> GetAsync(int id);
    Task<ServiceResult<QuestionDto>> CreateAsync(QuestionRequest request, int userId);
    Task<ServiceResult<QuestionDto>> UpdateAsync(int id, QuestionRequest request, bool confirm);
    Task<ServiceResult<DeleteQuestionResult>> DeleteAsync(int id, bool confirm);
    Task<ServiceResult<QuestionDto>> SetStatusAsync(int id, QuestionStatus status);
}

public class QuestionService(QuizAppDbContext db) : IQuestionService
{
    public async Task<PagedResult<QuestionListItemDto>> ListAsync(QuestionQuery query)
    {
        var q = db.Questions.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            q = q.Where(x => x.Content.Contains(search));
        }
        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var category = query.Category.Trim();
            q = q.Where(x => x.Category == category);
        }
        if (query.Difficulty is { } difficulty) q = q.Where(x => x.Difficulty == difficulty);
        if (query.QuestionType is { } type) q = q.Where(x => x.QuestionType == type);
        if (query.Status is { } status) q = q.Where(x => x.Status == status);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.QuestionId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(x => new QuestionListItemDto(
                x.QuestionId, x.Content, x.QuestionType, x.Category, x.Difficulty, x.Status, x.CreatedAt,
                x.Answers.Count, x.QuizQuestions.Count))
            .ToListAsync();

        return new PagedResult<QuestionListItemDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<ServiceResult<QuestionDto>> GetAsync(int id)
    {
        var question = await db.Questions.AsNoTracking().Include(x => x.Answers)
            .SingleOrDefaultAsync(x => x.QuestionId == id);
        if (question is null) return NotFound(id);

        return ServiceResult<QuestionDto>.Ok(ToDto(question, await CountQuizzesAsync(id)));
    }

    public async Task<ServiceResult<QuestionDto>> CreateAsync(QuestionRequest request, int userId)
    {
        if (ValidateAnswers(request.Answers) is { } error)
            return ServiceResult<QuestionDto>.Invalid(error);

        var question = new Question
        {
            CreatedBy = userId,
            Content = request.Content.Trim(),
            QuestionType = request.QuestionType!.Value,
            Category = Clean(request.Category),
            Difficulty = request.Difficulty,
            Answers = request.Answers.Select((a, i) => new Answer
            {
                AnswerText = a.AnswerText.Trim(),
                IsCorrect = a.IsCorrect,
                DisplayOrder = i + 1,
            }).ToList(),
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        return ServiceResult<QuestionDto>.Ok(ToDto(question, 0));
    }

    public async Task<ServiceResult<QuestionDto>> UpdateAsync(int id, QuestionRequest request, bool confirm)
    {
        var question = await db.Questions.Include(x => x.Answers).SingleOrDefaultAsync(x => x.QuestionId == id);
        if (question is null) return NotFound(id);

        if (ValidateAnswers(request.Answers) is { } error)
            return ServiceResult<QuestionDto>.Invalid(error);

        // Mọi AnswerId gửi lên phải thuộc câu hỏi này và không trùng nhau.
        var existing = question.Answers.ToDictionary(a => a.AnswerId);
        var sentIds = request.Answers.Where(a => a.AnswerId.HasValue).Select(a => a.AnswerId!.Value).ToList();
        if (sentIds.Count != sentIds.Distinct().Count() || sentIds.Any(i => !existing.ContainsKey(i)))
            return ServiceResult<QuestionDto>.Invalid("AnswerId không hợp lệ: không thuộc câu hỏi này hoặc bị lặp.");

        var quizCount = await CountQuizzesAsync(id);
        if (quizCount > 0 && !confirm)
            return ServiceResult<QuestionDto>.NeedsConfirmation(
                $"Câu hỏi đang được dùng trong {quizCount} quiz; sửa sẽ ảnh hưởng tất cả. Gửi lại với confirm=true để tiếp tục.",
                quizCount);

        // Đáp án bị gỡ mà đã có người chọn trong bài nộp thì không được xóa (FK Restrict, giữ lịch sử làm bài).
        var removed = question.Answers.Where(a => !sentIds.Contains(a.AnswerId)).ToList();
        if (removed.Count > 0)
        {
            var removedIds = removed.Select(a => a.AnswerId).ToList();
            if (await db.AttemptAnswers.AnyAsync(a => a.SelectedAnswerId != null && removedIds.Contains(a.SelectedAnswerId.Value)))
                return ServiceResult<QuestionDto>.Conflict(
                    "Có đáp án đã được chọn trong bài nộp nên không thể xóa. Hãy giữ lại đáp án đó (chỉ sửa nội dung) hoặc archive câu hỏi.");
            db.Answers.RemoveRange(removed);
        }

        question.Content = request.Content.Trim();
        question.QuestionType = request.QuestionType!.Value;
        question.Category = Clean(request.Category);
        question.Difficulty = request.Difficulty;

        for (var i = 0; i < request.Answers.Count; i++)
        {
            var a = request.Answers[i];
            if (a.AnswerId is { } answerId)
            {
                var entity = existing[answerId];
                entity.AnswerText = a.AnswerText.Trim();
                entity.IsCorrect = a.IsCorrect;
                entity.DisplayOrder = i + 1;
            }
            else
            {
                question.Answers.Add(new Answer
                {
                    AnswerText = a.AnswerText.Trim(),
                    IsCorrect = a.IsCorrect,
                    DisplayOrder = i + 1,
                });
            }
        }

        await db.SaveChangesAsync();
        return ServiceResult<QuestionDto>.Ok(ToDto(question, quizCount));
    }

    public async Task<ServiceResult<DeleteQuestionResult>> DeleteAsync(int id, bool confirm)
    {
        var question = await db.Questions.SingleOrDefaultAsync(x => x.QuestionId == id);
        if (question is null) return ServiceResult<DeleteQuestionResult>.NotFound($"Không tìm thấy câu hỏi {id}.");

        // BR-13: đã có trong bài nộp thì archive, không xóa cứng.
        if (await db.AttemptAnswers.AnyAsync(a => a.QuestionId == id))
        {
            question.Status = QuestionStatus.Archived;
            await db.SaveChangesAsync();
            return ServiceResult<DeleteQuestionResult>.Ok(new DeleteQuestionResult(
                DeleteOutcome.Archived, "Câu hỏi đã có trong bài nộp nên được archive thay vì xóa."));
        }

        // BR-12: cảnh báo trước khi xóa câu hỏi đang được quiz dùng.
        var quizCount = await CountQuizzesAsync(id);
        if (quizCount > 0 && !confirm)
            return ServiceResult<DeleteQuestionResult>.NeedsConfirmation(
                $"Câu hỏi đang được dùng trong {quizCount} quiz; xóa sẽ gỡ nó khỏi các quiz đó. Gửi lại với confirm=true để tiếp tục.",
                quizCount);

        // Gỡ liên kết QuizQuestion trước (FK Restrict); Answer tự cascade theo Question.
        db.QuizQuestions.RemoveRange(db.QuizQuestions.Where(x => x.QuestionId == id));
        db.Questions.Remove(question);
        await db.SaveChangesAsync();

        return ServiceResult<DeleteQuestionResult>.Ok(new DeleteQuestionResult(DeleteOutcome.Deleted, "Đã xóa câu hỏi."));
    }

    public async Task<ServiceResult<QuestionDto>> SetStatusAsync(int id, QuestionStatus status)
    {
        var question = await db.Questions.Include(x => x.Answers).SingleOrDefaultAsync(x => x.QuestionId == id);
        if (question is null) return NotFound(id);

        question.Status = status;
        await db.SaveChangesAsync();
        return ServiceResult<QuestionDto>.Ok(ToDto(question, await CountQuizzesAsync(id)));
    }

    // BR-06: mỗi câu hỏi có >= 2 đáp án và >= 1 đáp án đúng.
    private static string? ValidateAnswers(List<AnswerRequest> answers)
    {
        if (answers.Count < 2) return "Mỗi câu hỏi phải có ít nhất 2 đáp án.";
        if (!answers.Any(a => a.IsCorrect)) return "Mỗi câu hỏi phải có ít nhất 1 đáp án đúng.";
        if (answers.Any(a => string.IsNullOrWhiteSpace(a.AnswerText))) return "Nội dung đáp án không được để trống.";
        return null;
    }

    private Task<int> CountQuizzesAsync(int questionId) =>
        db.QuizQuestions.CountAsync(x => x.QuestionId == questionId);

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ServiceResult<QuestionDto> NotFound(int id) =>
        ServiceResult<QuestionDto>.NotFound($"Không tìm thấy câu hỏi {id}.");

    private static QuestionDto ToDto(Question q, int quizCount) => new(
        q.QuestionId, q.CreatedBy, q.Content, q.QuestionType, q.Category, q.Difficulty, q.Status, q.CreatedAt, quizCount,
        q.Answers.OrderBy(a => a.DisplayOrder)
            .Select(a => new AnswerDto(a.AnswerId, a.AnswerText, a.IsCorrect, a.DisplayOrder)).ToList());
}
