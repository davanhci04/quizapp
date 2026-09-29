using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Api.DTOs;
using QuizApp.Api.Services;

namespace QuizApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await authService.RegisterAsync(request);
        if (result.Succeeded)
            return CreatedAtAction(nameof(Me), null, result.Response);

        return result.Error switch
        {
            AuthError.DuplicateUsername => Problem("Tên đăng nhập đã được sử dụng.", statusCode: StatusCodes.Status409Conflict),
            AuthError.DuplicateEmail => Problem("Email đã được sử dụng.", statusCode: StatusCodes.Status409Conflict),
            _ => Problem(statusCode: StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPost("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await authService.LoginAsync(request);
        if (result.Succeeded)
            return Ok(result.Response);

        return result.Error switch
        {
            AuthError.InvalidCredentials => Problem("Tên đăng nhập/email hoặc mật khẩu không đúng.", statusCode: StatusCodes.Status401Unauthorized),
            AuthError.AccountLocked => Problem(
                $"Tài khoản đang bị khóa đến {result.LockedUntil:u} (UTC).", statusCode: StatusCodes.Status423Locked),
            AuthError.AccountInactive => Problem("Tài khoản không hoạt động.", statusCode: StatusCodes.Status403Forbidden),
            _ => Problem(statusCode: StatusCodes.Status500InternalServerError),
        };
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<UserInfoDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Me()
    {
        if (!int.TryParse(User.FindFirst("sub")?.Value, out var userId))
            return Unauthorized();

        var info = await authService.GetUserInfoAsync(userId);
        return info is null ? Unauthorized() : Ok(info);
    }
}
