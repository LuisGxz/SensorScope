namespace SensorScope.Domain.Enums;

/// <summary>Severity of a reading / alert.</summary>
public enum AlertLevel
{
    Ok = 0,
    Warn = 1,
    Crit = 2,
}

/// <summary>Whether a threshold is breached when the value goes ABOVE it (temp, vibration) or BELOW it (flow, pressure).</summary>
public enum ThresholdDirection
{
    Above = 0,
    Below = 1,
}

/// <summary>Kind of sensor — drives the icon and is handy for grouping.</summary>
public enum DeviceKind
{
    Temperature = 0,
    Pressure = 1,
    Vibration = 2,
    Flow = 3,
    Power = 4,
    Humidity = 5,
    AirQuality = 6,
    Level = 7,
}
