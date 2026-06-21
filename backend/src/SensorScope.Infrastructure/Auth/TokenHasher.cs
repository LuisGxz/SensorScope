using System.Security.Cryptography;
using System.Text;
using SensorScope.Application.Common.Interfaces;

namespace SensorScope.Infrastructure.Auth;

/// <summary>Generates URL-safe random tokens and hashes them with SHA-256 for at-rest storage.</summary>
public sealed class TokenHasher : ITokenHasher
{
    public string GenerateRawToken() => Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
    public string Hash(string rawToken) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
