import { LogOut, Map, Upload, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const links = [
    { to: "/upload", label: "Загрузка", icon: Upload },
    { to: "/map", label: "Карта", icon: Map },
  ];

  // Ссылка на управление юзерами — только для админа
  if (user?.role === "admin") {
    links.push({ to: "/users", label: "Пользователи", icon: Users });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-4 gap-6">
      {/* Логотип */}
      <Link to="/upload" className="text-lg font-bold text-[var(--accent)]">
        UrbanScan 360
      </Link>

      {/* Навигация */}
      <div className="flex gap-1 ml-4">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              location.pathname === to
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>

      {/* Юзер + Выход */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-[var(--text-secondary)]">
          {user?.username}{" "}
          <span className="text-xs opacity-60">({user?.role})</span>
        </span>
        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-pointer"
          title="Выйти"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
