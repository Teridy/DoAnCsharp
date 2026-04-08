using Microsoft.AspNetCore.Mvc;
using Supabase;
using Postgrest.Attributes;
using Postgrest.Models;
using System.Linq;

namespace FoodMapAPI.Controllers
{
    [ApiController]
    [Route("api/places")]
    public class PlacesController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public PlacesController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

       [HttpGet]
public async Task<IActionResult> Get(string lang = "vi")
{
    try
    {
        // 1. Lấy dữ liệu từ các bảng Cloud
        var pointsRes = await _supabase.From<NarrationPoint>().Get();
        var placesRes = await _supabase.From<FoodPlace>().Get();
        var catsRes = await _supabase.From<Category>().Get();
        var transRes = await _supabase.From<Translation>().Where(t => t.language_code == lang).Get();
        var imagesRes = await _supabase.From<PlaceImage>().Get();

        // 2. Logic BẤT TỬ: Đổi toàn bộ thành LEFT JOIN
        var query = from np in pointsRes.Models
                    
                    // Left Join với bảng food_places
                    join fp in placesRes.Models on np.id equals fp.narration_point_id into fpGroup
                    from foodPlace in fpGroup.DefaultIfEmpty()

                    // Left Join với bảng categories (Tránh lỗi mất quán do thiếu danh mục)
                    join c in catsRes.Models on (foodPlace != null ? foodPlace.category_id : -1) equals c.id into cGroup
                    from category in cGroup.DefaultIfEmpty()
                    
                    // Left Join với bảng bản dịch
                    join nt in transRes.Models on np.id equals nt.narration_point_id into transGroup
                    from translation in transGroup.DefaultIfEmpty()

                    // Left Join với bảng ảnh
                    join img in imagesRes.Models on np.id equals img.narration_point_id into imgGroup
                    from i in imgGroup.DefaultIfEmpty()

                    select new
                    {
                        id = np.id,
                        
                        // Lấy tên dịch, không có thì lấy tên gốc
                        name = (lang == "vi" || translation == null || string.IsNullOrEmpty(translation.translated_name)) 
                               ? np.name 
                               : translation.translated_name, 

                        latitude = np.latitude,
                        longitude = np.longitude,
                        
                        // Lấy mô tả dịch, không có thì lấy tiếng Việt
                        description = (lang == "vi" || translation == null || string.IsNullOrEmpty(translation.content)) 
                                      ? (foodPlace != null ? foodPlace.description : "Thông tin đang cập nhật...") 
                                      : translation.content,
                        
                        // Xử lý an toàn nếu quán thiếu thông tin trong bảng food_places
                        price_range = foodPlace != null ? foodPlace.price_range : "Chưa có giá",
                        opening_hours = foodPlace != null ? foodPlace.opening_hours : "Chưa có giờ mở cửa",
                        category = category != null ? category.name : "Chưa phân loại",
                        image_url = i != null ? i.image_url : "https://via.placeholder.com/180x120",

                        is_active = np.is_active
                    };

        // Nhóm lại để tránh trùng lặp địa điểm
        var result = query.GroupBy(p => p.id).Select(g => g.First()).ToList();

        return Ok(result);
    }
    catch (System.Exception ex)
    {
        return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
    }
}
    }

    // --- CÁC MODEL MAPPING SUPABASE ---
    [Table("narration_points")]
    public class NarrationPoint : BaseModel {
        [PrimaryKey("id")] public int id { get; set; }
        [Column("name")] public string name { get; set; }
        [Column("latitude")] public double latitude { get; set; }
        [Column("longitude")] public double longitude { get; set; }

        [Column("is_active")] public bool is_active { get; set; }
    }

    [Table("food_places")]
    public class FoodPlace : BaseModel {
        [Column("narration_point_id")] public int narration_point_id { get; set; }
        [Column("category_id")] public int category_id { get; set; }
        [Column("price_range")] public string price_range { get; set; }
        [Column("opening_hours")] public string opening_hours { get; set; }
        [Column("description")] public string description { get; set; }
    }

    [Table("categories")]
    public class Category : BaseModel {
        [PrimaryKey("id")] public int id { get; set; }
        [Column("name")] public string name { get; set; }
    }

    [Table("narration_translations")]
    public class Translation : BaseModel {
        [Column("narration_point_id")] public int narration_point_id { get; set; }
        [Column("language_code")] public string language_code { get; set; }
        [Column("content")] public string content { get; set; }
        
        // ✅ ĐÃ THÊM: Map cột mới tạo trong DB vào C#
        [Column("translated_name")] public string translated_name { get; set; } 
    }

    [Table("images")]
    public class PlaceImage : BaseModel {
        [Column("narration_point_id")] public int narration_point_id { get; set; }
        [Column("image_url")] public string image_url { get; set; }
    }
}