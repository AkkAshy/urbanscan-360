import { useEffect, useRef } from "react";
import { useViewerStore } from "../../store/viewerStore";

interface Props {
  photoUrl: string;
  /** Ref на a-scene элемент (для LinkArrows / LinkEditor) */
  sceneRef?: React.MutableRefObject<HTMLElement | null>;
  /** Закрыть вьювер (кнопка B на правом Quest-контроллере) */
  onExit?: () => void;
}

/**
 * A-Frame 360° сцена.
 * Используем vanilla A-Frame через DOM API (НЕ aframe-react).
 * Сцена создаётся ОДИН раз, при смене фото обновляется только src у <a-sky>.
 */
export function AFrameScene({ photoUrl, sceneRef, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneCreatedRef = useRef(false);
  // Актуальный onExit, чтобы listener из useEffect[] видел свежий колбэк
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

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
    if (photoUrl) {
      sky.setAttribute("src", photoUrl);
    } else {
      sky.setAttribute("color", "#0b1020");
    }
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

    // Кнопка B (правый Quest-контроллер) закрывает вьювер: сначала выходим
    // из immersive (exitVR), затем по событию exit-vr вызываем onExit.
    let closeRequested = false;

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

      // Кнопка B на правом Touch-контроллере → закрыть 360-вьювер (назад к папкам)
      if (hand === "right") {
        controller.addEventListener("bbuttondown", () => {
          const s = scene as unknown as { exitVR?: () => void };
          if (s.exitVR) {
            closeRequested = true;
            s.exitVR();
          } else {
            onExitRef.current?.();
          }
        });
      }

      scene.appendChild(controller);
    }

    const setVrActive = useViewerStore.getState().setVrActive;
    const onEnterVR = () => setVrActive(true);
    const onExitVR = () => {
      setVrActive(false);
      if (closeRequested) {
        closeRequested = false;
        onExitRef.current?.();
      }
    };
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
    const container = containerRef.current;
    const sky = container?.querySelector("#photo-sky");
    const camera = container?.querySelector("a-camera");
    if (!sky) return;

    // Фейд через чёрную сферу у камеры
    let fade = camera?.querySelector("#fade-sphere") as HTMLElement | null;
    if (camera && !fade) {
      fade = document.createElement("a-sphere");
      fade.setAttribute("id", "fade-sphere");
      fade.setAttribute("radius", "0.4");
      fade.setAttribute("material", "color: #000; shader: flat; side: back; opacity: 0; transparent: true");
      camera.appendChild(fade);
    }
    // removeAttribute перед setAttribute — иначе A-Frame не перезапускает
    // анимацию при повторном переходе и fade-сфера застревает затемнённой.
    fade?.removeAttribute("animation__in");
    fade?.setAttribute("animation__out", "property: material.opacity; from: 0; to: 1; dur: 120");
    const t = setTimeout(() => {
      if (photoUrl) {
        sky.removeAttribute("color");
        sky.setAttribute("src", photoUrl);
      } else {
        sky.removeAttribute("src");
        sky.setAttribute("color", "#0b1020");
      }
      fade?.removeAttribute("animation__out");
      fade?.setAttribute("animation__in", "property: material.opacity; from: 1; to: 0; dur: 200");
    }, 130);

    // Страховка: после перехода принудительно убираем затемнение,
    // даже если анимация прояснения не отыграла.
    const clear = setTimeout(() => {
      const mesh =
        fade &&
        (fade as unknown as {
          getObject3D?: (t: string) => { material?: { opacity: number } } | null;
        }).getObject3D?.("mesh");
      if (mesh && mesh.material) mesh.material.opacity = 0;
    }, 450);

    return () => {
      clearTimeout(t);
      clearTimeout(clear);
    };
  }, [photoUrl]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: "relative" }}
    />
  );
}
