import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserManager from "./UserManager";
import PoiManager from "./PoiManager";
import AudioManager from "./AudioManager";
import TranslationManager from "./TranslationManager";
import HistoryManager from "./HistoryManager";
import TourManager from "./TourManager";
import PendingRequest from "./PendingRequest";
import "../css/AdminDashboard.css";

function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState(sessionStorage.getItem("activeTab") || "overview");
  const navigate = useNavigate();
  const userName = sessionStorage.getItem("userName");
  const token = sessionStorage.getItem("token");

  
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
 fetch("http://localhost:6050/api/admin/overview", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(res => res.json())
      .then(data => setOverview(data))
      .catch(() => console.log("Lỗi tải dữ liệu"));
  }, [navigate, token]);
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const menuItems = [
    { id: "overview", label: "Tổng quan", icon: "📊" },
    { id: "users", label: "Người dùng", icon: "👥" },
    { id: "requests", label: "Duyệt yêu cầu", icon: "🛡️" },
    { id: "poi", label: "POI", icon: "📍" },
    { id: "audio", label: "Audio", icon: "🎧" },
    { id: "translation", label: "Bản dịch", icon: "🌐" },
    { id: "history", label: "Lịch sử", icon: "📜" },
    { id: "tour", label: "Tour", icon: "🗺️" }
  ];

  const renderContent = () => {
  if (activeTab === "overview") {
    return (
      <div className="content-wrapper">
        <div className="content-header">
          <h1 className="page-title">📊 Tổng quan hệ thống</h1>
          <div className="date-display">{new Date().toLocaleDateString()}</div>
        </div>

        {overview && (
          <div className="stats-grid">
            <div className="stat-card users">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h3>User</h3>
                <div className="stat-number">{overview.totalUsers}</div>
                <div className="stat-label">Tổng người dùng</div>
              </div>
            </div>

            <div className="stat-card poi">
              <div className="stat-icon">📍</div>
              <div className="stat-info">
                <h3>POI</h3>
                <div className="stat-number">{overview.totalPoi}</div>
                <div className="stat-label">Địa điểm</div>
              </div>
            </div>

            <div className="stat-card audio">
              <div className="stat-icon">🎧</div>
              <div className="stat-info">
                <h3>Audio</h3>
                <div className="stat-number">{overview.totalAudio}</div>
                <div className="stat-label">Audio guide</div>
              </div>
            </div>

            <div className="stat-card tours">
              <div className="stat-icon">🗺️</div>
              <div className="stat-info">
                <h3>Tour</h3>
                <div className="stat-number">{overview.totalTours}</div>
                <div className="stat-label">Tour du lịch</div>
              </div>
            </div>

            <div className="stat-card translation">
              <div className="stat-icon">🌐</div>
              <div className="stat-info">
                <h3>Translation</h3>
                <div className="stat-number">{overview.totalTranslations}</div>
                <div className="stat-label">Bản dịch</div>
              </div>
            </div>

            <div className="stat-card history">
              <div className="stat-icon">📜</div>
              <div className="stat-info">
                <h3>History</h3>
                <div className="stat-number">{overview.totalHistory}</div>
                <div className="stat-label">Lịch sử</div>
              </div>
            </div>

            {/* Đưa card Pending ra ngoài, không lồng vào history nữa */}
            <div className="stat-card requests" onClick={() => setActiveTab("requests")} style={{ cursor: 'pointer' }}>
              <div className="stat-icon">🛡️</div>
              <div className="stat-info">
                <h3>Pending</h3>
                <div className="stat-number" style={{ color: overview.pendingRequests > 0 ? 'red' : 'inherit' }}>
                  {overview.pendingRequests}
                </div>
                <div className="stat-label">Yêu cầu chờ duyệt</div>
              </div>
            </div>

          </div> // Kết thúc stats-grid
        )}
      </div> // Kết thúc content-wrapper
    );
  }

  // Các tabs khác giữ nguyên
  if (activeTab === "requests") return <PendingRequest/>;
  if (activeTab === "users") return <UserManager />;
  if (activeTab === "poi") return <PoiManager />;
  if (activeTab === "audio") return <AudioManager />;
  if (activeTab === "translation") return <TranslationManager />;
  if (activeTab === "history") return <HistoryManager />;
  if (activeTab === "tour") return <TourManager />;
};

  return (
    <div className="admin-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="cms-title">👑 Xin chào, {userName}</div>
        </div>
        <div className="sidebar-menu">
          {menuItems.map(item => {
            const hasPending = item.id === 'requests' && overview?.pendingRequests > 0;
            return (
              <div
                key={item.id}
                className={`menu-item ${activeTab === item.id ? "active" : ""} ${hasPending ? "has-pending-sidebar" : ""}`}
                onClick={() => {
                  setActiveTab(item.id);
                  sessionStorage.setItem("activeTab", item.id);
                }}
              >
                <span className="menu-icon">{item.icon}</span>
                {item.label}
                {hasPending && <span className="sidebar-badge">{overview.pendingRequests}</span>}
              </div>
            );
          })}
        </div>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </div>

      <div className="main-content">
        <div className="page-content">
          {renderContent()}
        </div>
      </div>

      {/* CHUÔNG THÔNG BÁO NỔI */}
    
    </div>
  );
}

export default AdminDashboard;
