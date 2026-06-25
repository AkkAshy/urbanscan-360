import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFolderMapPoints } from "../api/folders";
import { getViewerPhotos } from "../api/photos";
import { mediaUrl } from "../api/client";
import type { FolderMapPoint } from "../types";
import { useViewerStore } from "../store/viewerStore";
import { AppLayout } from "../components/layout/AppLayout";
import { AFrameScene } from "../components/viewer/AFrameScene";
import { GeoVRRoom } from "../components/viewer/GeoVRRoom";
import { LinkArrows } from "../components/viewer/LinkArrows";
import { VRMenu } from "../components/viewer/vr/VRMenu";

/**
 * Гео-VR пространство: гео-режим (папки по азимутам) ↔ 360-тур выбранной папки.
 * tourUrl === "" → гео-режим; иначе показываем 360-тур.
 */
export function GeoVRPage() {
  const [folders, setFolders] = useState<FolderMapPoint[]>([]);
  const [tourUrl, setTourUrl] = useState("");
  const sceneRef = useRef<HTMLElement | null>(null);
  const {
    photos: viewerPhotos,
    currentIndex,
    links,
    vrActive,
    setPhotos: setViewerPhotos,
    goToId,
  } = useViewerStore();
  const currentViewerPhoto = viewerPhotos[currentIndex] ?? null;

  useEffect(() => {
    getFolderMapPoints().then(setFolders).catch(() => setFolders([]));
  }, []);

  // Клик по папке в гео-комнате → грузим её фото → в 360-тур
  const handleSelect = useCallback(
    async (folder: FolderMapPoint) => {
      try {
        const photos = await getViewerPhotos(folder.id);
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
        }));
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

  const backToGeo = useCallback(() => setTourUrl(""), []);

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

        {/* 360-тур: стрелки-хотспоты + VR-меню */}
        {tourUrl !== "" && currentViewerPhoto && (
          <>
            <LinkArrows sceneRef={sceneRef} links={links} onNavigate={goToId} />
            {vrActive && <VRMenu sceneRef={sceneRef} />}
          </>
        )}

        {/* HTML-кнопка «назад в гео» (десктоп; в VR — кнопка B / Выход).
            Без !vrActive: если VR-сессия отвалится, кнопка остаётся аварийным выходом. */}
        {tourUrl !== "" && (
          <button
            onClick={backToGeo}
            className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            К карте объектов
          </button>
        )}
      </div>
    </AppLayout>
  );
}
