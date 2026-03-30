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
  latitude: number | null;
  longitude: number | null;
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
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface PhotoViewer {
  id: number;
  title: string;
  image: string;
  thumbnail: string | null;
  shot_date: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Сосед текущего фото (для пространственной навигации) */
export interface PhotoNeighbor {
  id: number;
  title: string;
  thumbnail: string | null;
  distance: number;
  bearing: number;
}

/** Связь между фото — хотспот (дверь, проход и т.д.) */
export interface PhotoLink {
  id: number;
  from_photo: number;
  to_photo: number;
  to_title: string;
  to_thumbnail: string | null;
  yaw: number;
  pitch: number;
}

/** Точка на карте (папка с GPS) */
export interface FolderMapPoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  photo_count: number;
}

/** Точка на карте (фото с GPS — для EXIF/дронов) */
export interface MapPoint {
  id: number;
  title: string;
  thumbnail: string | null;
  latitude: number;
  longitude: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
