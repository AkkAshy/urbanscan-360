import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { uploadPhotos } from "../../api/photos";

interface Props {
  folderId: number;
  onUploaded: () => void;
}

export function PhotoUploader({ folderId, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const images = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (images.length === 0) return;

      setUploading(true);
      setProgress(`Загружаю ${images.length} файл(ов)...`);
      try {
        await uploadPhotos(folderId, images);
        onUploaded();
        setProgress("");
      } catch {
        setProgress("Ошибка загрузки");
      } finally {
        setUploading(false);
      }
    },
    [folderId, onUploaded]
  );

  return (
    <div
      className={`border border-dashed rounded-lg px-4 py-2 flex items-center gap-3 transition-colors ${
        dragging
          ? "border-[var(--accent)] bg-[var(--accent)]/5"
          : "border-[var(--border)] hover:border-[var(--text-secondary)]"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <Upload size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
      <p className="text-sm text-[var(--text-secondary)]">
        {uploading ? (
          progress
        ) : (
          <>
            Перетащи фото сюда или{" "}
            <label className="text-[var(--accent)] cursor-pointer hover:underline">
              выбери
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
          </>
        )}
      </p>
    </div>
  );
}
