namespace SensorScope.Infrastructure.Auth;

public class JwtSettings
{
    public const string SectionName = "Jwt";
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "sensorscope";
    public string Audience { get; set; } = "sensorscope-client";
    public int AccessTokenMinutes { get; set; } = 30;
}
