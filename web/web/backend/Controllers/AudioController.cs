using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

[Route("api/[controller]")]
[ApiController]
public class AudioController : ControllerBase
{
    private readonly AppDbContext _context;

    public AudioController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Audio
[HttpGet]
public async Task<IActionResult> GetAll()
{
    // Sắp xếp ID tăng dần ngay từ Backend
    var audios = await _context.Audios
                               .OrderBy(x => x.Id) 
                               .ToListAsync();
    return Ok(audios);
}
    // GET: api/Audio/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var audio = await _context.Audios.FindAsync(id);

        if (audio == null)
            return NotFound();

        return Ok(audio);
    }

    // POST: api/Audio
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Audio audio)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _context.Audios.Add(audio);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = audio.Id }, audio);
    }

    // PUT: api/Audio/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Audio updatedAudio)
    {
        if (id != updatedAudio.Id)
            return BadRequest(new { message = "ID không khớp" });

        var audio = await _context.Audios.FindAsync(id);

        if (audio == null)
            return NotFound(new { message = "Không tìm thấy Audio" });

        // Cập nhật đúng các trường theo Model mới (PascalCase)
        audio.Title = updatedAudio.Title;
        audio.AudioUrl = updatedAudio.AudioUrl;
        audio.NarrationPointId = updatedAudio.NarrationPointId;
        
        // Cập nhật 2 trường mới thêm
        audio.AudioText = updatedAudio.AudioText;
        audio.IsActive = updatedAudio.IsActive;

        await _context.SaveChangesAsync();

        return Ok(audio);
    }

    // DELETE: api/Audio/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var audio = await _context.Audios.FindAsync(id);

        if (audio == null)
            return NotFound();

        _context.Audios.Remove(audio);
        await _context.SaveChangesAsync();

        return NoContent(); // Code 204 NoContent là chuẩn nhất cho Delete
    }
    // POST: api/Audio/tts-generate
[HttpPost("tts-generate")]
public async Task<IActionResult> GenerateTTS([FromBody] dynamic body)
{
    try
    {
        string text = body?.text;

        if (string.IsNullOrEmpty(text))
            return BadRequest("Text is required");

        var client = new HttpClient();

        // 🔥 API KEY (bạn tự thay)
        var apiKey = "DSd4X8XMFeIyjv6qb1uOiJwPmxNfl2GG";

        client.DefaultRequestHeaders.Add("api-key", apiKey);
        client.DefaultRequestHeaders.Add("voice", "banmai"); // đổi giọng nếu thích
        client.DefaultRequestHeaders.Add("speed", "0");

        var content = new StringContent(text);

        var response = await client.PostAsync("https://api.fpt.ai/hmi/tts/v5", content);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            return StatusCode(500, $"FPT lỗi: {err}");
        }

        var result = await response.Content.ReadAsStringAsync();

        // 🔥 Parse JSON (KHÔNG dùng Newtonsoft để tránh lỗi của bạn)
        using var doc = System.Text.Json.JsonDocument.Parse(result);
        var audioUrl = doc.RootElement.GetProperty("async").GetString();

        return Ok(new { audioUrl });
    }
    catch (Exception ex)
    {
        return StatusCode(500, ex.Message); // 👈 debug lỗi thật
    }
}
}