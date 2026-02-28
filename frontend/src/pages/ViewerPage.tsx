import { ChevronDown, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getFolders } from "../api/folders";
import { getViewerPhotos } from "../api/photos";
import type { Folder } from "../types";
import { useViewerStore } from "../store/viewerStore";
import { AppLayout } from "../components/layout/AppLayout";
import { AFrameScene } from "../components/viewer/AFrameScene";
import { NavigationArrows } from "../components/viewer/NavigationArrows";
import { ThumbnailStrip } from "../components/viewer/ThumbnailStrip";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function ViewerPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const { photos, folderId, currentIndex, setPhotos } = useViewerStore();
  const currentPhoto = photos[currentIndex] ?? null;

  // Загружаем список папок
  useEffect(() => {
    getFolders().then(setFolders);
  }, []);

  // Выбрать папку и загрузить фото
  const selectFolder = useCallback(
    async (id: number) => {
      if (id === folderId) {
        setShowFolderPicker(false);
        return;
      }
      setLoading(true);
      setShowFolderPicker(false);
      try {
        const data = await getViewerPhotos(id);
        setPhotos(data, id);
      } finally {
        setLoading(false);
      }
    },
    [folderId, setPhotos]
  );

  // Автозагрузка первой папки если есть
  useEffect(() => {
    if (folders.length > 0 && !folderId) {
      selectFolder(folders[0].id);
    }
  }, [folders]);

  const selectedFolder = folders.find((f) => f.id === folderId);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] relative">
        {/* Выбор папки — оверлей сверху */}
        <div className="absolute top-4 right-4 z-30">
          <button
            onClick={() => setShowFolderPicker(!showFolderPicker)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 hover:bg-black/70 text-white text-sm backdrop-blur-sm cursor-pointer"
          >
            <Eye size={14} />
            {selectedFolder?.name || "Выбери папку"}
            <ChevronDown size={14} />
          </button>

          {/* Dropdown папок */}
          {showFolderPicker && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => selectFolder(folder.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                    folder.id === folderId
                      ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                      : "hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                  }`}
                >
                  {folder.name}
                  <span className="text-xs text-[var(--text-secondary)] ml-2">
                    ({folder.photo_count} фото)
                  </span>
                </button>
              ))}
              {folders.length === 0 && (
                <p className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  Нет папок
                </p>
              )}
            </div>
          )}
        </div>

        {/* Контент */}
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner size={40} />
          </div>
        ) : currentPhoto ? (
          <>
            {/* A-Frame 360° сцена */}
            <AFrameScene photoUrl={currentPhoto.image} />

            {/* Стрелки навигации */}
            <NavigationArrows />

            {/* Превью-полоска */}
            <ThumbnailStrip />
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
            <Eye size={48} className="mb-4 opacity-30" />
            <p className="text-lg">
              {folders.length === 0
                ? "Нет папок с фотографиями"
                : "Выбери папку для просмотра"}
            </p>
            <p className="text-sm mt-1">
              Загрузи 360° фото на странице "Загрузка"
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
