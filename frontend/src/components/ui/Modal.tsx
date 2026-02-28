import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";

export interface OriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Класс ширины модалки (по умолчанию max-w-md) */
  widthClass?: string;
  /** Элемент рядом с заголовком (кнопки и т.д.) */
  headerAction?: ReactNode;
  /** Glassmorphism — полупрозрачный фон с блюром */
  glass?: boolean;
  /** Inline стили для контейнера модалки (для тинта цвета) */
  containerStyle?: CSSProperties;
  /** Позиция элемента-источника для анимации раскрытия */
  originRect?: OriginRect | null;
}

export function Modal({ open, onClose, title, children, widthClass = "max-w-md", headerAction, glass, containerStyle, originRect }: ModalProps) {
  const [animState, setAnimState] = useState<"entering" | "open" | "leaving" | "closed">("closed");
  const modalRef = useRef<HTMLDivElement>(null);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Анимация открытия / закрытия
  useEffect(() => {
    if (open) {
      setAnimState("entering");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimState("open");
        });
      });
    } else {
      // Запускаем анимацию закрытия, потом убираем из DOM
      setAnimState((prev) => {
        if (prev === "closed") return "closed";
        return "leaving";
      });
    }
  }, [open]);

  // После завершения анимации закрытия — убираем из DOM
  useEffect(() => {
    if (animState !== "leaving") return;
    const timer = setTimeout(() => setAnimState("closed"), 300);
    return () => clearTimeout(timer);
  }, [animState]);

  if (animState === "closed") return null;

  const containerClass = glass
    ? `backdrop-blur-2xl border rounded-2xl p-6 w-full ${widthClass} mx-4 overflow-y-auto shadow-2xl`
    : `bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 w-full ${widthClass} mx-4 max-h-[85vh] overflow-y-auto`;

  // Вычисляем transform для анимации от/к позиции папки
  const getTransformStyle = (): CSSProperties => {
    // Открытое состояние — нормальный размер
    if (!originRect || animState === "open") {
      return {
        transform: "scale(1) translate(0, 0)",
        opacity: 1,
        transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
      };
    }

    // Свёрнутая позиция (к папке)
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const originCenterX = originRect.x + originRect.width / 2;
    const originCenterY = originRect.y + originRect.height / 2;
    const deltaX = originCenterX - viewW / 2;
    const deltaY = originCenterY - viewH / 2;

    const collapsed = {
      transform: `scale(0.3) translate(${deltaX * 2}px, ${deltaY * 2}px)`,
      opacity: 0,
    };

    if (animState === "entering") {
      // Начальная позиция — без transition, чтобы сразу встать
      return { ...collapsed, transition: "none" };
    }

    // leaving — анимируем обратно к папке
    return {
      ...collapsed,
      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
    };
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-colors duration-300 pointer-events-auto ${
        animState === "open"
          ? glass ? "bg-black/30" : "bg-black/60"
          : "bg-black/0"
      }`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={containerClass}
        style={{ ...containerStyle, ...getTransformStyle() }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            {headerAction}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
