namespace SensorScope.Domain.Common;

/// <summary>Base for persisted aggregates: surrogate Guid key + creation timestamp.</summary>
public abstract class Entity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
