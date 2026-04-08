import { useEffect, useState } from "react";
import "../css/TourManager.css";

function TourManager() {
  const [tours, setTours] = useState([]);
  const [pois, setPois] = useState([]);
  const [selectedPois, setSelectedPois] = useState([]);

  const [error, setError] = useState("");
  const [viewTour, setViewTour] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // 🔥 Thêm state để nhận biết đang tạo mới hay đang sửa
  const [editingTourId, setEditingTourId] = useState(null); 

  const [newTour, setNewTour] = useState({
    name: "",
    description: "",
    duration: "",
    status: "Active"
  });

  const token = sessionStorage.getItem("token");

  // ================= LOAD DATA =================
  const loadTours = async () => {
    try {
      const res = await fetch("http://localhost:5050/api/Tour", {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await res.json();
      setTours(data);
    } catch {
      setError("Lỗi khi tải tours");
    }
  };

  const loadPois = async () => {
    try {
      const res = await fetch("http://localhost:5050/api/NarrationPoint");
      const data = await res.json();
      setPois(data);
    } catch {
      setError("Lỗi khi tải POI");
    }
  };

  useEffect(() => {
    loadTours();
    loadPois();
  }, []);

  // ================= SELECT POI =================
  const handlePoiSelect = (id) => {
    if (selectedPois.includes(id)) {
      setSelectedPois(selectedPois.filter(x => x !== id));
    } else {
      setSelectedPois([...selectedPois, id]);
    }
  };

  // ================= SUBMIT FORM (CREATE & UPDATE) =================
  const handleSubmit = async () => {
    if (!newTour.name.trim()) return setError("Tên tour không được trống");
    if (selectedPois.length === 0) return setError("Chọn ít nhất 1 POI");

    // Xác định đang là Edit hay Create để chọn API và Method phù hợp
    const url = editingTourId 
      ? `http://localhost:5050/api/Tour/${editingTourId}` 
      : "http://localhost:5050/api/Tour";
    const method = editingTourId ? "PUT" : "POST";

    try {
      await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          ...newTour,
          poi_ids: selectedPois
        })
      });

      handleCloseModal();
      loadTours(); // Tải lại danh sách sau khi xong
    } catch {
      setError(editingTourId ? "Lỗi cập nhật tour" : "Lỗi tạo tour");
    }
  };

  // ================= EDIT TOUR (Mở form và điền data cũ) =================
  const handleEditClick = (tour) => {
    // Điền thông tin cũ vào state form
    setNewTour({
      name: tour.name,
      description: tour.description,
      duration: tour.duration,
      status: tour.status || "Active"
    });
    
    // Đẩy danh sách POI ID cũ vào mảng selectedPois
    const oldPoiIds = tour.tour_pois ? tour.tour_pois.map(tp => tp.poi_id) : [];
    setSelectedPois(oldPoiIds);
    
    // Đánh dấu form đang ở chế độ Edit
    setEditingTourId(tour.id);
    setShowCreateForm(true);
  };

  // ================= DELETE TOUR =================
  const handleDeleteClick = async (id) => {
    // Hiện thông báo xác nhận trước khi xóa
    if (!window.confirm("Bạn có chắc chắn muốn xóa tour này không? Hành động này không thể hoàn tác.")) {
      return;
    }

    try {
      await fetch(`http://localhost:5050/api/Tour/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
      });
      loadTours(); // Tải lại dữ liệu sau khi xóa
    } catch {
      setError("Lỗi khi xóa tour");
    }
  };

  // ================= RESET FORM =================
  const handleCloseModal = () => {
    setNewTour({ name: "", description: "", duration: 30, status: "Active" });
    setSelectedPois([]);
    setError("");
    setEditingTourId(null); // Trả lại chế độ Create
    setShowCreateForm(false);
  };

  return (
    <div className="tour-container">

      <div className="tour-header">
        <div>
          <h2>🗺️ Quản lý tour</h2>
          <p className="tour-subtitle">Điều phối và biên tập các trải nghiệm ẩm thực đặc cấp</p>
        </div>
        <button 
          className="btn-create-tour"
          onClick={() => {
            handleCloseModal(); // Đảm bảo clear form cũ
            setShowCreateForm(true);
          }}
        >
          + Tạo Tour
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* ================= DANH SÁCH TOUR CHÍNH ================= */}
      <div className="tour-grid">
        {tours.map(t => (
          <div key={t.id} className="tour-card">
            {/* Badge status */}
            <div className="tour-badge">{t.status || "ACTIVE"}</div>

            {/* Thông tin tour */}
            <h3>{t.name}</h3>
            <p className="tour-desc">{t.description}</p>
            <p className="tour-duration">⏱ <strong>{t.duration}</strong> phút</p>

            {/* POI List */}
            <div className="tour-poi-list">
              <span className="poi-label">LỘ TRÌNH:</span>
              <div className="poi-tags">
                {t.tour_pois && t.tour_pois.length > 0 ? (
                  t.tour_pois.map(tp => (
                    <span key={tp.poi_id} className="poi-tag">
                      📍 {tp.poi_name}
                    </span>
                  ))
                ) : (
                  <span style={{color: '#999', fontSize: '12px'}}>
                    Chưa chọn địa điểm
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="actions">
              <button className="btn-view" onClick={() => setViewTour(t)}>Xem</button>
              {/* 🔥 Gắn hàm Edit và Delete vào nút */}
              <button className="btn-edit" onClick={() => handleEditClick(t)}>Chỉnh sửa</button>
              <button className="btn-delete" onClick={() => handleDeleteClick(t.id)}>Xóa</button>
            </div>
          </div>
        ))}

        {tours.length === 0 && (
          <div className="empty-state" style={{gridColumn: '1/-1'}}>
            <p>📭 Chưa có tour nào</p>
            <p style={{fontSize: '14px', color: '#999'}}>Nhấn nút "Tạo Tour" để bắt đầu</p>
          </div>
        )}
      </div>

      {/* ================= MODAL TẠO/SỬA TOUR ================= */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              {/* Đổi Title linh hoạt tùy chế độ */}
              <h3>{editingTourId ? "✏️ Chỉnh sửa Tour" : "✨ Tạo Tour Mới"}</h3>
              <button className="close-x-btn" onClick={handleCloseModal}>×</button>
            </div>

            <div className="modal-body create-form">
              
              <div className="form-group">
                <label>Tên tour</label>
                <input
                  type="text"
                  placeholder="Nhập tên tour..."
                  value={newTour.name}
                  onChange={e => setNewTour({...newTour, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  placeholder="Mô tả chi tiết về tour..."
                  value={newTour.description}
                  onChange={e => setNewTour({...newTour, description: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Thời lượng (phút)</label>
                <input
                  type="number"
                  min="1"
                  value={newTour.duration}
                  onChange={e => setNewTour({...newTour, duration: parseInt(e.target.value) || ""})}
                />
              </div>

              <div className="form-group">
                <label>Chọn địa điểm (POI)</label>
                <div className="poi-grid">
                  {pois.map(p => (
                    <div
                      key={p.id}
                      className={`poi-card ${selectedPois.includes(p.id) ? "active" : ""}`}
                      onClick={() => handlePoiSelect(p.id)}
                    >
                      <div className="poi-name">{p.name}</div>
                      <input
                        type="checkbox"
                        checked={selectedPois.includes(p.id)}
                        readOnly
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="error" style={{marginBottom: '20px'}}>{error}</div>}

              <div className="modal-actions">
                <button className="btn-cancel" onClick={handleCloseModal}>Hủy</button>
                {/* Nút Submit đổi text linh hoạt */}
                <button className="btn-submit" onClick={handleSubmit}>
                  {editingTourId ? "Lưu thay đổi" : "Tạo tour"}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ================= VIEW DETAIL ================= */}
      {viewTour && (
        <div className="modal-overlay" onClick={() => setViewTour(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h3>{viewTour.name}</h3>
              <button className="close-x-btn" onClick={() => setViewTour(null)}>×</button>
            </div>

            <div className="modal-body">
              <p>{viewTour.description}</p>
              <p style={{marginTop: '15px'}}>⏱ <strong>{viewTour.duration}</strong> phút</p>
              
              <div className="tour-poi-list">
                <span className="poi-label">LỘ TRÌNH TOUR:</span>
                <div className="poi-tags">
                  {viewTour.tour_pois && viewTour.tour_pois.length > 0 ? (
                    viewTour.tour_pois.map((tp, index) => (
                      <span key={index} className="poi-tag">
                        📍 {tp.poi_name}
                      </span>
                    ))
                  ) : (
                    <span className="no-data">Chưa chọn địa điểm</span>
                  )}
                </div>
              </div>

              <button className="btn-close" onClick={() => setViewTour(null)} style={{marginTop: '25px', width: '100%'}}>Đóng</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default TourManager;