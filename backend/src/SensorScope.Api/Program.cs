using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SensorScope.Api.Auth;
using SensorScope.Api.Demo;
using SensorScope.Api.Hubs;
using SensorScope.Api.Middleware;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Infrastructure;
using SensorScope.Infrastructure.Auth;
using SensorScope.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddScoped<IMonitorBroadcaster, MonitorBroadcaster>();

// Telemetry simulator — keeps the dashboard live (stands in for real devices / MQTT).
if (builder.Configuration.GetValue("Simulator", true))
    builder.Services.AddHostedService<TelemetrySimulator>();

var jwt = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();
if (string.IsNullOrWhiteSpace(jwt.Secret))
    throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        // WebSockets (F3 SignalR) read the token from the query string.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = accessToken;
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200"])
     .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

// Migrate, promote `readings` to a TimescaleDB hypertable, then seed.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SensorScopeDbContext>();
    await db.Database.MigrateAsync();
    await db.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS timescaledb;");
    await db.Database.ExecuteSqlRawAsync(
        "SELECT create_hypertable('readings', 'Time', if_not_exists => TRUE, migrate_data => TRUE);");
    if (app.Configuration.GetValue("SeedDemoData", true))
        await DataSeeder.SeedAsync(db, DateTimeOffset.UtcNow);
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "sensorscope-api" }));
app.MapControllers();
app.MapHub<MonitorHub>("/hubs/monitor");

app.Run();

public partial class Program;
