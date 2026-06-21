using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SensorScope.Infrastructure.Data;

/// <summary>Lets `dotnet ef` build the context at design time without booting the API.</summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<SensorScopeDbContext>
{
    public SensorScopeDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<SensorScopeDbContext>()
            .UseNpgsql("Host=localhost;Port=5433;Database=sensorscope;Username=postgres;Password=sensorscope")
            .Options;
        return new SensorScopeDbContext(options);
    }
}
