import { create } from "zustand";
import { login as apiLogin, getMe } from "../api/auth";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Залогиниться */
  login: (username: string, password: string) => Promise<void>;
  /** Выйти */
  logout: () => void;
  /** Загрузить текущего пользователя по токену */
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const data = await apiLogin(username, password);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    set({ user: data.user });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await getMe();
      set({ user, loading: false });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, loading: false });
    }
  },
}));
