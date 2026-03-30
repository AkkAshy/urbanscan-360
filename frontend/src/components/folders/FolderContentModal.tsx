import { Upload, ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPhotos, uploadPhotos } from "../../api/photos";
import { deleteFolder, updateFolder } from "../../api/folders";
import { useAuthStore } from "../../store/authStore";
import type { Folder, Photo } from "../../types";
import { Modal } from "../ui/Modal";
import { PhotoGrid } from "../photos/PhotoGrid";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { toast } from "../../store/toastStore";

/** Вытаскиваем первый hex-цвет из CSS-градиента */
function extractColor(gradient: string): string {
  const match = gradient.match(/#([0-9a-fA-F]{6})/);
  return match ? match[0] : "#3b82f6";
}

/** Hex → rgba с нужной прозрачностью */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface Props {
  folder: Folder | null;
  onClose: () => void;
  onPhotoClick?: (photo: Photo, index: number, allPhotos: Photo[]) => void;
  onPhotosChanged?: () => void;
  /** Градиент папки — для тинта стекла */
  gradient?: string;
  /** Позиция папки для анимации раскрытия */
  originRect?: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Модальное окно содержимого папки.
 * Кнопка загрузки в хедере, основное пространство — галерея.
 */
export function FolderContentModal({
  folder,
  onClose,
  onPhotoClick,
  onPhotosChanged,
  gradient,
  originRect,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Запоминаем последнюю папку, чтобы Modal мог анимировать закрытие
  const lastFolderRef = useRef<Folder | null>(null);
  if (folder) lastFolderRef.current = folder;
  const displayFolder = folder ?? lastFolderRef.current;

  const loadPhotos = useCallback(async () => {
    if (!folder) return;
    setLoading(true);
    try {
      const data = await getPhotos(folder.id);
      setPhotos(data);
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    if (folder) {
      loadPhotos();
    }
  }, [folder, loadPhotos]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !folder) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadPhotos(folder.id, images, (percent) => setUploadProgress(percent));
      toast.success(`Загружено ${images.length} фото`);
      loadPhotos();
      onPhotosChanged?.();
    } catch {
      toast.error("Ошибка при загрузке фото");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folder) return;
    if (!confirm(`Удалить папку "${folder.name}" и все фото в ней?`)) return;
    try {
      await deleteFolder(folder.id);
      toast.success(`Папка "${folder.name}" удалена`);
      onClose();
      onPhotosChanged?.();
    } catch {
      toast.error("Ошибка при удалении папки");
    }
  };

  // — Inline-edit название папки —
  const startEditing = () => {
    if (!canManage || !displayFolder) return;
    setEditName(displayFolder.name);
    setEditing(true);
    // Фокус ставим после рендера
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const saveRename = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !folder || trimmed === displayFolder?.name) {
      setEditing(false);
      return;
    }
    try {
      await updateFolder(folder.id, { name: trimmed });
      toast.success(`Переименовано в "${trimmed}"`);
      onPhotosChanged?.();
    } catch {
      toast.error("Ошибка при переименовании");
    }
    setEditing(false);
  };

  // — Drag & drop обработчики —
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounterRef.current = 0;
    handleUpload(e.dataTransfer.files);
  };

  const handleRefresh = () => {
    loadPhotos();
    onPhotosChanged?.();
  };

  const handlePhotoClick = (photo: Photo, index: number) => {
    onPhotoClick?.(photo, index, photos);
  };

  if (!displayFolder) return null;

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs transition-colors cursor-pointer disabled:opacity-70 overflow-hidden"
      >
        {uploading && (
          <div
            className="absolute inset-0 bg-white/20 transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        )}
        <Upload size={14} className="relative z-10" />
        <span className="relative z-10">
          {uploading ? `${uploadProgress}%` : "Загрузить"}
        </span>
      </button>
      {canManage && (
        <button
          onClick={handleDeleteFolder}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-xs transition-colors cursor-pointer"
          title="Удалить папку"
        >
          <Trash2 size={14} />
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
    </div>
  );

  const accentColor = gradient ? extractColor(gradient) : "#3b82f6";
  const glassStyle = {
    backgroundColor: `color-mix(in srgb, ${accentColor} 12%, rgba(15, 15, 30, 0.55))`,
    borderColor: hexToRgba(accentColor, 0.3),
    boxShadow: `0 8px 40px ${hexToRgba(accentColor, 0.15)}`,
  };

  return (
    <Modal
      open={!!folder}
      onClose={onClose}
      title={
        editing ? (
          <input
            ref={editInputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") setEditing(false);
            }}
            className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-lg font-semibold outline-none focus:border-[var(--accent)] w-48"
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={startEditing}
            className={canManage ? "cursor-pointer hover:text-[var(--accent)] transition-colors" : ""}
            title={canManage ? "Двойной клик для переименования" : undefined}
          >
            {displayFolder.name}
          </span>
        )
      }
      widthClass="max-w-[80vw] h-[80vh]"
      headerAction={headerActions}
      glass
      containerStyle={glassStyle}
      originRect={originRect}
    >
      {/* Drag & drop зона — оборачивает весь контент */}
      <div
        className="relative h-full"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : photos.length === 0 ? (
          /* Красивое пустое состояние — drag-зона */
          <div
            className="flex flex-col items-center justify-center py-20 cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center mb-5 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/10 transition-all duration-300">
              <ImagePlus size={36} className="text-white/30 group-hover:text-[var(--accent)] transition-colors duration-300" />
            </div>
            <p className="text-white/70 text-base font-medium mb-1">
              Перетащи фото сюда
            </p>
            <p className="text-white/40 text-sm">
              или нажми чтобы выбрать файлы
            </p>
          </div>
        ) : (
          <PhotoGrid
            photos={photos}
            onRefresh={handleRefresh}
            onPhotoClick={handlePhotoClick}
          />
        )}

        {/* Оверлей при перетаскивании файлов */}
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)] backdrop-blur-sm transition-all">
            <div className="flex flex-col items-center gap-2">
              <Upload size={48} className="text-[var(--accent)] animate-bounce" />
              <p className="text-[var(--accent)] font-semibold text-lg">
                Отпусти для загрузки
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
