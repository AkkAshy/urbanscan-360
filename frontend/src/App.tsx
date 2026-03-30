import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { UploadPage } from "./pages/UploadPage";
import { MapPage } from "./pages/MapPage";
import { ToastContainer } from "./components/ui/ToastContainer";

function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  // При старте приложения пытаемся загрузить юзера по токену
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />
        {/* Редирект на загрузку по умолчанию */}
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
