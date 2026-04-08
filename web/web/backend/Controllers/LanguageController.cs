using Microsoft.AspNetCore.Mvc;


[Route("api/[controller]")]
[ApiController]
public class LanguageController : ControllerBase
{
    private readonly AppDbContext _context;

    public LanguageController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetLanguages()
    {
        var languages = _context.Languages.ToList();
        return Ok(languages);
    }
}