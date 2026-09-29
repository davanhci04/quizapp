namespace QuizApp.Api.Entities;

/// <summary>Bảng trung gian N-N giữa Quiz và Question.</summary>
public class QuizQuestion
{
    public int QuizQuestionId { get; set; }
    public int QuizId { get; set; }
    public int QuestionId { get; set; }
    public int DisplayOrder { get; set; }
    public decimal ScoreWeight { get; set; } = 1.00m;

    public Quiz Quiz { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
