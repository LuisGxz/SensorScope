using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SensorScope.Api.Hubs;

/// <summary>Read-only live feed for operators: receives reading/alert events broadcast by the ingest pipeline.</summary>
[Authorize]
public sealed class MonitorHub : Hub
{
    public const string Group = "live";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Group);
        await base.OnConnectedAsync();
    }
}
