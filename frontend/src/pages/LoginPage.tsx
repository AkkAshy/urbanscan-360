import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/Button";
import { Eye, EyeOff } from "lucide-react";

export function LoginPage() {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Уже залогинен — редирект
  if (user) return <Navigate to="/upload" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/upload");
    } catch {
      setError("Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Логотип */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--accent)]">
            UrbanScan 360
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-2">
            Просмотр 360° фотографий
          </p>
        </div>

        {/* Форма */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[var(--danger)] text-sm">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  );
}
