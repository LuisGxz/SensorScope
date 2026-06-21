namespace SensorScope.Application.Common.Interfaces;

/// <summary>Generates and hashes opaque secrets (refresh tokens, device API keys) with SHA-256.</summary>
public interface ITokenHasher
{
    string GenerateRawToken();
    string Hash(string rawToken);
}
