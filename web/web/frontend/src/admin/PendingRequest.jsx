import { API_BASE, API } from "../config";
import { useState, useEffect } from 'react';
import styles from "../css/PendingRequest.module.css";
import {
    CheckCircle,
    XCircle,
    Info,
    MapPin,
    Tag,
    Activity,
    Store,
    Image as ImageIcon,
    Volume2
} from "lucide-react";

// ── TTS helper (toggle play/stop) ──
const speakText = (text, btnEl) => {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (btnEl) btnEl.innerHTML = '\u26A0\uFE0F \uD83D\uDD0A Nghe thử';
        return;
    }
    if (!text) return alert("Không có nội dung!");
    const doSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const utterance = new SpeechSynthesisUtterance(text);
        let lang = "en-US";
        if (/[àáảãạăắằẳẵặâấầẩẫậđêếềểễệôốồổỗộơớờởỡợưứừửữự]/i.test(text)) lang = "vi-VN";
        else if (/[\u4e00-\u9fff]/.test(text)) lang = "zh-CN";
        const voice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split("-")[0]));
        if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
        utterance.onstart = () => { if (btnEl) btnEl.innerHTML = '\u23F9 Dừng'; };
        utterance.onend = () => { if (btnEl) btnEl.innerHTML = '\uD83D\uDD0A Nghe thử'; };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };
    speechSynthesis.getVoices().length === 0
        ? (speechSynthesis.onvoiceschanged = doSpeak)
        : doSpeak();
};

function PendingRequest({ onActionComplete }) {
    const [requests, setRequests] = useState([]);
    const token = sessionStorage.getItem("token");

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/requests/pending`, {
                headers: { Authorization: "Bearer " + token }
            });
            const data = await res.json();
            setRequests(data);
        } catch (err) {
            console.error("Lỗi lấy dữ liệu:", err);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleApprove = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/api/requests/${id}/approve`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                }
            });
            if (res.ok) {
                setRequests(prev => prev.filter(req => req.id !== id));
                if (onActionComplete) onActionComplete();
                alert("✅ Phê duyệt thành công!");
            }
        } catch (err) { console.error(err); }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Bạn có chắc muốn từ chối yêu cầu này?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/requests/${id}/reject`, {
                method: "PUT",
                headers: { "Authorization": "Bearer " + token }
            });
            if (res.ok) {
                setRequests(prev => prev.filter(req => req.id !== id));
                if (onActionComplete) onActionComplete();
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className={styles.container}>
            <div className={styles.headerArea}>
                <h2>🔔 Yêu cầu chờ duyệt ({requests.length})</h2>
                <p className={styles.subtitle}>Xem xét các thay đổi từ chủ cửa hàng</p>
            </div>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Người gửi</th>
                        <th>Loại</th>
                        <th>ID Gốc</th>
                        <th>Nội dung cập nhật</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(req => {
                        try {
                            if (!req.newDataJson) return null;
                            const newData = JSON.parse(req.newDataJson);

                            return (
                                <tr key={req.id} className={styles.tableRow}>
                                    <td className={styles.requesterCol}>
                                        <div className={styles.userIcon}>U</div>
                                        <span>{req.requesterId}</span>
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${req.entityType === 'Stall' ? styles.badgeStall : styles.badgeAudio}`}>
                                            {req.entityType}
                                        </span>
                                    </td>
                                    <td className={styles.idCol}>#{req.entityId || "Mới"}</td>

                                    {/* CỘT NỘI DUNG DUY NHẤT - ĐÃ GỘP ẢNH VÀ INFO */}
                                    <td>
                                        <div className={styles.previewCard}>
                                            {req.entityType === "Stall" ? (
                                                <div className={styles.stallInfo}>
                                                    {/* Phần bên trái: Ảnh */}
                                                    {newData.image_url && (
                                                        <div className={styles.imagePreviewWrapper}>
                                                            <div className={styles.infoLabel}>
                                                                <ImageIcon size={12} /> Ảnh mới
                                                            </div>
                                                            <img
                                                                src={
                                                                    newData.image_url?.startsWith("data:")
                                                                        ? newData.image_url
                                                                        : `${API_BASE}${newData.image_url}`
                                                                }
                                                                alt="Preview"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Phần bên phải: Thông tin chữ */}
                                                    <div className={styles.infoGrid}>
                                                        {newData.stallName && (
                                                            <div className={styles.infoRow}>
                                                                <Store size={14} className={styles.icon} />
                                                                <strong>Tên:</strong>
                                                                <span className={styles.highlightText}>{newData.stallName}</span>
                                                            </div>
                                                        )}
                                                        <div className={styles.infoRow}>
                                                            <MapPin size={14} className={styles.icon} />
                                                            <strong>Tọa độ:</strong>
                                                            <span>{newData.latitude}, {newData.longitude}</span>
                                                        </div>
                                                        <div className={styles.infoRow}>
                                                            <Activity size={14} className={styles.icon} />
                                                            <strong>Trạng thái:</strong>
                                                            <span className={newData.status === 'Closed' ? styles.statusClosed : styles.statusOpen}>
                                                                {newData.status === 'Closed' ? "🔴 Tạm đóng" : "🟢 Hoạt động"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : req.entityType === "Translation" ? (
                                                /* Nhánh hiển thị cho Bản dịch */
                                                <div className={styles.translationInfo} style={{ padding: '8px' }}>
                                                    <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Info size={16} /> Bản dịch tiếng: {newData.languageCode?.toUpperCase()}
                                                    </div>
                                                    <div style={{
                                                        background: '#f8fafc',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #e2e8f0',
                                                        fontSize: '14px',
                                                        fontStyle: 'italic',
                                                        color: '#334155',
                                                        whiteSpace: 'pre-wrap'
                                                    }}>
                                                        "{newData.content}"
                                                    </div>
                                                </div>
                                            ) : req.entityType === "FoodPlace" ? (
                                                /* ✅ Nhánh hiển thị cho FoodPlace (TTS description) */
                                                <div style={{ padding: '8px' }}>
                                                    <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Volume2 size={16} /> Nội dung thuyết minh (TTS)
                                                    </div>
                                                    <div style={{
                                                        background: '#faf5ff',
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e9d5ff',
                                                        fontSize: '14px',
                                                        color: '#334155',
                                                        whiteSpace: 'pre-wrap',
                                                        lineHeight: '1.6',
                                                        maxHeight: '120px',
                                                        overflowY: 'auto'
                                                    }}>
                                                        {newData.description || <span style={{ color: '#999', fontStyle: 'italic' }}>Không có nội dung</span>}
                                                    </div>
                                                    <button 
                                                        onClick={(e) => speakText(newData.description, e.currentTarget)}
                                                        style={{
                                                            marginTop: '8px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 14px',
                                                            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            transition: 'opacity 0.2s'
                                                        }}
                                                    >
                                                        🔊 Nghe thử
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={styles.audioInfo}>
                                                    <div className={styles.audioTitle}>🎵 {newData.audio_title}</div>
                                                    {newData.audio_url && (
                                                        <audio controls style={{ width: '100%', marginTop: '8px' }}>
                                                            <source src={newData.audio_url.startsWith("http") ? newData.audio_url : `${API_BASE}${newData.audio_url}`} />
                                                        </audio>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className={styles.actionCol}>
                                        <div className={styles.btnGroup}>
                                            <button onClick={() => handleApprove(req.id)} className={styles.approveBtn}>
                                                <CheckCircle size={18} /> Duyệt
                                            </button>
                                            <button onClick={() => handleReject(req.id)} className={styles.rejectBtn}>
                                                <XCircle size={18} /> Từ chối
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        } catch (e) { return null; }
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default PendingRequest;
