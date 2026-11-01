// Камеры: сглаженное следование и тряска (учитывает настройку «Тряска камеры»).
import * as THREE from 'three';
import { CFG } from '../config.js';
export function makeCamera(fov = 50, near = 1, far = 5000) {
  const cam = new THREE.PerspectiveCamera(fov, CFG.stage.w / CFG.stage.h, near, far);
  return cam;
}
export function createFollow(camera, { smooth = 0.2 } = {}) {
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  let init = false, trauma = 0, shakeT = 0;
  const f = {
    smooth, shakeEnabled: () => true,
    snap(p, l) { pos.copy(p); look.copy(l); init = true; f.apply(); },
    update(dt, desiredPos, desiredLook) {
      if (!init) { f.snap(desiredPos, desiredLook); return; }
      const k = 1 - Math.exp(-dt / Math.max(1e-3, f.smooth / 3));
      pos.lerp(desiredPos, k); look.lerp(desiredLook, k);
      trauma = Math.max(0, trauma - dt * 1.6); shakeT += dt;
      f.apply();
    },
    shake(amount) { if (f.shakeEnabled()) trauma = Math.min(1, trauma + amount); },
    apply() {
      camera.position.copy(pos);
      if (trauma > 0) {
        const s = trauma * trauma * 6;
        tmp.set(Math.sin(shakeT * 41) * s, Math.sin(shakeT * 37 + 1) * s, Math.sin(shakeT * 29 + 2) * s);
        camera.position.add(tmp);
      }
      camera.lookAt(look);
    },
    get position() { return pos; }, get target() { return look; },
  };
  return f;
}
