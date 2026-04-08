# TÀI LIỆU HƯỚNG DẪN DỰ ÁN FOODMAP NGHIỆP VỤ KỸ THUẬT SÂU TỪNG BƯỚC (STEP-BY-STEP)

Tài liệu này là bản **cầm tay chỉ việc** để triển khai dự án FoodMap. Nếu làm theo đúng các bước dưới đây, hệ thống đảm bảo sẽ khởi chạy thành công 100% trên một máy tính hoàn toàn mới (của người triển khai hoặc Hội đồng chấm thi).

---

## PHẦN 1: ĐIỀU KIỆN TIÊN QUYẾT (PREREQUISITES)
Trước khi bắt đầu, hãy đảm bảo máy tính đã cài đặt các phần mềm nền tảng sau:
- **.NET SDK 10.0** (Tải từ trang chính thức Microsoft): Dùng để biên dịch API C#.
- **Node.js (Bản LTS 18.x hoặc 20.x)**: Để tải Node Modules cho React/Vite.
- **Android Studio (Bản Iguana, Koala hoặc mới nhất)**: Để chạy ứng dụng giả lập điện thoại.
- Trình soạn thảo Code: **Visual Studio Code (VS Code)** hoặc Visual Studio 2022.

---

## PHẦN 2: CẤU HÌNH CLOUD DATABASE SUPABASE & XỬ LÝ LÕI DB

Supabase (PostgreSQL) là bộ não trung tâm lưu trữ toàn bộ dữ liệu. Khi mang dự án sang triển khai ở một máy mới, **bạn nên tạo một Project Supabase mới tinh** để tránh xung đột cấu trúc dữ liệu với máy tính cũ.

### Bước 2.1: Khởi tạo Project Database Mới Cứng
1. Trình duyệt truy cập: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Tại màn hình chính, nhấn vào nút xanh lá cây **"New Project"**.
3. Khai báo các thông tin sau:
   - **Database Password:** Gõ một mật khẩu thật mạnh (Ví dụ: `qmwrmz_VinhKhanh2026!`). **HÃY LƯU MẬT KHẨU NÀY RA NOTEBOOK LẠI** vì nó sẽ không hiện lại lần 2.
   - **Region:** Chọn khu vực **Singapore** hoặc **Tokyo (Japan)** để đường truyền mạng ổn định nhất.
4. Bấm **"Create new project"**. Đợi khoảng 2-3 phút để Supabase thiết lập hệ thống.

> 🛠️ **Mẹo reset Database (Nếu triển khai lại trên DB cũ):**  
> Nếu bạn xài lại DB cũ và bị lỗi "Table already exists", hãy vào menu **SQL Editor** trên Supabase, gõ câu lệnh càn quét sạch sẽ sau và bấm Run để dọn mặt bằng:  
> `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`  
> *(Hệ thống EF Core sau đó sẽ tự tự động xây lại nhà mới ngay lập tức)*.

### Bước 2.2: Lấy Chuỗi Kết Nối CSDL (Connection Pooler - Chống Quá Tải)
> ⚠️ **Chú ý:** Trình biên dịch C# localhost (IPv4) thường hay lỗi xung đột khi kết nối Direct tới Supabase IPv6 mạng mới. **Bắt buộc** lấy chuỗi dùng cơ chế "Connection Pooling".

1. Cột menu bên trái, tìm biểu tượng bánh răng **Project Settings** (Cài đặt) -> Chọn mục **Database**.
2. Kéo xuống phần **Connection String** -> Chọn thẻ **URI**.
3. **Đánh dấu tick** vào thanh trượt bật **Use connection pooling** (Lúc này cổng Port rẽ nhánh thành `6543`).
4. Copy toàn bộ chuỗi URL. Chuỗi tiêu chuẩn sẽ trông như sau:
   ```text
   postgresql://postgres.qmwrmzpdbgfaq...pooler.supabase.com:6543/postgres
   ```
5. Đổi chữ `[YOUR-PASSWORD]` thành mật khẩu ở Bước 2.1. (Xóa luôn cả hai dấu ngoặc).

### Bước 2.3: Lấy Mã Khóa Giao Tiếp API
1. Vẫn ở **Project Settings**, chọn mục **API**.
2. Ô **Project URL**, bấm nút copy link URL (Ví dụ: `https://qmwrmzpdbgfaq.supabase.co`).
3. Khung **Project API keys**, tìm **`anon / public`**. Bấm nút copy đoạn Token cực dài này. 

### Bước 2.4: Mở Không Gian Lưu Trữ Ảnh (Storage Bucket)
Vì đồ án cần upload ảnh món ăn:
1. Nhìn menu bên trái thanh Navigation của Supabase, bấm vào chữ **Storage**.
2. Bấm **"New bucket"** -> Nhập tên bucket bắt buộc đúng là `FoodMapApp`.
3. Bật nấc **"Public bucket"** -> Nhấn Save. *(Ảnh món ăn lúc này mới có link đường dẫn để hiển thị).*

---

## PHẦN 3: TÍCH HỢP & XỬ LÝ XUNG ĐỘT PORT BACKEND (.NET)

Hệ thống có 2 máy chủ API. Việc triển khai lên máy mới cực kỳ dễ kẹt cổng (Trùng Port) nếu người dùng đang có các phần mềm khác chiếm sóng (như XAMPP, IIS, SQL Server).

### 3.1 Cấu Hình Hệ Thống Web API (Cổng mặc định: 6050)
1. Mở VS Code, truy cập đường dẫn: `c:\doan\web\web\backend\`
2. Mở file `appsettings.json`. Chỉnh sửa lại nội dung (Thế biến Supabase):
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=aws-0-ap-northeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.[ID_SUPABASE_CỦA_BẠN];Password=[MẬT_KHẨU]"
     },
     "Supabase": {
       "Url": "https://[ID_SUPABASE_CỦA_BẠN].supabase.co",
       "AnonKey": "eyJh..."
     }
   }
   ```
3. Chạy Server bằng Terminal:
   ```bash
   cd c:\doan\web\web\backend
   dotnet restore      
   dotnet run          
   ```
   > 🔴 **NẾU BỊ VĂNG LỖI TRÙNG PORT (Port is already in use):**  
   > Cách 1: Thay vì gõ `dotnet run`, hãy ép nó chạy cổng khác bằng lệnh thủ công: `dotnet run --urls "http://localhost:6058"`  
   > Cách 2: Tìm file `Properties/launchSettings.json`, sửa con số `6050` thành `6058`. 
   
   *✨ Ảo thuật xảy ra:* Bất chấp Data cũ hay mới, khi gõ lệnh run, Entity Framework sẽ tự động bay lên Supabase để kiểm kê và **Cài đặt mọi Table tự động**. 

### 3.2 Khởi Chạy Giao Diện Quản Trị Web React (Cổng mặc định: 6173)
1. Bật Terminal CMD mới (Không tắt cái đang chạy).
2. Trỏ đường dẫn vào thư mục Frontend:
   ```bash
   cd c:\doan\web\web\frontend
   npm install         
   npm run dev         
   ```
   > 🔴 **Chú ý Đổi Port Frontend:** Nếu Vite báo cổng `6173` đã bị chiếm, hãy mở file `vite.config.js` sửa khối `server: { port: 6173 }` thành Số mới. Kế tiếp, nhớ Update file `App.js` của Frontend trùng với cổng API Backend nếu ở trên bạn chọc thay đổi số `6050`.
3. Mở rình duyệt Chrome, truy cập: `http://localhost:6173`. 
   - **Tài khoản Admin CMS tự sinh là:** `thanh123`, mật khẩu: `123`.

---

## PHẦN 4: TÍCH HỢP KHỐI MOBILE PWA (ANDROID STUDIO)

Khối Mobile tích hợp bản đồ Bản địa (React PWA) giao tiếp với API thứ 2.

### 4.1 Chạy API Mobile Độc Lập (Cổng mặc định: 6111)
1. Bật Terminal mới, lặp lại quy trình chép `appsettings.json` của Web API đem qua cho App API.
   ```bash
   cd c:\doan\app\app\FoodMapAPI
   dotnet run
   ```
   > 🔴 Nếu bị báo kẹt port `6111`, ép nó bằng lệnh: `dotnet run --urls "http://0.0.0.0:6699"`

### 4.2 Biên Dịch App Mobile
1. Tại Terminal mới:
   ```bash
   cd c:\doan\app\app\foodmap-fe
   npm install
   ```
2. Mở file `src/App.js` dòng 228. Đây là con át chủ bài.
   - Nếu bạn chạy Android Studio (Máy ảo thiết bị), phải cắm cố định API dạng này thì điện thoại mới hiểu: 
     ```javascript
     const API_BASE = "http://10.0.2.2:6111/api"; 
     ```
   - (Chú ý: Đổi `6111` sang số khác nếu ở 4.1 bạn lỡ bắt ép cổng).
3. Đóng băng tệp React thành Website tĩnh:
   ```bash
   npm run build
   ```

### 4.3 Cấy Gói Giao Diện Vào Android Studio Hướng Thực Tế
Phép màu xảy ra ở bước nhồi WebView:
1. File Android chỉ đọc thư mục `build`. Vì vậy hãy **xóa hoàn toàn** thư mục cũ và chép nguyên xi thư mục `build` mới tạo từ ổ `c:\doan\app\app\foodmap-fe\build\*` vào đường rãnh: 
   `c:\doan\app\app\AndroidStudioProjects\FoodMapApp\app\src\main\assets\build\`
2. Mở phần mềm **Android Studio**. Mở đúng thư mục gốc: `c:\doan\app\app\AndroidStudioProjects\FoodMapApp`.
3. **CẢNH BÁO ĐỎ TỪ KINH NGHIỆM THỰC TẾ:** Nếu máy bạn đã mở Android Emulator rác từ trước, Android sẽ dính bộ nhớ đệm Cache PWA rất dai dẳng. Đề xuất: Trong máy ảo, **gỡ bỏ hoàn toàn ứng dụng FoodMapApp (Uninstall App)**. 
4. Chờ thanh Loading Gradle Sync dưới đáy màn hình lướt đi xong.
5. Nhấn phím 🟢 **Run App** (Khởi chạy ứng dụng). Thiết bị ảo sẽ hiện ngay Giao diện Tone màu Cam Đỏ siêu sắc nét có kích hoạt sẵn radar định vị Bản đồ.

*(Kết Thúc Hoàn Toàn Cấu Hình Hệ Thống Thực Chiến)*
