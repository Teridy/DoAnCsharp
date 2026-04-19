using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var totalUsers = await _context.UsersWeb.CountAsync();
        var totalPoi = await _context.NarrationPoints.CountAsync();
        var totalAudio = await _context.FoodPlaces.Where(f => f.Description != null && f.Description != "").CountAsync();
        var totalTours = await _context.Tours.CountAsync();
        var totalTranslations = await _context.NarrationTranslations.CountAsync();
        var totalHistory = await _context.Histories.CountAsync();
        var pendingRequests = await _context.UpdateRequests.Where(r => r.Status == "Pending").CountAsync();
        
        // Visitor stats
        var today = DateTime.UtcNow.Date;
        var visitorsToday = await _context.VisitorLogs.Where(v => v.CreatedAt >= today).CountAsync();
        var visitors7Days = await _context.VisitorLogs.Where(v => v.CreatedAt >= today.AddDays(-7)).CountAsync();
        var visitorsTotal = await _context.VisitorLogs.CountAsync();

        return Ok(new
        {
            totalUsers,
            totalPoi,
            totalAudio,
            totalTours,
            totalTranslations,
            totalHistory,
            pendingRequests,
            visitorsToday,
            visitors7Days,
            visitorsTotal
        });
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics()
    {
        var today = DateTime.UtcNow.Date;

        // Lượt truy cập 7 ngày gần nhất
        var daily = await _context.VisitorLogs
            .Where(v => v.CreatedAt >= today.AddDays(-6))
            .GroupBy(v => v.CreatedAt.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();

        // Fill missing days
        var dailyChart = new List<object>();
        for (int i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            var found = daily.FirstOrDefault(x => x.date == d);
            dailyChart.Add(new { date = d.ToString("dd/MM"), count = found?.count ?? 0 });
        }

        // Phân loại thiết bị
        var devices = await _context.VisitorLogs
            .GroupBy(v => v.DeviceType)
            .Select(g => new { device = g.Key, count = g.Count() })
            .ToListAsync();

        // 10 lượt truy cập gần nhất
        var recentVisits = await _context.VisitorLogs
            .OrderByDescending(v => v.CreatedAt)
            .Take(10)
            .Select(v => new { v.DeviceType, v.PageVisited, v.IpAddress, v.CreatedAt })
            .ToListAsync();

        return Ok(new { dailyChart, devices, recentVisits });
    }

    // Endpoint để log visitor (không cần auth)
    [HttpPost("/api/visitor/log")]
    [AllowAnonymous]
    public async Task<IActionResult> LogVisitor([FromBody] VisitorLogRequest req)
    {
        var log = new VisitorLog
        {
            SessionId = req.SessionId ?? Guid.NewGuid().ToString(),
            DeviceType = req.DeviceType ?? "unknown",
            UserAgent = Request.Headers["User-Agent"].ToString(),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            PageVisited = req.PageVisited ?? "/",
            CreatedAt = DateTime.UtcNow
        };
        _context.VisitorLogs.Add(log);
        await _context.SaveChangesAsync();
        return Ok(new { status = "logged" });
    }

    [HttpGet("active-users")]
    public IActionResult GetActiveUsers()
    {
        try
        {
            string path = @"c:\doan\active_users.json";
            if (!System.IO.File.Exists(path)) return Ok(new { activeCount = 0, positions = new List<object>() });
            
            string content = "";
            // Keep retry logic simple for concurrent reads
            for (int i=0; i<3; i++) {
                try {
                    using (var stream = new System.IO.FileStream(path, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.ReadWrite))
                    using (var reader = new System.IO.StreamReader(stream))
                    {
                        content = reader.ReadToEnd();
                    }
                    break;
                } catch { System.Threading.Thread.Sleep(50); }
            }

            if (string.IsNullOrWhiteSpace(content)) return Ok(new { activeCount = 0, positions = new List<object>() });

            var activeUsers = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, ActiveUserPing>>(content);
            if (activeUsers == null) return Ok(new { activeCount = 0, positions = new List<object>() });

            // Lọc user online trong 45 giây gần nhất
            var onlineUsers = activeUsers.Values
                .Where(u => u.lastSeen >= DateTime.UtcNow.AddSeconds(-45))
                .ToList();

            int count = onlineUsers.Count;

            // Trả về danh sách tọa độ GPS cho Heatmap real-time
            var positions = onlineUsers
                .Where(u => u.latitude.HasValue && u.longitude.HasValue)
                .Select(u => new { lat = u.latitude, lng = u.longitude })
                .ToList();

            return Ok(new { activeCount = count, positions });
        }
        catch
        {
            return Ok(new { activeCount = 0, positions = new List<object>() });
        }
    }
}

// DTO để parse active_users.json (khớp với UserPing ở Mobile API)
public class ActiveUserPing {
    public DateTime lastSeen { get; set; }
    public double? latitude { get; set; }
    public double? longitude { get; set; }
}

// ── Models ──
[Table("visitor_logs")]
public class VisitorLog
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("session_id")]
    public string SessionId { get; set; } = "";

    [Column("device_type")]
    public string DeviceType { get; set; } = "";

    [Column("user_agent")]
    public string UserAgent { get; set; } = "";

    [Column("ip_address")]
    public string IpAddress { get; set; } = "";

    [Column("page_visited")]
    public string PageVisited { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class VisitorLogRequest
{
    public string? SessionId { get; set; }
    public string? DeviceType { get; set; }
    public string? PageVisited { get; set; }
}