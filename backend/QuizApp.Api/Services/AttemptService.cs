using Microsoft.EntityFrameworkCore;
using QuizApp.Api.Data;
using QuizApp.Api.DTOs;
using QuizApp.Api.Entities;

namespace QuizApp.Api.Services;

public interface IAttemptService
{
    Task<ServiceResult<StartAttemptResult>> StartAsync(int quizId, int userId);
    Task<ServiceResult<AttemptDto>> GetAsync(int attemptId, int userId);
    Task<ServiceResult<bool>> SaveAnswerAsync(int attemptId, int questionId, SaveAnswerRequest request, int userId);
    Task<ServiceResult<AttemptDto>> SubmitAsync(int attemptId, int userId);
    Task<PagedResult<AttemptListItemDto>> ListAsync(int userId, AttemptListQuery query);
}

/// <summary>Created = false nghĩa là đang tiếp tục bài làm dở dang có sẵn.</summary>
public record StartAttemptResult(AttemptDto Attempt, bool Created);

public class AttemptService(QuizAppDbContext db) : IAttemptService
{
    // Dung sai cho độ trễ mạng/đồng hồ client: nộp trong khoảng này sau hạn chót vẫn được chấp nhận.
    private static readonly TimeSpan Grace = TimeSpan.FromSeconds(10);

    // Loại câu hỏi hiện chấm được: schema AttemptAnswer chỉ lưu 1 selected_answer_id mỗi câu.
    private static readonly QuestionType[] GradableTypes = [QuestionType.SingleChoice, QuestionType.TrueFalse];

    public async Task<ServiceResult<StartAttemptResult>> StartAsync(int quizId, int userId)
    {
        // BR-04: chỉ quiz Published mới cho làm bài.
        var quiz = await db.Quizzes.SingleOrDefaultAsync(x => x.QuizId == quizId && x.Status == QuizStatus.Published);
        if (quiz is null)
            return ServiceResult<StartAttemptResult>.NotFound($"Không tìm thấy quiz {quizId} hoặc quiz chưa được Published.");

        var types = await db.QuizQuestions.Where(x => x.QuizId == quizId)
            .Select(x => x.Question.QuestionType).ToListAsync();
        if (types.Count == 0)
            return ServiceResult<StartAttemptResult>.Invalid("Quiz chưa có câu hỏi.");
        var unsupported = types.Where(t => !GradableTypes.Contains(t)).Distinct().ToList();
        if (unsupported.Count > 0)
            return ServiceResult<StartAttemptResult>.Conflict(
                $"Quiz có loại câu hỏi chưa hỗ trợ chấm điểm: {string.Join(", ", unsupported)}.");

        var now = DateTime.UtcNow;

        // Đã có bài đang làm dở của quiz này: hết giờ thì tự nộp, còn giờ thì tiếp tục bài đó.
        var open = await db.QuizAttempts.Include(x => x.Quiz)
            .SingleOrDefaultAsync(x => x.QuizId == quizId && x.UserId == userId && x.Status == AttemptStatus.InProgress);
        if (open is not null)
        {
            if (!IsExpired(open, now))
                return ServiceResult<StartAttemptResult>.Ok(new StartAttemptResult(await BuildDtoAsync(open), Created: false));
            await FinalizeAsync(open, AttemptStatus.TimedOut, now);
        }

        var attempt = new QuizAttempt
        {
            QuizId = quizId,
            UserId = userId,
            StartedAt = now,
            Status = AttemptStatus.InProgress,
            Quiz = quiz,
        };
        db.QuizAttempts.Add(attempt);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Một request khác vừa tạo bài dở dang cho cùng quiz (bấm đúp, nhiều tab...): dùng lại bài đó.
            db.Entry(attempt).State = EntityState.Detached;
            var existing = await db.QuizAttempts.Include(x => x.Quiz)
                .SingleAsync(x => x.QuizId == quizId && x.UserId == userId && x.Status == AttemptStatus.InProgress);
            return ServiceResult<StartAttemptResult>.Ok(new StartAttemptResult(await BuildDtoAsync(existing), Created: false));
        }

        return ServiceResult<StartAttemptResult>.Ok(new StartAttemptResult(await BuildDtoAsync(attempt), Created: true));
    }

    public async Task<ServiceResult<AttemptDto>> GetAsync(int attemptId, int userId)
    {
        var attempt = await FindOwnAsync(attemptId, userId);
        if (attempt is null) return NotFound(attemptId);

        // BR-05: hết giờ thì tự nộp với các đáp án hiện có (xử lý ngay khi có truy cập).
        await AutoSubmitIfExpiredAsync(attempt);
        return ServiceResult<AttemptDto>.Ok(await BuildDtoAsync(attempt));
    }

    public async Task<ServiceResult<bool>> SaveAnswerAsync(int attemptId, int questionId, SaveAnswerRequest request, int userId)
    {
        var attempt = await FindOwnAsync(attemptId, userId);
        if (attempt is null) return ServiceResult<bool>.NotFound($"Không tìm thấy bài làm {attemptId}.");

        if (attempt.Status != AttemptStatus.InProgress)
            return ServiceResult<bool>.Conflict("Bài làm đã kết thúc, không thể thay đổi đáp án.");
        if (await AutoSubmitIfExpiredAsync(attempt))
            return ServiceResult<bool>.Conflict("Đã hết giờ, bài làm đã được tự động nộp.");

        if (!await db.QuizQuestions.AnyAsync(x => x.QuizId == attempt.QuizId && x.QuestionId == questionId))
            return ServiceResult<bool>.NotFound($"Câu hỏi {questionId} không thuộc quiz này.");

        if (request.SelectedAnswerId is { } answerId
            && !await db.Answers.AnyAsync(x => x.AnswerId == answerId && x.QuestionId == questionId))
            return ServiceResult<bool>.Invalid("Đáp án được chọn không thuộc câu hỏi này.");

        var existing = await db.AttemptAnswers
            .SingleOrDefaultAsync(x => x.AttemptId == attemptId && x.QuestionId == questionId);
        var now = DateTime.UtcNow;
        if (existing is null)
        {
            // is_correct chỉ được chốt khi chấm bài; trong lúc làm bài để false.
            db.AttemptAnswers.Add(new AttemptAnswer
            {
                AttemptId = attemptId,
                QuestionId = questionId,
                SelectedAnswerId = request.SelectedAnswerId,
                IsCorrect = false,
                AnsweredAt = now,
            });
        }
        else
        {
            existing.SelectedAnswerId = request.SelectedAnswerId;
            existing.AnsweredAt = now;
        }

        await db.SaveChangesAsync();
        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<AttemptDto>> SubmitAsync(int attemptId, int userId)
    {
        var attempt = await FindOwnAsync(attemptId, userId);
        if (attempt is null) return NotFound(attemptId);

        // Nộp lại bài đã kết thúc thì trả lại kết quả cũ (idempotent).
        if (attempt.Status == AttemptStatus.InProgress && !await AutoSubmitIfExpiredAsync(attempt))
            await FinalizeAsync(attempt, AttemptStatus.Submitted, DateTime.UtcNow);

        return ServiceResult<AttemptDto>.Ok(await BuildDtoAsync(attempt));
    }

    public async Task<PagedResult<AttemptListItemDto>> ListAsync(int userId, AttemptListQuery query)
    {
        // Tự nộp các bài đã hết giờ của người dùng này để lịch sử luôn phản ánh đúng.
        var open = await db.QuizAttempts.Include(x => x.Quiz)
            .Where(x => x.UserId == userId && x.Status == AttemptStatus.InProgress).ToListAsync();
        foreach (var attempt in open)
            await AutoSubmitIfExpiredAsync(attempt);

        var q = db.QuizAttempts.AsNoTracking().Where(x => x.UserId == userId);
        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(x => x.StartedAt).ThenByDescending(x => x.AttemptId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(x => new AttemptListItemDto(
                x.AttemptId, x.QuizId, x.Quiz.Title, x.Status, x.StartedAt, x.SubmittedAt, x.TotalScore, x.IsPassed))
            .ToListAsync();

        return new PagedResult<AttemptListItemDto>(items, query.Page, query.PageSize, total);
    }

    /// <summary>Lỗi trùng khóa duy nhất của SQL Server (2601: unique index, 2627: unique constraint).</summary>
    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 };

    private Task<QuizAttempt?> FindOwnAsync(int attemptId, int userId) =>
        db.QuizAttempts.Include(x => x.Quiz)
            .SingleOrDefaultAsync(x => x.AttemptId == attemptId && x.UserId == userId);

    private static DateTime Deadline(QuizAttempt attempt) => attempt.StartedAt.AddMinutes(attempt.Quiz.Duration);

    private static bool IsExpired(QuizAttempt attempt, DateTime now) =>
        attempt.Status == AttemptStatus.InProgress && now > Deadline(attempt) + Grace;

    /// <summary>Nếu bài đang làm đã quá hạn thì chấm và đóng bài (TimedOut). Trả về true nếu đã đóng bài.</summary>
    private async Task<bool> AutoSubmitIfExpiredAsync(QuizAttempt attempt)
    {
        var now = DateTime.UtcNow;
        if (!IsExpired(attempt, now)) return false;

        await FinalizeAsync(attempt, AttemptStatus.TimedOut, now);
        return true;
    }

    /// <summary>
    /// Chấm bài: chốt is_correct (snapshot) cho từng câu, tính total_score và is_passed (BR-09),
    /// tạo dòng bỏ trống (selected_answer_id = NULL) cho câu chưa trả lời.
    /// </summary>
    private async Task FinalizeAsync(QuizAttempt attempt, AttemptStatus status, DateTime now)
    {
        var links = await db.QuizQuestions
            .Where(x => x.QuizId == attempt.QuizId)
            .Include(x => x.Question).ThenInclude(q => q.Answers)
            .ToListAsync();
        var saved = await db.AttemptAnswers.Where(x => x.AttemptId == attempt.AttemptId).ToListAsync();
        var savedByQuestion = saved.ToDictionary(x => x.QuestionId);

        decimal total = 0;
        foreach (var link in links)
        {
            if (!savedByQuestion.TryGetValue(link.QuestionId, out var row))
            {
                row = new AttemptAnswer
                {
                    AttemptId = attempt.AttemptId,
                    QuestionId = link.QuestionId,
                    SelectedAnswerId = null,
                    AnsweredAt = now,
                };
                db.AttemptAnswers.Add(row);
            }

            var selected = link.Question.Answers.FirstOrDefault(a => a.AnswerId == row.SelectedAnswerId);
            row.IsCorrect = selected?.IsCorrect == true;
            if (row.IsCorrect) total += link.ScoreWeight;
        }

        attempt.TotalScore = total;
        attempt.IsPassed = total >= attempt.Quiz.PassingScore;
        attempt.Status = status;
        // Hết giờ thì ghi nhận thời điểm nộp là hạn chót, không phải lúc hệ thống xử lý.
        attempt.SubmittedAt = status == AttemptStatus.TimedOut ? Deadline(attempt) : now;
        await db.SaveChangesAsync();
    }

    private async Task<AttemptDto> BuildDtoAsync(QuizAttempt attempt)
    {
        var links = await db.QuizQuestions.AsNoTracking()
            .Where(x => x.QuizId == attempt.QuizId)
            .Include(x => x.Question).ThenInclude(q => q.Answers)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.QuizQuestionId)
            .ToListAsync();
        var saved = (await db.AttemptAnswers.AsNoTracking().Where(x => x.AttemptId == attempt.AttemptId).ToListAsync())
            .ToDictionary(x => x.QuestionId);

        // Chỉ lộ đáp án đúng sau khi bài đã kết thúc.
        var reveal = attempt.Status != AttemptStatus.InProgress;

        var questions = links.Select(l =>
        {
            saved.TryGetValue(l.QuestionId, out var row);
            return new AttemptQuestionDto(
                l.QuestionId,
                l.Question.Content,
                l.Question.QuestionType,
                l.DisplayOrder,
                l.ScoreWeight,
                l.Question.Answers.OrderBy(a => a.DisplayOrder)
                    .Select(a => new AttemptOptionDto(a.AnswerId, a.AnswerText, a.DisplayOrder, reveal ? a.IsCorrect : null))
                    .ToList(),
                row?.SelectedAnswerId,
                reveal ? row?.IsCorrect : null);
        }).ToList();

        return new AttemptDto(
            attempt.AttemptId, attempt.QuizId, attempt.Quiz.Title, attempt.Status, attempt.StartedAt,
            Deadline(attempt), DateTime.UtcNow, attempt.SubmittedAt, attempt.TotalScore,
            links.Sum(l => l.ScoreWeight), attempt.Quiz.PassingScore, attempt.IsPassed, questions);
    }

    private static ServiceResult<AttemptDto> NotFound(int id) =>
        ServiceResult<AttemptDto>.NotFound($"Không tìm thấy bài làm {id}.");
}
