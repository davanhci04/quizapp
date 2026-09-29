using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Api.Services;

namespace QuizApp.Api.Controllers;

public static class ServiceResultExtensions
{
    /// <summary>Chuyển ServiceResult thành ActionResult: thành công dùng onSuccess, lỗi thành ProblemDetails.</summary>
    public static IActionResult ToActionResult<T>(this ControllerBase controller, ServiceResult<T> result, Func<T, IActionResult> onSuccess)
    {
        if (result.Succeeded)
            return onSuccess(result.Value!);

        return result.Error switch
        {
            ServiceError.NotFound => controller.Problem(result.Message, statusCode: StatusCodes.Status404NotFound),
            ServiceError.Validation => controller.Problem(result.Message, statusCode: StatusCodes.Status400BadRequest),
            ServiceError.Conflict => controller.Problem(result.Message, statusCode: StatusCodes.Status409Conflict),
            ServiceError.ConfirmationRequired => controller.Problem(
                result.Message,
                statusCode: StatusCodes.Status409Conflict,
                extensions: new Dictionary<string, object?>
                {
                    ["requiresConfirmation"] = true,
                    ["quizCount"] = result.Count,
                }),
            _ => controller.Problem(statusCode: StatusCodes.Status500InternalServerError),
        };
    }
}
