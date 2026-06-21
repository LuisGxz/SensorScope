using Microsoft.AspNetCore.SignalR;
using SensorScope.Application.Common.Interfaces;
using SensorScope.Application.Monitoring;

namespace SensorScope.Api.Hubs;

/// <summary>SignalR implementation of the broadcaster: fans live events to all connected operators.</summary>
public sealed class MonitorBroadcaster(IHubContext<MonitorHub> hub) : IMonitorBroadcaster
{
    private IClientProxy Live => hub.Clients.Group(MonitorHub.Group);

    public Task ReadingReceived(ReadingEventDto reading) => Live.SendAsync("ReadingReceived", reading);
    public Task AlertRaised(AlertDto alert) => Live.SendAsync("AlertRaised", alert);
    public Task AlertResolved(AlertResolvedDto resolved) => Live.SendAsync("AlertResolved", resolved);
}
