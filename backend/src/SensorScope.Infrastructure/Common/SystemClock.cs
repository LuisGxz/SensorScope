using SensorScope.Application.Common.Interfaces;

namespace SensorScope.Infrastructure.Common;

public class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
