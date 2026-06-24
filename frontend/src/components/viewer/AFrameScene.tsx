import { useEffect, useRef } from "react";
import { useViewerStore } from "../../store/viewerStore";

interface Props {
  photoUrl: string;
  /** Ref на a-scene элемент (для LinkArrows / LinkEditor) */
  sceneRef?: React.MutableRefObject<HTMLElement | null>;
}

/**
 * A-Frame 360° сцена.
 * Используем vanilla A-Frame через DOM API (НЕ aframe-react).
 * Сцена создаётся ОДИН раз, при смене фото обновляется только src у <a-sky>.
 */
export function AFrameScene({ photoUrl, sceneRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneCreatedRef = useRef(false);

  // Создаём сцену один раз
  useEffect(() => {
    if (!containerRef.current || sceneCreatedRef.current) return;
    sceneCreatedRef.current = true;

    const scene = document.createElement("a-scene");
    scene.setAttribute("embedded", "");
    scene.setAttribute("vr-mode-ui", "enabled: true");
    scene.setAttribute("webxr", "requiredFeatures: local-floor;");
    scene.setAttribute("renderer", "antialias: true; colorManagement: true;");

    // Raycaster для мыши — ловит клики по объектам с class="clickable"
    scene.setAttribute("cursor", "rayOrigin: mouse; fuse: false");
    scene.setAttribute("raycaster", "objects: .clickable");

    // Небо — сфера с 360° текстурой
    const sky = document.createElement("a-sky");
    sky.setAttribute("id", "photo-sky");
    sky.setAttribute("src", photoUrl);
    sky.setAttribute("rotation", "0 0 0");
    sky.setAttribute(
      "geometry",
      "primitive: sphere; radius: 500; segmentsWidth: 64; segmentsHeight: 64"
    );

    // Камера с look-controls для гироскопа/WebXR
    const camera = document.createElement("a-camera");
    camera.setAttribute(
      "look-controls",
      "magicWindowTrackingEnabled: true; touchEnabled: true;"
    );
    camera.setAttribute("position", "0 1.6 0");
    camera.setAttribute("wasd-controls-enabled", "false");

    scene.appendChild(sky);
    scene.appendChild(camera);

    // VR-контроллеры (две руки): луч + raycaster по .clickable.
    // На десктопе не мешают (видны только в immersive).
    for (const hand of ["left", "right"]) {
      const controller = document.createElement("a-entity");
      controller.setAttribute("laser-controls", `hand: ${hand}`);
      controller.setAttribute(
        "raycaster",
        "objects: .clickable; far: 100; lineColor: #3b82f6; lineOpacity: 0.85"
      );
      controller.setAttribute("data-vr-hand", hand);
      scene.appendChild(controller);
    }

    const setVrActive = useViewerStore.getState().setVrActive;
    const onEnterVR = () => setVrActive(true);
    const onExitVR = () => setVrActive(false);
    scene.addEventListener("enter-vr", onEnterVR);
    scene.addEventListener("exit-vr", onExitVR);

    containerRef.current.appendChild(scene);

    // Передаём ref на сцену наружу
    if (sceneRef) {
      sceneRef.current = scene;
    }

    return () => {
      scene.removeEventListener("enter-vr", onEnterVR);
      scene.removeEventListener("exit-vr", onExitVR);
      setVrActive(false);
      if (sceneRef) sceneRef.current = null;
      if (scene.parentNode) {
        scene.parentNode.removeChild(scene);
      }
      sceneCreatedRef.current = false;
    };
  }, []);

  // Обновляем текстуру при смене фото (без пересоздания сцены)
  useEffect(() => {
    const sky = containerRef.current?.querySelector("#photo-sky");
    if (sky && photoUrl) {
      sky.setAttribute("src", photoUrl);
    }
  }, [photoUrl]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: "relative" }}
    />
  );
}
