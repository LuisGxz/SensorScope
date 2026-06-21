using Microsoft.EntityFrameworkCore;
using SensorScope.Application.Common.Exceptions;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Domain.Entities;
using SensorScope.Domain.Enums;

namespace SensorScope.Application.Monitoring;

public sealed class MonitoringService(IAppDbContext db, IReadingQueries readings, IClock clock) : IMonitoringService
{
    public async Task<SummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var devices = await db.Devices.Select(d => new { d.CurrentLevel, d.LastReadingAt }).ToListAsync(ct);
        return new SummaryDto(
            devices.Count,
            devices.Count(d => d.CurrentLevel == AlertLevel.Ok),
            devices.Count(d => d.CurrentLevel == AlertLevel.Warn),
            devices.Count(d => d.CurrentLevel == AlertLevel.Crit),
            devices.Count(d => d.LastReadingAt is { } t && now - t < Device.OfflineAfter));
    }

    public async Task<IReadOnlyList<DeviceSummaryDto>> ListDevicesAsync(CancellationToken ct = default)
    {
        var devices = await db.Devices.OrderBy(d => d.Code).ToListAsync(ct);
        var now = clock.UtcNow;
        var result = new List<DeviceSummaryDto>(devices.Count);
        foreach (var d in devices)
        {
            var spark = await readings.GetRecentValuesAsync(d.Id, 16, ct);
            result.Add(ToDto(d, now, spark));
        }
        return result;
    }

    public async Task<DeviceSummaryDto> GetDeviceAsync(string idOrCode, CancellationToken ct = default)
    {
        var device = await FindDeviceAsync(idOrCode, ct);
        var spark = await readings.GetRecentValuesAsync(device.Id, 24, ct);
        return ToDto(device, clock.UtcNow, spark);
    }

    public async Task<SeriesResponseDto> GetSeriesAsync(Guid deviceId, string range, CancellationToken ct = default)
    {
        if (!await db.Devices.AnyAsync(d => d.Id == deviceId, ct))
            throw new NotFoundException("Device not found.");

        var now = clock.UtcNow;
        var (from, bucket, label) = RangeOf(range, now);
        var points = await readings.GetSeriesAsync(deviceId, from, now, bucket, ct);
        return new SeriesResponseDto(deviceId, label, bucket, points);
    }

    public async Task<IReadOnlyList<AlertDto>> ListAlertsAsync(string filter, CancellationToken ct = default)
    {
        var query = db.Alerts.Include(a => a.Device).Include(a => a.AcknowledgedBy).AsQueryable();
        query = (filter ?? "all").ToLowerInvariant() switch
        {
            "active" => query.Where(a => a.ResolvedAt == null),
            "resolved" => query.Where(a => a.ResolvedAt != null),
            "crit" => query.Where(a => a.Level == AlertLevel.Crit),
            "warn" => query.Where(a => a.Level == AlertLevel.Warn),
            _ => query,
        };

        return await query
            .OrderByDescending(a => a.RaisedAt)
            .Take(50)
            .Select(a => new AlertDto(
                a.Id, a.Device!.Code, a.Device.Name, a.Level, a.Message, a.Value, a.Threshold,
                a.RaisedAt, a.ResolvedAt, a.AcknowledgedAt, a.AcknowledgedBy != null ? a.AcknowledgedBy.DisplayName : null,
                a.ResolvedAt == null))
            .ToListAsync(ct);
    }

    public async Task<DeviceSummaryDto> UpdateThresholdsAsync(Guid deviceId, ThresholdUpdateRequest request, CancellationToken ct = default)
    {
        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId, ct)
                     ?? throw new NotFoundException("Device not found.");
        if (request.WarnThreshold is { } w && request.CritThreshold is { } c)
        {
            var invalid = request.Direction == ThresholdDirection.Above ? c < w : c > w;
            if (invalid)
                throw new BadRequestException("CRIT must be more severe than WARN for the chosen direction.", "invalid_thresholds");
        }

        device.Direction = request.Direction;
        device.WarnThreshold = request.WarnThreshold;
        device.CritThreshold = request.CritThreshold;
        if (device.LastValue is { } v)
            device.CurrentLevel = device.Evaluate(v);
        await db.SaveChangesAsync(ct);

        var spark = await readings.GetRecentValuesAsync(device.Id, 24, ct);
        return ToDto(device, clock.UtcNow, spark);
    }

    public async Task AcknowledgeAlertAsync(Guid alertId, Guid userId, CancellationToken ct = default)
    {
        var alert = await db.Alerts.FirstOrDefaultAsync(a => a.Id == alertId, ct)
                    ?? throw new NotFoundException("Alert not found.");
        if (alert.AcknowledgedAt is null)
        {
            alert.AcknowledgedAt = clock.UtcNow;
            alert.AcknowledgedById = userId;
            await db.SaveChangesAsync(ct);
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<Device> FindDeviceAsync(string idOrCode, CancellationToken ct)
    {
        if (Guid.TryParse(idOrCode, out var id))
            return await db.Devices.FirstOrDefaultAsync(d => d.Id == id, ct) ?? throw new NotFoundException("Device not found.");
        return await db.Devices.FirstOrDefaultAsync(d => d.Code == idOrCode, ct) ?? throw new NotFoundException("Device not found.");
    }

    private static DeviceSummaryDto ToDto(Device d, DateTimeOffset now, IReadOnlyList<double> spark) => new(
        d.Id, d.Code, d.Name, d.Location, d.Kind, d.Unit, d.CurrentLevel, d.LastValue, d.IsOnline(now), d.LastReadingAt,
        d.Direction, d.WarnThreshold, d.CritThreshold, spark);

    private static (DateTimeOffset From, string Bucket, string Label) RangeOf(string? range, DateTimeOffset now) =>
        (range ?? "1h").ToLowerInvariant() switch
        {
            "6h" => (now.AddHours(-6), "2 minutes", "6h"),
            "24h" => (now.AddHours(-24), "10 minutes", "24h"),
            "7d" => (now.AddDays(-7), "1 hour", "7d"),
            _ => (now.AddHours(-1), "30 seconds", "1h"),
        };
}
