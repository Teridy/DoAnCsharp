using Microsoft.EntityFrameworkCore;
using Supabase;

var builder = WebApplication.CreateBuilder(args);

//  1. CẤU HÌNH KẾT NỐI SUPABASE (THAY THẾ MYSQL/XAMPP)
// Lấy URL và Anon Key từ Dashboard Supabase -> Settings -> API
var supabaseUrl = "https://qmwrmzpdbgfaqhrlayfz.supabase.co"; 
var supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtd3JtenBkYmdmYXFocmxheWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NDA3NDAsImV4cCI6MjA5MTExNjc0MH0.oJQyJjF6fPbz8E29Bl5JLUeTTpQIt83akaLTtw827X4"; // 👈 Thay Key thật của bạn vào đây

builder.Services.AddScoped(_ => 
    new Supabase.Client(supabaseUrl, supabaseKey, new SupabaseOptions { 
        AutoConnectRealtime = true 
    })
);

//  2. CẤU HÌNH CORS (CHO PHÉP REACT TRUY CẬP)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddControllers();  

//  3. ĐĂNG KÝ SWAGGER ĐỂ TEST API
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

//  4. CẤU HÌNH MIDDLEWARE
app.UseCors("AllowReact");

// Hiển thị giao diện Swagger để bạn test thử API trên trình duyệt
app.UseSwagger();
app.UseSwaggerUI();

app.UseStaticFiles(); // Cho phép truy cập các file ảnh trong thư mục wwwroot
app.UseAuthorization();
app.MapControllers();

// Thông báo trạng thái khi chạy App
Console.WriteLine("🚀 [SERVER] Backend FoodMap đang chạy tại: http://localhost:6111");
Console.WriteLine("☁️ [DATABASE] Đã kết nối với Supabase Cloud");

app.Run();
