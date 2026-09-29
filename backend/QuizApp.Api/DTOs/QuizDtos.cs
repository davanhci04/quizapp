using System.ComponentModel.DataAnnotations;
using QuizApp.Api.Entities;

namespace QuizApp.Api.DTOs;

public class QuizRequest
{
    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    /// <summary>Thời lượng làm bài, tính bằng phút.</summary>
    [Range(1, 1440)]
    public int Duration { get; set; }

    [Range(0, 999.99)]
    public decimal PassingScore { get; set; }

    public bool IsPublic { get; set; }
}

public class QuizStatusRequest
{
    [Required]
    public QuizStatus? Status { get; set; }
}

public class AddQuizQuestionRequest
{
    [Range(1, int.MaxValue)]
    public int QuestionId { get; set; }

    /// <summary>Mặc định 1.00.</summary>
    [Range(0.01, 999.99)]
    public decimal? ScoreWeight { get; set; }

    /// <summary>Mặc định là cuối danh sách.</summary>
    [Range(1, int.MaxValue)]
    public int? DisplayOrder { get; set; }
}

public class UpdateQuizQuestionRequest
{
    [Range(0.01, 999.99)]
    public decimal? ScoreWeight { get; set; }

    [Range(1, int.MaxValue)]
    public int? DisplayOrder { get; set; }
}

public class ReorderQuizQuestionsRequest
{
    /// <summary>Toàn bộ questionId hiện có trong quiz, theo thứ tự mới.</summary>
    [Required]
    public List<int> QuestionIds { get; set; } = [];
}

public class QuizQuery
{
    public string? Search { get; set; }
    public QuizStatus? Status { get; set; }
    public bool? IsPublic { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public record QuizListItemDto(
    int QuizId,
    string Title,
    string? Description,
    int Duration,
    decimal PassingScore,
    QuizStatus Status,
    bool IsPublic,
    DateTime CreatedAt,
    int CreatedBy,
    int QuestionCount,
    decimal TotalScoreWeight);

public record QuizQuestionDto(
    int QuizQuestionId,
    int QuestionId,
    string Content,
    QuestionType QuestionType,
    string? Category,
    QuestionDifficulty? Difficulty,
    QuestionStatus QuestionStatus,
    int DisplayOrder,
    decimal ScoreWeight);

public record QuizDto(
    int QuizId,
    string Title,
    string? Description,
    int Duration,
    decimal PassingScore,
    QuizStatus Status,
    bool IsPublic,
    DateTime CreatedAt,
    int CreatedBy,
    decimal TotalScoreWeight,
    IReadOnlyList<QuizQuestionDto> Questions);
