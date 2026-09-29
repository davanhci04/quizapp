using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Api.DTOs;
using QuizApp.Api.Services;

namespace QuizApp.Api.Controllers;

/// <summary>Làm bài và xem kết quả; người dùng chỉ thao tác được trên bài làm của chính mình.</summary>
[ApiController]
[Route("api/attempts")]
[Authorize]
public class AttemptsController(IAttemptService attemptService) : ControllerBase
{
    private bool TryGetUserId(out int userId) => int.TryParse(User.FindFirst("sub")?.Value, out userId);

    /// <summary>Bắt đầu làm bài. Nếu đang có bài dở dang của quiz này và còn giờ thì trả lại bài đó.</summary>
    [HttpPost]
    [ProducesResponseType<AttemptDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<AttemptDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Start(StartAttemptRequest request)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await attemptService.StartAsync(request.QuizId, userId);
        return this.ToActionResult(result, r => r.Created
            ? CreatedAtAction(nameof(Get), new { id = r.Attempt.AttemptId }, r.Attempt)
            : Ok(r.Attempt));
    }

    /// <summary>Lịch sử làm bài của tôi.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<AttemptListItemDto>>> List([FromQuery] AttemptListQuery query)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        return Ok(await attemptService.ListAsync(userId, query));
    }

    /// <summary>Xem bài đang làm hoặc kết quả; bài quá hạn sẽ được tự động nộp (BR-05).</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<AttemptDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        return this.ToActionResult(await attemptService.GetAsync(id, userId), Ok);
    }

    /// <summary>Lưu đáp án cho một câu (gửi selectedAnswerId = null để bỏ trống).</summary>
    [HttpPut("{id:int}/answers/{questionId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SaveAnswer(int id, int questionId, SaveAnswerRequest request)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        return this.ToActionResult(await attemptService.SaveAnswerAsync(id, questionId, request, userId), _ => NoContent());
    }

    /// <summary>Nộp bài và chấm điểm. Nộp lại bài đã kết thúc thì trả lại kết quả cũ.</summary>
    [HttpPost("{id:int}/submit")]
    [ProducesResponseType<AttemptDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Submit(int id)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        return this.ToActionResult(await attemptService.SubmitAsync(id, userId), Ok);
    }
}
