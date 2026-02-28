import { useState } from "react";
import { createFolder } from "../../api/folders";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateFolderModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createFolder(name.trim(), description.trim());
      toast.success(`Папка "${name.trim()}" создана`);
      setName("");
      setDescription("");
      onCreated();
      onClose();
    } catch {
      toast.error("Ошибка при создании папки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Новая папка">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
            Название
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            autoFocus
            required
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">
            Описание (необязательно)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Создаю..." : "Создать"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
