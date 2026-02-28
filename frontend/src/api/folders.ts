import api from "./client";
import type { Folder } from "../types";

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
  data: { name?: string; description?: string }
): Promise<Folder> {
  const { data: folder } = await api.patch<Folder>(`/folders/${id}/`, data);
  return folder;
}

export async function deleteFolder(id: number): Promise<void> {
  await api.delete(`/folders/${id}/`);
}
