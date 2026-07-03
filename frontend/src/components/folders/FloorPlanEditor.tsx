import { ImagePlus, MapPin, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadFloorPlan } from "../../api/folders";
import { setPhotoPoint } from "../../api/photos";
import { mediaUrl } from "../../api/client";
import { toast } from "../../store/toastStore";
import type { Folder, Photo } from "../../types";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface Props {
  folder: Folder;
  photos: Photo[];
  /** План этажа загружён/заменён — обновить папку в родителе */
  onFolderChanged: (folder: Folder) => void;
}

type Point = { x: number; y: number };

/**
 * Редактор плана этажа: грузим картинку плана, расставляем на ней точки-фото.
 * Координаты точки — доли 0..1 (map_x/map_y), не зависят от размера картинки.
 *
 * UX: выбрал фото в списке → кликнул по плану = поставил точку.
 * Уже стоящую точку можно перетащить или снять крестиком.
 */
export function FloorPlanEditor({ folder, photos, onFolderChanged }: Props) {
  const planRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [planPath, setPlanPath] = useState<string | null>(folder.floor_plan);
  const [uploading, setUploading] = useState(false);
  const [points, setPoints] = useState<Record<number, Point>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const initPoints = useCallback((): Record<number, Point> => {
    const acc: Record<number, Point> = {};
    for (const p of photos) {
      if (p.map_x != null && p.map_y != null) acc[p.id] = { x: p.map_x, y: p.map_y };
    }
    return acc;
  }, [photos]);

  // Смена папки — сбрасываем состояние
  useEffect(() => {
    setPlanPath(folder.floor_plan);
    setPoints(initPoints());
    setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder.id]);

  // Фото подгрузились асинхронно после монтирования — засеять точки один раз
  useEffect(() => {
    setPoints((prev) => (Object.keys(prev).length === 0 ? initPoints() : prev));
  }, [photos, initPoints]);

  // — Загрузка/замена плана —
  const handlePlanUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("План этажа — картинка (PNG/JPG)");
      return;
    }
    setUploading(true);
    try {
      const updated = await uploadFloorPlan(folder.id, file);
      setPlanPath(updated.floor_plan);
      onFolderChanged(updated);
      toast.success("План этажа загружен");
    } catch {
      toast.error("Не удалось загрузить план");
    } finally {
      setUploading(false);
    }
  };

  // — Координаты клика/перетаскивания → доли 0..1 —
  const posFromEvent = (clientX: number, clientY: number): Point | null => {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    };
  };

  const persistPoint = async (photoId: number, pt: Point | null) => {
    try {
      await setPhotoPoint(photoId, pt ? pt.x : null, pt ? pt.y : null);
    } catch {
      toast.error("Не удалось сохранить точку");
    }
  };

  // Клик по плану — поставить/переставить точку выбранного фото
  const handlePlanClick = (e: React.MouseEvent) => {
    if (selectedId == null) return;
    const pt = posFromEvent(e.clientX, e.clientY);
    if (!pt) return;
    setPoints((prev) => ({ ...prev, [selectedId]: pt }));
    persistPoint(selectedId, pt);
  };

  // — Перетаскивание точки —
  useEffect(() => {
    if (draggingId == null) return;
    const id = draggingId;
    const onMove = (e: PointerEvent) => {
      const pt = posFromEvent(e.clientX, e.clientY);
      if (pt) setPoints((prev) => ({ ...prev, [id]: pt }));
    };
    const onUp = () => {
      setDraggingId(null);
      setPoints((prev) => {
        persistPoint(id, prev[id] ?? null);
        return prev;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingId]);

  const clearPoint = (photoId: number) => {
    setPoints((prev) => {
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
    persistPoint(photoId, null);
  };

  const selectedPhoto = photos.find((p) => p.id === selectedId) ?? null;
  const placedCount = Object.keys(points).length;

  // — Нет плана: зона загрузки —
  if (!planPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div
          className="flex flex-col items-center justify-center py-16 px-10 rounded-2xl border-2 border-dashed border-white/20 cursor-pointer group hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-5 group-hover:bg-[var(--accent)]/10 transition-colors">
                <ImagePlus size={36} className="text-white/30 group-hover:text-[var(--accent)] transition-colors" />
              </div>
              <p className="text-white/70 text-base font-medium mb-1">Загрузи план этажа</p>
              <p className="text-white/40 text-sm">картинка плана (PNG/JPG), потом расставишь точки</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePlanUpload(e.target.files)}
        />
      </div>
    );
  }

  // — Есть план: холст + список фото —
  return (
    <div className="h-full flex gap-4">
      {/* Холст с планом */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-3 mb-2 text-sm">
          {selectedPhoto ? (
            <span className="text-[var(--accent)]">
              Кликни по плану — поставить точку «{selectedPhoto.title}»
            </span>
          ) : (
            <span className="text-white/50">Выбери фото справа, потом кликни по плану</span>
          )}
          <span className="ml-auto text-white/40">
            {placedCount} из {photos.length} на плане
          </span>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto rounded-xl bg-black/20">
          <div ref={planRef} className="relative inline-block leading-none">
            <img
              src={mediaUrl(planPath)}
              alt="План этажа"
              className="max-w-full max-h-[58vh] block select-none"
              draggable={false}
            />
            {/* Слой точек + клик по плану */}
            <div
              className={`absolute inset-0 ${selectedId != null ? "cursor-crosshair" : ""}`}
              onClick={handlePlanClick}
            >
              {photos.map((photo, index) => {
                const pt = points[photo.id];
                if (!pt) return null;
                const active = photo.id === selectedId;
                return (
                  <div
                    key={photo.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group/dot"
                    style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
                  >
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(photo.id);
                        setDraggingId(photo.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 shadow-lg cursor-grab active:cursor-grabbing transition-colors ${
                        active
                          ? "bg-[var(--accent)] border-white text-white scale-110"
                          : "bg-white border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                      }`}
                      title={photo.title}
                    >
                      {index + 1}
                    </button>
                    {/* Снять точку */}
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPoint(photo.id);
                      }}
                      className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/dot:opacity-100 transition-opacity"
                      title="Снять с плана"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Список фото */}
      <div className="w-56 shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Фото</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-[var(--accent)] transition-colors disabled:opacity-50"
            title="Заменить план этажа"
          >
            <RefreshCw size={12} />
            План
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          {photos.map((photo, index) => {
            const placed = !!points[photo.id];
            const active = photo.id === selectedId;
            return (
              <button
                key={photo.id}
                onClick={() => setSelectedId(active ? null : photo.id)}
                className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors border ${
                  active
                    ? "bg-[var(--accent)]/20 border-[var(--accent)]"
                    : "bg-white/5 border-transparent hover:bg-white/10"
                }`}
              >
                <span className="relative shrink-0">
                  <img
                    src={mediaUrl(photo.thumbnail || photo.image)}
                    alt={photo.title}
                    className="w-10 h-10 rounded object-cover"
                    loading="lazy"
                  />
                  <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs truncate">{photo.title}</span>
                  <span className={`flex items-center gap-1 text-[10px] ${placed ? "text-green-400" : "text-white/40"}`}>
                    <MapPin size={10} />
                    {placed ? "на плане" : "не на плане"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePlanUpload(e.target.files)}
      />
    </div>
  );
}
