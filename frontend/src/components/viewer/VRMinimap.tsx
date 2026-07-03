import { useEffect, useRef } from "react";
import { mediaUrl } from "../../api/client";
import { useViewerStore } from "../../store/viewerStore";
import type { FloorPlan } from "../../types";

interface MinimapPhoto {
  id: number;
  title: string;
  map_x: number | null;
  map_y: number | null;
  floor: number | null;
}

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  floorPlans: FloorPlan[];
  photos: MinimapPhoto[];
  currentId: number | null;
}

/**
 * Мини-карта планов этажей в VR — «наручная» панель на левом контроллере.
 * Показывает план этажа ТЕКУЩЕГО фото (перестраивается при смене этажа).
 *
 * Грабля сцены: <a-image> НЕ рендерится, поэтому план рисуем на <canvas> и вешаем
 * как CanvasTexture на <a-plane>. Всё в try/catch — ошибка A-Frame = no-op, сцену
 * не роняет. Навигация в VR пока линейная (X/Y); тап по точке — отдельная задача.
 */
export function VRMinimap({ sceneRef, floorPlans, photos, currentId }: Props) {
  const vrActive = useViewerStore((s) => s.vrActive);

  const currentPhoto = photos.find((p) => p.id === currentId) ?? null;
  const activeFloorId = currentPhoto?.floor ?? floorPlans[0]?.id ?? null;
  const activeFloor = floorPlans.find((f) => f.id === activeFloorId) ?? null;
  const activeImage = activeFloor?.image ?? null;

  // Свежие значения для rAF-цикла без пересоздания плоскости
  const photosRef = useRef(photos);
  const currentIdRef = useRef(currentId);
  const activeFloorIdRef = useRef(activeFloorId);
  useEffect(() => {
    photosRef.current = photos;
    currentIdRef.current = currentId;
    activeFloorIdRef.current = activeFloorId;
  });

  useEffect(() => {
    if (!vrActive || !activeImage) return;
    const scene = sceneRef.current;
    if (!scene) return;

    let raf = 0;
    let plane: HTMLElement | null = null;
    let disposed = false;

    try {
      type CanvasTextureLike = { needsUpdate: boolean };
      type ThreeLike = { CanvasTexture: new (c: HTMLCanvasElement) => CanvasTextureLike };
      const THREE = (window as unknown as { AFRAME?: { THREE?: ThreeLike } }).AFRAME?.THREE;
      const leftHand = scene.querySelector('[data-vr-hand="left"]') as HTMLElement | null;
      if (!THREE || !leftHand) return;

      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const texture = new THREE.CanvasTexture(canvas);
      let planImg: HTMLImageElement | null = null;
      let planTainted = false;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        planImg = img;
        // Проверка «загрязнения» на ОТДЕЛЬНОМ канвасе (нет CORS-заголовков у media)
        try {
          const probe = document.createElement("canvas");
          probe.width = 2;
          probe.height = 2;
          const pctx = probe.getContext("2d");
          pctx?.drawImage(img, 0, 0, 2, 2);
          pctx?.getImageData(0, 0, 1, 1);
        } catch {
          planTainted = true;
        }
        const aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        try {
          plane?.setAttribute("geometry", `primitive: plane; width: ${0.14 * aspect}; height: 0.14`);
        } catch {
          /* no-op */
        }
      };
      img.onerror = () => {
        planTainted = true;
      };
      img.src = mediaUrl(activeImage);

      plane = document.createElement("a-plane");
      plane.setAttribute("geometry", "primitive: plane; width: 0.14; height: 0.14");
      plane.setAttribute("position", "0.02 0.06 -0.04");
      plane.setAttribute("rotation", "-55 0 0");
      plane.setAttribute("material", "shader: flat; side: double; transparent: true");
      plane.setAttribute("data-vr-minimap", "");
      leftHand.appendChild(plane);

      const attachTexture = () => {
        const mesh = (plane as unknown as {
          getObject3D?: (t: string) => { material?: { map?: unknown; needsUpdate?: boolean } } | null;
        }).getObject3D?.("mesh");
        if (mesh && mesh.material) {
          (mesh.material as { map?: unknown }).map = texture;
          (mesh.material as { needsUpdate?: boolean }).needsUpdate = true;
          return true;
        }
        return false;
      };

      const W = canvas.width;
      const H = canvas.height;
      const accent = "#3b82f6";

      const draw = () => {
        ctx.fillStyle = "rgba(11, 16, 32, 0.92)";
        ctx.fillRect(0, 0, W, H);
        if (planImg && !planTainted) {
          try {
            ctx.drawImage(planImg, 0, 0, W, H);
          } catch {
            planTainted = true;
          }
        }
        const floorId = activeFloorIdRef.current;
        const pts = photosRef.current.filter(
          (p) => p.map_x != null && p.map_y != null && p.floor === floorId
        );
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
        if (active) {
          const cam = scene.querySelector("a-camera") as
            | (Element & { object3D?: { rotation: { y: number } } })
            | null;
          const yaw = cam?.object3D?.rotation.y ?? 0;
          const x = active.map_x! * W;
          const y = active.map_y! * H;
          const dir = -yaw - Math.PI / 2;
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
  }, [vrActive, activeImage, sceneRef]);

  return null;
}
