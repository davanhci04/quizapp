using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Api.DTOs;
using QuizApp.Api.Services;

namespace QuizApp.Api.Controllers;

/// <summary>
/// Danh mục quiz cho Guest và User. Không cần token; nếu gửi token hợp lệ thì thấy thêm quiz không công khai.
/// </summary>
[ApiController]
[Route("api/catalog/quizzes")]
[AllowAnonymous]
public class CatalogController(ICatalogService catalogService) : ControllerBase
{
    private bool IsAuthenticated => User.Identity?.IsAuthenticated == true;

    /// <summary>Guest: quiz Published và công khai. User đăng nhập: mọi quiz Published.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<CatalogQuizDto>>> List([FromQuery] CatalogQuery query) =>
        Ok(await catalogService.ListAsync(query, IsAuthenticated));

    [HttpGet("{id:int}")]
    [ProducesResponseType<CatalogQuizDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id) =>
        this.ToActionResult(await catalogService.GetAsync(id, IsAuthenticated), Ok);
}
