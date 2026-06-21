using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SensorScope.Application;
using SensorScope.Application.Common;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Infrastructure.Auth;
using SensorScope.Infrastructure.Common;
using SensorScope.Infrastructure.Data;

namespace SensorScope.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var cs = config.GetConnectionString("Default")
                 ?? "Host=localhost;Port=5433;Database=sensorscope;Username=postgres;Password=sensorscope";

        services.AddDbContext<SensorScopeDbContext>(opt => opt.UseNpgsql(cs, npg => npg.EnableRetryOnFailure(3)));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<SensorScopeDbContext>());
        services.AddScoped<IReadingQueries, ReadingQueries>();

        services.AddSingleton<IClock, SystemClock>();

        services.Configure<JwtSettings>(config.GetSection(JwtSettings.SectionName));
        services.Configure<AuthSettings>(config.GetSection(AuthSettings.SectionName));

        services.AddSingleton<IPasswordHasher, PasswordHasherAdapter>();
        services.AddSingleton<ITokenHasher, TokenHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        services.AddApplication();

        return services;
    }
}
