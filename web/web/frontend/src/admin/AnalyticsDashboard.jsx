import { API_BASE } from "../config";
import { useEffect, useState, useRef } from "react";
import styles from "../css/AnalyticsDashboard.module.css";

// ── Mini bar chart (pure CSS, no library) ──
function BarChart({ data }) {
  if (!data || data.length === 0) return <div className={styles.emptyChart}>Chưa có dữ liệu</div>;
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className={styles.barChart}>
      {data.map((item, i) => (
        <div className={styles.barGroup} key={i}>
          <div className={styles.barContainer}>
            <div
              className={styles.bar}
              style={{ height: `${(item.count / maxCount) * 100}%` }}
              title={`${item.count} lượt`}
            >
              <span className={styles.barValue}>{item.count}</span>
            </div>
          </div>
          <span className={styles.barLabel}>{item.date}</span>
        </div>
      ))}
    </div>
  );
}

// ── Donut chart (SVG) ──
function DonutChart({ data }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors = ["#6a5af9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];
  let cumulative = 0;

  return (
    <div className={styles.donutWrapper}>
      <svg viewBox="0 0 42 42" className={styles.donutSvg}>
        <circle cx="21" cy="21" r="15.91549" fill="transparent" stroke="#f0f0f0" strokeWidth="4" />
        {data.map((item, i) => {
          const pct = (item.count / total) * 100;
          const offset = 100 - cumulative + 25;
          cumulative += pct;
          return (
            <circle
              key={i}
              cx="21" cy="21" r="15.91549"
              fill="transparent"
              stroke={colors[i % colors.length]}
              strokeWidth="4"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          );
        })}
        <text x="21" y="22" textAnchor="middle" fontSize="6" fontWeight="700" fill="#1e293b">{total}</text>
        <text x="21" y="27" textAnchor="middle" fontSize="3" fill="#94a3b8">tổng</text>
      </svg>
      <div className={styles.donutLegend}>
        {data.map((item, i) => (
          <div key={i} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: colors[i % colors.length] }} />
            <span className={styles.legendLabel}>{item.device || "Khác"}</span>
            <span className={styles.legendCount}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Real-time Heatmap (Leaflet) ──
function LiveHeatmap({ positions, activeCount }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    // Khởi tạo bản đồ (chỉ chạy 1 lần)
    const L = window.L;
    if (!L) return;
    mapInstance.current = L.map(mapRef.current).setView([10.7619, 106.7020], 17);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19
    }).addTo(mapInstance.current);
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current) return;

    // Xóa marker cũ
    markersRef.current.forEach(m => mapInstance.current.removeLayer(m));
    markersRef.current = [];

    // Vẽ marker mới cho mỗi user đang online
    if (positions && positions.length > 0) {
      positions.forEach((pos, i) => {
        const marker = L.circleMarker([pos.lat, pos.lng], {
          radius: 12,
          fillColor: "#00E5FF",
          color: "#fff",
          weight: 2,
          fillOpacity: 0.8
        }).addTo(mapInstance.current);
        marker.bindTooltip(`👤 Du khách #${i + 1}`, { direction: "top" });
        markersRef.current.push(marker);
      });
    }
  }, [positions]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mapRef} style={{ width: "100%", height: "400px", borderRadius: "12px", border: "2px solid #e2e8f0" }} />
      <div style={{
        position: "absolute", top: "10px", right: "10px", zIndex: 1000,
        background: activeCount > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "#94a3b8",
        color: "white", padding: "8px 16px", borderRadius: "20px",
        fontWeight: "800", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
      }}>
        🟢 {activeCount} người đang online
      </div>
      {(!positions || positions.length === 0) && activeCount > 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000,
          background: "rgba(255,255,255,0.95)", padding: "20px 30px", borderRadius: "12px",
          textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>📱</div>
          <p style={{ margin: 0, fontWeight: "700", color: "#10b981" }}>{activeCount} người đang online</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>Đang chờ dữ liệu GPS từ thiết bị...</p>
        </div>
      )}
      {(!positions || positions.length === 0) && activeCount === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000,
          background: "rgba(255,255,255,0.9)", padding: "20px 30px", borderRadius: "12px",
          textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>📍</div>
          <p style={{ margin: 0, fontWeight: "700", color: "#64748b" }}>Chưa có du khách đang online</p>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem("token");

  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [userPositions, setUserPositions] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, oRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/analytics`, { headers: { Authorization: "Bearer " + token } }),
        fetch(`${API_BASE}/api/admin/overview`, { headers: { Authorization: "Bearer " + token } })
      ]);
      const [aData, oData] = await Promise.all([aRes.json(), oRes.json()]);
      setAnalytics(aData);
      setOverview(oData);
    } catch (err) {
      console.error("Lỗi tải analytics:", err);
    }
    setLoading(false);
  };

  const loadActiveUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/active-users`, { headers: { Authorization: "Bearer " + token } });
      const data = await res.json();
      setActiveUsersCount(data.activeCount || 0);
      setUserPositions(data.positions || []);
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => { 
    loadData(); 
    loadActiveUsers();
    const interval = setInterval(loadActiveUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className={styles.loadingState}>
      <div className={styles.spinner} />
      <span>Đang tải dữ liệu...</span>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📈 Analytics Dashboard</h1>
          <p className={styles.subtitle}>Thống kê lượt truy cập hệ thống</p>
        </div>
        <button onClick={loadData} className={styles.refreshBtn}>🔄 Refresh</button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.cardActive}`} style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}>
          <div className={styles.cardIcon}>🟢</div>
          <div className={styles.cardBody}>
            <h3>Đang Online</h3>
            <div className={styles.cardNumber}>{activeUsersCount}</div>
            <span className={styles.cardLabel} style={{color: "rgba(255,255,255,0.8)"}}>Người dùng trực tiếp</span>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.cardToday}`}>
          <div className={styles.cardIcon}>📊</div>
          <div className={styles.cardBody}>
            <h3>Hôm nay</h3>
            <div className={styles.cardNumber}>{overview?.visitorsToday ?? 0}</div>
            <span className={styles.cardLabel}>lượt truy cập</span>
          </div>
        </div>


        <div className={`${styles.summaryCard} ${styles.cardTotal}`}>
          <div className={styles.cardIcon}>🌍</div>
          <div className={styles.cardBody}>
            <h3>Tổng cộng</h3>
            <div className={styles.cardNumber}>{overview?.visitorsTotal ?? 0}</div>
            <span className={styles.cardLabel}>mọi thời điểm</span>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.cardUsers}`}>
          <div className={styles.cardIcon}>👥</div>
          <div className={styles.cardBody}>
            <h3>Người dùng</h3>
            <div className={styles.cardNumber}>{overview?.totalUsers ?? 0}</div>
            <span className={styles.cardLabel}>tài khoản</span>
          </div>
        </div>
      </div>

      {/* 🔥 HEATMAP REAL-TIME — Vị trí du khách đang đứng */}
      <div className={styles.chartPanel} style={{ marginBottom: "24px" }}>
        <h2 className={styles.panelTitle}>🗺️ Heatmap Real-time — Du khách đang ở đâu?</h2>
        <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "12px" }}>
          Cập nhật mỗi 5 giây • Mỗi chấm xanh = 1 du khách đang online
        </p>
        <LiveHeatmap positions={userPositions} activeCount={activeUsersCount} />
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>

        {/* Donut Chart */}
        <div className={styles.chartPanel}>
          <h2 className={styles.panelTitle}>📱 Phân loại thiết bị</h2>
          <DonutChart data={analytics?.devices} />
        </div>
      </div>

      {/* Recent Visits Table */}
      <div className={styles.tablePanel}>
        <h2 className={styles.panelTitle}>🕐 Lượt truy cập gần nhất</h2>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Thiết bị</th>
                <th>Trang</th>
                <th>IP</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.recentVisits?.length > 0 ? (
                analytics.recentVisits.map((v, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <span className={`${styles.deviceBadge} ${v.deviceType === "Mobile" ? styles.badgeMobile : styles.badgeDesktop}`}>
                        {v.deviceType === "Mobile" ? "📱" : "💻"} {v.deviceType}
                      </span>
                    </td>
                    <td><code className={styles.pagePath}>{v.pageVisited}</code></td>
                    <td className={styles.ipCell}>{v.ipAddress}</td>
                    <td className={styles.timeCell}>{new Date(v.createdAt).toLocaleString("vi-VN")}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className={styles.emptyRow}>Chưa có dữ liệu truy cập</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
