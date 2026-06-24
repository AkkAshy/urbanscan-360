import { describe, it, expect, beforeEach } from "vitest";
import { useViewerStore } from "./viewerStore";

describe("viewerStore VR-состояние", () => {
  beforeEach(() => {
    useViewerStore.setState({ vrActive: false, vrPlacing: null });
  });

  it("дефолты: vrActive=false, vrPlacing=null", () => {
    const s = useViewerStore.getState();
    expect(s.vrActive).toBe(false);
    expect(s.vrPlacing).toBeNull();
  });

  it("setVrActive переключает флаг", () => {
    useViewerStore.getState().setVrActive(true);
    expect(useViewerStore.getState().vrActive).toBe(true);
  });

  it("setVrPlacing сохраняет и сбрасывает yaw/pitch", () => {
    useViewerStore.getState().setVrPlacing({ yaw: 90, pitch: 10 });
    expect(useViewerStore.getState().vrPlacing).toEqual({ yaw: 90, pitch: 10 });
    useViewerStore.getState().setVrPlacing(null);
    expect(useViewerStore.getState().vrPlacing).toBeNull();
  });
});
