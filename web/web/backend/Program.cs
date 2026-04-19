using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Mvc;
var builder = WebApplication.CreateBuilder(args);
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
// 1. Cấu hình dịch vụ (Add services)
builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});
// 🟢 SỬA Ở ĐÂY 1: Đổi thành AddDbContextPool để Npgsql quản lý luồng kết nối tốt hơn, tránh lỗi Disposed
// Đổi từ AddDbContextPool thành AddDbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .EnableSensitiveDataLogging()
           .EnableDetailedErrors()
);
// 2. Cấu hình CORS (cho phép ngrok + localhost)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// 3. Cấu hình JWT
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes("THIS_IS_MY_SUPER_SECRET_KEY_123456789"))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// 4. Khởi tạo dữ liệu Seed Data (Admin mặc định)
// 🟢 SỬA Ở ĐÂY 2: Chuyển sang dùng Async/Await để tránh block luồng Database lúc khởi động
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try {
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE update_requests ADD COLUMN IF NOT EXISTS admin_note text;");
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE tours ADD COLUMN IF NOT EXISTS description text;");
        await context.Database.ExecuteSqlRawAsync("UPDATE tours SET description = '' WHERE description IS NULL;");
        // Tạo bảng visitor_logs nếu chưa có
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS visitor_logs (
                id SERIAL PRIMARY KEY,
                session_id TEXT DEFAULT '',
                device_type TEXT DEFAULT '',
                user_agent TEXT DEFAULT '',
                ip_address TEXT DEFAULT '',
                page_visited TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        ");
        // Force reset admin password to "123456" on every startup
        var adminHash = BCrypt.Net.BCrypt.HashPassword("123456");
        await context.Database.ExecuteSqlRawAsync(
            $"UPDATE users_web SET hashpass = '{adminHash}' WHERE user_role = 'Admin'");
    } catch { }

    // Dùng AnyAsync thay vì Any
    if (!await context.UsersWeb.AnyAsync(u => u.UserRole == "Admin"))
    {
        var admin = new UserWeb
        {
            UserName = "admin",
            HashPass = BCrypt.Net.BCrypt.HashPassword("123456"),
            UserRole = "Admin",
            Email = "admin@gmail.com",
            Phone = "0123456789",
            Status = "Active"
        };

        context.UsersWeb.Add(admin);
        await context.SaveChangesAsync(); // Dùng SaveChangesAsync thay vì SaveChanges
    }
}

// 5. Cấu hình Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

// 📊 Visitor Tracking — tự động log mọi request GET vào visitor_logs
app.UseMiddleware<VisitorTrackingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Serve frontend static files từ wwwroot
app.UseDefaultFiles();
var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
provider.Mappings[".apk"] = "application/vnd.android.package-archive";
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider
});

// SPA fallback: mọi route không phải API → trả về index.html
app.MapFallbackToFile("index.html");

app.Run();

// ══════════════════════════════════════
// ── Visitor Tracking Middleware ──
// ══════════════════════════════════════
public class VisitorTrackingMiddleware
{
    private readonly RequestDelegate _next;

    public VisitorTrackingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "/";
        if (context.Request.Method == "GET"
            && !path.StartsWith("/api/")
            && !path.Contains(".")
            && !path.StartsWith("/_"))
        {
            try
            {
                using var scope = context.RequestServices.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var userAgent = context.Request.Headers["User-Agent"].ToString();
                var deviceType = userAgent.Contains("Mobile") ? "Mobile"
                    : userAgent.Contains("Android") ? "Mobile"
                    : userAgent.Contains("iPhone") ? "Mobile"
                    : "Desktop";

                db.VisitorLogs.Add(new VisitorLog
                {
                    SessionId = context.Connection.Id ?? Guid.NewGuid().ToString(),
                    DeviceType = deviceType,
                    UserAgent = userAgent.Length > 200 ? userAgent[..200] : userAgent,
                    IpAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    PageVisited = path,
                    CreatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
            }
            catch { /* Không block request nếu logging lỗi */ }
        }

        await _next(context);
    }
}
