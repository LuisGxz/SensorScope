namespace SensorScope.Domain.Entities;

/// <summary>
/// A single telemetry sample. Stored in a TimescaleDB hypertable partitioned by <see cref="Time"/>;
/// the key is (DeviceId, Time) — no surrogate id, as is idiomatic for high-volume time-series.
/// </summary>
public class Reading
{
    public Guid DeviceId { get; set; }
    public Device? Device { get; set; }

    public DateTimeOffset Time { get; set; }
    public double Value { get; set; }
}
