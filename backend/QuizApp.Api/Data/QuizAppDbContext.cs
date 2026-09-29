using Microsoft.EntityFrameworkCore;
using QuizApp.Api.Entities;

namespace QuizApp.Api.Data;

public class QuizAppDbContext(DbContextOptions<QuizAppDbContext> options) : DbContext(options)
{
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<Answer> Answers => Set<Answer>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();
    public DbSet<AttemptAnswer> AttemptAnswers => Set<AttemptAnswer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        const string utcNow = "SYSUTCDATETIME()";

        modelBuilder.Entity<Role>(e =>
        {
            e.ToTable("Role");
            e.HasKey(x => x.RoleId);
            e.Property(x => x.RoleId).HasColumnName("role_id");
            e.Property(x => x.RoleName).HasColumnName("role_name").HasMaxLength(20).IsRequired();
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(200);
            e.HasIndex(x => x.RoleName).IsUnique();

            e.HasData(
                new Role { RoleId = 1, RoleName = "Admin", Description = "Quản trị viên: quản lý quiz và ngân hàng câu hỏi" },
                new Role { RoleId = 2, RoleName = "User", Description = "Người dùng: làm quiz và xem kết quả" });
        });

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("User");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.RoleId).HasColumnName("role_id");
            e.Property(x => x.Username).HasColumnName("username").HasMaxLength(50).IsRequired();
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(100).IsRequired();
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).HasConversion<string>()
                .HasDefaultValue(UserStatus.Active);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2")
                .HasDefaultValueSql(utcNow);
            e.HasIndex(x => x.Username).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();

            e.HasOne(x => x.Role).WithMany(r => r.Users)
                .HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Quiz>(e =>
        {
            e.ToTable("Quiz");
            e.HasKey(x => x.QuizId);
            e.Property(x => x.QuizId).HasColumnName("quiz_id");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            e.Property(x => x.Duration).HasColumnName("duration");
            e.Property(x => x.PassingScore).HasColumnName("passing_score").HasColumnType("decimal(5,2)");
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).HasConversion<string>()
                .HasDefaultValue(QuizStatus.Draft);
            e.Property(x => x.IsPublic).HasColumnName("is_public").HasDefaultValue(false);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2")
                .HasDefaultValueSql(utcNow);

            e.HasOne(x => x.Creator).WithMany(u => u.CreatedQuizzes)
                .HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Question>(e =>
        {
            e.ToTable("Question");
            e.HasKey(x => x.QuestionId);
            e.Property(x => x.QuestionId).HasColumnName("question_id");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.Content).HasColumnName("content").HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.QuestionType).HasColumnName("question_type").HasMaxLength(30).HasConversion<string>();
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(100);
            e.Property(x => x.Difficulty).HasColumnName("difficulty").HasMaxLength(20).HasConversion<string>();
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).HasConversion<string>()
                .HasDefaultValue(QuestionStatus.Active);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2")
                .HasDefaultValueSql(utcNow);

            e.HasOne(x => x.Creator).WithMany(u => u.CreatedQuestions)
                .HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<QuizQuestion>(e =>
        {
            e.ToTable("QuizQuestion");
            e.HasKey(x => x.QuizQuestionId);
            e.Property(x => x.QuizQuestionId).HasColumnName("quiz_question_id");
            e.Property(x => x.QuizId).HasColumnName("quiz_id");
            e.Property(x => x.QuestionId).HasColumnName("question_id");
            e.Property(x => x.DisplayOrder).HasColumnName("display_order");
            e.Property(x => x.ScoreWeight).HasColumnName("score_weight").HasColumnType("decimal(5,2)")
                .HasDefaultValue(1.00m);
            e.HasIndex(x => new { x.QuizId, x.QuestionId }).IsUnique();

            e.HasOne(x => x.Quiz).WithMany(q => q.QuizQuestions)
                .HasForeignKey(x => x.QuizId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Question).WithMany(q => q.QuizQuestions)
                .HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Answer>(e =>
        {
            e.ToTable("Answer");
            e.HasKey(x => x.AnswerId);
            e.Property(x => x.AnswerId).HasColumnName("answer_id");
            e.Property(x => x.QuestionId).HasColumnName("question_id");
            e.Property(x => x.AnswerText).HasColumnName("answer_text").HasMaxLength(500).IsRequired();
            e.Property(x => x.IsCorrect).HasColumnName("is_correct").HasDefaultValue(false);
            e.Property(x => x.DisplayOrder).HasColumnName("display_order");

            e.HasOne(x => x.Question).WithMany(q => q.Answers)
                .HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizAttempt>(e =>
        {
            e.ToTable("QuizAttempt");
            e.HasKey(x => x.AttemptId);
            e.Property(x => x.AttemptId).HasColumnName("attempt_id");
            e.Property(x => x.QuizId).HasColumnName("quiz_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.StartedAt).HasColumnName("started_at").HasColumnType("datetime2");
            e.Property(x => x.SubmittedAt).HasColumnName("submitted_at").HasColumnType("datetime2");
            e.Property(x => x.TotalScore).HasColumnName("total_score").HasColumnType("decimal(5,2)");
            e.Property(x => x.IsPassed).HasColumnName("is_passed");
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).HasConversion<string>()
                .HasDefaultValue(AttemptStatus.InProgress);

            e.HasOne(x => x.Quiz).WithMany(q => q.Attempts)
                .HasForeignKey(x => x.QuizId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.User).WithMany(u => u.Attempts)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AttemptAnswer>(e =>
        {
            e.ToTable("AttemptAnswer");
            e.HasKey(x => x.AttemptAnswerId);
            e.Property(x => x.AttemptAnswerId).HasColumnName("attempt_answer_id");
            e.Property(x => x.AttemptId).HasColumnName("attempt_id");
            e.Property(x => x.QuestionId).HasColumnName("question_id");
            e.Property(x => x.SelectedAnswerId).HasColumnName("selected_answer_id");
            e.Property(x => x.IsCorrect).HasColumnName("is_correct");
            e.Property(x => x.AnsweredAt).HasColumnName("answered_at").HasColumnType("datetime2");

            e.HasOne(x => x.Attempt).WithMany(a => a.AttemptAnswers)
                .HasForeignKey(x => x.AttemptId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Question).WithMany(q => q.AttemptAnswers)
                .HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.SelectedAnswer).WithMany(a => a.AttemptAnswers)
                .HasForeignKey(x => x.SelectedAnswerId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
