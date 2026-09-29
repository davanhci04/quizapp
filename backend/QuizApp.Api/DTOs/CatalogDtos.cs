using System.ComponentModel.DataAnnotations;

namespace QuizApp.Api.DTOs;

public class CatalogQuery
{
    public string? Search { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

/// <summary>Thông tin quiz hiển thị công khai; không chứa câu hỏi hay đáp án.</summary>
public record CatalogQuizDto(
    int QuizId,
    string Title,
    string? Description,
    int Duration,
    decimal PassingScore,
    bool IsPublic,
    int QuestionCount,
    decimal TotalScoreWeight,
    DateTime CreatedAt);
