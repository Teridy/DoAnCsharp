using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
namespace web.Controllers
{
    [Route("api/audios")]
    [ApiController]    
    public class SellerAudioController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public SellerAudioController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // =========================
        // 🔊 API LẤY AUDIO THEO STALL
        // =========================
        [HttpGet("my-stall-audios")]
        [Authorize]
        public async Task<IActionResult> GetAudiosByMyStall()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var stall = await _context.Stalls
                .FirstOrDefaultAsync(s => s.OwnerId == userId); 

            if (stall == null) return NotFound("Không tìm thấy gian hàng của bạn.");

            var audios = await _context.Audios
                .Where(a => a.NarrationPointId == stall.NarrationPointsId)
                .Select(a => new {
                    a.Id,
                    a.Title,
                    a.AudioUrl,
                    a.AudioText,
                    a.NarrationPointId
                })
                .ToListAsync();

            return Ok(audios);
        }

        // =========================
        // 🎧 API TẠO AUDIO TỪ TEXT (TTS)
        // =========================
        [HttpPost("tts-generate")]
        [Authorize]
        public async Task<IActionResult> GenerateAudio([FromBody] TtsRequest request)
        {
            if (string.IsNullOrEmpty(request.Text))
                return BadRequest("Text is required");

            var apiKey = "DSd4X8XMFeIyjv6qb1uOiJwPmxNfl2GG"; // 🔥 thay bằng key của bạn

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("api-key", apiKey);

            var content = new StringContent(request.Text, Encoding.UTF8, "text/plain");

            var response = await client.PostAsync("https://api.fpt.ai/hmi/tts/v5", content);

            if (!response.IsSuccessStatusCode)
{
    var error = await response.Content.ReadAsStringAsync();
    return StatusCode(500, $"FPT lỗi: {error}");
}

           try
{
    var result = await response.Content.ReadAsStringAsync();

    var jsonDoc = JsonDocument.Parse(result);

    if (!jsonDoc.RootElement.TryGetProperty("async", out var asyncProp))
    {
        return StatusCode(500, "FPT không trả về URL");
    }

    string audioUrlFromFpt = asyncProp.GetString();

    await Task.Delay(3000); // 🔥 cực quan trọng

    var audioBytes = await client.GetByteArrayAsync(audioUrlFromFpt);

    var fileName = $"audio_{Guid.NewGuid()}.mp3";
    var folderPath = Path.Combine(_env.WebRootPath, "audio");

    if (!Directory.Exists(folderPath))
        Directory.CreateDirectory(folderPath);

    var filePath = Path.Combine(folderPath, fileName);

    await System.IO.File.WriteAllBytesAsync(filePath, audioBytes);

    var finalUrl = $"{Request.Scheme}://{Request.Host}/audio/{fileName}";

    return Ok(new { audioUrl = finalUrl });
}
catch (Exception ex)
{
    return StatusCode(500, ex.Message); // 👈 đặt ở đây
}
        }
    }

    // =========================
    // 📦 REQUEST MODEL
    // =========================
    public class TtsRequest
    {
        public string Text { get; set; }
    }
}