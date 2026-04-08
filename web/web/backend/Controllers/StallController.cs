using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

    [Route("api/stalls")]
    [ApiController]
    public class StallsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StallsController(AppDbContext context)
        {
            _context = context;
        }
       [HttpGet("unclaimed")]
public async Task<IActionResult> GetUnclaimedStalls()
{
    var unclaimed = await _context.Stalls
        .Where(s => s.OwnerId == null && s.IsClaimed == false)  // ✅ filter cả 2
        .Join(_context.NarrationPoints,
            s => s.NarrationPointsId,
            n => n.Id,
            (s, n) => new { s, n })
        .Where(x => x.n.IsCommercial == true)
        .Select(x => new
        {
            id = x.s.Id,
            stallName = x.n.Name,
            imageUrl = x.s.ImageUrl,
            latitude = x.n.Latitude,
            longitude = x.n.Longitude,
        })
        .ToListAsync();

    return Ok(unclaimed);
}
        // GET: api/stalls
        // Trả về danh sách quán mà User sở hữu HOẶC các quán mồi (Unclaimed)
        [HttpGet]
public async Task<IActionResult> GetStalls()
{
    var userName = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    var stalls = await _context.Stalls
        .Include(s => s.Category)
        .Include(s => s.NarrationPoint)
        .Where(s => s.OwnerId == userName) 
        .Select(s => new {
            s.Id,
            CategoryId = s.CategoriesId,
            NarrationPointId = s.NarrationPointsId,
            CategoryName = s.Category != null ? s.Category.Name : "N/A",
            StallName = s.NarrationPoint != null ? s.NarrationPoint.Name : "N/A",
            Latitude = s.NarrationPoint != null ? s.NarrationPoint.Latitude : null,
            Longitude = s.NarrationPoint != null ? s.NarrationPoint.Longitude : null,
            ImageUrl = s.ImageUrl ?? (s.NarrationPoint != null ? s.NarrationPoint.ImageWeb : null),

            Status = s.Status.ToString(), // 👉 FE dễ dùng

            s.OwnerId,

            IsMine = s.OwnerId == userName,
            CanClaim = s.Status == Stall.StallStatus.Unclaimed && string.IsNullOrEmpty(s.OwnerId),

            priceRange = _context.FoodPlaces
                .Where(f => f.NarrationPointId == s.NarrationPointsId)
                .Select(f => f.PriceRange).FirstOrDefault(),

            openingHours = _context.FoodPlaces
                .Where(f => f.NarrationPointId == s.NarrationPointsId)
                .Select(f => f.OpeningHours).FirstOrDefault(),

            description = _context.FoodPlaces
                .Where(f => f.NarrationPointId == s.NarrationPointsId)
                .Select(f => f.Description).FirstOrDefault()
        })
        .ToListAsync();

    return Ok(stalls);
}

        // GET: api/stalls/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetStall(int id)
    {
        // 1. Lấy Stall
        var stallInfo = await _context.Stalls
            .Include(s => s.Category)
            .Include(s => s.NarrationPoint)
            .Where(s => s.Id == id)
            .FirstOrDefaultAsync();

        if (stallInfo == null) return NotFound(new { message = "Không tìm thấy quán." });

        // 2. Lấy FoodPlace
        var fp = await _context.FoodPlaces
            .FirstOrDefaultAsync(f => f.NarrationPointId == stallInfo.NarrationPointsId);

        // 3. Ghép dữ liệu
        var result = new {
            stallInfo.Id,
            stallInfo.CategoriesId,
            stallInfo.NarrationPointsId,
            CategoryName = stallInfo.Category != null ? stallInfo.Category.Name : "N/A",
            StallName = stallInfo.NarrationPoint != null ? stallInfo.NarrationPoint.Name : "N/A",
            Latitude = stallInfo.NarrationPoint != null ? stallInfo.NarrationPoint.Latitude : null,
            Longitude = stallInfo.NarrationPoint != null ? stallInfo.NarrationPoint.Longitude : null,
            stallInfo.Status,
            stallInfo.ImageUrl,
            stallInfo.OwnerId,
            // Gán dữ liệu từ FoodPlace
            priceRange = fp != null ? fp.PriceRange : null,
            openingHours = fp != null ? fp.OpeningHours : null,
            description = fp != null ? fp.Description : null
        };

        return Ok(result);
    }

        // POST: api/stalls/claim/{id}
        // Luồng 2: Seller nhận quán từ POI (quán mồi) do Admin tạo
       [HttpPost("claim/{stallId}")]
public async Task<IActionResult> ClaimStall(int stallId)
{
    var userName = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    var stall = await _context.Stalls.FindAsync(stallId);

    if (stall == null) return NotFound();

    if (stall.Status != Stall.StallStatus.Unclaimed || !string.IsNullOrEmpty(stall.OwnerId))
    {
        return BadRequest("Quán đã có người hoặc đang chờ duyệt");
    }

    stall.OwnerId = userName;
    stall.Status = Stall.StallStatus.Pending;

    await _context.SaveChangesAsync();

    return Ok("Đã gửi yêu cầu nhận quán");
}

        // POST: api/stalls
        // Luồng 1: Seller tự tạo quán mới hoàn toàn (phải đợi duyệt)
      [HttpPost]
public async Task<ActionResult<Stall>> PostStall(Stall stall)
{
    var userName = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    stall.OwnerId = userName;
    stall.Status = Stall.StallStatus.Pending;

    _context.Stalls.Add(stall);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetStall), new { id = stall.Id }, stall);
}

        // PUT: api/stalls/5
        // Cập nhật trực tiếp (Chỉ dành cho Owner)
       [HttpPut("{id}")]
public async Task<IActionResult> PutStall(int id, Stall stall)
{
    var userName = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    if (id != stall.Id) return BadRequest();

    var existing = await _context.Stalls.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);

    if (existing == null) return NotFound();
    if (existing.OwnerId != userName) return Forbid();

    // ❗ giữ nguyên status (không cho FE sửa trực tiếp)
    stall.Status = existing.Status;
    stall.OwnerId = existing.OwnerId;

    _context.Entry(stall).State = EntityState.Modified;

    await _context.SaveChangesAsync();

    return Ok("Updated");
}

        // PUT: api/stalls/5/request-update
        // Luồng cập nhật thông tin nhạy cảm qua Admin duyệt
        [HttpPut("{id}/request-update")]
        public async Task<IActionResult> UpdateStallRequest(int id, Stall updatedStall)
        {
            var userName = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var stall = await _context.Stalls.FindAsync(id);

            if (stall == null) return NotFound();
            if (stall.OwnerId != userName) return Forbid();

            var updateRequest = new UpdateRequest
            {
                EntityType = "Stall",
                EntityId = id,
                RequesterId = userName,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                NewDataJson = System.Text.Json.JsonSerializer.Serialize(new {
                    categories_id = updatedStall.CategoriesId,
                    narration_points_id = updatedStall.NarrationPointsId,
                    // Có thể thêm Description, PriceRange... tùy nhu cầu
                })
            };

            _context.UpdateRequests.Add(updateRequest);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Yêu cầu thay đổi đã được gửi tới Admin phê duyệt." });
        }

        private bool StallExists(int id)
        {
            return _context.Stalls.Any(e => e.Id == id);
        }
    }
