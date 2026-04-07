# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN FOODMAP
## Hệ Thống Thuyết Minh Ẩm Thực — Phố Ẩm Thực Vĩnh Khánh

---

## MỤC LỤC

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Thiết lập Database (Supabase)](#3-thiết-lập-database-supabase)
4. [Chạy Web Admin (Quản trị)](#4-chạy-web-admin-quản-trị)
5. [Chạy Mobile Backend (API cho App)](#5-chạy-mobile-backend-api-cho-app)
6. [Chạy Mobile Frontend (React Web)](#6-chạy-mobile-frontend-react-web)
7. [Chạy Android App](#7-chạy-android-app)
8. [Tài khoản mặc định](#8-tài-khoản-mặc-định)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Xử lý lỗi thường gặp](#10-xử-lý-lỗi-thường-gặp)

---

## 1. Yêu cầu hệ thống

### Phần mềm bắt buộc

| Phần mềm | Phiên bản tối thiểu | Kiểm tra | Link tải |
|---|---|---|---|
| **.NET SDK** | .NET 10 | `dotnet --version` | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| **Node.js** | v18+ | `node -v` | [nodejs.org](https://nodejs.org) |
| **npm** | v9+ | `npm -v` | Đi kèm Node.js |
| **Android Studio** | Ladybug+ | Mở Android Studio | [developer.android.com](https://developer.android.com/studio) |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com) |

### Phần cứng đề nghị

| Tài nguyên | Tối thiểu | Đề nghị |
|---|---|---|
| RAM | 8 GB | 16 GB |
| Ổ cứng | 20 GB trống | SSD |
| CPU | 4 cores | 8 cores (để chạy Android Emulator) |
| Mạng | Cần kết nối internet | Để kết nối Supabase Cloud |

### Kiểm tra nhanh

Mở PowerShell và chạy:

```powershell
# Kiểm tra .NET
dotnet --version

# Kiểm tra Node.js
node -v
npm -v

# Kiểm tra Git
git --version
```

---

## 2. Cấu trúc thư mục

```
c:\doan\
├── app\app\                              # 📱 Phần Mobile
│   ├── AndroidStudioProjects\            # Android App (Kotlin)
│   │   └── FoodMapApp\
│   │       ├── app\src\main\
│   │       │   ├── java\...\MainActivity.kt
│   │       │   ├── assets\               # ⭐ Chứa React build + SQLite DB
│   │       │   └── AndroidManifest.xml
│   │       └── build.gradle.kts
│   │
│   ├── FoodMapAPI\                       # Backend API cho Mobile
│   │   ├── Controllers\                  # 4 Controller
│   │   ├── Models\                       # 9 Model
│   │   ├── wwwroot\                      # Static files (ảnh, audio)
│   │   ├── Program.cs                    # Entry point (port 5111)
│   │   └── FoodMapAPI.csproj
│   │
│   └── foodmap-fe\                       # React Frontend (CRA)
│       └── src\
│           ├── App.js                    # App chính (50K+ lines)
│           └── offlineDB.js              # SQLite offline
│
├── web\web\                              # 🌐 Phần Web Admin
│   ├── backend\                          # Backend API cho Web
│   │   ├── Controllers\                  # 15 Controller
│   │   ├── Models\                       # 15 Model
│   │   ├── AppDbContext.cs               # EF Core Database Context
│   │   ├── Program.cs                    # Entry point (port 5050)
│   │   └── web.csproj
│   │
│   └── frontend\                         # React Frontend (Vite)
│       └── src\
│           ├── admin\                    # 8 trang Admin
│           ├── seller\                   # 3 trang Seller
│           ├── App.jsx                   # Router chính
│           └── Login.jsx                 # Trang đăng nhập
│
└── BAO_CAO_DU_AN.md                      # File báo cáo
```

---

## 3. Thiết lập Database (Supabase)

### Bước 3.1: Tạo tài khoản Supabase

1. Truy cập [https://supabase.com](https://supabase.com)
2. Đăng ký bằng **GitHub** (nhanh nhất)
3. Tạo **Organization** → chọn plan **Free**

### Bước 3.2: Tạo Project

1. Nhấn **"New Project"**
2. Điền:
   - **Project Name**: `foodmap`
   - **Database Password**: Đặt mật khẩu mạnh (ghi nhớ để dùng sau)
   - **Region**: `Southeast Asia (Singapore)` hoặc `Northeast Asia (Tokyo)`
3. Nhấn **"Create new project"** → đợi 1-2 phút

### Bước 3.3: Lấy thông tin kết nối

1. Vào **Settings → API** để lấy:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon (public) key**: Dùng cho Mobile Backend

2. Vào **Settings → Database** để lấy:
   - **Connection String** (chọn URI format, dùng Pooler port 6543)

### Bước 3.4: Tạo bảng

1. Vào **SQL Editor** (sidebar trái)
2. Tạo file SQL mới, paste toàn bộ script bên dưới:

```sql
-- ========================================
-- DATABASE SCHEMA CHO FOODMAP
-- ========================================

-- 1. users_web
CREATE TABLE IF NOT EXISTS users_web (
    user_name VARCHAR(100) PRIMARY KEY,
    hashpass VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) DEFAULT 'Seller',
    email VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active'
);

-- 2. languages
CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    language_name VARCHAR(100) NOT NULL,
    language_code VARCHAR(10) NOT NULL
);
INSERT INTO languages (language_name, language_code) VALUES
    ('Tiếng Việt', 'vi'), ('English', 'en'),
    ('日本語', 'ja'), ('中文', 'zh')
ON CONFLICT DO NOTHING;

-- 3. categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
INSERT INTO categories (name) VALUES
    ('Ẩm thực đường phố'), ('Quán ăn'),
    ('Nhà hàng'), ('Café & Đồ uống')
ON CONFLICT DO NOTHING;

-- 4. narration_points
CREATE TABLE IF NOT EXISTS narration_points (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    activation_radius INTEGER DEFAULT 50,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    image_web VARCHAR(500),
    is_commercial BOOLEAN DEFAULT false
);

-- 5. narration_translations
CREATE TABLE IF NOT EXISTS narration_translations (
    id SERIAL PRIMARY KEY,
    language_code VARCHAR(10),
    language_id INTEGER REFERENCES languages(id),
    content TEXT,
    narration_point_id INTEGER REFERENCES narration_points(id),
    translated_name VARCHAR(255)
);

-- 6. tours
CREATE TABLE IF NOT EXISTS tours (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. tour_pois
CREATE TABLE IF NOT EXISTS tour_pois (
    id SERIAL PRIMARY KEY,
    tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
    poi_id INTEGER REFERENCES narration_points(id) ON DELETE CASCADE
);

-- 8. food_places
CREATE TABLE IF NOT EXISTS food_places (
    id SERIAL PRIMARY KEY,
    narration_point_id INTEGER REFERENCES narration_points(id),
    category_id INTEGER,
    price_range VARCHAR(50),
    opening_hours VARCHAR(100),
    description TEXT
);

-- 9. stalls
CREATE TABLE IF NOT EXISTS stalls (
    id SERIAL PRIMARY KEY,
    categories_id INTEGER REFERENCES categories(id),
    narration_points_id INTEGER REFERENCES narration_points(id) ON DELETE SET NULL,
    latitude REAL,
    longitude REAL,
    audios_id INTEGER,
    status VARCHAR(20) DEFAULT 'Unclaimed',
    owner_id VARCHAR(100),
    image_url VARCHAR(500),
    is_claimed BOOLEAN DEFAULT false
);

-- 10. audios
CREATE TABLE IF NOT EXISTS audios (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    audio_url VARCHAR(500),
    audio_text TEXT,
    is_active BOOLEAN DEFAULT true,
    narration_point_id INTEGER REFERENCES narration_points(id)
);

-- 11. images
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    narration_point_id INTEGER REFERENCES narration_points(id),
    image_url VARCHAR(500)
);

-- 12. histories
CREATE TABLE IF NOT EXISTS histories (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    users_id INTEGER,
    narration_points_id INTEGER REFERENCES narration_points(id),
    device_os VARCHAR(50),
    device_model VARCHAR(100),
    session_id VARCHAR(100),
    is_success BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. update_requests
CREATE TABLE IF NOT EXISTS update_requests (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER,
    entity_type VARCHAR(50) DEFAULT 'Audio',
    new_data_json TEXT,
    requester_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Pending',
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

3. Nhấn **"Run"** để thực thi

### Bước 3.5: Cập nhật Connection String trong code

#### Web Backend (`c:\doan\web\web\backend\appsettings.json`)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.YOUR_PROJECT_REF;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true;No Reset On Close=true;Max Auto Prepare=0;"
  },
  "Jwt": {
    "Key": "THIS_IS_MY_SUPER_SECRET_KEY_123456789"
  }
}
```

#### Mobile Backend (`c:\doan\app\app\FoodMapAPI\Program.cs`, dòng 8-9)

```csharp
var supabaseUrl = "https://YOUR_PROJECT_REF.supabase.co"; 
var supabaseKey = "YOUR_ANON_KEY";
```

> ⚠️ Thay `YOUR_PROJECT_REF`, `YOUR_PASSWORD`, `YOUR_ANON_KEY` bằng giá trị thật từ dashboard Supabase.

---

## 4. Chạy Web Admin (Quản trị)

### Bước 4.1: Chạy Backend

Mở **Terminal 1**:

```powershell
cd c:\doan\web\web\backend
dotnet restore
dotnet run
```

Kết quả thành công:
```
Now listening on: http://localhost:5050
Application started. Press Ctrl+C to shut down.
```

> Backend sẽ tự động tạo tài khoản Admin mặc định lần đầu khởi động.

### Bước 4.2: Chạy Frontend

Mở **Terminal 2**:

```powershell
cd c:\doan\web\web\frontend
npm install    # Chỉ cần lần đầu
npm run dev
```

Kết quả thành công:
```
VITE v5.4.21  ready in 739 ms
➜  Local:   http://localhost:5173/
```

### Bước 4.3: Truy cập

1. Mở trình duyệt → `http://localhost:5173`
2. Nhấn **"Đăng nhập"**
3. Nhập: **admin** / **123456**
4. Vào trang Admin Dashboard

---

## 5. Chạy Mobile Backend (API cho App)

Mở **Terminal 3**:

```powershell
cd c:\doan\app\app\FoodMapAPI
dotnet restore
dotnet run
```

Kết quả thành công:
```
🚀 [SERVER] Backend FoodMap đang chạy tại: http://localhost:5111
☁️ [DATABASE] Đã kết nối với Supabase Cloud
Now listening on: http://0.0.0.0:5111
```

Test API: Mở trình duyệt → `http://localhost:5111/swagger`

---

## 6. Chạy Mobile Frontend (React Web)

Mở **Terminal 4**:

```powershell
cd c:\doan\app\app\foodmap-fe
npm install    # Chỉ cần lần đầu
npm start
```

Kết quả thành công:
```
Compiled successfully!
Local: http://localhost:3000
```

---

## 7. Chạy Android App

### Cách 1: Command Line (Nhanh nhất)

#### Bước 7.1: Build APK

```powershell
cd c:\doan\app\app\AndroidStudioProjects\FoodMapApp
.\gradlew.bat assembleDebug
```

Đợi build xong (lần đầu khoảng 3-5 phút).

#### Bước 7.2: Bật Emulator

Mở Android Studio → **Device Manager** (bên phải) → nhấn **▶** cạnh Pixel 7.

Hoặc từ command line:

```powershell
# Liệt kê emulator có sẵn
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds

# Bật emulator (thay "Pixel_7_API_34" bằng tên emulator của bạn)
Start-Process -NoNewWindow "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd Pixel_7_API_34"
```

#### Bước 7.3: Cài APK lên Emulator

```powershell
# Kiểm tra emulator đã kết nối
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices

# Cài APK
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "c:\doan\app\app\AndroidStudioProjects\FoodMapApp\app\build\outputs\apk\debug\app-debug.apk"

# Mở app
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell am start -n com.example.foodmapapp/.MainActivity
```

### Cách 2: Android Studio (GUI)

1. Mở Android Studio
2. **File → Open** → chọn `c:\doan\app\app\AndroidStudioProjects\FoodMapApp`
3. Đợi Gradle sync hoàn tất
4. Mở **Device Manager** → tạo hoặc bật emulator Pixel
5. Nhấn **▶ Run** (Shift+F10)

### Cách 3: Chạy trên điện thoại thật 

> 📱 App Android chạy **hoàn toàn offline** từ thư mục `assets/` (WebView), không cần kết nối server. Chỉ cần cắm USB và cài APK.

#### Bước 3.1: Bật chế độ Nhà phát triển

**Trên điện thoại Android** (ví dụ OPPO A53 - ColorOS):

1. Mở **Cài đặt** (Settings)
2. Vào **Giới thiệu điện thoại** (About Phone)
3. Nhấn vào **Số phiên bản** (Build Number) — nhấn **7 lần liên tục**
4. Nhập mã PIN/mật khẩu màn hình nếu được hỏi
5. Sẽ hiện thông báo: **"Bạn đã trở thành nhà phát triển"** ✅

> 💡 Trên các dòng OPPO/Realme (ColorOS): **Cài đặt → Giới thiệu điện thoại → Số phiên bản**
> 💡 Trên Samsung (One UI): **Cài đặt → Giới thiệu điện thoại → Thông tin phần mềm → Số hiệu bản dựng**
> 💡 Trên Xiaomi (MIUI): **Cài đặt → Giới thiệu điện thoại → Phiên bản MIUI**

#### Bước 3.2: Bật USB Debugging (Gỡ lỗi USB)

1. Quay lại **Cài đặt**
2. Vào **Cài đặt bổ sung** (Additional Settings) — trên Samsung thì vào **Tùy chọn nhà phát triển** trực tiếp
3. Chọn **Tùy chọn nhà phát triển** (Developer Options)
4. Bật **Gỡ lỗi USB** (USB Debugging) → nhấn **Cho phép** (OK)
5. *(Quan trọng trên OPPO)* Bật luôn **Cài đặt qua USB** (Install via USB) nếu có
6. *(Quan trọng trên OPPO)* Bật **Tắt giám sát quyền** (Disable Permission Monitoring) nếu có

#### Bước 3.3: Kết nối điện thoại với máy tính

1. Dùng **cáp USB** (Type-C hoặc Micro-USB) cắm điện thoại vào máy tính
2. Trên điện thoại hiện popup chọn chế độ USB → chọn **Truyền tệp** (File Transfer / MTP)
3. Popup tiếp theo hỏi **"Cho phép gỡ lỗi USB?"**:
   - Đánh dấu ☑ **"Luôn cho phép từ máy tính này"**
   - Nhấn **Cho phép** (Allow)

#### Bước 3.4: Kiểm tra kết nối

Mở PowerShell trên máy tính, chạy:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Kết quả thành công phải hiện:
```
List of devices attached
XXXXXXXX    device
```

> ⚠️ Nếu hiện `unauthorized` → kiểm tra popup trên điện thoại, nhấn **Cho phép**
> ⚠️ Nếu không hiện gì → thử đổi cáp USB khác (một số cáp chỉ sạc, không truyền dữ liệu)

#### Bước 3.5: Chạy App từ Android Studio

1. Mở **Android Studio** với project FoodMapApp đã mở
2. Đợi **Gradle Sync** hoàn tất (thanh loading dưới cùng biến mất)
3. Nhấn vào **dropdown thiết bị** trên thanh toolbar:

```
┌─────────────────────────────────────────────────────┐
│  ◆ app ▼    📱 Pixel 7 API 34 ▼    [▶] [🔨] [🐛]  │
│     ①              ②                 ③              │
│                                                     │
│  ① Module app (không cần đổi)                       │
│  ② Nhấn vào đây → chọn điện thoại thật             │
│  ③ Nhấn nút Play ▶ xanh để chạy                    │
└─────────────────────────────────────────────────────┘
```

4. Trong danh sách dropdown ②, chọn **tên điện thoại** (ví dụ: `OPPO CPH2127`, `Samsung SM-A525F`...)
5. Nhấn nút **▶ Run** (③) hoặc phím tắt **Shift+F10**
6. Đợi build + cài APK (~1-2 phút lần đầu)
7. App **FoodMap** sẽ tự động mở trên điện thoại 🎉

#### Bước 3.6: Cấp quyền trên điện thoại

Khi app mở lần đầu, nhấn **Cho phép** (Allow) cho các quyền:
- **Vị trí / GPS** — để hiện bản đồ và thuyết minh theo vị trí
- **Cài đặt ứng dụng** — nếu OPPO hỏi cho phép cài từ nguồn không xác định

#### Cách thay thế: Cài APK thủ công qua Command Line

Nếu Android Studio gặp lỗi, có thể build và cài APK thủ công:

```powershell
# 1. Build APK
cd c:\doan\app\app\AndroidStudioProjects\FoodMapApp
.\gradlew.bat assembleDebug

# 2. Cài APK lên điện thoại qua USB
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "app\build\outputs\apk\debug\app-debug.apk"

# 3. Mở app
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell am start -n com.example.foodmapapp/.MainActivity
```

#### Xử lý lỗi khi chạy trên điện thoại thật

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Không thấy điện thoại trong danh sách | Chưa bật USB Debugging hoặc cáp lỗi | Kiểm tra lại Bước 3.2 + thử đổi cáp USB |
| `INSTALL_FAILED_USER_RESTRICTED` | OPPO chặn cài qua USB | Developer Options → bật **"Install via USB"** và **"Disable Permission Monitoring"** |
| App bị trắng màn hình | File assets thiếu | Kiểm tra `app\src\main\assets\` có `index.html` và thư mục `static\` |
| GPS không hoạt động | Chưa cấp quyền hoặc GPS tắt | Nhấn **Cho phép** khi app hỏi + bật **Vị trí** trong thanh thông báo kéo xuống |
| App bị tắt khi chạy nền | Hệ thống tiết kiệm pin | **Cài đặt → Pin → FoodMapApp** → tắt "Tối ưu hóa pin" |
| `adb devices` hiện `unauthorized` | Chưa cho phép debug | Kiểm tra popup trên điện thoại → nhấn **Cho phép** |

---

## 8. Tài khoản mặc định

| Role | Username | Password | Ghi chú |
|---|---|---|---|
| **Admin** | `admin` | `123456` | Tự động tạo khi backend khởi động lần đầu |
| **Seller** | (tự đăng ký) | — | Đăng ký tại `/register` |

---

## 9. API Endpoints Reference

### Web Backend (port 5050)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Đăng nhập | ❌ |
| POST | `/api/auth/register` | Đăng ký | ❌ |
| GET | `/api/admin/overview` | Dashboard overview | ✅ Admin |
| GET | `/api/NarrationPoint` | Lấy danh sách POI | ✅ |
| POST | `/api/NarrationPoint` | Tạo POI mới | ✅ Admin |
| PUT | `/api/NarrationPoint/{id}` | Sửa POI | ✅ Admin |
| DELETE | `/api/NarrationPoint/{id}` | Xóa POI | ✅ Admin |
| GET | `/api/Tour` | Lấy danh sách Tour | ✅ |
| POST | `/api/Tour` | Tạo Tour | ✅ Admin |
| GET | `/api/Stalls` | Lấy danh sách Stalls | ✅ |
| GET | `/api/Stalls/unclaimed` | Stalls chưa có chủ | ✅ |
| GET | `/api/FoodPlace` | Danh sách địa điểm ăn | ✅ |
| GET | `/api/Translation` | Tất cả bản dịch | ✅ |
| GET | `/api/Language` | Danh sách ngôn ngữ | ✅ |
| GET | `/api/Categories` | Danh sách danh mục | ✅ |
| GET | `/api/User` | Danh sách user | ✅ Admin |
| GET | `/api/History` | Lịch sử hoạt động | ✅ Admin |
| GET | `/api/requests/pending` | Yêu cầu chờ duyệt | ✅ Admin |
| POST | `/api/requests` | Tạo yêu cầu | ✅ Seller |
| PUT | `/api/requests/{id}/approve` | Duyệt yêu cầu | ✅ Admin |
| PUT | `/api/requests/{id}/reject` | Từ chối yêu cầu | ✅ Admin |

### Mobile Backend (port 5111)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/Places` | Lấy danh sách địa điểm |
| GET | `/api/Tours` | Lấy danh sách tour |
| GET | `/api/Users` | Quản lý người dùng |
| GET | `/api/Favorite` | Danh sách yêu thích |

---

## 10. Xử lý lỗi thường gặp

### Lỗi 1: `You must install or update .NET to run this application`

**Nguyên nhân**: Máy cài .NET khác phiên bản với project.

**Cách sửa**: Mở file `.csproj`, đổi `TargetFramework` cho khớp:
```xml
<TargetFramework>net10.0</TargetFramework>
```

### Lỗi 2: `npm ERR! ENOENT` khi chạy frontend

**Cách sửa**: Chạy `npm install` trước khi `npm run dev`

### Lỗi 3: Database connection error

**Nguyên nhân**: Connection string sai hoặc Supabase project bị pause.

**Cách sửa**:
1. Kiểm tra `appsettings.json` có đúng connection string
2. Vào Supabase Dashboard kiểm tra project có bị pause không → nhấn **Restore**

### Lỗi 4: CORS error trên trình duyệt

**Nguyên nhân**: Frontend gọi API từ domain khác.

**Cách sửa**: Kiểm tra CORS policy trong `Program.cs`:
```csharp
policy.WithOrigins("http://localhost:5173")
```

### Lỗi 5: Android Emulator không tìm thấy device

**Cách sửa**: 
1. Bật emulator từ Android Studio Device Manager
2. Kiểm tra: `adb devices` phải hiện `emulator-5554   device`

### Lỗi 6: Module not specified trong Android Studio

**Cách sửa**: 
- Build từ command line: `.\gradlew.bat assembleDebug`
- Cài APK: `adb install -r app\build\outputs\apk\debug\app-debug.apk`

### Lỗi 7: App Android bị trắng màn hình

**Nguyên nhân**: File assets chưa có hoặc React build lỗi.

**Cách sửa**: Kiểm tra thư mục `app\src\main\assets\` có chứa `index.html` và thư mục `static\`

---

## Tổng kết — Chạy toàn bộ hệ thống

Mở **4 terminal** cùng lúc + Android Emulator:

| Terminal | Lệnh | Port | Mô tả |
|---|---|---|---|
| T1 | `cd c:\doan\web\web\backend && dotnet run` | :5050 | Backend Web |
| T2 | `cd c:\doan\web\web\frontend && npm run dev` | :5173 | Frontend Web |
| T3 | `cd c:\doan\app\app\FoodMapAPI && dotnet run` | :5111 | Backend Mobile |
| T4 | `cd c:\doan\app\app\foodmap-fe && npm start` | :3000 | Frontend Mobile |
| Emulator | Android Studio → Device Manager → ▶ | — | Android App |

---

> 📝 **Ghi chú**: Đảm bảo có kết nối internet vì database nằm trên Supabase Cloud.
