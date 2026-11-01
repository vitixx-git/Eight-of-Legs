// C_Wardrobe «Выглядеть человеком» (3D кат-сцена, 12 с): человек идёт к гардеробу в коридоре, заходит, дверцы
// дрожат, вылетает носок (гэг), setOutfit('work'), выходит в рубашке, брюках и белом халате. dressed = true
// (и при пропуске — флаг и одежда применяются мгновенно).
import * as THREE from 'three';
import { disposeTree } from '../three/toon.js';
import { CFG } from '../config.js';
import { makeCamera } from '../three/camera.js';
import { buildHouseEnv, UP_Y } from '../env/house.js';
import { createScientist } from '../models/scientist.js';
import { camRig, createCutscene } from './common.js';
import { actorOf } from '../cutscenes/timeline.js';
import * as HK from '../house/kit.js';
import TL, { HUMAN_START } from '../cutscenes/data/C_Wardrobe.js';

let ctx, env, camera, rig, cut, human, ended, doorsK = 0, doorsTo = 0, rattle = 0, sock = null, inner = null;
const last = new THREE.Vector3();
function setDoors(k) { env.wDoors.forEach((p, i) => { const s = i === 0 ? -1 : 1; p.rotation.y = -s * k * 1.75; }); }
function spawnSock() {
  const g = new THREE.Group(); g.name = 'FLY_SOCK';
  HK.box(g, 'Sock', [10, 3, 22], [0, 0, 0], '#d95a7a', 0.4); HK.box(g, 'SockToe', [10, 3.2, 6], [0, 0.1, 9], '#f2ece0', 0.3);
  g.position.set(-368, UP_Y + 175, 104); env.scene.add(g);
  sock = { g, v: new THREE.Vector3(125, 250, 45), spin: 9, bounced: 0 };
}
const scene = {
  id: 'C_Wardrobe', kind: 'cut', series: null, objectives: [], checkpoints: ['start'], cutTitle: 'cut.C_Wardrobe',
  async enter(c) {
    ctx = c; ctx.show3d(true); ended = false; doorsK = 0; doorsTo = 0; rattle = 0; sock = null;
    env = await buildHouseEnv(ctx, { mode: 'S08' });
    camera = makeCamera(42, 5, 6000); rig = camRig(camera);
    // тёмное нутро шкафа — видно, когда дверцы открыты
    inner = HK.box(env.wardrobe, 'WardrobeInside', [2, 196, 112], [27.5, 106, 0], '#2a1d18', 0);
    human = createScientist({ outfit: 'pajama' });
    human.group.position.set(...HUMAN_START); human.group.rotation.y = 0; env.scene.add(human.group);
    human.group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    last.copy(human.group.position);
    env.setCut(UP_Y);
    const actors = { human: actorOf(human, { play: (n) => human.animator.play(n), setOutfit: (v) => human.setOutfit(v) }) };
    cut = createCutscene(ctx, TL, {
      camera: rig, actors,
      call: {
        doors: (k) => { doorsTo = k; },
        hide: () => { human.group.visible = false; },
        show: () => { human.group.visible = true; human.group.position.set(-372, UP_Y, 108); },
        rattle: (s) => { rattle = s; },
        sock: () => spawnSock(),
      },
    }, { onEnd: () => { if (ended) return; ended = true; ctx.save.setFlag('dressed', true); ctx.scenes.complete(); } });
    rig.set(TL.events[0].p, TL.events[0].at, TL.events[0].fov);
    try { ctx.renderer.three.compile(env.scene, camera); } catch (e) { /* прогрев не обязателен */ }
  },
  update(dt) {
    cut.update(dt);
    rig.update(dt, ctx.settings.shake);
    // скорость шага из перемещения
    const sp = human.group.position.distanceTo(last) / Math.max(1e-3, dt); last.copy(human.group.position);
    human.animator.update(dt, Math.min(140, sp));
    doorsK += (doorsTo - doorsK) * (1 - Math.exp(-dt * 9));
    let k = doorsK;
    const w = env.wardrobe;
    if (rattle > 0) {
      rattle -= dt; const tm = cut.time;
      k = Math.max(k, 0.04 + 0.035 * Math.sin(tm * 37));
      w.rotation.z = Math.sin(tm * 29) * 0.012; w.position.x = -400 + Math.sin(tm * 43) * 0.7;
      if (rattle <= 0) { w.rotation.z = 0; w.position.x = -400; }
    }
    setDoors(k);
    if (sock) {
      const s = sock; s.v.y -= 620 * dt; s.g.position.addScaledVector(s.v, dt); s.g.rotation.y += s.spin * dt; s.g.rotation.x += s.spin * 0.6 * dt;
      if (s.g.position.y < UP_Y + 1.5 && s.v.y < 0) {
        s.g.position.y = UP_Y + 1.5; s.v.y *= -0.45; s.v.x *= 0.6; s.v.z *= 0.6; s.spin *= 0.5; s.bounced++;
        if (s.bounced === 1) ctx.audio.play('HOUSE_SOCK_BOING', { vol: 0.8 });
        if (s.bounced > 2) { s.v.set(0, 0, 0); s.spin = 0; s.g.rotation.x = 0; }
      }
    }
    env.update(dt, cut.time);
  },
  render() { ctx.renderer.render(env.scene, camera); },
  pause() {}, resume() {},
  debugWin() { cut?.skip(); },
  debugSeek(s) { while (cut && !cut.done && cut.time < s) scene.update(1 / 30); },
  debugInfo() { return `C_Wardrobe: ${cut ? cut.time.toFixed(1) : 0}/${TL.dur} с · одежда ${human?.group.userData.outfit}`; },
  get _dbg() { return { env, human, cut, rig }; },
  exit() {
    cut?.dispose(); cut = null;
    if (sock) { sock.g.removeFromParent(); sock.g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } }); sock = null; }
    if (human) { disposeTree(human.group); human = null; }
    env?.dispose(); env = null; inner = null;
  },
};
export default scene;
