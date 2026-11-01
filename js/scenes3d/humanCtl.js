// Общий контроллер человека для S07, S08, S10: управление WASD относительно камеры, ускорение 0,25 с, Shift — осторожно,
// равновесие L (core/balance.js) с креном модели, столкновения через «навигатор» (nav.step), шаги, позы окна «Кабина»,
// шкала «Равновесие», падение 0,9 с → колбэк сцены. Камера — «кукольный домик»: сверху под углом, сглаживание 0,2 с.
//
// Интерпретация «поворот +38»: смена направления ввода на Δ градусов на полной скорости даёт 38·(Δ/180)^1,5 —
// разворот на 180° = +38, поворот на 90° ≈ +13, на 45° ≈ +5; стоя (скорость ≈ 0) — бесплатно, Shift — ×0,43
// (доля скорости). Плавные изменения (аналоговый ввод, обход спирали) почти ничего не стоят, резкие — дорого.
import * as THREE from 'three';
import { disposeTree } from '../three/toon.js';
import { CFG } from '../config.js';
import { createBalance } from '../core/balance.js';
import { createScientist } from '../models/scientist.js';
import { createFollow } from '../three/camera.js';

const HU = CFG.human, B = CFG.bal, D2R = Math.PI / 180;
const wrapRad = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export function createHumanCtl(ctx, { scene, camera, nav, outfit = 'pajama', badge = false, pos = [0, 0, 0], yaw = 0, cam = HU.cam, meter = true, onFall = null, stepIds = null } = {}) {
  const model = createScientist({ outfit, badge });
  model.group.rotation.order = 'YXZ';
  scene.add(model.group);
  // слой 1: человек рисуется вторым проходом поверх полупрозрачного «разреза» (см. houseKit.render)
  model.group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } o.layers.set(1); });
  // круглая «капля»-тень (дешевле карты теней для движущегося персонажа)
  const blob = new THREE.Mesh(new THREE.CircleGeometry(26, 20), new THREE.MeshBasicMaterial({ color: '#1d1519', transparent: true, opacity: 0.28, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; blob.name = 'HUMAN_BLOB'; scene.add(blob);
  const follow = createFollow(camera, { smooth: cam.smooth });
  follow.shakeEnabled = () => ctx.settings.shake;
  const bal = createBalance(B);
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const st = {
    pos: new THREE.Vector3(...pos), y: pos[1], yaw, vel: new THREE.Vector2(), speed: 0, heading: null,
    careful: false, moving: false, lock: null, mode: 'walk', modeT: 0, stepAcc: 0, inputOn: true,
    puddle: false, carry: false, speedMul: 1, extra: 0, panic: false, lastHit: null, hitT: 0, turnExcess: 0,
    animName: '', animOverride: null, fallT: 0, onStairs: false, time: 0,
  };
  const ctl = {
    model, blob, follow, bal, st, nav, camera, cam: { ...cam }, camOffset: new THREE.Vector3(0, cam.height, cam.dist), lookOffset: new THREE.Vector3(0, 90, 0),
    camEnabled: true, meterOn: meter, onFall, onHit: null, onStep: null,
    get pos() { return st.pos; },
    // мгновенно переставить (респаун, начало сцены)
    teleport(x, y, z, yawR = st.yaw) {
      st.pos.set(x, y, z); st.y = y; st.yaw = yawR; st.vel.set(0, 0); st.speed = 0; st.heading = null; st.lock = null; st.mode = 'walk';
      st.puddle = false; st.extra = 0; st.panic = false; st.fallT = 0;
      bal.reset(); nav?.place?.(st, x, y, z);
      st.y = st.pos.y;
      ctl.play('idle'); ctl.placeModel(0, true); ctl.snapCamera();
    },
    snapCamera() { camPos.copy(st.pos).add(ctl.camOffset); camLook.copy(st.pos).add(ctl.lookOffset); follow.snap(camPos, camLook); },
    play(name, opts) { if (st.animName === name && !opts) return; st.animName = name; model.animator.play(name, opts || {}); },
    // действие с блокировкой ввода: анимация, длительность, поза кабины
    act(anim, { dur = 0.5, opts = null, pose = 'use', onDone = null, face = null } = {}) {
      if (face) ctl.faceTo(face[0], face[1], true);
      st.lock = { t: 0, dur, onDone, pose }; st.vel.set(0, 0); st.speed = 0;
      if (anim) { st.animName = ''; ctl.play(anim, opts || {}); }
    },
    unlock() { st.lock = null; },
    get locked() { return !!st.lock; },
    faceTo(x, z, snap = false) { const y = Math.atan2(x - st.pos.x, z - st.pos.z); st.targetYaw = y; if (snap) st.yaw = y; },
    // внешнее смещение (рывок лапки у зеркала и т.п.) — через навигатор, со столкновениями
    nudge(dx, dz) { if (nav) nav.step(st, dx, dz); else { st.pos.x += dx; st.pos.z += dz; } },
    recover() { bal.reset(); st.mode = 'walk'; st.fallT = 0; st.lock = null; ctl.play('idle'); },
    update(dt) {
      st.time += dt; st.modeT += dt;
      const inp = ctx.input;
      // ---- ввод → желаемая скорость (оси мира относительно камеры) ----
      let ax = 0, az = 0;
      const canMove = st.mode === 'walk' && !st.lock && st.inputOn;
      st.careful = canMove && inp.down('shift');
      if (canMove) {
        const a = inp.axis();
        camera.getWorldDirection(_f); _f.y = 0; if (_f.lengthSq() < 1e-6) _f.set(0, 0, -1); _f.normalize();
        const rx = -_f.z, rz = _f.x; // вправо
        ax = _f.x * -a.y + rx * a.x; az = _f.z * -a.y + rz * a.x;
        const l = Math.hypot(ax, az); if (l > 1) { ax /= l; az /= l; }
      }
      const vmax = (st.careful ? HU.careful : HU.speed) * st.speedMul;
      const inertia = st.puddle ? B.puddleInertia : 1;
      const k = 1 - Math.exp(-dt * 4 / (HU.accel * inertia));
      st.vel.x += (ax * vmax - st.vel.x) * k; st.vel.y += (az * vmax - st.vel.y) * k;
      if (!ax && !az && st.vel.length() < 2) st.vel.set(0, 0);
      st.speed = st.vel.length();
      st.moving = st.speed > 8;
      // ---- курс; «поворот» — по смене направления ввода (см. шапку) ----
      st.turnExcess = 0;
      if (ax || az) {
        const dir = Math.atan2(ax, az);
        if (st.inDir != null && st.speed > 25) { const d = Math.abs(wrapRad(dir - st.inDir)) / D2R; if (d > 0.5) st.turnExcess = 180 * Math.pow(d / 180, 1.5); }
        st.inDir = dir;
      } else st.inDir = null;
      if (st.speed > 25) { st.heading = Math.atan2(st.vel.x, st.vel.y); st.targetYaw = st.heading; } else st.heading = null;
      if (st.targetYaw != null && st.mode !== 'fall') st.yaw += wrapRad(st.targetYaw - st.yaw) * (1 - Math.exp(-HU.turnRate * dt));
      // ---- перемещение ----
      st.lastHit = null;
      if (st.speed > 0 && st.mode === 'walk') {
        const r = nav ? nav.step(st, st.vel.x * dt, st.vel.y * dt) : (st.pos.x += st.vel.x * dt, st.pos.z += st.vel.y * dt, null);
        if (r && r.hit) {
          st.lastHit = r.hit;
          const nx = r.hit.nx || 0, nz = r.hit.nz || 0, vn = -(st.vel.x * nx + st.vel.y * nz);
          const allow = ctl.onHit ? ctl.onHit(r.hit, vn, st.speed) : true;
          if (allow !== false && vn > 45 && r.hit.bump !== false) ctl.bump(r.hit.add || B.bump);
          if (vn > 0) { st.vel.x += nx * vn; st.vel.y += nz * vn; }
        }
      }
      // лужа: на лестнице — из навигатора, на полу — от сцены (кофе в S08)
      st.puddle = !!(nav?.puddle || st.puddleExt);
      // высота: ступени — быстро вверх, плавно вниз
      const gy = st.pos.y; st.y += (gy - st.y) * (1 - Math.exp(-dt * (gy > st.y ? 22 : 14)));
      st.onStairs = !!nav?.onStairs;
      // ---- равновесие ----
      if (st.mode === 'walk') {
        const state = bal.update(dt, { moving: st.moving, careful: st.careful, turnDeg: st.turnExcess, speedFrac: Math.min(1, st.speed / HU.speed), puddle: st.puddle, carry: st.carry, extra: st.extra });
        if (bal.changed && state === 'shaky' && bal.warnTimer <= 0) { bal.warnTimer = B.warnCd; ctx.audio.play('HUM_WOBBLE_WARN', { vol: 0.7 }); ctx.audio.warnDuck(0.6); }
        if (bal.changed) ctx.audio.musicLayer('wobble', bal.L >= B.wobble);
        if (state === 'fall') ctl.startFall();
      } else if (st.mode === 'fall') {
        st.fallT += dt;
        if (st.fallT >= B.fallDur && !st.fallDone) { st.fallDone = true; const r = ctl.onFall ? ctl.onFall() : false; if (r === false) ctl.recover(); }
      }
      // ---- действие ----
      if (st.lock) { st.lock.t += dt; if (st.lock.dur != null && st.lock.t >= st.lock.dur) { const L = st.lock; st.lock = null; L.onDone?.(); } }
      // ---- анимация ----
      if (st.mode === 'walk' && !st.lock) {
        if (st.animOverride) ctl.play(st.animOverride);
        else if (st.carry) ctl.play('carry');
        else if (st.moving) ctl.play(st.careful ? 'carefulWalk' : 'walk');
        else if (bal.L >= B.wobble) { if (st.animName !== 'wobble') ctl.play('wobble', { L: bal.L }); else model.animator.opts.L = bal.L; }
        else ctl.play('idle');
      }
      model.animator.update(dt, st.carry && st.moving ? st.speed : st.speed);
      // ---- шаги ----
      if (st.moving && st.mode === 'walk') {
        st.stepAcc += st.speed * dt;
        const stride = st.careful ? 33 : 39;
        if (st.stepAcc >= stride) {
          st.stepAcc -= stride;
          const id = st.onStairs ? 'HUM_STEP_STAIR' : st.careful ? 'HUM_STEP_CAREFUL' : 'HUM_STEP';
          ctx.audio.play(stepIds?.[id] || id, { vol: st.careful ? 0.35 : 0.5 });
          ctl.onStep?.();
        }
      } else st.stepAcc = 30;
      ctl.placeModel(dt);
      // ---- кабина и шкала ----
      const L = bal.L;
      const pose = st.mode === 'fall' || st.panic || L >= B.shaky ? 'panic' : L >= B.wobble ? 'wobble' : st.lock ? (st.lock.pose || 'use') : st.moving ? (st.careful ? 'careful' : 'walk') : 'idle';
      if (ctl.poseOn !== false) ctx.cockpit.setPose(pose);
      ctx.cockpit.setBalance(L);
      if (ctl.meterOn) ctx.hud.meter('bal', 'bal.label', L / 100, { state: L >= B.shaky ? 'danger' : L >= B.wobble ? 'warn' : '' });
      if (ctl.camEnabled) ctl.updateCamera(dt);
    },
    bump(v = B.bump) {
      if (!bal.bump(v)) return false;
      ctx.audio.play('HUM_BUMP', { vol: 0.7 }); if (Math.random() < 0.5) ctx.audio.play('HUM_OOF', { vol: 0.5 });
      ctx.cockpit.flash('bump'); follow.shake(0.25);
      if (st.mode === 'walk' && !st.lock) { st.animName = ''; ctl.play('bump'); st.bumpAnimT = 0.3; }
      return true;
    },
    startFall() {
      if (st.mode === 'fall') return;
      st.mode = 'fall'; st.fallT = 0; st.fallDone = false; st.vel.set(0, 0); st.speed = 0; st.lock = null;
      st.animName = ''; ctl.play('fall', { stairs: !!nav?.onStairs });
      ctx.audio.play('HUM_FALL', { vol: 0.9 }); ctx.audio.play('HUM_GASP', { vol: 0.6 });
      follow.shake(0.6);
    },
    placeModel(dt, snap = false) {
      const g = model.group;
      g.position.set(st.pos.x, st.y, st.pos.z);
      const roll = st.mode === 'fall' ? 0 : bal.roll;
      st.rollS = snap ? roll : (st.rollS || 0) + (roll - (st.rollS || 0)) * (1 - Math.exp(-dt * 10));
      g.rotation.set(0, st.yaw, st.rollS * D2R);
      blob.position.set(st.pos.x, st.y + 0.6, st.pos.z);
      blob.material.opacity = st.mode === 'fall' ? 0.18 : 0.28;
      // анимация «удар» короткая — потом обратно к ходьбе
      if (st.bumpAnimT != null) { st.bumpAnimT -= dt; if (st.bumpAnimT <= 0) { st.bumpAnimT = null; if (st.animName === 'bump') st.animName = ''; } }
    },
    updateCamera(dt) {
      camPos.set(st.pos.x, st.y, st.pos.z).add(ctl.camOffset); camLook.set(st.pos.x, st.y, st.pos.z).add(ctl.lookOffset);
      follow.update(dt, camPos, camLook);
    },
    dispose() {
      model.group.removeFromParent(); blob.removeFromParent(); blob.geometry.dispose(); blob.material.dispose();
      disposeTree(model.group);
      ctx.hud.removeMeter('bal'); ctx.audio.musicLayer('wobble', false);
    },
  };
  const _f = new THREE.Vector3();
  ctl.teleport(pos[0], pos[1], pos[2], yaw);
  return ctl;
}

// Простой навигатор «один этаж + прямоугольники препятствий» (лаборатория S10)
export function createBoxNav({ bounds, boxes = [], radius = HU.radius, y = 0 }) {
  const R = radius;
  const free = (x, z) => {
    if (x < bounds.x0 + R || x > bounds.x1 - R || z < bounds.z0 + R || z > bounds.z1 - R) return { name: 'wall' };
    for (const b of boxes) if (!b.off && x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R) return b;
    return null;
  };
  const nav = {
    boxes, bounds, onStairs: false,
    place(st, x, yy, z) { st.pos.y = y; },
    free,
    step(st, dx, dz) {
      const p = st.pos, nx = p.x + dx, nz = p.z + dz;
      let hit = free(nx, nz);
      if (!hit) { p.x = nx; p.z = nz; return { hit: null }; }
      const hx = free(nx, p.z), hz = free(p.x, nz);
      let n = [0, 0];
      if (!hx) { p.x = nx; n = [0, -Math.sign(dz)]; }
      else if (!hz) { p.z = nz; n = [-Math.sign(dx), 0]; }
      else n = [-Math.sign(dx) * 0.7071, -Math.sign(dz) * 0.7071];
      return { hit: { name: hit.name || 'box', box: hit, nx: n[0], nz: n[1], add: hit.add, bump: hit.bump } };
    },
  };
  return nav;
}
