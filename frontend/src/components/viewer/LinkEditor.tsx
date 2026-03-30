import { Link2, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPhotoLink, deletePhotoLink } from "../../api/photos";
import type { PhotoLink, PhotoViewer } from "../../types";
import { useViewerStore } from "../../store/viewerStore";

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  photos: PhotoViewer[];
  currentPhoto: PhotoViewer;
  links: PhotoLink[];
  onLinksChanged: () => void;
}

/**
 * Редактор связей (хотспотов).
 * Режим: кликаешь на сцену → выбираешь куда ведёт → связь создаётся.
 */
export function LinkEditor({
  sceneRef,
  photos,
  currentPhoto,
  links,
  onLinksChanged,
}: Props) {
  const { setLinkEditMode } = useViewerStore();

  // Куда кликнул (yaw/pitch) — ожидает выбора фото
  const [placing, setPlacing] = useState<{ yaw: number; pitch: number } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // Фото доступные для линковки (кроме текущего и уже слинкованных)
  const linkedIds = new Set(links.map((l) => l.to_photo));
  const availablePhotos = photos.filter(
    (p) => p.id !== currentPhoto.id && !linkedIds.has(p.id)
  );

  // Клик по sky → получаем yaw/pitch из intersection point
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const sky = scene.querySelector("#photo-sky");
    if (!sky) return;

    // Добавляем clickable чтобы raycaster ловил
    sky.classList.add("clickable");

    const handleClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.intersection?.point) return;

      const { x, y, z } = detail.intersection.point;
      // Конвертация xyz на сфере → yaw/pitch
      let yaw = Math.atan2(x, -z) * (180 / Math.PI);
      if (yaw < 0) yaw += 360;
      const pitch =
        Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);

      setPlacing({ yaw, pitch });
    };

    sky.addEventListener("click", handleClick);
    return () => {
      sky.removeEventListener("click", handleClick);
      sky.classList.remove("clickable");
    };
  }, [sceneRef]);

  // Выбрать целевое фото и создать связь
  const handleSelectTarget = useCallback(
    async (targetId: number) => {
      if (!placing || saving) return;
      setSaving(true);
      try {
        await createPhotoLink(currentPhoto.id, targetId, placing.yaw, placing.pitch);
        setPlacing(null);
        onLinksChanged();
      } catch (err) {
        console.error("Ошибка создания связи:", err);
      } finally {
        setSaving(false);
      }
    },
    [placing, saving, currentPhoto.id, onLinksChanged]
  );

  // Быстрая кнопка: связать со следующим фото в списке
  const handleLinkNext = useCallback(async () => {
    if (!placing || saving) return;
    const currentIdx = photos.findIndex((p) => p.id === currentPhoto.id);
    const nextPhoto = photos[currentIdx + 1];
    if (nextPhoto) {
      await handleSelectTarget(nextPhoto.id);
    }
  }, [placing, saving, photos, currentPhoto.id, handleSelectTarget]);

  // Удалить связь
  const handleDeleteLink = useCallback(
    async (linkId: number) => {
      try {
        await deletePhotoLink(linkId);
        onLinksChanged();
      } catch (err) {
        console.error("Ошибка удаления связи:", err);
      }
    },
    [onLinksChanged]
  );

  return (
    <>
      {/* Панель управления — слева сверху */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
        {/* Заголовок режима */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/90 text-white text-sm backdrop-blur-sm">
          <Link2 size={14} />
          <span>Режим связей</span>
          <button
            onClick={() => setLinkEditMode(false)}
            className="ml-2 hover:bg-white/20 rounded p-0.5 cursor-pointer"
            title="Выйти"
          >
            <X size={14} />
          </button>
        </div>

        {/* Подсказка */}
        {!placing && (
          <div className="px-3 py-2 rounded-lg bg-black/60 text-white text-xs backdrop-blur-sm max-w-48">
            Кликни на дверь/проход в сцене, чтобы поставить стрелку
          </div>
        )}

        {/* Существующие связи */}
        {links.length > 0 && (
          <div className="px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs max-w-56">
            <p className="font-medium mb-1">Связи ({links.length}):</p>
            {links.map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-1 py-0.5">
                <span className="truncate">
                  {link.to_title || `Фото #${link.to_photo}`}
                </span>
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  className="flex-shrink-0 p-0.5 hover:bg-red-500/30 rounded cursor-pointer"
                  title="Удалить связь"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Панель выбора целевого фото — снизу */}
      {placing && (
        <div className="absolute bottom-16 left-0 right-0 z-30 px-4">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl p-3 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm font-medium">
                Куда ведёт? (yaw: {placing.yaw.toFixed(0)}°, pitch: {placing.pitch.toFixed(0)}°)
              </p>
              <div className="flex gap-2">
                {/* Быстрая кнопка: следующее фото */}
                {photos.findIndex((p) => p.id === currentPhoto.id) <
                  photos.length - 1 && (
                  <button
                    onClick={handleLinkNext}
                    disabled={saving}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/80 hover:bg-blue-500 text-white text-xs cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={12} />
                    Следующее
                  </button>
                )}
                <button
                  onClick={() => setPlacing(null)}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>

            {/* Список фото для выбора */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {availablePhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => handleSelectTarget(photo.id)}
                  disabled={saving}
                  className="flex-shrink-0 w-20 rounded-md overflow-hidden border-2 border-transparent hover:border-orange-400 transition-all cursor-pointer disabled:opacity-50"
                >
                  <img
                    src={photo.thumbnail || photo.image}
                    alt={photo.title}
                    className="w-full h-12 object-cover"
                    loading="lazy"
                  />
                  <p className="text-[10px] text-white text-center truncate px-1 py-0.5 bg-black/40">
                    {photo.title || `#${photo.id}`}
                  </p>
                </button>
              ))}
              {availablePhotos.length === 0 && (
                <p className="text-white/50 text-xs py-2">
                  Все фото уже привязаны
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
