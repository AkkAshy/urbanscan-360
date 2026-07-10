import { ArrowLeft, Link2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFolderMapPoints, getFolder } from "../api/folders";
import { getViewerPhotos, deletePhotoLink } from "../api/photos";
import { mediaUrl } from "../api/client";
import type { FloorPlan, FolderMapPoint } from "../types";
import { useViewerStore } from "../store/viewerStore";
import { AppLayout } from "../components/layout/AppLayout";
import { AFrameScene } from "../components/viewer/AFrameScene";
import { GeoVRRoom } from "../components/viewer/GeoVRRoom";
import { TourMinimap } from "../components/viewer/TourMinimap";
import { VRMinimap } from "../components/viewer/VRMinimap";
import { LinkArrows } from "../components/viewer/LinkArrows";
import { LinkEditor } from "../components/viewer/LinkEditor";
import { VRMenu } from "../components/viewer/vr/VRMenu";
import { VRLinkPlacer } from "../components/viewer/vr/VRLinkPlacer";
import { VRPhotoPicker } from "../components/viewer/vr/VRPhotoPicker";

/**
 * Гео-VR пространство: гео-режим (папки по азимутам) ↔ 360-тур выбранной папки.
 * tourUrl === "" → гео-режим; иначе показываем 360-тур.
 * Навигация в туре — двумя способами: мини-карта плана этажа (точки-панорамы)
 * и хотспоты-метки прямо в сфере (LinkArrows по связям PhotoLink).
 * В режиме «Связи» доступно создание/удаление хотспотов — на десктопе
 * (LinkEditor) и в VR (VRMenu / VRLinkPlacer / VRPhotoPicker).
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
    linkEditMode,
    vrActive,
    vrPlacing,
    setPhotos: setViewerPhotos,
    goToId,
    fetchLinks,
    setLinkEditMode,
  } = useViewerStore();
  const currentViewerPhoto = viewerPhotos[currentIndex] ?? null;

  useEffect(() => {
    // Вход в гео-VR — всегда режим ПРОСМОТРА (не редактирования связей).
    // Иначе клики/луч случайно создают/удаляют связи, а метки жёлтые.
    setLinkEditMode(false);
    getFolderMapPoints().then(setFolders).catch(() => setFolders([]));
  }, [setLinkEditMode]);

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
        setLinkEditMode(false); // тур открывается в режиме просмотра
        setFloorPlans(full?.floor_plans ?? []);
        setViewerPhotos(viewerData, folder.id);
        useViewerStore.getState().goTo(0);
        const first = viewerData[0];
        setTourUrl(mediaUrl(first.preview || first.image));
      } catch (err) {
        console.error("Гео-VR: не удалось открыть тур:", err);
      }
    },
    [setViewerPhotos, setLinkEditMode]
  );

  const backToGeo = useCallback(() => {
    setTourUrl("");
    setFloorPlans([]);
    setLinkEditMode(false);
  }, [setLinkEditMode]);

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

        {/* 360-тур: навигация (мини-карта + точки) + редактор связей */}
        {tourUrl !== "" && currentViewerPhoto && (
          <>
            {/* VR-инструменты связей: меню, постановка точки лучом, выбор цели */}
            {vrActive && <VRMenu sceneRef={sceneRef} />}
            {vrActive && (
              <VRLinkPlacer
                sceneRef={sceneRef}
                arming={linkEditMode && vrPlacing === null}
              />
            )}
            {vrActive && vrPlacing && (
              <VRPhotoPicker
                sceneRef={sceneRef}
                photos={viewerPhotos}
                currentPhoto={currentViewerPhoto}
                links={links}
                onLinksChanged={fetchLinks}
              />
            )}

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

            {/* Точки-хотспоты прямо в сфере: клик = переход; в режиме связей = удаление */}
            <LinkArrows
              sceneRef={sceneRef}
              links={links}
              onNavigate={goToId}
              editMode={linkEditMode}
              onDeleteLink={async (linkId) => {
                try {
                  await deletePhotoLink(linkId);
                  fetchLinks();
                } catch (err) {
                  console.error("Ошибка удаления связи:", err);
                }
              }}
            />

            {/* Десктопный редактор связей (клик по сцене → выбор целевого фото) */}
            {!vrActive && linkEditMode && (
              <LinkEditor
                sceneRef={sceneRef}
                photos={viewerPhotos}
                currentPhoto={currentViewerPhoto}
                links={links}
                onLinksChanged={fetchLinks}
              />
            )}
          </>
        )}

        {/* Кнопки тура: назад (всегда — аварийный выход и в VR) + «Связи» (десктоп) */}
        {tourUrl !== "" && (
          <div className="absolute top-4 left-4 z-30 flex gap-2">
            <button
              onClick={backToGeo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} />
              К карте объектов
            </button>
            {!vrActive && (
              <button
                onClick={() => setLinkEditMode(!linkEditMode)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm backdrop-blur-sm cursor-pointer transition-colors ${
                  linkEditMode
                    ? "bg-orange-500/90 text-white"
                    : "bg-black/60 hover:bg-black/80 text-white"
                }`}
                title={linkEditMode ? "Выключить режим связей" : "Связать панорамы"}
              >
                <Link2 size={14} />
                {linkEditMode ? "Выйти из связей" : "Связи"}
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
