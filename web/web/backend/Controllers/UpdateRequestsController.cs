using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json.Serialization;

[Route("api/requests")]
[ApiController]
public class UpdateRequestsController : ControllerBase
{
    private readonly AppDbContext _context;

    public UpdateRequestsController(AppDbContext context)
    {
        _context = context;
    }

    private Stall.StallStatus MapStringToStatus(string status)
    {
        return status?.ToLower() switch
        {
            "open"      => Stall.StallStatus.Active,
            "active"    => Stall.StallStatus.Active,
            "closed"    => Stall.StallStatus.Closed,
            "pending"   => Stall.StallStatus.Pending,
            "unclaimed" => Stall.StallStatus.Unclaimed,
            "rejected"  => Stall.StallStatus.Rejected,
            _ => Stall.StallStatus.Unclaimed
        };
    }

    // =========================
    // GET PENDING
    // =========================
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingRequests()
    {
        var requests = await _context.UpdateRequests
            .Where(r => r.Status == "Pending")
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(CancellationToken.None);

        return Ok(requests);
    }

    // =========================
    // CREATE REQUEST
    // =========================
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateRequest([FromBody] UpdateRequest request)
    {
        if (request == null)
            return BadRequest("Dữ liệu không hợp lệ");

        var userName = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        request.RequesterId = userName;
        request.CreatedAt = DateTime.Now;
        request.Status = "Pending";

        _context.UpdateRequests.Add(request);
        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(new { message = "Tạo request thành công!" });
    }

    // =========================
    // APPROVE REQUEST
    // =========================
    [HttpPut("{id}/approve")]
    public async Task<IActionResult> ApproveRequest(int id)
    {
        var request = await _context.UpdateRequests
            .FirstOrDefaultAsync(r => r.Id == id, CancellationToken.None);

        if (request == null) return NotFound();
        if (request.Status != "Pending") return BadRequest("Request này đã được xử lý trước đó.");

        await using var transaction = await _context.Database.BeginTransactionAsync(CancellationToken.None);
        try
        {
            if (request.EntityType == "Stall")
            {
                var newData = JsonSerializer.Deserialize<StallDataDto>(request.NewDataJson);
                if (newData == null) return BadRequest("JSON không hợp lệ");
                Console.WriteLine($"[DEBUG] newData.status = '{newData.status}'");
                Console.WriteLine($"[DEBUG] request.EntityId = {request.EntityId}");

                string? imagePath = null;

                // Xử lý Image Base64
                if (!string.IsNullOrEmpty(newData.image_url) && newData.image_url.StartsWith("data:image"))
                {
                    var base64Data = newData.image_url.Split(',')[1];
                    var bytes = Convert.FromBase64String(base64Data);
                    var fileName = Guid.NewGuid() + ".png";
                    var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");

                    if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);

                    var filePath = Path.Combine(folder, fileName);
                    await System.IO.File.WriteAllBytesAsync(filePath, bytes, CancellationToken.None);
                    imagePath = "/images/" + fileName;
                }

                var statusEnum = MapStringToStatus(newData.status);
                Console.WriteLine($"[DEBUG] statusEnum = {statusEnum}");

                // CASE 1: CLAIM STALL
                if (request.EntityId > 0 && newData.status == "PendingClaim")
                {
                    var stall = await _context.Stalls
                        .FirstOrDefaultAsync(s => s.Id == request.EntityId, CancellationToken.None);
                    if (stall != null)
                    {
                        stall.OwnerId = request.RequesterId;
                        stall.Status = Stall.StallStatus.Active;
                        stall.IsClaimed = true;
                        var poi = await _context.NarrationPoints
                            .FirstOrDefaultAsync(p => p.Id == stall.NarrationPointsId, CancellationToken.None);
                        if (poi != null) poi.IsActive = true;
                    }
                    // Claim stall không cần lưu ảnh mới vào images
                }
                // CASE 2: CREATE NEW STALL
                else if (request.EntityId == 0)
                {
                    var newPoi = new NarrationPoint
                    {
                        Name = newData.stallName,
                        Latitude = newData.latitude,
                        Longitude = newData.longitude,
                        ActivationRadius = newData.activationRadius,
                        Priority = newData.priority,
                        ImageWeb = imagePath,
                        IsActive = (statusEnum == Stall.StallStatus.Active)
                    };
                    _context.NarrationPoints.Add(newPoi);
                    await _context.SaveChangesAsync(CancellationToken.None); // ← Save để có newPoi.Id

                    // ✅ THÊM MỚI: Lưu ảnh vào bảng images cho mobile app
                    if (!string.IsNullOrEmpty(imagePath))
                    {
                        _context.Images.Add(new Image
                        {
                            NarrationPointId = newPoi.Id,
                            ImageUrl = imagePath
                        });
                    }

                    var newStall = new Stall
                    {
                        CategoriesId = newData.categories_id,
                        NarrationPointsId = newPoi.Id,
                        Status = statusEnum,
                        OwnerId = request.RequesterId,
                        ImageUrl = imagePath
                    };
                    _context.Stalls.Add(newStall);

                    var newFood = new FoodPlace
                    {
                        NarrationPointId = newPoi.Id,
                        CategoryId = newData.categories_id,
                        PriceRange = newData.priceRange,
                        OpeningHours = newData.openingHours,
                        Description = newData.description
                    };
                    _context.FoodPlaces.Add(newFood);
                }
                // CASE 3: UPDATE EXISTING STALL
                else
                {
                    var stall = await _context.Stalls
                        .FirstOrDefaultAsync(s => s.Id == request.EntityId, CancellationToken.None);
                    if (stall != null)
                    {
                        stall.CategoriesId = newData.categories_id;
                        stall.Status = statusEnum;
                        if (!string.IsNullOrEmpty(imagePath)) stall.ImageUrl = imagePath;

                        var poi = await _context.NarrationPoints
                            .FirstOrDefaultAsync(p => p.Id == stall.NarrationPointsId, CancellationToken.None);
                        if (poi != null)
                        {
                            poi.Name = newData.stallName;
                            poi.Latitude = newData.latitude;
                            poi.Longitude = newData.longitude;
                            poi.IsActive = (statusEnum == Stall.StallStatus.Active);
                             if (!string.IsNullOrEmpty(imagePath)) poi.ImageWeb = imagePath;
                            // ✅ THÊM MỚI: Lưu ảnh vào bảng images cho mobile app
                            if (!string.IsNullOrEmpty(imagePath))
                            {
                                _context.Images.Add(new Image
                                {
                                    NarrationPointId = poi.Id,
                                    ImageUrl = imagePath
                                });
                            }
                        }

                        var food = await _context.FoodPlaces
                            .FirstOrDefaultAsync(f => f.NarrationPointId == stall.NarrationPointsId, CancellationToken.None);
                        if (food != null)
                        {
                            food.CategoryId = newData.categories_id;
                            food.PriceRange = newData.priceRange;
                            food.OpeningHours = newData.openingHours;
                            food.Description = newData.description;
                        }
                    }
                }
            }
            else if (request.EntityType == "Translation")
            {
                var transData = JsonSerializer.Deserialize<TranslationDataDto>(request.NewDataJson);
                if (transData == null) return BadRequest("Dữ liệu dịch không hợp lệ");
                Console.WriteLine($"[DEBUG] Translation entityId = {request.EntityId}");
                Console.WriteLine($"[DEBUG] languageCode = {transData.languageCode}");

                var lang = await _context.Languages
                    .FirstOrDefaultAsync(l => l.language_code == transData.languageCode, CancellationToken.None);
                if (lang == null) return BadRequest("Không tìm thấy ngôn ngữ");
                Console.WriteLine($"[DEBUG] lang.id = {lang.id}");

                var existing = await _context.NarrationTranslations
                    .FirstOrDefaultAsync(t => t.NarrationPointId == request.EntityId && t.LanguageId == lang.id, CancellationToken.None);
                Console.WriteLine($"[DEBUG] existing found = {existing != null}");

                if (existing != null)
                {
                    existing.Content = transData.content;
                    existing.TranslatedName = transData.translatedName;
                }
                else
                {
                    var poiExists = await _context.NarrationPoints
                        .AnyAsync(p => p.Id == request.EntityId, CancellationToken.None);

                    Console.WriteLine($"[DEBUG] poiExists = {poiExists}");

                    if (!poiExists)
                        return BadRequest($"POI {request.EntityId} không tồn tại, không thể tạo bản dịch mới.");

                    _context.NarrationTranslations.Add(new NarrationTranslation
                    {
                        NarrationPointId = request.EntityId,
                        LanguageId = lang.id,
                        LanguageCode = transData.languageCode,
                        Content = transData.content,
                        TranslatedName = transData.translatedName
                    });
                }
            }
            else if (request.EntityType == "FoodPlace")
            {
                var foodData = JsonSerializer.Deserialize<FoodDescriptionDto>(request.NewDataJson);

                if (foodData == null) return BadRequest("Dữ liệu không hợp lệ");

                var food = await _context.FoodPlaces
                    .FirstOrDefaultAsync(f => f.Id == request.EntityId, CancellationToken.None);

                await _context.SaveChangesAsync(CancellationToken.None);
                if (food == null) return BadRequest("Không tìm thấy FoodPlace");

                food.Description = foodData.Description;
            }

            request.Status = "Approved";
            await _context.SaveChangesAsync(CancellationToken.None);

            await transaction.CommitAsync(CancellationToken.None);
            return Ok(new { message = "Approved successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            return BadRequest(new { error = "Lỗi hệ thống: " + ex.Message });
        }
    }

    [HttpPut("{id}/reject")]
    public async Task<IActionResult> RejectRequest(int id)
    {
        var request = await _context.UpdateRequests.FindAsync(id);
        if (request == null) return NotFound();

        request.Status = "Rejected";
        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(new { message = "Đã từ chối yêu cầu." });
    }

    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile image, [FromQuery] int narrationPointId)
    {
        if (image == null || image.Length == 0)
            return BadRequest(new { error = "Không có file ảnh" });

        var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images");
        if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);

        var ext = Path.GetExtension(image.FileName);
        var fileName = Guid.NewGuid() + ext;
        var filePath = Path.Combine(folder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await image.CopyToAsync(stream, CancellationToken.None);
        }

        var path = "/images/" + fileName;

        // ✅ Lưu vào bảng images để app đọc được (giữ nguyên cũ)
        if (narrationPointId > 0)
        {
            _context.Images.Add(new Image
            {
                NarrationPointId = narrationPointId,
                ImageUrl = path
            });
            await _context.SaveChangesAsync(CancellationToken.None);
        }

        return Ok(new { path });
    }

    // --- DTOs ---
    public class StallDataDto
    {
        public string status { get; set; } = string.Empty;
        public int categories_id { get; set; }
        public int narration_points_id { get; set; }
        public string stallName { get; set; } = string.Empty;
        public float latitude { get; set; }
        public float longitude { get; set; }
        public string description { get; set; } = string.Empty;
        public int activationRadius { get; set; }
        public int priority { get; set; }
        public string image_url { get; set; } = string.Empty;
        public string priceRange { get; set; } = string.Empty;
        public string openingHours { get; set; } = string.Empty;
    }

    public class TranslationDataDto
    {
        public string languageCode { get; set; } = string.Empty;
        public string content { get; set; } = string.Empty;
        public string translatedName { get; set; } = string.Empty;
    }

    public class AudioDataDto
    {
        public string title { get; set; } = string.Empty;
        public string audioUrl { get; set; } = string.Empty;
        public string audioText { get; set; } = string.Empty;
        public int narrationPointId { get; set; }
    }

    public class FoodDescriptionDto
    {
        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }
}