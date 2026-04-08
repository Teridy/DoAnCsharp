using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[Route("api/[controller]")]
[ApiController]
public class FoodPlaceController : ControllerBase
{
    private readonly AppDbContext _context;

    public FoodPlaceController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/FoodPlace
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _context.FoodPlaces
            .Include(f => f.NarrationPoint)
            .AsNoTracking() // Thêm AsNoTracking để tăng hiệu suất và tránh xung đột state
            .ToListAsync();
        return Ok(data);
    }

    // PUT: api/FoodPlace/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromForm] FoodPlaceCreateDto dto)
    {
        var food = await _context.FoodPlaces.FindAsync(id);
        if (food == null) return NotFound("FoodPlace not found");

        food.CategoryId = dto.CategoryId;
        food.PriceRange = dto.PriceRange;
        food.OpeningHours = dto.OpeningHours;
        food.Description = dto.Description;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Update thành công", data = food });
    }

    // POST: api/FoodPlace
    [HttpPost]
    public async Task<IActionResult> Create([FromForm] FoodPlaceCreateDto dto)
    {
        if (dto == null) return BadRequest("Dữ liệu trống");

        // Sử dụng using khối lệnh để đảm bảo transaction được giải phóng đúng cách
        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                // 1. Xử lý lưu ảnh
                string? imagePath = null;
                if (dto.Image != null)
                {
                    var fileName = Guid.NewGuid() + Path.GetExtension(dto.Image.FileName);
                    var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");
                    if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

                    var filePath = Path.Combine(folderPath, fileName);
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await dto.Image.CopyToAsync(stream);
                    }
                    imagePath = "/images/" + fileName;
                }

                // 2. Tạo NarrationPoint
                var narrationPoint = new NarrationPoint
                {
                    Name = dto.Name,
                    Latitude = dto.Latitude ?? 0,
                    Longitude = dto.Longitude ?? 0,
                    ActivationRadius = dto.ActivationRadius ?? 50,
                    Priority = dto.Priority ?? 0,
                    ImageWeb = imagePath,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                _context.NarrationPoints.Add(narrationPoint);
                // Cần Save ở đây để lấy narrationPoint.Id cho các bảng sau
                await _context.SaveChangesAsync(); 

                // 3. TẠO STALL MỒI
                var seedStall = new Stall
                {
                    NarrationPointsId = narrationPoint.Id,
                    CategoriesId = dto.CategoryId,
                    Status = Stall.StallStatus.Unclaimed,
                    OwnerId = null,
                    Latitude = (float?)dto.Latitude,
                    Longitude = (float?)dto.Longitude,
                    ImageUrl = imagePath
                };
                _context.Stalls.Add(seedStall);

                // 4. Tạo FoodPlace
                var foodPlace = new FoodPlace
                {
                    NarrationPointId = narrationPoint.Id,
                    CategoryId = dto.CategoryId,
                    PriceRange = dto.PriceRange,
                    OpeningHours = dto.OpeningHours,
                    Description = dto.Description
                };
                _context.FoodPlaces.Add(foodPlace);

                // Gom Stall và FoodPlace vào 1 lần Save duy nhất để giảm tải kết nối
                await _context.SaveChangesAsync();

                // Hoàn tất
                await transaction.CommitAsync();

                return Ok(new { message = "Tạo điểm ăn uống và quán mồi thành công", data = foodPlace });
            }
            catch (Exception ex)
            {
                // Rollback an toàn
                if (transaction != null) await transaction.RollbackAsync();
                
                return StatusCode(500, new { 
                    error = ex.Message, 
                    inner = ex.InnerException?.Message 
                });
            }
        }
    }
    // FoodPlaceController.cs
// Thêm endpoint mới, giữ nguyên PUT/{id} cũ
[HttpPatch("{id}/description")]
public async Task<IActionResult> UpdateDescription(int id, [FromBody] UpdateDescriptionDto dto)
{
    var food = await _context.FoodPlaces.FindAsync(id);
    if (food == null) return NotFound("FoodPlace not found");

    food.Description = dto.Description;

    await _context.SaveChangesAsync();
    return Ok(new { message = "Update thành công" });
}

public class UpdateDescriptionDto
{
    public string? Description { get; set; }
}
}

public class FoodPlaceCreateDto
{
    public string Name { get; set; } = "";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public IFormFile? Image { get; set; }
    public int CategoryId { get; set; }
    public string? PriceRange { get; set; }
    public string? OpeningHours { get; set; }
    public string? Description { get; set; }
    public int? ActivationRadius { get; set; }
    public int? Priority { get; set; }
}