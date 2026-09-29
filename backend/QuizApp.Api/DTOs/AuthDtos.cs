using System.ComponentModel.DataAnnotations;

namespace QuizApp.Api.DTOs;

public class RegisterRequest
{
    [Required, StringLength(50, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(100)]
    public string Email { get; set; } = string.Empty;

    // BR-02: tối thiểu 8 ký tự, có chữ và số.
    [Required, StringLength(100, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*\p{L})(?=.*\d).+$", ErrorMessage = "Mật khẩu phải có cả chữ và số.")]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    /// <summary>Username hoặc email.</summary>
    [Required, StringLength(100)]
    public string UsernameOrEmail { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string Password { get; set; } = string.Empty;
}

public record UserInfoDto(int UserId, string Username, string Email, string Role);

public record AuthResponse(string Token, DateTime ExpiresAt, UserInfoDto User);
