using Microsoft.AspNetCore.Mvc;
using Supabase;
using Postgrest.Attributes;
using Postgrest.Models;

namespace FoodMapAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        // Thay thế AppDbContext bằng Supabase Client
        private readonly Supabase.Client _supabase;

        public UsersController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // API tạo User ẩn danh mới khi người dùng quét QR lần đầu [cite: 2026-03-15]
        [HttpPost("anonymous")]
        public async Task<IActionResult> CreateAnonymousUser()
        {
            try 
            {
                var newUser = new UserAccount 
                { 
                    username = "Khách du lịch",
                    device_id = Guid.NewGuid().ToString() // Tạo mã định danh ngẫu nhiên [cite: 2026-03-15]
                };

                // Lưu vào bảng users trên Supabase
                var response = await _supabase.From<UserAccount>().Insert(newUser);
                var createdUser = response.Models.FirstOrDefault();

                // Trả về ID vừa tạo để React lưu vào localStorage [cite: 2026-03-15]
                return Ok(new { id = createdUser?.id });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, $"Lỗi tạo user: {ex.Message}");
            }
        }
    }

    // Model để map trực tiếp với bảng users trên Supabase [cite: 2026-03-15]
    [Table("users")]
    public class UserAccount : BaseModel {
        [PrimaryKey("id", false)] public int id { get; set; }
        [Column("username")] public string username { get; set; }
        [Column("device_id")] public string device_id { get; set; }
    }
}