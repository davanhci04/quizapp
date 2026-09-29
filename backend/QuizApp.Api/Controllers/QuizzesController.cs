using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Api.DTOs;
using QuizApp.Api.Services;

namespace QuizApp.Api.Controllers;

/// <summary>Quản lý quiz và danh sách câu hỏi của quiz; chỉ Admin.</summary>
[ApiController]
[Route("api/quizzes")]
[Authorize(Roles = "Admin")]
public class QuizzesController(IQuizService quizService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<QuizListItemDto>>> List([FromQuery] QuizQuery query) =>
        Ok(await quizService.ListAsync(query));

    [HttpGet("{id:int}")]
    [ProducesResponseType<QuizDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id) =>
        this.ToActionResult(await quizService.GetAsync(id), Ok);

    /// <summary>Tạo quiz ở trạng thái Draft.</summary>
    [HttpPost]
    [ProducesResponseType<QuizDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(QuizRequest request)
    {
        if (!int.TryParse(User.FindFirst("sub")?.Value, out var userId))
            return Unauthorized();

        var result = await quizService.CreateAsync(request, userId);
        return this.ToActionResult(result, q => CreatedAtAction(nameof(Get), new { id = q.QuizId }, q));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<QuizDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(int id, QuizRequest request) =>
        this.ToActionResult(await quizService.UpdateAsync(id, request), Ok);

    /// <summary>Đổi trạng thái Draft/Published/Archived. Published yêu cầu quiz có ít nhất 1 câu hỏi (BR-07).</summary>
    [HttpPut("{id:int}/status")]
    [ProducesResponseType<QuizDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> SetStatus(int id, QuizStatusRequest request) =>
        this.ToActionResult(await quizService.SetStatusAsync(id, request.Status!.Value), Ok);

    /// <summary>Xóa quiz và liên kết câu hỏi, giữ nguyên câu hỏi trong ngân hàng (BR-14). Quiz đã có bài làm không xóa được.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int id) =>
        this.ToActionResult(await quizService.DeleteAsync(id), _ => NoContent());

    [HttpPost("{id:int}/questions")]
    [ProducesResponseType<QuizDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> AddQuestion(int id, AddQuizQuestionRequest request) =>
        this.ToActionResult(await quizService.AddQuestionAsync(id, request), Ok);

    [HttpPut("{id:int}/questions/{questionId:int}")]
    [ProducesResponseType<QuizDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateQuestion(int id, int questionId, UpdateQuizQuestionRequest request) =>
        this.ToActionResult(await quizService.UpdateQuestionAsync(id, questionId, request), Ok);

    [HttpDelete("{id:int}/questions/{questionId:int}")]
    [ProducesResponseType<QuizDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> RemoveQuestion(int id, int questionId) =>
        this.ToActionResult(await quizService.RemoveQuestionAsync(id, questionId), Ok);

    /// <summary>Sắp xếp lại toàn bộ câu hỏi của quiz theo thứ tự truyền lên.</summary>
    [HttpPut("{id:int}/questions/order")]
    [ProducesResponseType<QuizDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ReorderQuestions(int id, ReorderQuizQuestionsRequest request) =>
        this.ToActionResult(await quizService.ReorderQuestionsAsync(id, request), Ok);
}
