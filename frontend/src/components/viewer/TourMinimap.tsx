import { Map as MapIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "../../api/client";
import type { FloorPlan } from "../../types";

interface MinimapPhoto {
  id: number;
  title: string;
  map_x: number | null;
  map_y: number | null;
  floor: number | null;
}

interface Props {
  floorPlans: FloorPlan[];
  photos: MinimapPhoto[];
  /** ID текущей панорамы — подсвечиваем её точку + авто-этаж */
  currentId: number | null;
  onNavigate: (photoId: number) => void;
  /** a-scene — читаем yaw камеры для сектора направления взгляда */
  sceneRef: React.MutableRefObject<HTMLElement | null>;
}

/**
 * Мини-карта планов этажей в углу тура. У объекта может быть 1+ этажей.
 * По умолчанию показывает этаж текущего фото; можно переключать табами.
 * Тап по точке = переход. Активная точка + сектор направления (yaw камеры).
 */
export function TourMinimap({ floorPlans, photos, currentId, onNavigate, sceneRef }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const wedgeRef = useRef<SVGSVGElement>(null);

  const currentPhoto = photos.find((p) => p.id === currentId) ?? null;

  // Активный этаж = ручной выбор (табы) ИЛИ этаж текущего фото. При переходе на
  // другое фото ручной выбор сбрасываем (паттерн «сброс стейта при смене пропа» —
  // без setState в эффекте), чтобы мини-карта авто-переключалась на этаж фото.
  const [manualFloorId, setManualFloorId] = useState<number | null>(null);
  const [prevCurrentId, setPrevCurrentId] = useState(currentId);
  if (currentId !== prevCurrentId) {
    setPrevCurrentId(currentId);
    setManualFloorId(null);
  }
  const activeFloorId = manualFloorId ?? currentPhoto?.floor ?? floorPlans[0]?.id ?? null;

  // Крутим сектор по yaw камеры (без re-render)
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

  const placed = photos.filter((p) => p.map_x != null && p.map_y != null && p.floor != null);
  // Нет ни одного плана или ни одной точки — карту не показываем
  if (floorPlans.length === 0 || placed.length === 0) return null;

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

  const activeFloor = floorPlans.find((f) => f.id === activeFloorId) ?? floorPlans[0];
  const floorPoints = placed.filter((p) => p.floor === activeFloor.id);
  const activePoint = floorPoints.find((p) => p.id === currentId);

  return (
    <div className="absolute bottom-4 right-4 z-30 w-52 rounded-xl overflow-hidden bg-black/60 backdrop-blur-sm border border-white/15 shadow-2xl">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10">
        <span className="flex items-center gap-1.5 text-xs text-white/70 truncate">
          <MapIcon size={13} className="shrink-0" />
          {activeFloor.name}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white cursor-pointer shrink-0"
          title="Свернуть"
        >
          <X size={14} />
        </button>
      </div>

      {/* Табы этажей (если больше одного) */}
      {floorPlans.length > 1 && (
        <div className="flex items-center gap-1 px-1.5 py-1 overflow-x-auto border-b border-white/10">
          {floorPlans.map((f) => (
            <button
              key={f.id}
              onClick={() => setManualFloorId(f.id)}
              className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer ${
                f.id === activeFloor.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
              title={f.name}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <img
          src={mediaUrl(activeFloor.image)}
          alt={activeFloor.name}
          className="w-full block select-none"
          draggable={false}
        />
        {floorPoints.map((p) => {
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
