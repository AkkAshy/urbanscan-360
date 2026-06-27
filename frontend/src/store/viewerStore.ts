import { create } from "zustand";
import type { PhotoViewer, PhotoLink } from "../types";
import { getPhotoLinks } from "../api/photos";

/**
 * Предзагрузка превью связанных панорам — чтобы переход по хотспоту был
 * мгновенным (картинка уже в кеше браузера к моменту клика по метке).
 * photos уже содержат полные URL (mediaUrl применён при открытии вьювера).
 */
function preloadLinkedPhotos(links: PhotoLink[], photos: PhotoViewer[]) {
  for (const link of links) {
    const target = photos.find((p) => p.id === link.to_photo);
    const url = target?.preview || target?.image;
    if (url) {
      const img = new Image();
      img.src = url;
    }
  }
}

interface ViewerState {
  photos: PhotoViewer[];
  currentIndex: number;
  folderId: number | null;
  links: PhotoLink[];
  loadingLinks: boolean;
  /** Режим редактирования связей (хотспотов) */
  linkEditMode: boolean;
  /** В иммерсивном VR ли сейчас (из enter-vr/exit-vr) */
  vrActive: boolean;
  /** Ожидается выбор цели связи: точка, куда поставили стрелку */
  vrPlacing: { yaw: number; pitch: number } | null;
  setVrActive: (on: boolean) => void;
  setVrPlacing: (p: { yaw: number; pitch: number } | null) => void;

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
  vrActive: false,
  vrPlacing: null,

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
        // Предзагрузка панорам, на которые ведут метки — мгновенный переход
        preloadLinkedPhotos(links, get().photos);
      }
    } catch (err) {
      console.error("Ошибка загрузки связей:", err);
      set({ links: [], loadingLinks: false });
    }
  },

  setLinkEditMode: (on) => set({ linkEditMode: on }),
  setVrActive: (on) => set({ vrActive: on }),
  setVrPlacing: (p) => set({ vrPlacing: p }),
}));
