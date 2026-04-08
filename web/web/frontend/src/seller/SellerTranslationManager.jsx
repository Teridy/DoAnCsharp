import { useState, useEffect } from "react";
import { Globe, Save, CheckCircle, Clock, Edit3, Trash2, List } from "lucide-react";

const SellerTranslationManager = ({ activeStall }) => {
  const [translations, setTranslations] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
  const token = sessionStorage.getItem("token");

  const poiId = activeStall?.narrationPointsId || activeStall?.narrationPointId;

  const loadAllData = async () => {
    if (!poiId) return;
    setLoading(true);
    try {
      const [resLang, resTrans, resPending] = await Promise.all([
        fetch("http://localhost:5050/api/Language"),
        fetch(`http://localhost:5050/api/Translation/by-point/${poiId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:5050/api/requests/pending`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setLanguages(await resLang.json());
      setTranslations(await resTrans.json());
      const allPendings = await resPending.json();
      setPendingRequests(allPendings.filter(r => r.entityType === "Translation" && r.entityId === poiId));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAllData(); }, [poiId]);

  const handleSaveRequest = async (langCode, content, translatedName) => {
    if (!content.trim() || !translatedName.trim()) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    const requestData = {
      entityType: "Translation",
      entityId: poiId,
      newDataJson: JSON.stringify({ languageCode: langCode, content: content, translatedName: translatedName }),
      status: "Pending"
    };
    try {
      const res = await fetch("http://localhost:5050/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(requestData)
      });
      if (res.ok) {
        setStatusMsg(`Đã gửi yêu cầu duyệt bản dịch ${langCode.toUpperCase()}`);
        // Reset ô nhập liệu thủ công
        document.getElementById(`name-${langCode}`).value = "";
        document.getElementById(`desc-${langCode}`).value = "";
        loadAllData();
        setTimeout(() => setStatusMsg(""), 3000);
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="seller-page">Đang tải dữ liệu...</div>;

  return (
    <div className="seller-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe color="#4f46e5" /> Quản lý dịch thuật
        </h2>
        <p style={{ color: '#64748b' }}>Soạn bản dịch mới và quản lý các nội dung đã được phê duyệt.</p>
      </div>

      {statusMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#059669', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          {statusMsg}
        </div>
      )}

      {/* --- PHẦN 1: FORM NHẬP MỚI (LUÔN TRỐNG) --- */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Edit3 size={18} color="#4f46e5" /> Soạn bản dịch mới
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {languages.map(lang => (
            <div key={lang.id} style={{ border: '1px solid #f1f5f9', padding: '16px', borderRadius: '12px' }}>
              <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>Tiếng {lang.language_name} ({lang.language_code.toUpperCase()})</div>
              <input id={`name-${lang.language_code}`} className="seller-input" style={{ width: '100%', marginBottom: '10px' }} placeholder="Tên quán dịch..." />
              <textarea id={`desc-${lang.language_code}`} className="seller-input" style={{ width: '100%', minHeight: '80px', marginBottom: '10px' }} placeholder="Mô tả dịch..." />
              <button 
                className="seller-btn seller-btn-primary" 
                style={{ width: '100%' }}
                onClick={() => handleSaveRequest(lang.language_code, document.getElementById(`desc-${lang.language_code}`).value, document.getElementById(`name-${lang.language_code}`).value)}
              >
                Gửi Admin duyệt
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- PHẦN 2: QUẢN LÝ NỘI DUNG ĐÃ CÓ --- */}
      <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <List size={18} color="#1e293b" /> Danh sách bản dịch hiện tại
        </h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Ngôn ngữ</th>
              <th style={{ padding: '12px' }}>Tên quán</th>
              <th style={{ padding: '12px' }}>Mô tả</th>
              <th style={{ padding: '12px' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {/* Hiển thị Pending trước */}
            {pendingRequests.map(req => {
              const data = JSON.parse(req.newDataJson);
              return (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fffbeb' }}>
                  <td style={{ padding: '12px' }}><strong>{data.languageCode.toUpperCase()}</strong></td>
                  <td style={{ padding: '12px' }}>{data.translatedName}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>{data.content}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Chờ duyệt
                    </span>
                  </td>
                </tr>
              );
            })}
            {/* Hiển thị Đã duyệt sau */}
            {translations.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px' }}><strong>{t.languageCode.toUpperCase()}</strong></td>
                <td style={{ padding: '12px' }}>{t.translatedName}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>{t.content}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ color: '#059669', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={12} /> Đã duyệt
                  </span>
                </td>
              </tr>
            ))}
            {translations.length === 0 && pendingRequests.length === 0 && (
              <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu bản dịch nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SellerTranslationManager;