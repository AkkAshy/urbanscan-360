import { describe, it, expect } from "vitest";
import { bearing, haversineKm } from "./geo";

describe("bearing", () => {
  it("строго на север → 0°", () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(0, 0);
  });
  it("строго на восток → 90°", () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90, 0);
  });
  it("Нукус → Ташкент ≈ 96° (почти восток)", () => {
    const b = bearing({ lat: 42.4731, lon: 59.6103 }, { lat: 41.3111, lon: 69.2797 });
    expect(b).toBeGreaterThan(90);
    expect(b).toBeLessThan(102);
  });
  it("всегда в диапазоне 0..360", () => {
    const b = bearing({ lat: 42, lon: 60 }, { lat: 50, lon: 40 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("haversineKm", () => {
  it("1° долготы на экваторе ≈ 111 км", () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111, 0);
  });
  it("Нукус → Ташкент ≈ 740 км", () => {
    const d = haversineKm({ lat: 42.4731, lon: 59.6103 }, { lat: 41.3111, lon: 69.2797 });
    expect(d).toBeGreaterThan(690);
    expect(d).toBeLessThan(820);
  });
});
