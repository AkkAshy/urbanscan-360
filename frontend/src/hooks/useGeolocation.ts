import { useEffect, useState } from "react";

interface GeoPosition {
  latitude: number;
  longitude: number;
}

/**
 * Хук для получения геолокации браузера.
 * Запрашивает разрешение один раз при монтировании.
 * Возвращает { position, loading, error }.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Геолокация не поддерживается");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, loading, error };
}
