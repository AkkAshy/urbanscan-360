import { useEffect, useRef } from "react";
import { useViewerStore } from "../../../store/viewerStore";

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
}

/** Делает плоскую кнопку с подписью; возвращает кликабельный a-entity. */
function makeButton(label: string, x: number, width: number, color: string) {
  const btn = document.createElement("a-entity");
  btn.setAttribute("position", `${x} 0 0`);
  btn.classList.add("clickable");

  const bg = document.createElement("a-plane");
  bg.setAttribute("width", String(width));
  bg.setAttribute("height", "0.18");
  bg.setAttribute("color", color);
  bg.setAttribute("material", "opacity: 0.85; shader: flat");
  bg.classList.add("clickable");

  const text = document.createElement("a-text");
  text.setAttribute("value", label);
  text.setAttribute("align", "center");
  text.setAttribute("color", "#FFFFFF");
  text.setAttribute("width", "2.5");
  text.setAttribute("position", "0 0 0.01");

  btn.appendChild(bg);
  btn.appendChild(text);
  return btn;
}

/**
 * In-scene HUD-меню для VR. Крепится к камере сцены (всегда перед глазами).
 * Рендерится только когда vrActive (управляется из UploadPage).
 */
export function VRMenu({ sceneRef }: Props) {
  const menuRef = useRef<HTMLElement | null>(null);
  const {
    currentIndex,
    photos,
    next,
    prev,
    linkEditMode,
    setLinkEditMode,
    setVrPlacing,
    setVrActive,
  } = useViewerStore();

  // Создаём контейнер меню один раз и крепим к камере
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const camera = scene.querySelector("a-camera") || scene.querySelector("[camera]");
    if (!camera) return;

    const menu = document.createElement("a-entity");
    // HUD: ниже линии взгляда, на расстоянии 1.6 м
    menu.setAttribute("position", "0 -0.7 -1.6");
    camera.appendChild(menu);
    menuRef.current = menu;

    return () => {
      menu.parentNode?.removeChild(menu);
      menuRef.current = null;
    };
  }, [sceneRef]);

  // Перерисовываем кнопки при смене состояния
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    while (menu.firstChild) menu.removeChild(menu.firstChild);

    const counter = document.createElement("a-text");
    counter.setAttribute("value", `${currentIndex + 1} / ${photos.length}`);
    counter.setAttribute("align", "center");
    counter.setAttribute("color", "#FFFFFF");
    counter.setAttribute("width", "2.5");
    counter.setAttribute("position", "0 0.18 0");
    menu.appendChild(counter);

    const prevBtn = makeButton("‹", -0.6, 0.2, "#1f2937");
    prevBtn.addEventListener("click", () => prev());
    menu.appendChild(prevBtn);

    const nextBtn = makeButton("›", -0.35, 0.2, "#1f2937");
    nextBtn.addEventListener("click", () => next());
    menu.appendChild(nextBtn);

    const linkBtn = makeButton(
      linkEditMode ? "Связи: вкл" : "Связи",
      0.05,
      0.4,
      linkEditMode ? "#ea580c" : "#1f2937"
    );
    linkBtn.addEventListener("click", () => setLinkEditMode(!linkEditMode));
    menu.appendChild(linkBtn);

    const createBtn = makeButton("Создать", 0.45, 0.4, "#2563eb");
    createBtn.addEventListener("click", () => {
      setLinkEditMode(true);
      setVrPlacing(null); // ждём клик по сцене (см. VRLinkPlacer)
    });
    menu.appendChild(createBtn);

    const exitBtn = makeButton("Выход", 0.85, 0.4, "#7f1d1d");
    exitBtn.addEventListener("click", () => {
      const scene = sceneRef.current as unknown as { exitVR?: () => void };
      scene?.exitVR?.();
      setVrActive(false);
    });
    menu.appendChild(exitBtn);
  }, [
    currentIndex,
    photos.length,
    linkEditMode,
    next,
    prev,
    setLinkEditMode,
    setVrPlacing,
    setVrActive,
    sceneRef,
  ]);

  return null;
}
