import { Link2, MapPin, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFolders } from "../api/folders";
import { deletePhotoLink, getPhotos } from "../api/photos";
import type { Folder, Photo } from "../types";
import type { Project } from "../components/ui/3d-folder";
import { useViewerStore } from "../store/viewerStore";
import { AppLayout } from "../components/layout/AppLayout";
import { AnimatedFolder } from "../components/ui/3d-folder";
import { CreateFolderModal } from "../components/folders/CreateFolderModal";
import { FolderContentModal } from "../components/folders/FolderContentModal";
import { PhotoLightbox } from "../components/photos/PhotoLightbox";
import { AFrameScene } from "../components/viewer/AFrameScene";
import { LinkArrows } from "../components/viewer/LinkArrows";
import { LinkEditor } from "../components/viewer/LinkEditor";
import { NavigationArrows } from "../components/viewer/NavigationArrows";
import { ThumbnailStrip } from "../components/viewer/ThumbnailStrip";
import { Button } from "../components/ui/Button";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

/** Конвертирует наши Photo в Project для 3D-folder компонента */
function photosToProjects(photos: Photo[]): Project[] {
  return photos.map((p) => ({
    id: String(p.id),
    image: p.thumbnail || p.image,
    title: p.title,
  }));
}

/** Единый синий градиент для всех папок — в цвет сайта */
const FOLDER_GRADIENT = "linear-gradient(135deg, #3b82f6, #1d4ed8)";

export function UploadPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderPhotos, setFolderPhotos] = useState<Record<number, Photo[]>>({});
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Модалка содержимого папки
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);
  const [openFolderGradient, setOpenFolderGradient] = useState("");
  const [folderOriginRect, setFolderOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Лайтбокс для просмотра фото
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // 360° вьювер
  const [viewerOpen, setViewerOpen] = useState(false);
  const sceneRef = useRef<HTMLElement | null>(null);
  const {
    photos: viewerPhotos,
    currentIndex,
    links,
    linkEditMode,
    setPhotos: setViewerPhotos,
    goToId,
    fetchLinks,
    setLinkEditMode,
  } = useViewerStore();
  const currentViewerPhoto = viewerPhotos[currentIndex] ?? null;

  // Загрузить папки + превью фото для 3D карточек
  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const data = await getFolders();
      setFolders(data);
      const photosMap: Record<number, Photo[]> = {};
      await Promise.all(
        data.map(async (folder) => {
          if (folder.photo_count > 0) {
            try {
              const photos = await getPhotos(folder.id, 5);
              photosMap[folder.id] = photos;
            } catch {
              photosMap[folder.id] = [];
            }
          } else {
            photosMap[folder.id] = [];
          }
        })
      );
      setFolderPhotos(photosMap);
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, []);

  // Клик на фото — открываем лайтбокс
  const handlePhotoClick = useCallback(
    (_photo: Photo, index: number, allPhotos: Photo[]) => {
      setLightboxPhotos(allPhotos);
      setLightboxIndex(index);
      setLightboxOpen(true);
    },
    []
  );

  // Из лайтбокса — переход в 360° режим
  const handleView360 = useCallback(
    (photo: Photo, index: number) => {
      const viewerData = lightboxPhotos.map((p) => ({
        id: p.id,
        title: p.title,
        image: p.image,
        thumbnail: p.thumbnail,
        shot_date: p.shot_date,
      }));
      setViewerPhotos(viewerData, openFolder?.id ?? 0);
      useViewerStore.getState().goTo(index);
      setLightboxOpen(false);
      setViewerOpen(true);
    },
    [lightboxPhotos, openFolder, setViewerPhotos]
  );

  // Закрытие вьювера по Escape
  useEffect(() => {
    if (!viewerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewerOpen(false);
        setLinkEditMode(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerOpen]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
        {/* === Грид 3D папок === */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Папки</h1>
              <p className="text-[var(--text-secondary)] text-sm mt-1">
                Нажми на папку чтобы открыть
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} className="mr-2" />
              Новая папка
            </Button>
          </div>

          {loadingFolders ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size={40} />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-secondary)]">
              <p className="text-lg">Нет папок</p>
              <p className="text-sm mt-1">Создай первую папку для загрузки 360° фото</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 justify-items-center">
              {folders.map((folder, index) => {
                const photos = folderPhotos[folder.id] || [];
                const projects = photosToProjects(photos);

                const displayProjects =
                  projects.length > 0
                    ? projects
                    : [{ id: "empty", image: "", title: "Нет фото" }];

                const hasGps = !!(folder.latitude && folder.longitude);

                return (
                  <div
                    key={folder.id}
                    className="w-full cursor-pointer relative"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setFolderOriginRect({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
                      setOpenFolder(folder);
                      setOpenFolderGradient(FOLDER_GRADIENT);
                    }}
                  >
                    {/* GPS-метка */}
                    {hasGps && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs backdrop-blur-sm">
                        <MapPin size={12} />
                        GPS
                      </div>
                    )}
                    <AnimatedFolder
                      title={folder.name}
                      description={folder.description}
                      projects={displayProjects}
                      gradient={FOLDER_GRADIENT}
                      className="w-full"
                      onProjectClick={photos.length > 0 ? (photoIndex) => {
                        setOpenFolder(folder);
                        setLightboxPhotos(photos);
                        setLightboxIndex(photoIndex);
                        setLightboxOpen(true);
                      } : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Модалка создания папки */}
        <CreateFolderModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={loadFolders}
        />
      </div>

      {/* === Модалка содержимого папки === */}
      <FolderContentModal
        folder={openFolder}
        onClose={() => setOpenFolder(null)}
        onPhotoClick={handlePhotoClick}
        onPhotosChanged={loadFolders}
        gradient={openFolderGradient}
        originRect={folderOriginRect}
      />

      {/* === Лайтбокс фото === */}
      {lightboxOpen && lightboxPhotos.length > 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onView360={handleView360}
        />
      )}

      {/* === 360° Viewer оверлей с редактором связей === */}
      {viewerOpen && currentViewerPhoto && (
        <div className="fixed inset-0 z-[60] bg-black">
          <AFrameScene photoUrl={currentViewerPhoto.image} sceneRef={sceneRef} />

          {/* Кнопки: закрыть + связи */}
          <div className="absolute top-4 right-4 z-30 flex gap-2">
            <button
              onClick={() => setLinkEditMode(!linkEditMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm backdrop-blur-sm cursor-pointer transition-colors ${
                linkEditMode
                  ? "bg-orange-500/90 text-white"
                  : "bg-black/50 hover:bg-black/70 text-white"
              }`}
              title={linkEditMode ? "Выключить режим связей" : "Связать фото"}
            >
              <Link2 size={14} />
              {linkEditMode ? "Выйти" : "Связи"}
            </button>
            <button
              onClick={() => {
                setViewerOpen(false);
                setLinkEditMode(false);
              }}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all cursor-pointer"
              title="Закрыть (Esc)"
            >
              <X size={24} />
            </button>
          </div>

          {/* 3D стрелки хотспотов */}
          {links.length > 0 && (
            <LinkArrows
              sceneRef={sceneRef}
              links={links}
              onNavigate={(id) => goToId(id)}
              editMode={linkEditMode}
              onDeleteLink={async (linkId) => {
                try {
                  await deletePhotoLink(linkId);
                  fetchLinks();
                } catch (err) {
                  console.error("Ошибка удаления:", err);
                }
              }}
            />
          )}

          {/* Редактор связей */}
          {linkEditMode && (
            <LinkEditor
              sceneRef={sceneRef}
              photos={viewerPhotos}
              currentPhoto={currentViewerPhoto}
              links={links}
              onLinksChanged={fetchLinks}
            />
          )}

          {/* HTML стрелки — fallback когда нет хотспотов и не в режиме редактирования */}
          {links.length === 0 && !linkEditMode && <NavigationArrows />}

          <ThumbnailStrip />

          {/* Счётчик */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/50 text-white text-sm backdrop-blur-sm">
            {currentIndex + 1} / {viewerPhotos.length}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
