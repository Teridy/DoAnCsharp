import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const initSqlJs = window.initSqlJs;

//  THIẾT KẾ HIỆU ỨNG RADAR TACTICAL CHUYÊN NGHIỆP 
const radarStyle = `
  /* Fix nền trắng mặc định của Leaflet DivIcon */
  .transparent-leaflet-icon {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  /* 🎯 1. Radar cho vị trí GPS của người dùng (Màu Teal Modern) */
  @keyframes gps-rings {
    0% { transform: scale(1); opacity: 0.8; }
    80% { transform: scale(4); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }
  .modern-gps-marker {
    width: 20px; height: 20px;
    background-color: #00E5FF; /* Cyan sáng sắc nét */
    border-radius: 50%;
    border: 3px solid #FFFFFF;
    box-shadow: 0 0 15px rgba(0, 229, 255, 0.7);
    position: relative;
    z-index: 10;
  }
  /* Vòng sóng 1 */
  .modern-gps-marker::before {
    content: ''; position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px;
    background-color: rgba(0, 229, 255, 0.3);
    border-radius: 50%;
    animation: gps-rings 2s cubic-bezier(0.36, 0.11, 0.89, 0.32) infinite;
    z-index: -1;
  }
  /* Vòng sóng 2 (trễ nhịp) */
  .modern-gps-marker::after {
    content: ''; position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px;
    background-color: rgba(0, 229, 255, 0.2);
    border-radius: 50%;
    animation: gps-rings 2s cubic-bezier(0.36, 0.11, 0.89, 0.32) infinite;
    animation-delay: 0.6s;
    z-index: -2;
  }

  /* 🎧 2. Radar cho Quán đang được chọn/thuyết minh (Deep Blue Scanner) */
  @keyframes scanner-rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes scanner-pulse {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 0.5; }
    100% { transform: scale(1); opacity: 0.8; }
  }
  .modern-active-marker {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: rgba(66, 133, 244, 0.1); /* Nền mờ cực nhẹ */
    border: 1px solid rgba(66, 133, 244, 0.3);
    display: flex; align-items: center; justify-content: center;
    position: relative;
    animation: scanner-pulse 2s ease-in-out infinite;
  }
  /* Chấm tâm sắc nét */
  .modern-active-marker-core {
    width: 14px; height: 14px;
    background-color: #4285F4; /* Deep Blue */
    border-radius: 50%;
    border: 2px solid #FFFFFF;
    box-shadow: 0 0 10px rgba(66, 133, 244, 0.8);
    z-index: 10;
  }
  /* Tia quét xoay (The Beam) */
  .modern-active-marker::after {
    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: conic-gradient(from 0deg at 50% 50%, rgba(66, 133, 244, 0) 0%, rgba(66, 133, 244, 0.5) 80%, rgba(66, 133, 244, 0) 100%);
    border-radius: 50%;
    animation: scanner-rotate 1.5s linear infinite;
    z-index: 5;
  }

  /* 🔴 3. Marker các quán bình thường (Tối giản) */
  .normal-marker {
    background-color: #FFFFFF;
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 3px solid #EE4D2D; /* Màu san hô */
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    cursor: pointer;
  }
  .normal-marker:hover {
    transform: scale(1.3) translateY(-2px);
    background-color: #EE4D2D;
    box-shadow: 0 5px 15px rgba(238, 77, 45, 0.4);
  }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = radarStyle;
document.head.appendChild(styleSheet);
// ✅ FIX ICON LEAFLET
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// ✅ COMPONENT TỰ ĐỘNG DI CHUYỂN CAMERA
function AutoPan({ position }) {
  const map = useMap();
  useEffect(() => { 
    if (position && map) map.flyTo(position, 18, { animate: true, duration: 1.5 }); 
  }, [map, position]);
  return null;
}

// 🌐 BỘ TỪ ĐIỂN ĐA NGÔN NGỮ (GIAO DIỆN)
const translations = {
  vi: {
    navHome: "Khám phá", navFav: "Đã lưu", navMap: "Bản đồ", navProfile: "Hồ sơ",
    tourSuggest: "Tours Gợi Ý 🗺️", mustTry: "Món Phải Thử 🔥", favTitle: "Yêu thích ❤️", btnRemove: "Xóa",
    mapVisited: "Đã đi qua", mapPlaces: "quán",
    btnViewTour: "🔄 Xem Lộ Trình", btnClearGPS: "📍 Xóa GPS", btnExitTour: "❌ Thoát Tour",
    alertGPS: "Đã khôi phục Radar GPS!",
    tourPlaying: "🎧 Đang thuyết minh:", tourEnded: "🎉 Kết thúc Tour!",
    proTitle: "Hồ sơ của tôi", proName: "Thực thần Vĩnh Khánh", proMember: "Thành viên từ 2026",
    proStats: "Thống kê hành trình 📍", proVisitedLabel: "Quán đã đến", proCompleted: "Hoàn thành",
    proListTitle: "Quán đã ghé thăm 🏃‍♂️",
    proEmpty1: "Bạn chưa đi dạo qua quán nào cả.", proEmpty2: "Hãy mở bản đồ, xách điện thoại lên và đi thôi!",
    proCheckIn: "Đã Check-in ✅", btnStartTour: "▶ Bắt đầu đi",
    tourCompleteDesc: "Bạn đã khám phá trọn vẹn tất cả các địa điểm trong lộ trình này.",
    btnReplay: "🔄 Nghe lại từ đầu",
    btnGoHome: "🏠 Về Trang chủ",
    // --- TỪ VỰNG CHO BẢNG CHỌN GPS ---
    modalEntryTitle: "Chọn chế độ khám phá",
    modalEntryDesc: "Bạn muốn tự động xem lộ trình hay sử dụng định vị GPS thực tế?",
    btnVirtualTour: "🔄 Chạy Tour ảo tự động",
    btnRealGPS: "📍 Sử dụng GPS thực tế",
    alertGPSOn: "Chế độ GPS đã bật! Hãy di chuyển hoặc dùng Fake GPS.",
    confirmGPSMsg: "Hệ thống: Bạn đã nghe xong thông tin từ GPS.\n\n- Bấm OK: Để App TỰ ĐỘNG chạy lộ trình tiếp theo (Tour ảo).\n- Bấm CANCEL: Để tiếp tục di chuyển bằng GPS thật.",
    isOpen: "🟢 Đang mở",
    isClosed: "🔴 Đã đóng cửa"
  },
  en: {
    navHome: "Explore", navFav: "Saved", navMap: "Map", navProfile: "Profile",
    tourSuggest: "Suggested Tours 🗺️", mustTry: "Must-Try Dishes 🔥", favTitle: "Saved ❤️", btnRemove: "Remove",
    mapVisited: "Visited", mapPlaces: "places",
    btnViewTour: "🔄 View Route", btnClearGPS: "📍 Reset GPS", btnExitTour: "❌ Exit Tour",
    alertGPS: "GPS Radar restored!",
    tourPlaying: "🎧 Playing:", tourEnded: "🎉 Tour Ended!",
    proTitle: "My Profile", proName: "Vinh Khanh Foodie", proMember: "Member since 2026",
    proStats: "Journey Stats 📍", proVisitedLabel: "Places Visited", proCompleted: "Completed",
    proListTitle: "Visited Places 🏃‍♂️",
    proEmpty1: "You haven't visited any places yet.", proEmpty2: "Open the map, grab your phone, and let's go!",
    proCheckIn: "Checked-in ✅", btnStartTour: "▶ Start Tour",
    tourCompleteDesc: "You have fully explored all the locations on this route.",
    btnReplay: "🔄 Listen again",
    btnGoHome: "🏠 Go Home",
    // --- TỪ VỰNG CHO BẢNG CHỌN GPS ---
    modalEntryTitle: "Choose Exploration Mode",
    modalEntryDesc: "Do you want to auto-play the route or use real GPS tracking?",
    btnVirtualTour: "🔄 Auto Virtual Tour",
    btnRealGPS: "📍 Use Real GPS",
    alertGPSOn: "GPS Mode enabled! Please move or use Fake GPS.",
    confirmGPSMsg: "System: GPS information finished.\n\n- Click OK: To auto-play the next location (Virtual Tour).\n- Click CANCEL: To continue using real GPS.",
    isOpen: "🟢 Open",
    isClosed: "🔴 Closed"
  },
  zh: {
    navHome: "探索", navFav: "收藏", navMap: "地图", navProfile: "我的",
    tourSuggest: "推荐路线 🗺️", mustTry: "必试推荐 🔥", favTitle: "收藏 ❤️", btnRemove: "删除",
    mapVisited: "已访问", mapPlaces: "家店",
    btnViewTour: "🔄 查看路线", btnClearGPS: "📍 重置 GPS", btnExitTour: "❌ 退出路线",
    alertGPS: "GPS雷达已恢复！",
    tourPlaying: "🎧 正在讲解：", tourEnded: "🎉 导览结束！",
    proTitle: "我的档案", proName: "永庆美食家", proMember: "2026年加入",
    proStats: "行程统计 📍", proVisitedLabel: "已去过", proCompleted: "已完成",
    proListTitle: "已访问的店 🏃‍♂️",
    proEmpty1: "您还没有去过任何地方。", proEmpty2: "打开地图，带上手机，出发吧！",
    proCheckIn: "已打卡 ✅", btnStartTour: "▶ 开始路线",
    tourCompleteDesc: "您已完整探索此路线上的所有地点。",
    btnReplay: "🔄 重新讲解",
    btnGoHome: "🏠 返回首页",
    // --- TỪ VỰNG CHO BẢNG CHỌN GPS ---
    modalEntryTitle: "选择探索模式",
    modalEntryDesc: "您想自动播放路线还是使用真实的GPS定位？",
    btnVirtualTour: "🔄 自动虚拟导览",
    btnRealGPS: "📍 使用真实 GPS",
    alertGPSOn: "GPS模式已开启！请移动或使用虚拟GPS。",
    confirmGPSMsg: "系统：GPS信息播报完毕。\n\n- 点击确定：自动播放下一位置（虚拟导览）。\n- 点击取消：继续使用真实GPS。",
    isOpen: "🟢 营业中",
    isClosed: "🔴 已打烊"
  }
};

function App() {
  const [places, setPlaces] = useState([]); 
  const [orderedPlaces, setOrderedPlaces] = useState([]); 
  const [activeTab, setActiveTab] = useState("home");
  const [currentTourIndex, setCurrentTourIndex] = useState(-1); 
  const [userId] = useState(localStorage.getItem("user_id"));
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [lang, setLang] = useState(localStorage.getItem("app_lang") || "vi");
  const [dataLang, setDataLang] = useState(lang);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null); 
  const [visitedPlaces, setVisitedPlaces] = useState(new Set());
  const [tours, setTours] = useState([]); 
  const [selectedTourId, setSelectedTourId] = useState(null); 
  const [allPlacesBackup, setAllPlacesBackup] = useState([]);

  const speakingIndexRef = useRef(-1);
  const speakTimeoutRef = useRef(null);

  // CÁC BIẾN QUẢN LÝ CHẾ ĐỘ MAP
  const [isVirtualTour, setIsVirtualTour] = useState(false); 
  const [currentShopId, setCurrentShopId] = useState(null); 
  const [showEntryModeModal, setShowEntryModeModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Dùng 10.0.2.2 cho giả lập Android Studio, dùng localhost cho Chrome Desktop
  const isDesktopBrowser = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE = isDesktopBrowser ? "http://localhost:6111/api" : "http://10.0.2.2:6111/api"; 
  const t = translations[lang] || translations["vi"];

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const sortPlacesByRoute = useCallback((rawPlaces) => {
    if (!rawPlaces || rawPlaces.length === 0) return [];
    let unvisited = [...rawPlaces];
    let route = [];
    let currentPos = { lat: 10.7619, lon: 106.7020 }; 
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = calculateDistance(currentPos.lat, currentPos.lon, unvisited[0].latitude, unvisited[0].longitude);
      for (let i = 1; i < unvisited.length; i++) {
        let dist = calculateDistance(currentPos.lat, currentPos.lon, unvisited[i].latitude, unvisited[i].longitude);
        if (dist < minDistance) { minDistance = dist; nearestIndex = i; }
      }
      let nextPlace = unvisited.splice(nearestIndex, 1)[0];
      route.push(nextPlace);
      currentPos = { lat: nextPlace.latitude, lon: nextPlace.longitude };
    }
    return route;
  }, []);

  const markAsVisited = useCallback((place) => {
    if (place && place.id && !visitedPlaces.has(place.id)) {
      setVisitedPlaces((prev) => new Set(prev).add(place.id));
    }
  }, [visitedPlaces]);

  // HÀM ĐỌC ÂM THANH XỊN (CHỐNG LỖI ANDROID)
  const speak = useCallback((textToSpeak, onEnd) => {
    if (speakTimeoutRef.current) { clearTimeout(speakTimeoutRef.current); speakTimeoutRef.current = null; }
    if (window.tourAudio) { window.tourAudio.pause(); window.tourAudio.src = ""; }
    const synth = typeof window !== 'undefined' ? (window.speechSynthesis || window.webkitSpeechSynthesis) : null;
    if (synth) synth.cancel();

    const playGoogleOnline = () => {
      if (navigator.onLine) {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${lang}&client=tw-ob`;
        window.tourAudio = new Audio(url);
        window.tourAudio.onended = onEnd;
        window.tourAudio.play().catch(() => { if(onEnd) speakTimeoutRef.current = setTimeout(onEnd, 1000); });
      } else { if (onEnd) onEnd(); }
    };

    if (window.AndroidBridge && window.AndroidBridge.speak) {
      window.AndroidBridge.stop();
      window.AndroidBridge.speak(textToSpeak, lang);
      if (onEnd) {
        const estimatedTime = textToSpeak.length * 90;
        speakTimeoutRef.current = setTimeout(onEnd, Math.max(estimatedTime, 2000)); 
      }
    } else {
      if (synth) {
        const msg = new SpeechSynthesisUtterance(textToSpeak);
        window.currentUtterance = msg; 
        msg.lang = lang === "en" ? "en-US" : (lang === "zh" ? "zh-CN" : "vi-VN");
        msg.rate = 1.0;
        if (onEnd) {
            msg.onend = onEnd;
            const estimatedTime = textToSpeak.length * 90;
            speakTimeoutRef.current = setTimeout(() => { synth.cancel(); onEnd(); }, Math.max(estimatedTime, 2000) + 2000);
        }
        msg.onerror = () => playGoogleOnline();
        setTimeout(() => { synth.speak(msg); }, 50);
      } else { playGoogleOnline(); }
    }
  }, [lang]);

  // HÀM ĐỌC DÀNH RIÊNG CHO GPS
  const speakGPS = (shopName, description) => {
    console.log("📍 KÍCH HOẠT ĐỌC GPS CHO:", shopName);
    const prefix = lang === "vi" ? "Hệ thống GPS xác nhận bạn đã đến gần " : (lang === "zh" ? "GPS系统确认您已接近 " : "GPS system confirms you are near ");
    const fullText = `${prefix} ${shopName}. ${description}`;
    speak(fullText, () => {
      showChoiceModal(); 
    });
  };

  const showChoiceModal = () => {
    // Sử dụng từ điển thay vì gõ cứng
    const userChoice = window.confirm(t.confirmGPSMsg);
    if (userChoice) {
      setIsVirtualTour(true);
      setCurrentTourIndex(prev => (prev === -1 ? 0 : prev)); 
    } else {
      setIsVirtualTour(false);
    }
  };

  useEffect(() => {
    const loadFileXHR = (url) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 0) resolve(new Uint8Array(xhr.response));
          else reject(new Error(`Lỗi HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Bị chặn file: " + url));
        xhr.send(null);
      });
    };

        const cleanImageUrl = (url) => {
      if (!url) return "";
      
      // Giữ nguyên nếu là link web ngoài (Supabase)
      if (url.includes("supabase.co") || url.startsWith("https://")) return url; 

      // Thuật toán mới: Bỏ qua toàn bộ IP phía trước, chỉ bắt đầu lấy từ chữ "/images/..."
      let path = url;
      if (path.includes("images/")) {
         path = "/images/" + path.split("images/")[1];
      } else if (!path.startsWith("/")) {
         path = "/" + path;
      }

      // Nối với IP API hiện tại
      const serverBaseUrl = API_BASE.replace("/api", ""); 
      return serverBaseUrl + path; 
    };

    // Tạo chìa khóa vạn năng (Base64 encoding của User:Pass)
      const headers = {
        "Authorization": "Basic " + btoa("11303626:60-dayfreetrial")
      };

    const loadData = async () => {
      try {
        const [toursRes, tpRes, placesRes] = await Promise.all([
          fetch(`${API_BASE}/tours?lang=${lang}`, { headers }), // Thêm { headers } vào đây
      fetch(`${API_BASE}/tours/pois`, { headers }),          // Thêm { headers } vào đây
      fetch(`${API_BASE}/places?lang=${lang}`, { headers })
        ]);
        const toursData = await toursRes.json();
        const tourPoisData = await tpRes.json();
        const placesRaw = await placesRes.json();
        
        localStorage.setItem("cache_tours", JSON.stringify(toursData));
        localStorage.setItem("cache_tour_pois", JSON.stringify(tourPoisData));
        localStorage.setItem(`cache_places_${lang}`, JSON.stringify(placesRaw));

        setTours(toursData);
        const allProcessed = placesRaw.map(p => ({ ...p, image_url: cleanImageUrl(p.image_url) }));
        setAllPlacesBackup(allProcessed);
        setDataLang(lang);

        if (selectedTourId) {
           const poiIdsForThisTour = tourPoisData.filter(tp => tp.tour_id === selectedTourId).map(tp => tp.poi_id);
           const tourPlaces = allProcessed.filter(p => poiIdsForThisTour.includes(p.id));
           setPlaces(tourPlaces);
           setOrderedPlaces(sortPlacesByRoute(tourPlaces));
        } else {
           const homePlaces = allProcessed.filter(p => !p.name.toLowerCase().includes("cổng"));
           setPlaces(homePlaces);
           setOrderedPlaces(sortPlacesByRoute(homePlaces));
        }
      } catch (err) {
        console.log("Mất mạng! Đang tìm dữ liệu trong Storage...");
        const cachedTours = localStorage.getItem("cache_tours");
        const cachedPois = localStorage.getItem("cache_tour_pois");
        const cachedPlaces = localStorage.getItem(`cache_places_${lang}`);

        if (cachedTours && cachedPois && cachedPlaces) {
          const toursData = JSON.parse(cachedTours);
          const tourPoisData = JSON.parse(cachedPois);
          const placesRaw = JSON.parse(cachedPlaces);

          setTours(toursData);
          const allProcessed = placesRaw.map(p => ({ ...p, image_url: cleanImageUrl(p.image_url) }));
          setAllPlacesBackup(allProcessed);
          setDataLang(lang);

          if (selectedTourId) {
             const poiIdsForThisTour = tourPoisData.filter(tp => tp.tour_id === selectedTourId).map(tp => tp.poi_id);
             const tourPlaces = allProcessed.filter(p => poiIdsForThisTour.includes(p.id));
             setPlaces(tourPlaces);
             setOrderedPlaces(sortPlacesByRoute(tourPlaces));
          } else {
             const homePlaces = allProcessed.filter(p => !p.name.toLowerCase().includes("cổng"));
             setPlaces(homePlaces);
             setOrderedPlaces(sortPlacesByRoute(homePlaces));
          }
        } else {
          console.log("Storage trống, kích hoạt SQLite dự phòng...");
          try {
            const wasmBinary = await loadFileXHR("sql-wasm.wasm");
            const SQL = await initSqlJs({ wasmBinary: wasmBinary });
            const dbBytes = await loadFileXHR("food_narration_poc.db");
            const db = new SQL.Database(dbBytes);
            
            let offlineTours = [];
            try {
              const toursRes = db.exec("SELECT * FROM tours");
              if (toursRes.length > 0) {
                const cols = toursRes[0].columns;
                offlineTours = toursRes[0].values.map(row => {
                  let obj = {}; cols.forEach((col, idx) => { obj[col] = row[idx]; });
                  if(!obj.color) obj.color = "#EE4D2D"; return obj;
                });
                setTours(offlineTours);
              }
            } catch (e) {}

            let offlineTourPois = [];
            try {
              const tpRes = db.exec("SELECT * FROM tour_pois");
              if (tpRes.length > 0) {
                const cols = tpRes[0].columns;
                offlineTourPois = tpRes[0].values.map(row => {
                  let obj = {}; cols.forEach((col, idx) => { obj[col] = row[idx]; }); return obj;
                });
              }
            } catch (e) {}

            const query = `SELECT f.id, COALESCE(t.translated_name, n.name) AS name, COALESCE(t.content, f.description) AS description, n.latitude, n.longitude, i.image_url, f.price_range FROM food_places f JOIN narration_points n ON f.narration_point_id = n.id LEFT JOIN images i ON n.id = i.narration_point_id LEFT JOIN narration_translations t ON n.id = t.narration_point_id AND t.language_code = '${lang}'`;
            const res = db.exec(query);
            if (res.length > 0) {
              const columns = res[0].columns;
              const values = res[0].values;
              const allOfflineProcessed = values.map(row => {
                let obj = {}; columns.forEach((col, index) => { obj[col] = col === "image_url" ? cleanImageUrl(row[index]) : row[index]; }); return obj;
              });
              
              setAllPlacesBackup(allOfflineProcessed);
              setDataLang(lang);
              
              if (selectedTourId) {
                 const poiIdsForThisTour = offlineTourPois.filter(tp => tp.tour_id === selectedTourId).map(tp => tp.poi_id);
                 const tourPlaces = allOfflineProcessed.filter(p => poiIdsForThisTour.includes(p.id));
                 setPlaces(tourPlaces);
                 setOrderedPlaces(sortPlacesByRoute(tourPlaces));
              } else {
                 const homePlaces = allOfflineProcessed.filter(p => !p.name.toLowerCase().includes("cổng"));
                 setPlaces(homePlaces);
                 setOrderedPlaces(sortPlacesByRoute(homePlaces));
              }
            }
          } catch (dbErr) {
            console.error("Lỗi cả Online, Caching lẫn SQLite:", dbErr);
          }
        }
      }
    };
    loadData();
  }, [lang, sortPlacesByRoute, selectedTourId]);

  const startTour = (tourId) => {
    setSelectedTourId(tourId);
    setActiveTab("map"); 
    setIsVirtualTour(false); 
    setCurrentTourIndex(-1); 
    speakingIndexRef.current = -1; 
    setSelectedPlace(null);
    setShowEntryModeModal(true); 
  };

  const exitTour = () => {
    setSelectedTourId(null);
    setCurrentTourIndex(-1); 
    speakingIndexRef.current = -1;
    setSelectedPlace(null);
    setShowCompletionModal(false);
    if (window.AndroidBridge) window.AndroidBridge.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (speakTimeoutRef.current) { clearTimeout(speakTimeoutRef.current); speakTimeoutRef.current = null; }
  };

  const handleChangeLanguage = (newLang) => {
    if (newLang === lang) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (window.AndroidBridge) window.AndroidBridge.stop();
    if (window.tourAudio) { window.tourAudio.pause(); window.tourAudio.src = ""; }
    if (speakTimeoutRef.current) { clearTimeout(speakTimeoutRef.current); speakTimeoutRef.current = null; }
    setLang(newLang);
    localStorage.setItem("app_lang", newLang);
    if (activeTab === "map" && selectedTourId !== null) {
      speakingIndexRef.current = -1; 
      if (currentTourIndex >= orderedPlaces.length) {
        setCurrentTourIndex(0);
      }
    }
  };

  // 1. CHỐNG XUNG ĐỘT TOUR ẢO (DIỆT BÓNG MA)
  useEffect(() => {
    let isCancelled = false; 

    if (activeTab === "map" && isVirtualTour && currentTourIndex >= 0 && currentTourIndex < orderedPlaces.length && lang === dataLang) {
      if (speakingIndexRef.current === currentTourIndex) return; 
      
      speakingIndexRef.current = currentTourIndex;
      const p = orderedPlaces[currentTourIndex];
      
      setSelectedPlace(p); 
      markAsVisited(p);

      const prefix = lang === "vi" ? "Chúng ta đang đến " : (lang === "zh" ? "我们正在前往 " : "We are arriving at ");
      
      speak(`${prefix} ${p.name}. ${p.description}`, () => {
        if (isCancelled) return; 
        speakTimeoutRef.current = setTimeout(() => { 
          if (isCancelled) return; 
          if(activeTab === "map" && isVirtualTour) {
            setCurrentTourIndex(prev => prev + 1); 
          }
        }, 800);
      });
    } else if (activeTab !== "map") {
      speakingIndexRef.current = -1; 
    }

    return () => { isCancelled = true; };
  }, [currentTourIndex, orderedPlaces, speak, activeTab, lang, dataLang, markAsVisited, isVirtualTour]);

  useEffect(() => {
    if (activeTab !== "map") {
      if (window.AndroidBridge) window.AndroidBridge.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (speakTimeoutRef.current) { clearTimeout(speakTimeoutRef.current); speakTimeoutRef.current = null; }
    }
  }, [activeTab, lang]);

  // 2. CHẾ ĐỘ SÚNG BẮN TỈA GPS (TÌM ĐÚNG 1 QUÁN GẦN NHẤT)
  useEffect(() => {
    if (activeTab !== "map" || allPlacesBackup.length === 0) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        setUserLocation([userLat, userLon]);

        if (!isVirtualTour) {
          let closestPlace = null;
          let minDistance = Infinity;

          allPlacesBackup.forEach((p) => {
            const distMet = calculateDistance(userLat, userLon, p.latitude, p.longitude) * 1000;
            if (distMet < minDistance) {
              minDistance = distMet;
              closestPlace = p;
            }
          });

          if (closestPlace) {
            const radius = closestPlace.activation_radius || 50; 
            if (minDistance <= radius && currentShopId !== closestPlace.id) {
              console.log(`🎯 ĐÃ KHÓA MỤC TIÊU: ${closestPlace.name}`);
              setCurrentShopId(closestPlace.id); 
              setSelectedPlace(closestPlace);    
              speakGPS(closestPlace.name, closestPlace.description);
            }
          }
        }
      },
      (error) => console.log("GPS Error", error),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeTab, allPlacesBackup, isVirtualTour, currentShopId, markAsVisited]);

  useEffect(() => {
    if (activeTab === "map" && orderedPlaces.length > 0 && currentTourIndex >= orderedPlaces.length) {
      setShowCompletionModal(true);
    }
  }, [currentTourIndex, orderedPlaces.length, activeTab]);

  const handleToggleFavorite = (placeId) => {
    fetch(`${API_BASE}/favorites`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: parseInt(userId), narration_point_id: placeId })
    }).then(() => setFavoriteIds(prev => prev.includes(placeId) ? prev.filter(id => id !== placeId) : [...prev, placeId]))
      .catch(() => alert("Cần có mạng để lưu yêu thích!")); 
  };

  return (
    <div style={{ width: "100vw", height: "100vh", backgroundColor: "#F4F7FB", position: "relative", overflow: "hidden", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      <div style={{ height: "calc(100vh - 75px)", overflowY: "auto", overflowX: "hidden" }}>

        {/* --- TAB HOME --- */}
        {activeTab === "home" && (
          <div style={{ padding: "30px 20px", minHeight: "100%", background: "linear-gradient(180deg, #FFFFFF 0%, #F4F7FB 100%)" }}>
            <h2 style={{ fontSize: "32px", color: "#1A1A1A", fontWeight: "900", letterSpacing: "-0.5px", margin: "0 0 5px 0" }}>Vĩnh Khánh</h2>
            <h2 style={{ fontSize: "32px", color: "#EE4D2D", fontWeight: "900", letterSpacing: "-0.5px", margin: "0 0 25px 0" }}>Street Food</h2>
            
            <div style={{ display: "flex", gap: "10px", marginBottom: "35px" }}>
              {["vi", "en", "zh"].map(l => (
                <button key={l} 
                  onClick={() => handleChangeLanguage(l)}
                  style={{ border: "none", padding: "10px 24px", borderRadius: "12px", backgroundColor: lang === l ? "#EE4D2D" : "#FFFFFF", color: lang === l ? "white" : "#6B7280", fontWeight: "700", fontSize: "14px", textTransform: "uppercase", boxShadow: lang === l ? "0 8px 16px rgba(238, 77, 45, 0.3)" : "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.3s ease", cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>

            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#2D3436", marginBottom: "15px" }}>{t.tourSuggest}</h3>
            <div style={{ display: "flex", gap: "15px", overflowX: "auto", paddingBottom: "25px", scrollbarWidth: "none", marginLeft: "-20px", paddingLeft: "20px", marginRight: "-20px", paddingRight: "20px" }}>
              {tours.map(tour => (
                <div key={tour.id} onClick={() => startTour(tour.id)} style={{ minWidth: "220px", padding: "20px", borderRadius: "12px", background: `linear-gradient(135deg, ${tour.color || '#EE4D2D'} 0%, #34495e 100%)`, color: "white", cursor: "pointer", position: "relative", overflow: "hidden", boxShadow: `0 10px 20px rgba(0,0,0,0.1)` }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "800" }}>{tour.name}</h4>
                  <p style={{ margin: 0, fontSize: "13px", opacity: 0.9, lineHeight: "1.4" }}>{tour.description}</p>
                  <div style={{ marginTop: "15px", display: "inline-block", backgroundColor: "rgba(255,255,255,0.2)", padding: "5px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", backdropFilter: "blur(5px)" }}>{t.btnStartTour}</div>
                </div>
              ))}
            </div>

            {/* --- TIÊU ĐỀ "MÓN PHẢI THỬ" --- */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", marginTop: "10px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#2D3436", margin: 0 }}>{t.mustTry}</h3>
            </div>
            
            {/* --- DANH SÁCH MÓN ĂN QUẸT NGANG --- */}
            <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "25px", scrollbarWidth: "none", marginLeft: "-20px", paddingLeft: "20px", marginRight: "-20px", paddingRight: "20px" }}>
              {allPlacesBackup.filter(p => !p.name.toLowerCase().includes("cổng")).map(p => (
                <div key={p.id} onClick={() => { setSelectedPlace(p); markAsVisited(p); speak(`${p.name}. ${p.description}`); }} style={{ minWidth: "280px", height: "360px", borderRadius: "12px", boxShadow: "0 15px 35px rgba(0,0,0,0.1)", overflow: "hidden", position: "relative", flexShrink: 0, cursor: "pointer", backgroundColor: "#fff" }}>
                  <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70%", background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)" }}></div>
                  
                  {/* 🟢🔴 MÁC TRẠNG THÁI (MỞ/ĐÓNG) NẰM Ở GÓC TRÊN BÊN TRÁI */}
                  <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10 }}>
                    <span style={{ 
                      backgroundColor: p.is_active ? "rgba(46, 213, 115, 0.9)" : "rgba(238, 77, 45, 0.9)", 
                      color: "white", padding: "6px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "900", 
                      backdropFilter: "blur(5px)", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" 
                    }}>
                      {p.is_active ? t.isOpen : t.isClosed}
                    </span>
                  </div>

                  {/* THẢ TIM Ở GÓC TRÊN BÊN PHẢI */}
                  <div onClick={(e) => { e.stopPropagation(); handleToggleFavorite(p.id); }} style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10, fontSize: "18px", backgroundColor: "rgba(255,255,255,0.3)", borderRadius: "50%", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.4)" }}>
                    {favoriteIds.includes(p.id) ? "❤️" : "🤍"}
                  </div>
                  
                  {/* TÊN, GIÁ TIỀN VÀ RATING Ở DƯỚI CÙNG */}
                  <div style={{ position: "absolute", bottom: "25px", left: "25px", right: "25px", zIndex: 10 }}>
                    <p style={{ margin: 0, fontWeight: "900", color: "#FFFFFF", fontSize: "24px", textShadow: "0 2px 8px rgba(0,0,0,0.5)", lineHeight: "1.2" }}>{p.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "15px" }}>
                      <span style={{ backgroundColor: "#EE4D2D", color: "white", padding: "6px 12px", borderRadius: "12px", fontSize: "14px", fontWeight: "800", boxShadow: "0 4px 10px rgba(238, 77, 45,0.4)" }}>{p.price_range}</span>
                      <span style={{ color: "#FFD700", fontSize: "14px", fontWeight: "800", backgroundColor: "rgba(0,0,0,0.4)", padding: "6px 10px", borderRadius: "12px", backdropFilter: "blur(4px)" }}>★ 4.8</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB MAP --- */}
        {activeTab === "map" && (
          <div style={{ height: "100%", width: "100%", position: "relative" }}>
            <MapContainer center={[10.7619, 106.7020]} zoom={17} style={{ height: "100%", width: "100%", zIndex: 1 }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              {orderedPlaces.map((p) => (
                <Marker key={p.id} position={[p.latitude, p.longitude]} 
                  icon={L.divIcon({
                    className: 'transparent-leaflet-icon', 
                    html: selectedPlace?.id === p.id 
                      ? `<div class="modern-active-marker"><div class="modern-active-marker-core"></div></div>`
                      : `<div class="normal-marker"></div>`,
                    iconSize: [30, 30], iconAnchor: [15, 15]
                  })}
                  eventHandlers={{ click: () => { setSelectedPlace(p); markAsVisited(p); speak(`${p.name}. ${p.description}`); } }} 
                />
              ))}
              {userLocation && (
                <Marker position={userLocation} icon={L.divIcon({ className: 'transparent-leaflet-icon', html: `<div class="modern-gps-marker"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] })} />
              )}
              {selectedPlace && <AutoPan position={[selectedPlace.latitude, selectedPlace.longitude]} />}
            </MapContainer>

            <div style={{ position: "absolute", top: "20px", left: "0", right: "0", display: "flex", justifyContent: "space-between", padding: "0 20px", zIndex: 1000, pointerEvents: "none" }}>
              <div style={{ backgroundColor: "rgba(255,255,255,0.9)", padding: "10px 16px", borderRadius: "12px", fontWeight: "800", fontSize: "13px", color: "#2D3436", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", backdropFilter: "blur(10px)", pointerEvents: "auto" }}>
                🚶‍♂️ {t.mapVisited}: {visitedPlaces.size} / {places.length} {t.mapPlaces}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "auto" }}>
                {selectedTourId && <button onClick={exitTour} style={{ backgroundColor: "#EE4D2D", border: "none", padding: "10px 15px", borderRadius: "12px", fontSize: "12px", fontWeight: "900", color: "white", cursor: "pointer", boxShadow: "0 4px 15px rgba(238, 77, 45, 0.4)" }}>{t.btnExitTour}</button>}
              </div>
            </div>

            {selectedPlace && (
              <div style={{ position: "absolute", bottom: "0px", left: "0", right: "0", backgroundColor: "white", borderRadius: "30px 30px 0 0", boxShadow: "0px -10px 40px rgba(0,0,0,0.15)", zIndex: 9999, overflow: "hidden", animation: "slideUp 0.3s ease-out" }}>
                <div style={{ width: "40px", height: "5px", backgroundColor: "#DFE6E9", borderRadius: "3px", margin: "12px auto" }}></div>
                <div style={{ padding: "15px 25px 30px 25px" }}>
                  <img src={selectedPlace.image_url} alt={selectedPlace.name} style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "12px", marginBottom: "15px" }} />
                  <h3 style={{ margin: 0, fontSize: "22px", color: "#1A1A1A", fontWeight: "900" }}>{selectedPlace.name}</h3>
                  <p style={{ margin: "8px 0 12px 0", color: "#EE4D2D", fontWeight: "800" }}>{selectedPlace.price_range}</p>
                  <p style={{ margin: "0", color: "#636E72", fontSize: "14px", lineHeight: "1.5" }}>{selectedPlace.description}</p> 
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB YÊU THÍCH --- */}
        {activeTab === "favorites" && (
          <div style={{ padding: "30px 20px" }}>
            <h2 style={{ fontSize: "28px", color: "#1A1A1A", fontWeight: "900", marginBottom: "25px" }}>{t.favTitle}</h2>
            {allPlacesBackup.filter(p => favoriteIds.includes(p.id)).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "15px", backgroundColor: "white", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" }}>
                <img src={p.image_url} style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "cover", marginRight: "15px" }} />
                <div style={{ flex: 1 }}><p style={{ margin: 0, fontWeight: "800", fontSize: "16px", color: "#2D3436" }}>{p.name}</p></div>
                <button onClick={() => handleToggleFavorite(p.id)} style={{ border: "none", background: "#FFF0F0", color: "#EE4D2D", padding: "10px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}>{t.btnRemove}</button>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB PROFILE --- */}
        {activeTab === "profile" && (
          <div style={{ padding: "30px 20px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "900", color: "#1A1A1A", marginBottom: "25px" }}>{t.proTitle}</h2>
            <div style={{ padding: "30px 20px", backgroundColor: "white", borderRadius: "12px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", marginBottom: "25px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "80px", background: "linear-gradient(135deg, #EE4D2D 0%, #ff6b81 100%)" }}></div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ width: "90px", height: "90px", backgroundColor: "#FFFFFF", borderRadius: "50%", margin: "0 auto 15px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", color: "#EE4D2D", fontWeight: "bold", boxShadow: "0 8px 20px rgba(238, 77, 45, 0.2)", border: "4px solid white" }}>V</div>
                <p style={{ fontWeight: "900", margin: "0 0 5px 0", fontSize: "22px", color: "#2D3436" }}>{t.proName}</p>
                <p style={{ margin: 0, color: "#636E72", fontSize: "14px", fontWeight: "600" }}>{t.proMember}</p>
              </div>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1A1A1A", marginBottom: "15px" }}>{t.proStats}</h3>
            <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
              <div style={{ flex: 1, backgroundColor: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", textAlign: "center" }}>
                <p style={{ fontSize: "32px", fontWeight: "900", color: "#EE4D2D", margin: "0 0 5px 0" }}>{visitedPlaces.size}</p>
                <p style={{ fontSize: "12px", color: "#636E72", fontWeight: "700", margin: 0, textTransform: "uppercase" }}>{t.proVisitedLabel}</p>
              </div>
              <div style={{ flex: 1, backgroundColor: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", textAlign: "center" }}>
                <p style={{ fontSize: "32px", fontWeight: "900", color: "#4285F4", margin: "0 0 5px 0" }}>{allPlacesBackup.length > 0 ? Math.round((visitedPlaces.size / allPlacesBackup.length) * 100) : 0}%</p>
                <p style={{ fontSize: "12px", color: "#636E72", fontWeight: "700", margin: 0, textTransform: "uppercase" }}>{t.proCompleted}</p>
              </div>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1A1A1A", marginBottom: "15px" }}>{t.proListTitle}</h3>
            {visitedPlaces.size === 0 ? (
              <div style={{ backgroundColor: "white", padding: "30px 20px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", marginBottom: "30px" }}><p style={{ fontSize: "40px", margin: "0 0 10px 0" }}>👟</p><p style={{ color: "#636E72", fontWeight: "600", margin: 0, fontSize: "14px", lineHeight: "1.5" }}>{t.proEmpty1}<br/>{t.proEmpty2}</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "30px" }}>
                {allPlacesBackup.filter(p => visitedPlaces.has(p.id)).map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "15px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.03)" }}>
                    <img src={p.image_url} alt={p.name} style={{ width: "70px", height: "70px", borderRadius: "12px", objectFit: "cover", marginRight: "15px" }} />
                    <div style={{ flex: 1 }}><p style={{ margin: "0 0 8px 0", fontWeight: "800", fontSize: "16px", color: "#2D3436" }}>{p.name}</p><span style={{ backgroundColor: "#E8F0FE", color: "#4285F4", padding: "4px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }}>{t.proCheckIn}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- BẢNG THÔNG BÁO HOÀN THÀNH TOUR --- */}
        {showCompletionModal && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}>
            <div style={{ backgroundColor: "white", padding: "35px 25px", borderRadius: "12px", width: "80%", maxWidth: "340px", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", animation: "slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
              
              <div style={{ fontSize: "65px", marginBottom: "15px", filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.1))" }}>🏆</div>
              <h3 style={{ fontSize: "24px", fontWeight: "900", color: "#1A1A1A", margin: "0 0 10px 0", letterSpacing: "-0.5px" }}>{t.tourEnded}</h3>
              <p style={{ fontSize: "15px", color: "#636E72", marginBottom: "30px", lineHeight: "1.5", fontWeight: "500" }}>{t.tourCompleteDesc}</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button onClick={() => { setShowCompletionModal(false); setCurrentTourIndex(0); speakingIndexRef.current = -1; }} style={{ backgroundColor: "#4285F4", color: "white", border: "none", padding: "16px", borderRadius: "12px", fontWeight: "800", fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 20px rgba(66, 133, 244, 0.3)", transition: "0.2s" }}>
                  {t.btnReplay}
                </button>
                <button onClick={() => { setShowCompletionModal(false); exitTour(); setActiveTab("home"); }} style={{ backgroundColor: "#F4F7FB", color: "#2D3436", border: "none", padding: "16px", borderRadius: "12px", fontWeight: "800", fontSize: "16px", cursor: "pointer", transition: "0.2s" }}>
                  {t.btnGoHome}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* --- BẢNG CHỌN CHẾ ĐỘ KHI VÀO MAP --- */}
      {showEntryModeModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 20000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "85%", maxWidth: "350px", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: "50px", marginBottom: "10px" }}>🧭</div>
            <h3 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 10px 0" }}>Chọn chế độ khám phá</h3>
            <p style={{ fontSize: "14px", color: "#636E72", margin: "0 0 25px 0" }}>Bạn muốn tự động xem lộ trình hay sử dụng định vị GPS thực tế?</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* NÚT CHỌN TOUR ẢO */}
              <button onClick={() => { 
                setIsVirtualTour(true); 
                setCurrentTourIndex(0); 
                setShowEntryModeModal(false); 
              }} style={{ backgroundColor: "#4285F4", color: "white", border: "none", padding: "15px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>
                🔄 Chạy Tour ảo tự động
              </button>

              {/* NÚT CHỌN GPS THẬT */}
              <button onClick={() => { 
                // Tẩy não thêm lần nữa cho chắc cốp
                setIsVirtualTour(false); 
                setCurrentTourIndex(-1); 
                speakingIndexRef.current = -1;
                setSelectedPlace(null);
                setCurrentShopId(null); 
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                
                setShowEntryModeModal(false); 
                alert("Chế độ GPS đã bật! Hãy di chuyển hoặc dùng Fake GPS.");
              }} style={{ backgroundColor: "#00E5FF", color: "#1A1A1A", border: "none", padding: "15px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>
                📍 Sử dụng GPS thực tế
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PREMIUM BOTTOM NAV --- */}
      <div style={{ position: "absolute", bottom: 0, width: "100%", height: "75px", backgroundColor: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(15px)", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 1000, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div onClick={() => setActiveTab("home")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: activeTab === "home" ? "#EE4D2D" : "#B2BEC3", cursor: "pointer", transition: "0.2s" }}><span style={{ fontSize: "22px" }}>🏠</span><span style={{ fontSize: "11px", fontWeight: "800" }}>{t.navHome}</span></div>
        <div onClick={() => setActiveTab("favorites")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: activeTab === "favorites" ? "#EE4D2D" : "#B2BEC3", cursor: "pointer", transition: "0.2s" }}><span style={{ fontSize: "22px" }}>❤️</span><span style={{ fontSize: "11px", fontWeight: "800" }}>{t.navFav}</span></div>
        
        {/* 3. NÚT MAP: TẨY TRẮNG MỌI DỮ LIỆU CŨ */}
        <div 
          onClick={() => { 
            setActiveTab("map"); 
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            if (window.AndroidBridge) window.AndroidBridge.stop();
            if (window.tourAudio) { window.tourAudio.pause(); window.tourAudio.src = ""; }
            if (speakTimeoutRef.current) { clearTimeout(speakTimeoutRef.current); speakTimeoutRef.current = null; }
            setIsVirtualTour(false); 
            setCurrentTourIndex(-1); 
            speakingIndexRef.current = -1; 
            setSelectedPlace(null);  
            setCurrentShopId(null);  
            setShowEntryModeModal(true); 
          }} 
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: activeTab === "map" ? "#4285F4" : "#B2BEC3", cursor: "pointer", transition: "0.2s" }}
        >
          <div style={{ backgroundColor: activeTab === "map" ? "#E8F0FE" : "transparent", padding: "4px 15px", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "22px" }}>📍</span>
          </div>
          <span style={{ fontSize: "11px", fontWeight: "800" }}>{t.navMap}</span>
        </div>
        <div onClick={() => setActiveTab("profile")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: activeTab === "profile" ? "#EE4D2D" : "#B2BEC3", cursor: "pointer", transition: "0.2s" }}><span style={{ fontSize: "22px" }}>👤</span><span style={{ fontSize: "11px", fontWeight: "800" }}>{t.navProfile}</span></div>
      </div>
    </div>
  );
}

export default App;
