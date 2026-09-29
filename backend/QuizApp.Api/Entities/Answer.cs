namespace QuizApp.Api.Entities;

public class Answer
{
    public int AnswerId { get; set; }
    public int QuestionId { get; set; }
    public string AnswerText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int DisplayOrder { get; set; }

    public Question Question { get; set; } = null!;
    public ICollection<AttemptAnswer> AttemptAnswers { get; set; } = new List<AttemptAnswer>();
}
