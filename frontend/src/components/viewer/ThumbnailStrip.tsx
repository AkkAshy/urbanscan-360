import { useEffect, useRef } from "react";
import { mediaUrl } from "../../api/client";
import { useViewerStore } from "../../store/viewerStore";

/**
 * Горизонтальная полоска превью фотографий.
 * Клик на превью — переход к этой фотографии.
 */
export function ThumbnailStrip() {
  const { photos, currentIndex, goTo } = useViewerStore();
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Автоскролл к активному thumbnail
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentIndex]);

  if (photos.length <= 1) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      >
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            ref={index === currentIndex ? activeRef : null}
            onClick={() => goTo(index)}
            className={`flex-shrink-0 w-16 h-10 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
              index === currentIndex
                ? "border-[var(--accent)] scale-110"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img
              src={mediaUrl(photo.thumbnail || photo.image)}
              alt={photo.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
