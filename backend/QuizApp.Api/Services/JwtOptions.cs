namespace QuizApp.Api.Services;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    /// <summary>Khóa ký HS256, tối thiểu 32 ký tự. Không đặt trong appsettings.json (dùng user-secrets / biến môi trường).</summary>
    public string Key { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;
}
