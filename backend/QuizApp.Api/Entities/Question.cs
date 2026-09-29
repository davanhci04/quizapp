namespace QuizApp.Api.Entities;

/// <summary>Câu hỏi thuộc ngân hàng dùng chung; không gắn trực tiếp với Quiz.</summary>
public class Question
{
    public int QuestionId { get; set; }
    public int CreatedBy { get; set; }
    public string Content { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
    public string? Category { get; set; }
    public QuestionDifficulty? Difficulty { get; set; }
    public QuestionStatus Status { get; set; } = QuestionStatus.Active;
    public DateTime CreatedAt { get; set; }

    public User Creator { get; set; } = null!;
    public ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
    public ICollection<Answer> Answers { get; set; } = new List<Answer>();
    public ICollection<AttemptAnswer> AttemptAnswers { get; set; } = new List<AttemptAnswer>();
}
