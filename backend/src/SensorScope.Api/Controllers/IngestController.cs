using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SensorScope.Application.Monitoring;

namespace SensorScope.Api.Controllers;

public record IngestRequest(double Value, DateTimeOffset? Time);

/// <summary>Device telemetry ingestion. Authenticated by the device's API key in the <c>X-Api-Key</c> header.</summary>
[ApiController]
[AllowAnonymous]
[Route("api/ingest")]
public sealed class IngestController(IIngestService ingest) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Post([FromHeader(Name = "X-Api-Key")] string? apiKey, IngestRequest request, CancellationToken ct)
    {
        var result = await ingest.IngestByApiKeyAsync(apiKey ?? string.Empty, request.Value, request.Time, ct);
        return Accepted(new { result.Reading.DeviceId, result.Reading.Level, raised = result.Raised != null, resolved = result.Resolved != null });
    }
}
