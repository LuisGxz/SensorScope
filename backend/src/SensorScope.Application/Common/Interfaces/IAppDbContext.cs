using Microsoft.EntityFrameworkCore;
using SensorScope.Domain.Entities;

namespace SensorScope.Application.Common.Interfaces;

/// <summary>Abstraction over the persistence context so Application services stay free of EF wiring.</summary>
public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Device> Devices { get; }
    DbSet<Reading> Readings { get; }
    DbSet<Alert> Alerts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
