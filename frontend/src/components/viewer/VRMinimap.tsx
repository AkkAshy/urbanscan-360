import { useEffect, useRef } from "react";
import { mediaUrl } from "../../api/client";
import { useViewerStore } from "../../store/viewerStore";

interface MinimapPhoto {
  id: number;
  title: string;
  map_x: number | null;
  map_y: number | null;
}

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  floorPlan: string | null;
  photos: MinimapPhoto[];
  currentId: number | null;
}

/**
 * Мини-карта плана этажа в VR — «наручная» панель на левом контроллере.
 *
 * Грабля сцены: <a-image> в этой сцене НЕ рендерится, поэтому план рисуем на
 * <canvas> и вешаем как CanvasTexture на <a-plane>. Всё обёрнуто в try/catch —
 * любая ошибка A-Frame делает компонент no-op и не роняет сцену. Навигация в VR
 * пока линейная (кнопки X/Y на левом контроллере); тап по точке — отдельная задача.
 */
export function VRMinimap({ sceneRef, floorPlan, photos, currentId }: Props) {
  const vrActive = useViewerStore((s) => s.vrActive);

  // Свежие значения для rAF-цикла без пересоздания плоскости
  const photosRef = useRef(photos);
  const currentIdRef = useRef(currentId);
  useEffect(() => {
    photosRef.current = photos;
    currentIdRef.current = currentId;
  });

  useEffect(() => {
    if (!vrActive || !floorPlan) return;
    const scene = sceneRef.current;
    if (!scene) return;

    let raf = 0;
    let plane: HTMLElement | null = null;
    let disposed = false;

    try {
      // Минимальный тип, чтобы не тянуть типы пакета three
      type CanvasTextureLike = { needsUpdate: boolean };
      type ThreeLike = {
        CanvasTexture: new (c: HTMLCanvasElement) => CanvasTextureLike;
      };
      const THREE = (window as unknown as { AFRAME?: { THREE?: ThreeLike } }).AFRAME?.THREE;
      const leftHand = scene.querySelector('[data-vr-hand="left"]') as HTMLElement | null;
      if (!THREE || !leftHand) return;

      // Канвас с планом; точки перерисовываем каждый кадр
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const texture = new THREE.CanvasTexture(canvas);
      let planImg: HTMLImageElement | null = null;
      let planTainted = false;
      let aspect = 1;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        planImg = img;
        aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        // Проверяем «загрязнение» на ОТДЕЛЬНОМ канвасе (нет CORS-заголовков у media),
        // чтобы не испортить рабочий канвас-текстуру самой проверкой.
        try {
          const probe = document.createElement("canvas");
          probe.width = 2;
          probe.height = 2;
          const pctx = probe.getContext("2d");
          pctx?.drawImage(img, 0, 0, 2, 2);
          pctx?.getImageData(0, 0, 1, 1);
        } catch {
          planTainted = true; // рисовать план нельзя — останутся только точки
        }
        // Подгоняем плоскость под пропорции плана
        try {
          plane?.setAttribute("geometry", `primitive: plane; width: ${0.14 * aspect}; height: 0.14`);
        } catch {
          /* no-op */
        }
      };
      img.onerror = () => {
        planTainted = true;
      };
      img.src = mediaUrl(floorPlan);

      // Плоскость-панель на левом контроллере (как наручные часы)
      plane = document.createElement("a-plane");
      plane.setAttribute("geometry", "primitive: plane; width: 0.14; height: 0.14");
      plane.setAttribute("position", "0.02 0.06 -0.04");
      plane.setAttribute("rotation", "-55 0 0");
      plane.setAttribute("material", "shader: flat; side: double; transparent: true");
      plane.setAttribute("data-vr-minimap", "");
      leftHand.appendChild(plane);

      // Привязываем нашу CanvasTexture к материалу плоскости
      const attachTexture = () => {
        const mesh = (plane as unknown as {
          getObject3D?: (t: string) => { material?: { map?: unknown; needsUpdate?: boolean } } | null;
        }).getObject3D?.("mesh");
        if (mesh && mesh.material) {
          (mesh.material as { map?: unknown; needsUpdate?: boolean }).map = texture;
          (mesh.material as { needsUpdate?: boolean }).needsUpdate = true;
          return true;
        }
        return false;
      };

      const W = canvas.width;
      const H = canvas.height;
      const accent = "#3b82f6";

      const draw = () => {
        // Фон
        ctx.fillStyle = "rgba(11, 16, 32, 0.92)";
        ctx.fillRect(0, 0, W, H);
        if (planImg && !planTainted) {
          try {
            ctx.drawImage(planImg, 0, 0, W, H);
          } catch {
            planTainted = true;
          }
        }
        // Точки
        const pts = photosRef.current.filter((p) => p.map_x != null && p.map_y != null);
        const active = pts.find((p) => p.id === currentIdRef.current);
        for (const p of pts) {
          const x = p.map_x! * W;
          const y = p.map_y! * H;
          const isActive = p.id === currentIdRef.current;
          ctx.beginPath();
          ctx.arc(x, y, isActive ? 9 : 6, 0, Math.PI * 2);
          ctx.fillStyle = isActive ? accent : "#ffffff";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = isActive ? "#ffffff" : accent;
          ctx.stroke();
        }
        // Сектор направления взгляда на активной точке
        if (active) {
          const cam = scene.querySelector("a-camera") as
            | (Element & { object3D?: { rotation: { y: number } } })
            | null;
          const yaw = cam?.object3D?.rotation.y ?? 0;
          const x = active.map_x! * W;
          const y = active.map_y! * H;
          const dir = -yaw - Math.PI / 2; // экранный «вверх» = взгляд по -Z
          const spread = Math.PI / 5;
          const r = 34;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.arc(x, y, r, dir - spread, dir + spread);
          ctx.closePath();
          ctx.fillStyle = "rgba(59, 130, 246, 0.35)";
          ctx.fill();
        }
        texture.needsUpdate = true;
      };

      let textureReady = false;
      const loop = () => {
        if (disposed) return;
        if (!textureReady) textureReady = attachTexture();
        draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } catch (err) {
      console.error("VRMinimap: не удалось построить мини-карту в VR:", err);
    }

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      try {
        plane?.parentNode?.removeChild(plane);
      } catch {
        /* no-op */
      }
    };
  }, [vrActive, floorPlan, sceneRef]);

  return null;
}
