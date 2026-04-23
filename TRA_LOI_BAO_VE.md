# 🎯 HƯỚNG DẪN TRẢ LỜI BẢO VỆ ĐỒ ÁN — FOODMAP
> File: `c:\doan\app\app\foodmap-fe\src\App.js`
> Cập nhật: 23/04/2026

---

# CÂU 3: XỬ LÝ TRÙNG POI (SMART POI QUEUE)

## Giảng viên hỏi:
> "Nếu 2-3 quán ăn nằm sát nhau, GPS phát hiện được cả, hệ thống xử lý thế nào?"

---

## PHẦN 1: VẤN ĐỀ

Khu vực Phố Ẩm Thực Vĩnh Khánh có nhiều quán nằm san sát nhau (VD: Ốc Oanh và Ốc Thảo cách nhau chỉ 15m). Bán kính quét GPS mặc định 50m → GPS bao trùm **nhiều quán cùng lúc**. Nếu không xử lý, hệ thống sẽ:
- Phát audio đè lên nhau
- Đọc sai quán
- Đọc lặp lại quán đã ghé

---

## PHẦN 2: GIẢI PHÁP — SMART POI QUEUE

**Thuật toán Smart POI Queue** gồm 4 bước, code ở **dòng 724-813** trong `App.js`:

### BƯỚC 1: Tính hướng di chuyển (dòng 730-745)

Hệ thống lưu vị trí GPS lần trước bằng `prevLocationRef`. Khi GPS cập nhật, so sánh 2 vị trí liên tiếp → tính **bearing** (hướng di chuyển, 0-360°).

```javascript
// Dòng 722: Lưu vị trí GPS lần trước
const prevLocationRef = useRef(null);

// Dòng 735-742: Tính heading khi di chuyển > 2m
const movedDist = calculateDistance(prevLat, prevLon, userLat, userLon) * 1000;
if (movedDist > 2) { // > 2m mới tính (tránh GPS jitter khi đứng yên)
  // Công thức Forward Azimuth (bearing)
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  userHeading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  // Kết quả: 0° = Bắc, 90° = Đông, 180° = Nam, 270° = Tây
}
```

**Tại sao cần > 2m?** Vì GPS có sai số tự nhiên (jitter). Khi đứng yên, tọa độ GPS vẫn nhảy đi nhảy lại 1-2m. Nếu tính heading khi đứng yên → hướng sẽ ngẫu nhiên, sai.

**Tại sao dùng bearing chứ không dùng la bàn?** Vì la bàn (compass) cần sensor riêng, nhiều điện thoại không chính xác. Dùng 2 điểm GPS liên tiếp đáng tin cậy hơn.

### BƯỚC 2: Thu thập TẤT CẢ POI trong bán kính (dòng 747-767)

Khác với cách cũ (chỉ tìm 1 quán gần nhất), Smart POI Queue **thu thập TẤT CẢ** quán trong bán kính rồi xếp hạng.

```javascript
// Dòng 748-767: map() + filter()
const nearbyPOIs = allPlacesBackup
  .map((p) => {
    const distMet = calculateDistance(userLat, userLon, p.latitude, p.longitude) * 1000;
    
    // Tính angleDiff: góc chênh lệch giữa hướng đi và hướng tới quán
    let angleDiff = 180; // Mặc định 180° (sau lưng)
    if (userHeading !== null) {
      const bearingToPOI = ...; // Tính bearing từ du khách → quán
      angleDiff = Math.abs(userHeading - bearingToPOI);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;
      // Kết quả: 0° = trước mặt, 90° = bên cạnh, 180° = sau lưng
    }
    return { ...p, distMet, angleDiff };
  })
  .filter((p) => p.distMet <= (p.activation_radius || 50)); // Chỉ giữ POI trong 50m
```

**Ví dụ:** Du khách đứng tại X, có 3 quán trong 50m:
- Quán A: 30m, trước mặt (angleDiff = 20°)
- Quán B: 35m, sau lưng (angleDiff = 150°)
- Quán C: 45m, bên trái (angleDiff = 80°)
→ cả 3 đều có trong mảng `nearbyPOIs`

### BƯỚC 3: Sắp xếp 4 tiêu chí (dòng 771-788)

```javascript
nearbyPOIs.sort((a, b) => {
  // TIÊU CHÍ 1: Chưa ghé thăm → ưu tiên cao nhất
  const aVisited = visitedPlaces.has(a.id) ? 1 : 0;
  const bVisited = visitedPlaces.has(b.id) ? 1 : 0;
  if (aVisited !== bVisited) return aVisited - bVisited;

  // TIÊU CHÍ 2: Hướng trước mặt (< 90°) → ưu tiên hơn sau lưng (> 90°)
  const aFront = a.angleDiff <= 90 ? 0 : 1;
  const bFront = b.angleDiff <= 90 ? 0 : 1;
  if (aFront !== bFront) return aFront - bFront;

  // TIÊU CHÍ 3: Khoảng cách gần hơn (mét)
  if (a.distMet !== b.distMet) return a.distMet - b.distMet;

  // TIÊU CHÍ 4: ID nhỏ hơn trong database (tie-breaker cuối)
  return a.id - b.id;
});
```

**Bảng giải thích chi tiết:**

| Thứ tự | Tiêu chí | Tại sao? | Ví dụ |
|---|---|---|---|
| 1️⃣ | **Chưa ghé thăm** | Du khách muốn khám phá quán MỚI, không nghe lại quán cũ | Quán mới > Quán đã visit |
| 2️⃣ | **Trước mặt** | Du khách đang ĐI VỀ HƯỚNG NÀO thì quán hướng đó sẽ được đọc | angleDiff 20° > 150° |
| 3️⃣ | **Khoảng cách** | Quán gần hơn nhiều khả năng là quán du khách muốn đến | 30m > 35m |
| 4️⃣ | **ID database** | Tie-breaker cuối cùng, đảm bảo kết quả luôn xác định (deterministic) | ID 5 > ID 12 |

### BƯỚC 4: Chọn + chống đọc lặp (dòng 790-798)

```javascript
const bestPOI = nearbyPOIs[0]; // Phần tử đầu sau sort = tốt nhất

// currentShopId lưu ID quán vừa đọc → nếu giống thì bỏ qua
if (bestPOI && currentShopId !== bestPOI.id) {
  setCurrentShopId(bestPOI.id);    // Lock: đánh dấu đã đọc
  setSelectedPlace(bestPOI);       // Hiển thị UI
  speakGPS(bestPOI.name, ...);     // Phát TTS
  recordHistory(bestPOI.id, ...);  // Ghi lịch sử
}
```

---

## PHẦN 3: CÁC TÌNH HUỐNG CỤ THỂ

### Tình huống 1: 2 quán, du khách đi về quán A
```
Du khách đi bộ hướng Đông →
    Quán A (30m, trước mặt, 20°)  ✅ ĐỌC
    Quán B (30m, sau lưng, 160°)   ⏳ Bỏ qua
```
**Kết quả:** Quán A được đọc vì nằm trước mặt (tiêu chí 2).

### Tình huống 2: Du khách đứng yên giữa 2 quán
```
Quán A (25m) ← 📱 Du khách (đứng yên) → Quán B (30m)
```
- Đứng yên → `movedDist < 2m` → `userHeading = null` → bỏ qua tiêu chí 2
- Xét tiêu chí 3: Quán A gần hơn (25m < 30m) → **Quán A được đọc**

### Tình huống 3: Đứng yên, 2 quán cùng khoảng cách
```
Quán A (id=5, 30m) ← 📱 Du khách → Quán B (id=12, 30m)
```
- Tiêu chí 1: cả 2 chưa ghé → hòa
- Tiêu chí 2: đứng yên → bỏ qua → hòa
- Tiêu chí 3: cùng 30m → hòa
- Tiêu chí 4: **Quán A thắng** (id 5 < id 12)

### Tình huống 4: Quán A đã ghé, Quán B chưa
```
Quán A (đã ghé, 20m) ← 📱 → Quán B (chưa ghé, 40m)
```
- Tiêu chí 1: Quán B chưa ghé → **Quán B được đọc** (dù xa hơn!)

### Tình huống 5: Du khách quay đầu
```
Lần 1: → → → Quán A (trước mặt) ✅ Đọc Quán A
Lần 2: ← ← ← Quán B (giờ trước mặt) ✅ Đọc Quán B
```
- Heading thay đổi → angleDiff thay đổi → chọn POI khác

---

## PHẦN 4: CÂU TRẢ LỜI MẪU

> "Dạ thưa thầy/cô, hệ thống em dùng thuật toán **Smart POI Queue** ở dòng 724 trong App.js. Khi GPS phát hiện nhiều quán trong bán kính 50 mét, hệ thống **thu thập tất cả** rồi sắp xếp theo 4 tiêu chí:
>
> **Thứ nhất**, quán chưa ghé thăm ưu tiên hơn quán đã visit — vì du khách muốn khám phá quán mới.
>
> **Thứ hai**, quán nằm trước mặt ưu tiên hơn quán sau lưng — em tính hướng di chuyển bằng cách so sánh 2 vị trí GPS liên tiếp, rồi tính góc chênh lệch với hướng tới mỗi quán. Quán nào góc < 90° nghĩa là trước mặt.
>
> **Thứ ba**, quán gần hơn ưu tiên hơn — dùng công thức Haversine tính khoảng cách mét.
>
> **Thứ tư**, nếu mọi thứ bằng nhau thì quán có ID nhỏ hơn trong database thắng — đảm bảo kết quả luôn xác định.
>
> Ngoài ra, biến `currentShopId` ở dòng 792 đảm bảo **mỗi quán chỉ đọc 1 lần**, du khách đứng yên sẽ không bị đọc lặp ạ."

---
---

# CÂU 4: NHIỀU DU KHÁCH CÙNG 1 POI — XỬ LÝ HÀNG ĐỢI

## Giảng viên hỏi:
> "100 du khách đứng ở 1 quán cùng lúc, hệ thống xử lý hàng đợi thế nào? Server có bị quá tải?"

---

## PHẦN 1: TẠI SAO KHÔNG CẦN HÀNG ĐỢI?

**Câu trả lời ngắn:** Hệ thống dùng kiến trúc **Client-Side Processing** — toàn bộ xử lý nặng (TTS, GPS, tính khoảng cách) chạy trên **thiết bị của du khách**, server KHÔNG tham gia.

100 du khách = 100 thiết bị xử lý song song, hoàn toàn ĐỘC LẬP nhau.

---

## PHẦN 2: 4 THÀNH PHẦN CHẠY LOCAL

### Thành phần 1: Text-to-Speech — chạy trên CPU điện thoại (dòng 319-369)

```javascript
// Dòng 319-369: TTS Engine với fallback 3 tầng

// TẦNG 1 (dòng 347): Android Native TTS — OFFLINE, nhanh nhất
if (window.AndroidBridge && window.AndroidBridge.speak) {
  window.AndroidBridge.speak(textToSpeak, lang);
  // ← Chạy trên engine TTS tích hợp sẵn trong Android OS
  // ← KHÔNG gọi server, KHÔNG cần mạng
  // ← 100 du khách = 100 engine TTS độc lập trên 100 điện thoại
}

// TẦNG 2 (dòng 356): Web Speech API — Browser engine, offline
else if (synth) {
  const msg = new SpeechSynthesisUtterance(textToSpeak);
  msg.lang = "vi-VN";
  synth.speak(msg); // ← Browser tự đọc, KHÔNG gửi lên server
}

// TẦNG 3 (dòng 338): Google Translate TTS — Online fallback
else {
  const url = `https://translate.google.com/translate_tts?...`;
  new Audio(url).play(); // ← Gọi Google, không phải server của mình
}
```

**Giải thích:** Dù tầng nào thì TTS đều KHÔNG gọi backend FoodMap. Tầng 1 và 2 hoàn toàn offline. Tầng 3 gọi Google (không phải server mình). → **Server FoodMap tải = 0** cho phần TTS.

### Thành phần 2: GPS tracking — chạy trên chip GPS điện thoại (dòng 625-703)

```javascript
// Dòng 627-636: TẦNG 1 — Android Native GPS (FusedLocationProvider)
const getNativeGPS = () => {
  if (window.AndroidBridge && window.AndroidBridge.hasGPS()) {
    const lat = window.AndroidBridge.getLatitude();
    const lon = window.AndroidBridge.getLongitude();
    return [lat, lon]; // ← Đọc trực tiếp từ chip GPS, KHÔNG qua server
  }
};

// Dòng 648-652: TẦNG 2 — HTML5 Geolocation (Wi-Fi/Cell tower)
navigator.geolocation.watchPosition(
  (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude])
  // ← Browser tự xử lý, KHÔNG gọi server
);

// Dòng 677-690: TẦNG 3 — IP Geolocation (dự phòng)
const res = await fetch('https://ipwhois.app/json/');
// ← Gọi ipwhois.app (bên thứ 3), KHÔNG phải server mình
```

**Giải thích:** GPS hoàn toàn chạy trên thiết bị. 100 du khách = 100 chip GPS hoạt động độc lập. Server FoodMap không bao giờ xử lý GPS.

### Thành phần 3: Tính khoảng cách — chạy bằng JavaScript client (dòng 241-247)

```javascript
// Dòng 241-247: Công thức Haversine
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  // ← Phép tính toán học THUẦN TÚY, chạy trên CPU điện thoại
  // ← Tính 50 POI trong < 1ms, không cần server
};
```

### Thành phần 4: Dữ liệu POI — cache trong localStorage (dòng 436-438)

```javascript
// Dòng 436-438: Sau lần đầu load, lưu vào localStorage
localStorage.setItem("cache_tours", JSON.stringify(toursData));
localStorage.setItem("cache_tour_pois", JSON.stringify(tourPoisData));
localStorage.setItem(`cache_places_${lang}`, JSON.stringify(placesRaw));
// ← Lần sau đọc từ bộ nhớ local, KHÔNG gọi API
// ← Thời gian đọc: < 1ms (so với gọi API: 200-500ms)
```

---

## PHẦN 3: SERVER CHỈ NHẬN PING NHẸ

Thứ DUY NHẤT gửi lên server: **heartbeat ping** mỗi 5 giây (dòng 698-701).

```javascript
// Dòng 698-701: Ping nhẹ ~ 100 bytes
fetch(`${API_BASE}/tours/ping?deviceId=${deviceId}&lat=${lat}&lon=${lon}`, {
  method: "POST" // ← Chỉ gửi 3 giá trị: deviceId, lat, lon
}).catch(() => { }); // ← fire-and-forget: không chờ response
```

### Tính toán tải server:

| Số du khách | Request/giây | Kích thước/request | Tổng bandwidth |
|---|---|---|---|
| 10 | 2 req/s | 100 bytes | 200 B/s |
| 100 | 20 req/s | 100 bytes | 2 KB/s |
| 1,000 | 200 req/s | 100 bytes | 20 KB/s |
| 10,000 | 2,000 req/s | 100 bytes | 200 KB/s |

**ASP.NET Core capacity:** 10,000 - 50,000 req/s (single server).

→ Kể cả 10,000 du khách, server chỉ nhận 2,000 req/s — **chỉ 4-20% capacity**.

---

## PHẦN 4: SƠ ĐỒ KIẾN TRÚC

```
┌──────────────────────────────────────────────────┐
│           MỖI THIẾT BỊ DU KHÁCH                 │
│                                                  │
│  📍 GPS (chip phần cứng)                         │
│    → setUserLocation([lat, lng])                 │
│                                                  │
│  🧮 Smart POI Queue (JavaScript)                 │
│    → calculateDistance() × N quán                │
│    → sort 4 tiêu chí → chọn bestPOI             │
│                                                  │
│  🔊 TTS Engine (Android/Browser)                 │
│    → speak(bestPOI.name + description)           │
│                                                  │
│  💾 localStorage (cache POI data)                │
│    → Đọc < 1ms, không gọi API                   │
│                                                  │
│  100% LOCAL — KHÔNG GỌI SERVER                   │
├──────────────────────────────────────────────────┤
│  📡 Heartbeat (duy nhất gửi server)              │
│    → POST /ping (100 bytes / 5 giây)             │
└──────────────────────┬───────────────────────────┘
                       │ 20 req/s (100 du khách)
                       ▼
┌──────────────────────────────────────────────────┐
│           SERVER ASP.NET CORE                    │
│                                                  │
│  → Ghi vào active_users.json                     │
│  → Admin Dashboard đọc file → hiển thị bản đồ   │
│  → Capacity: 10,000+ req/s                       │
│  → Tải: < 5%                                     │
└──────────────────────────────────────────────────┘
```

---

## PHẦN 5: CÂU TRẢ LỜI MẪU

> "Dạ thưa thầy/cô, hệ thống FoodMap **không cần hàng đợi phía server** vì em thiết kế theo kiến trúc **Client-Side Processing**. Em xin giải thích:
>
> **Thứ nhất**, Text-to-Speech chạy hoàn toàn trên điện thoại. Em dùng Android Native TTS ở dòng 347 — nó chạy trên engine tích hợp sẵn trong Android OS, không gọi server. 100 du khách = 100 engine TTS độc lập, chạy song song.
>
> **Thứ hai**, GPS tracking cũng chạy trên thiết bị. Dòng 627, em đọc tọa độ từ chip GPS của điện thoại qua AndroidBridge. Phép tính khoảng cách Haversine ở dòng 241 chạy bằng JavaScript client, tính 50 quán trong chưa đầy 1 mili giây.
>
> **Thứ ba**, dữ liệu quán ăn được cache trong localStorage ở dòng 436. Sau lần đầu mở app, mọi thứ đọc từ bộ nhớ local, không cần gọi API.
>
> **Thứ duy nhất gửi lên server** là heartbeat ping ở dòng 698 — mỗi 5 giây gửi 1 POST nhỏ khoảng 100 bytes chứa deviceId và tọa độ để admin tracking. Với 100 du khách, server chỉ nhận 20 request/giây — ASP.NET Core xử lý được hàng chục nghìn request/giây, nên hoàn toàn không có vấn đề gì ạ."

### Nếu giảng viên hỏi thêm: "Vậy 10,000 người thì sao?"

> "Dạ, 10,000 du khách thì server nhận 2,000 request/giây, mỗi request chỉ 100 bytes. ASP.NET Core đơn server xử lý được 10,000-50,000 req/s. Và nếu cần scale thêm, em có thể:
> 1. Dùng **Redis** cache thay active_users.json
> 2. Dùng **CDN** cho static assets (ảnh, JS, CSS)
> 3. Dùng **Load Balancer** multiple servers
> Nhưng với quy mô phố ẩm thực Vĩnh Khánh, 1 server là quá đủ ạ."

---

## TÓM TẮT NHANH — IN RA MANG THEO

| Câu | Keyword | Dòng code |
|---|---|---|
| **Câu 3** | Smart POI Queue, 4 tiêu chí, heading | `App.js` dòng 724-813 |
| Tiêu chí 1 | Chưa ghé thăm (`visitedPlaces`) | dòng 773-776 |
| Tiêu chí 2 | Trước mặt (`angleDiff <= 90`) | dòng 778-781 |
| Tiêu chí 3 | Khoảng cách (`distMet`) | dòng 783-784 |
| Tiêu chí 4 | ID database (`a.id - b.id`) | dòng 786-787 |
| Chống lặp | `currentShopId` lock | dòng 792 |
| **Câu 4** | Client-Side Processing | `App.js` toàn bộ |
| TTS local | `AndroidBridge.speak()` | dòng 347 |
| GPS local | `AndroidBridge.getLatitude()` | dòng 627-636 |
| Haversine | `calculateDistance()` | dòng 241-247 |
| Cache | `localStorage.setItem()` | dòng 436-438 |
| Ping nhẹ | `POST /ping` (100 bytes/5s) | dòng 698-701 |
