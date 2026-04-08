using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;



[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("overview")]
    public IActionResult GetOverview()
    {
        var data = new
        {
            totalUsers = _context.UsersWeb.Count(),
            
        };

        return Ok(data);
    }
}