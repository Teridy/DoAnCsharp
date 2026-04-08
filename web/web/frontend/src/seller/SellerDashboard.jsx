import { useState, useEffect } from "react";
import {
  Store, Headphones, Languages,
  Edit2, User, Menu, MapPin,
  Clock, CheckCircle ,PlusCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../css/SellerDashboard.css";
import SellerAudioManager from "./SellerAudioManager";
import SellerTranslationManager from "./SellerTranslationManager";

const SellerDashboard = () => {
  const navigate = useNavigate();
  
  // LOGIC TRẠNG THÁI APP: loading | unregistered | pending | rejected | approved | approved_notify
  const [appState, setAppState] = useState("loading"); 
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
  return localStorage.getItem("currentSellerTab") || "my-shop";
  });
  const [editingStall, setEditingStall] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeStall, setActiveStall] = useState(null);
  const [unclaimedStalls, setUnclaimedStalls] = useState([]);
  const [formData, setFormData] = useState({
    isClosed: false,
    categoriesId: null,
    narrationPointsId: null,
    stallName: "",
    latitude: "",
    longitude: "",
    image: null,
    imagePreview: ""
  });
const handleFileChange = (e, type) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "register") {
        setRegForm({ ...regForm, image: reader.result, imagePreview: reader.result });
      } else {
        setFormData({ ...formData, image: reader.result, imagePreview: reader.result });
      }
    };
    reader.readAsDataURL(file); // Chuyển ảnh sang dạng base64 để gửi API dễ dàng hơn
  }
};
  // Dữ liệu cho Form Đăng Ký Mới
const [regForm, setRegForm] = useState({
  stallName: "",
  categoriesId: "",
  latitude: "",
  longitude: "",
  description: "",
  priceRange: "",    
  openingHours: "",
  activationRadius: "100", // Để mặc định khoảng 100m chẳng hạn
  image: null, 
  imagePreview: "" // Để hiển thị ảnh xem trước
});

const handleClaim = async (stall) => {
  const token = sessionStorage.getItem("token");
  if (!window.confirm(`Bạn muốn nhận quản lý quán "${stall.stallName}"?`)) return;

  try {
    const res = await fetch("http://localhost:5050/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        entityType: "Stall",
        entityId: stall.id,
        newDataJson: JSON.stringify({ status: "PendingClaim" }), // Gửi một status đặc biệt để backend biết là đang claim quán có sẵn
        status: "Pending"
      }),
    });

    if (res.ok) {
      localStorage.setItem("isPendingStall", "true"); 
      setAppState("pending");
    }
  } catch (err) {
    console.error("Lỗi khi nhận quán:", err);
  }
};

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    localStorage.setItem("currentSellerTab", tabName);
  };

  const API_URL = "http://localhost:5050/api/Stalls";
const fetchUnclaimedStalls = async () => {
    try {
        const res = await fetch("http://localhost:5050/api/Stalls/unclaimed"); // Kiểm tra lại URL này có đúng với Swagger/Backend không
        if (res.ok) {
            const data = await res.json();
            setUnclaimedStalls(Array.isArray(data) ? data : []);
        } else {
            console.error("Không lấy được danh sách quán mồi");
            setUnclaimedStalls([]); // Nếu lỗi thì cho mảng rỗng để không sập giao diện
        }
    } catch (err) {
        console.error("Lỗi kết nối API unclaimed:", err);
        setUnclaimedStalls([]);
    }
};

        // Gọi hàm này trong useEffect khi component load lần đầu
        useEffect(() => {
            fetchUnclaimedStalls();
        }, []);
          // 1. Kiểm tra trạng thái quán của Seller
    const fetchStalls = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        localStorage.removeItem("isPendingStall");
        setStalls(data);
        setActiveStall(data[0]);

        // FIX: Tránh lỗi crash nếu data[0].status bị null
        const status = (data[0].status || "").toLowerCase().trim();

        setAppState((prev) => {
          if (status === "pending" || status === "chờ duyệt") return "pending";
          if (status === "rejected" || status === "từ chối") return "rejected";

         if (status === "active" || status === "open") {
  return prev === "pending" ? "approved_notify" : "approved";
}

          // FIX: Nếu status là một chữ gì đó lạ hoắc, mặc định cho vào approved luôn để tránh kẹt loading
          return "approved"; 
        });
      } else {
        setAppState((prev) => {
          const isPendingLocal = localStorage.getItem("isPendingStall") === "true";
          return isPendingLocal ? "pending" : "unregistered";
        });
      }
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
      // FIX CỰC QUAN TRỌNG: Lỗi thì phải thoát vòng lặp loading!
      setAppState("unregistered"); 
    }
  };
 const fetchCategories = async () => {
    try {
      const res = await fetch("http://localhost:5050/api/Categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Lỗi lấy danh mục:", err);
    }
  };
  useEffect(() => {
    fetchStalls();
    fetchCategories();
  }, []);

  // THÊM MỚI: Tự động kiểm tra trạng thái mỗi 5 giây khi đang chờ duyệt
  useEffect(() => {
    let interval;
    if (appState === "pending") {
        interval = setInterval(() => {
            fetchStalls();
        }, 5000);
    }
    return () => clearInterval(interval); // Dọn dẹp interval khi component unmount hoặc đổi state
  }, [appState]);

// Tìm đến useEffect khi editingStall thay đổi
useEffect(() => {
  if (editingStall) {
    setFormData({
      stallName: editingStall.stallName || "",
      latitude: editingStall.latitude || "",
      longitude: editingStall.longitude || "",
      status: editingStall.status || "Closed",
      categoriesId: editingStall.categoryId || "",
      
      // ✅ CẬP NHẬT CÁC DÒNG NÀY ĐỂ HIỆN DỮ LIỆU TỪ DB
      priceRange: editingStall.priceRange || "", 
      openingHours: editingStall.openingHours || "",
      description: editingStall.description || "",
      
      image: null,
      imagePreview: editingStall.imageUrl ? `http://localhost:5050${editingStall.imageUrl}` : ""
    });
  }
}, [editingStall]);

  const handleEdit = (stall) => {
    setEditingStall(stall);
  };

 const handleLogout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  localStorage.removeItem("isPendingStall");
  localStorage.removeItem("currentSellerTab");
  navigate("/login");
};

  // 2. Hàm Đăng Ký Quán Mới
  const handleRegisterStall = async (e) => {
      e.preventDefault();
      const token = sessionStorage.getItem("token");

      const requestBody = {
          entityType: "Stall",
          entityId: 0, 
          newDataJson: JSON.stringify({
              stallName: regForm.stallName,
              categories_id: parseInt(regForm.categoriesId),
              latitude: parseFloat(regForm.latitude),
              longitude: parseFloat(regForm.longitude),
              description: regForm.description,
              priceRange: regForm.priceRange,       // Thêm dòng này
              openingHours: regForm.openingHours,   // Thêm dòng này
              activationRadius: parseInt(regForm.activationRadius) || 100,
              priority: 0,
              image_url: regForm.image,
              status: "Pending" 
          }),
          status: "Pending"
      };

      try {
        const res = await fetch("http://localhost:5050/api/requests", { 
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });
  
        if (res.ok) {
            // THÊM DÒNG NÀY: Dán cờ chờ duyệt vào localStorage
            localStorage.setItem("isPendingStall", "true");
            
            setAppState("pending"); 
            // (Không gọi fetchStalls() ở đây nữa để tránh xung đột)
        } else {
            alert("❌ Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
        }
      } catch (err) {
        console.error("Lỗi đăng ký:", err);
      }
  };

  // 3. Hàm cập nhật stall 
const handleUpdate = async () => {
  const token = sessionStorage.getItem("token");
  
  const newData = {
    stallName: formData.stallName, // Gửi tên mới
    latitude: parseFloat(formData.latitude), // Gửi tọa độ mới
    longitude: parseFloat(formData.longitude),
    status: formData.status, // Gửi trạng thái mới
    categories_id: formData.categoriesId,
    image_url: formData.image,
    priceRange: formData.priceRange,
    openingHours: formData.openingHours,
    description: formData.description
    // Giữ nguyên các trường khác nếu cần
  };

  const requestBody = {
    entityType: "Stall",
    entityId: editingStall.id,
    newDataJson: JSON.stringify(newData),
    status: "Pending"
  };

    try {
      const res = await fetch("http://localhost:5050/api/requests", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        alert("🚀 Yêu cầu thay đổi thông tin quán đã được gửi tới Admin!");
        setEditingStall(null);
        fetchStalls();
      }
    } catch (err) {
      console.error("Lỗi gửi yêu cầu:", err);
    }
  };

   // ==========================================
  // RENDER CÁC MÀN HÌNH THEO TRẠNG THÁI (APP STATE)
  // ==========================================

  // MÀN HÌNH 1: LOADING
 

  // MÀN HÌNH 2: ĐĂNG KÝ HOẶC NHẬN QUÁN (HỢP NHẤT 2 CỘT)
  if (appState === "unregistered" || appState === "rejected") {
      return (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f1f5f9", padding: "20px" }}>
              <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)", width: "100%", maxWidth: "1100px" }}>
                  
                  <div style={{ textAlign: "center", marginBottom: "32px" }}>
                      <Store size={48} color="#4f46e5" style={{ margin: "0 auto 16px" }} />
                      <h2 style={{ fontSize: "28px", color: "#1e293b", fontWeight: "bold" }}>Bắt Đầu Kinh Doanh</h2>
                      <p style={{ color: "#64748b", marginTop: "8px", fontSize: "16px" }}>
                          {appState === "rejected" 
                            ? <span style={{color: "#ef4444", fontWeight: "600"}}>Yêu cầu trước đó bị từ chối. Vui lòng kiểm tra lại thông tin!</span> 
                            : "Chọn một quán có sẵn trên bản đồ hoặc tạo mới quán của riêng bạn."}
                      </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "40px" }}>
                      
                      {/* CỘT TRÁI: DANH SÁCH QUÁN MỒI */}
                      <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: "30px" }}>
                          <h3 style={{ fontSize: "18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "#334155" }}>
                              <MapPin size={20} color="#4f46e5"/> Quán có sẵn trên hệ thống
                          </h3>
                          <div style={{ maxHeight: "500px", overflowY: "auto", paddingRight: "10px" }}>
                              {Array.isArray(unclaimedStalls) && unclaimedStalls.length > 0 ? (
                                  unclaimedStalls.map((s) => (
                                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderBottom: "1px solid #f1f5f9", borderRadius: "8px", marginBottom: "10px", backgroundColor: "#f8fafc", transition: "transform 0.2s" }}>
                                         <img 
                                            src={s.imageUrl ? `http://localhost:5050${s.imageUrl}` : "https://via.placeholder.com/55"} 
                                            style={{ width: "55px", height: "55px", borderRadius: "8px", objectFit: "cover" }} 
                                            alt="" 
                                            onError={(e) => { e.target.src = "https://via.placeholder.com/55"; }}
                                        />
                                          <div style={{ flex: 1 }}>
                                              <p style={{ margin: 0, fontWeight: "bold", fontSize: "15px", color: "#1e293b" }}>{s.stallName}</p>
                                              <small style={{ color: "#64748b" }}>{s.categoryName || "Chưa phân loại"}</small>
                                          </div>
                                          <button 
                                              onClick={() => handleClaim(s)} 
                                              style={{ padding: "8px 16px", cursor: "pointer", borderRadius: "6px", border: "none", color: "white", backgroundColor: "#4f46e5", fontSize: "13px", fontWeight: "600", transition: "background 0.2s" }}
                                              onMouseOver={(e) => e.target.style.backgroundColor = "#4338ca"}
                                              onMouseOut={(e) => e.target.style.backgroundColor = "#4f46e5"}
                                          >
                                              Nhận
                                          </button>
                                      </div>
                                  ))
                              ) : (
                                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                                      <p>Hiện chưa có địa điểm sẵn có nào.</p>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* CỘT PHẢI: FORM ĐĂNG KÝ MỚI (GIỮ NGUYÊN LOGIC CỦA BẠN) */}
                      <div>
                          <h3 style={{ fontSize: "18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "#334155" }}>
                              <PlusCircle size={20} color="#10b981"/> Đăng ký quán mới hoàn toàn
                          </h3>
                          <form onSubmit={handleRegisterStall}>
                              <div style={{ marginBottom: "16px" }}>
                                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Tên Quán *</label>
                                  <input 
                                      type="text" required placeholder="Nhập tên quán..." 
                                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                                      value={regForm.stallName} onChange={(e) => setRegForm({...regForm, stallName: e.target.value})}
                                  />
                              </div>

                              <div style={{ marginBottom: "16px" }}>
                                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Danh Mục *</label>
                                  <select 
                                      required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white" }}
                                      value={regForm.categoriesId} onChange={(e) => setRegForm({...regForm, categoriesId: e.target.value})}
                                  >
                                      <option value="">-- Chọn danh mục --</option>
                                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                              </div>

                              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                                  <div style={{ flex: 1 }}>
                                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Vĩ độ *</label>
                                      <input type="number" step="any" required placeholder="" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }} value={regForm.latitude} onChange={(e) => setRegForm({...regForm, latitude: e.target.value})} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Kinh độ *</label>
                                      <input type="number" step="any" required placeholder="" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }} value={regForm.longitude} onChange={(e) => setRegForm({...regForm, longitude: e.target.value})} />
                                  </div>
                              </div>
                              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                              <div style={{ flex: 1 }}>
                                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Khoảng giá</label>
                                      <input 
                                          type="text" placeholder="VD: 30,000 - 50,000 VNĐ" 
                                          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }} 
                                          value={regForm.priceRange} onChange={(e) => setRegForm({...regForm, priceRange: e.target.value})} 
                                      />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Giờ mở cửa</label>
                                      <input 
                                          type="text" placeholder="VD: 08:00 - 22:00" 
                                          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }} 
                                          value={regForm.openingHours} onChange={(e) => setRegForm({...regForm, openingHours: e.target.value})} 
                                      />
                                  </div>
                              </div>

                              <div style={{ marginBottom: "16px" }}>
                                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Mô tả quán</label>
                                  <textarea 
                                      placeholder="Giới thiệu về quán..." rows="3"
                                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", resize: "vertical" }}
                                      value={regForm.description} onChange={(e) => setRegForm({...regForm, description: e.target.value})}
                                  />
                              </div>
                              <div style={{ marginBottom: "20px" }}>
                                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Hình ảnh quán *</label>
                                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "register")} style={{ marginBottom: "10px", width: "100%" }} />
                                  {regForm.imagePreview && (
                                      <div style={{ position: "relative" }}>
                                          <img src={regForm.imagePreview} alt="Preview" style={{ width: "100%", borderRadius: "8px", height: "120px", objectFit: "cover", border: "1px solid #e2e8f0" }} />
                                      </div>
                                  )}
                              </div>

                              <button type="submit" style={{ width: "100%", padding: "14px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "16px", boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)" }}>
                                  Gửi Yêu Cầu Phê Duyệt
                              </button>
                          </form>
                      </div>
                  </div>

                  <div style={{ textAlign: "center", marginTop: "30px", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                      <button onClick={handleLogout} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}>
                          Sử dụng tài khoản khác? Đăng xuất
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // MÀN HÌNH 3: CHỜ ADMIN DUYỆT
  if (appState === "pending") {
      return (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f8fafc" }}>
              <div style={{ textAlign: "center", backgroundColor: "white", padding: "50px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", maxWidth: "500px" }}>
                  <Clock size={70} color="#f59e0b" style={{ margin: "0 auto 24px", animation: "pulse 2s infinite" }} />
                  <h2 style={{ fontSize: "26px", color: "#1e293b", fontWeight: "bold", marginBottom: "12px" }}>Đang Chờ Phê Duyệt</h2>
                  <p style={{ color: "#64748b", lineHeight: "1.7", marginBottom: "30px", fontSize: "16px" }}>
                      Yêu cầu đăng ký quán <b>{activeStall?.stallName || "của bạn"}</b> đang được Admin xem xét. Hệ thống sẽ tự động chuyển trang khi hoàn tất.
                  </p>
                  <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                      <button onClick={fetchStalls} style={{ padding: "12px 24px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Kiểm tra ngay</button>
                      <button onClick={handleLogout} style={{ padding: "12px 24px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Đăng xuất</button>
                  </div>
              </div>
          </div>
      );
  }

  // MÀN HÌNH 4: THÔNG BÁO DUYỆT THÀNH CÔNG (BÁO CÔNG)
  if (appState === "approved_notify") {
      return (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#ecfdf5" }}>
              <div style={{ textAlign: "center", backgroundColor: "white", padding: "60px", borderRadius: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.1)", maxWidth: "550px" }}>
                  <CheckCircle size={90} color="#10b981" style={{ marginBottom: "25px", animation: "bounce 1s ease" }} />
                  <h2 style={{ color: "#065f46", fontSize: "32px", fontWeight: "bold", marginBottom: "15px" }}>Tuyệt Vời!</h2>
                  <p style={{ fontSize: "18px", color: "#374151", lineHeight: "1.6" }}>
                      Chúc mừng! Quán <b>{activeStall?.stallName}</b> đã được phê duyệt thành công. Bạn đã có thể bắt đầu quản lý nội dung và âm thanh.
                  </p>
                  <button 
                      onClick={() => setAppState("approved")} 
                      style={{ marginTop: "35px", padding: "15px 40px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "18px", boxShadow: "0 10px 20px rgba(16, 185, 129, 0.3)" }}
                  >
                      Bắt đầu quản lý ngay
                  </button>
              </div>
          </div>
      );
  }

  // TIẾP THEO LÀ PHẦN RENDER DASHBOARD CHÍNH CỦA BẠN (return <div className="seller-container">...)
  // MÀN HÌNH 5: APPROVED - HIỂN THỊ DASHBOARD CHÍNH THỨC
  const renderTabContent = () => {
    switch (activeTab) {
      case "my-shop":
        return (
          <>
            <div className="seller-table">
              <div className="seller-table-header">
                <div>HÌNH ẢNH</div> 
                <div>ĐỊA ĐIỂM</div>
                <div>DANH MỤC</div>
                <div>TỌA ĐỘ</div>
                
                <div>TRẠNG THÁI</div>
                <div>HÀNH ĐỘNG</div>
              </div>

              {stalls.length > 0 ? (
                stalls.map((stall) => (
                  <div key={stall.id} className={`seller-table-row ${activeStall?.id === stall.id ? "active-row" : ""}`}>
                    <div className="seller-stall-image">
  <img 
    /* 1. Đổi stall.image thành stall.image_url 
       2. Thêm BASE_URL nếu bạn lưu ảnh ở local backend */
   src={
  stall.image_url?.startsWith("data:")
    ? stall.image_url
    : `http://localhost:5050${stall.image_url || stall.imageUrl}`
}
    
    /* 3. Đổi stall.stallName thành stall.name cho đúng mapping */
    alt={stall.name || "Stall image"}
    
    style={{ 
      width: "50px", 
      height: "50px", 
      objectFit: "cover", 
      borderRadius: "4px",
      border: "1px solid #e2e8f0" // Thêm viền nhẹ cho đẹp giống UI mẫu
    }}
    
    /* Thêm xử lý khi ảnh bị lỗi link */
    onError={(e) => { e.target.src = "https://via.placeholder.com/50"; }}
  />
</div>
                    <div className="seller-stall-name">{stall.stallName}</div>
                    <div><span className="seller-badge seller-badge-purple">{stall.categoryName || "N/A"}</span></div>
                    <div>{stall.latitude ? Number(stall.latitude).toFixed(6) : 0}, {stall.longitude ? Number(stall.longitude).toFixed(6) : 0}</div>
                    
                    <div>
                     <span className={`seller-badge ${
  stall.status === "Open" || stall.status === "Active" 
    ? "seller-badge-green" 
    : "seller-badge-purple"
}`}>
  {stall.status === "Open" || stall.status === "Active" ? "Hoạt động" : 
   stall.status === "Closed" ? "Đóng cửa" :
   stall.status === "Pending" ? "Chờ duyệt" : stall.status}
</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="seller-action-btn" onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(stall);
                      }}>
                        <Edit2 size={16}/>
                      </button> 
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>Chưa có dữ liệu quán ăn.</div>
              )}
            </div>
          </>
        );
      case "audio":
       return <SellerAudioManager />;
       case "translate":
      return <SellerTranslationManager activeStall={activeStall} />;
    }
  };

  return (
    <div className="seller-container">
      {/* SIDEBAR */}
      <aside className={`seller-sidebar ${!sidebarOpen ? "seller-hidden" : ""}`}>
        <div className="seller-logo">
          <div className="seller-logo-icon"><Store size={20} /></div>
          <div>
            <div className="seller-logo-title">Owner Portal</div>
            <div className="seller-logo-subtitle">STREET FOOD</div>
          </div>
        </div>
        <nav className="seller-nav">
          <button className={`seller-nav-button ${activeTab === "my-shop" ? "seller-active" : ""}`} onClick={() => handleTabChange("my-shop")}>
            <Store size={18} /> Quán của tôi
          </button>
          <button className={`seller-nav-button ${activeTab === "audio" ? "seller-active" : ""}`} onClick={() => handleTabChange("audio")}>
            <Headphones size={18} /> Audio 
          </button>
          <button className={`seller-nav-button ${activeTab === "translate" ? "seller-active" : ""}`} onClick={() => handleTabChange("translate")}>
            <Languages size={18} /> Bản dịch
          </button>
        </nav>
        <button className="seller-nav-button seller-logout-btn" onClick={handleLogout}>
            Đăng xuất
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div className={`seller-main ${!sidebarOpen ? "seller-full" : ""}`}>
        <header className="seller-header">
            <button className="seller-action-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={18} />
            </button>
            <div className="seller-user-info">
              <div className="seller-avatar"><User size={18} /></div>
              <div style={{marginLeft: "8px"}}>
                <div className="seller-user-name" style={{ fontWeight: "bold", fontSize: "14px" }}>
                  Chủ quán - {activeStall?.stallName || stalls[0]?.stallName || ""}
                </div>
              </div>
            </div>
        </header>

        <div className="seller-page">
          <h1 className="seller-title">{activeTab === "my-shop" ? "Quản lý Quán" : "Tính năng"}</h1>
          {renderTabContent()}
        </div>

        {/* MODAL CẬP NHẬT (SAU KHI ĐÃ ĐƯỢC DUYỆT) */}
        {editingStall && (
          <div className="seller-modal-overlay">
            {/* Trong Modal Cập nhật */}
            <div className="form-group" style={{ marginTop: "15px" }}>
  <label className="seller-label">HÌNH ẢNH ĐẠI DIỆN QUÁN</label>

  <div style={{ 
    border: "2px dashed #cbd5e1", 
    padding: "10px", 
    borderRadius: "8px", 
    textAlign: "center",
    backgroundColor: "#f8fafc" 
  }}>
    
    {/* PREVIEW ẢNH */}
    {(formData.imagePreview || editingStall?.imageUrl) ? (
      <img 
        src={
          formData.imagePreview 
            ? formData.imagePreview // ảnh mới chọn (base64)
            : `http://localhost:5050${editingStall.imageUrl}` // ảnh từ server
        }
        alt="Preview"
        style={{ 
          width: "100%", 
          maxHeight: "200px", 
          objectFit: "cover", 
          borderRadius: "6px", 
          marginBottom: "10px" 
        }}
        onError={(e) => {
          e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
        }}
      />
    ) : (
      <div style={{ padding: "20px", color: "#64748b" }}>
        Chưa có ảnh
      </div>
    )}

    {/* INPUT FILE */}
    <input 
      type="file" 
      id="file-upload"
      hidden
      accept="image/*" 
      onChange={(e) => handleFileChange(e, "edit")} 
    />

    <label 
      htmlFor="file-upload" 
      style={{ 
        display: "inline-block", 
        padding: "8px 16px", 
        backgroundColor: "#4f46e5", 
        color: "white", 
        borderRadius: "4px", 
        cursor: "pointer",
        fontSize: "13px"
      }}
    >
      Thay đổi ảnh
    </label>
  </div>
</div>
            <div className="seller-modal">
              <h2>Cập nhật {editingStall.stallName || `Quán #${editingStall.id}`}</h2>
              
              <div className="form-group">
                <label className="seller-label">TRẠNG THÁI CỬA HÀNG (DÀNH CHO KHÁCH)</label>
                <select
  value={formData.status}
  onChange={(e) =>
    setFormData({ ...formData, status: e.target.value })
  }
>
  <option value="Active">🟢 Đang hoạt động (Mở cửa)</option>
  <option value="Closed">🔴 Tạm đóng cửa</option>
</select>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                 
                </p>
              </div>

              <div className="form-group">
                <label className="seller-label">DANH MỤC QUÁN</label>
                <select
                  className="seller-select"
                  value={String(formData.categoriesId || "")}
                  onChange={(e) => setFormData({ ...formData, categoriesId: e.target.value ? parseInt(e.target.value) : "" })}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>

             <div className="form-group">
  <label className="seller-label">TÊN QUÁN</label>
  <input
    type="text"
    className="seller-input" // Sử dụng class CSS chung của bạn
    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
    value={formData.stallName}
    onChange={(e) => setFormData({ ...formData, stallName: e.target.value })}
  />
</div>
{/* HÀNG 1: TỌA ĐỘ */}
<div className="form-row">
  <div className="form-group">
    <label className="seller-label">VĨ ĐỘ (LATITUDE)</label>
    <input
      type="number"
      step="0.000001"
      className="seller-input"
      value={formData.latitude ? Number(formData.latitude).toFixed(6) : ""}
      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
    />
  </div>
  <div className="form-group">
    <label className="seller-label">KINH ĐỘ (LONGITUDE)</label>
    <input
      type="number"
      step="any"
      className="seller-input"
      value={formData.longitude ? Number(formData.longitude).toFixed(6) : ""}
      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
    />
  </div>
</div>

{/* HÀNG 2: GIÁ & GIỜ MỞ CỬA */}
<div className="form-row" style={{ marginTop: "15px" }}>
  <div className="form-group">
    <label className="seller-label">KHOẢNG GIÁ</label>
    <input
      type="text"
      className="seller-input"
      placeholder="VD: 30.000 - 100.000đ"
      value={formData.priceRange || ""}
      onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
    />
  </div>
  <div className="form-group">
    <label className="seller-label">GIỜ MỞ CỬA</label>
    <input
      type="text"
      className="seller-input"
      placeholder="VD: 08:00 - 22:00"
      value={formData.openingHours || ""}
      onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
    />
  </div>
</div>
<div className="form-group">
  <label className="seller-label">HÌNH ẢNH MỚI (NẾU CẦN ĐỔI)</label>
  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "edit")} />
  {formData.imagePreview ? (
    <img src={formData.imagePreview} alt="New" style={{ width: "100px", marginTop: "10px", borderRadius: "4px" }} />
  ) : (
    editingStall.image && <img src={editingStall.image} alt="Current" style={{ width: "100px", marginTop: "10px", opacity: 0.6 }} />
  )}
</div>

{/* BỔ SUNG: MÔ TẢ QUÁN */}
<div className="form-group" style={{ marginTop: "15px" }}>
  <label className="seller-label">MÔ TẢ CHI TIẾT</label>
  <textarea
    className="seller-input"
    rows="3"
    placeholder="Nhập mô tả về quán của bạn..."
    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "none" }}
    value={formData.description || ""}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
  />
</div>
<p style={{ fontSize: "12px", color: "#f59e0b", marginTop: "8px", fontWeight: "500" }}>
  ⚠️ Chú ý: Việc thay đổi tên hoặc vị trí sẽ cần Admin phê duyệt lại trước khi hiển thị trên bản đồ.
</p>

              <div className="seller-modal-actions">
                <button
                  className="seller-btn seller-btn-outline"
                  onClick={() => setEditingStall(null)}
                >
                  Hủy
                </button>
                <button
                  className="seller-btn seller-btn-primary"
                  onClick={handleUpdate}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;