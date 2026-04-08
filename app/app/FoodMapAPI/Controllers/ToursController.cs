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