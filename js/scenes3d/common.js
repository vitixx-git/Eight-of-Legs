// Общие помощники 3D-сцен: мир (сцена + камера + свет + туман), рендер с прогревом шейдеров, освобождение ресурсов,
// кат-сцены (леттербокс + пропуск удержанием Пробела + таймлайн), риг камеры для таймлайна.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { makeCamera } from '../three/camera.js';
import { makeLights } from '../three/lights.js';
import { disposeTree } from '../three/toon.js';
import { createTimeline } from '../cutscenes/timeline.js';
import { createHoldSkip } from '../ui/holdskip.js';
import { el } from '../ui/dom.js';

export function createWorld(ctx, { palette = 'house', fov = 50, near = 1, far = 5000, fog = null, lights = {} } = {}) {
  const scene = new THREE.Scene();
  const camera = makeCamera(fov, near, far);
  const p = CFG.palette[palette] || CFG.palette.house;
  const L = lights === false ? null : makeLights(scene, palette, ctx.renderer, lights);
  if (!scene.background && p.bg) scene.background = new THREE.Color(p.bg);
  if (fog) scene.fog = new THREE.Fog(p.fog || p.bg, fog[0], fog[1]);
  const w = {
    scene, camera, lights: L, palette: p,
    render(cam = camera) { ctx.renderer.render(scene, cam); },
    // компиляция программ заранее, чтобы первый кадр после затемнения не «дёргался»
    prewarm(cam = camera) { try { ctx.renderer.three.compile(scene, cam); } catch (e) { console.warn('[prewarm]', e); } },
    dispose() { L?.dispose(); disposeTree(scene); scene.clear(); },
  };
  return w;
}

// Риг камеры для таймлайна: set(p, at, fov) / get() → {p, at, fov}
export function camRig(camera) {
  const at = new THREE.Vector3();
  let shakeAmp = 0, shakeT = 0;
  const rig = {
    set(p, a, fov) {
      camera.position.set(p[0], p[1], p[2]); at.set(a[0], a[1], a[2]);
      if (fov != null && Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.lookAt(at);
    },
    get() { return { p: camera.position.toArray(), at: at.toArray(), fov: camera.fov }; },
    get target() { return at; },
    shake(a) { shakeAmp = Math.max(shakeAmp, a); },
    update(dt, allow = true) {
      if (shakeAmp <= 0) return;
      shakeT += dt; shakeAmp = Math.max(0, shakeAmp - dt * 2.5);
      if (!allow) return;
      camera.position.x += Math.sin(shakeT * 47) * shakeAmp; camera.position.y += Math.sin(shakeT * 39 + 1) * shakeAmp;
    },
  };
  return rig;
}

// Леттербокс кат-сцен (чёрные полосы сверху и снизу)
export function letterbox(ctx, on) {
  let lb = ctx.hudRoot.querySelector('.letterbox');
  if (on && !lb) {
    lb = el('div', 'letterbox'); lb.append(el('div', 'lb-top'), el('div', 'lb-bot'));
    ctx.hudRoot.prepend(lb); requestAnimationFrame(() => lb.classList.add('on'));
  } else if (!on && lb) lb.remove();
}

// Кат-сцена: таймлайн + пропуск удержанием + дакинг музыки. onEnd вызывается ровно один раз.
export function createCutscene(ctx, def, env, { onEnd, bars = true, skippable = true } = {}) {
  let ended = false;
  const finish = () => { if (ended) return; ended = true; onEnd?.(); };
  const tl = createTimeline(ctx, def, { ...env, onEnd: finish });
  const hold = skippable ? createHoldSkip(ctx, () => tl.skip()) : null;
  if (bars) letterbox(ctx, true);
  ctx.audio.cutsceneDuck(true);
  return {
    timeline: tl,
    get time() { return tl.time; }, get done() { return tl.done; }, get skipped() { return tl.skipped; },
    update(dt) { if (!tl.done) { hold?.update(dt); tl.update(dt); } },
    skip() { tl.skip(); },
    dispose() { hold?.dispose(); letterbox(ctx, false); ctx.audio.cutsceneDuck(false); },
  };
}

// Простой «сглаживатель» значений
export const approach = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const D2R = Math.PI / 180;

// Подсветка коллайдеров (F3): каркасные боксы/цилиндры поверх сцены
export function colliderDebug(scene, items) {
  const g = new THREE.Group(); g.name = 'DEBUG_COLLIDERS'; g.visible = false;
  const m = new THREE.MeshBasicMaterial({ color: '#7fd18b', wireframe: true, depthTest: false, transparent: true, opacity: 0.7 });
  for (const it of items) {
    let mesh;
    if (it.r) { mesh = new THREE.Mesh(new THREE.CylinderGeometry(it.r, it.r, it.h || 20, 16, 1, true), m); mesh.position.set(it.x, (it.y || 0) + (it.h || 20) / 2, it.z); }
    else { mesh = new THREE.Mesh(new THREE.BoxGeometry(it.x1 - it.x0, it.h || 20, it.z1 - it.z0), m); mesh.position.set((it.x0 + it.x1) / 2, (it.y || 0) + (it.h || 20) / 2, (it.z0 + it.z1) / 2); }
    mesh.renderOrder = 999; g.add(mesh);
  }
  scene.add(g);
  return g;
}
