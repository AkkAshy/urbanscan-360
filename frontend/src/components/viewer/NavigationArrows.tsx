import { ChevronLeft, ChevronRight } from "lucide-react";
import { useViewerStore } from "../../store/viewerStore";

/**
 * Стрелки навигации — вперёд/назад по фотографиям.
 * Оверлей поверх A-Frame сцены.
 */
export function NavigationArrows() {
  const { currentIndex, photos, next, prev } = useViewerStore();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  return (
    <>
      {/* Стрелка влево */}
      {hasPrev && (
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all cursor-pointer"
          title="Предыдущее фото"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Стрелка вправо */}
      {hasNext && (
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all cursor-pointer"
          title="Следующее фото"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Счётчик фото */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/50 text-white text-sm backdrop-blur-sm">
        {currentIndex + 1} / {photos.length}
      </div>
    </>
  );
}
