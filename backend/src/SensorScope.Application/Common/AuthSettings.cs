namespace SensorScope.Application.Common;

/// <summary>Lifetimes for refresh tokens (bound from the "Auth" config section).</summary>
public class AuthSettings
{
    public const string SectionName = "Auth";
    public int RefreshTokenDays { get; set; } = 7;
}
