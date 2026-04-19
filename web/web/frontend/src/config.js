// Dynamic API Base URL - tự detect ngrok hoặc localhost
const getApiBase = () => {
  // Nếu đang chạy trên ngrok/production, dùng cùng origin
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return window.location.origin;
  }
  // Localhost dev mode
  return "http://localhost:6050";
};

export const API_BASE = getApiBase();
export const API = API_BASE;
