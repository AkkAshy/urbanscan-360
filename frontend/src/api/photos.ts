import api from "./client";
import type { Photo, PhotoViewer } from "../types";

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
