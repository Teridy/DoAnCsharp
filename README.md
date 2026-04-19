# 🍜 FoodMap - Hệ thống Bản đồ Ẩm thực Thuyết minh Tự động

> Hệ thống GIS (Geographic Information System) kết hợp Text-to-Speech (TTS) cho phép du khách khám phá ẩm thực đường phố Vĩnh Khánh thông qua ứng dụng di động Android với thuyết minh tự động bằng giọng nói đa ngôn ngữ.

---

## 📐 Kiến trúc Hệ thống

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FOODMAP SYSTEM                               │
├───────────────┬──────────────────┬───────────────────────────────────┤
│  📱 Mobile     │  🌐 Web Admin     │  ☁️ Cloud Database               │
│  Android App   │  React + .NET 8   │  Supabase (PostgreSQL)           │
│  (WebView)     │  (Vite)           │                                  │
│  Port: N/A     │  FE: 5173         │  qmwrmzpdbgfaqhrlayfz            │
│                │  BE: 6050         │  .supabase.co                    │
├───────────────┴──────────────────┴───────────────────────────────────┤
│  🔌 Mobile API (.NET 8 + Supabase SDK)  │  Port: 6111                │
├──────────────────────────────────────────┴───────────────────────────┤
│  🌍 Ngrok Tunnel (Public Access)                                     │
│  URL: https://roundup-browse-unequal.ngrok-free.dev                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Công nghệ sử dụng

| Tầng | Công nghệ | Phiên bản |
|------|-----------|-----------|
| Mobile App | Android (Kotlin) + React (WebView) | Android SDK / React 18 |
| Mobile API | .NET + Supabase C# SDK | .NET 10 |
| Web Backend | .NET + Entity Framework Core + Npgsql | .NET 10 |
| Web Frontend | React + Vite | Vite 6 |
| Database | Supabase (PostgreSQL hosted) | — |
| Map Engine | Leaflet.js | — |
| TTS Engine | Android Native TTS + Web Speech API + FPT.AI | — |
| Authentication | JWT Bearer Token + BCrypt | — |
| Tunnel | Ngrok | — |

---

## 🗂️ Cấu trúc Thư mục

```
c:\doan\
├── app\app\
│   ├── AndroidStudioProjects\FoodMapApp\   # 📱 Android Native App (Kotlin)
│   ├── foodmap-fe\                         # 📱 React Frontend cho Mobile (WebView)
│   └── FoodMapAPI\                         # 🔌 Mobile API (.NET + Supabase SDK)
├── web\web\
│   ├── backend\                            # 🌐 Web Admin Backend (.NET + EF Core)
│   └── frontend\                           # 🌐 Web Admin Frontend (React + Vite)
├── start-foodmap.ps1                       # 🚀 Script khởi động toàn bộ hệ thống
├── ngrok.yml                               # 🌍 Cấu hình Ngrok tunnel
├── pid-foodmap.html                        # 📄 Tài liệu PID (Project Initiation Document)
└── proxy.js                                # 🔀 Proxy server
```

---

## 📱 MODULE 1: ỨNG DỤNG DI ĐỘNG (Mobile App)

### 1.1. Android Native Shell
**File:** `app/app/AndroidStudioProjects/FoodMapApp/.../MainActivity.kt`

| Chức năng | Mô tả | Chi tiết kỹ thuật |
|-----------|--------|-------------------|
| **WebView Container** | Load toàn bộ React app vào WebView Android | `webView.loadUrl("file:///android_asset/index.html")` |
| **GPS Permission** | Xin quyền định vị GPS (Fine + Coarse) | `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` |
| **Native TTS Bridge** | Cầu nối Text-to-Speech Android → JavaScript | `@JavascriptInterface` với tên `AndroidBridge` |
| **Đa ngôn ngữ TTS** | Đổi giọng đọc theo ngôn ngữ (VI/EN/ZH) | `Locale.US`, `Locale.CHINA`, `Locale("vi", "VN")` |
| **Auto-play Media** | Cho phép tự động phát âm thanh không cần gesture | `mediaPlaybackRequiresUserGesture = false` |
| **Mixed Content** | Cho phép truy cập file local + HTTPS cùng lúc | `MIXED_CONTENT_ALWAYS_ALLOW` |

### 1.2. React Mobile Frontend
**File:** `app/app/foodmap-fe/src/App.js` (969 dòng)

#### 🏠 Tab Khám phá (Home)
| Chức năng | Mô tả |
|-----------|--------|
| **Danh sách Tour gợi ý** | Hiển thị danh sách tour từ API, mỗi tour có tên, mô tả, nút bắt đầu |
| **Món phải thử** | Gallery quẹt ngang hiển thị tất cả quán ăn với ảnh, tên, giá, rating |
| **Trạng thái mở/đóng** | Badge `🟢 Đang mở` / `🔴 Đã đóng cửa` trên mỗi card |
| **Yêu thích (Toggle)** | Nút tim ❤️/🤍 trên mỗi card, lưu lên API |
| **Đọc thuyết minh khi bấm** | Bấm vào card → đọc mô tả bằng TTS |
| **Chuyển ngôn ngữ UI** | 3 nút `VI / EN / ZH` đổi toàn bộ giao diện + dữ liệu |

#### 🗺️ Tab Bản đồ (Map) — Chức năng cốt lõi
| Chức năng | Mô tả | Code |
|-----------|--------|------|
| **Bản đồ Leaflet** | Bản đồ tương tác khu vực Vĩnh Khánh, zoom 17 | `MapContainer`, `TileLayer` (CartoDB Voyager) |
| **Marker POI** | Hiển thị tất cả quán ăn trên map, icon tùy chỉnh | `.normal-marker` (đỏ san hô) |
| **Marker GPS** | Vị trí người dùng với hiệu ứng radar sóng xanh | `.modern-gps-marker` + animation `gps-rings` |
| **Marker Active** | Quán đang được chọn có hiệu ứng scanner xoay | `.modern-active-marker` + `scanner-rotate` |
| **Đường đi Polyline** | Vẽ lộ trình giữa các POI trong tour | `<Polyline>` component |
| **Camera tự động** | Camera bay tới quán đang thuyết minh | `AutoPan` → `map.flyTo()` zoom 18 |
| **Tour ảo tự động** | Tự động đọc từng quán theo thứ tự gần nhất | `isVirtualTour = true` → tự tăng `currentTourIndex` |
| **GPS thực tế** | Dùng GPS thật, phát hiện quán gần nhất và đọc | `watchPosition()` + `calculateDistance()` |
| **Thuật toán ưu tiên POI** | Khi đứng giữa 2 quán → ưu tiên quán gần nhất (Haversine) | Dòng 655-693, `distMet < minDistance` |
| **Bán kính kích hoạt** | Chỉ đọc khi khoảng cách ≤ `activation_radius` (mặc định 50m) | Dòng 678-679 |
| **Chống đọc lại** | Không đọc lại quán vừa đọc, cho tới khi đến quán khác | `currentShopId !== closestPlace.id` |
| **Sắp xếp tour** | Thuật toán "Nearest Neighbor" → Tối ưu thứ tự đi | `sortPlacesByRoute()` dòng 249-266 |
| **Modal hoàn thành** | Hiện 🏆 khi đi hết tour, có nút nghe lại / về trang chủ | `showCompletionModal` |
| **Nút chọn chế độ** | 2 nút trên map: `🔄 Tour ảo` / `📍 GPS thực tế` | `isVirtualTour` state toggle |

#### 🔊 Hệ thống Text-to-Speech (3 tầng fallback)
| Tầng | Phương thức | Điều kiện |
|------|------------|-----------|
| 1️⃣ | **Android Native TTS** | `window.AndroidBridge.speak()` — ưu tiên cao nhất |
| 2️⃣ | **Web Speech API** | `SpeechSynthesisUtterance` — fallback trên trình duyệt |
| 3️⃣ | **Google Translate TTS** | `translate.google.com/translate_tts` — fallback online |

#### ❤️ Tab Yêu thích (Favorites)
| Chức năng | Mô tả |
|-----------|--------|
| **Danh sách yêu thích** | Hiển thị các quán đã thả tim |
| **Xóa yêu thích** | Nút `Xóa` toggle bỏ khỏi danh sách |

#### 👤 Tab Hồ sơ (Profile)
| Chức năng | Mô tả |
|-----------|--------|
| **Avatar & thông tin** | Tên, năm tham gia |
| **Thống kê hành trình** | Số quán đã đến / Tỷ lệ hoàn thành (%) |
| **Danh sách quán đã ghé** | Hiển thị tất cả quán đã check-in với badge ✅ |

#### 🌐 Đa ngôn ngữ (i18n)
| Ngôn ngữ | Mã | Phạm vi |
|----------|-----|---------|
| Tiếng Việt | `vi` | UI + Dữ liệu + TTS |
| English | `en` | UI + Dữ liệu + TTS |
| 中文 | `zh` | UI + Dữ liệu + TTS |

#### 📡 Chế độ Offline (SQLite Fallback)
| Tầng | Mô tả |
|------|--------|
| **Online** | Gọi API lấy dữ liệu mới nhất |
| **Cache** | Lưu `localStorage` → đọc khi mất mạng |
| **SQLite** | File `food_narration_poc.db` → đọc bằng SQL.js (WASM) |

---

## 🔌 MODULE 2: MOBILE API (.NET + Supabase SDK)

**Đường dẫn:** `app/app/FoodMapAPI/` — Port: `6111`

### Controllers

#### PlacesController — `GET /api/places?lang={vi|en|zh}`
| Chức năng | Mô tả |
|-----------|--------|
| **Lấy danh sách quán** | JOIN 5 bảng: `narration_points` + `food_places` + `categories` + `narration_translations` + `images` |
| **Đa ngôn ngữ** | Tham số `lang` → lấy tên/mô tả dịch, fallback tiếng Việt nếu không có bản dịch |
| **LEFT JOIN an toàn** | Không mất quán nếu thiếu dữ liệu ở bảng phụ |
| **Chống trùng lặp** | `GroupBy(id).Select(First())` |

#### ToursController — `GET /api/tours`
| API | Mô tả |
|-----|--------|
| `GET /api/tours` | Danh sách tour (id, name, description, duration, status, color) |
| `GET /api/tours/pois` | Bảng nối tour ↔ POI (tour_id, poi_id) |
| `POST /api/tours/ping?deviceId=xxx` | **Heartbeat** — ghi thiết bị đang online vào file JSON |

#### FavoritesController — `api/favorites`
| API | Mô tả |
|-----|--------|
| `GET /api/favorites/{userId}` | Danh sách ID quán yêu thích của user |
| `POST /api/favorites` | Toggle thêm/xóa yêu thích |

#### UsersController — `api/users`
| API | Mô tả |
|-----|--------|
| `POST /api/users/anonymous` | Tạo user ẩn danh khi quét QR lần đầu (device_id ngẫu nhiên) |

---

## 🌐 MODULE 3: WEB ADMIN BACKEND (.NET + EF Core)

**Đường dẫn:** `web/web/backend/` — Port: `6050`

### 3.1. Xác thực & Phân quyền (Auth)

#### AuthController — `api/Auth`
| API | Mô tả |
|-----|--------|
| `POST /api/Auth/register` | Đăng ký tài khoản Seller (BCrypt hash mật khẩu) |
| `POST /api/Auth/login` | Đăng nhập → trả JWT token (2 giờ) + role + username |
| **Validation** | Kiểm tra username/email trùng, tài khoản bị khóa |
| **JWT Claims** | `ClaimTypes.Name`, `ClaimTypes.NameIdentifier`, `ClaimTypes.Role` |

### 3.2. Quản lý Điểm Thuyết minh (POI)

#### NarrationPointController — `api/NarrationPoint`
| API | Mô tả |
|-----|--------|
| `GET /api/NarrationPoint` | Danh sách POI + thông tin FoodPlace + trạng thái Stall |
| `GET /api/NarrationPoint/{id}` | Chi tiết 1 POI |
| `POST /api/NarrationPoint` | **Tạo POI mới** (upload ảnh + tạo Stall mồi + tạo FoodPlace) |
| `PUT /api/NarrationPoint/{id}` | **Cập nhật POI** (đổi tên, tọa độ, ảnh, danh mục, giá, giờ mở) |
| `DELETE /api/NarrationPoint/{id}` | **Xóa POI** + cascade xóa: History, TourPois, Stalls, FoodPlaces, Translations, Images |

### 3.3. Quản lý Tour

#### TourController — `api/Tour`
| API | Mô tả |
|-----|--------|
| `GET /api/Tour` | Danh sách tour + POI trong tour (JOIN TourPois → NarrationPoints) |
| `GET /api/Tour/{id}` | Chi tiết 1 tour |
| `POST /api/Tour` | **Tạo tour mới** (lưu tour → insert POI bằng NpgsqlCommand riêng) |
| `PUT /api/Tour/{id}` | **Cập nhật tour** (xóa POI cũ → thêm POI mới) |
| `DELETE /api/Tour/{id}` | **Xóa tour** (cascade xóa tour_pois → tours) |
| `GET /api/Tour/suggested` | **Tour gợi ý** (dựa trên top 5 POI có nhiều lượt xem nhất) |
| `GET /api/Tour/dto-list` | Danh sách tour kèm tên POI (cho UI hiện lộ trình) |

### 3.4. Quản lý Gian hàng (Stall)

#### StallsController — `api/stalls`
| API | Mô tả |
|-----|--------|
| `GET /api/stalls` | Danh sách gian hàng của seller hiện tại (theo JWT) |
| `GET /api/stalls/unclaimed` | Danh sách gian hàng mồi chưa có chủ |
| `GET /api/stalls/{id}` | Chi tiết 1 gian hàng |
| `POST /api/stalls` | Seller tạo gian hàng mới → trạng thái `Pending` |
| `POST /api/stalls/claim/{stallId}` | **Nhận quán mồi** → trạng thái `Pending` chờ Admin duyệt |
| `PUT /api/stalls/{id}` | Cập nhật trực tiếp (chỉ chủ quán, không đổi được status) |
| `PUT /api/stalls/{id}/request-update` | Gửi yêu cầu thay đổi qua Admin duyệt |

**Trạng thái Stall:**
```
Unclaimed → Pending (claim/create) → Active (approved) / Rejected
                                     → Closed (by update)
```

### 3.5. Quản lý Bản dịch (Translation)

#### NarrationTranslationController — `api/Translation`
| API | Mô tả |
|-----|--------|
| `GET /api/Translation` | Tất cả bản dịch (sắp xếp ID tăng dần) |
| `GET /api/Translation/{id}` | Chi tiết bản dịch |
| `GET /api/Translation/by-point/{pointId}` | Bản dịch theo POI |
| `GET /api/Translation/by-language/{lang}` | Bản dịch theo ngôn ngữ |
| `POST /api/Translation` | Tạo bản dịch mới |
| `PUT /api/Translation/{id}` | Cập nhật bản dịch (content + translated_name) |
| `DELETE /api/Translation/{id}` | Xóa bản dịch |

### 3.6. Quản lý Audio (TTS)

#### AudioController — `api/Audio`
| API | Mô tả |
|-----|--------|
| `GET /api/Audio` | Tất cả audio files |
| `GET /api/Audio/{id}` | Chi tiết audio |
| `POST /api/Audio` | Tạo audio mới |
| `PUT /api/Audio/{id}` | Cập nhật audio (title, URL, text, isActive) |
| `DELETE /api/Audio/{id}` | Xóa audio |
| `POST /api/Audio/tts-generate` | **Tạo audio từ text** bằng FPT.AI TTS API (giọng banmai) |

#### SellerAudioController — `api/audios`
| API | Mô tả |
|-----|--------|
| `GET /api/audios/my-stall-audios` | Audio của gian hàng seller đang sở hữu |
| `POST /api/audios/tts-generate` | **Seller tạo audio TTS** → lưu file MP3 vào `wwwroot/audio/` |

### 3.7. Quản lý Yêu cầu Cập nhật (Update Requests — Workflow duyệt)

#### UpdateRequestsController — `api/requests`
| API | Mô tả |
|-----|--------|
| `GET /api/requests/pending` | Danh sách yêu cầu đang chờ duyệt |
| `POST /api/requests` | Seller tạo yêu cầu mới (Stall / Translation / FoodPlace) |
| `PUT /api/requests/{id}/approve` | **Admin duyệt** — áp dụng thay đổi vào DB |
| `PUT /api/requests/{id}/reject` | **Admin từ chối** |
| `POST /api/requests/upload-image` | Upload ảnh + lưu local + Supabase |

**Luồng duyệt phân loại:**
| EntityType | Approve Action |
|------------|----------------|
| `Stall` (PendingClaim) | Gán chủ sở hữu, đổi status → Active |
| `Stall` (EntityId = 0) | Tạo mới POI + Stall + FoodPlace |
| `Stall` (Update) | Cập nhật thông tin Stall + POI + FoodPlace |
| `Translation` | Tạo/cập nhật bản dịch |
| `FoodPlace` | Cập nhật mô tả quán |

### 3.8. Quản lý Điểm ăn uống (FoodPlace)

#### FoodPlaceController — `api/FoodPlace`
| API | Mô tả |
|-----|--------|
| `GET /api/FoodPlace` | Tất cả FoodPlace + NarrationPoint |
| `POST /api/FoodPlace` | **Tạo điểm ăn** (transaction: NarrationPoint → Stall mồi → FoodPlace) |
| `PUT /api/FoodPlace/{id}` | Cập nhật (categoryId, priceRange, openingHours, description) |
| `PATCH /api/FoodPlace/{id}/description` | Cập nhật riêng description |

### 3.9. Lịch sử & Thống kê (History + Analytics)

#### HistoryController — `api/History`
| API | Mô tả |
|-----|--------|
| `GET /api/History` | 100 lịch sử gần nhất + tên POI (JOIN) |
| `GET /api/History/user/{userId}` | Lịch sử theo user |
| `POST /api/History` | **Ghi lịch sử** (event_type: `view` / `gps_checkin`) |
| `GET /api/History/stats` | Thống kê: tổng lượt, hôm nay, top 5 POI |
| `GET /api/History/heatmap` | Dữ liệu heatmap (lat, lng, weight, name) |

#### AdminController — `api/Admin`
| API | Mô tả |
|-----|--------|
| `GET /api/Admin/overview` | Dashboard tổng quan (users, POI, audio, tours, translations, history, pending requests, visitors) |
| `GET /api/Admin/analytics` | Biểu đồ: lượt truy cập 7 ngày, phân loại thiết bị, 10 lượt gần nhất |
| `POST /api/visitor/log` | **Log visitor** từ mobile/web (anonymous, không cần auth) |
| `GET /api/Admin/active-users` | Số thiết bị đang online (đếm ping trong 45 giây) |

### 3.10. Quản lý hệ thống (Danh mục, Ngôn ngữ, User)

| Controller | API | Mô tả |
|-----------|-----|--------|
| `CategoriesController` | `GET /api/Categories` | Danh sách danh mục ẩm thực |
| `LanguageController` | `GET /api/Language` | Danh sách ngôn ngữ hỗ trợ |
| `UserManagerController` | `GET /api/UserManager` | Danh sách tài khoản web (Admin/Seller) |

### 3.11. Visitor Tracking Middleware
| Chức năng | Mô tả |
|-----------|--------|
| **Tự động log** | Mọi GET request (không phải API, không phải file static) → ghi vào `visitor_logs` |
| **Phân loại** | Mobile / Desktop dựa trên User-Agent |
| **Không block** | Lỗi logging không ảnh hưởng request chính |

---

## 🌐 MODULE 4: WEB ADMIN FRONTEND (React + Vite)

**Đường dẫn:** `web/web/frontend/src/`

### 4.1. Trang Public

| File | Chức năng |
|------|-----------|
| `Login.jsx` | Đăng nhập (username + password) → lưu JWT token |
| `Register.jsx` | Đăng ký tài khoản Seller |
| `Home.jsx` | Trang chủ chuyển hướng theo role |
| `ProtectedRoute.jsx` | Guard route, redirect nếu chưa đăng nhập |

### 4.2. Admin Dashboard

| File | Chức năng |
|------|-----------|
| `AdminDashboard.jsx` | **Dashboard tổng quan** — số liệu POI, Users, Tours, Audio, Translations, History, Visitors, Active Users (real-time) |
| `PoiManager.jsx` | **CRUD Điểm thuyết minh** — Tạo/Sửa/Xóa POI, upload ảnh, chọn danh mục, set tọa độ, bán kính kích hoạt, priority |
| `TourManager.jsx` | **CRUD Tour** — Tạo/Sửa/Xóa tour, chọn nhiều POI, set duration/status |
| `AudioManager.jsx` | **CRUD Audio** — Quản lý file audio, tạo audio từ text (TTS FPT.AI), set narration_point_id |
| `TranslationManager.jsx` | **CRUD Bản dịch** — Thêm/sửa/xóa bản dịch đa ngôn ngữ cho POI |
| `UserManager.jsx` | **Quản lý Users** — Xem danh sách, khóa/mở tài khoản |
| `HistoryManager.jsx` | **Xem lịch sử** — Danh sách lượt xem/check-in, tên POI, thống kê |
| `PendingRequest.jsx` | **Duyệt yêu cầu** — Approve/Reject yêu cầu từ Seller (tạo quán, claim quán, cập nhật thông tin, dịch thuật) |
| `AnalyticsDashboard.jsx` | **Analytics** — Biểu đồ lượt truy cập, phân loại thiết bị, visitor logs |

### 4.3. Seller Dashboard

| File | Chức năng |
|------|-----------|
| `SellerDashboard.jsx` | **Dashboard Seller** — Thông tin quán, cập nhật/tạo mới quán, claim quán mồi, quản lý trạng thái |
| `SellerAudioManager.jsx` | **Quản lý Audio** — Xem/tạo audio TTS cho gian hàng của mình |
| `SellerTranslationManager.jsx` | **Quản lý Bản dịch** — Seller thêm bản dịch cho quán → gửi yêu cầu duyệt |

---

## 🗄️ MODULE 5: CƠ SỞ DỮ LIỆU (Supabase PostgreSQL)

### Sơ đồ các bảng chính

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ narration_points │────►│   food_places    │     │    categories   │
│ (POI chính)      │     │ (Thông tin quán)  │◄────│ (Danh mục)      │
│ id, name, lat,   │     │ narration_point_id│     │ id, name        │
│ lng, radius,     │     │ category_id       │     └─────────────────┘
│ priority,        │     │ price_range       │
│ is_active,       │     │ opening_hours     │
│ image_web        │     │ description       │
└────┬────┬────┬───┘     └──────────────────┘
     │    │    │
     │    │    │         ┌──────────────────┐
     │    │    └────────►│     images       │
     │    │              │ narration_point_id│
     │    │              │ image_url         │
     │    │              └──────────────────┘
     │    │
     │    │              ┌──────────────────────┐
     │    └─────────────►│ narration_translations│
     │                   │ narration_point_id    │
     │                   │ language_code         │
     │                   │ translated_name       │
     │                   │ content               │
     │                   └──────────────────────┘
     │
     │    ┌──────────────┐     ┌──────────────┐
     └───►│  tour_pois   │────►│    tours     │
          │ poi_id        │     │ id, name     │
          │ tour_id       │     │ description  │
          └──────────────┘     │ duration     │
                               │ status       │
                               └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    stalls    │     │  users_web   │     │ update_requests  │
│ id           │     │ id, username │     │ entity_type      │
│ categories_id│     │ hashpass     │     │ entity_id        │
│ narr_point_id│     │ user_role    │     │ requester_id     │
│ status       │     │ email, phone │     │ new_data_json    │
│ owner_id     │     │ status       │     │ status           │
│ is_claimed   │     └──────────────┘     │ admin_note       │
│ image_url    │                          └──────────────────┘
└──────────────┘
                     ┌──────────────┐     ┌──────────────────┐
                     │   history    │     │  visitor_logs    │
                     │ narr_point_id│     │ session_id       │
                     │ event_type   │     │ device_type      │
                     │ users_id     │     │ user_agent       │
                     │ created_at   │     │ ip_address       │
                     └──────────────┘     │ page_visited     │
                                          └──────────────────┘
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │  favorites   │     │    audios    │
│ (Mobile)     │     │ user_id      │     │ title        │
│ id, username │     │ narr_point_id│     │ audio_url    │
│ device_id    │     └──────────────┘     │ audio_text   │
└──────────────┘                          │ narr_point_id│
                                          │ is_active    │
                                          └──────────────┘
```

---

## 🚀 Khởi động Hệ thống

### Chạy tự động (PowerShell)
```powershell
.\start-foodmap.ps1
```

### Chạy thủ công từng service

```bash
# 1. Mobile API (port 6111)
cd app/app/FoodMapAPI
dotnet run --urls "http://0.0.0.0:6111"

# 2. Web Backend (port 6050)
cd web/web/backend  
dotnet run --urls "http://0.0.0.0:6050"

# 3. Web Frontend (port 5173)
cd web/web/frontend
npm run dev

# 4. Ngrok Tunnel (public access)
ngrok start --all --config ngrok.yml
```

### Tài khoản mặc định
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `123456` |

---

## 🔐 Bảo mật

| Cơ chế | Chi tiết |
|--------|----------|
| **JWT Authentication** | Token 2 giờ, HS256, claims: name + role |
| **BCrypt Password Hash** | Mật khẩu mã hóa 1 chiều |
| **Role-based Authorization** | `Admin` → full quyền, `Seller` → quản lý quán riêng |
| **CORS** | AllowAnyOrigin (dev mode) |
| **Stall Ownership** | Seller chỉ sửa được quán mình sở hữu |
| **Workflow duyệt** | Mọi thay đổi của Seller → Pending → Admin approve/reject |

---

## 📊 Tổng kết Chức năng

| # | Nhóm chức năng | Số lượng API | Platform |
|---|---------------|-------------|----------|
| 1 | Xác thực & Phân quyền | 2 | Web |
| 2 | Quản lý POI (CRUD) | 5 | Web |
| 3 | Quản lý Tour (CRUD) | 7 | Web + Mobile |
| 4 | Quản lý Gian hàng (Stall) | 7 | Web |
| 5 | Quản lý Bản dịch (CRUD) | 7 | Web |
| 6 | Quản lý Audio & TTS | 7 | Web |
| 7 | Quản lý Yêu cầu duyệt | 5 | Web |
| 8 | Quản lý FoodPlace | 4 | Web |
| 9 | Lịch sử & Thống kê | 6 | Web + Mobile |
| 10 | Visitor Tracking & Analytics | 4 | Web + Mobile |
| 11 | Quản lý User & Danh mục | 3 | Web |
| 12 | Yêu thích (Favorites) | 2 | Mobile |
| 13 | GPS & Thuyết minh tự động | — | Mobile |
| 14 | Tour ảo & Real GPS | — | Mobile |
| 15 | Đa ngôn ngữ (VI/EN/ZH) | — | Mobile |
| 16 | Offline SQLite Fallback | — | Mobile |
| | **Tổng cộng** | **~59 API endpoints** | |
