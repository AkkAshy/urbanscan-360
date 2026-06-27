import AFRAME from "aframe";

/**
 * `screen-facing`: плоскость всегда параллельна экрану камеры (как HUD-прицел).
 * Копируем кватернион камеры каждый кадр — в отличие от look-at/lookAt объект
 * НИКОГДА не встаёт боком/ребром и не кренится (нет roll). Для маркеров-меток,
 * которые должны читаться точно «в лоб» под любым углом обзора.
 *
 * Применение: <a-plane screen-facing> или el.setAttribute("screen-facing", "").
 */
if (!AFRAME.components["screen-facing"]) {
  AFRAME.registerComponent("screen-facing", {
    tick(this: { el: { sceneEl?: { camera?: unknown }; object3D: { quaternion: unknown } } }) {
      const camera = this.el.sceneEl && this.el.sceneEl.camera;
      if (!camera) return;
      (camera as { getWorldQuaternion: (q: unknown) => void }).getWorldQuaternion(
        this.el.object3D.quaternion
      );
    },
  });
}
