using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Api.DTOs;
using QuizApp.Api.Entities;
using QuizApp.Api.Services;

namespace QuizApp.Api.Controllers;

/// <summary>Ngân hàng câu hỏi dùng chung; chỉ Admin được quản lý.</summary>
[ApiController]
[Route("api/questions")]
[Authorize(Roles = "Admin")]
public class QuestionsController(IQuestionService questionService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<QuestionListItemDto>>> List([FromQuery] QuestionQuery query) =>
        Ok(await questionService.ListAsync(query));

    [HttpGet("{id:int}")]
    [ProducesResponseType<QuestionDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id) =>
        this.ToActionResult(await questionService.GetAsync(id), Ok);

    [HttpPost]
    [ProducesResponseType<QuestionDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(QuestionRequest request)
    {
        if (!int.TryParse(User.FindFirst("sub")?.Value, out var userId))
            return Unauthorized();

        var result = await questionService.CreateAsync(request, userId);
        return this.ToActionResult(result, q => CreatedAtAction(nameof(Get), new { id = q.QuestionId }, q));
    }

    /// <param name="confirm">Bắt buộc là true khi câu hỏi đang được quiz sử dụng (BR-12).</param>
    [HttpPut("{id:int}")]
    [ProducesResponseType<QuestionDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(int id, QuestionRequest request, [FromQuery] bool confirm = false) =>
        this.ToActionResult(await questionService.UpdateAsync(id, request, confirm), Ok);

    /// <summary>Xóa câu hỏi; nếu đã có trong bài nộp thì archive thay vì xóa (BR-13).</summary>
    /// <param name="confirm">Bắt buộc là true khi câu hỏi đang được quiz sử dụng (BR-12).</param>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<DeleteQuestionResult>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false) =>
        this.ToActionResult(await questionService.DeleteAsync(id, confirm),
            r => r.Outcome == DeleteOutcome.Deleted ? NoContent() : Ok(r));

    [HttpPost("{id:int}/archive")]
    public async Task<IActionResult> Archive(int id) =>
        this.ToActionResult(await questionService.SetStatusAsync(id, QuestionStatus.Archived), Ok);

    [HttpPost("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id) =>
        this.ToActionResult(await questionService.SetStatusAsync(id, QuestionStatus.Active), Ok);
}
