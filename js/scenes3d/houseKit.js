// Общая обвязка сцен дома (S07, S08): окружение, камера, навигатор, контроллер человека, разрез по высоте,
// прозрачность столба лестницы, зоны реверберации (ванная), отладка коллайдеров (F3).
import * as THREE from 'three';
import { CFG } from '../config.js';
import { makeCamera } from '../three/camera.js';
import { buildHouseEnv, stairPos, CX, CZ, UP_Y } from '../env/house.js';
import { createHouseNav } from './houseNav.js';
import { createHumanCtl } from './humanCtl.js';
import { colliderDebug } from './common.js';

const HU = CFG.human, D2R = Math.PI / 180;
export async function setupHouse(ctx, { mode = 'S07', outfit = 'pajama', badge = false, start = [0, 0, 0], yaw = 0 } = {}) {
  const env = await buildHouseEnv(ctx, { mode });
  const camera = makeCamera(HU.cam.fov, HU.cam.near, HU.cam.far);
  const nav = createHouseNav(env);
  const ctl = createHumanCtl(ctx, { scene: env.scene, camera, nav, outfit, badge, pos: start, yaw });
  env.scene.traverse((o) => { if (o.isLight) o.layers.enableAll(); });
  // столб: материал отдельный — можно делать прозрачным
  env.post.material = env.post.material.clone(); env.post.material.transparent = true;
  const items = [];
  for (const f of [0, UP_Y]) for (const b of env.boxes[f]) items.push({ ...b, y: f, h: 30 });
  for (const o of Object.values(env.obstacles)) { const p = stairPos((o.th[0] + o.th[1]) / 2, (o.r[0] + o.r[1]) / 2); items.push({ x: p.x, z: p.z, r: (o.r[1] - o.r[0]) / 2, y: p.y, h: 20 }); }
  const dbg = colliderDebug(env.scene, items); dbg.visible = ctx.debugState.colliders;
  const offDbg = ctx.events.on('debug:colliders', (on) => { dbg.visible = on; });
  let reverb = '', postA = 1;
  const kit = {
    env, camera, nav, ctl, dbg,
    zone() { return nav.onStairs ? 'STAIRS' : nav.region; },
    tick(dt, time) {
      env.update(dt, time);
      env.setCut(ctl.st.y, nav.onStairs ? nav.th : null);
      // столб прозрачнеет, когда человек за ним (задняя половина колодца)
      let want = 1;
      if (nav.onStairs) { const a = nav.th * D2R; if (Math.sin(a) < -0.15 && Math.abs(Math.cos(a)) < 0.8) want = 0.22; }
      postA += (want - postA) * (1 - Math.exp(-dt * 8));
      env.post.material.opacity = postA; env.post.material.depthWrite = postA > 0.95; env.post.visible = postA > 0.03;
      const r = !nav.onStairs && nav.region === 'BATH' ? 'bath' : 'house';
      if (r !== reverb) { reverb = r; ctx.audio.setReverb(r); ctx.audio.ambience(r === 'bath' ? 'AMB_BATH' : 'AMB_HOUSE_MORNING'); }
    },
    xray: true,
    // 1-й проход — дом (слой 0), 2-й — человек и кошка (слой 1) поверх полупрозрачного разреза, с глубиной дома.
    // Пока активно зеркало (S08) — один проход: стеклу нужен человек в буфере глубины.
    render() {
      const r = ctx.renderer.three, scene = env.scene;
      if (!kit.xray) { camera.layers.enableAll(); r.render(scene, camera); return; }
      camera.layers.set(0); r.render(scene, camera);
      const bg = scene.background, ac = r.autoClear; scene.background = null; r.autoClear = false;
      camera.layers.set(1); r.render(scene, camera);
      r.autoClear = ac; scene.background = bg; camera.layers.enableAll();
    },
    prewarm() { try { ctx.renderer.three.compile(env.scene, camera); } catch (e) { console.warn('[prewarm]', e); } },
    dispose() {
      offDbg(); dbg.removeFromParent();
      dbg.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); dbg.children[0]?.material?.dispose();
      ctl.dispose(); env.post.material.dispose(); env.dispose();
    },
  };
  return kit;
}
