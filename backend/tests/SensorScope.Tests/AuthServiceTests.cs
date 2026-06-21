using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SensorScope.Application.Auth;
using SensorScope.Application.Common;
using SensorScope.Application.Common.Exceptions;
using SensorScope.Infrastructure.Auth;
using SensorScope.Infrastructure.Data;

namespace SensorScope.Tests;

public class AuthServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static (AuthService svc, SensorScopeDbContext db) New()
    {
        var db = new SensorScopeDbContext(
            new DbContextOptionsBuilder<SensorScopeDbContext>().UseInMemoryDatabase($"ss-auth-{Guid.NewGuid()}").Options);
        var clock = new FakeClock(Now);
        var svc = new AuthService(db, new PasswordHasherAdapter(), new FakeJwt(clock), new TokenHasher(), clock,
            Options.Create(new AuthSettings()), new RegisterRequestValidator(), new LoginRequestValidator(), new RefreshRequestValidator());
        return (svc, db);
    }

    [Fact]
    public async Task Register_CreatesOperator_ThenLoginWorks()
    {
        var (svc, _) = New();
        var reg = await svc.RegisterAsync(new RegisterRequest("op@x.test", "Sup3rSecret", "Op"));
        Assert.Equal("op@x.test", reg.User.Email);

        var login = await svc.LoginAsync(new LoginRequest("op@x.test", "Sup3rSecret"));
        Assert.False(string.IsNullOrWhiteSpace(login.Tokens.RefreshToken));
    }

    [Fact]
    public async Task Register_DuplicateEmail_Throws()
    {
        var (svc, _) = New();
        await svc.RegisterAsync(new RegisterRequest("op@x.test", "Sup3rSecret", "Op"));
        var ex = await Assert.ThrowsAsync<ConflictException>(() => svc.RegisterAsync(new RegisterRequest("op@x.test", "Sup3rSecret", "Op2")));
        Assert.Equal("email_taken", ex.Code);
    }

    [Fact]
    public async Task Login_WrongPassword_FiveTimes_LocksAccount()
    {
        var (svc, _) = New();
        await svc.RegisterAsync(new RegisterRequest("op@x.test", "Sup3rSecret", "Op"));
        for (var i = 0; i < 5; i++)
            await Assert.ThrowsAsync<UnauthorizedException>(() => svc.LoginAsync(new LoginRequest("op@x.test", "nope")));
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => svc.LoginAsync(new LoginRequest("op@x.test", "Sup3rSecret")));
        Assert.Equal("locked_out", ex.Code);
    }

    [Fact]
    public async Task Refresh_RotatesAndRevokesOld()
    {
        var (svc, db) = New();
        var reg = await svc.RegisterAsync(new RegisterRequest("op@x.test", "Sup3rSecret", "Op"));
        var old = reg.Tokens.RefreshToken;
        var refreshed = await svc.RefreshAsync(new RefreshRequest(old));
        Assert.NotEqual(old, refreshed.Tokens.RefreshToken);
        await Assert.ThrowsAsync<UnauthorizedException>(() => svc.RefreshAsync(new RefreshRequest(old)));
    }
}
