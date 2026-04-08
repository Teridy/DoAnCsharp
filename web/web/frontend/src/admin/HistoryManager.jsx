import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../css/HistoryManager.css";

// Component xử lý leaflet.heat
const HeatmapLayer = ({ points }) => {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return;

        // Dynamic import leaflet.heat
        import("leaflet.heat").then(() => {
            const heatData = points.map(p => [p.lat, p.lng, p.weight]);
            const heat = window.L.heatLayer(heatData, {
                radius: 35,
                blur: 25,
                maxZoom: 17,
                gradient: {
                    0.2: "blue",
                    0.4: "cyan",
                    0.6: "lime",
                    0.8: "orange",
                    1.0: "red"
                }
            }).addTo(map);

            return () => map.removeLayer(heat);
        });
    }, [points, map]);

    return null;
};

function HistoryManager() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [heatmapData, setHeatmapData] = useState([]);

    const token = sessionStorage.getItem("token");

    const loadHistory = async () => {
        try {
            const res = await fetch("http://localhost:5050/api/History", {
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setHistory(data);
        } catch {
            console.log("Lỗi tải history");
        }
    };
    const ITEMS_PER_PAGE = 10;

// Thêm state này vào component
const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

const visibleHistory = history.slice(0, visibleCount);
const hasMore = visibleCount < history.length;

const handleLoadMore = () => {
  setVisibleCount(prev => prev + ITEMS_PER_PAGE);
};
    const loadStats = async () => {
        try {
            const res = await fetch("http://localhost:5050/api/History/stats", {
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) {
                setStats({ total: 0, today: 0, topPois: [] });
                return;
            }
            const data = await res.json();
            setStats({
                total: data.total || 0,
                today: data.today || 0,
                topPois: data.topPois || []
            });
        } catch {
            setStats({ total: 0, today: 0, topPois: [] });
        }
    };

    const loadHeatmap = async () => {
        try {
            const res = await fetch("http://localhost:5050/api/History/heatmap", {
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) return;
            const data = await res.json();
            setHeatmapData(data);
        } catch {
            console.log("Lỗi tải heatmap");
        }
    };

    useEffect(() => {
        loadHistory();
        loadStats();
        loadHeatmap();
    }, []);

    const formatDate = (date) => new Date(date).toLocaleString();

    // Tính center map từ data
    const mapCenter = heatmapData.length > 0
        ? [heatmapData[0].lat, heatmapData[0].lng]
        : [10.762, 106.703]; // fallback: HCM

    return (
        <div className="history-container">
            <div className="history-header">📜 Lịch sử người dùng</div>

          {stats && (
  <div className="history-stats">
    <div className="stat-card">
      <div className="stat-icon blue">📊</div>
      <div className="stat-info">
        <h3>Tổng lượt truy cập</h3>
        <p>{stats.total}</p>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-icon green">📅</div>
      <div className="stat-info">
        <h3>Hôm nay</h3>
        <p>{stats.today}</p>
      </div>
    </div>
  </div>
)}

           {stats?.topPois?.length > 0 && (
  <div className="chart-card">
    <h3>🏆 Top địa điểm được ghé thăm</h3>
    <div className="top-poi-list">
      {stats.topPois.map((p, i) => {
        const maxCount = stats.topPois[0].count;
        const rankClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
        return (
          <div key={p.poi} className="top-poi-item">
            <div className={`poi-rank ${rankClass}`}>{i + 1}</div>
            <span className="poi-name">POI {p.poi}</span>
            <div className="poi-bar-wrap">
              <div className="poi-bar" style={{ width: `${(p.count / maxCount) * 100}%` }} />
            </div>
            <span className="poi-count">{p.count}</span>
          </div>
        );
      })}
    </div>
  </div>
)}

            {/* ✅ HEATMAP */}
            <div className="chart-card" style={{ marginTop: "24px" }}>
                <h3>🔥 Heatmap tương tác</h3>
                <div style={{ height: "450px", borderRadius: "12px", overflow: "hidden" }}>
                    <MapContainer
                        center={mapCenter}
                        zoom={15}
                        style={{ height: "100%", width: "100%" }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap"
                        />
                        <HeatmapLayer points={heatmapData} />

                        {/* Markers POI */}
                        {heatmapData.map((p, i) => (
                            <CircleMarker
                                key={i}
                                center={[p.lat, p.lng]}
                                radius={6}
                                fillColor="#ff4444"
                                color="white"
                                weight={2}
                                fillOpacity={0.9}
                            >
                                <Tooltip permanent={false} direction="top">
                                    <b>{p.name}</b><br />
                                    {p.weight} lượt ghé thăm
                                </Tooltip>
                            </CircleMarker>
                        ))}
                    </MapContainer>
                </div>

                {/* Legend */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    marginTop: "12px", fontSize: "13px", color: "#64748b"
                }}>
                    <span>Ít</span>
                    <div style={{
                        width: "200px", height: "12px", borderRadius: "6px",
                        background: "linear-gradient(to right, blue, cyan, lime, orange, red)"
                    }} />
                    <span>Nhiều</span>
                </div>
            </div>

            {/* Timeline */}
           <div className="chart-card">
  <h3>📋 Lịch sử hoạt động</h3>
  <div className="history-timeline">
    {visibleHistory.map(h => {
      const badgeClass = `badge-${h.event_type || 'default'}`;
      return (
        <div className="timeline-item" key={h.id}>
          <span className={`timeline-event-badge ${badgeClass}`}>
            {h.event_type || 'unknown'}
          </span>
          <div className="timeline-info">
            <span>👤 <b>User {h.users_id}</b></span>
            <span>📍 <b>POI {h.narrationPointId}</b></span>
            <span>📱 <b>{h.device_os || 'N/A'}</b></span>
            <span>🖥 <b>{h.device_model || 'N/A'}</b></span>
          </div>
          <span className="timeline-time">
            {new Date(h.created_at).toLocaleString('vi-VN')}
          </span>
        </div>
      );
    })}
  </div>

  {hasMore && (
    <div style={{ textAlign: 'center', marginTop: '16px' }}>
      <button
        onClick={handleLoadMore}
        style={{
          padding: '8px 24px',
          borderRadius: '8px',
          border: '1px solid #6366f1',
          background: 'white',
          color: '#6366f1',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Xem thêm ({history.length - visibleCount} mục còn lại)
      </button>
    </div>
  )}
</div>
        </div>
    );
}

export default HistoryManager;