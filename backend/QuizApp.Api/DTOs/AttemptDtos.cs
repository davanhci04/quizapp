using System.ComponentModel.DataAnnotations;
using QuizApp.Api.Entities;

namespace QuizApp.Api.DTOs;

public class StartAttemptRequest
{
    [Range(1, int.MaxValue)]
    public int QuizId { get; set; }
}

public class SaveAnswerRequest
{
    /// <summary>Đáp án được chọn; null nghĩa là bỏ trống câu này.</summary>
    public int? SelectedAnswerId { get; set; }
}

public class AttemptListQuery
{
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

/// <summary>IsCorrect chỉ có giá trị sau khi bài đã nộp; khi đang làm bài luôn null để không lộ đáp án.</summary>
public record AttemptOptionDto(int AnswerId, string AnswerText, int DisplayOrder, bool? IsCorrect);

public record AttemptQuestionDto(
    int QuestionId,
    string Content,
    QuestionType QuestionType,
    int DisplayOrder,
    decimal ScoreWeight,
    IReadOnlyList<AttemptOptionDto> Answers,
    int? SelectedAnswerId,
    /// <summary>Snapshot lúc chấm bài; null khi chưa nộp.</summary>
    bool? IsCorrect);

public record AttemptDto(
    int AttemptId,
    int QuizId,
    string QuizTitle,
    AttemptStatus Status,
    DateTime StartedAt,
    /// <summary>Hạn chót nộp bài (StartedAt + Quiz.Duration).</summary>
    DateTime ExpiresAt,
    DateTime ServerTime,
    DateTime? SubmittedAt,
    decimal? TotalScore,
    decimal MaxScore,
    decimal PassingScore,
    bool? IsPassed,
    IReadOnlyList<AttemptQuestionDto> Questions);

public record AttemptListItemDto(
    int AttemptId,
    int QuizId,
    string QuizTitle,
    AttemptStatus Status,
    DateTime StartedAt,
    DateTime? SubmittedAt,
    decimal? TotalScore,
    bool? IsPassed);
