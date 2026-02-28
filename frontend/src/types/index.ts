/* Типы данных для API */

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "manager" | "uploader";
}

export interface Folder {
  id: number;
  name: string;
  description: string;
  created_by: number | null;
  created_by_name: string;
  photo_count: number;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: number;
  folder: number;
  title: string;
  image: string;
  thumbnail: string | null;
  file_size: number;
  uploaded_by: number | null;
  uploaded_by_name: string;
  shot_date: string | null;
  created_at: string;
}

export interface PhotoViewer {
  id: number;
  title: string;
  image: string;
  thumbnail: string | null;
  shot_date: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
