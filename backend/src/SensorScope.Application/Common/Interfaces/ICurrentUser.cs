namespace SensorScope.Application.Common.Interfaces;

/// <summary>The authenticated operator behind the current request, resolved from the JWT (null when anonymous).</summary>
public interface ICurrentUser
{
    Guid? UserId { get; }
    bool IsAuthenticated => UserId.HasValue;
}
