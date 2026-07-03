import { Map as MapIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "../../api/client";

interface MinimapPhoto {
  id: number;
  title: string;
  map_x: number | null;
  map_y: number | null;
}

interface Props {
  /** Путь/URL плана этажа (mediaUrl применяется внутри) */
  floorPlan: string | null;
  photos: MinimapPhoto[];
  /** ID текущей панорамы — подсвечиваем её точку */
  currentId: number | null;
  onNavigate: (photoId: number) => void;
  /** a-scene — читаем yaw камеры для сектора направления взгляда */
  sceneRef: React.MutableRefObject<HTMLElement | null>;
}

/**
 * Мини-карта плана этажа в углу тура.
 * Точки = панорамы (map_x/map_y), тап по точке = переход.
 * Активная точка подсвечена + сектор направления взгляда (по yaw камеры).
 */
export function TourMinimap({ floorPlan, photos, currentId, onNavigate, sceneRef }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const wedgeRef = useRef<SVGSVGElement>(null);

  const placed = photos.filter((p) => p.map_x != null && p.map_y != null);

  // Крутим сектор по yaw камеры (без re-render — прямо через style)
  useEffect(() => {
    if (collapsed) return;
    let raf = 0;
    const tick = () => {
      const cam = sceneRef.current?.querySelector("a-camera") as
        | (Element & { object3D?: { rotation: { y: number } } })
        | null;
      const yaw = cam?.object3D?.rotation.y ?? 0;
      const deg = -(yaw * 180) / Math.PI;
      if (wedgeRef.current) {
        wedgeRef.current.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [collapsed, sceneRef]);

  // Нет плана или ни одной точки — карту не показываем
  if (!floorPlan || placed.length === 0) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm cursor-pointer transition-colors"
        title="Показать план этажа"
      >
        <MapIcon size={16} />
        План
      </button>
    );
  }

  const activePoint = placed.find((p) => p.id === currentId);

  return (
    <div className="absolute bottom-4 right-4 z-30 w-52 rounded-xl overflow-hidden bg-black/60 backdrop-blur-sm border border-white/15 shadow-2xl">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10">
        <span className="flex items-center gap-1.5 text-xs text-white/70">
          <MapIcon size={13} />
          План этажа
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white cursor-pointer"
          title="Свернуть"
        >
          <X size={14} />
        </button>
      </div>

      <div className="relative">
        <img
          src={mediaUrl(floorPlan)}
          alt="План этажа"
          className="w-full block select-none"
          draggable={false}
        />
        {/* Точки-панорамы */}
        {placed.map((p) => {
          const active = p.id === currentId;
          return (
            <button
              key={p.id}
              onClick={() => onNavigate(p.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border shadow transition-all cursor-pointer ${
                active
                  ? "w-3.5 h-3.5 bg-[var(--accent)] border-white z-10"
                  : "w-2.5 h-2.5 bg-white/90 border-[var(--accent)] hover:scale-125 hover:bg-[var(--accent)]"
              }`}
              style={{ left: `${p.map_x! * 100}%`, top: `${p.map_y! * 100}%` }}
              title={p.title}
            />
          );
        })}
        {/* Сектор направления взгляда — на активной точке */}
        {activePoint && (
          <svg
            ref={wedgeRef}
            width="46"
            height="46"
            viewBox="0 0 46 46"
            className="absolute pointer-events-none"
            style={{
              left: `${activePoint.map_x! * 100}%`,
              top: `${activePoint.map_y! * 100}%`,
              transformOrigin: "center",
            }}
          >
            <polygon points="23,23 11,2 35,2" fill="var(--accent)" opacity="0.35" />
          </svg>
        )}
      </div>
    </div>
  );
}
