// Кошка в доме. S07 — патруль по лестнице (r 85, 25 см/с, паузы 2 с, θ 120–250°): ближе 60 см садится и мяукает;
// если человек подходит осторожно (Shift) — отходит к перилам и пропускает; столкновение — +28, убегает 0,6 с со
// скоростью 140 см/с. S08 — обход 4 точек кабинета, у двери ложится поперёк прохода на 4 с (обход ≈ 60 см).
// Урон кошке невозможен: она лишь убегает. Препятствие для навигатора — круг nav.dyn (лёжа — два круга).
import * as THREE from 'three';
import { disposeTree } from '../three/toon.js';
import { CFG } from '../config.js';
import { createCat } from '../models/cat.js';
import { stairPos, stairTop, tangentYaw } from '../env/house.js';

const C = CFG.cat, D2R = Math.PI / 180;
function blobFor(scene, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: '#1d1519', transparent: true, opacity: 0.25, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); return m;
}
function baseCat(ctx, scene, nav) {
  const cat = createCat({ lite: true });
  cat.group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } o.layers.set(1); });
  scene.add(cat.group);
  const blob = blobFor(scene, 18);
  const dyn = { id: 'CAT', x: 0, y: 0, z: 0, r: C.radius, kind: 'cat' };
  const dyn2 = { id: 'CAT', x: 0, y: 0, z: 0, r: C.radius, kind: 'cat', off: true };
  nav.dyn.push(dyn, dyn2);
  let anim = '';
  const play = (n) => { if (n !== anim) { anim = n; cat.play(n); } };
  const dispose = () => {
    cat.group.removeFromParent(); blob.removeFromParent(); blob.geometry.dispose(); blob.material.dispose();
    disposeTree(cat.group);
    const i = nav.dyn.indexOf(dyn); if (i >= 0) nav.dyn.splice(i, 2);
  };
  return { cat, blob, dyn, dyn2, play, dispose, get anim() { return anim; } };
}
function meow(ctx, s) { if (s.meowCd <= 0) { s.meowCd = C.meowCd; ctx.audio.play('CAT_MEOW', { vol: 0.75 }); return true; } return false; }

export function createStairCat(ctx, scene, { nav, ctl, start = 150 } = {}) {
  const B = baseCat(ctx, scene, nav);
  const s = { th: start, r: C.patrolR, dir: 1, mode: 'patrol', t: 0, meowCd: 0, y: stairTop(start), yaw: 0, fleeDir: 1, targetR: C.patrolR, warned: 0, bumps: 0 };
  const p = new THREE.Vector3();
  const api = {
    s, model: B.cat, dyn: B.dyn,
    reset(th = start) { Object.assign(s, { th, r: C.patrolR, dir: 1, mode: 'patrol', t: 0, meowCd: 0, y: stairTop(th), targetR: C.patrolR }); B.dyn.off = false; B.play('walk'); api.place(0, true); },
    // столкновение с человеком: +28, кошка убегает
    collide() {
      if (s.mode === 'flee') return false;
      s.bumps++;
      ctl.bal.cat(); ctl.bump(0);
      ctx.audio.play('CAT_YOWL', { vol: 0.8 }); ctx.audio.play('CAT_RUN', { vol: 0.6 });
      s.fleeDir = s.th >= nav.th ? 1 : -1; s.mode = 'flee'; s.t = 0; B.dyn.off = true; B.play('run');
      return true;
    },
    distToHuman() { const h = ctl.st.pos; if (Math.abs(h.y - s.y) > 70) return 1e9; return Math.hypot(h.x - p.x, h.z - p.z); },
    update(dt) {
      s.t += dt; s.meowCd = Math.max(0, s.meowCd - dt);
      const d = api.distToHuman(), careful = ctl.st.careful && ctl.st.moving;
      const lo = C.patrol[0], hi = C.patrol[1];
      switch (s.mode) {
        case 'patrol': {
          s.th += s.dir * (C.speed / s.r) / D2R * dt; B.play('walk');
          if (s.th >= hi || s.th <= lo) { s.th = Math.max(lo, Math.min(hi, s.th)); s.mode = 'pause'; s.t = 0; B.play('idle'); }
          break;
        }
        case 'pause': if (s.t >= C.pause) { s.dir = -s.dir; s.mode = 'patrol'; s.t = 0; } break;
        case 'warn': // сидит и мяукает
          B.play('sit');
          if (s.t > 0.4 && careful && d < C.warnDist + 30) { s.mode = 'aside'; s.t = 0; s.targetR = 112; B.play('walk'); }
          else if (d > C.warnDist + 50 && s.t > 1) { s.mode = 'patrol'; s.t = 0; }
          else if (d < C.warnDist && s.t > 1.2) { if (meow(ctx, s)) B.cat.tailFlick?.(); }
          break;
        case 'aside': // к перилам — пропустить по внутренней стороне
          s.r += Math.sign(s.targetR - s.r) * Math.min(Math.abs(s.targetR - s.r), 45 * dt);
          if (Math.abs(s.r - s.targetR) < 0.5) { s.mode = 'asideWait'; s.t = 0; B.play('sit'); }
          break;
        case 'asideWait': if (d > 140 && s.t > 1) { s.mode = 'back'; s.t = 0; B.play('walk'); } break;
        case 'back':
          s.r += Math.sign(C.patrolR - s.r) * Math.min(Math.abs(C.patrolR - s.r), 30 * dt);
          if (d < C.warnDist) { s.mode = 'asideWait'; s.t = 0; s.targetR = s.r; B.play('sit'); }
          else if (Math.abs(s.r - C.patrolR) < 0.5) { s.mode = 'patrol'; s.t = 0; }
          break;
        case 'flee':
          s.th += s.fleeDir * (C.fleeSpeed / s.r) / D2R * dt; s.th = Math.max(lo - 10, Math.min(hi + 10, s.th)); // не в «шикану» коробка/сапог
          if (s.t >= C.fleeTime) { s.mode = 'rest'; s.t = 0; s.targetR = 112; B.play('sit'); ctx.audio.play('CAT_HISS', { vol: 0.5 }); }
          break;
        case 'rest': // отдышаться у перил, потом снова патруль
          s.r += Math.sign(s.targetR - s.r) * Math.min(Math.abs(s.targetR - s.r), 40 * dt);
          if (s.t > 0.8) B.dyn.off = false;
          if (s.t > 3 && d > 140) { s.mode = 'back'; s.t = 0; B.play('walk'); }
          break;
      }
      if ((s.mode === 'patrol' || s.mode === 'pause') && d < C.warnDist) { s.mode = 'warn'; s.t = 0; s.warned++; B.play('sit'); meow(ctx, s); B.cat.tailFlick?.(); }
      api.place(dt);
      B.cat.update(dt);
    },
    place(dt, snap = false) {
      stairPos(s.th, s.r, p); const ty = stairTop(s.th);
      s.y = snap ? ty : s.y + (ty - s.y) * (1 - Math.exp(-dt * 16)); p.y = s.y;
      B.cat.group.position.copy(p);
      const moving = s.mode === 'patrol' || s.mode === 'flee' || s.mode === 'back' || s.mode === 'aside';
      let yaw = tangentYaw(s.th, s.mode === 'flee' ? s.fleeDir : s.dir);
      if (s.mode === 'aside' || s.mode === 'back') yaw = Math.atan2(p.x - ctl.st.pos.x, p.z - ctl.st.pos.z);
      if (!moving && s.mode !== 'pause') yaw = Math.atan2(ctl.st.pos.x - p.x, ctl.st.pos.z - p.z); // смотрит на человека
      let dy = yaw - s.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      s.yaw = snap ? yaw : s.yaw + dy * (1 - Math.exp(-dt * 8));
      B.cat.group.rotation.y = s.yaw;
      B.blob.position.set(p.x, s.y + 0.5, p.z);
      B.dyn.x = p.x; B.dyn.y = s.y; B.dyn.z = p.z;
    },
    dispose: B.dispose,
  };
  api.reset(start);
  return api;
}

// S08: 4 точки кабинета; у двери к лестнице ложится поперёк прохода на 4 с
export function createRoomCat(ctx, scene, { nav, ctl, points, lieAt = 2, y = 300 } = {}) {
  const B = baseCat(ctx, scene, nav);
  const s = { i: 0, mode: 'walk', t: 0, meowCd: 0, x: points[0][0], z: points[0][1], yaw: 0, bumps: 0, lieYaw: 0 };
  const api = {
    s, model: B.cat,
    reset() { Object.assign(s, { i: 0, mode: 'idle', t: 0, x: points[0][0], z: points[0][1] }); B.dyn.off = false; B.dyn2.off = true; api.place(0, true); },
    collide() {
      if (s.mode === 'flee') return false;
      s.bumps++; ctl.bal.cat(); ctl.bump(0);
      ctx.audio.play('CAT_YOWL', { vol: 0.8 }); ctx.audio.play('CAT_RUN', { vol: 0.6 });
      s.mode = 'flee'; s.t = 0; B.dyn.off = true; B.dyn2.off = true; B.play('run');
      const h = ctl.st.pos, dx = s.x - h.x, dz = s.z - h.z, l = Math.hypot(dx, dz) || 1; s.fx = dx / l; s.fz = dz / l;
      return true;
    },
    update(dt) {
      s.t += dt; s.meowCd = Math.max(0, s.meowCd - dt);
      const tgt = points[s.i];
      if (s.mode === 'walk') {
        const dx = tgt[0] - s.x, dz = tgt[1] - s.z, l = Math.hypot(dx, dz), v = C.speed * 1.6;
        if (l < 2) { s.mode = s.i === lieAt ? 'lie' : 'idle'; s.t = 0; if (s.mode === 'lie') { B.play('lie'); s.lieYaw = tgt[2] ?? 0; ctx.audio.play('CAT_PURR', { vol: 0.5 }); } else B.play('sit'); }
        else {
          const nx = s.x + dx / l * Math.min(l, v * dt), nz = s.z + dz / l * Math.min(l, v * dt), h = ctl.st.pos;
          // человек на пути — кошка ждёт (садится), а не проходит сквозь него
          if (Math.hypot(h.x - nx, h.z - nz) < CFG.human.radius + C.radius + 6 && Math.abs(h.y - y) < 50) B.play('sit');
          else { s.x = nx; s.z = nz; s.yaw = Math.atan2(dx, dz); B.play('walk'); }
        }
      } else if (s.mode === 'idle') { if (s.t > C.pause + 1) { s.i = (s.i + 1) % points.length; s.mode = 'walk'; s.t = 0; } }
      else if (s.mode === 'lie') { s.yaw = s.lieYaw; if (s.t > C.lie) { s.i = (s.i + 1) % points.length; s.mode = 'walk'; s.t = 0; } }
      else if (s.mode === 'flee') {
        const v = C.fleeSpeed; let nx = s.x + s.fx * v * dt, nz = s.z + s.fz * v * dt;
        if (!nav.rectOf(y, nx, nz)) { nx = s.x; nz = s.z; }
        s.x = nx; s.z = nz; s.yaw = Math.atan2(s.fx, s.fz);
        if (s.t >= C.fleeTime) { s.mode = 'walk'; s.t = 0; s.i = (s.i + 1) % points.length; ctx.audio.play('CAT_HISS', { vol: 0.45 }); }
      }
      if (s.mode !== 'flee') {
        const h = ctl.st.pos, d = Math.hypot(h.x - s.x, h.z - s.z);
        if (d < C.warnDist + 10 && Math.abs(h.y - y) < 50) { if (meow(ctx, s)) B.cat.tailFlick?.(); }
        B.dyn.off = false;
      }
      api.place(dt);
      B.cat.update(dt);
    },
    place(dt, snap = false) {
      B.cat.group.position.set(s.x, y, s.z); B.cat.group.rotation.y = s.yaw;
      B.blob.position.set(s.x, y + 0.5, s.z); B.blob.scale.set(s.mode === 'lie' ? 1.5 : 1, s.mode === 'lie' ? 1 : 1, 1);
      B.blob.rotation.z = -s.yaw;
      // лёжа поперёк прохода — тело длиной ~50 см: два круга вдоль корпуса
      const lying = s.mode === 'lie', fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
      B.dyn.x = s.x + (lying ? fx * 13 : 0); B.dyn.z = s.z + (lying ? fz * 13 : 0); B.dyn.y = y;
      B.dyn2.off = !lying || s.mode === 'flee'; B.dyn2.x = s.x - fx * 13; B.dyn2.z = s.z - fz * 13; B.dyn2.y = y;
    },
    dispose: B.dispose,
  };
  api.reset();
  return api;
}
