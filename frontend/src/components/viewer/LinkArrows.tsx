import { useEffect, useRef } from "react";
import type { PhotoLink } from "../../types";

/** Расстояние стрелок от центра сцены */
const ARROW_RADIUS = 8;

/** SVG стрелки — классическая стрелка "вниз" (иди сюда) */
function makeArrowSvg(fillColor: string, strokeColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
    <path d="M50 115 L5 55 L30 55 L30 5 L70 5 L70 55 L95 55 Z"
          fill="${fillColor}" stroke="${strokeColor}" stroke-width="3"
          stroke-linejoin="round"/>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  links: PhotoLink[];
  onNavigate: (photoId: number) => void;
  /** Режим редактирования — клик по стрелке удаляет связь */
  editMode?: boolean;
  onDeleteLink?: (linkId: number) => void;
}

/**
 * Навигационные стрелки внутри A-Frame 360° сцены.
 * SVG стрелка на прозрачной плоскости, billboard-стиль (всегда лицом к камере).
 * Позиция определяется yaw/pitch из PhotoLink.
 */
export function LinkArrows({
  sceneRef,
  links,
  onNavigate,
  editMode,
  onDeleteLink,
}: Props) {
  const arrowsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Удаляем старые стрелки
    arrowsRef.current.forEach((el) => el.parentNode?.removeChild(el));
    arrowsRef.current = [];

    // Цвета: синий (как на сайте) / оранжевый (редактирование)
    const fill = editMode ? "#FF7043" : "#3b82f6";
    const stroke = editMode ? "#BF360C" : "#1d4ed8";
    const arrowSrc = makeArrowSvg(fill, stroke);

    links.forEach((link) => {
      const yawRad = (link.yaw * Math.PI) / 180;
      const pitchRad = (link.pitch * Math.PI) / 180;
      const hR = Math.cos(pitchRad) * ARROW_RADIUS;

      const x = Math.sin(yawRad) * hR;
      const y = Math.sin(pitchRad) * ARROW_RADIUS;
      const z = -Math.cos(yawRad) * hR;

      // Контейнер — billboard (всегда смотрит на камеру)
      const arrow = document.createElement("a-entity");
      arrow.setAttribute("position", `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
      arrow.setAttribute("look-at", "[camera]");
      arrow.classList.add("clickable");
      arrow.dataset.linkId = String(link.id);
      arrow.dataset.toPhoto = String(link.to_photo);

      // Стрелка — SVG на прозрачной плоскости
      const img = document.createElement("a-image");
      img.setAttribute("src", arrowSrc);
      img.setAttribute("width", "1.3");
      img.setAttribute("height", "1.56"); // пропорции 100:120
      img.setAttribute("material", "transparent: true; alphaTest: 0.1; shader: flat; side: double");
      img.classList.add("clickable");

      // Подпись — название целевого фото
      const label = document.createElement("a-text");
      const displayTitle = link.to_title || `Фото #${link.to_photo}`;
      label.setAttribute("value", editMode ? `[X] ${displayTitle}` : displayTitle);
      label.setAttribute("align", "center");
      label.setAttribute("color", editMode ? "#FF7043" : "#FFFFFF");
      label.setAttribute("width", "4");
      label.setAttribute("position", "0 1.1 0");

      arrow.appendChild(img);
      arrow.appendChild(label);
      scene.appendChild(arrow);
      arrowsRef.current.push(arrow);

      // Клик: навигация или удаление связи
      arrow.addEventListener("click", () => {
        if (editMode && onDeleteLink) {
          onDeleteLink(link.id);
        } else {
          onNavigate(link.to_photo);
        }
      });
    });

    return () => {
      arrowsRef.current.forEach((el) => el.parentNode?.removeChild(el));
      arrowsRef.current = [];
    };
  }, [links, sceneRef, onNavigate, editMode, onDeleteLink]);

  return null;
}
