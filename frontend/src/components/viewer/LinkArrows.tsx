import { useEffect, useRef } from "react";
import AFRAME from "aframe";
import type { PhotoLink } from "../../types";
import { yawPitchToXyz } from "../../utils/sphere";

/** Расстояние стрелок от центра сцены */
const ARROW_RADIUS = 8;

// A-Frame несёт свой three.js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THREE = (AFRAME as unknown as { THREE: any }).THREE;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ArrowMesh = { material: any; renderOrder: number };

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Текстура стрелки-хотспота на canvas (стрелка «вниз/сюда» + подпись цели).
 * ВАЖНО: рисуем на canvas, а НЕ через <a-image>+SVG — `a-image` в этой сцене
 * не рендерится (как было с иконкой папки), а canvas-текстура на a-plane — да.
 * Заодно кириллица в подписи работает (системный шрифт, не MSDF a-text).
 */
function makeArrowTexture(title: string, editMode: boolean) {
  const W = 256;
  const H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Стрелка (контур как у прежнего SVG, «иди сюда»)
  ctx.beginPath();
  ctx.moveTo(128, 232);
  ctx.lineTo(28, 120);
  ctx.lineTo(85, 120);
  ctx.lineTo(85, 28);
  ctx.lineTo(171, 28);
  ctx.lineTo(171, 120);
  ctx.lineTo(228, 120);
  ctx.closePath();
  ctx.fillStyle = editMode ? "#f97316" : "#3b82f6";
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 7;
  ctx.strokeStyle = editMode ? "#9a3412" : "#1d4ed8";
  ctx.stroke();

  // Подпись цели на тёмной плашке (читаемость на любом фоне)
  if (title) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fs = 30;
    ctx.font = `600 ${fs}px system-ui, sans-serif`;
    while (ctx.measureText(title).width > W - 24 && fs > 13) {
      fs -= 2;
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
    }
    const tw = Math.min(W - 8, ctx.measureText(title).width + 24);
    ctx.fillStyle = "rgba(11,16,32,0.72)";
    roundRectPath(ctx, (W - tw) / 2, 266, tw, 42, 12);
    ctx.fill();
    ctx.fillStyle = editMode ? "#fdba74" : "#ffffff";
    ctx.fillText(title, W / 2, 288);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
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
 * Навигационные стрелки-хотспоты внутри A-Frame 360° сцены.
 * a-plane с canvas-текстурой (стрелка + подпись), billboard через look-at,
 * позиция по yaw/pitch из PhotoLink. Клик: навигация или удаление связи.
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

    arrowsRef.current.forEach((el) => el.parentNode?.removeChild(el));
    arrowsRef.current = [];

    links.forEach((link) => {
      const { x, y, z } = yawPitchToXyz(link.yaw, link.pitch, ARROW_RADIUS);
      const displayTitle = link.to_title || `Фото #${link.to_photo}`;

      const arrow = document.createElement("a-plane");
      arrow.setAttribute("width", "1.6");
      arrow.setAttribute("height", "2.0");
      arrow.setAttribute(
        "position",
        `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`
      );
      arrow.setAttribute("look-at", "[camera]");
      arrow.setAttribute("material", "shader: flat; transparent: true; side: double");
      arrow.classList.add("clickable");
      arrow.dataset.linkId = String(link.id);
      arrow.dataset.toPhoto = String(link.to_photo);

      // Canvas-текстура стрелки — после инициализации меша. depthTest:false +
      // renderOrder: иначе плоскость в этой сцене не отрисовывается (как папка).
      arrow.addEventListener("loaded", () => {
        const mesh = arrow.getObject3D("mesh") as unknown as ArrowMesh | undefined;
        if (!mesh) return;
        mesh.material.map = makeArrowTexture(displayTitle, !!editMode);
        mesh.material.color.set("#ffffff");
        mesh.material.transparent = true;
        mesh.material.depthTest = false;
        mesh.material.needsUpdate = true;
        mesh.renderOrder = 10;
      });

      arrow.addEventListener("click", () => {
        if (editMode && onDeleteLink) {
          onDeleteLink(link.id);
        } else {
          onNavigate(link.to_photo);
        }
      });

      // Hover: подрастает при наведении (мышь и laser-controls)
      arrow.addEventListener("mouseenter", () =>
        arrow.setAttribute("scale", "1.15 1.15 1.15")
      );
      arrow.addEventListener("mouseleave", () =>
        arrow.setAttribute("scale", "1 1 1")
      );

      scene.appendChild(arrow);
      arrowsRef.current.push(arrow);
    });

    return () => {
      arrowsRef.current.forEach((el) => el.parentNode?.removeChild(el));
      arrowsRef.current = [];
    };
  }, [links, sceneRef, onNavigate, editMode, onDeleteLink]);

  return null;
}
