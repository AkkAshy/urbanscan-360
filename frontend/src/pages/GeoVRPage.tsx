import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFolderMapPoints, getFolder } from "../api/folders";
import { getViewerPhotos } from "../api/photos";
import { mediaUrl } from "../api/client";
import type { FloorPlan, FolderMapPoint } from "../types";
import { useViewerStore } from "../store/viewerStore";
import { AppLayout } from "../components/layout/AppLayout";
import { AFrameScene } from "../components/viewer/AFrameScene";
import { GeoVRRoom } from "../components/viewer/GeoVRRoom";
import { TourMinimap } from "../components/viewer/TourMinimap";
import { VRMinimap } from "../components/viewer/VRMinimap";
import { LinkArrows } from "../components/viewer/LinkArrows";

/**
 * Гео-VR пространство: гео-режим (папки по азимутам) ↔ 360-тур выбранной папки.
 * tourUrl === "" → гео-режим; иначе показываем 360-тур.
 * В туре — ТОЛЬКО навигация: мини-карта плана этажа (TourMinimap/VRMinimap) и
 * точки-переходы в сфере (LinkArrows, клик = переход к связанной панораме).
 * Создание/редактирование связей здесь НЕ делается — это только в Загрузках
 * (UploadPage). Гео-VR — просмотровое пространство.
 */
export function GeoVRPage() {
  const [folders, setFolders] = useState<FolderMapPoint[]>([]);
  const [tourUrl, setTourUrl] = useState("");
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const sceneRef = useRef<HTMLElement | null>(null);
  const {
    photos: viewerPhotos,
    currentIndex,
    links,
    setPhotos: setViewerPhotos,
    goToId,
  } = useViewerStore();
  const currentViewerPhoto = viewerPhotos[currentIndex] ?? null;

  useEffect(() => {
    getFolderMapPoints().then(setFolders).catch(() => setFolders([]));
  }, []);

  // Клик по папке в гео-комнате → грузим её фото + план → в 360-тур
  const handleSelect = useCallback(
    async (folder: FolderMapPoint) => {
      try {
        const [photos, full] = await Promise.all([
          getViewerPhotos(folder.id),
          getFolder(folder.id).catch(() => null),
        ]);
        if (photos.length === 0) return;
        const viewerData = photos.map((p) => ({
          id: p.id,
          title: p.title,
          image: mediaUrl(p.image),
          thumbnail: p.thumbnail,
          preview: p.preview ? mediaUrl(p.preview) : null,
          shot_date: p.shot_date,
          latitude: p.latitude,
          longitude: p.longitude,
          map_x: p.map_x,
          map_y: p.map_y,
          floor: p.floor,
        }));
        setFloorPlans(full?.floor_plans ?? []);
        setViewerPhotos(viewerData, folder.id);
        useViewerStore.getState().goTo(0);
        const first = viewerData[0];
        setTourUrl(mediaUrl(first.preview || first.image));
      } catch (err) {
        console.error("Гео-VR: не удалось открыть тур:", err);
      }
    },
    [setViewerPhotos]
  );

  const backToGeo = useCallback(() => {
    setTourUrl("");
    setFloorPlans([]);
  }, []);

  return (
    <AppLayout>
      <div className="fixed inset-0 z-[60] bg-black">
        <AFrameScene
          photoUrl={
            tourUrl === ""
              ? ""
              : currentViewerPhoto
                ? mediaUrl(currentViewerPhoto.preview || currentViewerPhoto.image)
                : tourUrl
          }
          sceneRef={sceneRef}
          onExit={backToGeo}
        />

        {/* Гео-режим: комната с папками по азимутам */}
        {tourUrl === "" && (
          <GeoVRRoom sceneRef={sceneRef} folders={folders} onSelect={handleSelect} />
        )}

        {/* 360-тур: только навигация — мини-карта + точки-переходы (без редактора) */}
        {tourUrl !== "" && currentViewerPhoto && (
          <>
            {/* Навигация: мини-карта плана этажа (десктоп-оверлей + VR-HUD) */}
            <TourMinimap
              floorPlans={floorPlans}
              photos={viewerPhotos}
              currentId={currentViewerPhoto.id}
              onNavigate={goToId}
              sceneRef={sceneRef}
            />
            <VRMinimap
              sceneRef={sceneRef}
              floorPlans={floorPlans}
              photos={viewerPhotos}
              currentId={currentViewerPhoto.id}
              onNavigate={goToId}
            />

            {/* Точки-переходы прямо в сфере: клик = переход к связанной панораме */}
            <LinkArrows sceneRef={sceneRef} links={links} onNavigate={goToId} />
          </>
        )}

        {/* Кнопка «назад» — аварийный выход, работает и в VR */}
        {tourUrl !== "" && (
          <div className="absolute top-4 left-4 z-30 flex gap-2">
            <button
              onClick={backToGeo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} />
              К карте объектов
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
