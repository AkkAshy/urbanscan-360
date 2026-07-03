import api from "./client";
import type { Folder, FolderMapPoint } from "../types";

export async function getFolders(): Promise<Folder[]> {
  const { data } = await api.get<Folder[]>("/folders/");
  return data;
}

export async function getFolder(id: number): Promise<Folder> {
  const { data } = await api.get<Folder>(`/folders/${id}/`);
  return data;
}

export async function createFolder(
  name: string,
  description?: string
): Promise<Folder> {
  const { data } = await api.post<Folder>("/folders/", { name, description });
  return data;
}

export async function updateFolder(
  id: number,
  data: { name?: string; description?: string; latitude?: number | null; longitude?: number | null }
): Promise<Folder> {
  const { data: folder } = await api.patch<Folder>(`/folders/${id}/`, data);
  return folder;
}

/** Папки с GPS для карты */
export async function getFolderMapPoints(): Promise<FolderMapPoint[]> {
  const { data } = await api.get<FolderMapPoint[]>("/folders/map_points/");
  return data;
}

/** Загрузить/заменить план этажа папки (multipart) */
export async function uploadFloorPlan(
  folderId: number,
  file: File
): Promise<Folder> {
  const formData = new FormData();
  formData.append("floor_plan", file);
  const { data } = await api.patch<Folder>(`/folders/${folderId}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteFolder(id: number): Promise<void> {
  await api.delete(`/folders/${id}/`);
}
