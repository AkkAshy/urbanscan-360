import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (message, type = "info") => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));

    // Автоматически убираем через 3.5 секунды
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Шорткаты для удобства */
export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, "success"),
  error: (msg: string) => useToastStore.getState().add(msg, "error"),
  info: (msg: string) => useToastStore.getState().add(msg, "info"),
};
