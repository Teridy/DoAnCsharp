import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Register from "./Register";

import AdminDashboard from "./admin/AdminDashboard";
import SellerDashboard from "./seller/SellerDashboard";
import ProtectedRoute from "./ProtectedRoute";
function App() {
  return (
    <Routes>

      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="Admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Seller route */}
      <Route
        path="/seller"
        element={
          <ProtectedRoute allowedRole="Seller">
            <SellerDashboard />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}

export default App;