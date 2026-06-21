using SensorScope.Domain.Entities;
using SensorScope.Domain.Enums;

namespace SensorScope.Tests;

public class DeviceDomainTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(70, AlertLevel.Ok)]
    [InlineData(78, AlertLevel.Warn)]
    [InlineData(90, AlertLevel.Crit)]
    public void Evaluate_Above_ClassifiesByUpperThresholds(double value, AlertLevel expected)
    {
        var d = new Device { Direction = ThresholdDirection.Above, WarnThreshold = 75, CritThreshold = 85 };
        Assert.Equal(expected, d.Evaluate(value));
    }

    [Theory]
    [InlineData(231, AlertLevel.Ok)]
    [InlineData(140, AlertLevel.Warn)]
    [InlineData(90, AlertLevel.Crit)]
    public void Evaluate_Below_ClassifiesByLowerThresholds(double value, AlertLevel expected)
    {
        var d = new Device { Direction = ThresholdDirection.Below, WarnThreshold = 150, CritThreshold = 100 };
        Assert.Equal(expected, d.Evaluate(value));
    }

    [Fact]
    public void IsOnline_TrueOnlyWithinTimeout()
    {
        var d = new Device { LastReadingAt = Now };
        Assert.True(d.IsOnline(Now.AddSeconds(10)));
        Assert.False(d.IsOnline(Now.Add(Device.OfflineAfter).AddSeconds(1)));
        Assert.False(new Device { LastReadingAt = null }.IsOnline(Now));
    }

    [Fact]
    public void Lockout_LocksAfterFiveFailures()
    {
        var u = new User();
        for (var i = 0; i < User.MaxFailedLogins; i++) u.RegisterFailedLogin(Now);
        Assert.True(u.IsLockedOut(Now));
        u.RegisterSuccessfulLogin();
        Assert.False(u.IsLockedOut(Now));
    }

    [Fact]
    public void RefreshToken_RevokeMakesInactive()
    {
        var t = new RefreshToken { ExpiresAt = Now.AddDays(1) };
        Assert.True(t.IsActive(Now));
        t.Revoke(Now, "next");
        Assert.False(t.IsActive(Now));
        Assert.Equal("next", t.ReplacedByTokenHash);
    }
}
