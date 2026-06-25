import { useEffect } from "react";
import { OFFICE_COORDS } from "../../config/office";
import { bearing, haversineKm } from "../../utils/geo";
import { yawPitchToXyz } from "../../utils/sphere";
import type { FolderMapPoint } from "../../types";

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  folders: FolderMapPoint[];
  onSelect: (folder: FolderMapPoint) => void;
}

const ROOM_RADIUS = 6;
const EYE_LEVEL = 1.6;

/**
 * In-scene «гео-комната»: для каждой папки с GPS ставит карточку на азимуте
 * bearing(офис → объект) вокруг камеры. Клик/луч → onSelect.
 */
export function GeoVRRoom({ sceneRef, folders, onSelect }: Props) {
  useEffect(() => {
    const scene = sceneRef.current as
      | (HTMLElement & { hasLoaded?: boolean })
      | null;
    if (!scene) return;

    let container: HTMLElement | null = null;

    // Карточки строим ТОЛЬКО когда A-Frame сцена загружена — иначе a-text
    // (SDF-шрифт) не рендерится в недоинициализированной сцене.
    const build = () => {
      container = document.createElement("a-entity");
      scene.appendChild(container);

      const withGps = folders.filter(
        (f): f is FolderMapPoint & { latitude: number; longitude: number } =>
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

      // Известное ограничение: объекты с совпадающим азимутом от офиса
      // накладываются (одинаковый x/y/z). Для прототипа ОК; mitigation потом —
      // stagger по высоте/радиусу на основе индекса внутри группы.
      withGps.forEach((f) => {
        const target = { lat: f.latitude, lon: f.longitude };
        const az = bearing(OFFICE_COORDS, target);
        const dist = haversineKm(OFFICE_COORDS, target);
        const { x, y, z } = yawPitchToXyz(az, 0, ROOM_RADIUS);

        const card = document.createElement("a-entity");
        card.setAttribute("position", `${x} ${EYE_LEVEL + y} ${z}`);
        card.setAttribute("look-at", "[camera]");
        card.classList.add("clickable");

        // Светлая рамка-подложка — контраст на тёмном небе
        const border = document.createElement("a-plane");
        border.setAttribute("width", "1.94");
        border.setAttribute("height", "1.34");
        border.setAttribute("color", "#FFFFFF");
        border.setAttribute("material", "shader: flat");
        border.setAttribute("position", "0 0 -0.02");
        card.appendChild(border);

        // Яркая карточка (акцентный синий)
        const plane = document.createElement("a-plane");
        plane.setAttribute("width", "1.8");
        plane.setAttribute("height", "1.2");
        plane.setAttribute("color", "#2563eb");
        plane.setAttribute("material", "shader: flat");
        plane.classList.add("clickable");
        card.appendChild(plane);

        const label = document.createElement("a-text");
        label.setAttribute("value", `${f.name}\n${Math.round(dist)} км`);
        label.setAttribute("align", "center");
        label.setAttribute("color", "#FFFFFF");
        label.setAttribute("width", "3");
        label.setAttribute("position", "0 0 0.05");
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
