import { useEffect } from "react";
import AFRAME from "aframe";
import { OFFICE_COORDS } from "../../config/office";
import { bearing, haversineKm } from "../../utils/geo";
import { yawPitchToXyz } from "../../utils/sphere";
import type { FolderMapPoint } from "../../types";

const ROOM_RADIUS = 6;
const EYE_LEVEL = 1.6;

// Палитра 3D-папки. Яркая сине-голубая (а не тёмная как на дашборде) —
// на тёмном небе гео-комнаты (#0b1020) тёмная папка сливается.
const C_BACK = "#1d4ed8"; // задняя обложка
const C_TAB = "#2563eb"; // язычок
const C_FRONT = "#3b82f6"; // передняя крышка (приоткрыта)
const C_PAPER = "#eef2ff"; // листы внутри

// A-Frame несёт собственный three.js — берём его рантайм-объект.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THREE = (AFRAME as unknown as { THREE: any }).THREE;

// Минимальный тип three-меша (three идёт внутри aframe, без отдельных типов).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FolderMesh = { material: any; renderOrder: number };

/** Скруглённый прямоугольник на 2D-canvas (для плашки подписи). */
function roundRect(
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
 * Подпись карточки как canvas-текстура. ВАЖНО: рендерим текст на canvas
 * системным шрифтом — так кириллица работает (встроенный MSDF-шрифт
 * <a-text> знает только латиницу, поэтому русские названия в нём пропадали).
 */
function makeLabelTexture(title: string, sub: string) {
  const W = 512;
  const H = 168;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // НЕпрозрачный фон под цвет неба гео-комнаты. Важно: без alpha — прозрачная
  // плоскость в A-Frame ломает порядок рендера и затемняет папку за собой.
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#162039";
  roundRect(ctx, 6, 6, W - 12, H - 12, 22);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Название (ужимаем кегль, пока влезает по ширине)
  ctx.fillStyle = "#ffffff";
  let fs = 48;
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  while (ctx.measureText(title).width > W - 56 && fs > 20) {
    fs -= 2;
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
  }
  ctx.fillText(title, W / 2, 66);

  // Подзаголовок: N фото · расстояние
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "400 32px system-ui, sans-serif";
  ctx.fillText(sub, W / 2, 118);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Сплошная sRGB-текстура заданного цвета (4×4). */
function solidTexture(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 4;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 4, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Одна 3D-панель папки. Цвет задаём sRGB-canvas-текстурой, а не сплошным
 * `color`: у A-Frame flat сплошной color прогоняется через двойную
 * sRGB-конверсию и панель выходит почти чёрной, а текстура рендерится точно.
 */
function panel(
  w: number,
  h: number,
  d: number,
  color: string,
  pos: string
): HTMLElement {
  const box = document.createElement("a-box");
  box.setAttribute("width", String(w));
  box.setAttribute("height", String(h));
  box.setAttribute("depth", String(d));
  box.setAttribute("material", "shader: flat");
  box.setAttribute("position", pos);
  box.classList.add("clickable"); // панели папки — мишень для луча/курсора
  box.addEventListener("loaded", () => {
    const mesh = box.getObject3D("mesh") as unknown as FolderMesh | undefined;
    if (!mesh) return;
    mesh.material.map = solidTexture(color);
    mesh.material.color.set("#ffffff");
    // Рендерим в transparent-проход (depthTest:false): opaque-проход этой
    // сцены выводит панели почти чёрными. renderOrder держит порядок папки.
    mesh.material.transparent = true;
    mesh.material.depthTest = false;
    mesh.material.needsUpdate = true;
    mesh.renderOrder = 2;
  });
  return box;
}

/** Собирает объёмную папку (задник + язычок + листы + приоткрытая крышка). */
function buildFolder(): HTMLElement {
  const folder = document.createElement("a-entity");

  // задняя обложка
  folder.appendChild(panel(1.3, 1.0, 0.06, C_BACK, "0 0 -0.04"));
  // язычок сверху слева
  folder.appendChild(panel(0.46, 0.16, 0.06, C_TAB, "-0.38 0.56 -0.04"));
  // листы внутри (чуть выглядывают сверху)
  folder.appendChild(panel(1.18, 0.92, 0.04, C_PAPER, "0 0.05 -0.01"));

  // передняя крышка — приоткрыта (наклон вокруг нижнего ребра)
  const pivot = document.createElement("a-entity");
  pivot.setAttribute("position", "0 -0.48 0.02");
  pivot.setAttribute("rotation", "-24 0 0");
  pivot.appendChild(panel(1.3, 0.94, 0.05, C_FRONT, "0 0.47 0"));
  folder.appendChild(pivot);

  return folder;
}

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  folders: FolderMapPoint[];
  onSelect: (folder: FolderMapPoint) => void;
}

/**
 * In-scene «гео-комната»: для каждой папки с GPS ставит 3D-папку на
 * азимуте bearing(офис → объект) вокруг камеры. Клик/луч → onSelect.
 * Карточка = объёмная папка + canvas-подпись (название · N фото · км).
 */
export function GeoVRRoom({ sceneRef, folders, onSelect }: Props) {
  useEffect(() => {
    const scene = sceneRef.current as
      | (HTMLElement & { hasLoaded?: boolean })
      | null;
    if (!scene) return;

    let container: HTMLElement | null = null;

    const build = () => {
      container = document.createElement("a-entity");
      scene.appendChild(container);

      const withGps = folders.filter(
        (f): f is FolderMapPoint & { latitude: number; longitude: number } =>
          f.latitude != null && f.longitude != null
      );

      if (withGps.length === 0) {
        const empty = document.createElement("a-plane");
        empty.setAttribute("width", "3.4");
        empty.setAttribute("height", "1.1");
        empty.setAttribute("position", `0 ${EYE_LEVEL} -${ROOM_RADIUS}`);
        empty.setAttribute("material", "shader: flat; side: double");
        empty.addEventListener("loaded", () => {
          const mesh = empty.getObject3D("mesh") as unknown as FolderMesh | undefined;
          if (!mesh) return;
          mesh.material.map = makeLabelTexture("Нет объектов с GPS", "");
          mesh.material.color.set("#ffffff");
          mesh.material.transparent = true;
          mesh.material.depthTest = false;
          mesh.material.needsUpdate = true;
          mesh.renderOrder = 5;
        });
        container.appendChild(empty);
        return;
      }

      withGps.forEach((f) => {
        const target = { lat: f.latitude, lon: f.longitude };
        const az = bearing(OFFICE_COORDS, target);
        const dist = haversineKm(OFFICE_COORDS, target);
        const { x, y, z } = yawPitchToXyz(az, 0, ROOM_RADIUS);

        const card = document.createElement("a-entity");
        card.setAttribute("position", `${x} ${EYE_LEVEL + y} ${z}`);
        card.setAttribute("billboard", "");

        // 3D-папка
        const folder = buildFolder();
        card.appendChild(folder);

        // Крупная невидимая мишень клика перед папкой — легко попасть мышью/
        // VR-лучом (панели мелкие и с зазорами). colorWrite/depthWrite:false →
        // невидима и НЕ затемняет (в отличие от opacity:0 — та ломала рендер).
        const hit = document.createElement("a-plane");
        hit.setAttribute("width", "1.7");
        hit.setAttribute("height", "2.0");
        hit.setAttribute("position", "0 0.3 0.3");
        hit.setAttribute("material", "shader: flat");
        hit.classList.add("clickable");
        hit.addEventListener("loaded", () => {
          const m = hit.getObject3D("mesh") as unknown as FolderMesh | undefined;
          if (!m) return;
          m.material.colorWrite = false;
          m.material.depthWrite = false;
          m.renderOrder = -1;
        });
        card.appendChild(hit);

        // Клик по карточке → тур; hover → лёгкая подсветка папки (фидбэк наведения)
        card.addEventListener("click", () => onSelect(f));
        card.addEventListener("mouseenter", () => folder.setAttribute("scale", "1.07 1.07 1.07"));
        card.addEventListener("mouseleave", () => folder.setAttribute("scale", "1 1 1"));

        // Подпись над папкой (canvas-текстура с кириллицей), всегда поверх
        const label = document.createElement("a-plane");
        label.setAttribute("width", "1.9");
        label.setAttribute("height", "0.62");
        label.setAttribute("position", "0 0.95 0.06");
        label.setAttribute("material", "shader: flat; side: double");
        const sub = `${f.photo_count} фото · ${Math.round(dist)} км`;
        label.addEventListener("loaded", () => {
          const mesh = label.getObject3D("mesh") as unknown as FolderMesh | undefined;
          if (!mesh) return;
          mesh.material.map = makeLabelTexture(f.name, sub);
          mesh.material.color.set("#ffffff");
          mesh.material.transparent = true;
          mesh.material.depthTest = false;
          mesh.material.needsUpdate = true;
          mesh.renderOrder = 5; // подпись поверх папки
        });
        card.appendChild(label);

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
