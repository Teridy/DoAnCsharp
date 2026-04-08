import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Home.css";
function Home() {
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();



  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <>
      
      <div className="home-page">
        {/* NAVBAR */}
        <nav className="navbar">
          <div className="navbar-brand" onClick={() => navigate("/")}>
            🍜 Phố Ẩm Thực
          </div>

          <div className="navbar-actions">
            {!isLoggedIn ? (
              <>
                <button
                  className="btn-outline"
                  onClick={() => navigate("/login")}
                >
                  Đăng nhập
                </button>

                <button
                  className="btn-primary"
                  onClick={() => navigate("/register")}
                >
                  Đăng ký
                </button>
              </>
            ) : (
              <button className="btn-danger" onClick={handleLogout}>
                Đăng xuất
              </button>
            )}
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-overlay" />
          <div className="hero-text">
            <h1>Khám Phá Phố Ẩm Thực</h1>
            <p>Hệ thống thuyết minh cho từng địa điểm</p>
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

export default Home;