namespace SensorScope.Application.Monitoring;

/// <summary>Read & configure the monitoring dashboard: devices, time-series, alerts and thresholds.</summary>
public interface IMonitoringService
{
    Task<SummaryDto> GetSummaryAsync(CancellationToken ct = default);
    Task<IReadOnlyList<DeviceSummaryDto>> ListDevicesAsync(CancellationToken ct = default);
    Task<DeviceSummaryDto> GetDeviceAsync(string idOrCode, CancellationToken ct = default);
    Task<SeriesResponseDto> GetSeriesAsync(Guid deviceId, string range, CancellationToken ct = default);
    Task<IReadOnlyList<AlertDto>> ListAlertsAsync(string filter, CancellationToken ct = default);
    Task<DeviceSummaryDto> UpdateThresholdsAsync(Guid deviceId, ThresholdUpdateRequest request, CancellationToken ct = default);
    Task AcknowledgeAlertAsync(Guid alertId, Guid userId, CancellationToken ct = default);
}
