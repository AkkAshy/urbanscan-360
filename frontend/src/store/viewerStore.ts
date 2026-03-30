import { create } from "zustand";
import type { PhotoViewer, PhotoLink } from "../types";
import { getPhotoLinks } from "../api/photos";

interface ViewerState {
  photos: PhotoViewer[];
  currentIndex: number;
  folderId: number | null;
  links: PhotoLink[];
  loadingLinks: boolean;
  /** Режим редактирования связей (хотспотов) */
  linkEditMode: boolean;

  /** Загрузить фото для вьювера */
  setPhotos: (photos: PhotoViewer[], folderId: number) => void;
  /** Перейти к фото по индексу */
  goTo: (index: number) => void;
  /** Перейти к фото по ID (навигация по хотспотам) */
  goToId: (id: number) => void;
  /** Следующее фото (fallback линейная навигация) */
  next: () => void;
  /** Предыдущее фото (fallback линейная навигация) */
  prev: () => void;
  /** Текущее фото */
  currentPhoto: () => PhotoViewer | null;
  /** Загрузить связи текущего фото */
  fetchLinks: () => Promise<void>;
  /** Включить/выключить режим линковки */
  setLinkEditMode: (on: boolean) => void;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  photos: [],
  currentIndex: 0,
  folderId: null,
  links: [],
  loadingLinks: false,
  linkEditMode: false,

  setPhotos: (photos, folderId) => {
    set({ photos, folderId, currentIndex: 0, links: [] });
    get().fetchLinks();
  },

  goTo: (index) => {
    const { photos } = get();
    if (index >= 0 && index < photos.length) {
      set({ currentIndex: index, links: [] });
      get().fetchLinks();
    }
  },

  goToId: (id) => {
    const { photos } = get();
    const index = photos.findIndex((p) => p.id === id);
    if (index !== -1) {
      set({ currentIndex: index, links: [] });
      get().fetchLinks();
    }
  },

  next: () => {
    const { currentIndex, photos } = get();
    if (currentIndex < photos.length - 1) {
      set({ currentIndex: currentIndex + 1, links: [] });
      get().fetchLinks();
    }
  },

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1, links: [] });
      get().fetchLinks();
    }
  },

  currentPhoto: () => {
    const { photos, currentIndex } = get();
    return photos[currentIndex] ?? null;
  },

  fetchLinks: async () => {
    const photo = get().currentPhoto();
    if (!photo) {
      set({ links: [], loadingLinks: false });
      return;
    }

    set({ loadingLinks: true });
    try {
      const links = await getPhotoLinks(photo.id);
      // Проверяем что фото не сменилось пока ждали ответ
      if (get().currentPhoto()?.id === photo.id) {
        set({ links, loadingLinks: false });
      }
    } catch (err) {
      console.error("Ошибка загрузки связей:", err);
      set({ links: [], loadingLinks: false });
    }
  },

  setLinkEditMode: (on) => set({ linkEditMode: on }),
}));
