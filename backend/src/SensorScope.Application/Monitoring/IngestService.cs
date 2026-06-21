using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SensorScope.Application.Common.Exceptions;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Domain.Entities;
using SensorScope.Domain.Enums;

namespace SensorScope.Application.Monitoring;

public sealed class IngestService(
    IAppDbContext db, IClock clock, ITokenHasher tokenHasher, IMonitorBroadcaster broadcaster) : IIngestService
{
    public async Task<IngestResult> IngestByApiKeyAsync(string rawApiKey, double value, DateTimeOffset? time, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawApiKey))
            throw new UnauthorizedException("Missing API key.", "missing_api_key");
        var hash = tokenHasher.Hash(rawApiKey);
        var device = await db.Devices.FirstOrDefaultAsync(d => d.ApiKeyHash == hash, ct)
                     ?? throw new UnauthorizedException("Invalid API key.", "invalid_api_key");
        return await CoreAsync(device, value, time, ct);
    }

    public async Task<IngestResult> IngestAsync(Guid deviceId, double value, DateTimeOffset? time, CancellationToken ct = default)
    {
        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId, ct)
                     ?? throw new NotFoundException("Device not found.");
        return await CoreAsync(device, value, time, ct);
    }

    private async Task<IngestResult> CoreAsync(Device device, double rawValue, DateTimeOffset? time, CancellationToken ct)
    {
        var t = time ?? clock.UtcNow;
        var value = Math.Round(rawValue, 2);

        db.Readings.Add(new Reading { DeviceId = device.Id, Time = t, Value = value });
        device.LastValue = value;
        device.LastReadingAt = t;
        var newLevel = device.Evaluate(value);
        device.CurrentLevel = newLevel;

        var active = await db.Alerts
            .Where(a => a.DeviceId == device.Id && a.ResolvedAt == null)
            .OrderByDescending(a => a.RaisedAt)
            .FirstOrDefaultAsync(ct);

        AlertDto? raised = null;
        AlertResolvedDto? resolved = null;

        if (newLevel == AlertLevel.Ok)
        {
            if (active is not null)
            {
                active.ResolvedAt = t;
                resolved = new AlertResolvedDto(active.Id, device.Id);
            }
        }
        else if (active is null)
        {
            raised = Raise(device, value, newLevel, t);
        }
        else if (active.Level != newLevel)
        {
            // Escalation/de-escalation between WARN and CRIT: resolve the old, raise the new.
            active.ResolvedAt = t;
            resolved = new AlertResolvedDto(active.Id, device.Id);
            raised = Raise(device, value, newLevel, t);
        }

        await db.SaveChangesAsync(ct);

        var reading = new ReadingEventDto(device.Id, device.Code, t, value, newLevel);
        await broadcaster.ReadingReceived(reading);
        if (resolved is not null) await broadcaster.AlertResolved(resolved);
        if (raised is not null) await broadcaster.AlertRaised(raised);

        return new IngestResult(reading, raised, resolved);
    }

    private AlertDto Raise(Device device, double value, AlertLevel level, DateTimeOffset t)
    {
        var threshold = (level == AlertLevel.Crit ? device.CritThreshold : device.WarnThreshold) ?? 0;
        var dir = device.Direction == ThresholdDirection.Above ? "above" : "below";
        // Invariant formatting so messages read the same regardless of server locale.
        var v = value.ToString("0.##", CultureInfo.InvariantCulture);
        var th = threshold.ToString("0.##", CultureInfo.InvariantCulture);
        var msg = $"{device.Name} {v}{device.Unit} — {dir} {level.ToString().ToUpperInvariant()} ({th})";
        var alert = new Alert
        {
            DeviceId = device.Id, Level = level, Value = value, Threshold = threshold,
            Message = msg, RaisedAt = t,
        };
        db.Alerts.Add(alert);
        return new AlertDto(alert.Id, device.Code, device.Name, level, msg, value, threshold, t, null, null, null, true);
    }
}
