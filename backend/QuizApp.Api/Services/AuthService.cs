using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using QuizApp.Api.Data;
using QuizApp.Api.DTOs;
using QuizApp.Api.Entities;

namespace QuizApp.Api.Services;

public enum AuthError
{
    None,
    DuplicateUsername,
    DuplicateEmail,
    InvalidCredentials,
    AccountLocked,
    AccountInactive,
}

public record AuthResult(AuthResponse? Response, AuthError Error = AuthError.None, DateTime? LockedUntil = null)
{
    public bool Succeeded => Error == AuthError.None;
}

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request);
    Task<AuthResult> LoginAsync(LoginRequest request);
    Task<UserInfoDto?> GetUserInfoAsync(int userId);
}

public class AuthService(QuizAppDbContext db, ITokenService tokenService) : IAuthService
{
    // BR-03: sai mật khẩu 5 lần liên tiếp -> khóa 30 phút.
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(30);
    private const string UserRoleName = "User";

    private readonly PasswordHasher<User> _hasher = new();

    public async Task<AuthResult> RegisterAsync(RegisterRequest request)
    {
        var username = request.Username.Trim();
        var email = request.Email.Trim();

        // BR-01: username và email phải duy nhất (so sánh không phân biệt hoa thường theo collation của DB).
        if (await db.Users.AnyAsync(u => u.Username == username))
            return new AuthResult(null, AuthError.DuplicateUsername);
        if (await db.Users.AnyAsync(u => u.Email == email))
            return new AuthResult(null, AuthError.DuplicateEmail);

        var role = await db.Roles.SingleAsync(r => r.RoleName == UserRoleName);
        var user = new User { Username = username, Email = email, RoleId = role.RoleId, Role = role };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);
        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Race condition: có người đăng ký trùng giữa lúc kiểm tra và lúc lưu (UNIQUE index chặn).
            db.Entry(user).State = EntityState.Detached;
            if (await db.Users.AnyAsync(u => u.Username == username))
                return new AuthResult(null, AuthError.DuplicateUsername);
            if (await db.Users.AnyAsync(u => u.Email == email))
                return new AuthResult(null, AuthError.DuplicateEmail);
            throw;
        }

        return new AuthResult(BuildResponse(user));
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request)
    {
        var identifier = request.UsernameOrEmail.Trim();
        var user = await db.Users.Include(u => u.Role)
            .SingleOrDefaultAsync(u => u.Username == identifier || u.Email == identifier);

        if (user is null)
            return new AuthResult(null, AuthError.InvalidCredentials);

        var now = DateTime.UtcNow;

        if (user.Status == UserStatus.Locked)
        {
            if (user.LockedUntil is { } until && until > now)
                return new AuthResult(null, AuthError.AccountLocked, until);

            // Hết thời gian khóa: tự mở khóa.
            user.Status = UserStatus.Active;
            user.FailedLoginCount = 0;
            user.LockedUntil = null;
        }

        if (user.Status == UserStatus.Inactive)
            return new AuthResult(null, AuthError.AccountInactive);

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verify == PasswordVerificationResult.Failed)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= MaxFailedAttempts)
            {
                user.Status = UserStatus.Locked;
                user.LockedUntil = now.Add(LockDuration);
                await db.SaveChangesAsync();
                return new AuthResult(null, AuthError.AccountLocked, user.LockedUntil);
            }

            await db.SaveChangesAsync();
            return new AuthResult(null, AuthError.InvalidCredentials);
        }

        if (verify == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = _hasher.HashPassword(user, request.Password);

        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        await db.SaveChangesAsync();

        return new AuthResult(BuildResponse(user));
    }

    public async Task<UserInfoDto?> GetUserInfoAsync(int userId) =>
        await db.Users.Where(u => u.UserId == userId)
            .Select(u => new UserInfoDto(u.UserId, u.Username, u.Email, u.Role.RoleName))
            .SingleOrDefaultAsync();

    private AuthResponse BuildResponse(User user)
    {
        var (token, expiresAt) = tokenService.CreateToken(user);
        return new AuthResponse(token, expiresAt, new UserInfoDto(user.UserId, user.Username, user.Email, user.Role.RoleName));
    }
}
