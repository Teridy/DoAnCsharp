using Microsoft.AspNetCore.Mvc;
using Supabase;
using Postgrest.Attributes;
using Postgrest.Models;
using System.Linq;

namespace FoodMapAPI.Controllers
{
    [ApiController]
    [Route("api/tours")]
    public class ToursController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public ToursController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        // 1. API Lấy danh sách Tours: GET /api/tours
        [HttpGet]
        public async Task<IActionResult> GetTours()
        {
            try
            {
                var toursRes = await _supabase.From<Tour>().Get();
                
                // Trả về danh sách tour, thêm màu mặc định nếu DB không có cột color
                var result = toursRes.Models.Select(t => new {
                    id = t.id,
                    name = t.name,
                    description = t.description,
                    duration = t.duration,
                    status = t.status,
                    color = "#FF4757" // Màu mặc định cho UI React
                }).ToList();

                return Ok(result);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, $"Lỗi lấy danh sách Tour: {ex.Message}");
            }
        }

        // 2. API Lấy bảng nối: GET /api/tours/pois
        [HttpGet("pois")]
        public async Task<IActionResult> GetTourPois()
        {
            try
            {
                var tourPoisRes = await _supabase.From<TourPoi>().Get();
                
                var result = tourPoisRes.Models.Select(tp => new {
                    id = tp.id,
                    tour_id = tp.tour_id,
                    poi_id = tp.poi_id
                }).ToList();

                return Ok(result);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, $"Lỗi lấy danh sách điểm trong Tour: {ex.Message}");
            }
        }

        private static readonly object _fileLock = new object();

        [HttpPost("ping")]
        public async Task<IActionResult> Ping([FromQuery] string deviceId, [FromQuery] double? lat, [FromQuery] double? lon)
        {
            if (string.IsNullOrEmpty(deviceId)) return BadRequest("Missing deviceId");
            try
            {
                string path = @"c:\doan\active_users.json";
                Dictionary<string, UserPing> activeUsers = new Dictionary<string, UserPing>();
                
                lock (_fileLock)
                {
                    // Read existing
                    if (System.IO.File.Exists(path))
                    {
                        try {
                            var content = System.IO.File.ReadAllText(path);
                            if (!string.IsNullOrWhiteSpace(content))
                            {
                                activeUsers = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, UserPing>>(content) ?? new Dictionary<string, UserPing>();
                            }
                        } catch { /* ignore read conflicts */ }
                    }
                    
                    // Update — lưu cả tọa độ GPS để hiển thị Heatmap real-time
                    activeUsers[deviceId] = new UserPing {
                        lastSeen = DateTime.UtcNow,
                        latitude = lat,
                        longitude = lon
                    };

                    // Clean old entries (hơn 2 phút không ping → xóa)
                    var cutoff = DateTime.UtcNow.AddMinutes(-2);
                    var tokeep = activeUsers.Where(kvp => kvp.Value.lastSeen > cutoff).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

                    // Write
                    try {
                        System.IO.File.WriteAllText(path, System.Text.Json.JsonSerializer.Serialize(tokeep));
                    } catch { /* ignore write conflicts */ }
                }

                return Ok("ok");
            }
            catch
            {
                return Ok("error");
            }
        }
    }

    // DTO lưu vị trí real-time của từng thiết bị
    public class UserPing {
        public DateTime lastSeen { get; set; }
        public double? latitude { get; set; }
        public double? longitude { get; set; }
    }

    // --- CÁC MODEL MAPPING SUPABASE CHO TOUR ---
    [Table("tours")]
    public class Tour : BaseModel {
        [PrimaryKey("id")] public int id { get; set; }
        [Column("name")] public string name { get; set; }
        [Column("description")] public string description { get; set; }
        [Column("duration")] public int duration { get; set; }
        [Column("status")] public string status { get; set; }
    }

    [Table("tour_pois")]
    public class TourPoi : BaseModel {
        [PrimaryKey("id")] public int id { get; set; }
        [Column("tour_id")] public int tour_id { get; set; }
        [Column("poi_id")] public int poi_id { get; set; }
    }
}