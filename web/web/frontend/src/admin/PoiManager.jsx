import { useEffect, useState } from "react";
  import "../css/PoiManager.css";

  // Icon SVG Components
  const ViewIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EditIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  );

  const DeleteIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );

  function PoiManager() {
    const [pois, setPois] = useState([]);
    const [currentPage, setCurrentPage] = useState(() => {
      const saved = sessionStorage.getItem("poi_page");
      return saved ? parseInt(saved) : 1;
    });

    const itemsPerPage = 5;
    const [showForm, setShowForm] = useState(false);
    const [selectedPoi, setSelectedPoi] = useState(null);
    const [editingPoi, setEditingPoi] = useState(null);
    const [error, setError] = useState("");

    // ĐÃ SỬA: Đổi is_active thành status mặc định là "Open"
 const [form, setForm] = useState({
    id: "",
    name: "",
    activationRadius: "",
    latitude: "",
    longitude: "",
    priority: "",
    status: "Active", 
    image: null, 
    imagePreview: "",
    categoryId: "", 
    priceRange: "",
    openingHours: "",
    description: ""
  });

    const token = sessionStorage.getItem("token");
// Thêm vào bên trong function PoiManager()
const [categories, setCategories] = useState([]);

// Hàm tải danh sách danh mục từ database
const loadCategories = () => {
  fetch("http://localhost:5050/api/Categories", {
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .then(res => res.json())
    .then(data => {
      setCategories(data);
      // Nếu là thêm mới, có thể set mặc định categoryId là ID của phần tử đầu tiên
      if (!editingPoi && data.length > 0) {
        setForm(prev => ({ ...prev, categoryId: data[0].id }));
      }
    })
    .catch(() => console.log("Lỗi tải danh mục từ server"));
};

// Gọi hàm này trong useEffect hiện tại của bạn
useEffect(() => {
  loadPois();
  loadCategories(); // Thêm dòng này
}, []);
    const handleDelete = async (id) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa?")) {
        try {
          await fetch(`http://localhost:5050/api/NarrationPoint/${id}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token }
          });
          loadPois(); 
          setSelectedPoi(null); 
        } catch (err) {
          console.error("Lỗi khi xóa:", err);
        }
      }
    };

const loadPois = () => {
  return fetch("http://localhost:5050/api/NarrationPoint", {
    headers: { Authorization: "Bearer " + token }
  })
    .then(res => res.json())
    .then(data => {
      console.log("POI list sau khi save:", data); // thêm dòng này
      setPois(data);
    })
    .catch(() => console.log("Lỗi tải POI"));
};

    // ================= PAGINATION =================
    const totalPages = Math.ceil(pois.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentPois = pois.slice(startIndex, startIndex + itemsPerPage);

    // lưu page
    useEffect(() => {
      sessionStorage.setItem("poi_page", currentPage);
    }, [currentPage]);

const handleChange = (e) => {
  const { name, value } = e.target;
  let newValue = value;

  // CHỈ ép kiểu số cho những trường thực sự là số trong Database
  const numericFields = ["latitude", "longitude", "id", "priority", "activationRadius", "categoryId"];
  
  if (numericFields.includes(name)) {
    newValue = value === "" ? "" : Number(value);
  }

  // Cập nhật state và dùng toán tử ?? "" để đảm bảo không bao giờ bị undefined
  setForm(prev => ({
    ...prev,
    [name]: newValue ?? ""
  }));
};
const mapStatusToIsActive = (status) => status === "Active";
    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setForm({
          ...form,
          image: file,
          imagePreview: URL.createObjectURL(file) 
        });
      }
    };

   const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const formData = new FormData();
      // Thông tin NarrationPoint
      if (editingPoi) formData.append("id", form.id);
      formData.append("name", form.name);
      formData.append("latitude", form.latitude);
      formData.append("longitude", form.longitude);
      formData.append("activationRadius", form.activationRadius);
      formData.append("priority", form.priority);
      const isActive = mapStatusToIsActive(form.status);
      formData.append("isActive", isActive);
      if (form.image) formData.append("image", form.image);
      // BỔ SUNG: Thông tin chi tiết Quán ăn (FoodPlace)
      formData.append("categoryId", form.categoryId);
      formData.append("priceRange", form.priceRange);
      formData.append("openingHours", form.openingHours);
      formData.append("description", form.description);

      // Gửi đến API mới (FoodPlaceController)
    const res = await fetch(
  `http://localhost:5050/api/NarrationPoint${editingPoi ? `/${editingPoi.id}` : ""}`,
  {
    method: editingPoi ? "PUT" : "POST",
    headers: { Authorization: "Bearer " + token },
    body: formData
  }
);

      if (!res.ok) {
        const message = await res.text();
        setError(message);
        return;
      }
      
      await loadPois();
      setShowForm(false);
      // Reset form bao gồm cả các trường mới
      setForm({
        id: "", name: "", latitude: "", longitude: "", activationRadius: "",
        priority: "", status: "Active", image: null, imagePreview: "",
        categoryId: "", priceRange: "", openingHours: "", description: ""
      });

    } catch {
      setError("Không thể lưu địa điểm");
    }
  };
    const openEditForm = (poi) => {
      console.log("Dữ liệu POI nhận được:", poi);
  setEditingPoi(poi);
const isPoiActive = poi.isActive === true || poi.is_active === true;

  setForm({
    id: poi.id ?? "",
    name: poi.name ?? "",
    latitude: poi.latitude ?? "",
    longitude: poi.longitude ?? "",
    activationRadius: poi.activationRadius ?? "",
    priority: poi.priority ?? "",
    status: isPoiActive ? "Active" : "Closed",
    image: null, 
    imagePreview: poi.imageWeb ? `http://localhost:5050${poi.imageWeb}` : "",
    // PHẢI BỔ SUNG CÁC DÒNG NÀY (giả sử API trả về kèm thông tin FoodPlace)
    categoryId: poi.foodInfo?.categoryId ?? "",
    priceRange: poi.foodInfo?.priceRange ?? "",
    openingHours: poi.foodInfo?.openingHours ?? "",
    description: poi.foodInfo?.description ?? ""
  });

  setShowForm(true);
  setSelectedPoi(null);
};

    const openAddForm = () => {
  setEditingPoi(null);
  setForm({
    id: "",
    name: "",
    latitude: "",
    longitude: "",
    activationRadius: "",
    priority: "",
    image: null,
    imagePreview: "",
    status: "Active",
    categoryId: "",
    priceRange: "",
    openingHours: "",
    description: ""
  });
  setShowForm(true);
};

    return (
      <div className="poi-container">
        <div className="poi-header">
          <h1>📍Quản lý POI</h1>
          <button className="poi-add-btn" onClick={openAddForm}>
            + Thêm POI
          </button>
        </div>

        <div className="poi-table">
          <div className="poi-row poi-header-row">
            <div className="poi-col poi-col-id">ID</div>
            <div className="poi-col poi-col-name">Tên</div>
            <div className="poi-col poi-col-coord">Tọa độ</div>
            <div className="poi-col poi-col-radius">Bán kính</div>      
            <div className="poi-col poi-col-priority">Ưu tiên</div>         
            <div className="poi-col poi-col-status">Trạng thái</div> 
            <div className="poi-col poi-col-image">Ảnh</div>     
            <div className="poi-col poi-col-action">Thao tác</div>
          </div>

          {currentPois.map(( poi) => {
const isPoiActive = poi.isActive === true || poi.is_active === true;
            return (
              <div className="poi-row" key={poi.id}>
                <div className="poi-col poi-col-id">{poi.id}</div>
                <div className="poi-col poi-col-name">{poi.name}</div>
                <div className="poi-col poi-col-coord">
                  {poi.latitude && poi.longitude 
                    ? `${Number(poi.latitude).toFixed(4)}, ${Number(poi.longitude).toFixed(4)}` 
                    : "Chưa có tọa độ"}
                </div>
                <div className="poi-col poi-col-radius">
                  {poi.activationRadius ?? "N/A"}
                </div>
                <div className="poi-col poi-col-priority">{poi.priority}</div>
                
                {/* ĐÃ SỬA: Hiển thị trạng thái trong bảng (Open/Closed) */}
                <div className="poi-col poi-col-status">
                  { isPoiActive
                    ? <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: '#e8f5e9', color: '#2e7d32' }}>Open</span>
                    : <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: '#e8eaf6', color: '#3f51b5' }}>Closed</span> }
                </div>

                

                <div className="poi-col poi-col-image">
                  {poi.imageWeb ? (
                    <img src={`http://localhost:5050${poi.imageWeb}`} alt="POI" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }} />
                  ) : (
                    "Không có ảnh"
                  )}
                </div>
                <div className="poi-col poi-col-action">
                  <button 
                    className="icon-btn view-btn"
                    onClick={() => setSelectedPoi(poi)}
                  >
                    <ViewIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Modal xem chi tiết */}
        {selectedPoi && !showForm && (() => {
        const isPoiActive = selectedPoi.isActive === true || selectedPoi.is_active === true;
          return (
            <div className="poi-modal-overlay" >
              <div className="poi-modal-box" >
                
                {/* HEADER */}
                <div className="poi-modal-header">
                  <h2>Chi tiết địa điểm</h2>
                  <button className="close-btn" onClick={() => setSelectedPoi(null)}>
                    <CloseIcon />
                  </button>
                </div>

                {/* CONTENT */}
                <div className="poi-modal-content">
                  <div className="form-group">
                    <label>ID</label>
                    <input type="text" value={selectedPoi.id} disabled />
                  </div>

                  <div className="form-group">
                    <label>Tên địa điểm</label>
                    <input type="text" value={selectedPoi.name} disabled />
                  </div>

                  {/* TỌA ĐỘ */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Vĩ độ</label>
                      <input type="number" value={selectedPoi.latitude.toFixed(6)} disabled />
                    </div>

                    <div className="form-group">
                      <label>Kinh độ</label>
                      <input type="number" value={selectedPoi.longitude.toFixed(6)} disabled />
                    </div>
                  </div>

                  {/* RADIUS + PRIORITY */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Bán kính kích hoạt</label>
                      <input
                        type="number"
                        value={selectedPoi.activationRadius ?? ""}
                        disabled
                      />
                    </div>

                    <div className="form-group">
                      <label>Độ ưu tiên</label>
                      <input
                        type="number"
                        value={selectedPoi.priority ?? 0}
                        disabled
                      />
                    </div>
                  </div>

                  {/* ĐÃ SỬA: Hiển thị trạng thái trong Modal Xem Chi Tiết */}
                  <div className="form-group">
                    <label>Trạng thái cửa hàng</label>
                    <div>
                      <span style={{ 
                          display: "inline-block", padding: "6px 12px", borderRadius: "4px", fontSize: "13px", fontWeight: "bold",
                          backgroundColor: isPoiActive ? '#e8f5e9' : '#e8eaf6',
                          color: isPoiActive ? '#2e7d32' : '#3f51b5'
                      }}>
                        {isPoiActive ? "🟢 Đang hoạt động (Mở cửa)" : "🔴 Tạm đóng cửa (Nghỉ bán)"}
                      </span>
                    </div>
                  </div>

                

                  <div className="form-group">
                    <label>Ảnh hiện tại</label>
                    <div className="detail-image">
                      {selectedPoi.imageWeb ? (
                        <img src={`http://localhost:5050${selectedPoi.imageWeb}`} alt="POI" style={{ width: "100%", maxHeight: "150px", objectFit: "contain", borderRadius: "8px" }} />
                      ) : (
                        <p style={{ color: "#888", fontStyle: "italic" }}>Không có ảnh minh họa</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTION */}
                <div className="poi-modal-actions">
                  <button 
                    className="icon-btn edit-btn"
                    onClick={() => openEditForm(selectedPoi)}
                  >
                    <EditIcon />
                  </button>

                  <button 
                    className="icon-btn delete-btn"
                    onClick={() => handleDelete(selectedPoi.id)}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
              &laquo;
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              &lsaquo;
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={currentPage === i + 1 ? "active" : ""}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              &rsaquo;
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              &raquo;
            </button>
          </div>
        )}

        {/* Modal thêm/sửa */}
        {showForm && (
          <div className="poi-modal-overlay">
            <div className="poi-modal-box" onClick={e => e.stopPropagation()}>
              <div className="poi-modal-header">
                <h2>{editingPoi ? "Sửa địa điểm" : "Thêm địa điểm"}</h2>
                <button className="close-btn" onClick={() => {
                  setShowForm(false);
                  setEditingPoi(null);
                }}>
                  <CloseIcon />
                </button>
              </div>
              <form className="poi-modal-content" onSubmit={handleSubmit}>
              
                <div className="form-group">
                  <label>Tên địa điểm *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vĩ độ *</label>
                    <input
                      type="number"
                      name="latitude"
                      step="0.0001"
                      value={form.latitude ?? ""}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Kinh độ *</label>
                    <input
                      type="number"
                      name="longitude"
                      step="0.0001"
                      value={form.longitude ?? ""}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Bán kính kích hoạt</label>
                    <input
                      type="number"
                      name="activationRadius"
                      value={form.activationRadius}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Độ ưu tiên</label>
                    <input
                      type="number"
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                    />
                  </div>
                </div>
               

<hr style={{ margin: '20px 0', border: '0.5px solid #eee' }} />
<h3 style={{ fontSize: '16px', color: '#6a5af9', marginBottom: '15px' }}>🍴 Thông tin chi tiết quán ăn</h3>

<div className="form-group">
  <label>Danh mục quán ăn </label>
  <select 
    name="categoryId" 
    value={form.categoryId} 
    onChange={handleChange}
    required
  >
    <option value="">-- Chọn danh mục --</option>
    {categories.map((cat) => (
      <option key={cat.id} value={cat.id}>
        {cat.name}
      </option>
    ))}
  </select>
</div>

<div className="form-row">
  <div className="form-group">
    <label>Khoảng giá </label>
    <input
      type="text"
      name="priceRange"
      placeholder="Nhập khoảng giá..."
      value={form.priceRange}
      onChange={handleChange}
    />
  </div>
  <div className="form-group">
    <label>Giờ mở cửa </label>
    <input
      type="text"
      name="openingHours"
      placeholder="Nhập giờ hoạt động..."
      value={form.openingHours}
      onChange={handleChange}
    />
  </div>
</div>

<div className="form-group">
  <label>Mô tả quán ăn</label>
  <textarea
    name="description"
    rows="3"
    placeholder="Giới thiệu đôi nét về quán..."
    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
    value={form.description}
    onChange={handleChange}
  />
</div>
                <div className="form-group">
                  <label>Ảnh minh họa</label>
                  <div className="image-upload-wrapper">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    {form.imagePreview && (
                      <div className="image-preview-box">
                        <img 
                          src={form.imagePreview} 
                          alt="Preview" 
                          style={{ width: "100px", height: "100px", objectFit: "cover", marginTop: "10px", borderRadius: "8px", border: "1px solid #ddd" }} 
                        />
                        <button type="button" onClick={() => setForm({...form, image: null, imagePreview: ""})} style={{display: 'block', fontSize: '12px', color: 'red', border: 'none', background: 'none', cursor: 'pointer'}}>
                          Xóa ảnh
                        </button>
                      </div>
                    )}
                  </div>
                </div>
               

                {/* ĐÃ SỬA: Select dùng biến status */}
                <div className="form-group">
                  <label>Trạng thái cửa hàng (Status)</label>
                  <select
                    name="status"
                    value={form.status} 
                    onChange={handleChange}
                  >
                  <option value="Active">🟢 Đang hoạt động (Mở cửa)</option>
                  <option value="Closed">🔴 Tạm đóng cửa (Nghỉ bán)</option>
                  </select>
                </div>
                
                {error && <div className="form-error">{error}</div>}
                
                <div className="poi-modal-actions">
                  <button type="submit" className="icon-btn save-btn">
                    <i className="fa-solid fa-floppy-disk"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default PoiManager;