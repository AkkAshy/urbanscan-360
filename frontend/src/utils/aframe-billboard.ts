import AFRAME from "aframe";

/**
 * Billboard-компонент: entity всегда повёрнут лицом к камере.
 * В A-Frame НЕТ встроенного `look-at` (это community-плагин), поэтому
 * регистрируем свой. Используется для карточек гео-VR и любых меток,
 * которые должны читаться под любым углом.
 *
 * Применение: <a-entity billboard> или el.setAttribute("billboard", "").
 */
if (!AFRAME.components.billboard) {
  AFRAME.registerComponent("billboard", {
    init(this: any) {
      this.target = new AFRAME.THREE.Vector3();
    },
    tick(this: any) {
      const camera = this.el.sceneEl && this.el.sceneEl.camera;
      if (!camera) return;
      camera.getWorldPosition(this.target);
      this.el.object3D.lookAt(this.target);
    },
  });
}
