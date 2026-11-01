// S10 «Уничтожение яда» (3D, человек, ~1,5 мин). Знакомая лаборатория (режим live, установка ещё работает).
// Автомат: idle → (E у пульта) stopped → (E у стола) carrying → (E у люка) inserted → (удержание E 2,0 с) destroyed.
// 1) «Останови установку»: E у пульта — рычаг вниз, установка глохнет (бак зелёный → серый, пламя гаснет, гул машины
//    стихает). ✓, контрольная точка stopped.
// 2) «Помести контейнер в утилизатор»: E у стола — берёт двумя руками. С контейнером скорость ×0,8, приросты L ×1,4
//    (CFG.bal.carryMul), «Кабина» careful при Shift. Падение: контейнер герметичен — «Уронил контейнер!», возврат на
//    stopped, контейнер снова на столе. В r 120 от утилизатора люк открывается сам; E — вставить. ✓, точка inserted.
// 3) «Запусти уничтожение»: удержание E 2,0 с (кольцо над люком, гул LAB_DISPOSE_CHARGE растёт с прогрессом);
//    отпустил — прогресс падает на 50 %/с. Финал: белая вспышка 0,35 с (при «Меньше эффектов» — без неё), лампа
//    утилизатора красная → зелёная, «АРАХНОЦИД УНИЧТОЖЕН» 2,5 с, UI_BIG_SUCCESS, poisonDestroyed = true.
// Финальный штрих (3 с): «Кабина» растёт до 320×200, паук отпускает рычаги и откидывается (поза rest), SPD_SIGH.
// → RESULTS (или C_User, если пользовательская кат-сцена стоит «после S10»).
// Коллайдеры — боксы мебели (считаются ДО слияния статики), навигатор createBoxNav; F3 — подсветка коллайдеров.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { createWorld, colliderDebug, approach } from './common.js';
import { furnishLab } from '../lab/furnish.js';
import { optimizeLab } from '../lab/optimize.js';
import * as kit from '../lab/kit.js';
import { createHumanCtl, createBoxNav } from './humanCtl.js';

const LB = CFG.lab, HU = CFG.human;
// точки взаимодействия (мир, см): пульт установки, контейнер на столе, люк утилизатора
const PT = {
  console: { x: -232, y: 66, z: 90 },
  container: { x: -36, y: 90, z: -40 },
  hatch: { x: 231, y: 72, z: -20 },
};
const SPAWN = { start: [200, 80, -Math.PI / 2], stopped: [-36, 78, Math.PI], inserted: [168, -20, Math.PI / 2] };
const STATE_OF = { start: 'idle', stopped: 'stopped', inserted: 'inserted' };
const COLLIDE = ['LAB_CABINET', 'LAB_TABLE', 'WRITING_DESK', 'POISON_UNIT', 'DISPOSER', 'FLASK_SET', 'LAB_CHAIR_0', 'LAB_CHAIR_1'];
const CAM = { off: [0, 360, 440], look: [0, 90, 0], endOff: [-150, 175, 255], endLook: [0, 135, 0] };
const LEVER_UP = -0.35, LEVER_DOWN = -2.35, FLAP_OPEN = -1.66;
const RED = new THREE.Color('#e0473f'), GREEN = new THREE.Color('#7fd18b');

let ctx, W, lab, nav, ctl, dbg, offDbg, P, st;
const V = new THREE.Vector3(), V2 = new THREE.Vector3();

// ---------- реквизит: рычаг на пульте, створка люка, лампа, маркер цели ----------
function buildProps() {
  const unit = lab.objects.POISON_UNIT, disp = lab.objects.DISPOSER, cont = lab.objects.POISON_CONTAINER;
  // рычаг на лицевой стороне пульта (пульт смотрит в +x)
  const lv = new THREE.Group(); lv.name = 'LEVER'; lv.position.set(37, 62, -21); unit.add(lv);
  kit.box(lv, 'LeverBase', [3, 12, 9], [0, 0, 0], '#6f7884', 0.6);
  const lever = new THREE.Group(); lever.position.set(1.6, 0, 0); lv.add(lever);
  kit.mesh(lever, 'LeverRod', new THREE.CylinderGeometry(0.9, 0.9, 16, 8), '#cfd8d4', [0, 8, 0]);
  kit.mesh(lever, 'LeverKnob', new THREE.SphereGeometry(3, 12, 8), '#e0473f', [0, 16.5, 0], { emissive: '#e0473f', emissiveIntensity: 0.25 });
  // створка люка: петля по краю z −20 (локально), открывается наружу, к −z (не загораживает человека от камеры)
  const flap = new THREE.Group(); flap.name = 'HATCH_FLAP'; flap.position.set(-33.2, 72, -20); disp.add(flap);
  kit.box(flap, 'Flap', [2, 37, 40], [0, 0, 20], '#8a9a94', 0.6);
  kit.box(flap, 'FlapHandle', [2.4, 10, 3], [-1.6, 0, 34], '#cfd8d4', 0);
  // внутренность люка — тёмная «шахта» глубже лицевой панели
  kit.mesh(disp, 'HatchInside', new THREE.BoxGeometry(24, 34, 36), '#140f12', [-17, 72, 0]);
  // лампа утилизатора: красная до уничтожения, зелёная после
  const lamp = disp.getObjectByName('Lamp');
  if (lamp) { lamp.material = lamp.material.clone(); lamp.scale.set(1.3, 1.3, 1.3); }
  // маркер текущей цели
  const mark = new THREE.Mesh(new THREE.OctahedronGeometry(8, 0), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.85, depthWrite: false }));
  mark.name = 'TARGET_MARK'; mark.renderOrder = 6; W.scene.add(mark);
  const home = { p: cont.position.clone(), r: cont.rotation.clone(), s: cont.scale.clone() };
  return { unit, disp, cont, lever, flap, lamp, mark, home };
}
function setLamp(green) {
  const m = P.lamp?.material; if (!m) return;
  const c = green ? GREEN : RED;
  m.color.copy(c); if (m.emissive) { m.emissive.copy(c); m.emissiveIntensity = green ? 1.0 : 0.7; }
}
function containerHome() {
  const c = P.cont, h = P.home;
  c.visible = true; c.position.copy(h.p); c.rotation.copy(h.r); c.scale.copy(h.s);
}

// ---------- «кукольный домик»: шкаф и цветок между камерой и человеком становятся полупрозрачными ----------
const ray = new THREE.Ray(), HIT = new THREE.Vector3();
function makeFader(box, mats) { return { box, mats, a: 1 }; }
function updateFaders(dt) {
  const cam = W.camera.position, p = ctl.st.pos;
  for (const f of faders) {
    let hit = false;
    for (const h of [15, 95, 170]) {
      V.set(p.x, h, p.z).sub(cam); const len = V.length(); V.divideScalar(len);
      ray.set(cam, V);
      if (ray.intersectBox(f.box, HIT) && HIT.distanceTo(cam) < len - 10) { hit = true; break; }
    }
    const a = approach(f.a, hit ? 0.25 : 1, 9, dt);
    if (Math.abs(a - f.a) < 1e-4 && (a === 1 || a === 0.25)) continue;
    f.a = Math.abs(a - 1) < 0.004 ? 1 : a;
    for (const m of f.mats) { const tr = f.a < 1; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = f.a; m.depthWrite = !tr; }
  }
}
let faders = [];

// ---------- состояние ----------
const later = (sec, fn) => st.timers.push({ t: sec, fn });
function resetAt(chk) {
  const prevFails = st?.fails || 0;
  st = { chk, state: STATE_OF[chk] || 'idle', time: 0, prog: 0, holding: false, hatchK: 0, hatchOpen: false, insertT: -1, insertFrom: new THREE.Vector3(),
    leverK: chk === 'start' ? 0 : 1, leverT: -1, drop: null, destroyedT: -1, finalT: -1, finished: false, timers: [], fails: prevFails, charge: null, flashEl: null, flashT: 0 };
  // лаборатория
  lab.setState(st.state === 'idle' ? 'idle' : st.state);
  if (st.state !== 'idle') for (let i = 0; i < 25; i++) lab.update(0.1); // установка уже заглохла
  P.lever.rotation.z = st.leverK ? LEVER_DOWN : LEVER_UP;
  P.flap.rotation.y = 0;
  setLamp(false);
  if (st.state === 'inserted') P.cont.visible = false; else containerHome();
  // флаги сохранения
  const save = ctx.save;
  save.setFlag('s10_stopped', st.state !== 'idle');
  save.setFlag('s10_inserted', st.state === 'inserted');
  save.setFlag('poisonDestroyed', false);
  // человек
  const s = SPAWN[chk] || SPAWN.start;
  Object.assign(ctl.st, { carry: false, speedMul: 1, inputOn: true, animOverride: null, extra: 0, panic: false });
  ctl.poseOn = true; ctl.meterOn = true;
  ctl.camOffset.set(...CAM.off); ctl.lookOffset.set(...CAM.look); ctl.follow.smooth = HU.cam.smooth;
  ctl.teleport(s[0], 0, s[1], s[2]);
  // звук
  ctx.audio.ambienceLayer('AMB_LAB_MACHINE', st.state === 'idle');
  ctx.audio.musicLayer('stopped', st.state !== 'idle');
  ctx.audio.musicLayer('resolve', false);
  ctx.hud.prompt(null); ctx.hud.ring(null);
  ctx.cockpit.grow(false);
}
function setChk(chk) { st.chk = chk; ctx.scenes.setCheckpoint(chk); ctx.hud.toast(t('toast.checkpoint')); }
const distTo = (pt) => Math.hypot(ctl.st.pos.x - pt.x, ctl.st.pos.z - pt.z) - HU.radius;
const near = (pt, r = LB.useR) => distTo(pt) <= r;
const canAct = () => !ctl.locked && ctl.st.mode === 'walk' && ctl.st.inputOn;

// 1) пульт
function stopMachine() {
  ctl.act('useConsole', { dur: 0.9, pose: 'use', face: [PT.console.x, PT.console.z], onDone: () => {
    st.state = 'stopped';
    ctx.objectives.done(0);
    ctx.hud.toast(t('lab.stopped'));
    ctx.save.setFlag('s10_stopped', true);
    setChk('stopped');
  } });
  later(0.25, () => { st.leverT = 0; ctx.audio.play('LAB_CONSOLE_LEVER', { vol: 0.9 }); });
  later(0.5, () => {
    ctx.audio.play('LAB_MACHINE_STOP', { vol: 0.9 });
    lab.setState('stopped');
    ctx.audio.ambienceLayer('AMB_LAB_MACHINE', false);
    ctx.audio.musicLayer('stopped', true);
  });
}
// 2) контейнер
function pickContainer() {
  ctl.act('useConsole', { dur: 0.55, pose: 'use', face: [PT.container.x, PT.container.z], onDone: () => {
    st.state = 'carrying';
    ctl.st.carry = true; ctl.st.speedMul = LB.carrySpeed;
    ctx.audio.play('LAB_PICKUP_CONTAINER', { vol: 0.9 });
    ctx.hud.toast(t('lab.carry'));
    lab.setState('carrying');
  } });
}
function handsMid(out) {
  const j = ctl.model.joints, a = j['hand.L'], b = j['hand.R'];
  if (!a || !b) { out.set(0, 96, 32).applyMatrix4(ctl.model.group.matrixWorld); return out; }
  a.getWorldPosition(out); b.getWorldPosition(V2); out.add(V2).multiplyScalar(0.5);
  return out;
}
function carryUpdate() {
  ctl.model.group.updateMatrixWorld(true);
  handsMid(V);
  const c = P.cont; c.visible = true;
  c.position.set(V.x, V.y - 17, V.z);
  c.rotation.set(0, ctl.st.yaw, ctl.st.rollS ? ctl.st.rollS * Math.PI / 180 : 0);
}
function startDrop() {
  const c = P.cont, yaw = ctl.st.yaw;
  st.drop = { t: 0, vx: Math.sin(yaw) * 45, vz: Math.cos(yaw) * 45, vy: 40, bounced: false };
  ctl.st.carry = false; ctl.st.speedMul = 1;
  c.rotation.set(0, yaw, 0);
}
function dropUpdate(dt) {
  const d = st.drop, c = P.cont; if (!d) return;
  d.t += dt;
  d.vy -= 980 * dt;
  c.position.x = Math.max(-285, Math.min(285, c.position.x + d.vx * dt));
  c.position.z = Math.max(-215, Math.min(215, c.position.z + d.vz * dt));
  c.position.y += d.vy * dt;
  // опрокидывается на бок; лёжа ось контейнера горизонтальна — начало координат (дно) на высоте радиуса
  const lying = Math.min(1, d.t / 0.45);
  c.rotation.x = lying * Math.PI / 2;
  const restY = 10 * lying;
  if (c.position.y <= restY) {
    c.position.y = restY;
    if (!d.bounced && d.vy < -150) { d.bounced = true; d.vy = -d.vy * 0.25; ctx.audio.play('LAB_INSERT', { vol: 0.35, rate: 1.6 }); }
    else d.vy = 0;
    const f = Math.exp(-5 * dt); d.vx *= f; d.vz *= f;
  }
}
function openHatch() {
  st.hatchOpen = true;
  ctx.audio.play('LAB_HATCH_OPEN', { vol: 0.9 });
  ctx.hud.toast(t('lab.hatch'));
}
function insertContainer() {
  ctl.act('useConsole', { dur: 0.8, pose: 'use', face: [PT.hatch.x, PT.hatch.z], onDone: () => {
    st.state = 'inserted';
    lab.setState('inserted');
    ctx.objectives.done(1);
    ctx.save.setFlag('s10_inserted', true);
    setChk('inserted');
    ctx.hud.toast(t('lab.inserted'));
  } });
  st.state = 'inserting';
  ctl.st.carry = false; ctl.st.speedMul = 1;
  st.insertT = 0; st.insertFrom.copy(P.cont.position);
  ctx.audio.play('LAB_INSERT', { vol: 0.9 });
}
function insertUpdate(dt) {
  if (st.insertT < 0) return;
  st.insertT += dt;
  const k = Math.min(1, st.insertT / 0.6), e = k * k * (3 - 2 * k), c = P.cont;
  // к люку, затем внутрь машины
  const tx = PT.hatch.x + 14 * e, ty = PT.hatch.y - 15, tz = PT.hatch.z;
  c.position.set(st.insertFrom.x + (tx - st.insertFrom.x) * e, st.insertFrom.y + (ty - st.insertFrom.y) * e, st.insertFrom.z + (tz - st.insertFrom.z) * e);
  c.rotation.set(0, c.rotation.y, 0);
  if (k >= 1) {
    c.visible = false; st.insertT = -1;
    later(0.15, () => { st.hatchOpen = false; ctx.audio.play('LAB_HATCH_OPEN', { vol: 0.6, rate: 1.25 }); });
  }
}
// 3) уничтожение
function screenOfHatch() {
  V.set(PT.hatch.x - 6, PT.hatch.y + 55, PT.hatch.z).project(W.camera);
  return [Math.max(40, Math.min(920, (V.x + 1) / 2 * 960)), Math.max(40, Math.min(500, (1 - V.y) / 2 * 540))];
}
function chargeUpdate(dt) {
  const inp = ctx.input;
  const hold = st.state === 'inserted' && inp.down('use') && near(PT.hatch) && ctl.st.mode === 'walk' && !ctl.locked && st.insertT < 0;
  if (hold && !st.holding) { ctl.faceTo(PT.hatch.x, PT.hatch.z); }
  st.holding = hold;
  ctl.st.inputOn = !hold;
  ctl.st.animOverride = hold ? 'holdButton' : null;
  st.prog = hold ? Math.min(1, st.prog + dt / LB.holdE) : Math.max(0, st.prog - LB.decay * dt);
  if (st.prog > 0 || hold) {
    if (!st.charge) st.charge = ctx.audio.loop('LAB_DISPOSE_CHARGE', { vol: 0.9 });
    st.charge.setParam('p', st.prog);
    const [x, y] = screenOfHatch(); ctx.hud.ring(st.prog, x, y, 'E');
  } else {
    if (st.charge) { st.charge.stop(0.25); st.charge = null; }
    ctx.hud.ring(null);
  }
  if (st.prog >= 1) destroy();
}
function whiteFlash() {
  if (ctx.settings.lessFx) return;
  const f = document.createElement('div');
  f.className = 'white-flash';
  f.style.cssText = 'position:absolute;inset:0;background:#fff;pointer-events:none;opacity:1;z-index:50';
  ctx.hudRoot.append(f); st.flashEl = f; st.flashT = 0;
}
function destroy() {
  if (st.state === 'destroyed') return;
  st.state = 'destroyed'; st.destroyedT = 0; st.holding = false; st.prog = 1;
  if (st.charge) { st.charge.stop(0.1); st.charge = null; }
  ctx.hud.ring(null); ctx.hud.prompt(null);
  whiteFlash();
  ctx.audio.play('LAB_DISPOSE_BOOM', { vol: 1 });
  ctl.follow.shake(0.5);
  setLamp(true);
  later(0.3, () => ctx.audio.play('LAB_LAMP_GREEN', { vol: 0.9 }));
  ctx.hud.banner(t('lab.done'), 'good', LB.banner);
  ctx.audio.play('UI_BIG_SUCCESS', { vol: 0.9 });
  ctx.save.setFlag('poisonDestroyed', true);
  ctx.objectives.done(2);
  lab.setState('destroyed');
  ctx.audio.musicLayer('resolve', true);
  ctx.cockpit.flash('cheer', CFG.ui.cockpit.cheerDur);
  ctl.st.inputOn = false; ctl.st.animOverride = null;
  later(LB.banner, startFinal);
}
function startFinal() {
  st.finalT = 0;
  ctl.poseOn = false; ctl.meterOn = false; ctx.hud.removeMeter('bal');
  ctx.cockpit.show(true); ctx.cockpit.grow(true); ctx.cockpit.setPose('rest');
  ctx.audio.play('SPD_SIGH', { vol: 0.9 });
  ctx.hud.subtitle(t('sub.final'), LB.finalDur - 0.2, t('name.spider'));
  const p = ctl.st.pos; ctl.faceTo(p.x + CAM.endOff[0], p.z + CAM.endOff[2]);
  ctl.act('adjustGlasses', { dur: 1.0, pose: 'rest' });
  ctl.follow.smooth = 0.6;
}

// ---------- кадр ----------
function updateProps(dt) {
  // рычаг
  if (st.leverT >= 0) { st.leverT += dt; st.leverK = Math.min(1, st.leverT / 0.3); if (st.leverK >= 1) st.leverT = -1; }
  const lk = st.leverK * st.leverK * (3 - 2 * st.leverK);
  P.lever.rotation.z = LEVER_UP + (LEVER_DOWN - LEVER_UP) * lk;
  // люк
  st.hatchK = approach(st.hatchK, st.hatchOpen ? 1 : 0, 7, dt);
  P.flap.rotation.y = FLAP_OPEN * st.hatchK;
  // маркер цели
  const m = P.mark;
  const target = st.state === 'idle' ? PT.console : st.state === 'stopped' ? PT.container : (st.state === 'carrying' || st.state === 'inserted') && !st.holding ? PT.hatch : null;
  m.visible = !!target && st.finalT < 0 && !st.drop;
  if (target) {
    const h = target === PT.container ? 62 : target === PT.console ? 62 : 70;
    m.position.set(target.x, target.y + h + Math.sin(st.time * 3) * 4, target.z);
    m.rotation.y = st.time * 2; m.material.opacity = 0.6 + 0.3 * Math.sin(st.time * 5);
  }
  // вспышка
  if (st.flashEl) { st.flashT += dt; const k = st.flashT / LB.flash; st.flashEl.style.opacity = String(Math.max(0, 1 - k)); if (k >= 1) { st.flashEl.remove(); st.flashEl = null; } }
}
function interact() {
  if (!canAct()) { ctx.hud.prompt(null); return; }
  let prompt = null;
  const use = ctx.input.pressed('use');
  if (st.state === 'idle') {
    if (near(PT.console)) { prompt = t('prompt.console'); if (use) stopMachine(); }
    else if (near(PT.container)) {
      prompt = t('lab.locked');
      if (use) { ctx.audio.play('UI_DENY', { vol: 0.6 }); ctx.hud.toast(t('lab.locked')); }
    }
  } else if (st.state === 'stopped') {
    if (near(PT.container)) { prompt = t('prompt.container'); if (use) pickContainer(); }
  } else if (st.state === 'carrying') {
    if (near(PT.hatch)) { prompt = t('prompt.insert'); if (use && st.hatchK > 0.5) insertContainer(); }
  } else if (st.state === 'inserted') {
    if (near(PT.hatch)) prompt = t('prompt.dispose');
  }
  ctx.hud.prompt(prompt);
}

const scene = {
  id: 'S10_Lab', kind: '3d', series: 10, cockpit: true,
  checkpoints: ['start', 'stopped', 'inserted'],
  objectives: ['obj.s10.stop', 'obj.s10.insert', 'obj.s10.destroy'],
  hints: [['W A S D', 'hint.move'], ['Shift', 'hint.careful'], ['E', 'hint.use']],
  async enter(c, params) {
    ctx = c; ctx.show3d(true); st = null;
    W = createWorld(ctx, { palette: 'lab', fov: HU.cam.fov, near: 5, far: 6000, lights: false });
    W.camera.layers.enableAll();
    lab = await furnishLab(W.scene, 'live', { includeScientist: false, scene: 'S10', duration: 90 });
    lab.markers.visible = false;
    const front = W.scene.getObjectByName('FrontWall'); if (front) front.visible = false;
    // коллайдеры — до слияния статики (после него исходных объектов уже нет)
    const boxes = [], B3 = new THREE.Box3();
    W.scene.updateMatrixWorld(true);
    for (const n of COLLIDE) {
      const o = lab.objects[n] || W.scene.getObjectByName(n); if (!o) continue;
      B3.setFromObject(o);
      boxes.push({ name: n, x0: B3.min.x, x1: B3.max.x, z0: B3.min.z, z1: B3.max.z, h: Math.min(120, B3.max.y) });
    }
    for (const cdef of lab.colliders) { const b = cdef.box; boxes.push({ name: cdef.id, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, h: Math.min(120, b.max.y) }); }
    P = buildProps();
    // шкаф сливается отдельной полосой (свои материалы — можно делать прозрачным), цветок и так отдельный
    const cab = lab.objects.LAB_CABINET, inCab = (o) => { for (let q = o; q; q = q.parent) if (q === cab) return true; return false; };
    const cabBox = new THREE.Box3().setFromObject(cab).expandByScalar(4);
    const merged = optimizeLab(lab, { keep: ['FrontWall'], band: (y, o) => (inCab(o) ? 1 : 0) });
    const cabMats = [];
    for (const m of merged.meshes) if (m.userData.band === 1) { m.material = m.material.clone(); m.userData.ownMat = true; cabMats.push(m.material); }
    faders = [makeFader(cabBox, cabMats)];
    const plant = lab.decor.getObjectByName('houseplant');
    if (plant) { const pm = []; plant.traverse((o) => { if (o.isMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) pm.push(m); }); faders.push(makeFader(new THREE.Box3().setFromObject(plant).expandByScalar(4), pm)); }
    nav = createBoxNav({ bounds: { x0: -298, x1: 298, z0: -223, z1: 223 }, boxes });
    ctl = createHumanCtl(ctx, { scene: W.scene, camera: W.camera, nav, outfit: 'work', badge: true, pos: [SPAWN.start[0], 0, SPAWN.start[1]], yaw: SPAWN.start[2] });
    ctl.onFall = () => {
      const dropped = !!st.drop;
      const r = ctx.scenes.fail(dropped ? 'fail.drop' : 'fail.fall', { tip: dropped ? 'tip.s10drop' : 'tip.s10' });
      if (r === false && dropped) { st.drop = null; ctl.st.carry = true; ctl.st.speedMul = LB.carrySpeed; } // бессмертие (F2): снова в руках
      return r;
    };
    dbg = colliderDebug(W.scene, boxes.map((b) => ({ ...b, h: b.h || 30 })));
    dbg.visible = ctx.debugState.colliders;
    offDbg = ctx.events.on('debug:colliders', (on) => { dbg.visible = on; });
    resetAt(params.checkpoint || 'start');
    ctx.audio.music('M_LAB'); ctx.audio.setReverb('lab'); ctx.audio.ambience('AMB_LAB');
    ctx.audio.ambienceLayer('AMB_LAB_MACHINE', st.state === 'idle');
    W.prewarm();
  },
  onStart() { scene.applyDone(); ctx.audio.ambienceLayer('AMB_LAB_MACHINE', st.state === 'idle'); ctx.audio.musicLayer('stopped', st.state !== 'idle'); },
  applyDone() {
    if (st.state !== 'idle') ctx.objectives.done(0, true);
    if (st.state === 'inserted' || st.state === 'destroyed') ctx.objectives.done(1, true);
  },
  update(dt) {
    st.time += dt;
    for (let i = st.timers.length - 1; i >= 0; i--) { const tm = st.timers[i]; tm.t -= dt; if (tm.t <= 0) { st.timers.splice(i, 1); tm.fn(); } }
    if (st.state === 'inserted') chargeUpdate(dt);
    ctl.update(dt);
    // падение с контейнером — он выскальзывает из рук
    if (st.state === 'carrying' && ctl.st.mode === 'fall' && !st.drop) startDrop();
    if (st.drop) dropUpdate(dt);
    else if (st.state === 'carrying' && st.insertT < 0) carryUpdate();
    insertUpdate(dt);
    // люк открывается сам, когда человек с контейнером подходит к утилизатору
    if (st.state === 'carrying' && !st.drop && !st.hatchOpen && distTo(PT.hatch) <= LB.hatchR) openHatch();
    if (st.state !== 'destroyed') interact();
    if (st.finalT >= 0) {
      st.finalT += dt;
      const k = Math.min(1, st.finalT / 1.6), e = k * k * (3 - 2 * k);
      ctl.camOffset.set(CAM.off[0] + (CAM.endOff[0] - CAM.off[0]) * e, CAM.off[1] + (CAM.endOff[1] - CAM.off[1]) * e, CAM.off[2] + (CAM.endOff[2] - CAM.off[2]) * e);
      ctl.lookOffset.set(0, CAM.look[1] + (CAM.endLook[1] - CAM.look[1]) * e, 0);
      ctx.cockpit.setPose('rest');
      if (st.finalT >= LB.finalDur && !st.finished) { st.finished = true; ctx.scenes.complete(); }
    }
    updateProps(dt);
    updateFaders(dt);
    lab.update(dt);
  },
  updateIdle(dt) { if (!ctl) return; ctl.update(dt); if (st?.drop) dropUpdate(dt); updateProps(dt); lab.update(dt); },
  render() { W.render(W.camera); },
  respawn(chk) {
    const fails = st.fails + 1;
    if (st.charge) st.charge.stop(0.1);
    st.flashEl?.remove();
    resetAt(chk); st.fails = fails;
    ctx.objectives.set(scene.objectives, false);
    scene.applyDone();
  },
  pause() { if (st?.charge) st.charge.setVol(0); }, resume() { if (st?.charge) st.charge.setVol(0.9); },
  debugWin() {
    if (st.state === 'destroyed') { st.timers.length = 0; startFinal(); st.finalT = LB.finalDur; return; }
    resetAt('inserted'); scene.applyDone();
    destroy();
  },
  debugInfo() {
    const c = ctl.st;
    return `S10: ${st.state} · (${c.pos.x.toFixed(0)}, ${c.pos.z.toFixed(0)}) · L ${ctl.bal.L.toFixed(0)} ${ctl.bal.stateName} · люк ${st.hatchK.toFixed(2)} · прогресс ${(st.prog * 100).toFixed(0)}%${st.drop ? ' · уронил' : ''}${st.finalT >= 0 ? ' · финал ' + st.finalT.toFixed(1) : ''}`;
  },
  get _dbg() { return { ctl, nav, camera: W?.camera, lab, st, P, W }; },
  exit() {
    ctx.hud.ring(null); ctx.hud.prompt(null);
    ctx.audio.musicLayer('stopped', false); ctx.audio.musicLayer('resolve', false); ctx.audio.ambienceLayer('AMB_LAB_MACHINE', false);
    if (st?.charge) { st.charge.stop(0.1); st.charge = null; }
    st?.flashEl?.remove();
    ctx.cockpit.grow(false);
    offDbg?.(); offDbg = null;
    if (dbg) { dbg.removeFromParent(); dbg.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); dbg.children[0]?.material?.dispose(); dbg = null; }
    ctl?.dispose(); ctl = null;
    if (P) { P.mark.geometry.dispose(); P.mark.material.dispose(); P = null; }
    for (const f of faders) for (const m of f.mats) if (m.userData?.mergedVC) m.dispose();
    faders = [];
    lab?.dispose(); lab = null;
    W?.dispose(); W = null; nav = null;
  },
};
export default scene;
