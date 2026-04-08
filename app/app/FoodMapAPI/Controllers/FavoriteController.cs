using Microsoft.AspNetCore.Mvc;
using Supabase;
using Postgrest.Attributes;
using Postgrest.Models;
using System.Linq;

namespace FoodMapAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FavoritesController : ControllerBase
    {
        // Thay thế AppDbContext bằng Supabase Client
        private readonly Supabase.Client _supabase;

        public FavoritesController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // 1. Lấy danh sách ID các địa điểm đã yêu thích của 1 user [cite: 2026-03-15]
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetFavorites(int userId)
        {
            try 
            {
                // Truy vấn bảng favorites trên Supabase
                var res = await _supabase.From<FavoriteItem>()
                    .Where(f => f.user_id == userId)
                    .Get();

                var favList = res.Models.Select(f => f.narration_point_id).ToList();
                return Ok(favList);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, $"Lỗi: {ex.Message}");
            }
        }

        // 2. Thêm hoặc Xóa yêu thích (Toggle) [cite: 2026-03-15]
        [HttpPost]
        public async Task<IActionResult> ToggleFavorite([FromBody] FavoriteItem fav)
        {
            try 
            {
                // Kiểm tra xem đã thích quán này chưa [cite: 2026-03-15]
                var res = await _supabase.From<FavoriteItem>()
                    .Where(f => f.user_id == fav.user_id && f.narration_point_id == fav.narration_point_id)
                    .Get();

                var existing = res.Models.FirstOrDefault();

                if (existing != null)
                {
                    // Nếu có rồi thì XÓA (Bỏ thích) [cite: 2026-03-15]
                    await _supabase.From<FavoriteItem>().Delete(existing);
                    return Ok(new { message = "Removed from favorites" });
                }
                else
                {
                    // Nếu chưa có thì THÊM (Thích) [cite: 2026-03-15]
                    await _supabase.From<FavoriteItem>().Insert(fav);
                    return Ok(new { message = "Added to favorites" });
                }
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }
    }

    // Model để map trực tiếp với bảng favorites trên Supabase [cite: 2026-03-15]
    [Table("favorites")]
    public class FavoriteItem : BaseModel {
        [PrimaryKey("id", false)] public int id { get; set; }
        [Column("user_id")] public int user_id { get; set; }
        [Column("narration_point_id")] public int narration_point_id { get; set; }
    }
}