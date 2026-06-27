import AFRAME from "aframe";

/**
 * `laser-reticle`: точка-прицел (кольцо) на конце луча VR-контроллера.
 * Прилипает к точке пересечения с `.clickable` (метки/папки), а если луч ни во
 * что не упёрся — висит на фикс. расстоянии. Масштабируется с дистанцией, чтобы
 * угловой размер был постоянным. depthTest:false → всегда поверх.
 *
 * Не зависит от laser-controls line (тот может не рисоваться) — даёт визуальную
 * обратную связь «куда указываю» гарантированно. Вешать на entity с raycaster.
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
      dot.setAttribute("position", "0 0 -2");
      this.el.appendChild(dot);
      this.dot = dot;
      dot.addEventListener("loaded", () => {
        const mesh = dot.getObject3D("mesh");
        if (mesh) mesh.renderOrder = 30; // поверх меток
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tick(this: any) {
      if (!this.dot) return;
      const rc = this.el.components && this.el.components.raycaster;
      const ints = rc && rc.intersections;
      const dist = ints && ints.length ? Math.max(0.5, ints[0].distance) : 2;
      const s = dist * 0.02; // постоянный угловой размер
      this.dot.object3D.position.set(0, 0, -dist);
      this.dot.object3D.scale.set(s, s, s);
    },
  });
}
