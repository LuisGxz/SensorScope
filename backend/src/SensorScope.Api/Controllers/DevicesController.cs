using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SensorScope.Application.Monitoring;

namespace SensorScope.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public sealed class DevicesController(IMonitoringService monitoring) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<SummaryDto>> Summary(CancellationToken ct)
        => Ok(await monitoring.GetSummaryAsync(ct));

    [HttpGet("devices")]
    public async Task<ActionResult<IReadOnlyList<DeviceSummaryDto>>> List(CancellationToken ct)
        => Ok(await monitoring.ListDevicesAsync(ct));

    [HttpGet("devices/{idOrCode}")]
    public async Task<ActionResult<DeviceSummaryDto>> Get(string idOrCode, CancellationToken ct)
        => Ok(await monitoring.GetDeviceAsync(idOrCode, ct));

    [HttpGet("devices/{deviceId:guid}/series")]
    public async Task<ActionResult<SeriesResponseDto>> Series(Guid deviceId, [FromQuery] string range, CancellationToken ct)
        => Ok(await monitoring.GetSeriesAsync(deviceId, range ?? "1h", ct));

    [HttpPut("devices/{deviceId:guid}/thresholds")]
    public async Task<ActionResult<DeviceSummaryDto>> UpdateThresholds(Guid deviceId, ThresholdUpdateRequest request, CancellationToken ct)
        => Ok(await monitoring.UpdateThresholdsAsync(deviceId, request, ct));
}
