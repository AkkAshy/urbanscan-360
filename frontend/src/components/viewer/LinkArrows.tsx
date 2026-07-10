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
 * Текстура метки-хотспота на canvas: прицел-перекрестие (круг + крест + точка)
 * на точке перехода + подпись цели снизу.
 * ВАЖНО: рисуем на canvas, а НЕ через <a-image>+SVG — `a-image` в этой сцене
 * не рендерится (как было с иконкой папки), а canvas-текстура на a-plane — да.
 * Кириллица в подписи работает (системный шрифт, не MSDF a-text).
 */
function makeMarkerTexture(title: string, editMode: boolean) {
  const W = 256;
  const H = 300;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const color = editMode ? "#f97316" : "#3b82f6";
  const cx = 128;
  const cy = 106;
  const R = 64;

  // лёгкое свечение/обводка для контраста на любом фоне
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // внешний круг прицела
  ctx.strokeStyle = color;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // крест-перекрестие с разрывом в центре (риски от краёв к центру)
  const gap = 16;
  const len = R + 18;
  ctx.beginPath();
  ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + len);
  ctx.moveTo(cx - len, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + len, cy); ctx.lineTo(cx + gap, cy);
  ctx.stroke();

  // центральная точка — ровно куда указывает метка
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();

  // подпись цели на тёмной плашке
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
    roundRectPath(ctx, (W - tw) / 2, 244, tw, 42, 12);
    ctx.fill();
    ctx.fillStyle = editMode ? "#fdba74" : "#ffffff";
    ctx.fillText(title, W / 2, 266);
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
 * Навигационные метки-хотспоты внутри A-Frame 360° сцены.
 * a-plane с canvas-текстурой (прицел-перекрестие + подпись), всегда плоско к
 * экрану (screen-facing), позиция по yaw/pitch из PhotoLink. Клик: навигация
 * или удаление связи.
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
      arrow.setAttribute("width", "1.3");
      arrow.setAttribute("height", "1.5");
      arrow.setAttribute(
        "position",
        `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`
      );
      // screen-facing (не look-at): плоскость всегда плоско к экрану, не боком
      arrow.setAttribute("screen-facing", "");
      arrow.setAttribute("material", "shader: flat; transparent: true; side: double");
      arrow.classList.add("clickable");
      arrow.dataset.linkId = String(link.id);
      arrow.dataset.toPhoto = String(link.to_photo);

      // Canvas-текстура стрелки — после инициализации меша. depthTest:false +
      // renderOrder: иначе плоскость в этой сцене не отрисовывается (как папка).
      arrow.addEventListener("loaded", () => {
        const mesh = arrow.getObject3D("mesh") as unknown as ArrowMesh | undefined;
        if (!mesh) return;
        mesh.material.map = makeMarkerTexture(displayTitle, !!editMode);
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
