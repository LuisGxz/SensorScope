namespace SensorScope.Application.Auth;

public record RegisterRequest(string Email, string Password, string DisplayName);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record LogoutRequest(string RefreshToken);

public record UserDto(Guid Id, string Email, string DisplayName);
public record AuthTokens(string AccessToken, DateTimeOffset AccessTokenExpiresAt, string RefreshToken, DateTimeOffset RefreshTokenExpiresAt);
public record AuthResponse(UserDto User, AuthTokens Tokens);
public record MeResponse(UserDto User);
