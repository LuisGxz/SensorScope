using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SensorScope.Domain.Entities;
using SensorScope.Domain.Enums;

namespace SensorScope.Infrastructure.Data;

/// <summary>
/// Deterministic demo data from the mockup: operator accounts, the North-Plant device fleet (with
/// thresholds + ingestion keys), ~1h of historical readings per device, and a few alerts. Idempotent.
/// </summary>
public static class DataSeeder
{
    public const string DemoPassword = "Operator123!";

    private record Spec(string Code, string Name, string Location, DeviceKind Kind, string Unit,
        ThresholdDirection Dir, double Warn, double Crit, double Current);

    private static readonly Spec[] Fleet =
    [
        new("PS-101", "Line pressure — Intake A", "Intake A", DeviceKind.Pressure, "bar", ThresholdDirection.Below, 3.5, 3.0, 4.21),
        new("TH-204", "Bearing temp — Compressor B", "Machine room 2", DeviceKind.Temperature, "°C", ThresholdDirection.Above, 75, 85, 78.4),
        new("VB-310", "Vibration — Turbine 3", "Turbine hall", DeviceKind.Vibration, "mm/s", ThresholdDirection.Above, 8, 10, 12.8),
        new("FL-115", "Flow rate — Cooling loop", "Cooling loop", DeviceKind.Flow, "L/min", ThresholdDirection.Below, 150, 100, 231),
        new("PW-401", "Power draw — Cell 4", "Cell 4", DeviceKind.Power, "kW", ThresholdDirection.Above, 70, 85, 48.2),
        new("HM-220", "Humidity — Clean room", "Clean room", DeviceKind.Humidity, "%RH", ThresholdDirection.Above, 60, 70, 41.5),
        new("CO-330", "CO₂ — Warehouse east", "Warehouse east", DeviceKind.AirQuality, "ppm", ThresholdDirection.Above, 600, 800, 618),
        new("TK-508", "Tank level — Reservoir 2", "Reservoir 2", DeviceKind.Level, "%", ThresholdDirection.Below, 20, 10, 86.0),
    ];

    public static string HashKey(string rawKey) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawKey)));

    /// <summary>The demo ingestion key for a device code (also used by the simulator) — e.g. "sk-th-204".</summary>
    public static string DemoKeyFor(string code) => $"sk-{code.ToLowerInvariant()}";

    public static async Task SeedAsync(SensorScopeDbContext db, DateTimeOffset now, CancellationToken ct = default)
    {
        if (await db.Devices.AnyAsync(ct))
            return;

        var hasher = new PasswordHasher<User>();
        User NewUser(string email, string name)
        {
            var u = new User { Email = email, DisplayName = name };
            u.PasswordHash = hasher.HashPassword(u, DemoPassword);
            return u;
        }
        db.Users.AddRange(
            NewUser("operator@sensorscope.app", "L. Chiquito"),
            NewUser("viewer@sensorscope.app", "Plant Viewer"));

        var rng = new Random(2026);
        foreach (var spec in Fleet)
        {
            var device = new Device
            {
                Code = spec.Code,
                Name = spec.Name,
                Location = spec.Location,
                Kind = spec.Kind,
                Unit = spec.Unit,
                Direction = spec.Dir,
                WarnThreshold = spec.Warn,
                CritThreshold = spec.Crit,
                ApiKeyHash = HashKey(DemoKeyFor(spec.Code)),
            };

            // ~1h of history at 30s spacing, drifting from a calm baseline toward the current value.
            const int points = 120;
            var start = now.AddMinutes(-60);
            var baseline = spec.Dir == ThresholdDirection.Above ? spec.Current * 0.7 : spec.Current * 1.2;
            for (var i = 0; i <= points; i++)
            {
                var f = (double)i / points;
                var trend = baseline + (spec.Current - baseline) * f;
                var noise = (rng.NextDouble() - 0.5) * Math.Abs(spec.Current) * 0.03;
                var value = Math.Round(trend + noise, 2);
                db.Readings.Add(new Reading { DeviceId = device.Id, Time = start.AddSeconds(i * 30), Value = value });
            }

            device.LastValue = spec.Current;
            device.LastReadingAt = now;
            device.CurrentLevel = device.Evaluate(spec.Current);
            db.Devices.Add(device);
        }

        await db.SaveChangesAsync(ct);

        // A few alerts mirroring the mockup's feed.
        var byCode = await db.Devices.ToDictionaryAsync(d => d.Code, ct);
        var op = await db.Users.FirstAsync(u => u.Email == "operator@sensorscope.app", ct);

        void Raise(string code, AlertLevel level, double value, double threshold, string msg, TimeSpan ago,
            bool resolved = false, bool acked = false)
        {
            var d = byCode[code];
            db.Alerts.Add(new Alert
            {
                DeviceId = d.Id,
                Level = level,
                Value = value,
                Threshold = threshold,
                Message = msg,
                RaisedAt = now - ago,
                ResolvedAt = resolved ? now - ago + TimeSpan.FromMinutes(9) : null,
                AcknowledgedAt = acked ? now - ago + TimeSpan.FromMinutes(2) : null,
                AcknowledgedById = acked ? op.Id : null,
            });
        }

        Raise("VB-310", AlertLevel.Crit, 12.8, 10.0, "Vibration 12.8 mm/s — exceeded CRIT (10.0)", TimeSpan.FromMinutes(3));
        Raise("TH-204", AlertLevel.Warn, 78.4, 75.0, "Bearing temp 78.4°C — above WARN (75.0)", TimeSpan.FromMinutes(11));
        Raise("CO-330", AlertLevel.Warn, 618, 600, "CO₂ 618 ppm — above WARN (600)", TimeSpan.FromMinutes(24));
        Raise("PS-101", AlertLevel.Warn, 3.2, 3.5, "Pressure 3.2 bar — below WARN (3.5)", TimeSpan.FromMinutes(50), resolved: true);
        Raise("PW-401", AlertLevel.Warn, 72.5, 70.0, "Power draw 72.5 kW — above WARN (70.0)", TimeSpan.FromHours(2), resolved: true, acked: true);

        await db.SaveChangesAsync(ct);
    }
}
