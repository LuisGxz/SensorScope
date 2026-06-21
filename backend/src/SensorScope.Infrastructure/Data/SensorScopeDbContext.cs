using Microsoft.EntityFrameworkCore;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Domain.Entities;

namespace SensorScope.Infrastructure.Data;

public class SensorScopeDbContext(DbContextOptions<SensorScopeDbContext> options)
    : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<Reading> Readings => Set<Reading>();
    public DbSet<Alert> Alerts => Set<Alert>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(120).IsRequired();
        });

        b.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasIndex(x => x.TokenHash);
            e.Property(x => x.TokenHash).HasMaxLength(128).IsRequired();
            e.Property(x => x.ReplacedByTokenHash).HasMaxLength(128);
            e.HasOne(x => x.User).WithMany(u => u.RefreshTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Device>(e =>
        {
            e.ToTable("devices");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.ApiKeyHash);
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.Name).HasMaxLength(160).IsRequired();
            e.Property(x => x.Location).HasMaxLength(160);
            e.Property(x => x.Unit).HasMaxLength(20);
            e.Property(x => x.ApiKeyHash).HasMaxLength(128);
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Direction).HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.CurrentLevel).HasConversion<string>().HasMaxLength(10);
        });

        b.Entity<Reading>(e =>
        {
            e.ToTable("readings");
            // Composite key includes the partition column so TimescaleDB can build the hypertable.
            e.HasKey(x => new { x.DeviceId, x.Time });
            e.HasIndex(x => new { x.DeviceId, x.Time });
            e.HasOne(x => x.Device).WithMany().HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Alert>(e =>
        {
            e.ToTable("alerts");
            e.HasIndex(x => new { x.DeviceId, x.RaisedAt });
            e.HasIndex(x => x.ResolvedAt);
            e.Property(x => x.Level).HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.Message).HasMaxLength(400).IsRequired();
            e.HasOne(x => x.Device).WithMany().HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.AcknowledgedBy).WithMany().HasForeignKey(x => x.AcknowledgedById).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
