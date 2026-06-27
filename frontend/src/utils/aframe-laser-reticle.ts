import AFRAME from "aframe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THREE = (AFRAME as unknown as { THREE: any }).THREE;

/**
 * `laser-reticle`: точка-прицел (кольцо) РОВНО на реальном луче контроллера.
 * Берём точку из `raycaster.intersections[0].point` (мировые координаты) — туда,
 * где луч реально пересекает .clickable и где срабатывает hover. Если пересечения
 * нет — точка на фикс. расстоянии вдоль луча raycaster'а.
 *
 * ВАЖНО: reticle — ребёнок СЦЕНЫ (не контроллера) и позиционируется в мировых
 * координатах. Раньше ставился по локальной оси контроллера (0 0 -dist), а луч
 * laser-controls идёт под углом → прицел не совпадал с точкой попадания
 * (визуально на иконке, а hover срабатывал выше). depthTest:false → поверх.
 */
if (!AFRAME.components["laser-reticle"]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AFRAME.registerComponent("laser-reticle", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    init(this: any) {
      const dot = document.createElement("a-entity");
      dot.setAttribute(
        "geometry",
        "primitive: ring; radiusInner: 0.5; radiusOuter: 1; segmentsTheta: 32"
      );
      dot.setAttribute(
        "material",
        "color: #3b82f6; shader: flat; side: double; opacity: 0.95; depthTest: false"
      );
      this.el.sceneEl.appendChild(dot); // ребёнок СЦЕНЫ — позиция в мире
      this.dot = dot;
      this.camPos = new THREE.Vector3();
      dot.addEventListener("loaded", () => {
        const mesh = dot.getObject3D("mesh");
        if (mesh) mesh.renderOrder = 30; // поверх меток
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tick(this: any) {
      if (!this.dot) return;
      const rc = this.el.components && this.el.components.raycaster;
      const raycaster = rc && rc.raycaster;
      if (!raycaster) return;
      const o = this.dot.object3D;

      const ints = rc.intersections;
      if (ints && ints.length) {
        o.position.copy(ints[0].point); // ровно точка попадания луча
      } else {
        // нет пересечения — точка на фикс. расстоянии вдоль реального луча
        o.position
          .copy(raycaster.ray.origin)
          .addScaledVector(raycaster.ray.direction, 3);
      }

      // лицом к камере + постоянный угловой размер
      const cam = this.el.sceneEl.camera;
      if (cam) {
        cam.getWorldPosition(this.camPos);
        o.lookAt(this.camPos);
        const s = o.position.distanceTo(this.camPos) * 0.02;
        o.scale.set(s, s, s);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    remove(this: any) {
      if (this.dot && this.dot.parentNode) {
        this.dot.parentNode.removeChild(this.dot);
      }
      this.dot = null;
    },
  });
}
