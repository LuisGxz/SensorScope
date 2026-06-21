using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SensorScope.Application.Common;
using SensorScope.Application.Common.Exceptions;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Domain.Entities;

namespace SensorScope.Application.Auth;

/// <summary>Operator account lifecycle: registration, password login with lockout, refresh-token rotation.</summary>
public sealed class AuthService(
    IAppDbContext db,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwt,
    ITokenHasher tokenHasher,
    IClock clock,
    IOptions<AuthSettings> authSettings,
    IValidator<RegisterRequest> registerValidator,
    IValidator<LoginRequest> loginValidator,
    IValidator<RefreshRequest> refreshValidator) : IAuthService
{
    private readonly AuthSettings _auth = authSettings.Value;

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        await registerValidator.ValidateAndThrowAsync(request, ct);
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw new ConflictException("That email is already registered.", "email_taken");

        var user = new User { Email = email, DisplayName = request.DisplayName.Trim() };
        user.PasswordHash = passwordHasher.Hash(user, request.Password);
        db.Users.Add(user);

        var tokens = await IssueTokensAsync(user, ct);
        await db.SaveChangesAsync(ct);
        return new AuthResponse(ToDto(user), tokens);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        await loginValidator.ValidateAndThrowAsync(request, ct);
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null)
            throw new UnauthorizedException("Invalid email or password.", "invalid_credentials");

        var now = clock.UtcNow;
        if (user.IsLockedOut(now))
            throw new UnauthorizedException("Account temporarily locked. Try again later.", "locked_out");

        if (!passwordHasher.Verify(user, user.PasswordHash, request.Password))
        {
            user.RegisterFailedLogin(now);
            await db.SaveChangesAsync(ct);
            throw new UnauthorizedException("Invalid email or password.", "invalid_credentials");
        }

        user.RegisterSuccessfulLogin();
        var tokens = await IssueTokensAsync(user, ct);
        await db.SaveChangesAsync(ct);
        return new AuthResponse(ToDto(user), tokens);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        await refreshValidator.ValidateAndThrowAsync(request, ct);
        var hash = tokenHasher.Hash(request.RefreshToken);
        var token = await db.RefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        var now = clock.UtcNow;
        if (token is null || token.User is null || !token.IsActive(now))
            throw new UnauthorizedException("Invalid or expired refresh token.", "invalid_refresh_token");

        var tokens = await IssueTokensAsync(token.User, ct);
        token.Revoke(now, tokenHasher.Hash(tokens.RefreshToken));
        await db.SaveChangesAsync(ct);
        return new AuthResponse(ToDto(token.User), tokens);
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken)) return;
        var hash = tokenHasher.Hash(request.RefreshToken);
        var token = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (token is { RevokedAt: null })
        {
            token.Revoke(clock.UtcNow);
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<MeResponse> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException("User not found.");
        return new MeResponse(ToDto(user));
    }

    private async Task<AuthTokens> IssueTokensAsync(User user, CancellationToken ct)
    {
        var (accessToken, accessExpires) = jwt.CreateAccessToken(user);
        var rawRefresh = tokenHasher.GenerateRawToken();
        var refreshExpires = clock.UtcNow.AddDays(_auth.RefreshTokenDays);
        db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = tokenHasher.Hash(rawRefresh), ExpiresAt = refreshExpires });
        await Task.CompletedTask;
        return new AuthTokens(accessToken, accessExpires, rawRefresh, refreshExpires);
    }

    private static UserDto ToDto(User u) => new(u.Id, u.Email, u.DisplayName);
}
