import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastType } from "../../store/toastStore";

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: "text-green-400 bg-green-500/10 border-green-500/30",
  error: "text-red-400 bg-red-500/10 border-red-500/30",
  info: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-slide-in-right ${colors[t.type]}`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm text-white/90">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="ml-2 p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/70 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
