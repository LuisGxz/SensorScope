using SensorScope.Domain.Common;
using SensorScope.Domain.Enums;

namespace SensorScope.Domain.Entities;

/// <summary>A monitored sensor. Carries its alert thresholds and a hashed API key for telemetry ingestion.</summary>
public class Device : Entity
{
    /// <summary>Short operator code, e.g. "TH-204".</summary>
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DeviceKind Kind { get; set; }
    public string Unit { get; set; } = string.Empty;

    public ThresholdDirection Direction { get; set; } = ThresholdDirection.Above;
    public double? WarnThreshold { get; set; }
    public double? CritThreshold { get; set; }

    /// <summary>SHA-256 of the device's ingestion API key (the raw key is shown once at creation).</summary>
    public string ApiKeyHash { get; set; } = string.Empty;

    // Denormalized latest state, updated on ingestion, so the device grid is a single cheap query.
    public double? LastValue { get; set; }
    public DateTimeOffset? LastReadingAt { get; set; }
    public AlertLevel CurrentLevel { get; set; } = AlertLevel.Ok;

    /// <summary>How long without a reading before the device counts as offline.</summary>
    public static readonly TimeSpan OfflineAfter = TimeSpan.FromSeconds(30);

    public bool IsOnline(DateTimeOffset now) => LastReadingAt is { } t && now - t < OfflineAfter;

    /// <summary>Classify a value against this device's thresholds.</summary>
    public AlertLevel Evaluate(double value)
    {
        if (Direction == ThresholdDirection.Above)
        {
            if (CritThreshold is { } c && value >= c) return AlertLevel.Crit;
            if (WarnThreshold is { } w && value >= w) return AlertLevel.Warn;
        }
        else
        {
            if (CritThreshold is { } c && value <= c) return AlertLevel.Crit;
            if (WarnThreshold is { } w && value <= w) return AlertLevel.Warn;
        }
        return AlertLevel.Ok;
    }
}
