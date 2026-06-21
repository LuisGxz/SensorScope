using Microsoft.EntityFrameworkCore;
using SensorScope.Domain.Enums;
using SensorScope.Infrastructure.Data;

namespace SensorScope.Tests;

public class SeedTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static async Task<SensorScopeDbContext> SeededAsync()
    {
        var db = new SensorScopeDbContext(
            new DbContextOptionsBuilder<SensorScopeDbContext>()
                .UseInMemoryDatabase($"ss-{Guid.NewGuid()}").Options);
        await DataSeeder.SeedAsync(db, Now);
        return db;
    }

    [Fact]
    public async Task Seed_CreatesFleetUsersReadingsAndAlerts()
    {
        var db = await SeededAsync();
        Assert.Equal(8, await db.Devices.CountAsync());
        Assert.Equal(2, await db.Users.CountAsync());
        Assert.True(await db.Readings.CountAsync() > 800);
        Assert.Equal(5, await db.Alerts.CountAsync());
    }

    [Fact]
    public async Task Seed_SetsCurrentLevelsFromThresholds()
    {
        var db = await SeededAsync();
        Assert.Equal(AlertLevel.Crit, (await db.Devices.FirstAsync(d => d.Code == "VB-310")).CurrentLevel);
        Assert.Equal(AlertLevel.Warn, (await db.Devices.FirstAsync(d => d.Code == "TH-204")).CurrentLevel);
        Assert.Equal(AlertLevel.Ok, (await db.Devices.FirstAsync(d => d.Code == "PS-101")).CurrentLevel);
    }

    [Fact]
    public async Task Seed_HashesPerDeviceIngestionKey()
    {
        var db = await SeededAsync();
        var th = await db.Devices.FirstAsync(d => d.Code == "TH-204");
        Assert.Equal(DataSeeder.HashKey(DataSeeder.DemoKeyFor("TH-204")), th.ApiKeyHash);
    }

    [Fact]
    public async Task Seed_IsIdempotent()
    {
        var db = await SeededAsync();
        await DataSeeder.SeedAsync(db, Now);
        Assert.Equal(8, await db.Devices.CountAsync());
    }

    [Fact]
    public async Task Seed_HasActiveAndResolvedAlerts()
    {
        var db = await SeededAsync();
        Assert.True(await db.Alerts.AnyAsync(a => a.ResolvedAt == null));   // active
        Assert.True(await db.Alerts.AnyAsync(a => a.ResolvedAt != null));   // resolved
        Assert.True(await db.Alerts.AnyAsync(a => a.AcknowledgedById != null)); // acknowledged
    }
}
