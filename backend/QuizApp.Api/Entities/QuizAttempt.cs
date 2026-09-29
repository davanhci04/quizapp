namespace QuizApp.Api.Entities;

public class QuizAttempt
{
    public int AttemptId { get; set; }
    public int QuizId { get; set; }
    public int UserId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public decimal? TotalScore { get; set; }
    public bool? IsPassed { get; set; }
    public AttemptStatus Status { get; set; } = AttemptStatus.InProgress;

    public Quiz Quiz { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<AttemptAnswer> AttemptAnswers { get; set; } = new List<AttemptAnswer>();
}
