// S08 «Сборы» (3D, человек, ~2 мин). Кабинет: стол (PASS_CARD, MUG_COFFEE), стул (NOTEBOOK; проход 70 см между
// стулом и кроватью), напольное зеркало + комод с KEYS. Подбор — E в радиусе 45 см от края тела, наклон 0,5 с.
// Стол на скорости > 70 см/с — кружка опрокидывается, кофе на полу (скользко: прирост L ×2, инерция ×1,8), +14.
// Стул — +14 и сдвиг на 10 см по ходу. Зеркало (mirrorDone): вход в r 120 перед стеклом — отражение (двойник за
// стеклом, трафарет) с лапкой SPIDER_LEG_EAR из уха; рывок 6 см каждые 0,45 с, при движении L +20/с, «Кабина» panic,
// HUM_RESIST_GRUNT; 2,0 с без движения — контроль, лапка втягивается, ключи доступны. Кошка: 4 точки, у двери к
// лестнице ложится поперёк прохода на 4 с (обход ~60 см). Три предмета → дверь к лестнице подсвечивается, спуск
// (BOX_STAIR на θ 300°), у входной двери «E — выйти» → C_ExitHome. Контрольные точки: start, descent.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { POINTS, stairPos, stairTop, tangentYaw, UP_Y } from '../env/house.js';
import { setupHouse } from './houseKit.js';
import { createRoomCat } from './catAI.js';
import { createMirror } from '../three/mirror.js';
import { createScientist } from '../models/scientist.js';
import { createSpiderLegEar } from '../models/spider_leg_ear.js';

const P8 = CFG.prep, MI = CFG.mirror, HU = CFG.human, B = CFG.bal;
const ITEM_DEFS = [
  { key: 'pass', obj: 'PASS_CARD', label: 'item.pass', sfx: 'HOUSE_PAPER', at: [348, 376, -124] },
  { key: 'notebook', obj: 'NOTEBOOK', label: 'item.notebook', sfx: 'HOUSE_PAPER' },
  { key: 'keys', obj: 'KEYS', label: 'item.keys', sfx: 'HOUSE_KEYS' },
];
const PUDDLE = { x: 326, z: -94, r: 30 };
const CAT_POINTS = [[465, 135], [262, 92], [215, -50, 0], [420, -40]];
let ctx, H, cat, mirror, twin, legR, legT, st, items, fx;
const V = new THREE.Vector3();

function setWorld(o, x, y, z) { V.set(x, y, z); o.parent.worldToLocal(V); o.position.copy(V); }
function glowMat(color = '#ffd84a') { return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }); }
// светящаяся рамка проёма (дверь к лестнице / входная дверь)
function doorFrame(scene, { x, y, z, w, h = 208, axis = 'z' }) {
  const g = new THREE.Group(), m = glowMat();
  const post = new THREE.BoxGeometry(5, h, 5), beam = axis === 'z' ? new THREE.BoxGeometry(5, 5, w) : new THREE.BoxGeometry(w, 5, 5);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(post, m); if (axis === 'z') p.position.set(0, h / 2, s * w / 2); else p.position.set(s * w / 2, h / 2, 0); g.add(p); }
  const b = new THREE.Mesh(beam, m); b.position.y = h; g.add(b);
  g.position.set(x, y, z); g.visible = false; g.traverse((o) => { o.layers.set(1); o.renderOrder = 5; }); scene.add(g);
  g.userData.dispose = () => { post.dispose(); beam.dispose(); m.dispose(); };
  return g;
}
function makeFx() {
  const scene = H.env.scene;
  const markGeo = new THREE.OctahedronGeometry(5, 0), markMat = glowMat('#ffe27a');
  const marks = items.map((it) => { const m = new THREE.Mesh(markGeo, markMat); m.layers.set(1); m.renderOrder = 6; m.position.set(it.x, it.y + 24, it.z); scene.add(m); return m; });
  // кофе: пятно на столе и лужа на полу
  const disc = new THREE.CircleGeometry(1, 24), coffee = new THREE.MeshToonMaterial({ color: '#5b3a22', transparent: true, opacity: 0.9, depthWrite: false });
  const pud = new THREE.Mesh(disc, coffee); pud.rotation.x = -Math.PI / 2; pud.position.set(PUDDLE.x, UP_Y + 0.7, PUDDLE.z); pud.scale.set(0.01, 0.01, 1); pud.visible = false; pud.renderOrder = 1; scene.add(pud);
  const spill = new THREE.Mesh(disc, coffee); spill.rotation.x = -Math.PI / 2; spill.position.set(330, 375.4, -138); spill.scale.set(0.01, 0.01, 1); spill.visible = false; scene.add(spill);
  const drip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 74, 2.4), coffee); drip.position.set(327, 338, -109.5); drip.visible = false; scene.add(drip);
  const stairDoor = doorFrame(scene, { x: 132, y: UP_Y, z: -50, w: 82 });
  const frontDoor = doorFrame(scene, { x: -427, y: 0, z: -110, w: 92, h: 214 });
  return {
    marks, pud, spill, drip, stairDoor, frontDoor,
    dispose() {
      for (const o of [...marks, pud, spill, drip]) o.removeFromParent();
      markGeo.dispose(); markMat.dispose(); disc.dispose(); coffee.dispose(); drip.geometry.dispose();
      for (const g of [stairDoor, frontDoor]) { g.removeFromParent(); g.userData.dispose(); }
    },
  };
}
const count = () => items.filter((i) => i.taken).length;
function updateCount() { ctx.objectives.text(0, { n: count() }); }

function resetAt(chk, keep) {
  const ctl = H.ctl, save = ctx.save;
  const prev = st;
  st = { chk, time: 0, mode: 'play', modeT: 0, mug: prev?.mug || false, mugT: prev?.mugT ?? 9, chairCd: 0, mirror: 'idle', mT: 0, still: 0, jerkT: 0, gruntT: 0,
    exitT: 0, fails: prev?.fails || 0, bumpsDesk: prev?.bumpsDesk || 0, chairPushes: prev?.chairPushes || 0, lockedTried: false, doorHi: false };
  const d = save.ensure();
  if (!keep) { for (const k of ['pass', 'notebook', 'keys']) save.setItem(k, false); save.setFlag('mirrorDone', false); }
  if (chk === 'descent') { for (const k of ['pass', 'notebook', 'keys']) d.items[k] = true; d.flags.mirrorDone = true; save.write(); }
  st.mirror = save.flag('mirrorDone') ? 'done' : 'idle';
  for (const it of items) {
    it.taken = !!d.items[it.key];
    it.o.visible = !it.taken;
    if (it.taken) H.env.cut.removeObject(it.o);
  }
  const hasPass = items[0].taken;
  ctl.model.setBadge(hasPass); twin?.setBadge(hasPass);
  ctl.st.inputOn = true; ctl.st.carry = false; ctl.st.animOverride = null; ctl.st.puddleExt = false;
  ctl.camOffset.set(0, HU.cam.height, HU.cam.dist); ctl.lookOffset.set(0, 90, 0); ctl.follow.smooth = HU.cam.smooth;
  if (chk === 'descent') { const th = 532, p = stairPos(th, CFG.stairs.startR); ctl.teleport(p.x, stairTop(th), p.z, tangentYaw(th, -1)); }
  else ctl.teleport(POINTS.S08start[0], UP_Y, POINTS.S08start[2], Math.PI / 2);
  legR.show(false); legT.show(false);
  cat.reset();
  ctx.hud.prompt(null);
  updateFx(0);
}
function setChk(chk) { if (st.chk === chk) return; st.chk = chk; ctx.scenes.setCheckpoint(chk); ctx.hud.toast(t('toast.checkpoint')); }

// ---- взаимодействия ----
function nearestItem() {
  const p = H.ctl.st.pos; let best = null, bd = 1e9;
  if (H.nav.onStairs || H.nav.floor !== UP_Y) return null;
  for (const it of items) { if (it.taken) continue; const d = Math.hypot(p.x - it.x, p.z - it.z) - HU.radius; if (d <= P8.pickR && d < bd) { bd = d; best = it; } }
  return best;
}
function pick(it) {
  const ctl = H.ctl;
  ctx.audio.play('HUM_BEND', { vol: 0.6 });
  ctl.act('bendPick', { dur: P8.bend, pose: 'use', face: [it.x, it.z], onDone: () => {
    it.taken = true; it.o.visible = false; H.env.cut.removeObject(it.o);
    ctx.save.setItem(it.key, true);
    ctx.audio.play('HUM_PICKUP', { vol: 0.7 }); ctx.audio.play(it.sfx, { vol: 0.8 });
    ctx.hud.toast(t('toast.got', { item: t(it.label) }));
    if (it.key === 'pass') { ctl.model.setBadge(true); twin?.setBadge(true); }
    updateCount();
    if (count() === 3) {
      ctx.objectives.done(0); ctx.cockpit.flash('cheer', CFG.ui.cockpit.cheerDur);
      setTimeout(() => { if (ctx.scenes.currentId === 'S08_Prep') ctx.hud.toast(t('toast.allItems')); }, 1400);
    }
  } });
}
function tipMug() {
  st.mug = true; st.mugT = 0;
  ctx.audio.play('HOUSE_MUG_TIP', { vol: 0.9 });
  setTimeout(() => { if (ctx.scenes.currentId === 'S08_Prep') ctx.audio.play('HOUSE_COFFEE_SPILL', { vol: 0.8 }); }, 280);
  ctx.hud.toast(t('toast.mug'));
}
function placeMug(k) { // 0 — стоит, 1 — лежит на боку у края стола
  const m = H.env.item('MUG_COFFEE'); if (!m) return;
  if (!m.userData.home) m.userData.home = { p: m.position.clone(), r: m.rotation.clone() };
  const h = m.userData.home; m.position.copy(h.p); m.rotation.copy(h.r);
  if (k > 0) { m.rotation.x = h.r.x + k * Math.PI / 2; V.set(0, -2.5 * k, 9 * k); m.position.add(V); }
}
function pushChair(dx, dz) {
  const room = H.env.room('STUDY'), chair = room.byId('chair_wood')[0]; if (!chair) return false;
  const l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
  // главная ось толчка, 10 см
  const mx = Math.abs(ux) > Math.abs(uz) ? Math.sign(ux) * P8.chairPush : 0, mz = mx ? 0 : Math.sign(uz) * P8.chairPush;
  const box = H.env.boxes[UP_Y].find((b) => b.name === 'CHAIR'); if (!box) return false;
  const nb = { x0: box.x0 + mx, x1: box.x1 + mx, z0: box.z0 + mz, z1: box.z1 + mz };
  // не вталкиваем в другую мебель и стены кабинета
  if (nb.x0 < 132 || nb.x1 > 548 || nb.z0 < -178 || nb.z1 > 178) return false;
  for (const b of H.env.boxes[UP_Y]) if (b !== box && b.name !== 'CHAIR' && nb.x0 < b.x1 && nb.x1 > b.x0 && nb.z0 < b.z1 && nb.z1 > b.z0) return false;
  chair.position.x += mx; chair.position.z += mz;
  const nbk = items[1]; if (!nbk.taken) { nbk.o.position.x += mx; nbk.o.position.z += mz; nbk.x += mx; nbk.z += mz; }
  H.env.refreshBoxes();
  ctx.renderer.three.shadowMap.needsUpdate = true;
  ctx.audio.play('HOUSE_CHAIR_SCRAPE', { vol: 0.8 });
  st.chairPushes++;
  return true;
}
function onHit(hit, vn) {
  if (hit.kind === 'cat') { cat.collide(); return false; }
  if (hit.name === 'DESK') {
    if (vn > P8.deskSpeed) { st.bumpsDesk++; H.ctl.bump(B.bump); if (!st.mug) tipMug(); }
    return false; // мягкое касание стола — без штрафа
  }
  if (hit.name === 'CHAIR') {
    if (vn > 20 && st.chairCd <= 0) { st.chairCd = 0.6; H.ctl.bump(B.bump); pushChair(-hit.nx, -hit.nz); }
    return false;
  }
  return true;
}

// ---- зеркало ----
const G = new THREE.Vector3();
function glassPos() { mirror.glass.getWorldPosition(G); return G; }
function mirrorCam() {
  // камера — по линии «отражение человека → стекло», с той стороны, откуда отражение видно
  const ctl = H.ctl, p = ctl.st.pos, g = glassPos();
  let vx = g.x - p.x, vz = p.z - g.z; const l = Math.hypot(vx, vz) || 1; vx /= l; vz /= l;
  const d = l + 150;
  let cx = g.x + vx * d, cz = g.z + vz * d;
  cx = Math.max(150, Math.min(535, cx)); cz = Math.min(178, Math.max(g.z + 60, cz));
  ctl.camOffset.set(cx - p.x, 205, cz - p.z);
  ctl.lookOffset.set(g.x - p.x, 128, g.z - p.z);
  ctl.follow.smooth = 0.55;
}
function startMirror() {
  const ctl = H.ctl;
  st.mirror = 'active'; st.mT = 0; st.still = 0; st.jerkT = 0.3; st.gruntT = 0.5;
  ctx.audio.play('PREP_MIRROR_STING', { vol: 0.9 });
  ctx.hud.subtitle(t('sub.mirror'), 3.0, t('name.spider'));
  legR.show(true); legT.show(true);
  ctl.st.panic = true;
  const g = glassPos(); ctl.faceTo(g.x, g.z);
  mirrorCam();
  ctx.audio.musicLayer('quiet', true);
}
function endMirror() {
  const ctl = H.ctl;
  st.mirror = 'done';
  ctx.save.setFlag('mirrorDone', true);
  ctx.audio.play('PREP_LEG_RETRACT', { vol: 0.8 });
  ctx.hud.toast(t('mirror.done')); ctx.hud.prompt(null); ctx.hud.ring(null);
  legR.show(false); legT.show(false);
  ctl.st.panic = false; ctl.st.extra = 0; ctl.st.animOverride = null;
  ctl.camOffset.set(0, HU.cam.height, HU.cam.dist); ctl.lookOffset.set(0, 90, 0);
  setTimeout(() => { if (H) H.ctl.follow.smooth = HU.cam.smooth; }, 900);
  ctx.cockpit.flash('cheer', CFG.ui.cockpit.cheerDur);
  ctx.audio.musicLayer('quiet', false);
}
function updateMirror(dt) {
  const ctl = H.ctl, p = ctl.st.pos;
  const g = glassPos(), dist = Math.hypot(p.x - g.x, p.z - g.z), front = p.z - g.z;
  const onFloor = !H.nav.onStairs && H.nav.floor === UP_Y;
  if (st.mirror === 'idle' && onFloor && dist <= MI.radius && front > 25 && st.mode === 'play' && !ctl.locked) startMirror();
  if (st.mirror !== 'active') return;
  st.mT += dt;
  const moving = ctl.st.moving;
  // рывки лапки
  st.jerkT -= dt;
  if (st.jerkT <= 0) {
    st.jerkT += MI.jerkEvery;
    const a = ctx.rng.next() * Math.PI * 2; ctl.nudge(Math.cos(a) * MI.jerk, Math.sin(a) * MI.jerk);
    legR.twitch(); legT.twitch(); ctx.audio.play('PREP_LEG_TWITCH', { vol: 0.55 }); ctl.follow.shake(0.12);
  }
  st.gruntT -= dt; if (st.gruntT <= 0) { st.gruntT = 1.2 + Math.random() * 0.4; ctx.audio.play('HUM_RESIST_GRUNT', { vol: 0.6 }); }
  ctl.st.extra = moving ? B.mirrorRate : 0;
  ctl.st.animOverride = moving ? null : 'resist';
  st.still = moving ? 0 : st.still + dt;
  ctx.hud.prompt(t('mirror.hint'));
  ctx.hud.ring(Math.min(1, st.still / MI.stillTime), 480, 330, '⏸');
  if (st.still >= MI.stillTime) endMirror();
}

function updateFx(dt) {
  const tm = st.time;
  items.forEach((it, i) => { const m = fx.marks[i]; m.visible = !it.taken && !(it.key === 'keys' && st.mirror !== 'done' && !st.lockedTried); m.position.set(it.x, it.y + 22 + Math.sin(tm * 3 + i) * 3, it.z); m.rotation.y = tm * 2; });
  const all = count() === 3;
  fx.stairDoor.visible = all && !H.nav.onStairs && H.nav.floor === UP_Y;
  fx.frontDoor.visible = all && (H.nav.onStairs || H.nav.floor === 0);
  const a = 0.45 + 0.4 * Math.sin(tm * 5);
  fx.stairDoor.children[0].material.opacity = a;
  // кружка и кофе
  if (st.mug) {
    st.mugT += dt;
    const k = Math.min(1, st.mugT / 0.25); placeMug(k);
    const sk = Math.min(1, Math.max(0, (st.mugT - 0.15) / 0.5)), pk = Math.min(1, Math.max(0, (st.mugT - 0.45) / 0.8));
    fx.spill.visible = true; fx.spill.scale.set(13 * sk + 0.01, 9 * sk + 0.01, 1);
    fx.drip.visible = st.mugT > 0.35 && st.mugT < 2.2; fx.drip.scale.y = Math.min(1, Math.max(0.05, (st.mugT - 0.35) / 0.3));
    fx.pud.visible = pk > 0; fx.pud.scale.set(PUDDLE.r * pk + 0.01, PUDDLE.r * 0.8 * pk + 0.01, 1);
    if (dt && st.mugT < 1.5) ctx.renderer.three.shadowMap.needsUpdate = st.mugT < 0.3 || ctx.renderer.three.shadowMap.needsUpdate;
  } else { placeMug(0); fx.spill.visible = fx.drip.visible = fx.pud.visible = false; }
}

const scene = {
  id: 'S08_Prep', kind: '3d', series: 8, cockpit: true,
  checkpoints: ['start', 'descent'],
  objectives: ['obj.s8.items', 'obj.s8.exit'],
  get objectiveVars() { return { 'obj.s8.items': { n: items ? count() : 0 } }; },
  hints: [['E', 'hint.take'], ['Shift', 'hint.careful']],
  async enter(c, params) {
    ctx = c; ctx.show3d(true); st = null;
    H = await setupHouse(ctx, { mode: 'S08', outfit: 'work', badge: false, start: [POINTS.S08start[0], UP_Y, POINTS.S08start[2]], yaw: Math.PI / 2 });
    H.ctl.onFall = () => ctx.scenes.fail('fail.fall', { tip: 'tip.s8' });
    H.ctl.onHit = onHit;
    // предметы
    items = ITEM_DEFS.map((d) => {
      const o = H.env.item(d.obj); if (!o) throw new Error('S08: нет предмета ' + d.obj);
      if (d.at) setWorld(o, ...d.at);
      o.getWorldPosition(V);
      return { ...d, o, x: V.x, y: V.y, z: V.z, taken: false };
    });
    // зеркало: стекло на подставке, двойник — второй экземпляр человека; лапка из уха у обоих (у двойника — до трафарета)
    mirror = createMirror(ctx, { width: 44, height: 190, floorY: 104, room: { wall: '#e6d0ae', floor: '#a8784e', w: 420, h: 260, d: 240 } });
    mirror.group.position.set(0, 104, 1.6); H.env.mirrorStand.add(mirror.group);
    mirror.glass.layers.set(1); // стекло рисуется во 2-м проходе — после человека, с его глубиной
    twin = createScientist({ outfit: 'work', badge: false });
    legT = createSpiderLegEar(); legT.attach(twin.joints.head, 'R');
    mirror.setTwin(twin, H.ctl.model);
    legR = createSpiderLegEar(); legR.attach(H.ctl.model.joints.head, 'R'); legR.group.traverse((o) => o.layers.set(1));
    cat = createRoomCat(ctx, H.env.scene, { nav: H.nav, ctl: H.ctl, points: CAT_POINTS, lieAt: 2, y: UP_Y });
    fx = makeFx();
    const keep = !!params.retry;
    resetAt(params.checkpoint || 'start', keep);
    ctx.audio.music('M_HOUSE'); ctx.audio.setReverb('house'); ctx.audio.ambience('AMB_HOUSE_MORNING');
    H.prewarm();
  },
  onStart() { scene.applyDone(); },
  applyDone() { updateCount(); if (count() === 3) ctx.objectives.done(0, true); },
  update(dt) {
    st.time += dt; st.modeT += dt; st.chairCd = Math.max(0, st.chairCd - dt);
    const ctl = H.ctl, nav = H.nav, p = ctl.st.pos;
    // кофе на полу — скользко
    ctl.st.puddleExt = st.mug && st.mugT > 0.6 && !nav.onStairs && nav.floor === UP_Y && Math.hypot(p.x - PUDDLE.x, p.z - PUDDLE.z) < PUDDLE.r + 4;
    ctl.update(dt);
    for (const e of nav.events) {
      if (e.type === 'enterStairs' && e.from === UP_Y && count() === 3) setChk('descent');
    }
    cat.update(dt);
    if (st.mode === 'play') {
      updateMirror(dt);
      if (st.mirror !== 'active') {
        let prompt = null;
        const it = nearestItem();
        if (it && !ctl.locked && ctl.st.mode === 'walk') {
          if (it.key === 'keys' && st.mirror !== 'done') {
            prompt = t('prompt.keysLocked');
            if (ctx.input.pressed('use')) { st.lockedTried = true; ctx.audio.play('UI_DENY', { vol: 0.5 }); ctx.hud.toast(t('toast.mirror')); }
          } else {
            prompt = t('prompt.take', { item: t(it.label) });
            if (ctx.input.pressed('use')) pick(it);
          }
        }
        // входная дверь
        const fd = POINTS.frontDoor;
        if (!nav.onStairs && nav.floor === 0 && Math.hypot(p.x - fd[0], p.z - fd[2]) <= P8.doorR) {
          if (count() < 3) prompt = t('prompt.needItems', { n: count() });
          else {
            prompt = t('prompt.exit');
            if (ctx.input.pressed('use') && !ctl.locked && ctl.st.mode === 'walk') {
              st.mode = 'exit'; st.modeT = 0;
              ctl.act(null, { dur: null, pose: 'use', face: [fd[0], fd[2]] });
              ctx.audio.play('HOUSE_FRONT_DOOR', { vol: 0.9 });
              H.env.setFrontDoor(0.75);
              ctx.objectives.done(1);
            }
          }
        }
        ctx.hud.prompt(prompt);
      }
    } else if (st.mode === 'exit') {
      ctx.hud.prompt(null);
      if (st.modeT > 0.9 && !st.left) { st.left = true; ctx.save.setFlag('leftHome', true); ctx.scenes.complete(); }
    }
    legR.update(dt); legT.update(dt);
    legR.group.scale.multiplyScalar(3.4); legT.group.scale.multiplyScalar(3.4);
    updateFx(dt);
    H.tick(dt, st.time);
  },
  updateIdle(dt) { if (!H) return; H.ctl.update(dt); H.tick(dt, st.time); },
  render() {
    H.render();
    // зеркало: только пока человек в кабинете и стекло смотрит в камеру
    const p = H.ctl.st.pos, g = glassPos();
    mirror.active = !H.nav.onStairs && H.nav.floor === UP_Y && p.x > 60 && Math.hypot(p.x - g.x, p.z - g.z) < 420;
    if (mirror.active) { mirror.update(H.camera); mirror.render(H.camera); }
  },
  respawn(chk) {
    st.fails++;
    resetAt(chk, true);
    ctx.objectives.set(scene.objectives, false, scene.objectiveVars);
    scene.applyDone();
  },
  pause() {}, resume() {},
  debugWin() {
    for (const it of items) if (!it.taken) { it.taken = true; it.o.visible = false; ctx.save.setItem(it.key, true); }
    ctx.save.setFlag('mirrorDone', true); st.mirror = 'done';
    H.ctl.model.setBadge(true); updateCount(); ctx.objectives.done(0, true);
    const s = POINTS.frontDoorStand; H.ctl.teleport(s[0], 0, s[2], -Math.PI / 2);
    // F5 = победа: сразу выходим через входную дверь (как по E у двери)
    if (st.mode !== 'exit') { st.mode = 'exit'; st.modeT = 0; H.env.setFrontDoor(0.75); ctx.objectives.done(1, true); }
  },
  debugInfo() {
    const c = H.ctl, n = H.nav;
    return `S08: ${n.onStairs ? `лестница θ ${n.th.toFixed(0)}° r ${n.r.toFixed(0)}` : `${n.region} (${c.st.pos.x.toFixed(0)}, ${c.st.pos.z.toFixed(0)}) y ${n.floor}`} · L ${c.bal.L.toFixed(0)} ${c.bal.stateName} · предметы ${count()}/3 · зеркало ${st.mirror}${st.mirror === 'active' ? ' ' + st.still.toFixed(1) : ''} · кружка ${st.mug ? 'упала' : 'стоит'} · кошка ${cat.s.mode}${c.st.puddle ? ' · лужа' : ''}`;
  },
  get _dbg() { return { H, cat, st, mirror, items, twin, legR }; },
  exit() {
    ctx.hud.ring(null); ctx.audio.musicLayer('quiet', false);
    fx?.dispose(); fx = null;
    legR?.dispose(); legR = null;
    mirror?.dispose(); mirror = null; twin = null; legT = null;
    cat?.dispose(); cat = null;
    H?.dispose(); H = null; items = null;
  },
};
export default scene;
