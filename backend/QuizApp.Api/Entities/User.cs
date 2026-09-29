namespace QuizApp.Api.Entities;

public class User
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserStatus Status { get; set; } = UserStatus.Active;
    /// <summary>Số lần đăng nhập sai liên tiếp; reset về 0 khi đăng nhập thành công.</summary>
    public int FailedLoginCount { get; set; }
    /// <summary>Thời điểm (UTC) tài khoản được mở khóa; NULL nếu không bị khóa.</summary>
    public DateTime? LockedUntil { get; set; }
    public DateTime CreatedAt { get; set; }

    public Role Role { get; set; } = null!;
    public ICollection<Quiz> CreatedQuizzes { get; set; } = new List<Quiz>();
    public ICollection<Question> CreatedQuestions { get; set; } = new List<Question>();
    public ICollection<QuizAttempt> Attempts { get; set; } = new List<QuizAttempt>();
}
