using System.ComponentModel.DataAnnotations;
using QuizApp.Api.Entities;

namespace QuizApp.Api.DTOs;

public class AnswerRequest
{
    /// <summary>Có giá trị khi sửa đáp án hiện có; để trống khi thêm đáp án mới. display_order lấy theo vị trí trong mảng.</summary>
    public int? AnswerId { get; set; }

    [Required, StringLength(500)]
    public string AnswerText { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }
}

public class QuestionRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    public QuestionType? QuestionType { get; set; }

    [StringLength(100)]
    public string? Category { get; set; }

    public QuestionDifficulty? Difficulty { get; set; }

    [Required]
    public List<AnswerRequest> Answers { get; set; } = [];
}

public class QuestionQuery
{
    /// <summary>Tìm theo nội dung câu hỏi.</summary>
    public string? Search { get; set; }
    public string? Category { get; set; }
    public QuestionDifficulty? Difficulty { get; set; }
    public QuestionType? QuestionType { get; set; }
    public QuestionStatus? Status { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public record AnswerDto(int AnswerId, string AnswerText, bool IsCorrect, int DisplayOrder);

public record QuestionDto(
    int QuestionId,
    int CreatedBy,
    string Content,
    QuestionType QuestionType,
    string? Category,
    QuestionDifficulty? Difficulty,
    QuestionStatus Status,
    DateTime CreatedAt,
    int QuizCount,
    IReadOnlyList<AnswerDto> Answers);

public record QuestionListItemDto(
    int QuestionId,
    string Content,
    QuestionType QuestionType,
    string? Category,
    QuestionDifficulty? Difficulty,
    QuestionStatus Status,
    DateTime CreatedAt,
    int AnswerCount,
    int QuizCount);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public enum DeleteOutcome { Deleted, Archived }

public record DeleteQuestionResult(DeleteOutcome Outcome, string Message);
