import { useEffect, useState } from "react";
// Import dưới dạng object styles
import styles from "../css/TranslationManager.module.css";

const ViewIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

function TranslationManager() {
  const [translations, setTranslations] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [newTranslation, setNewTranslation] = useState(null);
  const [selectedTranslation, setSelectedTranslation] = useState(null);

  // --- STATE PHÂN TRANG ---
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = sessionStorage.getItem("translation_manager_page");
    return savedPage ? parseInt(savedPage) : 1;
  });
  const itemsPerPage = 5; 

  const token = sessionStorage.getItem("token");

  const loadTranslations = () => {
    fetch("http://localhost:5050/api/Translation", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.id - b.id);
        setTranslations(sorted);
      })
      .catch(() => console.log("Lỗi tải bản dịch"));
  };

  const loadLanguages = () => {
    fetch("http://localhost:5050/api/Language", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(res => res.json())
      .then(data => setLanguages(data))
      .catch(() => console.log("Lỗi tải ngôn ngữ"));
  };

  useEffect(() => {
    sessionStorage.setItem("translation_manager_page", currentPage);
  }, [currentPage]);

  const totalPages = Math.ceil(translations.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = translations.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [translations, totalPages]);

  const createTranslation = async () => {
    if (!newTranslation || !newTranslation.languageId) {
      alert("Vui lòng chọn ngôn ngữ!");
      return;
    }
    const selectedLang = languages.find(l => l.id == newTranslation.languageId);
    const payload = {
      NarrationPointId: parseInt(newTranslation.narrationPointId) || 0,
      LanguageId: parseInt(newTranslation.languageId),
      LanguageCode: selectedLang?.language_code || "", 
      Content: newTranslation.content,
      TranslatedName: newTranslation.translatedName 
    };

    const response = await fetch("http://localhost:5050/api/Translation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      loadTranslations();
      setNewTranslation(null);
    } else {
      const errData = await response.json();
      console.error("Chi tiết lỗi:", errData);
      alert("Lỗi: Kiểm tra xem các ID đã đúng chưa hoặc có bị trùng lặp không.");
    }
  };

  const updateTranslation = async () => {
    if (!selectedTranslation) return;
    const selectedLang = languages.find(l => l.id == selectedTranslation.languageId);
    const payload = {
      Id: selectedTranslation.id,
      NarrationPointId: parseInt(selectedTranslation.narrationPointId) || 0,
      LanguageId: parseInt(selectedTranslation.languageId),
      LanguageCode: selectedLang?.language_code || selectedTranslation.languageCode,
      Content: selectedTranslation.content,
      TranslatedName: selectedTranslation.translatedName
    };

    const response = await fetch(
      `http://localhost:5050/api/Translation/${selectedTranslation.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(payload)
      }
    );

    if (response.ok) {
      loadTranslations();
      setSelectedTranslation(null);
    } else {
      alert("Cập nhật thất bại.");
    }
  };

  useEffect(() => {
    loadTranslations();
    loadLanguages();
  }, []);

  const deleteTranslation = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản dịch này không?")) return;
    try {
      const response = await fetch(`http://localhost:5050/api/Translation/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
      });
      if (response.ok) {
        loadTranslations(); 
      } else {
        const err = await response.json();
        alert(err.message || "Xóa thất bại!");
      }
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
    }
  };

  const getLanguageName = (code) => {
    const lang = languages.find(l => (l.language_code || l.code) === code);
    return lang ? lang.language_name : code;
  };

  return (
    <div className={styles['translation-container']}>
      <div className={styles['translation-header']}>
        <span>🌐 Quản lý bản dịch </span>
        <button
          className={styles['add-btn']}
          onClick={() =>
            setNewTranslation({
              languageId: "",
              content: "",
              narrationPointId: "",
              translatedName: ""
            })
          }
        >
          + Thêm bản dịch
        </button>
      </div>

      {/* ADD MODAL */}
      {newTranslation && (
        <div className={styles.modal}>
          <div className={styles['modal-box']}>
            <div className={styles['modal-header']}>
              Thêm bản dịch
              <button className={styles['close-btn']} onClick={() => setNewTranslation(null)}>✖</button>
            </div>
            <div className={styles['modal-content']}>
              <label>Narration Point ID</label>
              <input
                type="number"
                value={newTranslation.narrationPointId}
                onChange={(e) => setNewTranslation({ ...newTranslation, narrationPointId: e.target.value })}
              />
              <label>Ngôn Ngữ</label>
              <select
                value={newTranslation.languageId}
                onChange={(e) => setNewTranslation({ ...newTranslation, languageId: e.target.value })}
              >
                <option value="">Chọn ngôn ngữ</option>
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.language_name} ({l.language_code || l.code})
                  </option>
                ))}
              </select>
              <label>Nội dung (Content)</label>
              <textarea
                value={newTranslation.content}
                onChange={(e) => setNewTranslation({ ...newTranslation, content: e.target.value })}
              />
              <label>Tên Dịch</label>
              <input
                value={newTranslation.translatedName}
                onChange={(e) => setNewTranslation({ ...newTranslation, translatedName: e.target.value })}
              />
            </div>
            <div className={styles['modal-actions']}>
              <button className={styles['icon-save-btn']} onClick={createTranslation}>
                <i className="fa-solid fa-floppy-disk"></i>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={styles['table-wrapper']}>
        <table className={styles['translation-table']}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Narration Point ID</th>
              <th>Mã Ngôn Ngữ</th>
              <th>Nội Dung</th>
              <th>Tên Dịch</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map(t => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.narrationPointId}</td>
                <td>{getLanguageName(t.languageCode)}</td>
                <td className={styles.desc}>{t.content}</td>
                <td>{t.translatedName}</td>
                <td>
                  <div className={styles['action-group']}>
                    <button
                      className={`${styles['action-btn']} ${styles['view-btn']}`}
                      onClick={() => setSelectedTranslation({ ...t })}
                      title="Xem/Sửa"
                    >
                      <ViewIcon />
                    </button>
                    <button
                      className={`${styles['action-btn']} ${styles['delete-btn']}`}
                      onClick={() => deleteTranslation(t.id)}
                      title="Xóa"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- PHÂN TRANG --- */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&laquo;</button>
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>&lsaquo;</button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={currentPage === i + 1 ? styles.active : ""}
            >
              {i + 1}
            </button>
          ))}
          
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>&rsaquo;</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>&raquo;</button>
        </div>
      )}

      {/* EDIT MODAL */}
      {selectedTranslation && (
         <div className={styles.modal}>
            <div className={styles['modal-box']}>
                <div className={styles['modal-header']}>
                  Chỉnh sửa 
                  <button className={styles['close-btn']} onClick={() => setSelectedTranslation(null)}>✖</button>
                </div>
                <div className={styles['modal-content']}>
                    <label>Narration Point ID</label>
                    <input type="number" value={selectedTranslation.narrationPointId} onChange={(e) => setSelectedTranslation({...selectedTranslation, narrationPointId: e.target.value})} />
                    <label>Ngôn Ngữ</label>
                    <select value={selectedTranslation.languageId} onChange={(e) => setSelectedTranslation({...selectedTranslation, languageId: e.target.value})}>
                        {languages.map(l => <option key={l.id} value={l.id}>{l.language_name}</option>)}
                    </select>
                    <label>Nội dung</label>
                    <textarea value={selectedTranslation.content} onChange={(e) => setSelectedTranslation({...selectedTranslation, content: e.target.value})} />
                    <label>Tên Dịch</label>
                    <input value={selectedTranslation.translatedName} onChange={(e) => setSelectedTranslation({...selectedTranslation, translatedName: e.target.value})} />
                </div>
                <div className={styles['modal-actions']}>
                    <button className={styles['icon-save-btn']} onClick={updateTranslation}>
                      <i className="fa-solid fa-floppy-disk"></i>
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}

export default TranslationManager;