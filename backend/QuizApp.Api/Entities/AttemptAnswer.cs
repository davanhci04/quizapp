namespace QuizApp.Api.Entities;

public class AttemptAnswer
{
    public int AttemptAnswerId { get; set; }
    public int AttemptId { get; set; }
    public int QuestionId { get; set; }
    /// <summary>NULL nghĩa là User bỏ trống câu này.</summary>
    public int? SelectedAnswerId { get; set; }
    /// <summary>Snapshot tại lúc chấm bài; không tính lại từ Answer.IsCorrect.</summary>
    public bool IsCorrect { get; set; }
    public DateTime AnsweredAt { get; set; }

    public QuizAttempt Attempt { get; set; } = null!;
    public Question Question { get; set; } = null!;
    public Answer? SelectedAnswer { get; set; }
}
