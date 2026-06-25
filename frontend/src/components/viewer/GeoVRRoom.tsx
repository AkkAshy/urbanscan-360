import { useEffect } from "react";
import { OFFICE_COORDS } from "../../config/office";
import { bearing, haversineKm } from "../../utils/geo";
import { yawPitchToXyz } from "../../utils/sphere";
import type { FolderMapPoint } from "../../types";

const ROOM_RADIUS = 6;
const EYE_LEVEL = 1.6;

/** Папка с подгруженным превью первого фото — для карточки в гео-комнате. */
export interface FolderCard extends FolderMapPoint {
  thumbUrl: string | null;
}

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  folders: FolderCard[];
  onSelect: (folder: FolderCard) => void;
}

/**
 * In-scene «гео-комната»: для каждой папки с GPS ставит карточку-превью на
 * азимуте bearing(офис → объект) вокруг камеры. Клик/луч → onSelect.
 * Карточка = превью первого фото (растр рендерится надёжно) + рамка + подпись.
 */
export function GeoVRRoom({ sceneRef, folders, onSelect }: Props) {
  useEffect(() => {
    const scene = sceneRef.current as
      | (HTMLElement & { hasLoaded?: boolean })
      | null;
    if (!scene) return;

    let container: HTMLElement | null = null;

    // Строим карточки только когда A-Frame сцена загружена — иначе текстуры
    // a-image / SDF-текст не инициализируются в недогруженной сцене.
    const build = () => {
      container = document.createElement("a-entity");
      scene.appendChild(container);

      const withGps = folders.filter(
        (f): f is FolderCard & { latitude: number; longitude: number } =>
          f.latitude != null && f.longitude != null
      );

      if (withGps.length === 0) {
        const empty = document.createElement("a-text");
        empty.setAttribute("value", "Нет объектов с GPS");
        empty.setAttribute("align", "center");
        empty.setAttribute("color", "#FFFFFF");
        empty.setAttribute("width", "4");
        empty.setAttribute("position", `0 ${EYE_LEVEL} -${ROOM_RADIUS}`);
        container.appendChild(empty);
        return;
      }

      withGps.forEach((f) => {
        const target = { lat: f.latitude, lon: f.longitude };
        const az = bearing(OFFICE_COORDS, target);
        const dist = haversineKm(OFFICE_COORDS, target);
        const { x, y, z } = yawPitchToXyz(az, 0, ROOM_RADIUS);

        const card = document.createElement("a-entity");
        card.setAttribute("position", `${x} ${EYE_LEVEL + y} ${z}`);
        card.setAttribute("billboard", "");
        card.classList.add("clickable");

        // Белая рамка-подложка под превью (контраст на тёмном небе)
        const border = document.createElement("a-plane");
        border.setAttribute("width", "1.94");
        border.setAttribute("height", "1.34");
        border.setAttribute("color", "#FFFFFF");
        border.setAttribute("material", "shader: flat");
        border.setAttribute("position", "0 0.12 -0.02");
        card.appendChild(border);

        // Превью объекта (растровый thumbnail). Нет фото → синяя заглушка.
        const preview = document.createElement(f.thumbUrl ? "a-image" : "a-plane");
        if (f.thumbUrl) preview.setAttribute("src", f.thumbUrl);
        else preview.setAttribute("color", "#2563eb");
        preview.setAttribute("width", "1.8");
        preview.setAttribute("height", "1.2");
        preview.setAttribute("position", "0 0.12 0");
        preview.setAttribute("material", "shader: flat");
        preview.classList.add("clickable");
        card.appendChild(preview);

        // Тёмная плашка под превью + подпись
        const labelBg = document.createElement("a-plane");
        labelBg.setAttribute("width", "1.94");
        labelBg.setAttribute("height", "0.46");
        labelBg.setAttribute("color", "#0b1020");
        labelBg.setAttribute("material", "shader: flat; opacity: 0.95");
        labelBg.setAttribute("position", "0 -0.78 0");
        card.appendChild(labelBg);

        const label = document.createElement("a-text");
        label.setAttribute(
          "value",
          `${f.name}\n${f.photo_count} фото · ${Math.round(dist)} км`
        );
        label.setAttribute("align", "center");
        label.setAttribute("color", "#FFFFFF");
        label.setAttribute("width", "3");
        label.setAttribute("position", "0 -0.78 0.02");
        card.appendChild(label);

        card.addEventListener("click", () => onSelect(f));
        container!.appendChild(card);
      });
    };

    if (scene.hasLoaded) build();
    else scene.addEventListener("loaded", build, { once: true });

    return () => {
      scene.removeEventListener("loaded", build);
      container?.parentNode?.removeChild(container);
    };
  }, [sceneRef, folders, onSelect]);

  return null;
}
