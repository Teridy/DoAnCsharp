using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // ================= REGISTER =================
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (request == null)
            return BadRequest(new { message = "Dữ liệu không hợp lệ" });

        if (!ModelState.IsValid)
        {
            return BadRequest(new
            {
                errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
            });
        }

        try
        {
            if (await _context.UsersWeb.AnyAsync(u => u.UserName == request.UserName))
                return BadRequest(new { message = "Username đã tồn tại" });

            if (await _context.UsersWeb.AnyAsync(u => u.Email == request.Email))
                return BadRequest(new { message = "Email đã tồn tại" });

            var user = new UserWeb
            {
                UserName = request.UserName,
                HashPass = BCrypt.Net.BCrypt.HashPassword(request.Password),
                UserRole = "Seller",
                Email = request.Email,
                Phone = request.Phone,
                Status = "Active"
            };

            _context.UsersWeb.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Lỗi server",
                error = ex.Message
            });
        }
    }

    // ================= LOGIN =================
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (request == null)
            return BadRequest(new { message = "Dữ liệu không hợp lệ" });

    if (!ModelState.IsValid)
{
   var error = ModelState.Values
    .SelectMany(v => v.Errors)
    .FirstOrDefault()?.ErrorMessage;

return BadRequest(new { message = error });
}

        try
        {
            var user = await _context.UsersWeb
                .FirstOrDefaultAsync(u => u.UserName == request.UserName);

            if (user == null)
                return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu" });

            if (user.Status == "Locked")
                return Unauthorized(new { message = "Tài khoản đã bị khóa" });
          

            bool isValid = BCrypt.Net.BCrypt.Verify(request.Password, user.HashPass);

            if (!isValid)
                return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu" });

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.UserName),
                new Claim(ClaimTypes.NameIdentifier, user.UserName) ,
                new Claim(ClaimTypes.Role, user.UserRole)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials:
                    new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
            );

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                role = user.UserRole,
                username = user.UserName
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Lỗi server",
                error = ex.Message
            });
        }
    }
}