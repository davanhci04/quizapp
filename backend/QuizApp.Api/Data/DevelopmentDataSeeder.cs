using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using QuizApp.Api.Entities;

namespace QuizApp.Api.Data;

/// <summary>
/// Dữ liệu mẫu cho môi trường Development: một tài khoản Admin, ngân hàng câu hỏi và các quiz đã xuất bản.
/// Chỉ chạy khi chưa có quiz nào nên có thể khởi động lại app nhiều lần mà không bị nhân đôi dữ liệu.
/// Toàn bộ câu hỏi thuộc loại SingleChoice/TrueFalse vì đây là hai loại hiện chấm điểm được.
/// </summary>
public static class DevelopmentDataSeeder
{
    private const string AdminUsername = "admin";
    private const string AdminEmail = "admin@quizapp.local";

    public static async Task SeedAsync(IServiceProvider services, ILogger logger)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<QuizAppDbContext>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        try
        {
            if (await db.Quizzes.AnyAsync())
                return;

            var password = config["Seed:AdminPassword"];
            if (string.IsNullOrWhiteSpace(password))
            {
                logger.LogWarning("Bỏ qua seed dữ liệu mẫu: chưa cấu hình Seed:AdminPassword.");
                return;
            }

            var admin = await db.Users.SingleOrDefaultAsync(u => u.Username == AdminUsername);
            if (admin is null)
            {
                var role = await db.Roles.SingleAsync(r => r.RoleName == "Admin");
                admin = new User { Username = AdminUsername, Email = AdminEmail, RoleId = role.RoleId };
                admin.PasswordHash = new PasswordHasher<User>().HashPassword(admin, password);
                db.Users.Add(admin);
            }

            foreach (var quiz in BuildQuizzes(admin))
                db.Quizzes.Add(quiz);

            await db.SaveChangesAsync();
            logger.LogInformation("Đã seed dữ liệu mẫu: tài khoản '{Username}' và {Count} quiz.", AdminUsername, BuildQuizzes(admin).Count);
        }
        catch (Exception ex)
        {
            // Thường do chưa chạy `dotnet ef database update`. Không làm app dừng vì seed là tùy chọn.
            logger.LogWarning(ex, "Bỏ qua seed dữ liệu mẫu (đã chạy 'dotnet ef database update' chưa?).");
        }
    }

    private static List<Quiz> BuildQuizzes(User admin) =>
    [
        Quiz(admin, "Lập trình cơ bản", "Kiến thức nền tảng về web, cơ sở dữ liệu và thuật toán.",
            duration: 10, passingScore: 5, isPublic: true,
        [
            Choice("HTML là viết tắt của cụm từ nào?", "Lập trình", QuestionDifficulty.Easy,
                "HyperText Markup Language", "High Text Machine Language", "HyperTool Multi Language", "Home Text Markup Language"),
            Choice("Ngôn ngữ nào chạy trực tiếp trên trình duyệt để tạo tương tác cho trang web?", "Lập trình", QuestionDifficulty.Easy,
                "JavaScript", "SQL", "C#", "Bash"),
            Choice("Trong SQL, câu lệnh nào dùng để lấy dữ liệu từ bảng?", "Lập trình", QuestionDifficulty.Easy,
                "SELECT", "INSERT", "DELETE", "UPDATE"),
            TrueFalse("Git là hệ thống quản lý phiên bản phân tán.", true, "Lập trình", QuestionDifficulty.Easy),
            TrueFalse("Trong hầu hết ngôn ngữ lập trình, chỉ số của phần tử đầu tiên trong mảng là 1.", false, "Lập trình", QuestionDifficulty.Medium),
            Choice("Độ phức tạp thời gian của tìm kiếm nhị phân trên mảng đã sắp xếp là gì?", "Lập trình", QuestionDifficulty.Medium,
                "O(log n)", "O(n)", "O(n²)", "O(1)").Weighted(2),
            Choice("Mã trạng thái HTTP nào cho biết không tìm thấy tài nguyên?", "Lập trình", QuestionDifficulty.Easy,
                "404", "200", "500", "301"),
        ]),

        Quiz(admin, "Địa lý thế giới", "Các câu hỏi về quốc gia, thủ đô, đại dương và châu lục.",
            duration: 10, passingScore: 5, isPublic: true,
        [
            Choice("Thủ đô của Nhật Bản là thành phố nào?", "Địa lý", QuestionDifficulty.Easy,
                "Tokyo", "Kyoto", "Osaka", "Seoul"),
            Choice("Đỉnh núi cao nhất Việt Nam là đỉnh nào?", "Địa lý", QuestionDifficulty.Easy,
                "Fansipan", "Bạch Mã", "Ngọc Linh", "Langbiang"),
            Choice("Đại dương nào có diện tích lớn nhất thế giới?", "Địa lý", QuestionDifficulty.Easy,
                "Thái Bình Dương", "Đại Tây Dương", "Ấn Độ Dương", "Bắc Băng Dương"),
            TrueFalse("Sa mạc Sahara nằm ở châu Phi.", true, "Địa lý", QuestionDifficulty.Easy),
            Choice("Quốc gia nào có diện tích lớn nhất thế giới?", "Địa lý", QuestionDifficulty.Medium,
                "Nga", "Canada", "Trung Quốc", "Hoa Kỳ"),
            TrueFalse("Nam Cực là châu lục có đông dân cư sinh sống lâu dài nhất.", false, "Địa lý", QuestionDifficulty.Medium),
            Choice("Thủ đô của Úc là thành phố nào?", "Địa lý", QuestionDifficulty.Medium,
                "Canberra", "Sydney", "Melbourne", "Perth").Weighted(2),
        ]),

        Quiz(admin, "Toán học cơ bản", "Bài kiểm tra nhanh về phép tính, hình học và số học.",
            duration: 15, passingScore: 5, isPublic: true,
        [
            Choice("12 × 12 bằng bao nhiêu?", "Toán học", QuestionDifficulty.Easy,
                "144", "124", "132", "154"),
            Choice("Căn bậc hai của 81 là bao nhiêu?", "Toán học", QuestionDifficulty.Easy,
                "9", "8", "7", "11"),
            TrueFalse("Số 1 là số nguyên tố.", false, "Toán học", QuestionDifficulty.Medium),
            Choice("Chu vi hình vuông có cạnh 5 cm là bao nhiêu?", "Toán học", QuestionDifficulty.Easy,
                "20 cm", "25 cm", "10 cm", "15 cm"),
            Choice("15% của 200 là bao nhiêu?", "Toán học", QuestionDifficulty.Medium,
                "30", "15", "20", "45"),
            Choice("Tổng ba góc trong một tam giác bằng bao nhiêu độ?", "Toán học", QuestionDifficulty.Easy,
                "180°", "90°", "360°", "270°"),
            TrueFalse("Số 0 là số chẵn.", true, "Toán học", QuestionDifficulty.Medium).Weighted(2),
        ]),

        Quiz(admin, "Tiếng Anh cơ bản", "Ngữ pháp và từ vựng tiếng Anh sơ cấp. Dành cho thành viên đã đăng nhập.",
            duration: 10, passingScore: 4, isPublic: false,
        [
            Choice("Chọn từ đúng: \"She ___ to school every day.\"", "Tiếng Anh", QuestionDifficulty.Easy,
                "goes", "go", "going", "gone"),
            Choice("Dạng quá khứ của động từ \"buy\" là gì?", "Tiếng Anh", QuestionDifficulty.Easy,
                "bought", "buyed", "boughted", "buy"),
            TrueFalse("\"Their\" và \"there\" có cùng nghĩa.", false, "Tiếng Anh", QuestionDifficulty.Easy),
            Choice("Từ trái nghĩa của \"increase\" là gì?", "Tiếng Anh", QuestionDifficulty.Medium,
                "decrease", "improve", "expand", "grow"),
            Choice("Chọn từ đúng: \"I have lived here ___ 2020.\"", "Tiếng Anh", QuestionDifficulty.Medium,
                "since", "for", "from", "during").Weighted(2),
            Choice("Dạng số nhiều đúng của \"child\" là gì?", "Tiếng Anh", QuestionDifficulty.Medium,
                "children", "childs", "childes", "childrens"),
        ]),

        Quiz(admin, "Lịch sử Việt Nam", "Các mốc lịch sử quan trọng của dân tộc. Dành cho thành viên đã đăng nhập.",
            duration: 10, passingScore: 4, isPublic: false,
        [
            Choice("Vua nào đã dời đô từ Hoa Lư về Thăng Long vào năm 1010?", "Lịch sử", QuestionDifficulty.Medium,
                "Lý Thái Tổ", "Đinh Tiên Hoàng", "Trần Thái Tông", "Lê Lợi"),
            Choice("Chiến thắng Bạch Đằng năm 1288 do ai chỉ huy?", "Lịch sử", QuestionDifficulty.Medium,
                "Trần Hưng Đạo", "Ngô Quyền", "Lê Lợi", "Quang Trung"),
            TrueFalse("Nước Việt Nam Dân chủ Cộng hòa được thành lập vào năm 1945.", true, "Lịch sử", QuestionDifficulty.Easy),
            Choice("Chiến dịch Điện Biên Phủ kết thúc thắng lợi vào năm nào?", "Lịch sử", QuestionDifficulty.Easy,
                "1954", "1945", "1975", "1968"),
            Choice("Ngày Quốc khánh của Việt Nam là ngày nào?", "Lịch sử", QuestionDifficulty.Easy,
                "2/9", "30/4", "19/5", "1/5"),
            TrueFalse("Hà Nội từng có tên gọi là Thăng Long.", true, "Lịch sử", QuestionDifficulty.Easy).Weighted(2),
        ]),
    ];

    private static Quiz Quiz(User admin, string title, string description, int duration, decimal passingScore, bool isPublic,
        List<SeedQuestion> questions)
    {
        var quiz = new Quiz
        {
            Creator = admin,
            Title = title,
            Description = description,
            Duration = duration,
            PassingScore = passingScore,
            IsPublic = isPublic,
            Status = QuizStatus.Published,
        };

        for (var i = 0; i < questions.Count; i++)
        {
            quiz.QuizQuestions.Add(new QuizQuestion
            {
                Question = questions[i].ToEntity(admin),
                DisplayOrder = i + 1,
                ScoreWeight = questions[i].Weight,
            });
        }

        return quiz;
    }

    /// <summary>Câu hỏi một lựa chọn; vị trí đáp án đúng xoay vòng theo nội dung để không luôn nằm ở đầu.</summary>
    private static SeedQuestion Choice(string content, string category, QuestionDifficulty difficulty, string correct, params string[] wrong)
    {
        var answers = wrong.Select(text => (text, isCorrect: false)).ToList();
        answers.Insert(Math.Abs(content.Length) % (wrong.Length + 1), (correct, true));
        return new SeedQuestion(content, QuestionType.SingleChoice, category, difficulty, answers);
    }

    private static SeedQuestion TrueFalse(string content, bool isTrue, string category, QuestionDifficulty difficulty) =>
        new(content, QuestionType.TrueFalse, category, difficulty, [("Đúng", isTrue), ("Sai", !isTrue)]);

    private sealed record SeedQuestion(
        string Content,
        QuestionType Type,
        string Category,
        QuestionDifficulty Difficulty,
        List<(string Text, bool IsCorrect)> Answers)
    {
        public decimal Weight { get; private init; } = 1.00m;

        public SeedQuestion Weighted(decimal weight) => this with { Weight = weight };

        public Question ToEntity(User creator) => new()
        {
            Creator = creator,
            Content = Content,
            QuestionType = Type,
            Category = Category,
            Difficulty = Difficulty,
            Status = QuestionStatus.Active,
            Answers = Answers.Select((a, i) => new Answer { AnswerText = a.Text, IsCorrect = a.IsCorrect, DisplayOrder = i + 1 }).ToList(),
        };
    }
}
