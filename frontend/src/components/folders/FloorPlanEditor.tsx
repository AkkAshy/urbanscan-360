import { ImagePlus, MapPin, Plus, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createFloorPlan, deleteFloorPlan, updateFloorPlan } from "../../api/folders";
import { setPhotoPoint } from "../../api/photos";
import { mediaUrl } from "../../api/client";
import { toast } from "../../store/toastStore";
import type { FloorPlan, Folder, Photo } from "../../types";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface Props {
  folder: Folder;
  photos: Photo[];
  /** Этажи изменились (создан/удалён/переименован) — обновить папку в родителе */
  onFolderChanged: () => void;
}

/** Точка фото: координаты 0..1 + на каком этаже стоит */
type Point = { x: number; y: number; floor: number };

/**
 * Редактор планов этажей: у объекта (папки) может быть 1+ этажей.
 * Табы этажей сверху; на активном этаже расставляешь точки-фото.
 * Клик по плану = поставить выбранное фото на ТЕКУЩИЙ этаж (0..1).
 */
export function FloorPlanEditor({ folder, photos, onFolderChanged }: Props) {
  const planRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileModeRef = useRef<"add" | "replace">("add");

  const [floors, setFloors] = useState<FloorPlan[]>(folder.floor_plans ?? []);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(
    folder.floor_plans?.[0]?.id ?? null
  );
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState<Record<number, Point>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const initPoints = useCallback((): Record<number, Point> => {
    const acc: Record<number, Point> = {};
    for (const p of photos) {
      if (p.map_x != null && p.map_y != null && p.floor != null) {
        acc[p.id] = { x: p.map_x, y: p.map_y, floor: p.floor };
      }
    }
    return acc;
  }, [photos]);

  // Смена папки — пересобрать этажи/точки
  useEffect(() => {
    setFloors(folder.floor_plans ?? []);
    setActiveFloorId(folder.floor_plans?.[0]?.id ?? null);
    setPoints(initPoints());
    setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder.id]);

  // Фото подгрузились асинхронно — засеять точки один раз
  useEffect(() => {
    setPoints((prev) => (Object.keys(prev).length === 0 ? initPoints() : prev));
  }, [photos, initPoints]);

  const activeFloor = floors.find((f) => f.id === activeFloorId) ?? null;

  // — Загрузка файла: создать этаж ИЛИ заменить картинку активного —
  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("План этажа — картинка (PNG/JPG)");
      return;
    }
    setBusy(true);
    try {
      if (fileModeRef.current === "replace" && activeFloorId != null) {
        const updated = await updateFloorPlan(activeFloorId, { image: file });
        setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        toast.success("План этажа заменён");
      } else {
        const name = `${floors.length + 1} этаж`;
        const created = await createFloorPlan(folder.id, file, name, floors.length);
        setFloors((prev) => [...prev, created]);
        setActiveFloorId(created.id);
        toast.success(`Этаж «${created.name}» добавлен`);
      }
      onFolderChanged();
    } catch {
      toast.error("Не удалось сохранить план");
    } finally {
      setBusy(false);
    }
  };

  const openFilePicker = (mode: "add" | "replace") => {
    fileModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const renameFloor = async (floor: FloorPlan) => {
    const name = prompt("Название этажа", floor.name)?.trim();
    if (!name || name === floor.name) return;
    try {
      const updated = await updateFloorPlan(floor.id, { name });
      setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      onFolderChanged();
    } catch {
      toast.error("Не удалось переименовать");
    }
  };

  const removeFloor = async (floor: FloorPlan) => {
    if (!confirm(`Удалить этаж «${floor.name}»? Точки фото на нём слетят.`)) return;
    try {
      await deleteFloorPlan(floor.id);
      setFloors((prev) => {
        const next = prev.filter((f) => f.id !== floor.id);
        if (activeFloorId === floor.id) setActiveFloorId(next[0]?.id ?? null);
        return next;
      });
      // Локально снять точки, стоявшие на этом этаже (бэк уже обнулил floor)
      setPoints((prev) => {
        const next = { ...prev };
        for (const [id, pt] of Object.entries(next)) {
          if (pt.floor === floor.id) delete next[Number(id)];
        }
        return next;
      });
      onFolderChanged();
    } catch {
      toast.error("Не удалось удалить этаж");
    }
  };

  // — Координаты клика → доли 0..1 —
  const posFromEvent = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    };
  };

  const persistPoint = async (photoId: number, floorId: number | null, x: number | null, y: number | null) => {
    try {
      await setPhotoPoint(photoId, floorId, x, y);
    } catch {
      toast.error("Не удалось сохранить точку");
    }
  };

  // Клик по плану — поставить выбранное фото на текущий этаж
  const handlePlanClick = (e: React.MouseEvent) => {
    if (selectedId == null || activeFloorId == null) return;
    const pos = posFromEvent(e.clientX, e.clientY);
    if (!pos) return;
    const pt: Point = { ...pos, floor: activeFloorId };
    setPoints((prev) => ({ ...prev, [selectedId]: pt }));
    persistPoint(selectedId, activeFloorId, pt.x, pt.y);
  };

  // — Перетаскивание точки —
  useEffect(() => {
    if (draggingId == null) return;
    const id = draggingId;
    const onMove = (e: PointerEvent) => {
      const pos = posFromEvent(e.clientX, e.clientY);
      if (pos) {
        setPoints((prev) => {
          const cur = prev[id];
          if (!cur) return prev;
          return { ...prev, [id]: { ...pos, floor: cur.floor } };
        });
      }
    };
    const onUp = () => {
      setDraggingId(null);
      setPoints((prev) => {
        const cur = prev[id];
        if (cur) persistPoint(id, cur.floor, cur.x, cur.y);
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
    persistPoint(photoId, null, null, null);
  };

  const selectedPhoto = photos.find((p) => p.id === selectedId) ?? null;
  const floorName = (id: number | null) => floors.find((f) => f.id === id)?.name ?? null;
  const placedOnActive = photos.filter((p) => points[p.id]?.floor === activeFloorId);

  // Табы этажей
  const floorTabs = (
    <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
      {floors.map((f) => {
        const active = f.id === activeFloorId;
        return (
          <div
            key={f.id}
            className={`group/tab flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-lg text-xs whitespace-nowrap border cursor-pointer transition-colors ${
              active
                ? "bg-[var(--accent)]/20 border-[var(--accent)] text-white"
                : "bg-white/5 border-transparent text-white/60 hover:bg-white/10"
            }`}
            onClick={() => setActiveFloorId(f.id)}
            onDoubleClick={() => renameFloor(f)}
            title="Двойной клик — переименовать"
          >
            {f.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFloor(f);
              }}
              className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 hover:bg-red-500/30 hover:text-red-400 transition-all"
              title="Удалить этаж"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <button
        onClick={() => openFilePicker("add")}
        disabled={busy}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap bg-white/5 hover:bg-[var(--accent)]/20 text-white/70 hover:text-white border border-dashed border-white/20 transition-colors disabled:opacity-50"
      >
        <Plus size={13} />
        Этаж
      </button>
    </div>
  );

  // — Нет этажей: зона создания первого —
  if (floors.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {floorTabs}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="flex flex-col items-center justify-center py-16 px-10 rounded-2xl border-2 border-dashed border-white/20 cursor-pointer group hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
            onClick={() => openFilePicker("add")}
          >
            {busy ? (
              <LoadingSpinner />
            ) : (
              <>
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-5 group-hover:bg-[var(--accent)]/10 transition-colors">
                  <ImagePlus size={36} className="text-white/30 group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <p className="text-white/70 text-base font-medium mb-1">Добавь первый этаж</p>
                <p className="text-white/40 text-sm">картинка плана (PNG/JPG), потом расставишь точки</p>
              </>
            )}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files)} />
      </div>
    );
  }

  // — Есть этажи: табы + холст + список фото —
  return (
    <div className="h-full flex flex-col">
      {floorTabs}

      <div className="flex-1 min-h-0 flex gap-4">
        {/* Холст с активным планом */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-3 mb-2 text-sm">
            {selectedPhoto ? (
              <span className="text-[var(--accent)]">
                Кликни по плану — «{selectedPhoto.title}» на этаж «{activeFloor?.name}»
              </span>
            ) : (
              <span className="text-white/50">Выбери фото справа, потом кликни по плану</span>
            )}
            <span className="ml-auto text-white/40">{placedOnActive.length} на этом этаже</span>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto rounded-xl bg-black/20">
            {activeFloor && (
              <div ref={planRef} className="relative inline-block leading-none">
                <img
                  src={mediaUrl(activeFloor.image)}
                  alt={activeFloor.name}
                  className="max-w-full max-h-[52vh] block select-none"
                  draggable={false}
                />
                <div
                  className={`absolute inset-0 ${selectedId != null ? "cursor-crosshair" : ""}`}
                  onClick={handlePlanClick}
                >
                  {photos.map((photo, index) => {
                    const pt = points[photo.id];
                    if (!pt || pt.floor !== activeFloorId) return null;
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
            )}
          </div>
        </div>

        {/* Список фото */}
        <div className="w-56 shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Фото</span>
            <button
              onClick={() => openFilePicker("replace")}
              disabled={busy || !activeFloor}
              className="flex items-center gap-1 text-xs text-white/50 hover:text-[var(--accent)] transition-colors disabled:opacity-40"
              title="Заменить картинку этого этажа"
            >
              <RefreshCw size={12} />
              План
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {photos.map((photo, index) => {
              const pt = points[photo.id];
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
                    <span className={`flex items-center gap-1 text-[10px] ${pt ? "text-green-400" : "text-white/40"}`}>
                      <MapPin size={10} />
                      {pt ? floorName(pt.floor) ?? "на плане" : "не размещено"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files)} />
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
