import { API_BASE, API } from "./config";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Login.css";
function Login() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UserName: userName,
          Password: password
        })
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        alert(data.message || "Đăng nhập thất bại");
        return;
      }

      // Lưu thông tin vào sessionStorage
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("role", data.role);
      sessionStorage.setItem("userName", userName);

      alert("Đăng nhập thành công!");

      // 🔴 ĐOẠN CẦN SỬA Ở ĐÂY 🔴
      const userRole = data.role ? data.role.toLowerCase() : "";

      if (userRole === "admin") {
        navigate("/admin"); // Vào trang admin
      } else if (userRole === "seller") {
        navigate("/seller"); // Vào trang SellerDashboard
      } else {
        navigate("/"); // User thường vào trang chủ
      }

    } catch (err) {
      setLoading(false);
      alert("Không kết nối được server");
      console.error(err);
    }
  };

  return (
    <>
      

      <div className="login-page">
        {/* NAVBAR */}
        <nav className="navbar">
          <div className="navbar-brand" onClick={() => navigate("/")}>
            🍜 Phố Ẩm Thực
          </div>
          <div className="navbar-actions">
            <button className="btn-outline" onClick={() => navigate("/login")}>Đăng nhập</button>
            <button className="btn-primary" onClick={() => navigate("/register")}>Đăng ký</button>
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-overlay" />
          <div className="hero-content">
            <div className="hero-text">
              <h1>Khám Phá Phố Ẩm Thực</h1>
              <p>Hệ thống thuyết minh cho từng địa điểm</p>
            </div>

            <div className="login-card">
              <div className="login-card-header">
                <div className="icon">🍜</div>
                <h2>Đăng nhập</h2>
                <p>Chào mừng bạn trở lại!</p>
              </div>
              <div className="divider" />

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Tên đăng nhập</label>
                  <input
                    placeholder="Nhập tên đăng nhập"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Mật khẩu</label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                

                <button className="btn-login" type="submit" disabled={loading}>
                  {loading ? "Đang xử lý..." : "Đăng nhập"}
                </button>
              </form>

              <div className="login-footer-note">
                Chưa có tài khoản?{" "}
                <a onClick={() => navigate("/register")}>Đăng ký ngay</a>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          © 2026 Phố Ẩm Thực — Guide System
        </footer>
      </div>
    </>
  );
}

export default Login;
