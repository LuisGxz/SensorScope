using SensorScope.Domain.Common;
using SensorScope.Domain.Enums;

namespace SensorScope.Domain.Entities;

/// <summary>A threshold breach. Raised when a device crosses WARN/CRIT and resolved when it returns to OK.</summary>
public class Alert : Entity
{
    public Guid DeviceId { get; set; }
    public Device? Device { get; set; }

    public AlertLevel Level { get; set; }
    public string Message { get; set; } = string.Empty;
    public double Value { get; set; }
    public double Threshold { get; set; }

    public DateTimeOffset RaisedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }

    public DateTimeOffset? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedById { get; set; }
    public User? AcknowledgedBy { get; set; }

    public bool IsActive => ResolvedAt is null;
}
