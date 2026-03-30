import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { getFolderMapPoints } from "../api/folders";
import type { FolderMapPoint } from "../types";
import { AppLayout } from "../components/layout/AppLayout";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useGeolocation } from "../hooks/useGeolocation";

import "leaflet/dist/leaflet.css";

// Кастомная иконка для маркера (синяя точка)
const markerIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#4FC3F7;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/** Автоподгонка карты под все точки */
function FitBounds({ points }: { points: FolderMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.latitude, p.longitude])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
  }, [points, map]);

  return null;
}

/** Центрирует карту на позицию пользователя (один раз) */
function UserLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
}

// Нукус — дефолтный центр
const DEFAULT_CENTER: [number, number] = [42.46, 59.6];

export function MapPage() {
  const [points, setPoints] = useState<FolderMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { position: geoPosition } = useGeolocation();

  // Загрузка папок с GPS
  useEffect(() => {
    getFolderMapPoints()
      .then(setPoints)
      .finally(() => setLoading(false));
  }, []);

  // Клик по маркеру → переход во вьювер
  const openInViewer = useCallback(
    (folderId: number) => {
      navigate(`/upload`);
    },
    [navigate]
  );

  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] relative">
        {/* Карта */}
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner size={40} />
          </div>
        ) : (
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={12}
            className="h-full w-full"
            style={{ background: "#1a1a2e" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Если есть точки — подгоняем под них */}
            <FitBounds points={points} />
            {/* Если точек нет и есть геолокация — центрируем на пользователе */}
            {points.length === 0 && geoPosition && (
              <UserLocation
                lat={geoPosition.latitude}
                lng={geoPosition.longitude}
              />
            )}
            {points.map((point) => (
              <Marker
                key={point.id}
                position={[point.latitude, point.longitude]}
                icon={markerIcon}
                eventHandlers={{ click: () => openInViewer(point.id) }}
              >
                <Popup>
                  <div className="text-center">
                    <p className="text-sm font-medium">{point.name}</p>
                    <p className="text-xs text-gray-500">
                      {point.photo_count} фото
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* Счётчик */}
        {!loading && (
          <div className="absolute bottom-4 left-4 z-[1000] px-3 py-1.5 rounded-lg bg-black/50 text-white text-sm backdrop-blur-sm">
            {points.length} объектов на карте
          </div>
        )}
      </div>
    </AppLayout>
  );
}
