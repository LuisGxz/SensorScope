using Microsoft.EntityFrameworkCore;
using SensorScope.Application.Monitoring;
using SensorScope.Domain.Enums;
using SensorScope.Infrastructure.Data;

namespace SensorScope.Tests;

public class MonitoringServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static async Task<(MonitoringService svc, SensorScopeDbContext db)> SeededAsync()
    {
        var db = new SensorScopeDbContext(
            new DbContextOptionsBuilder<SensorScopeDbContext>().UseInMemoryDatabase($"ss-mon-{Guid.NewGuid()}").Options);
        await DataSeeder.SeedAsync(db, Now);
        var svc = new MonitoringService(db, new FakeReadingQueries(db), new FakeClock(Now.AddSeconds(5)));
        return (svc, db);
    }

    [Fact]
    public async Task Summary_CountsLevelsAndOnline()
    {
        var (svc, _) = await SeededAsync();
        var s = await svc.GetSummaryAsync();
        Assert.Equal(8, s.Total);
        Assert.Equal(1, s.Crit);   // VB-310
        Assert.Equal(2, s.Warn);   // TH-204, CO-330
        Assert.Equal(5, s.Ok);
        Assert.Equal(8, s.Online); // all seeded with LastReadingAt = now
    }

    [Fact]
    public async Task ListDevices_IncludesSparklineAndOnline()
    {
        var (svc, _) = await SeededAsync();
        var devices = await svc.ListDevicesAsync();
        Assert.Equal(8, devices.Count);
        var th = devices.First(d => d.Code == "TH-204");
        Assert.Equal(AlertLevel.Warn, th.Level);
        Assert.True(th.Online);
        Assert.NotEmpty(th.Sparkline);
    }

    [Fact]
    public async Task ListAlerts_FilterActiveVsResolved()
    {
        var (svc, _) = await SeededAsync();
        var active = await svc.ListAlertsAsync("active");
        var resolved = await svc.ListAlertsAsync("resolved");
        Assert.All(active, a => Assert.True(a.Active));
        Assert.All(resolved, a => Assert.False(a.Active));
        Assert.Equal(3, active.Count);   // VB-310, TH-204, CO-330
        Assert.Equal(2, resolved.Count); // PS-101, PW-401
    }

    [Fact]
    public async Task UpdateThresholds_RecomputesCurrentLevel()
    {
        var (svc, db) = await SeededAsync();
        var th = await db.Devices.FirstAsync(d => d.Code == "TH-204"); // 78.4°C, currently Warn (warn 75)
        // Raise the WARN threshold above the current value → should drop to OK.
        var updated = await svc.UpdateThresholdsAsync(th.Id, new ThresholdUpdateRequest(ThresholdDirection.Above, 80, 90));
        Assert.Equal(AlertLevel.Ok, updated.Level);
    }

    [Fact]
    public async Task UpdateThresholds_InvalidOrder_Throws()
    {
        var (svc, db) = await SeededAsync();
        var th = await db.Devices.FirstAsync(d => d.Code == "TH-204");
        await Assert.ThrowsAsync<SensorScope.Application.Common.Exceptions.BadRequestException>(
            () => svc.UpdateThresholdsAsync(th.Id, new ThresholdUpdateRequest(ThresholdDirection.Above, 90, 80)));
    }

    [Fact]
    public async Task Acknowledge_SetsAckFields()
    {
        var (svc, db) = await SeededAsync();
        var op = await db.Users.FirstAsync();
        var alert = await db.Alerts.FirstAsync(a => a.AcknowledgedAt == null);
        await svc.AcknowledgeAlertAsync(alert.Id, op.Id);
        var reloaded = await db.Alerts.FirstAsync(a => a.Id == alert.Id);
        Assert.NotNull(reloaded.AcknowledgedAt);
        Assert.Equal(op.Id, reloaded.AcknowledgedById);
    }
}
