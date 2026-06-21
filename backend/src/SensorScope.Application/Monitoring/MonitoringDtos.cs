using SensorScope.Application.Common.Interfaces;
using SensorScope.Domain.Enums;

namespace SensorScope.Application.Monitoring;

public record DeviceSummaryDto(
    Guid Id, string Code, string Name, string Location, DeviceKind Kind, string Unit,
    AlertLevel Level, double? LastValue, bool Online, DateTimeOffset? LastReadingAt,
    ThresholdDirection Direction, double? WarnThreshold, double? CritThreshold,
    IReadOnlyList<double> Sparkline);

public record SeriesResponseDto(Guid DeviceId, string Range, string Bucket, IReadOnlyList<SeriesPoint> Points);

public record AlertDto(
    Guid Id, string DeviceCode, string DeviceName, AlertLevel Level, string Message,
    double Value, double Threshold, DateTimeOffset RaisedAt, DateTimeOffset? ResolvedAt,
    DateTimeOffset? AcknowledgedAt, string? AcknowledgedBy, bool Active);

public record SummaryDto(int Total, int Ok, int Warn, int Crit, int Online);

public record ThresholdUpdateRequest(ThresholdDirection Direction, double? WarnThreshold, double? CritThreshold);
