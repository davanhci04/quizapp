namespace QuizApp.Api.Entities;

public class Quiz
{
    public int QuizId { get; set; }
    public int CreatedBy { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Thời lượng làm bài, tính bằng phút.</summary>
    public int Duration { get; set; }
    public decimal PassingScore { get; set; }
    public QuizStatus Status { get; set; } = QuizStatus.Draft;
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; }

    public User Creator { get; set; } = null!;
    public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
    public ICollection<QuizAttempt> Attempts { get; set; } = new List<QuizAttempt>();
}
