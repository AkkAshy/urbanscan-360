import api from "./client";
import type { Photo, PhotoViewer, PhotoNeighbor, PhotoLink, MapPoint } from "../types";

export async function getPhotos(folderId: number, limit?: number): Promise<Photo[]> {
  const params = limit ? { limit } : undefined;
  const { data } = await api.get<Photo[]>(`/folders/${folderId}/photos/`, { params });
  return data;
}

export async function getViewerPhotos(
  folderId: number
): Promise<PhotoViewer[]> {
  const { data } = await api.get<PhotoViewer[]>(
    `/folders/${folderId}/photos/viewer/`
  );
  return data;
}

export async function uploadPhotos(
  folderId: number,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<Photo[]> {
  const formData = new FormData();
  formData.append("folder", String(folderId));
  files.forEach((file) => formData.append("image", file));

  const { data } = await api.post<Photo | Photo[]>(
    `/folders/${folderId}/photos/`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress
        ? (e) => {
            const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            onProgress(percent);
          }
        : undefined,
    }
  );

  // API возвращает массив при batch upload, один объект при одном файле
  return Array.isArray(data) ? data : [data];
}

export async function deletePhoto(id: number): Promise<void> {
  await api.delete(`/photos/${id}/`);
}

/** Ближайшие фото по GPS (для пространственных стрелок) */
export async function getPhotoNeighbors(
  photoId: number,
  maxDistance = 100,
  limit = 4
): Promise<PhotoNeighbor[]> {
  const { data } = await api.get<PhotoNeighbor[]>(
    `/photos/${photoId}/neighbors/`,
    { params: { max_distance: maxDistance, limit } }
  );
  return data;
}

/** Все фото с GPS в папке (для карты) */
export async function getMapPoints(folderId: number): Promise<MapPoint[]> {
  const { data } = await api.get<MapPoint[]>(
    `/folders/${folderId}/photos/map_points/`
  );
  return data;
}

/** Все связи ИЗ фото (хотспоты для навигации) */
export async function getPhotoLinks(photoId: number): Promise<PhotoLink[]> {
  const { data } = await api.get<PhotoLink[]>(`/photos/${photoId}/links/`);
  return data;
}

/** Создать связь-хотспот между фото */
export async function createPhotoLink(
  fromId: number,
  toId: number,
  yaw: number,
  pitch: number
): Promise<PhotoLink> {
  const { data } = await api.post<PhotoLink>(`/photos/${fromId}/links/create/`, {
    to_photo: toId,
    yaw,
    pitch,
  });
  return data;
}

/** Удалить связь-хотспот */
export async function deletePhotoLink(linkId: number): Promise<void> {
  await api.delete(`/photo-links/${linkId}/`);
}
