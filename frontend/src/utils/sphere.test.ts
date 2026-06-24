import { describe, it, expect } from "vitest";
import { skyPointToYawPitch, yawPitchToXyz } from "./sphere";

describe("skyPointToYawPitch", () => {
  it("точка спереди (0,0,-R) → yaw 0, pitch 0", () => {
    const r = skyPointToYawPitch({ x: 0, y: 0, z: -500 });
    expect(r.yaw).toBeCloseTo(0, 1);
    expect(r.pitch).toBeCloseTo(0, 1);
  });

  it("точка справа (R,0,0) → yaw 90", () => {
    const r = skyPointToYawPitch({ x: 500, y: 0, z: 0 });
    expect(r.yaw).toBeCloseTo(90, 1);
  });

  it("точка сверху → pitch ~90", () => {
    const r = skyPointToYawPitch({ x: 0, y: 500, z: 0 });
    expect(r.pitch).toBeCloseTo(90, 1);
  });

  it("yaw всегда в диапазоне 0..360", () => {
    const r = skyPointToYawPitch({ x: -1, y: 0, z: 1 }); // сзади-слева
    expect(r.yaw).toBeGreaterThanOrEqual(0);
    expect(r.yaw).toBeLessThan(360);
  });
});

describe("round-trip yawPitchToXyz → skyPointToYawPitch", () => {
  it("сохраняет yaw/pitch", () => {
    for (const [yaw, pitch] of [[0, 0], [90, 0], [200, 15], [340, -30]]) {
      const p = yawPitchToXyz(yaw, pitch, 8);
      const back = skyPointToYawPitch(p);
      expect(back.yaw).toBeCloseTo(yaw, 1);
      expect(back.pitch).toBeCloseTo(pitch, 1);
    }
  });
});
