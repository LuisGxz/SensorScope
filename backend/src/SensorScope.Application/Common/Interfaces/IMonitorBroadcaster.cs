using SensorScope.Application.Monitoring;

namespace SensorScope.Application.Common.Interfaces;

/// <summary>
/// Pushes live events to connected operators. Implemented in the API over SignalR, so the Application
/// can broadcast without depending on the transport.
/// </summary>
public interface IMonitorBroadcaster
{
    Task ReadingReceived(ReadingEventDto reading);
    Task AlertRaised(AlertDto alert);
    Task AlertResolved(AlertResolvedDto resolved);
}
