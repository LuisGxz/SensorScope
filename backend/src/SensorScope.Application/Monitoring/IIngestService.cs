namespace SensorScope.Application.Monitoring;

/// <summary>Ingests telemetry: persists the reading, evaluates thresholds, raises/resolves alerts, broadcasts.</summary>
public interface IIngestService
{
    Task<IngestResult> IngestByApiKeyAsync(string rawApiKey, double value, DateTimeOffset? time, CancellationToken ct = default);
    Task<IngestResult> IngestAsync(Guid deviceId, double value, DateTimeOffset? time, CancellationToken ct = default);
}
