using FluentValidation;
using SensorScope.Application.Common.Exceptions;

namespace SensorScope.Api.Middleware;

/// <summary>Translates domain/validation exceptions into consistent JSON error responses.</summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            var errors = ex.Errors.GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            await WriteAsync(context, StatusCodes.Status400BadRequest, "validation_failed", "One or more fields are invalid.", errors);
        }
        catch (AppException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Code, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteAsync(context, StatusCodes.Status500InternalServerError, "server_error", "An unexpected error occurred.");
        }
    }

    private static Task WriteAsync(HttpContext context, int status, string code, string message, IDictionary<string, string[]>? errors = null)
    {
        if (context.Response.HasStarted) return Task.CompletedTask;
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(new { code, message, errors });
    }
}
