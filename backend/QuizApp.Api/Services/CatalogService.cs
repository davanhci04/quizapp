using Microsoft.EntityFrameworkCore;
using QuizApp.Api.Data;
using QuizApp.Api.DTOs;
using QuizApp.Api.Entities;

namespace QuizApp.Api.Services;

public interface ICatalogService
{
    Task<PagedResult<CatalogQuizDto>> ListAsync(CatalogQuery query, bool isAuthenticated);
    Task<ServiceResult<CatalogQuizDto>> GetAsync(int id, bool isAuthenticated);
}

public class CatalogService(QuizAppDbContext db) : ICatalogService
{
    public async Task<PagedResult<CatalogQuizDto>> ListAsync(CatalogQuery query, bool isAuthenticated)
    {
        var q = Visible(isAuthenticated);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            q = q.Where(x => x.Title.Contains(search));
        }

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.QuizId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(ToDto)
            .ToListAsync();

        return new PagedResult<CatalogQuizDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<ServiceResult<CatalogQuizDto>> GetAsync(int id, bool isAuthenticated)
    {
        var quiz = await Visible(isAuthenticated).Where(x => x.QuizId == id).Select(ToDto).SingleOrDefaultAsync();

        // Quiz không tồn tại hoặc không được phép xem đều trả NotFound để không lộ sự tồn tại của quiz.
        return quiz is null
            ? ServiceResult<CatalogQuizDto>.NotFound($"Không tìm thấy quiz {id}.")
            : ServiceResult<CatalogQuizDto>.Ok(quiz);
    }

    // BR-04: chỉ quiz Published mới hiển thị; Guest chỉ thấy quiz công khai (is_public = 1).
    private IQueryable<Quiz> Visible(bool isAuthenticated)
    {
        var q = db.Quizzes.AsNoTracking().Where(x => x.Status == QuizStatus.Published);
        return isAuthenticated ? q : q.Where(x => x.IsPublic);
    }

    private static readonly System.Linq.Expressions.Expression<Func<Quiz, CatalogQuizDto>> ToDto = x => new CatalogQuizDto(
        x.QuizId, x.Title, x.Description, x.Duration, x.PassingScore, x.IsPublic,
        x.QuizQuestions.Count, x.QuizQuestions.Sum(qq => qq.ScoreWeight), x.CreatedAt);
}
