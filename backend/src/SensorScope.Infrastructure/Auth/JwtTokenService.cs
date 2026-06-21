using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Domain.Entities;

namespace SensorScope.Infrastructure.Auth;

/// <summary>Issues HMAC-SHA256 signed JWTs carrying the operator's identity claims.</summary>
public sealed class JwtTokenService(IOptions<JwtSettings> settings, IClock clock) : IJwtTokenService
{
    private readonly JwtSettings _settings = settings.Value;

    public (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(User user)
    {
        var expiresAt = clock.UtcNow.AddMinutes(_settings.AccessTokenMinutes);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.DisplayName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _settings.Issuer, audience: _settings.Audience, claims: claims,
            notBefore: clock.UtcNow.UtcDateTime, expires: expiresAt.UtcDateTime, signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
