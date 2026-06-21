namespace SensorScope.Application.Common.Exceptions;

/// <summary>Base for expected, client-facing failures mapped to an HTTP status by the API layer.</summary>
public abstract class AppException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public abstract string Code { get; }
}

public sealed class BadRequestException(string message, string code = "bad_request") : AppException(message, 400)
{
    public override string Code { get; } = code;
}

public sealed class UnauthorizedException(string message, string code = "unauthorized") : AppException(message, 401)
{
    public override string Code { get; } = code;
}

public sealed class ForbiddenException(string message, string code = "forbidden") : AppException(message, 403)
{
    public override string Code { get; } = code;
}

public sealed class NotFoundException(string message, string code = "not_found") : AppException(message, 404)
{
    public override string Code { get; } = code;
}

public sealed class ConflictException(string message, string code = "conflict") : AppException(message, 409)
{
    public override string Code { get; } = code;
}
