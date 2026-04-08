import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Register.css";
function Register() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("Seller");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch("http://localhost:5050/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, password, email, phone }),
    });

    const data = await response.text();
    setLoading(false);

    if (!response.ok) {
      alert(data);
      return;
    }

    alert("Đăng ký thành công!");
    navigate("/login");
  };

  return (
    <>
  

      <div className="register-page">
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

            <div className="register-card">
              <div className="card-header">
                <div className="icon">🍜</div>
                <h2>Đăng ký</h2>
                <p>Tạo tài khoản miễn phí ngay hôm nay!</p>
              </div>
              <div className="divider" />

              <form onSubmit={handleRegister}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tên đăng nhập</label>
                    <input
                      placeholder="Nhập username"
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

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input
                      type="tel"
                      placeholder="0xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <button className="btn-register" type="submit" disabled={loading}>
                  {loading ? "Đang xử lý..." : "Tạo tài khoản"}
                </button>
              </form>

              <div className="card-footer-note">
                Đã có tài khoản?{" "}
                <a onClick={() => navigate("/login")}>Đăng nhập ngay</a>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          © 2026 Phở Ẩm Thực — Guide System
        </footer>
      </div>
    </>
  );
}

export default Register;