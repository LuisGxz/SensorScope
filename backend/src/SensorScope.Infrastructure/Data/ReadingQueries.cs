using Microsoft.EntityFrameworkCore;
using SensorScope.Application.Common.Interfaces;

namespace SensorScope.Infrastructure.Data;

/// <summary>TimescaleDB-backed time-series reads (time_bucket down-sampling + recent-values sparkline).</summary>
public sealed class ReadingQueries(SensorScopeDbContext db) : IReadingQueries
{
    public async Task<IReadOnlyList<SeriesPoint>> GetSeriesAsync(
        Guid deviceId, DateTimeOffset from, DateTimeOffset to, string bucket, CancellationToken ct = default)
    {
        // `bucket` is interpolated as a parameter and cast to interval; never raw user text.
        var rows = await db.Database.SqlQuery<SeriesRow>($@"
            SELECT time_bucket({bucket}::interval, ""Time"") AS ""Time"",
                   avg(""Value"") AS ""Avg"", min(""Value"") AS ""Min"", max(""Value"") AS ""Max""
            FROM readings
            WHERE ""DeviceId"" = {deviceId} AND ""Time"" >= {from} AND ""Time"" <= {to}
            GROUP BY 1 ORDER BY 1").ToListAsync(ct);

        return rows
            .Select(r => new SeriesPoint(r.Time, Math.Round(r.Avg, 2), Math.Round(r.Min, 2), Math.Round(r.Max, 2)))
            .ToList();
    }

    public async Task<IReadOnlyList<double>> GetRecentValuesAsync(Guid deviceId, int count, CancellationToken ct = default)
    {
        var latest = await db.Readings
            .Where(r => r.DeviceId == deviceId)
            .OrderByDescending(r => r.Time)
            .Take(count)
            .Select(r => r.Value)
            .ToListAsync(ct);
        latest.Reverse(); // oldest → newest for the sparkline
        return latest;
    }

    private sealed record SeriesRow(DateTimeOffset Time, double Avg, double Min, double Max);
}
