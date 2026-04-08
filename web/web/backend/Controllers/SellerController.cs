using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Seller")]
public class SellerController : ControllerBase
{
    [HttpGet("dashboard")]
    public IActionResult GetSellerData()
    {
        return Ok("Chào Seller 🏪");
    }
}