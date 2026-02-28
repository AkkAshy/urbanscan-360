import { useEffect, useRef } from "react";

interface Props {
  photoUrl: string;
}

/**
 * A-Frame 360° сцена.
 * Используем vanilla A-Frame через DOM API (НЕ aframe-react).
 * Сцена создаётся ОДИН раз, при смене фото обновляется только src у <a-sky>.
 */
export function AFrameScene({ photoUrl }: Props) {
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
    // Отключаем стандартные логи A-Frame
    scene.setAttribute("renderer", "antialias: true; colorManagement: true;");

    // Небо — сфера с 360° текстурой
    // Увеличиваем segmentsHeight для плавной геометрии на полюсах (верх/низ)
    const sky = document.createElement("a-sky");
    sky.setAttribute("id", "photo-sky");
    sky.setAttribute("src", photoUrl);
    sky.setAttribute("rotation", "0 0 0");
    sky.setAttribute("geometry", "primitive: sphere; radius: 500; segmentsWidth: 64; segmentsHeight: 64");

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
    containerRef.current.appendChild(scene);

    return () => {
      // Cleanup при unmount
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
