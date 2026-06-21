namespace SensorScope.Application.Common.Interfaces;

/// <summary>Abstracts the system clock so time-dependent logic (lockout, online/offline, alerts) is testable.</summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
