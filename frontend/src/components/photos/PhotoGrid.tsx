import { Calendar, Eye, Trash2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { deletePhoto } from "../../api/photos";
import { mediaUrl } from "../../api/client";
import { toast } from "../../store/toastStore";
import type { Photo } from "../../types";

interface Props {
  photos: Photo[];
  onRefresh: () => void;
  onPhotoClick?: (photo: Photo, index: number) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function PhotoGrid({ photos, onRefresh, onPhotoClick }: Props) {
  const user = useAuthStore((s) => s.user);
  const canDelete = user?.role === "admin" || user?.role === "manager";

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Удалить фото "${title}"?`)) return;
    try {
      await deletePhoto(id);
      toast.success(`Фото "${title}" удалено`);
      onRefresh();
    } catch {
      toast.error("Ошибка при удалении фото");
    }
  };

  if (photos.length === 0) {
    return (
      <p className="text-[var(--text-secondary)] text-sm text-center py-12">
        Нет фотографий. Загрузи первые 360° снимки!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden group"
        >
          {/* Превью — клик открывает 360° просмотр */}
          <div
            className="aspect-video bg-[var(--bg-secondary)] relative cursor-pointer"
            onClick={() => onPhotoClick?.(photo, index)}
          >
            <img
              src={mediaUrl(photo.thumbnail || photo.image)}
              alt={photo.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Иконка 360° просмотра */}
            {onPhotoClick && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <Eye size={28} className="text-white drop-shadow-lg" />
              </div>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(photo.id, photo.title);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-[var(--danger)] text-white transition-all cursor-pointer z-10"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Инфо */}
          <div className="p-2.5">
            <p className="text-sm font-medium truncate">{photo.title}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                {formatDate(photo.shot_date || photo.created_at)}
              </span>
              <span>{formatSize(photo.file_size)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
