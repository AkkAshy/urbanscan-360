import api from "./client";
import type { Folder, FolderMapPoint, FloorPlan } from "../types";

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

/** Создать этаж (план) в папке — multipart картинка + имя */
export async function createFloorPlan(
  folderId: number,
  file: File,
  name: string,
  order = 0
): Promise<FloorPlan> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("name", name);
  formData.append("order", String(order));
  const { data } = await api.post<FloorPlan>(
    `/folders/${folderId}/floor-plans/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

/** Обновить этаж — имя/порядок (JSON) или заменить картинку (multipart) */
export async function updateFloorPlan(
  id: number,
  patch: { name?: string; order?: number; image?: File }
): Promise<FloorPlan> {
  if (patch.image) {
    const formData = new FormData();
    formData.append("image", patch.image);
    if (patch.name !== undefined) formData.append("name", patch.name);
    if (patch.order !== undefined) formData.append("order", String(patch.order));
    const { data } = await api.patch<FloorPlan>(`/floor-plans/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
  const { data } = await api.patch<FloorPlan>(`/floor-plans/${id}/`, patch);
  return data;
}

/** Удалить этаж */
export async function deleteFloorPlan(id: number): Promise<void> {
  await api.delete(`/floor-plans/${id}/`);
}

export async function deleteFolder(id: number): Promise<void> {
  await api.delete(`/folders/${id}/`);
}
