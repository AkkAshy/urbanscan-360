/** Точка в 3D на сфере (координаты A-Frame). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Угловое положение на сфере. yaw 0..360 (горизонталь), pitch -90..90 (вертикаль). */
export interface YawPitch {
  yaw: number;
  pitch: number;
}

/**
 * Точка пересечения луча со сферой → yaw/pitch.
 * yaw отсчитывается от -Z (перёд) по часовой; нормализуется в 0..360.
 */
export function skyPointToYawPitch({ x, y, z }: Vec3): YawPitch {
  let yaw = Math.atan2(x, -z) * (180 / Math.PI);
  if (yaw < 0) yaw += 360;
  const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
  return { yaw, pitch };
}

/** yaw/pitch + радиус → точка в 3D (обратное к skyPointToYawPitch). */
export function yawPitchToXyz(yaw: number, pitch: number, radius: number): Vec3 {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  const hR = Math.cos(pitchRad) * radius;
  return {
    x: Math.sin(yawRad) * hR,
    y: Math.sin(pitchRad) * radius,
    z: -Math.cos(yawRad) * hR,
  };
}
