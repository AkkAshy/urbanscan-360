import { create } from "zustand";
import type { PhotoViewer } from "../types";

interface ViewerState {
  photos: PhotoViewer[];
  currentIndex: number;
  folderId: number | null;
  /** Загрузить фото для вьювера */
  setPhotos: (photos: PhotoViewer[], folderId: number) => void;
  /** Перейти к фото по индексу */
  goTo: (index: number) => void;
  /** Следующее фото */
  next: () => void;
  /** Предыдущее фото */
  prev: () => void;
  /** Текущее фото */
  currentPhoto: () => PhotoViewer | null;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  photos: [],
  currentIndex: 0,
  folderId: null,

  setPhotos: (photos, folderId) => set({ photos, folderId, currentIndex: 0 }),

  goTo: (index) => {
    const { photos } = get();
    if (index >= 0 && index < photos.length) {
      set({ currentIndex: index });
    }
  },

  next: () => {
    const { currentIndex, photos } = get();
    if (currentIndex < photos.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  currentPhoto: () => {
    const { photos, currentIndex } = get();
    return photos[currentIndex] ?? null;
  },
}));
