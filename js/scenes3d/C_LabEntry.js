// C_LabEntry «Вход в лабораторию» (3D кат-сцена, 10 с): человек подносит пропуск к считывателю, LED красный →
// зелёный, стеклянные двери разъезжаются, он входит; склейка — знакомая лаборатория (режим live, установка ещё
// работает), камера задерживается на верхе шкафа с паутинкой (откуда паук смотрел в воспоминании). → S10_Lab.
// Два мира: улица (env/street.js, без дома) и лаборатория (js/lab/furnish.js) — одна камера.
import * as THREE from 'three';
import { disposeTree } from '../three/toon.js';
import { createWorld, camRig, createCutscene } from './common.js';
import { buildStreet } from '../env/street.js';
import { furnishLab } from '../lab/furnish.js';
import { optimizeLab } from '../lab/optimize.js';
import { createScientist } from '../models/scientist.js';
import { actorOf } from '../cutscenes/timeline.js';
import TL, { HUMAN_START } from '../cutscenes/data/C_LabEntry.js';

let ctx, outW, labW, street, lab, rig, cut, human, ended, active = 'out', glint = null, glintT = -1, cardHeld = false;
const last = new THREE.Vector3();
let badgeHome = null;
function holdCard(on) {
  const badge = human.joints.badge, hand = human.joints['hand.R'];
  if (!badge || !hand) return;
  if (on && !cardHeld) {
    badgeHome = { parent: badge.parent, pos: badge.position.clone(), rot: badge.rotation.clone() };
    hand.add(badge); badge.position.set(-2, -3, 6); badge.rotation.set(0, Math.PI / 2, 0); cardHeld = true;
  } else if (!on && cardHeld) {
    badgeHome.parent.add(badge); badge.position.copy(badgeHome.pos); badge.rotation.copy(badgeHome.rot); cardHeld = false;
  }
}
function goInside() {
  if (active === 'in') return;
  active = 'in';
  holdCard(false);
  labW.scene.add(human.group);
  human.group.position.set(292, 0, 102); human.group.rotation.y = -Math.PI / 2; last.copy(human.group.position);
  rig.set(TL.events.find((e) => e.type === 'shot' && e.t >= 4.4).p, [-70, 95, -30], 50);
  const cam = rig.camera; cam.near = 2; cam.far = 3000; cam.updateProjectionMatrix();
  ctx.audio.setReverb('lab');
}
const scene = {
  id: 'C_LabEntry', kind: 'cut', series: null, objectives: [], checkpoints: ['start'], cutTitle: 'cut.C_LabEntry',
  async enter(c) {
    ctx = c; ctx.show3d(true); ended = false; active = 'out'; glintT = -1; cardHeld = false;
    outW = createWorld(ctx, { palette: 'street', fov: 38, near: 5, far: 9000, lights: { dirPos: [-700, 1300, 1100], target: [-2000, 0, -110], shadows: false } });
    street = buildStreet(outW.scene, { house: false, light: false });
    labW = createWorld(ctx, { palette: 'lab', fov: 50, near: 2, far: 3000, lights: false });
    lab = await furnishLab(labW.scene, 'live', { includeScientist: false, scene: 'S10' });
    lab.markers.visible = false;
    optimizeLab(lab, { keep: ['FrontWall'] });
    const front = labW.scene.getObjectByName('FrontWall'); if (front) front.visible = false;
    // блик на паутинке — чтобы взгляд нашёл её на верхе шкафа
    glint = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, toneMapped: false }));
    glint.position.set(-226, 203, 188); glint.name = 'WEB_GLINT'; labW.scene.add(glint);
    human = createScientist({ outfit: 'work', badge: true });
    human.group.position.set(...HUMAN_START); human.group.rotation.y = -Math.PI / 2; outW.scene.add(human.group);
    last.copy(human.group.position);
    rig = camRig(outW.camera); rig.camera = outW.camera;
    const actors = { human: actorOf(human, { play: (n) => human.animator.play(n) }) };
    cut = createCutscene(ctx, TL, {
      camera: rig, actors,
      call: {
        reverb: (n) => ctx.audio.setReverb(n),
        card: (on) => holdCard(on),
        led: (on) => street.setLed(on),
        door: (k) => street.setDoor(k),
        inside: () => goInside(),
        frontWall: (on) => { const f = labW.scene.getObjectByName('FrontWall'); if (f) f.visible = on; },
        glint: () => { glintT = 0; },
      },
    }, { onEnd: () => { if (ended) return; ended = true; ctx.scenes.complete(); } });
    rig.set(TL.events[0].p, TL.events[0].at, TL.events[0].fov);
    outW.prewarm(); labW.prewarm(outW.camera);
  },
  update(dt) {
    cut.update(dt);
    rig.update(dt, ctx.settings.shake);
    const sp = human.group.position.distanceTo(last) / Math.max(1e-3, dt); last.copy(human.group.position);
    human.animator.update(dt, Math.min(140, sp));
    if (active === 'out') street.update(dt);
    else lab.update(dt);
    if (glintT >= 0) { glintT += dt; const k = Math.max(0, Math.sin(Math.min(1, glintT / 1.6) * Math.PI)); glint.material.opacity = 0.9 * k; glint.scale.setScalar(1 + 1.5 * k); }
  },
  render() { if (active === 'out') outW.render(); else labW.render(outW.camera); },
  pause() {}, resume() {},
  debugWin() { cut?.skip(); },
  debugSeek(s) { while (cut && !cut.done && cut.time < s) scene.update(1 / 30); },
  debugInfo() { return `C_LabEntry: ${cut ? cut.time.toFixed(1) : 0}/${TL.dur} с · ${active} · двери ${street ? street.doorK.toFixed(2) : '-'}`; },
  get _dbg() { return { outW, labW, street, lab, human, cut, rig }; },
  exit() {
    cut?.dispose(); cut = null;
    if (human) { holdCard(false); disposeTree(human.group); human = null; }
    if (glint) { glint.geometry.dispose(); glint.material.dispose(); glint = null; }
    street?.dispose(); street = null;
    lab?.dispose(); lab = null;
    labW?.dispose(); labW = null; outW?.dispose(); outW = null;
  },
};
export default scene;
