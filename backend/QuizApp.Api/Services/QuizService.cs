using Microsoft.EntityFrameworkCore;
using QuizApp.Api.Data;
using QuizApp.Api.DTOs;
using QuizApp.Api.Entities;

namespace QuizApp.Api.Services;

public interface IQuizService
{
    Task<PagedResult<QuizListItemDto>> ListAsync(QuizQuery query);
    Task<ServiceResult<QuizDto>> GetAsync(int id);
    Task<ServiceResult<QuizDto>> CreateAsync(QuizRequest request, int userId);
    Task<ServiceResult<QuizDto>> UpdateAsync(int id, QuizRequest request);
    Task<ServiceResult<QuizDto>> SetStatusAsync(int id, QuizStatus status);
    Task<ServiceResult<bool>> DeleteAsync(int id);
    Task<ServiceResult<QuizDto>> AddQuestionAsync(int quizId, AddQuizQuestionRequest request);
    Task<ServiceResult<QuizDto>> UpdateQuestionAsync(int quizId, int questionId, UpdateQuizQuestionRequest request);
    Task<ServiceResult<QuizDto>> RemoveQuestionAsync(int quizId, int questionId);
    Task<ServiceResult<QuizDto>> ReorderQuestionsAsync(int quizId, ReorderQuizQuestionsRequest request);
}

public class QuizService(QuizAppDbContext db) : IQuizService
{
    public async Task<PagedResult<QuizListItemDto>> ListAsync(QuizQuery query)
    {
        var q = db.Quizzes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            q = q.Where(x => x.Title.Contains(search));
        }
        if (query.Status is { } status) q = q.Where(x => x.Status == status);
        if (query.IsPublic is { } isPublic) q = q.Where(x => x.IsPublic == isPublic);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.QuizId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(x => new QuizListItemDto(
                x.QuizId, x.Title, x.Description, x.Duration, x.PassingScore, x.Status, x.IsPublic,
                x.CreatedAt, x.CreatedBy, x.QuizQuestions.Count, x.QuizQuestions.Sum(qq => qq.ScoreWeight)))
            .ToListAsync();

        return new PagedResult<QuizListItemDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<ServiceResult<QuizDto>> GetAsync(int id)
    {
        var dto = await LoadDtoAsync(id);
        return dto is null ? NotFound(id) : ServiceResult<QuizDto>.Ok(dto);
    }

    public async Task<ServiceResult<QuizDto>> CreateAsync(QuizRequest request, int userId)
    {
        var quiz = new Quiz
        {
            CreatedBy = userId,
            Title = request.Title.Trim(),
            Description = Clean(request.Description),
            Duration = request.Duration,
            PassingScore = request.PassingScore,
            IsPublic = request.IsPublic,
            Status = QuizStatus.Draft,
        };
        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync();

        return ServiceResult<QuizDto>.Ok((await LoadDtoAsync(quiz.QuizId))!);
    }

    public async Task<ServiceResult<QuizDto>> UpdateAsync(int id, QuizRequest request)
    {
        var quiz = await db.Quizzes.SingleOrDefaultAsync(x => x.QuizId == id);
        if (quiz is null) return NotFound(id);

        quiz.Title = request.Title.Trim();
        quiz.Description = Clean(request.Description);
        quiz.Duration = request.Duration;
        quiz.PassingScore = request.PassingScore;
        quiz.IsPublic = request.IsPublic;
        await db.SaveChangesAsync();

        return ServiceResult<QuizDto>.Ok((await LoadDtoAsync(id))!);
    }

    public async Task<ServiceResult<QuizDto>> SetStatusAsync(int id, QuizStatus status)
    {
        var quiz = await db.Quizzes.SingleOrDefaultAsync(x => x.QuizId == id);
        if (quiz is null) return NotFound(id);

        // BR-07: quiz phải có >= 1 câu hỏi mới được chuyển sang Published.
        if (status == QuizStatus.Published && !await db.QuizQuestions.AnyAsync(x => x.QuizId == id))
            return ServiceResult<QuizDto>.Invalid("Quiz phải có ít nhất 1 câu hỏi mới được chuyển sang Published.");

        quiz.Status = status;
        await db.SaveChangesAsync();
        return ServiceResult<QuizDto>.Ok((await LoadDtoAsync(id))!);
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        var quiz = await db.Quizzes.SingleOrDefaultAsync(x => x.QuizId == id);
        if (quiz is null) return ServiceResult<bool>.NotFound($"Không tìm thấy quiz {id}.");

        // Đã có bài làm thì giữ lại lịch sử (FK Restrict); Admin nên archive.
        if (await db.QuizAttempts.AnyAsync(x => x.QuizId == id))
            return ServiceResult<bool>.Conflict("Quiz đã có bài làm nên không thể xóa. Hãy chuyển sang Archived.");

        // BR-14: chỉ xóa quiz và liên kết QuizQuestion (cascade), giữ nguyên Question trong ngân hàng.
        db.Quizzes.Remove(quiz);
        await db.SaveChangesAsync();
        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<QuizDto>> AddQuestionAsync(int quizId, AddQuizQuestionRequest request)
    {
        if (!await db.Quizzes.AnyAsync(x => x.QuizId == quizId)) return NotFound(quizId);

        var question = await db.Questions.AsNoTracking()
            .Select(x => new { x.QuestionId, x.Status })
            .SingleOrDefaultAsync(x => x.QuestionId == request.QuestionId);
        if (question is null)
            return ServiceResult<QuizDto>.Invalid($"Không tìm thấy câu hỏi {request.QuestionId}.");
        if (question.Status == QuestionStatus.Archived)
            return ServiceResult<QuizDto>.Invalid("Câu hỏi đã archive, không thể thêm vào quiz.");

        // BR-11: một câu hỏi tối đa 1 lần trong cùng 1 quiz.
        if (await db.QuizQuestions.AnyAsync(x => x.QuizId == quizId && x.QuestionId == request.QuestionId))
            return ServiceResult<QuizDto>.Conflict("Câu hỏi đã có trong quiz này.");

        var order = request.DisplayOrder
            ?? (await db.QuizQuestions.Where(x => x.QuizId == quizId).MaxAsync(x => (int?)x.DisplayOrder) ?? 0) + 1;

        db.QuizQuestions.Add(new QuizQuestion
        {
            QuizId = quizId,
            QuestionId = request.QuestionId,
            DisplayOrder = order,
            ScoreWeight = request.ScoreWeight ?? 1.00m,
        });

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Race condition: UNIQUE (quiz_id, question_id) chặn thêm trùng đồng thời.
            return ServiceResult<QuizDto>.Conflict("Câu hỏi đã có trong quiz này.");
        }

        return ServiceResult<QuizDto>.Ok((await LoadDtoAsync(quizId))!);
    }

    public async Task<ServiceResult<QuizDto>> UpdateQuestionAsync(int quizId, int questionId, UpdateQuizQuestionRequest request)
    {
        var link = await db.QuizQuestions.SingleOrDefaultAsync(x => x.QuizId == quizId && x.QuestionId == questionId);
        if (link is null) return LinkNotFound(quizId, questionId);

        if (request.ScoreWeight is { } weight) link.ScoreWeight = weight;
        if (request.DisplayOrder is { } order) link.DisplayOrder = order;
        await db.SaveChangesAsync();

        return ServiceResult<QuizDto>.Ok((await LoadDtoAsync(quizId))!);
    }

    public async Task<ServiceResult<QuizDto>> RemoveQuestionAsync(int quizId, int questionId)
    {
        var quiz = await db.Quizzes.AsNoTracking().SingleOrDefaultAsync(x => x.QuizId == quizId);
        if (quiz is null) return NotFound(quizId);

        var links = await db.QuizQuestions.Where(x => x.QuizId == quizId).ToListAsync();
        var link = links.SingleOrDefault(x => x.QuestionId == questionId);
        if (link is null) return LinkNotFound(quizId, questionId);

        // BR-07: quiz Published phải luôn còn >= 1 câu hỏi.
        if (quiz.Status == QuizStatus.Published && links.Count == 1)
            return ServiceResult<QuizDto>.Conflict(
                "Quiz đang Published phải còn ít nhất 1 câu hỏi. Hãy chuyển quiz về Draft trước khi gỡ câu cuối.");

        // Chỉ gỡ liên kết; Question vẫn nằm trong ngân hàng.
        db.QuizQuestions.Remove(link);
        await db.SaveChangesAsync();
        return ServiceResult<QuizDto>.Ok((await LoadDtoAsync(quizId))!);
    }

    public async Task<ServiceResult<QuizDto>> ReorderQuestionsAsync(int quizId, ReorderQuizQuestionsRequest request)
    {
        if (!await db.Quizzes.AnyAsync(x => x.QuizId == quizId)) return NotFound(quizId);

        var links = await db.QuizQuestions.Where(x => x.QuizId == quizId).ToListAsync();
        var ids = request.QuestionIds;
        if (ids.Count != ids.Distinct().Count() || !links.Select(x => x.QuestionId).ToHashSet().SetEquals(ids))
            return ServiceResult<QuizDto>.Invalid("Danh sách questionId phải gồm đúng tất cả câu hỏi hiện có trong quiz, không lặp.");

        var byQuestion = links.ToDictionary(x => x.QuestionId);
        for (var i = 0; i < ids.Count; i++)
            byQuestion[ids[i]].DisplayOrder = i + 1;
        await db.SaveChangesAsync();

        return ServiceResult<QuizDto>.Ok((await LoadDtoAsync(quizId))!);
    }

    private async Task<QuizDto?> LoadDtoAsync(int id)
    {
        var quiz = await db.Quizzes.AsNoTracking().SingleOrDefaultAsync(x => x.QuizId == id);
        if (quiz is null) return null;

        var questions = await db.QuizQuestions.AsNoTracking()
            .Where(x => x.QuizId == id)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.QuizQuestionId)
            .Select(x => new QuizQuestionDto(
                x.QuizQuestionId, x.QuestionId, x.Question.Content, x.Question.QuestionType, x.Question.Category,
                x.Question.Difficulty, x.Question.Status, x.DisplayOrder, x.ScoreWeight))
            .ToListAsync();

        return new QuizDto(
            quiz.QuizId, quiz.Title, quiz.Description, quiz.Duration, quiz.PassingScore, quiz.Status, quiz.IsPublic,
            quiz.CreatedAt, quiz.CreatedBy, questions.Sum(x => x.ScoreWeight), questions);
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ServiceResult<QuizDto> NotFound(int id) =>
        ServiceResult<QuizDto>.NotFound($"Không tìm thấy quiz {id}.");

    private static ServiceResult<QuizDto> LinkNotFound(int quizId, int questionId) =>
        ServiceResult<QuizDto>.NotFound($"Câu hỏi {questionId} không có trong quiz {quizId}.");
}
