using Microsoft.EntityFrameworkCore;
using SensorScope.Application.Monitoring;
using SensorScope.Domain.Enums;
using SensorScope.Infrastructure.Data;

namespace SensorScope.Api.Demo;

/// <summary>
/// Stands in for real devices (or an MQTT feed): every couple of seconds it generates a plausible value
/// per device and ingests it through the normal pipeline, so the live dashboard, thresholds and alerts
/// all "breathe". "Hot" devices (those seeded at/over a threshold) oscillate across it so alerts raise
/// and resolve over time. Toggled by the `Simulator` config flag.
/// </summary>
public sealed class TelemetrySimulator(IServiceScopeFactory scopes, ILogger<TelemetrySimulator> logger) : BackgroundService
{
    private const double IntervalSeconds = 2;

    private sealed class Sim
    {
        public Guid DeviceId;
        public double Center;
        public double Amplitude;
        public double Phase;
        public double Step; // radians per tick
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(4), ct);

        List<Sim> sims;
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SensorScopeDbContext>();
            var devices = await db.Devices.ToListAsync(ct);
            var rng = new Random(7);
            sims = devices.Select(d =>
            {
                var baseline = d.LastValue ?? d.WarnThreshold ?? 1;
                var hot = d.CurrentLevel != AlertLevel.Ok && d.WarnThreshold is not null;
                double center, amplitude;
                if (hot)
                {
                    // Centre on the WARN line and swing far enough to cross WARN (and sometimes CRIT) both ways.
                    center = d.WarnThreshold!.Value;
                    var span = d.CritThreshold is { } c ? Math.Abs(c - d.WarnThreshold.Value) : Math.Abs(center) * 0.15;
                    amplitude = Math.Max(span * 1.4, Math.Abs(center) * 0.12);
                }
                else
                {
                    center = baseline;
                    amplitude = Math.Max(Math.Abs(baseline) * 0.04, 0.5);
                }
                var periodSec = rng.Next(30, 70);
                return new Sim
                {
                    DeviceId = d.Id,
                    Center = center,
                    Amplitude = amplitude,
                    Phase = rng.NextDouble() * Math.PI * 2,
                    Step = 2 * Math.PI / (periodSec / IntervalSeconds),
                };
            }).ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Telemetry simulator could not load devices; disabling.");
            return;
        }

        var noise = new Random(99);
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), ct);
                using var scope = scopes.CreateScope();
                var ingest = scope.ServiceProvider.GetRequiredService<IIngestService>();
                foreach (var s in sims)
                {
                    s.Phase += s.Step;
                    var jitter = (noise.NextDouble() - 0.5) * s.Amplitude * 0.15;
                    var value = s.Center + s.Amplitude * Math.Sin(s.Phase) + jitter;
                    await ingest.IngestAsync(s.DeviceId, value, DateTimeOffset.UtcNow, ct);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Telemetry tick failed; continuing.");
            }
        }
    }
}
