import { useEffect } from "react";
import { mediaUrl } from "../../../api/client";
import { createPhotoLink } from "../../../api/photos";
import { useViewerStore } from "../../../store/viewerStore";
import { yawPitchToXyz } from "../../../utils/sphere";
import type { PhotoViewer, PhotoLink } from "../../../types";

// VR-эргономика дуги превью
const EYE_LEVEL = 1.6; // высота глаз, м
const ARC_RADIUS = 3; // радиус дуги, м
const TILE_W = 0.8; // ширина превью, м
const TILE_H = 0.5; // высота превью, м

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  photos: PhotoViewer[];
  currentPhoto: PhotoViewer;
  links: PhotoLink[];
  onLinksChanged: () => void;
}

/**
 * In-scene выбор целевого фото при создании связи в VR.
 * Превью располагаются дугой перед пользователем; клик создаёт PhotoLink.
 */
export function VRPhotoPicker({
  sceneRef,
  photos,
  currentPhoto,
  links,
  onLinksChanged,
}: Props) {
  const { vrPlacing, setVrPlacing } = useViewerStore();

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !vrPlacing) return;

    const linkedIds = new Set(links.map((l) => l.to_photo));
    const available = photos.filter(
      (p) => p.id !== currentPhoto.id && !linkedIds.has(p.id)
    );

    const container = document.createElement("a-entity");
    scene.appendChild(container);

    if (available.length === 0) {
      const empty = document.createElement("a-text");
      empty.setAttribute("value", "Все фото уже привязаны");
      empty.setAttribute("align", "center");
      empty.setAttribute("color", "#FFFFFF");
      empty.setAttribute("width", "4");
      empty.setAttribute("position", `0 ${EYE_LEVEL} -${ARC_RADIUS}`);
      container.appendChild(empty);
    }

    // Адаптивный шаг: дуга всегда укладывается в ±90°
    const spread = Math.min(18, 180 / Math.max(available.length, 1));

    // Дуга превью на уровне глаз, радиус ARC_RADIUS м
    available.forEach((photo, i) => {
      const yaw = (i - (available.length - 1) / 2) * spread;
      const { x, y, z } = yawPitchToXyz(yaw < 0 ? yaw + 360 : yaw, 0, ARC_RADIUS);

      const tile = document.createElement("a-image");
      tile.setAttribute("src", mediaUrl(photo.thumbnail || photo.image));
      tile.setAttribute("width", String(TILE_W));
      tile.setAttribute("height", String(TILE_H));
      tile.setAttribute("position", `${x} ${EYE_LEVEL + y} ${z}`);
      tile.setAttribute("screen-facing", "");
      tile.setAttribute("material", "shader: flat; side: double");
      tile.classList.add("clickable");

      const caption = document.createElement("a-text");
      caption.setAttribute("value", photo.title || `#${photo.id}`);
      caption.setAttribute("align", "center");
      caption.setAttribute("color", "#FFFFFF");
      caption.setAttribute("width", "2");
      caption.setAttribute("position", "0 -0.35 0");
      tile.appendChild(caption);

      tile.addEventListener("click", async () => {
        if (!vrPlacing) return;
        try {
          await createPhotoLink(currentPhoto.id, photo.id, vrPlacing.yaw, vrPlacing.pitch);
          setVrPlacing(null);
          onLinksChanged();
        } catch (err) {
          console.error("VR: ошибка создания связи:", err);
        }
      });

      container.appendChild(tile);
    });

    return () => {
      container.parentNode?.removeChild(container);
    };
  }, [sceneRef, vrPlacing, photos, currentPhoto, links, onLinksChanged, setVrPlacing]);

  return null;
}
