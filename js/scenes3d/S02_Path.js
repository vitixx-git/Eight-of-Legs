// S02 «Путь к человеку» (3D, паук, 2–3 мин). Поверхности F/B/T/P (env/bedroom.js) с локальными (u, v). Переходы —
// только паутина W1/W2 (E) и края (0,3 с): одеяла B↔T и подушки T↔P (на подушку можно забраться с матраса —
// упёрся в край → перелез), без физики прилипания. Управление экранно-относительное; после перехода клавиши
// сохраняют прежнее направление, пока их не отпустят или паук не упрётся (камера доворачивается, а паук не
// сворачивает сам). На подушке «вперёд» ведёт к уху своей половины; камера не уходит за изголовье.
// Ворочание 6–9 с: предупреждение 1,2 с («!», штриховка зоны, храп обрывается, BED_CREAK_WARN) → удар 0,5 с.
// Поражение — если в зоне И на свету И не в укрытии (складка одеяла / ямка подушки). Шкала пробуждения: у головы
// растёт быстро, Shift медленно, стоя — падает; 70 % — бормотание, 100 % — «Он проснулся». Ухо (любое из двух): радиус 6 см → E.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { createFollow } from '../three/camera.js';
import { createWorld, colliderDebug } from './common.js';
import { buildBedroom, BED, BEDROOM_LIGHTS, inMoon, inFold, inDip, surfNormal, cameraClip, topY, surfCam, resolveOn, edgeStep } from '../env/bedroom.js';
import { el } from '../ui/dom.js';

const SP = CFG.spider3d, SL = CFG.sleeper, WK = CFG.wake;
const UP = new THREE.Vector3(0, 1, 0);
let ctx, world, env, follow, st, snore, wind, bangEl, dbg, offDbg;
const v3 = new THREE.Vector3(), v3b = new THREE.Vector3(), qA = new THREE.Quaternion(), qY = new THREE.Quaternion(), nrm = new THREE.Vector3();

function surf() { return env.surfaces[st.surf]; }
function placeSpider(dt, snap = false) {
  const s = surf(), g = env.spider.group;
  st.pos.y = s.h(st.pos.x, st.pos.z);
  g.position.copy(st.pos);
  env.glow.visible = true; env.glow.userData.place(st.pos.x, st.pos.z, 4.5);
  surfNormal(s, st.pos.x, st.pos.z, nrm);
  qA.setFromUnitVectors(UP, nrm); qY.setFromAxisAngle(UP, st.yaw); qA.multiply(qY);
  if (snap) g.quaternion.copy(qA); else g.quaternion.slerp(qA, 1 - Math.exp(-14 * dt));
}
function camDir() { return st.camF; }
function resetAt(chk) {
  const W = BED;
  st = {
    surf: 'F', pos: new THREE.Vector3(...W.descent), yaw: -Math.PI / 2, vel: new THREE.Vector2(), camF: new THREE.Vector2(-1, -0.1).normalize(),
    mode: 'play', modeT: 0, wake: 0, mumbled: false, stepAcc: 0, lit: false, cover: false, chk, time: 0,
    toss: { phase: 'idle', t: 0, next: SL.firstDelay, zone: null, n: 0 }, web: null, edge: null, ear: null, swatCount: st?.swatCount || 0,
    squish: 0,
  };
  if (chk === 'bed') { st.surf = 'B'; st.pos.set(0, 0, 91); st.yaw = Math.PI; st.camF.set(0, -1); }
  if (chk === 'pillow') { st.surf = 'P'; st.pos.set(31, 0, -90); st.yaw = -Math.PI / 2; st.camF.set(...surfCam(env.surfaces.P, 31, -90)).normalize(); }
  env.spider.group.visible = true; env.spider.group.scale.setScalar(1); env.spider.animator.play('idle');
  env.palm.visible = false; env.zone.visible = false; env.shadow.visible = false; env.bang.visible = false; env.hideThread();
  env.sleeper.lie('sleepBreath');
  placeSpider(0, true);
  const f = camDir();
  follow.snap(cameraClip(v3b.set(st.pos.x, st.pos.y + 3, st.pos.z).clone(), v3.set(st.pos.x - f.x * SP.cam.dist, st.pos.y + SP.cam.height, st.pos.z - f.y * SP.cam.dist)), v3b.set(st.pos.x + f.x * SP.cam.lookAhead, st.pos.y + 2, st.pos.z + f.y * SP.cam.lookAhead));
  snore?.setVol(0.5);
  ctx.audio.muffle(false, 0.1);
  if (bangEl) bangEl.classList.remove('on');
}
function startDescent() {
  st.mode = 'descend'; st.modeT = 0;
  st.pos.set(BED.descent[0], BED.wardrobe.h, BED.descent[2]);
  env.spider.group.position.copy(st.pos);
  env.spider.animator.play('crawl');
  wind = ctx.audio.loop('SPIDER_WIND', { vol: 0.35 });
  ctx.audio.play('SPD_WEB_SHOOT', { vol: 0.6 });
}
function axisKey(a) { return Math.sign(a.x) + 3 * Math.sign(a.y); }
function moveSpider(dt) {
  const a = ctx.input.axis(), careful = ctx.input.down('shift');
  if (st.lock && st.lock.key !== axisKey(a)) st.lock = null; // клавиши сменили/отпустили — снова базис камеры
  const f = st.lock ? st.lock.f : camDir(), rx = -f.y, rz = f.x;
  let dx = f.x * -a.y + rx * a.x, dz = f.y * -a.y + rz * a.x;
  const len = Math.hypot(dx, dz); if (len > 1) { dx /= len; dz /= len; }
  const sp = careful ? SP.careful : SP.speed;
  const k = 1 - Math.exp(-12 * dt);
  st.vel.x += (dx * sp - st.vel.x) * k; st.vel.y += (dz * sp - st.vel.y) * k;
  if (!len && st.vel.length() < 0.4) st.vel.set(0, 0);
  const speed = st.vel.length();
  st.careful = careful; st.moving = speed > 1.0;
  if (speed > 0.5) {
    const target = Math.atan2(st.vel.x, st.vel.y);
    let d = target - st.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    st.yaw += d * (1 - Math.exp(-SP.turnRate * dt));
  }
  const s = surf();
  let nx = st.pos.x + st.vel.x * dt, nz = st.pos.z + st.vel.y * dt;
  // переходы через край: одеяло B↔T, подушка T↔P
  const e = edgeStep(env.surfaces, st.surf, st.pos.x, st.pos.z, nx, nz, st.vel.x, st.vel.y, SP.radius, SP.edgeMinV * sp);
  if (e) { startEdge(e.to, e.x, e.z); return; }
  [nx, nz] = resolveOn(s, nx, nz, SP.radius);
  const moved = Math.hypot(nx - st.pos.x, nz - st.pos.z);
  // «замок» направления после края снимается, если паук упёрся (0,2 с почти без движения): дальше — по камере
  if (st.lock) { st.lock.stuck = moved < 0.25 * speed * dt ? st.lock.stuck + dt : 0; if (st.lock.stuck > 0.2) st.lock = null; }
  st.pos.x = nx; st.pos.z = nz;
  placeSpider(dt);
  const anim = env.spider.animator;
  if (st.moving) { if (anim.name !== 'walk') anim.play('walk'); } else if (anim.name !== 'idle') anim.play('idle');
  st.animSpeed = speed;
  st.stepAcc += moved;
  if (st.stepAcc > 5) { st.stepAcc = 0; ctx.audio.play('SPD_STEP_SOFT', { vol: careful ? 0.12 : 0.24, rate: 0.9 + Math.random() * 0.2 }); }
}
function startEdge(to, x, z) {
  st.mode = 'edge'; st.modeT = 0;
  // ориентация плавно переходит к нормали новой поверхности в точке приземления (на подушке край наклонный)
  surfNormal(env.surfaces[to], x, z, nrm);
  const q1 = new THREE.Quaternion().setFromUnitVectors(UP, nrm).multiply(qY.setFromAxisAngle(UP, st.yaw));
  st.edge = { to, from: st.pos.clone(), fx: x, fz: z, q0: env.spider.group.quaternion.clone(), q1 };
  st.lock = { key: axisKey(ctx.input.axis()), f: (st.lock ? st.lock.f : camDir()).clone(), stuck: 0 };
  env.spider.animator.play('crawl');
  ctx.audio.play('SPD_EDGE', { vol: 0.5 });
}
// первое попадание на подушку (по краю или паутиной W2): задача выполнена, контрольная точка
function arrivePillow() {
  if (!ctx.objectives.isDone(1)) { ctx.objectives.done(1); ctx.scenes.setCheckpoint('pillow'); st.chk = 'pillow'; }
}
function nearWeb() {
  for (const [key, w] of Object.entries(env.webs)) {
    if (st.surf === w.fromS && Math.hypot(st.pos.x - w.a[0], st.pos.z - w.a[2]) <= SP.webRadius) return { key, w, up: true };
    if (st.surf === w.toS && Math.hypot(st.pos.x - w.b[0], st.pos.z - w.b[2]) <= SP.webRadius) return { key, w, up: false };
  }
  return null;
}
function nearEar() { // любое из двух ушей — на подушку можно забраться с обеих сторон
  if (st.surf !== 'P') return null;
  for (const side of ['L', 'R']) { const e = env.earWorld(v3, side); if (Math.hypot(st.pos.x - e.x, st.pos.z - e.z) <= SP.earRadius) return e.clone(); }
  return null;
}
function startWeb(n) {
  st.mode = 'web'; st.modeT = 0;
  const a = n.up ? n.w.a : n.w.b, b = n.up ? n.w.b : n.w.a;
  st.web = { ...n, a: new THREE.Vector3(...a), b: new THREE.Vector3(...b), shot: n.up ? 0.65 : 0.15 };
  st.yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
  if (n.up) { env.spider.animator.play('webShoot', { target: st.web.b.clone() }); ctx.audio.play('SPD_WEB_SHOOT'); }
  else env.spider.animator.play('crawl');
  st.vel.set(0, 0); st.lock = null;
}
function finishWeb() {
  const w = st.web; st.web = null; st.mode = 'play'; st.modeT = 0;
  st.surf = w.up ? w.w.toS : w.w.fromS;
  st.pos.set(w.b.x, 0, w.b.z);
  if (w.up && w.key === 'W1') { st.yaw = Math.PI; if (!ctx.objectives.isDone(0)) { ctx.objectives.done(0); ctx.scenes.setCheckpoint('bed'); st.chk = 'bed'; } }
  if (w.up && w.key === 'W2') { st.yaw = -Math.PI / 2; arrivePillow(); }
  placeSpider(0, true);
  env.spider.animator.play('idle');
}
function startEar(e) {
  st.mode = 'ear'; st.modeT = 0; st.ear = { from: st.pos.clone(), to: e, hb: 0, camFrom: world.camera.position.clone() };
  st.yaw = Math.atan2(e.x - st.pos.x, e.z - st.pos.z);
  env.spider.animator.play('earEnter', { distance: 1.5 });
  ctx.audio.play('SPD_EAR_ENTER'); ctx.hud.prompt(null);
  snore?.setVol(0.15);
}
// ---------- ворочание ----------
function updateToss(dt) {
  const T = st.toss; T.t += dt;
  const onBed = st.surf !== 'F';
  if (T.phase === 'idle') {
    if (T.t >= T.next) {
      T.phase = 'warn'; T.t = 0; T.n++;
      T.zone = onBed ? { x: st.pos.x, z: st.pos.z, r: SL.zoneR } : null;
      if (T.zone) { env.zone.userData.place(T.zone.x, T.zone.z, T.zone.r); env.zone.visible = true; }
      env.bang.visible = true; bangEl?.classList.add('on');
      snore?.setVol(0); ctx.audio.play('BED_SNORE_STOP'); ctx.audio.play('BED_CREAK_WARN'); ctx.audio.warnDuck(SL.warn);
    }
  } else if (T.phase === 'warn') {
    env.bang.scale.setScalar(12 + 2 * Math.sin(T.t * 18));
    if (T.t >= SL.warn) {
      T.phase = 'strike'; T.t = 0;
      env.sleeper.lie(T.n % 2 ? 'toss.turn' : 'toss.head'); env.rustle(0.7);
      if (T.zone) { env.palm.visible = true; env.shadow.visible = true; env.shadow.userData.place(T.zone.x, T.zone.z, 9); }
    }
  } else if (T.phase === 'strike') {
    const u = Math.min(1, T.t / SL.strike), k = u * u;
    if (T.zone) {
      const y = env.surfaces[st.surf].h(T.zone.x, T.zone.z);
      env.palm.position.set(T.zone.x, y + 2 + 44 * (1 - k), T.zone.z); env.palm.rotation.set(0, 0.4, 0);
      env.shadow.material.opacity = SL.swatShadow * (0.3 + 0.7 * k); env.shadow.userData.place(T.zone.x, T.zone.z, 7 + 6 * k);
    }
    if (T.t >= SL.strike) {
      const z = T.zone, inZone = z && st.surf !== 'F' && Math.hypot(st.pos.x - z.x, st.pos.z - z.z) <= z.r;
      if (inZone && st.lit && !st.cover && st.mode !== 'ear') { swat(); return; }
      ctx.audio.play(z ? 'BED_SWAT' : 'BED_TOSS', { vol: z ? 0.45 : 0.7 });
      T.phase = 'recover'; T.t = 0; env.zone.visible = false; env.bang.visible = false; bangEl?.classList.remove('on');
    }
  } else if (T.phase === 'recover') {
    const u = Math.min(1, T.t / 0.45);
    if (T.zone) { env.palm.position.y += dt * 60; env.shadow.material.opacity = SL.swatShadow * (1 - u); }
    if (u >= 1) {
      T.phase = 'idle'; T.t = 0; T.next = SL.tossMin + ctx.rng.next() * (SL.tossMax - SL.tossMin); T.zone = null;
      env.palm.visible = false; env.shadow.visible = false; env.sleeper.lie('sleepBreath');
      if (st.mode !== 'ear') snore?.setVol(0.5);
    }
  }
}
function swat() {
  st.swatCount = (st.swatCount || 0) + 1;
  st.mode = 'dead'; st.squish = 0;
  ctx.audio.play('BED_SWAT', { vol: 1 });
  env.spider.animator.play('squish');
  if (ctx.settings.shake) follow.shake(0.5);
  const failed = ctx.scenes.fail('fail.swat', { tip: st.swatCount === 1 ? 'tip.s2.warn' : 'tip.s2.light' });
  if (failed === false) { st.mode = 'play'; env.spider.animator.play('idle'); st.toss.phase = 'recover'; st.toss.t = 0; }
}
function updateWake(dt) {
  const onBed = st.surf !== 'F', careful = st.careful, mul = careful ? WK.carefulMul : 1;
  let rate;
  const moving = st.mode === 'web' || st.mode === 'edge' || st.moving;
  if (!moving) rate = WK.standRate;
  else if (!onBed) rate = 0;
  else {
    rate = WK.moveRate * mul;
    const h = env.headWorld(v3), d = Math.hypot(st.pos.x - h.x, st.pos.z - h.z);
    if (d < WK.nearDist) rate += WK.nearRate * mul;
    if (st.lit) rate *= WK.lightMul;
  }
  st.wake = Math.max(0, Math.min(WK.max, st.wake + rate * dt));
  if (st.wake >= WK.mumble && !st.mumbled) {
    st.mumbled = true; ctx.audio.play('BED_MUMBLE'); ctx.hud.subtitle(t('sub.mumble'), 2.2, t('name.scientist'));
    if (st.toss.phase === 'idle') env.sleeper.lie('toss.head');
  }
  if (st.wake < WK.mumble - 20) st.mumbled = false;
  ctx.hud.meter('wake', 'wake.label', st.wake / WK.max, { x: 12, y: 132, state: st.wake >= WK.mumble ? 'danger' : st.wake >= 40 ? 'warn' : '' });
  if (st.wake >= WK.max) {
    ctx.audio.play('BED_WAKE');
    const failed = ctx.scenes.fail('fail.woke', { tip: 'tip.s2.shift' });
    if (failed === false) st.wake = WK.mumble;
  }
}
function updateCamera(dt) {
  const s = surf(), c = surfCam(s, st.pos.x, st.pos.z), want = v3b.set(c[0], 0, c[1]).normalize();
  const k = 1 - Math.exp(-2.2 * dt);
  st.camF.x += (want.x - st.camF.x) * k; st.camF.y += (want.z - st.camF.y) * k; st.camF.normalize();
  const f = st.camF, p = env.spider.group.position;
  if (st.mode === 'ear' && st.modeT > 1.0) {
    const u = Math.min(1, (st.modeT - 1.0) / 2.2), e = st.ear.to;
    v3.copy(st.ear.camFrom).lerp(v3b.set(e.x + (e.x < BED.head.x ? -6 : 6), e.y + 3, e.z), u * u);
    world.camera.position.copy(v3); world.camera.lookAt(e);
    return;
  }
  const look = v3b.set(p.x + f.x * SP.cam.lookAhead, p.y + 2, p.z + f.y * SP.cam.lookAhead);
  const cam = v3.set(p.x - f.x * SP.cam.dist, p.y + SP.cam.height, p.z - f.y * SP.cam.dist);
  // на подушке и матрасе у изголовья камера не уходит за него (иначе встаёт вплотную к пауку): остаётся перед ним
  // и поднимается на столько же (на полу за кроватью правило не действует)
  if ((st.surf === 'P' || st.surf === 'T') && cam.z < BED.camZMin) { cam.y += BED.camZMin - cam.z; cam.z = BED.camZMin; }
  cameraClip(tmpT.set(p.x, p.y + 3, p.z), cam);
  clearHeight(tmpT, cam);
  follow.update(dt, cam, look);
}
// линия «паук → камера» не проходит сквозь бугры одеяла и подушку
function clearHeight(target, cam) {
  for (let i = 1; i <= 7; i++) {
    const s = i / 8, x = target.x + (cam.x - target.x) * s, z = target.z + (cam.z - target.z) * s, y = target.y + (cam.y - target.y) * s;
    const h = topY(x, z) + 2.5;
    if (y < h) cam.y += (h - y) / s;
  }
}
const tmpT = new THREE.Vector3();

const scene = {
  id: 'S02_Path', kind: '3d', series: 2, checkpoints: ['start', 'bed', 'pillow'],
  objectives: ['obj.s2.bed', 'obj.s2.pillow', 'obj.s2.ear'],
  hints: [['W A S D', 'hint.move'], ['Shift', 'hint.sneak'], ['E', 'hint.web']],
  async enter(c, params) {
    ctx = c; ctx.show3d(true);
    world = createWorld(ctx, { palette: 'bedroom', fov: SP.cam.fov, near: SP.cam.near, far: SP.cam.far, fog: [260, 1000], lights: BEDROOM_LIGHTS });
    env = buildBedroom(world.scene, {});
    follow = createFollow(world.camera, { smooth: SP.cam.smooth });
    follow.shakeEnabled = () => ctx.settings.shake;
    bangEl = el('div', 's2-bang', '!'); ctx.hudRoot.append(bangEl);
    dbg = colliderDebug(world.scene, [...env.surfaces.F.boxes.map((b) => ({ ...b, h: 6 })), ...env.surfaces.T.boxes.map((b) => ({ ...b, y: 55, h: 10 })), ...env.surfaces.P.boxes.map((b) => ({ ...b, y: 58, h: 14 })), ...env.surfaces.P.circles.map((c) => ({ ...c, y: 60, h: 14 }))]);
    dbg.visible = ctx.debugState.colliders;
    offDbg = ctx.events.on('debug:colliders', (on) => { dbg.visible = on; });
    st = null; resetAt(params.checkpoint || 'start');
    if (st.chk === 'start' && !params.retry) startDescent();
    ctx.audio.setReverb('bedroom'); ctx.audio.music('M_BEDROOM'); ctx.audio.ambience('AMB_BEDROOM');
    snore = ctx.audio.loop('BED_SNORE_LOOP', { vol: 0.5 });
    world.prewarm();
  },
  onStart() {
    if (st.chk === 'bed' || st.chk === 'pillow') ctx.objectives.done(0, true);
    if (st.chk === 'pillow') ctx.objectives.done(1, true);
  },
  update(dt) {
    st.time += dt; st.modeT += dt;
    const anim = env.spider.animator;
    if (st.mode === 'descend') {
      const u = Math.min(1, st.modeT / 2.2), e = 1 - (1 - u) * (1 - u);
      st.pos.y = BED.wardrobe.h * (1 - e); env.spider.group.position.copy(st.pos);
      env.spider.group.quaternion.setFromAxisAngle(UP, st.yaw);
      env.setThread([BED.descent[0], BED.wardrobe.h + 3, BED.descent[2]], [st.pos.x, st.pos.y + 1.2, st.pos.z]);
      if (u >= 1) { st.mode = 'play'; env.hideThread(); wind?.stop(0.2); wind = null; anim.play('idle'); ctx.audio.play('SPD_STEP', { vol: 0.4 }); }
    } else if (st.mode === 'play') {
      moveSpider(dt);
      const n = nearWeb(), e = !n && nearEar();
      ctx.hud.prompt(n ? t(n.up ? 'prompt.web' : 'prompt.webDown') : e ? t('prompt.ear') : null);
      if (ctx.input.pressed('use')) { if (n) startWeb(n); else if (e) startEar(e); }
      if (n && !st.glintSaid) { st.glintSaid = true; ctx.audio.play('WEB_GLINT', { vol: 0.5 }); }
      if (!n) st.glintSaid = false;
    } else if (st.mode === 'edge') {
      const E = st.edge, u = Math.min(1, st.modeT / SP.edgeDur);
      const to = env.surfaces[E.to];
      const yTo = to.h(E.fx, E.fz), x = E.from.x + (E.fx - E.from.x) * u, z = E.from.z + (E.fz - E.from.z) * u;
      st.pos.set(x, E.from.y + (yTo - E.from.y) * u + Math.sin(u * Math.PI) * 1.5, z);
      env.spider.group.position.copy(st.pos);
      env.spider.group.quaternion.slerpQuaternions(E.q0, E.q1, u * u * (3 - 2 * u));
      if (u >= 1) { st.surf = E.to; st.mode = 'play'; st.edge = null; placeSpider(0, true); if (E.to === 'P') arrivePillow(); }
    } else if (st.mode === 'web') {
      const W = st.web;
      if (st.modeT >= W.shot) {
        const u = Math.min(1, (st.modeT - W.shot) / SP.webDur), e = u * u * (3 - 2 * u);
        if (!W.climbing) { W.climbing = true; anim.play('crawl'); ctx.audio.play('SPD_WEB_CLIMB'); }
        st.pos.copy(W.a).lerp(W.b, e);
        env.spider.group.position.copy(st.pos);
        const dir = v3.copy(W.b).sub(W.a).normalize();
        qA.setFromUnitVectors(UP, v3b.set(0, 1, 0).lerp(dir, 0.55).normalize()); qY.setFromAxisAngle(UP, st.yaw); qA.multiply(qY);
        env.spider.group.quaternion.slerp(qA, 1 - Math.exp(-10 * dt));
        if (u >= 1) finishWeb();
      }
    } else if (st.mode === 'ear') {
      const E = st.ear, u = Math.min(1, st.modeT / SP.earDur), e = u * u;
      st.pos.copy(E.from).lerp(E.to, e); env.spider.group.position.copy(st.pos);
      if (st.modeT > 0.3 && !E.muf) { E.muf = true; ctx.audio.play('EAR_MUFFLE'); ctx.audio.muffle(true); }
      const hbT = SP.earDur + E.hb * SP.heartbeatGap;
      if (E.hb < SP.heartbeats && st.modeT >= hbT) { E.hb++; ctx.audio.play('HEARTBEAT', { vol: 0.9 }); if (E.hb === SP.heartbeats) ctx.fade.to(1, 0.5); }
      if (u >= 1) env.spider.group.visible = false;
      if (E.hb >= SP.heartbeats && st.modeT >= hbT + 0.2 && !E.done) {
        E.done = true; ctx.objectives.done(2);
        setTimeout(() => { if (ctx.scenes.currentId === 'S02_Path') ctx.scenes.complete(); }, 450);
      }
    }
    if (st.mode !== 'descend' && st.mode !== 'dead') {
      st.lit = st.surf !== 'F' && inMoon(st.pos.x, st.pos.z);
      st.cover = (st.surf === 'B' && inFold(st.pos.z)) || (st.surf === 'P' && inDip(st.pos.x, st.pos.z));
      if (st.lit && !st.wasLit && !st.cover) ctx.audio.play('MOON_SHIMMER', { vol: 0.35 });
      st.wasLit = st.lit;
      if (st.mode !== 'ear') { updateToss(dt); if (st.mode !== 'dead') updateWake(dt); }
    }
    anim.update(dt, st.animSpeed || SP.speed);
    env.update(dt);
    // храп громче у головы
    if (snore && st.toss.phase === 'idle' && st.mode !== 'ear') { const h = env.headWorld(v3), d = h.distanceTo(st.pos); snore.setVol(Math.max(0.12, Math.min(0.75, 1 - d / 260))); }
    updateCamera(dt);
  },
  updateIdle(dt) { // во время оверлея поражения: доигрываем «прихлоп»
    if (!env) return;
    if (st.mode === 'dead') {
      st.squish += dt;
      env.palm.visible = !!st.toss.zone;
      env.spider.animator.update(dt);
    }
    env.update(dt); follow.update(dt, follow.position, follow.target);
  },
  render() { world.render(); },
  respawn(chk) {
    resetAt(chk);
    ctx.objectives.set(scene.objectives, false);
    if (chk === 'bed' || chk === 'pillow') ctx.objectives.done(0, true);
    if (chk === 'pillow') ctx.objectives.done(1, true);
    ctx.hud.removeMeter('wake');
  },
  pause() {}, resume() {},
  debugWin() { if (st.mode === 'play' || st.mode === 'dead') { st.surf = 'P'; st.pos.set(14, 0, -87); placeSpider(0, true); const e = nearEar() || env.earWorld(new THREE.Vector3()); startEar(e); } },
  debugInfo() {
    if (!st) return '';
    const s = surf(), [u, v] = s.toUV(st.pos.x, st.pos.z);
    return `S02: ${st.surf} (u ${u.toFixed(0)}, v ${v.toFixed(0)}) · ${st.mode} · пробужд. ${st.wake.toFixed(0)} % · ${st.lit ? 'свет' : 'тень'}${st.cover ? ' · укрытие' : ''} · ворочание ${st.toss.phase} ${st.toss.t.toFixed(1)}/${st.toss.phase === 'idle' ? st.toss.next.toFixed(1) : ''}`;
  },
  exit() {
    offDbg?.(); offDbg = null;
    bangEl?.remove(); bangEl = null;
    wind?.stop(0.1); wind = null; snore = null;
    ctx.hud.removeMeter('wake'); ctx.hud.prompt(null);
    world.dispose(); world = null; env = null; follow = null;
  },
  get _state() { return st; },
  get _camera() { return world ? world.camera : null; },
};
export default scene;
