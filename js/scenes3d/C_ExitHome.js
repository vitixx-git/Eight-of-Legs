// C_ExitHome «Выход из дома» (3D кат-сцена, 11 с): дверь открывается наружу, человек выходит на крыльцо,
// спускается по 3 ступеням, идёт по дорожке к бордюру. Камера показывает дорогу (2 + 3 полосы, островок,
// «зебра», светофор), проезжающую машину и лабораторию №3 напротив с вывеской. → S09_Road.
import * as THREE from 'three';
import { disposeTree } from '../three/toon.js';
import { makeCamera } from '../three/camera.js';
import { buildHouseEnv } from '../env/house.js';
import { buildStreet } from '../env/street.js';
import { createScientist } from '../models/scientist.js';
import { camRig, createCutscene } from './common.js';
import { actorOf } from '../cutscenes/timeline.js';
import TL, { HUMAN_START } from '../cutscenes/data/C_ExitHome.js';

let ctx, env, street, camera, rig, cut, human, ended;
const last = new THREE.Vector3();
const scene = {
  id: 'C_ExitHome', kind: 'cut', series: null, objectives: [], checkpoints: ['start'], cutTitle: 'cut.C_ExitHome',
  async enter(c) {
    ctx = c; ctx.show3d(true); ended = false;
    env = await buildHouseEnv(ctx, { mode: 'S08', street: true });
    env.showRoof(true); env.setCut(1e5);
    street = buildStreet(env.scene, { house: true });
    camera = makeCamera(40, 5, 9000); rig = camRig(camera);
    human = createScientist({ outfit: 'work', badge: true });
    human.group.position.set(...HUMAN_START); human.group.rotation.y = -Math.PI / 2; env.scene.add(human.group);
    human.group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    street.blob = null;
    last.copy(human.group.position);
    const actors = { human: actorOf(human, { play: (n) => human.animator.play(n) }) };
    cut = createCutscene(ctx, TL, {
      camera: rig, actors,
      call: {
        outside: () => ctx.audio.setReverb('street'),
        door: (k, o) => env.setFrontDoor(k, !!o?.instant),
        car: (lane, z0, z1, dur) => street.drive(lane, z0, z1, dur),
      },
    }, { onEnd: () => { if (ended) return; ended = true; ctx.scenes.complete(); } });
    rig.set(TL.events[0].p, TL.events[0].at, TL.events[0].fov);
    try { ctx.renderer.three.compile(env.scene, camera); } catch (e) { /* прогрев не обязателен */ }
  },
  update(dt) {
    cut.update(dt);
    rig.update(dt, ctx.settings.shake);
    const sp = human.group.position.distanceTo(last) / Math.max(1e-3, dt); last.copy(human.group.position);
    human.animator.update(dt, Math.min(140, sp));
    street.update(dt);
    env.update(dt, cut.time);
  },
  render() { ctx.renderer.render(env.scene, camera); },
  pause() {}, resume() {},
  debugWin() { cut?.skip(); },
  debugSeek(s) { while (cut && !cut.done && cut.time < s) scene.update(1 / 30); },
  debugInfo() { return `C_ExitHome: ${cut ? cut.time.toFixed(1) : 0}/${TL.dur} с · дверь ${env ? env.frontK.toFixed(2) : '-'}`; },
  get _dbg() { return { env, street, human, cut, rig }; },
  exit() {
    cut?.dispose(); cut = null;
    if (human) { disposeTree(human.group); human = null; }
    street?.dispose(); street = null;
    env?.dispose(); env = null;
  },
};
export default scene;
