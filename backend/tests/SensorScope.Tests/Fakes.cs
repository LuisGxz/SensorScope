using Microsoft.EntityFrameworkCore;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Domain.Entities;
using SensorScope.Infrastructure.Data;

namespace SensorScope.Tests;

internal sealed class FakeClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset UtcNow { get; set; } = now;
}

internal sealed class FakeJwt(IClock clock) : IJwtTokenService
{
    public (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(User user)
        => ($"access-{user.Id}", clock.UtcNow.AddMinutes(30));
}

internal sealed class FakeBroadcaster : IMonitorBroadcaster
{
    public readonly List<SensorScope.Application.Monitoring.ReadingEventDto> Readings = [];
    public readonly List<SensorScope.Application.Monitoring.AlertDto> Raised = [];
    public readonly List<SensorScope.Application.Monitoring.AlertResolvedDto> Resolved = [];

    public Task ReadingReceived(SensorScope.Application.Monitoring.ReadingEventDto reading) { Readings.Add(reading); return Task.CompletedTask; }
    public Task AlertRaised(SensorScope.Application.Monitoring.AlertDto alert) { Raised.Add(alert); return Task.CompletedTask; }
    public Task AlertResolved(SensorScope.Application.Monitoring.AlertResolvedDto resolved) { Resolved.Add(resolved); return Task.CompletedTask; }
}

/// <summary>InMemory-friendly reading queries: recent values come from the context; series is a no-op (needs TSDB).</summary>
internal sealed class FakeReadingQueries(SensorScopeDbContext db) : IReadingQueries
{
    public Task<IReadOnlyList<SeriesPoint>> GetSeriesAsync(Guid deviceId, DateTimeOffset from, DateTimeOffset to, string bucket, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<SeriesPoint>>([]);

    public async Task<IReadOnlyList<double>> GetRecentValuesAsync(Guid deviceId, int count, CancellationToken ct = default)
    {
        var v = await db.Readings.Where(r => r.DeviceId == deviceId).OrderByDescending(r => r.Time).Take(count).Select(r => r.Value).ToListAsync(ct);
        v.Reverse();
        return v;
    }
}
