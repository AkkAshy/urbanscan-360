import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { useEffect, useState } from "react";
import { mediaUrl } from "../../api/client";
import type { Photo } from "../../types";

interface Props {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  /** Переключиться в 360° режим */
  onView360?: (photo: Photo, index: number) => void;
}

/**
 * Полноэкранный лайтбокс для просмотра фото.
 * Навигация стрелками, кнопка X для закрытия, кнопка 360° для A-Frame.
 */
export function PhotoLightbox({ photos, currentIndex, onClose, onView360 }: Props) {
  const [index, setIndex] = useState(currentIndex);
  const photo = photos[index];

  // Синхронизируем при открытии нового фото
  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  // Клавиатурная навигация
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) setIndex(index + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, photos.length, onClose]);

  if (!photo) return null;

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      {/* Фото на весь экран */}
      <img
        src={mediaUrl(photo.image)}
        alt={photo.title}
        className="max-w-full max-h-full object-contain select-none"
      />

      {/* Кнопка закрытия */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all cursor-pointer"
      >
        <X size={24} />
      </button>

      {/* Кнопка 360° режима */}
      {onView360 && (
        <button
          onClick={() => onView360(photo, index)}
          className="absolute top-4 right-16 z-10 flex items-center gap-2 px-3 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all cursor-pointer text-sm font-medium"
        >
          <Eye size={18} />
          360°
        </button>
      )}

      {/* Название фото */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-center">
        <p className="text-white font-medium text-sm drop-shadow-lg">{photo.title}</p>
        <p className="text-white/50 text-xs mt-1">{index + 1} / {photos.length}</p>
      </div>

      {/* Стрелка влево */}
      {hasPrev && (
        <button
          onClick={() => setIndex(index - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all cursor-pointer"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Стрелка вправо */}
      {hasNext && (
        <button
          onClick={() => setIndex(index + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all cursor-pointer"
        >
          <ChevronRight size={28} />
        </button>
      )}
    </div>
  );
}
