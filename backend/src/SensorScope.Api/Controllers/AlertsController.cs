using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SensorScope.Application.Common.Exceptions;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Application.Monitoring;

namespace SensorScope.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/alerts")]
public sealed class AlertsController(IMonitoringService monitoring, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AlertDto>>> List([FromQuery] string filter, CancellationToken ct)
        => Ok(await monitoring.ListAlertsAsync(filter ?? "all", ct));

    [HttpPost("{alertId:guid}/ack")]
    public async Task<IActionResult> Acknowledge(Guid alertId, CancellationToken ct)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedException("Authentication required.");
        await monitoring.AcknowledgeAlertAsync(alertId, userId, ct);
        return NoContent();
    }
}
