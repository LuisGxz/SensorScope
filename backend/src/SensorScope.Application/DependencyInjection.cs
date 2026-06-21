using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SensorScope.Application.Auth;
using SensorScope.Application.Monitoring;

namespace SensorScope.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IMonitoringService, MonitoringService>();
        services.AddScoped<IIngestService, IngestService>();
        return services;
    }
}
