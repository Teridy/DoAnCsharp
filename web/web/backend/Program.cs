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
// 2. Cấu hình CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:6173")
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

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.UseStaticFiles();
app.Run();
