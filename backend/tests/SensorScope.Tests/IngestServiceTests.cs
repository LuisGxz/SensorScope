using Microsoft.EntityFrameworkCore;
using SensorScope.Application.Common.Exceptions;
using SensorScope.Application.Monitoring;
using SensorScope.Domain.Entities;
using SensorScope.Domain.Enums;
using SensorScope.Infrastructure.Auth;
using SensorScope.Infrastructure.Data;

namespace SensorScope.Tests;

public class IngestServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static (IngestService svc, SensorScopeDbContext db, FakeBroadcaster bc, Device device) New()
    {
        var db = new SensorScopeDbContext(
            new DbContextOptionsBuilder<SensorScopeDbContext>().UseInMemoryDatabase($"ss-ing-{Guid.NewGuid()}").Options);
        var device = new Device
        {
            Code = "TH-1", Name = "Bearing temp", Unit = "°C", Kind = DeviceKind.Temperature,
            Direction = ThresholdDirection.Above, WarnThreshold = 75, CritThreshold = 85,
            ApiKeyHash = new TokenHasher().Hash("sk-th-1"),
        };
        db.Devices.Add(device);
        db.SaveChanges();
        var bc = new FakeBroadcaster();
        var svc = new IngestService(db, new FakeClock(Now), new TokenHasher(), bc);
        return (svc, db, bc, device);
    }

    [Fact]
    public async Task Ingest_CrossingWarn_RaisesAlert()
    {
        var (svc, db, bc, d) = New();
        var r = await svc.IngestAsync(d.Id, 80, Now);

        Assert.Equal(AlertLevel.Warn, r.Reading.Level);
        Assert.NotNull(r.Raised);
        Assert.Single(bc.Raised);
        Assert.Equal(1, await db.Alerts.CountAsync(a => a.ResolvedAt == null && a.Level == AlertLevel.Warn));
        Assert.Equal(AlertLevel.Warn, (await db.Devices.FirstAsync()).CurrentLevel);
    }

    [Fact]
    public async Task Ingest_WarnThenCrit_EscalatesResolvingOld()
    {
        var (svc, db, _, d) = New();
        await svc.IngestAsync(d.Id, 80, Now);                       // Warn
        var crit = await svc.IngestAsync(d.Id, 90, Now.AddSeconds(2)); // → Crit

        Assert.NotNull(crit.Raised);
        Assert.Equal(AlertLevel.Crit, crit.Raised!.Level);
        Assert.NotNull(crit.Resolved); // old WARN resolved
        Assert.Equal(1, await db.Alerts.CountAsync(a => a.ResolvedAt == null)); // only the CRIT is active
    }

    [Fact]
    public async Task Ingest_ReturningToOk_ResolvesActiveAlert()
    {
        var (svc, db, _, d) = New();
        await svc.IngestAsync(d.Id, 80, Now);                  // Warn
        var ok = await svc.IngestAsync(d.Id, 60, Now.AddSeconds(2)); // back to OK

        Assert.Equal(AlertLevel.Ok, ok.Reading.Level);
        Assert.NotNull(ok.Resolved);
        Assert.Equal(0, await db.Alerts.CountAsync(a => a.ResolvedAt == null));
    }

    [Fact]
    public async Task Ingest_StableWarn_DoesNotDuplicateAlerts()
    {
        var (svc, db, _, d) = New();
        await svc.IngestAsync(d.Id, 78, Now);
        await svc.IngestAsync(d.Id, 79, Now.AddSeconds(2));
        await svc.IngestAsync(d.Id, 77, Now.AddSeconds(4));
        Assert.Equal(1, await db.Alerts.CountAsync()); // one WARN, still active
    }

    [Fact]
    public async Task IngestByApiKey_ValidKeyWorks_InvalidThrows()
    {
        var (svc, _, _, _) = New();
        var r = await svc.IngestByApiKeyAsync("sk-th-1", 80, Now);
        Assert.Equal(AlertLevel.Warn, r.Reading.Level);

        await Assert.ThrowsAsync<UnauthorizedException>(() => svc.IngestByApiKeyAsync("wrong-key", 80, Now));
    }
}
