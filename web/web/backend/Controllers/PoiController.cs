using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Stall;

[Route("api/[controller]")]
[ApiController]
public class NarrationPointController : ControllerBase
{
    private readonly AppDbContext _context;

    public NarrationPointController(AppDbContext context)
    {
        _context = context;
    }

    public class CreatePoiDto
    {
        public string Name { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int ActivationRadius { get; set; }
        public int Priority { get; set; }
        public bool IsActive { get; set; }
        public IFormFile? Image { get; set; }
        public int CategoryId { get; set; }
        public string? PriceRange { get; set; }
        public string? OpeningHours { get; set; }
        public string? Description { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _context.NarrationPoints
            .Select(p => new {
                p.Id, p.Name, p.Latitude, p.Longitude,
                p.ActivationRadius, p.Priority, p.ImageWeb, p.IsActive,
                Status = _context.Stalls
                    .Where(s => s.NarrationPointsId == p.Id)
                    .Select(s => s.Status.ToString())
                    .FirstOrDefault(),
                FoodInfo = _context.FoodPlaces
                    .Where(fp => fp.NarrationPointId == p.Id)
                    .Select(fp => new {
                        fp.Id, fp.CategoryId, fp.PriceRange,
                        fp.OpeningHours, fp.Description
                    }).FirstOrDefault()
            })
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var item = await _context.NarrationPoints.FindAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromForm] CreatePoiDto dto)
    {
        Console.WriteLine($"[DEBUG] CategoryId = {dto.CategoryId}");

        if (dto.CategoryId == 0)
            return BadRequest("categoryId is required");

        string? imagePath = null;
        if (dto.Image != null)
        {
            var fileName = Guid.NewGuid() + Path.GetExtension(dto.Image.FileName);
            var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");
            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
            var filePath = Path.Combine(folder, fileName);
            using var stream = new FileStream(filePath, FileMode.Create);
            await dto.Image.CopyToAsync(stream);
            imagePath = "/images/" + fileName;
        }

        var point = new NarrationPoint
        {
            Name = dto.Name,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            ActivationRadius = dto.ActivationRadius,
            Priority = dto.Priority,
            IsActive = dto.IsActive,
            ImageWeb = imagePath,
            IsCommercial = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.NarrationPoints.Add(point);
        await _context.SaveChangesAsync(); // ← Save để có point.Id

        // ✅ THÊM MỚI: Lưu ảnh vào bảng images cho mobile app
        if (!string.IsNullOrEmpty(imagePath))
        {
            _context.Images.Add(new Image
            {
                NarrationPointId = point.Id,
                ImageUrl = imagePath
            });
        }

        _context.Stalls.Add(new Stall
        {
            NarrationPointsId = point.Id,
            CategoriesId = dto.CategoryId,
            Status = Stall.StallStatus.Unclaimed,
            OwnerId = null,
            Latitude = (float?)dto.Latitude,
            Longitude = (float?)dto.Longitude,
            ImageUrl = imagePath
        });

        _context.FoodPlaces.Add(new FoodPlace
        {
            NarrationPointId = point.Id,
            CategoryId = dto.CategoryId,
            PriceRange = dto.PriceRange,
            OpeningHours = dto.OpeningHours,
            Description = dto.Description
        });

        await _context.SaveChangesAsync(); // ← Save Stall + FoodPlace + Image cùng lúc
        return CreatedAtAction(nameof(Get), new { id = point.Id }, point);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromForm] NarrationPoint updated)
    {
        if (id != updated.Id) return BadRequest();

        var item = await _context.NarrationPoints.FindAsync(id);
        if (item == null) return NotFound();

        item.Name = updated.Name;
        item.ActivationRadius = updated.ActivationRadius;
        item.Latitude = updated.Latitude;
        item.Longitude = updated.Longitude;
        item.Priority = updated.Priority;
        item.UpdatedAt = DateTime.UtcNow;

        // ✅ THÊM MỚI: Xử lý ảnh mới nếu admin upload khi cập nhật
        var imageFile = Request.Form.Files["image"];
        if (imageFile != null && imageFile.Length > 0)
        {
            var fileName = Guid.NewGuid() + Path.GetExtension(imageFile.FileName);
            var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");
            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
            using var stream = new FileStream(Path.Combine(folder, fileName), FileMode.Create);
            await imageFile.CopyToAsync(stream);

            var imagePath = "/images/" + fileName;

            // Cập nhật ảnh trên NarrationPoint (web)
            item.ImageWeb = imagePath;

            // ✅ Lưu vào bảng images cho mobile app
            _context.Images.Add(new Image
            {
                NarrationPointId = id,
                ImageUrl = imagePath
            });

            // Cập nhật ảnh trên Stall luôn
            var stallForImage = await _context.Stalls
                .FirstOrDefaultAsync(s => s.NarrationPointsId == id);
            if (stallForImage != null)
                stallForImage.ImageUrl = imagePath;
        }

        var foodPlace = await _context.FoodPlaces
            .FirstOrDefaultAsync(fp => fp.NarrationPointId == id);

        var catId = Request.Form["categoryId"];
        var pRange = Request.Form["priceRange"];
        var oHours = Request.Form["openingHours"];
        var desc = Request.Form["description"];

        if (foodPlace != null)
        {
            if (!string.IsNullOrEmpty(catId)) foodPlace.CategoryId = int.Parse(catId);
            foodPlace.PriceRange = pRange;
            foodPlace.OpeningHours = oHours;
            foodPlace.Description = desc;
        }

        var stall = await _context.Stalls
            .FirstOrDefaultAsync(s => s.NarrationPointsId == id);

        if (stall != null)
        {
            stall.Latitude = (float?)updated.Latitude;
            stall.Longitude = (float?)updated.Longitude;
            if (!string.IsNullOrEmpty(catId))
                stall.CategoriesId = int.Parse(catId);

            var isActiveStr = Request.Form["isActive"];
            bool isActive = isActiveStr == "true";
            stall.Status = isActive ? StallStatus.Active : StallStatus.Closed;
            item.IsActive = isActive;
        }

        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _context.NarrationPoints.FindAsync(id);
        if (item == null) return NotFound();

        var relatedHistories = _context.Histories.Where(h => h.NarrationPointId == id);
        _context.Histories.RemoveRange(relatedHistories);

        var relatedTourPois = _context.TourPois.Where(t => t.poi_id == id);
        _context.TourPois.RemoveRange(relatedTourPois);

        var relatedStalls = _context.Stalls.Where(s => s.NarrationPointsId == id);
        _context.Stalls.RemoveRange(relatedStalls);

        var relatedFoods = _context.FoodPlaces.Where(f => f.NarrationPointId == id);
        _context.FoodPlaces.RemoveRange(relatedFoods);

        var relatedTranslations = _context.NarrationTranslations.Where(t => t.NarrationPointId == id);
        _context.NarrationTranslations.RemoveRange(relatedTranslations);

        var relatedImages = _context.Images.Where(i => i.NarrationPointId == id);
        _context.Images.RemoveRange(relatedImages);

        _context.NarrationPoints.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}