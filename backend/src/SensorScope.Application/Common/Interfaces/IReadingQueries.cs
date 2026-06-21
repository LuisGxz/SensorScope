namespace SensorScope.Application.Common.Interfaces;

/// <summary>A time-bucketed aggregate point (TimescaleDB time_bucket).</summary>
public record SeriesPoint(DateTimeOffset Time, double Avg, double Min, double Max);

/// <summary>
/// Time-series reads that need TimescaleDB SQL (time_bucket). Implemented in Infrastructure so the
/// Application stays provider-agnostic.
/// </summary>
public interface IReadingQueries
{
    /// <summary>Down-sampled series for a device over [from, to] using the given bucket (e.g. "30 seconds").</summary>
    Task<IReadOnlyList<SeriesPoint>> GetSeriesAsync(Guid deviceId, DateTimeOffset from, DateTimeOffset to, string bucket, CancellationToken ct = default);

    /// <summary>The most recent N raw values for a sparkline (oldest → newest).</summary>
    Task<IReadOnlyList<double>> GetRecentValuesAsync(Guid deviceId, int count, CancellationToken ct = default);
}
