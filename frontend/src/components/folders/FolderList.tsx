import { Folder as FolderIcon, ImageIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteFolder } from "../../api/folders";
import type { Folder } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";
import { CreateFolderModal } from "./CreateFolderModal";

interface Props {
  folders: Folder[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefresh: () => void;
}

export function FolderList({ folders, selectedId, onSelect, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const user = useAuthStore((s) => s.user);
  const canDelete = user?.role === "admin" || user?.role === "manager";

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить папку "${name}" и все фото внутри?`)) return;
    try {
      await deleteFolder(id);
      onRefresh();
    } catch {
      alert("Ошибка при удалении папки");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок + кнопка */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h2 className="font-semibold text-sm">Папки</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} className="mr-1" />
          Новая
        </Button>
      </div>

      {/* Список папок */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {folders.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)] text-center py-8">
            Нет папок. Создай первую!
          </p>
        )}
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onSelect(folder.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group ${
              selectedId === folder.id
                ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30"
                : "hover:bg-[var(--bg-hover)]"
            }`}
          >
            <FolderIcon
              size={18}
              className={
                selectedId === folder.id
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-secondary)]"
              }
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{folder.name}</p>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <ImageIcon size={10} /> {folder.photo_count} фото
              </p>
            </div>
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(folder.id, folder.name);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--danger)]/20 text-[var(--danger)] cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <CreateFolderModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={onRefresh}
      />
    </div>
  );
}
