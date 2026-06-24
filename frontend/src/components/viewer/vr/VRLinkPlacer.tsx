import { useEffect } from "react";
import { useViewerStore } from "../../../store/viewerStore";
import { skyPointToYawPitch } from "../../../utils/sphere";

interface Props {
  sceneRef: React.MutableRefObject<HTMLElement | null>;
  /** true когда ждём клик по сцене для постановки стрелки */
  arming: boolean;
}

/**
 * В VR-режиме «Создать»: ловит клик лучом по <a-sky>, считает yaw/pitch,
 * кладёт в vrPlacing (после чего показывается VRPhotoPicker).
 */
export function VRLinkPlacer({ sceneRef, arming }: Props) {
  const setVrPlacing = useViewerStore((s) => s.setVrPlacing);

  useEffect(() => {
    if (!arming) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const sky = scene.querySelector("#photo-sky");
    if (!sky) return;

    sky.classList.add("clickable");
    const onClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.intersection?.point) return;
      setVrPlacing(skyPointToYawPitch(detail.intersection.point));
    };
    sky.addEventListener("click", onClick);

    return () => {
      sky.removeEventListener("click", onClick);
      // класс clickable у sky оставляем — он нужен и десктопному LinkEditor
    };
  }, [arming, sceneRef, setVrPlacing]);

  return null;
}
