import { useState, useEffect } from "react";
import { Headphones, Volume2 } from "lucide-react";
import styles from "../css/SellerAudioManager.module.css";

const API = "http://localhost:6050";

const LANGS = [
  { code: "en", label: "🇬🇧 English" },
  { code: "zh", label: "🇨🇳 中文" },
];

// ── TTS ──
const speakText = (text) => {
  if (!text) return alert("Không có nội dung để đọc!");
  const doSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(text);
    let lang = "en-US";
    if (/[àáảãạăắằẳẵặâấầẩẫậđêếềểễệôốồổỗộơớờởỡợưứừửữự]/i.test(text)) lang = "vi-VN";
    else if (/[\u4e00-\u9fff]/.test(text)) lang = "zh-CN";
    const voice =
      voices.find(v => v.lang === lang && v.name.includes("Google")) ||
      voices.find(v => v.lang === lang) ||
      voices.find(v => v.lang.startsWith(lang.split("-")[0]));
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  speechSynthesis.getVoices().length === 0
    ? (speechSynthesis.onvoiceschanged = doSpeak)
    : doSpeak();
};

// ══════════════════════════════════════
// TAB 1: TIẾNG VIỆT → food_places.description
// ══════════════════════════════════════
function VietnameseTab({ token, narrationPointId }) {
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [saving, setSaving] = useState(false);
  const [foodId, setFoodId] = useState(null);

  useEffect(() => {
    if (!narrationPointId) return;
    fetch(`${API}/api/FoodPlace`, { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json())
      .then(data => {
        const found = data.find(f => f.narrationPointId === narrationPointId);
        if (found) {
          setFoodId(found.id);
          setText(found.description || "");
          setOriginalText(found.description || "");
        }
      })
      .catch(() => console.log("Lỗi tải FoodPlace"));
  }, [narrationPointId]);

  const hasChanged = text !== originalText;

  const handleSave = async () => {
    if (!foodId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          entityType: "FoodPlace",
          entityId: foodId,
          newDataJson: JSON.stringify({ description: text }),
          status: "Pending"
        })
      });
      if (res.ok) {
        setOriginalText(text);
        alert("🚀 Đã gửi yêu cầu cập nhật cho Admin!");
      } else alert("❌ Lỗi gửi yêu cầu!");
    } catch { alert("❌ Lỗi kết nối!"); }
    finally { setSaving(false); }
  };

  if (!narrationPointId) return (
    <div className={styles.emptyState}>
      <Headphones size={40} />
      <p>Không tìm thấy thông tin quán.</p>
    </div>
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.editorCard}>
        <div className={styles.editorHeader}>
          <div>
            <h3 className={styles.editorTitle}>Nội dung thuyết minh Tiếng Việt</h3>
            <p className={styles.editorHint}>Nội dung này sẽ được TTS đọc khi khách đến gần địa điểm của bạn.</p>
          </div>
          <button type="button" onClick={() => speakText(text)} className={styles.listenBtn}>
            <Volume2 size={14} /> Nghe thử
          </button>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows="9"
          placeholder="Nhập nội dung thuyết minh tiếng Việt cho quán của bạn..."
          className={styles.textarea}
        />

        <div className={styles.editorFooter}>
          {hasChanged && (
            <span className={styles.changedBadge}>⚠️ Chưa lưu</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanged}
            className={`${styles.submitBtn} ${(!hasChanged || saving) ? styles.disabled : ""}`}
          >
            {saving ? "Đang gửi..." : "🚀 Gửi Admin duyệt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB 2: BẢN DỊCH → narration_translations.content
// ══════════════════════════════════════
function TranslationTab({ token, narrationPointId }) {
  const [activeLang, setActiveLang] = useState("en");
  const [translations, setTranslations] = useState([]);
  const [current, setCurrent] = useState(null);
  const [text, setText] = useState("");
  const [translatedName, setTranslatedName] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!narrationPointId) return;
    fetch(`${API}/api/Translation/by-point/${narrationPointId}`, {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.json())
      .then(data => setTranslations(Array.isArray(data) ? data : []))
      .catch(() => console.log("Lỗi tải translation"));
  }, [narrationPointId]);

  useEffect(() => {
    const found = translations.find(t => t.languageCode === activeLang);
    if (found) {
      setCurrent(found);
      setText(found.content || "");
      setTranslatedName(found.translatedName || "");
      setOriginalText(found.content || "");
      setOriginalName(found.translatedName || "");
    } else {
      setCurrent(null);
      setText("");
      setTranslatedName("");
      setOriginalText("");
      setOriginalName("");
    }
  }, [activeLang, translations]);

  const hasChanged = text !== originalText || translatedName !== originalName;

  const handleSave = async () => {
    if (!current) return alert("Chưa có bản dịch này trong hệ thống. Liên hệ Admin để thêm.");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          entityType: "Translation",
          entityId: narrationPointId, 
          newDataJson: JSON.stringify({
            languageCode: activeLang,
            translatedName,
            content: text
          }),
          status: "Pending"
        })
      });
      if (res.ok) {
        setOriginalText(text);
        setOriginalName(translatedName);
        alert("🚀 Đã gửi yêu cầu cập nhật cho Admin!");
      } else alert("❌ Lỗi gửi yêu cầu!");
    } catch { alert("❌ Lỗi kết nối!"); }
    finally { setSaving(false); }
  };

  if (!narrationPointId) return (
    <div className={styles.emptyState}>
      <Headphones size={40} />
      <p>Không tìm thấy thông tin quán.</p>
    </div>
  );

  return (
    <div className={styles.tabContent}>
      {/* Language switcher */}
      <div className={styles.langSwitcher}>
        {LANGS.map(lang => (
          <button
            key={lang.code}
            onClick={() => setActiveLang(lang.code)}
            className={`${styles.langBtn} ${activeLang === lang.code ? styles.langBtnActive : ""}`}
          >{lang.label}</button>
        ))}
      </div>

      <div className={styles.editorCard}>
        {!current ? (
          <div className={styles.emptyState}>
            <p>Chưa có bản dịch {LANGS.find(l => l.code === activeLang)?.label} cho quán này.</p>
            <p style={{ fontSize: "13px", marginTop: "8px" }}>Liên hệ Admin để thêm bản dịch mới.</p>
          </div>
        ) : (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Tên địa điểm ({LANGS.find(l => l.code === activeLang)?.label})
              </label>
              <input
                value={translatedName}
                onChange={e => setTranslatedName(e.target.value)}
                placeholder="Tên địa điểm đã dịch..."
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <div className={styles.editorHeader}>
                <div>
                  <label className={styles.label}>Nội dung thuyết minh</label>
                  <p className={styles.editorHint}>
                    TTS sẽ đọc nội dung này khi khách dùng {LANGS.find(l => l.code === activeLang)?.label}.
                  </p>
                </div>
                <button type="button" onClick={() => speakText(text)} className={styles.listenBtn}>
                  <Volume2 size={14} /> Nghe thử
                </button>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows="9"
                placeholder={`Nhập nội dung thuyết minh bằng ${LANGS.find(l => l.code === activeLang)?.label}...`}
                className={styles.textarea}
              />
            </div>

            <div className={styles.editorFooter}>
              {hasChanged && <span className={styles.changedBadge}>⚠️ Chưa lưu</span>}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanged}
                className={`${styles.submitBtn} ${(!hasChanged || saving) ? styles.disabled : ""}`}
              >
                {saving ? "Đang gửi..." : "🚀 Gửi Admin duyệt"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
const SellerAudioManager = () => {
  const [activeTab, setActiveTab] = useState("vi");
  const [narrationPointId, setNarrationPointId] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem("token");

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/Stalls`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const stall = Array.isArray(data) && data[0];
        if (stall) {
          const poiId = stall.narrationPointsId || stall.NarrationPointsId || stall.narrationPointId;
          setNarrationPointId(poiId);
        }
      })
      .catch(() => console.log("Lỗi tải stall"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className={styles.loadingState}>
      <Headphones size={20} /> Đang tải...
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        {[
          { key: "vi", label: "🇻🇳 Tiếng Việt" },
          { key: "trans", label: "🌐 Bản dịch" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ""}`}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === "vi"
        ? <VietnameseTab token={token} narrationPointId={narrationPointId} />
        : <TranslationTab token={token} narrationPointId={narrationPointId} />}
    </div>
  );
};

export default SellerAudioManager;
