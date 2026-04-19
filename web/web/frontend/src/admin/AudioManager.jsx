import { API_BASE, API } from "../config";
import { useEffect, useState } from "react";
import styles from "../css/AudioManager.module.css";




// ── TTS (toggle play/stop) ──
const speakText = (text, btnEl) => {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (btnEl) btnEl.textContent = '🔊';
    return;
  }
  if (!text) return;
  const doSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(text);
    let lang = "en-US";
    if (/[àáảãạăắằẳẵặâấầẩẫậđêếềểễệôốồổỗộơớờởỡợưứừửữự]/i.test(text)) lang = "vi-VN";
    else if (/[\u4e00-\u9fff]/.test(text)) lang = "zh-CN";
    const voice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split("-")[0]));
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    utterance.onstart = () => { if (btnEl) btnEl.textContent = '⏹'; };
    utterance.onend = () => { if (btnEl) btnEl.textContent = '🔊'; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  speechSynthesis.getVoices().length === 0
    ? (speechSynthesis.onvoiceschanged = doSpeak)
    : doSpeak();
};

// ── Pagination ──
function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className={styles.pagination}>
      <button onClick={() => onChange(1)} disabled={current === 1}>&laquo;</button>
      <button onClick={() => onChange(current - 1)} disabled={current === 1}>&lsaquo;</button>
      {[...Array(total)].map((_, i) => (
        <button key={i} onClick={() => onChange(i + 1)} className={current === i + 1 ? styles.active : ""}>{i + 1}</button>
      ))}
      <button onClick={() => onChange(current + 1)} disabled={current === total}>&rsaquo;</button>
      <button onClick={() => onChange(total)} disabled={current === total}>&raquo;</button>
    </div>
  );
}

// ══════════════════════════════════════
// TAB 1: TIẾNG VIỆT → food_places.description
// ══════════════════════════════════════
function VietnameseTab({ token }) {
  const [foods, setFoods] = useState([]);
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  useEffect(() => {
    fetch(`${API}/api/FoodPlace`, { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json())
      .then(setFoods)
      .catch(() => console.log("Lỗi tải FoodPlace"));
  }, []);

  const openEdit = (food) => { setEditing(food); setText(food.description || ""); };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/FoodPlace/${editing.id}/description`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          description: text
        })
      });
      if (res.ok) {
        setFoods(prev => prev.map(f => f.id === editing.id ? { ...f, description: text } : f));
        setEditing(null);
        alert("✅ Lưu thành công!");
      } else alert("❌ Lỗi lưu!");
    } catch { alert("❌ Lỗi kết nối!"); }
    finally { setSaving(false); }
  };

  const totalPages = Math.ceil(foods.length / PER_PAGE);
  const items = foods.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <table className={styles["audio-table"]}>
        <thead>
          <tr>
            <th>POI ID</th>
            <th>Tên địa điểm</th>
            <th>Nội dung TTS (Tiếng Việt)</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map(food => (
            <tr key={food.id}>
              <td><code>{food.narrationPointId}</code></td>
              <td>{food.narrationPoint?.name || `POI #${food.narrationPointId}`}</td>
              <td title={food.description}>
                {food.description
                  ? (food.description.length > 50 ? food.description.substring(0, 50) + "..." : food.description)
                  : <span style={{ color: "#999", fontStyle: "italic" }}>Chưa có nội dung</span>}
              </td>
              <td>
                <div className={styles["action-buttons"]}>
                  <button
                    className={`${styles["action-btn"]} ${styles["play-btn"]}`}
                    title="Nghe thử TTS"
                    onClick={(e) => speakText(food.description, e.currentTarget)}
                  >🔊</button>
                  <button
                    className={`${styles["action-btn"]} ${styles["edit-btn"]}`}
                    title="Chỉnh sửa"
                    onClick={() => openEdit(food)}
                  ><i className="fa-solid fa-pen" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination current={page} total={totalPages} onChange={setPage} />

      {/* Modal sửa */}
      {editing && (
        <div className={styles.modal}>
          <div className={styles["modal-box"]}>
            <div className={styles["modal-header"]}>
              <h2>✏️ Sửa nội dung TTS — {editing.narrationPoint?.name || `POI #${editing.narrationPointId}`}</h2>
              <button className={styles["modal-close-icon"]} onClick={() => setEditing(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles["modal-content"]}>
              <div className={styles["form-group"]}>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Nội dung Tiếng Việt (description)</span>
                  <button
                    type="button"
                    onClick={() => speakText(text)}
                    style={{ background: "#4caf50", color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                  >🔊 Nghe thử</button>
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows="6"
                  placeholder="Nhập nội dung thuyết minh tiếng Việt..."
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", resize: "vertical" }}
                />
              </div>
              <div className={styles["modal-actions"]}>
                <button
                  type="button"
                  className={`${styles["icon-btn"]} ${styles["save-btn"]}`}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : <i className="fa-solid fa-floppy-disk" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// TAB 2: BẢN DỊCH → narration_translations.content (en / zh)
// ══════════════════════════════════════
const LANGS = [
  { code: "en", label: "🇬🇧 English" },
  { code: "zh", label: "🇨🇳 中文" },
];

function TranslationTab({ token }) {
  const [activeLang, setActiveLang] = useState("en");
  const [translations, setTranslations] = useState([]);
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState("");
  const [translatedName, setTranslatedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const loadTranslations = () => {
    fetch(`${API}/api/Translation/by-language/${activeLang}`, {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.json())
      .then(setTranslations)
      .catch(() => console.log("Lỗi tải translation"));
  };

  useEffect(() => {
    setPage(1);
    loadTranslations();
  }, [activeLang]);

  const openEdit = (t) => {
    setEditing(t);
    setText(t.content || "");
    setTranslatedName(t.translatedName || "");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/Translation/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          id: editing.id,
          narrationPointId: editing.narrationPointId,
          languageCode: editing.languageCode,
          translatedName,
          content: text
        })
      });
      if (res.ok) {
        setTranslations(prev => prev.map(t =>
          t.id === editing.id ? { ...t, content: text, translatedName } : t
        ));
        setEditing(null);
        alert("✅ Lưu thành công!");
      } else alert("❌ Lỗi lưu!");
    } catch { alert("❌ Lỗi kết nối!"); }
    finally { setSaving(false); }
  };

  const totalPages = Math.ceil(translations.length / PER_PAGE);
  const items = translations.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      {/* Language switcher */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {LANGS.map(lang => (
          <button
            key={lang.code}
            onClick={() => setActiveLang(lang.code)}
            style={{
              padding: "6px 16px",
              borderRadius: "20px",
              border: "2px solid",
              borderColor: activeLang === lang.code ? "#6a5af9" : "#e2e8f0",
              background: activeLang === lang.code ? "#6a5af9" : "white",
              color: activeLang === lang.code ? "white" : "#475569",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "13px"
            }}
          >{lang.label}</button>
        ))}
      </div>

      <table className={styles["audio-table"]}>
        <thead>
          <tr>
            <th>POI ID</th>
            <th>Tên dịch</th>
            <th>Nội dung TTS</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan="4" style={{ textAlign: "center", color: "#999", padding: "20px" }}>Chưa có bản dịch nào</td></tr>
          ) : items.map(t => (
            <tr key={t.id}>
              <td><code>{t.narrationPointId}</code></td>
              <td>{t.translatedName || <span style={{ color: "#999", fontStyle: "italic" }}>Chưa đặt tên</span>}</td>
              <td title={t.content}>
                {t.content
                  ? (t.content.length > 50 ? t.content.substring(0, 50) + "..." : t.content)
                  : <span style={{ color: "#999", fontStyle: "italic" }}>Chưa có nội dung</span>}
              </td>
              <td>
                <div className={styles["action-buttons"]}>
                  <button
                    className={`${styles["action-btn"]} ${styles["play-btn"]}`}
                    title="Nghe thử TTS"
                    onClick={(e) => speakText(t.content, e.currentTarget)}
                  >🔊</button>
                  <button
                    className={`${styles["action-btn"]} ${styles["edit-btn"]}`}
                    title="Chỉnh sửa"
                    onClick={() => openEdit(t)}
                  ><i className="fa-solid fa-pen" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination current={page} total={totalPages} onChange={setPage} />

      {/* Modal sửa */}
      {editing && (
        <div className={styles.modal}>
          <div className={styles["modal-box"]}>
            <div className={styles["modal-header"]}>
              <h2>✏️ Sửa bản dịch — POI #{editing.narrationPointId} ({LANGS.find(l => l.code === activeLang)?.label})</h2>
              <button className={styles["modal-close-icon"]} onClick={() => setEditing(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles["modal-content"]}>
              <div className={styles["form-group"]}>
                <label>Tên địa điểm (translatedName)</label>
                <input
                  value={translatedName}
                  onChange={e => setTranslatedName(e.target.value)}
                  placeholder="Tên địa điểm đã dịch..."
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
                />
              </div>
              <div className={styles["form-group"]}>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Nội dung TTS (content)</span>
                  <button
                    type="button"
                    onClick={() => speakText(text)}
                    style={{ background: "#4caf50", color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                  >🔊 Nghe thử</button>
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows="6"
                  placeholder={`Nhập nội dung thuyết minh (${LANGS.find(l => l.code === activeLang)?.label})...`}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", resize: "vertical" }}
                />
              </div>
              <div className={styles["modal-actions"]}>
                <button
                  type="button"
                  className={`${styles["icon-btn"]} ${styles["save-btn"]}`}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : <i className="fa-solid fa-floppy-disk" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
function AudioManager() {
  const [activeTab, setActiveTab] = useState("vi");
  const token = sessionStorage.getItem("token");

  return (
    <div className={styles["audio-container"]}>
      <div className={styles["audio-header"]}>
        <h1>🎧 Quản lý Nội dung TTS</h1>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0", marginBottom: "24px", borderBottom: "2px solid #e2e8f0" }}>
        {[
          { key: "vi", label: "🇻🇳 Tiếng Việt" },
          { key: "trans", label: "🌐 Bản dịch" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 24px",
              border: "none",
              borderBottom: activeTab === tab.key ? "3px solid #6a5af9" : "3px solid transparent",
              background: "none",
              color: activeTab === tab.key ? "#6a5af9" : "#64748b",
              fontWeight: activeTab === tab.key ? "700" : "500",
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s",
              marginBottom: "-2px"
            }}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === "vi"
        ? <VietnameseTab token={token} />
        : <TranslationTab token={token} />}
    </div>
  );
}

export default AudioManager;
