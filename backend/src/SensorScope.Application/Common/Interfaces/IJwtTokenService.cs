using SensorScope.Domain.Entities;

namespace SensorScope.Application.Common.Interfaces;

/// <summary>Issues short-lived signed access tokens (JWT) for an authenticated operator.</summary>
public interface IJwtTokenService
{
    (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(User user);
}
