using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
// Lưu ý: Thêm using cho namespace chứa AppDbContext và NarrationTranslation của bạn

namespace YourNamespace.Controllers // Đổi lại tên namespace cho đúng với project của bạn
{
    [Authorize] // Yêu cầu có token Bearer hợp lệ từ frontend
    [Route("api/Translation")] // Cố định route này để khớp hoàn toàn với React frontend
    [ApiController]
    public class NarrationTranslationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NarrationTranslationController(AppDbContext context)
        {
            _context = context;
        }

        // =========================
        // GET ALL
        // =========================
        // =========================
// GET ALL
// =========================
[HttpGet]
public async Task<IActionResult> GetAll()
{
    // Thêm OrderBy ở đây để ID luôn chạy từ nhỏ đến lớn
    var data = await _context.NarrationTranslations
                             .OrderBy(x => x.Id) 
                             .ToListAsync();
    return Ok(data);
}
        // =========================
        // GET BY ID
        // =========================
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var item = await _context.NarrationTranslations.FindAsync(id);

            if (item == null)
                return NotFound(new { message = "Không tìm thấy bản dịch này." });

            return Ok(item);
        }

        // 🔥 GET theo narration point 
        [HttpGet("by-point/{pointId}")]
        public async Task<IActionResult> GetByPoint(int pointId)
        {
            var data = await _context.NarrationTranslations
                .Where(x => x.NarrationPointId == pointId)
                .ToListAsync();

            return Ok(data);
        }

        // 🔥 GET theo language
        [HttpGet("by-language/{lang}")]
        public async Task<IActionResult> GetByLanguage(string lang)
        {
            var data = await _context.NarrationTranslations
                .Where(x => x.LanguageCode == lang)
                .ToListAsync();

            return Ok(data);
        }

        // =========================
        // CREATE
        // =========================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] NarrationTranslation item)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.NarrationTranslations.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
        }

        // =========================
        // UPDATE
        // =========================
        [HttpPut("{id}")]
public async Task<IActionResult> Update(int id, [FromBody] NarrationTranslation updated)
{
    if (id != updated.Id)
        return BadRequest(new { message = "ID không khớp." });

    var item = await _context.NarrationTranslations.FindAsync(id);
    if (item == null) return NotFound();

    // Cập nhật ĐẦY ĐỦ các trường
    item.LanguageCode = updated.LanguageCode;
    item.Content = updated.Content;
    item.NarrationPointId = updated.NarrationPointId;
    
    // 🔥 THÊM DÒNG NÀY (Thay TranslatedName bằng tên cột thực tế của bạn)
    item.TranslatedName = updated.TranslatedName; 

    await _context.SaveChangesAsync();
    return Ok(item);
}

       // =========================
// DELETE
// =========================
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(int id)
{
    var item = await _context.NarrationTranslations.FindAsync(id);

    if (item == null)
        return NotFound(new { message = "Không tìm thấy bản dịch để xóa." });

    _context.NarrationTranslations.Remove(item);
    await _context.SaveChangesAsync();

    // Trả về Ok kèm message để Frontend dễ xử lý
    return Ok(new { message = "Xóa bản dịch thành công!" });
}
    }
}