using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

// Lưu ý: Bạn nhớ thêm namespace của project bạn vào đây (ví dụ: namespace YourProject.Controllers)

[ApiController]
[Route("api/[controller]")]
public class TourController : ControllerBase
{
    private readonly AppDbContext _context;

    public TourController(AppDbContext context)
    {
        _context = context;
    }

    // ================= GET ALL =================
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tours = await _context.Tours
            .Include(t => t.TourPois)
                .ThenInclude(tp => tp.Poi) // 🔥 join sang bảng POI
            .OrderByDescending(t => t.created_at)
            .Select(t => new
            {
                t.id,
                t.name,
                t.description,
                t.duration,
                t.status,
                t.created_at,

                // 🔥 trả luôn POI
                tour_pois = t.TourPois.Select(tp => new
                {
                    poi_id = tp.poi_id,
                    poi_name = tp.Poi.Name
                }).ToList()
            })
            .ToListAsync();

        return Ok(tours);
    }

    // ================= GET BY ID =================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var tour = await _context.Tours
            .Include(t => t.TourPois)
                .ThenInclude(tp => tp.Poi)
            .Where(t => t.id == id)
            .Select(t => new
            {
                t.id,
                t.name,
                t.description,
                t.duration,
                t.status,

                tour_pois = t.TourPois.Select(tp => new
                {
                    poi_id = tp.poi_id,
                    poi_name = tp.Poi.Name
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (tour == null)
            return NotFound();

        return Ok(tour);
    }

    // ================= CREATE =================
[HttpPost]
public IActionResult CreateTour([FromBody] TourCreateDto dto)
{
    try
    {
        // 1. Lưu Tour bằng EF Core bình thường
        var tour = new Tour 
        {
            name = dto.name,
            description = dto.description,
            duration = dto.duration,
            status = dto.status,
            created_at = DateTime.UtcNow
        };

        _context.Tours.Add(tour);
        _context.SaveChanges(); // Lưu xong, lấy được tour.id

        // 2. MỞ KẾT NỐI MỚI TINH ĐỂ LƯU POI (NÉ LỖI DISPOSED)
        if (dto.poi_ids != null && dto.poi_ids.Any())
        {
            // Lấy chuỗi kết nối từ EF Core
            var connString = _context.Database.GetConnectionString();
            
            using (var connection = new NpgsqlConnection(connString))
            {
                connection.Open();
                foreach (var poiId in dto.poi_ids)
                {
                    using (var cmd = new NpgsqlCommand("INSERT INTO tour_pois (tour_id, poi_id) VALUES (@tId, @pId)", connection))
                    {
                        cmd.Parameters.AddWithValue("tId", tour.id);
                        cmd.Parameters.AddWithValue("pId", poiId);
                        cmd.ExecuteNonQuery(); // Bắn thẳng lệnh xuống Supabase
                    }
                }
            } // Tự động đóng kết nối sạch sẽ
        }

        return Ok(new {
            id = tour.id,
            name = tour.name,
            message = "Tạo tour và địa điểm thành công bằng Vũ khí hạt nhân!"
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { 
            Message = "Lỗi khi lưu vào Database", 
            Detail = ex.Message, 
            InnerError = ex.InnerException?.Message 
        });
    }
}

   // ================= UPDATE =================
[HttpPut("{id}")]
public IActionResult Update(int id, [FromBody] TourCreateDto dto)
{
    try
    {
        var connString = _context.Database.GetConnectionString();
        using (var connection = new NpgsqlConnection(connString))
        {
            connection.Open();

            // 1. Cập nhật thông tin Tour chính
            string updateTourSql = "UPDATE tours SET name = @name, description = @desc, duration = @dur, status = @status WHERE id = @id";
            using (var cmdTour = new NpgsqlCommand(updateTourSql, connection))
            {
                cmdTour.Parameters.AddWithValue("name", dto.name);
                cmdTour.Parameters.AddWithValue("desc", dto.description ?? (object)DBNull.Value);
                cmdTour.Parameters.AddWithValue("dur", dto.duration);
                cmdTour.Parameters.AddWithValue("status", dto.status);
                cmdTour.Parameters.AddWithValue("id", id);
                
                if (cmdTour.ExecuteNonQuery() == 0) return NotFound();
            }

            // 2. Xóa sạch các POI cũ của tour này
            using (var cmdDeletePoi = new NpgsqlCommand("DELETE FROM tour_pois WHERE tour_id = @id", connection))
            {
                cmdDeletePoi.Parameters.AddWithValue("id", id);
                cmdDeletePoi.ExecuteNonQuery();
            }

            // 3. Thêm lại các POI mới (nếu người dùng có tick chọn)
            if (dto.poi_ids != null && dto.poi_ids.Any())
            {
                foreach (var poiId in dto.poi_ids)
                {
                    using (var cmdInsertPoi = new NpgsqlCommand("INSERT INTO tour_pois (tour_id, poi_id) VALUES (@tId, @pId)", connection))
                    {
                        cmdInsertPoi.Parameters.AddWithValue("tId", id);
                        cmdInsertPoi.Parameters.AddWithValue("pId", poiId);
                        cmdInsertPoi.ExecuteNonQuery();
                    }
                }
            }
        }
        return Ok(new { message = "Cập nhật tour thành công!" });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { Message = "Lỗi khi cập nhật", Detail = ex.Message });
    }
}

  
    // ================= DELETE =================
[HttpDelete("{id}")]
public IActionResult Delete(int id)
{
    try
    {
        var connString = _context.Database.GetConnectionString();
        using (var connection = new NpgsqlConnection(connString))
        {
            connection.Open();

            // 1. Phải xóa danh sách địa điểm (POI) của tour này trước để tránh dính khóa ngoại
            using (var cmdPoi = new NpgsqlCommand("DELETE FROM tour_pois WHERE tour_id = @id", connection))
            {
                cmdPoi.Parameters.AddWithValue("id", id);
                cmdPoi.ExecuteNonQuery();
            }

            // 2. Xóa Tour chính
            using (var cmdTour = new NpgsqlCommand("DELETE FROM tours WHERE id = @id", connection))
            {
                cmdTour.Parameters.AddWithValue("id", id);
                int rowsAffected = cmdTour.ExecuteNonQuery();

                if (rowsAffected == 0)
                    return NotFound(new { message = "Không tìm thấy Tour cần xóa" });
            }
        }
        return Ok(new { message = "Xóa tour thành công!" });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { Message = "Lỗi khi xóa Database", Detail = ex.Message });
    }
}

    // ================= SUGGESTED =================
    [HttpGet("suggested")]
    public async Task<IActionResult> SuggestedTour()
    {
        var topPoiIds = await _context.Histories
            .GroupBy(h => h.NarrationPointId)
            .OrderByDescending(g => g.Count())
            .Take(5)
            .Select(g => g.Key)
            .ToListAsync();

        var tourIds = await _context.TourPois
            .Where(tp => topPoiIds.Contains(tp.poi_id))
            .GroupBy(tp => tp.tour_id)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .ToListAsync();

        var tours = await _context.Tours
            .Include(t => t.TourPois)
                .ThenInclude(tp => tp.Poi)
            .Where(t => tourIds.Contains(t.id))
            .Select(t => new
            {
                t.id,
                t.name,
                t.description,
                t.duration,

                tour_pois = t.TourPois.Select(tp => new
                {
                    poi_id = tp.poi_id,
                    poi_name = tp.Poi.Name
                })
            })
            .ToListAsync();

        return Ok(tours);
    }

    // ================= GET TOURS DTO (Đã sửa lỗi 500) =================
    [HttpGet("dto-list")]
    public async Task<ActionResult<IEnumerable<TourResponseDto>>> GetTours()
    {
        var tours = await _context.Tours
            .Include(t => t.TourPois)
                .ThenInclude(tp => tp.Poi) 
            .Select(t => new TourResponseDto
            {
                id = t.id,
                name = t.name,
                // Ánh xạ danh sách POI sang tên để hiện ở "Lộ trình"
                poi_names = t.TourPois.Select(tp => tp.Poi.Name).ToList() 
            })
            .ToListAsync();

        return Ok(tours);
    }
}

// ================= DTO =================
public class TourCreateDto
{
    public string name { get; set; }
    public string description { get; set; }
    public int duration { get; set; }
    public string status { get; set; }
    public List<int> poi_ids { get; set; }
}

public class TourResponseDto 
{
    public int id { get; set; }
    public string name { get; set; }
    public string description { get; set; }
    public int duration { get; set; }
    public string status { get; set; }
    public List<int> poi_ids { get; set; } // Trả về ID để khớp với logic React
    public List<string> poi_names { get; set; } // Trả về tên để hiển thị "Lộ trình tour"
}