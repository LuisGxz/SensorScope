using SensorScope.Domain.Enums;

namespace SensorScope.Application.Monitoring;

/// <summary>A live reading pushed to the dashboard (drives the grid value, sparkline and the open chart).</summary>
public record ReadingEventDto(Guid DeviceId, string Code, DateTimeOffset Time, double Value, AlertLevel Level);

public record AlertResolvedDto(Guid AlertId, Guid DeviceId);

/// <summary>Outcome of ingesting one sample, returned to the caller (endpoint or simulator).</summary>
public record IngestResult(ReadingEventDto Reading, AlertDto? Raised, AlertResolvedDto? Resolved);
