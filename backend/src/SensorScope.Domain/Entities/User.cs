using SensorScope.Domain.Common;

namespace SensorScope.Domain.Entities;

/// <summary>An operator account that views the dashboard and acknowledges alerts.</summary>
public class User : Entity
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    public int FailedLoginCount { get; set; }
    public DateTimeOffset? LockedOutUntil { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public const int MaxFailedLogins = 5;
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    public bool IsLockedOut(DateTimeOffset now) => LockedOutUntil is { } until && until > now;

    public void RegisterFailedLogin(DateTimeOffset now)
    {
        FailedLoginCount++;
        if (FailedLoginCount >= MaxFailedLogins)
        {
            LockedOutUntil = now.Add(LockoutDuration);
            FailedLoginCount = 0;
        }
    }

    public void RegisterSuccessfulLogin()
    {
        FailedLoginCount = 0;
        LockedOutUntil = null;
    }
}
