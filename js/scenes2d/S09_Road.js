// S09 «Дорога» (2D, человек, ~1,5 мин). Разметка 960×540 — CFG.road.zones. Полосы 1–2 (→) — свободный поток по шаблонам
// интервалов; полосы 3–5 (←) — светофор x 420–540: красный 6,0 → зелёный 4,5 → мигающий 1,0 (для пешехода). На зелёный
// машины перед стоп-линией (x 560) тормозят с 600 px/с², на красный трогаются с 400 px/с². Машины за краем экрана
// подсвечиваются маркером — угроза видна ≥ 1,5 с до перехода. Таймер 90 с, столкновение −15 с.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { mulberry32 } from '../core/rng.js';
import { getRoadSprites, drawCarLight, drawWalkLight } from '../gfx2d/road.js';
import { CAR_COLORS } from '../gfx2d/road.js';
import { blit, shadowBlob, text } from '../gfx2d/style.js';
import { createParticles, stunStars } from '../gfx2d/fx.js';
const R = CFG.road, L = R.light, W = CFG.stage.w;
const mid = (r) => (r[0] + r[1]) / 2;

// ---------- модель движения (без рендера — её же гоняет test.road) ----------
export function createTraffic({ seed = 909 } = {}) {
  const rnd = mulberry32(seed);
  const tr = { t: 0, phase: 'red', phaseT: 0, cars: [], nextId: 1, events: [], lanes: [] };
  R.lanes.forEach((ln, i) => tr.lanes.push({ ...ln, cy: mid(ln.y), pi: i, ci: i * 2, timer: 0.3 + i * 0.45 }));
  const front = (c) => c.x + c.dir * c.len / 2, rear = (c) => c.x - c.dir * c.len / 2;
  tr.front = front; tr.rear = rear;
  function spawn(lane) {
    const type = R.carCycle[lane.ci % R.carCycle.length];
    const [len, wid] = R.cars[type];
    const x = lane.dir > 0 ? -len / 2 - 40 : W + len / 2 + 40;
    // не создаём машину поверх хвоста очереди
    for (const c of tr.cars) if (c.lane === lane.id) { const g = lane.dir > 0 ? (rear(c) - (x + len / 2)) : ((x - len / 2) - rear(c)); if (g < R.gapMin + 8) return false; }
    lane.ci++;
    const colors = CAR_COLORS[type];
    tr.cars.push({ id: tr.nextId++, lane: lane.id, light: lane.light, type, len, wid, x, y: lane.cy, dir: lane.dir, v: lane.speed, v0: lane.speed,
      hold: 0, committed: false, color: Math.floor(rnd() * colors.length), honked: false, passed: false, stopped: false });
    tr.events.push({ type: 'spawn', lane: lane.id });
    return true;
  }
  tr.setPhase = (p) => { tr.phase = p; tr.phaseT = 0; tr.events.push({ type: p }); if (p === 'red') for (const c of tr.cars) c.committed = false; };
  tr.update = (dt) => {
    tr.t += dt; tr.phaseT += dt;
    if (tr.phase === 'red' && tr.phaseT >= L.red) tr.setPhase('green');
    else if (tr.phase === 'green' && tr.phaseT >= L.green) tr.setPhase('blink');
    else if (tr.phase === 'blink' && tr.phaseT >= L.blink) tr.setPhase('red');
    const stopping = tr.phase !== 'red';
    for (const lane of tr.lanes) {
      lane.timer -= dt;
      if (lane.timer <= 0) { if (spawn(lane)) { lane.timer += lane.pattern[lane.pi % lane.pattern.length]; lane.pi++; } else lane.timer = 0.2; }
      const list = tr.cars.filter((c) => c.lane === lane.id).sort((a, b) => b.x * b.dir - a.x * a.dir); // первая — самая «впереди»
      for (let i = 0; i < list.length; i++) {
        const c = list[i], lead = list[i - 1];
        if (c.hold > 0) { c.hold -= dt; c.v = 0; continue; }
        let vmax = c.v0;
        if (lead) { const gap = (rear(lead) - front(c)) * c.dir; vmax = Math.min(vmax, Math.sqrt(Math.max(0, 2 * L.brake * Math.max(0, gap - R.gapMin) + lead.v * lead.v))); }
        if (c.light && stopping && !c.committed) {
          const gapStop = (L.stopX - front(c)) * c.dir; // >0 — ещё до стоп-линии
          if (gapStop >= -1) {
            if (c.v * c.v / (2 * L.brake) > gapStop + 2 && tr.phaseT < 0.05 + dt) c.committed = true; // уже не успеет остановиться — проезжает
            else vmax = Math.min(vmax, Math.sqrt(Math.max(0, 2 * L.brake * Math.max(0, gapStop - 2))));
          }
        }
        if (c.v < vmax) c.v = Math.min(vmax, c.v + L.accel * dt);
        else c.v = Math.max(vmax, c.v - L.brake * dt * 1.5);
        c.x += c.dir * c.v * dt;
        if (lead) { const gap = (rear(lead) - front(c)) * c.dir; if (gap < 4) { c.x -= c.dir * (4 - gap); c.v = Math.min(c.v, lead.v); } }
        c.stopped = c.v < 5;
      }
    }
    tr.cars = tr.cars.filter((c) => (c.dir > 0 ? rear(c) < W + 80 : rear(c) > -80));
  };
  // занята ли полоса в колонке [x0, x1] сейчас / в течение horizon секунд (прогноз при текущих скоростях)
  tr.laneBusy = (laneId, x0, x1, horizon = 0) => {
    for (const c of tr.cars) {
      if (c.lane !== laneId) continue;
      const a = Math.min(c.x - c.len / 2, c.x + c.len / 2), b = a + c.len;
      if (b > x0 && a < x1) return true;
      if (horizon > 0 && c.v > 1) {
        const dist = c.dir > 0 ? x0 - b : a - x1; // расстояние до колонки
        if (dist >= 0 && dist < c.v * horizon) return true;
      }
    }
    return false;
  };
  tr.timeToColumn = (c, x0, x1) => { const a = c.x - c.len / 2, b = c.x + c.len / 2; const dist = c.dir > 0 ? x0 - b : a - x1; return c.v > 1 ? dist / c.v : Infinity; };
  return tr;
}
// Статистика окон для test.road: для каждой полосы — максимальное ожидание окна ≥ window секунд.
export function roadWindowStats({ duration = R.test.duration, dt = 1 / 60, seed = 909 } = {}) {
  const tr = createTraffic({ seed });
  const [x0, x1] = R.test.probeX;
  const lanes = R.lanes.map((l) => ({ id: l.id, free: [], cur: null }));
  for (let i = 0; i < 8 / dt; i++) tr.update(dt); // прогрев
  tr.setPhase('red');
  let collided = 0;
  const steps = Math.round(duration / dt);
  for (let s = 0; s < steps; s++) {
    tr.update(dt);
    const time = s * dt;
    for (const ln of lanes) {
      const busy = tr.laneBusy(ln.id, x0, x1);
      if (!busy && !ln.cur) ln.cur = { s: time };
      if (busy && ln.cur) { ln.cur.e = time; ln.free.push(ln.cur); ln.cur = null; }
    }
    // машины не должны въезжать друг в друга
    for (const a of tr.cars) for (const b of tr.cars) if (a.id < b.id && a.lane === b.lane && Math.abs(a.x - b.x) < (a.len + b.len) / 2 - 1) collided++;
  }
  return lanes.map((ln) => {
    if (ln.cur) { ln.cur.e = duration; ln.free.push(ln.cur); }
    const wins = ln.free.filter((w) => w.e - w.s >= R.test.window);
    let maxWait = wins.length ? wins[0].s : duration, prevEnd = null;
    for (const w of wins) { if (prevEnd != null) maxWait = Math.max(maxWait, w.s - (prevEnd - R.test.window)); prevEnd = w.e; }
    if (prevEnd != null) maxWait = Math.max(maxWait, duration - (prevEnd - R.test.window) > R.test.every * 2 ? duration - prevEnd : 0);
    return { lane: ln.id, windows: wins.length, maxWait: +maxWait.toFixed(2), ok: wins.length > 0 && maxWait <= R.test.every, collided };
  });
}

// ---------- сцена ----------
let ctx = null, S = null, tr = null, hum = null, parts = null, st = null;
const engines = new Map();
const SAFE = { bottom: 500, island: mid(R.zones.island), top: mid(R.zones.sidewalkTop) - 4 };
function zoneOf(y) {
  const Z = R.zones;
  if (y >= Z.lane1[1]) return 'bottom';
  if (y >= Z.island[0] && y <= Z.island[1]) return 'island';
  if (y <= Z.sidewalkTop[1]) return 'top';
  return null;
}
function fmt(sec) { const s = Math.max(0, Math.ceil(sec)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function reset() {
  tr = createTraffic({ seed: 909 + (st?.attempt || 0) });
  // прогрев: целый цикл светофора + 2 с красного — к старту поток уже идёт, очередей у стоп-линии нет
  const warm = L.red + L.green + L.blink + 2;
  for (let i = 0; i < warm * 30; i++) tr.update(1 / 30);
  tr.events.length = 0;
  hum = { x: R.human.start[0], y: R.human.start[1], vx: 0, vy: 0, dir: 1, walkT: 0, stepT: 0, stun: 0, inv: 0, safe: 'bottom', anim: null, alpha: 1 };
  st = { state: 'play', timer: R.timer, shown: '', beeps: new Set(), urgent: false, hits: 0, shake: 0, walkBeep: 0, doorT: 0, time: 0, attempt: (st?.attempt || 0) + 1, bumpCd: 0, greenSeen: false };
  for (const h of engines.values()) h.stop(0.1); engines.clear();
  parts = createParticles(90, { lessFx: () => ctx.settings.lessFx });
  ctx.audio.musicLayer('urgent', false);
  ctx.hud.timer(null); ctx.hud.timer(t('road.timer', { t: fmt(st.timer) }), false, 'br');
  ctx.cockpit.setBalance(0); ctx.cockpit.setPose('idle');
}
function hitBy(car) {
  st.hits++;
  ctx.audio.play(car.type === 'BUS' ? 'ROAD_HONK_BUS' : 'ROAD_HONK', { pan: ctx.audio.stepPan(car.x) });
  ctx.audio.play('ROAD_SCREECH', { pan: ctx.audio.stepPan(car.x) });
  ctx.audio.play('ROAD_CRASH_SOFT', { delay: 0.06 }); ctx.audio.play('HUM_OOF', { delay: 0.1 });
  st.timer = Math.max(0, st.timer - R.hitPenalty);
  ctx.hud.toast(t('road.hit'));
  car.hold = R.carDelay; car.v = 0;
  // ближайшая к человеку машина на соседних полосах тоже ждёт 1 с
  let near = null, nd = 1e9; for (const c of tr.cars) { if (c === car) continue; const d = Math.hypot(c.x - hum.x, c.y - hum.y); if (d < nd) { nd = d; near = c; } }
  if (near && nd < 180) { near.hold = Math.max(near.hold, R.carDelay); near.v = 0; }
  const ky = Math.sign(hum.y - car.y) || 1;
  const from = { x: hum.x, y: hum.y }, bounce = { x: hum.x + car.dir * R.bounce, y: hum.y + ky * R.bounce * 0.5 };
  const to = { x: Math.max(30, Math.min(W - 30, bounce.x)), y: SAFE[hum.safe] };
  hum.anim = { t: 0, from, bounce, to }; hum.stun = R.stun; hum.inv = R.invuln; hum.vx = hum.vy = 0;
  ctx.cockpit.flash('bump', 0.35); ctx.cockpit.setPose('panic');
  if (ctx.settings.shake) st.shake = 0.35;
  parts.emit('star', hum.x, hum.y - 50, 5); parts.emit('puff', hum.x, hum.y - 10, 6);
  ctx.events.emit('road:hit', { car: car.type });
}
function ellRect(cx, cy, rx, ry, x0, y0, x1, y1) { const px = Math.max(x0, Math.min(x1, cx)), py = Math.max(y0, Math.min(y1, cy)); const dx = (px - cx) / rx, dy = (py - cy) / ry; return dx * dx + dy * dy <= 1; }
function updateHuman(dt) {
  const inp = ctx.input, H = R.human;
  if (hum.anim) {
    const a = hum.anim; a.t += dt;
    const u1 = Math.min(1, a.t / 0.22), u2 = Math.max(0, Math.min(1, (a.t - 0.22) / (R.stun - 0.22)));
    const e1 = 1 - (1 - u1) * (1 - u1), e2 = u2 * u2 * (3 - 2 * u2);
    hum.x = a.from.x + (a.bounce.x - a.from.x) * e1 + (a.to.x - a.bounce.x) * e2;
    hum.y = a.from.y + (a.bounce.y - a.from.y) * e1 + (a.to.y - a.bounce.y) * e2;
    if (a.t >= R.stun) { hum.anim = null; ctx.cockpit.setPose('idle'); ctx.input.consumeAll(); }
    hum.stun = Math.max(0, hum.stun - dt); hum.inv = Math.max(0, hum.inv - dt);
    return;
  }
  hum.inv = Math.max(0, hum.inv - dt);
  const ax = inp.axis(), careful = inp.down('shift');
  const vmax = careful ? H.careful : H.speed, acc = H.speed / H.accel;
  const tx = ax.x * vmax, ty = ax.y * vmax;
  const app = (v, target, d) => (v < target ? Math.min(target, v + d) : Math.max(target, v - d));
  hum.vx = app(hum.vx, tx, acc * dt); hum.vy = app(hum.vy, ty, acc * dt);
  hum.x += hum.vx * dt; hum.y += hum.vy * dt;
  const atDoor = hum.x > R.door[0] + 6 && hum.x < R.door[1] - 6;
  hum.x = Math.max(16, Math.min(W - 16, hum.x));
  hum.y = Math.min(532, Math.max(atDoor ? R.zones.facade[1] - 2 : R.zones.sidewalkTop[0] + 6, hum.y));
  const sp = Math.hypot(hum.vx, hum.vy);
  if (sp > 8) {
    hum.dir = Math.abs(hum.vx) > Math.abs(hum.vy) ? (hum.vx < 0 ? 2 : 3) : (hum.vy < 0 ? 1 : 0);
    hum.walkT += dt * sp / 34;
    hum.stepT -= dt; if (hum.stepT <= 0) { hum.stepT = careful ? 0.48 : 0.32; ctx.audio.play(careful ? 'HUM_STEP_CAREFUL' : 'HUM_STEP', { pan: ctx.audio.stepPan(hum.x), vol: 0.7 }); }
    ctx.cockpit.setPose(careful ? 'careful' : 'walk');
  } else { hum.walkT = 0; ctx.cockpit.setPose('idle'); }
  const z = zoneOf(hum.y); if (z) hum.safe = z;
  if (atDoor && hum.y <= R.zones.facade[1] + 2) enterDoor();
}
function enterDoor() {
  if (st.state !== 'play') return;
  st.state = 'door'; st.doorT = 0;
  ctx.hud.timer(t('road.timer', { t: fmt(st.timer) }), false);
  ctx.objectives.done(0);
  ctx.audio.play('ROAD_DOOR'); ctx.audio.musicLayer('urgent', false);
  ctx.cockpit.flash('cheer', 1.2);
  ctx.events.emit('road:door', { timeLeft: st.timer });
}
function updateEngines() {
  const vis = tr.cars.filter((c) => c.x + c.len / 2 > -40 && c.x - c.len / 2 < W + 40)
    .map((c) => ({ c, d: Math.hypot(c.x - hum.x, (c.y - hum.y) * 1.5) })).sort((a, b) => a.d - b.d).slice(0, 6);
  const keep = new Set(vis.map((v) => v.c.id));
  for (const [id, h] of engines) if (!keep.has(id)) { h.stop(0.25); engines.delete(id); }
  for (const { c, d } of vis) {
    let h = engines.get(c.id);
    if (!h) { h = ctx.audio.loop(c.type === 'BUS' ? 'ROAD_BUS_ENGINE' : 'ROAD_ENGINE', { vol: 0, pan: ctx.audio.stepPan(c.x) }); engines.set(c.id, h); }
    h.setPan(ctx.audio.stepPan(c.x)); h.setVol(0.06 + 0.5 * Math.max(0, 1 - d / 520)); h.setRate(0.55 + 0.45 * c.v / c.v0);
  }
}
function trafficEvents() {
  for (const e of tr.events) {
    if (e.type === 'green') { ctx.audio.play('ROAD_LIGHT_GREEN'); if (!st.greenSeen) { st.greenSeen = true; ctx.hud.toast(t('road.green'), 1.4); } }
    else if (e.type === 'blink') ctx.audio.play('ROAD_LIGHT_BLINK');
    else if (e.type === 'red') ctx.audio.play('ROAD_LIGHT_RED');
  }
  tr.events.length = 0;
}
function updateTimer(dt) {
  if (st.state !== 'play') return;
  st.timer -= dt;
  const red = st.timer < R.warnAt;
  const s = fmt(st.timer);
  if (s !== st.shown) { st.shown = s; ctx.hud.timer(t('road.timer', { t: s }), red); }
  for (const b of R.beepAt) if (st.timer <= b && !st.beeps.has(b)) { st.beeps.add(b); ctx.audio.play(b === 20 ? 'ROAD_TIMER_20' : b === 10 ? 'ROAD_TIMER_10' : 'ROAD_TIMER_TICK'); }
  if (red && !st.urgent) { st.urgent = true; ctx.audio.musicLayer('urgent', true); }
  if (st.timer <= 0) { st.state = 'late'; ctx.hud.timer(t('road.timer', { t: '0:00' }), true); ctx.cockpit.setPose('panic'); ctx.scenes.fail('fail.late', { tip: 'tip.s9' }); }
}
const scene = {
  id: 'S09_Road', kind: '2d', series: 9, objectives: ['obj.s9.cross'], checkpoints: ['start'], cockpit: true,
  hints: [['W A S D', 'hint.move'], ['Shift', 'hint.careful']],
  async enter(c) {
    ctx = c; ctx.show3d(false); st = null;
    S = getRoadSprites();
    reset();
    ctx.audio.setReverb('street'); ctx.audio.music('M_ROAD'); ctx.audio.ambience('AMB_STREET');
  },
  update(dt) {
    st.time += dt;
    tr.update(dt); trafficEvents();
    if (st.state === 'play') {
      updateHuman(dt);
      // столкновения
      if (hum.inv <= 0 && !hum.anim) for (const c of tr.cars) {
        const x0 = c.x - c.len / 2, x1 = c.x + c.len / 2, y0 = c.y - c.wid / 2, y1 = c.y + c.wid / 2;
        if (!ellRect(hum.x, hum.y, R.human.rx, R.human.ry, x0, y0, x1, y1)) continue;
        if (c.v < 30) { // стоящая машина — просто упираемся
          hum.y = hum.y < c.y ? y0 - R.human.ry - 0.5 : y1 + R.human.ry + 0.5; hum.vy = 0;
          if (st.bumpCd <= 0) { st.bumpCd = 0.6; ctx.audio.play('HUM_BUMP', { vol: 0.6 }); ctx.cockpit.flash('bump'); }
          continue;
        }
        hitBy(c); break;
      }
      // предупредительный гудок: человек на полосе прямо перед машиной
      for (const c of tr.cars) {
        if (c.honked || c.v < 60 || Math.abs(hum.y - c.y) > c.wid / 2 + 4) continue;
        const ttc = (c.dir > 0 ? hum.x - (c.x + c.len / 2) : (c.x - c.len / 2) - hum.x) / c.v;
        if (ttc > 0 && ttc < 0.7) { c.honked = true; ctx.audio.play(c.type === 'BUS' ? 'ROAD_HONK_BUS' : 'ROAD_HONK', { pan: ctx.audio.stepPan(c.x), vol: 0.7 }); }
      }
      // проезд мимо
      for (const c of tr.cars) if (!c.passed && c.v > 150 && Math.abs(c.y - hum.y) < 90 && Math.abs(c.x - hum.x) < 30) { c.passed = true; ctx.audio.play('ROAD_PASSBY', { pan: ctx.audio.stepPan(c.x), vol: 0.6 }); }
      // пищалка «можно идти» у перехода
      if (tr.phase !== 'red' && Math.abs(hum.x - 480) < 260 && hum.y > 120 && hum.y < 380) {
        st.walkBeep -= dt; if (st.walkBeep <= 0) { st.walkBeep = tr.phase === 'blink' ? 0.25 : 0.5; ctx.audio.play('ROAD_BEEP_WALK', { vol: 0.5 }); }
      }
      updateTimer(dt);
    } else if (st.state === 'door') {
      st.doorT += dt;
      hum.y = Math.max(R.zones.facade[1] - 12, hum.y - 30 * dt); hum.dir = 1; hum.walkT += dt * 2;
      hum.alpha = Math.max(0, 1 - st.doorT / 0.8);
      if (st.doorT >= 0.9 && !st.completed) { st.completed = true; ctx.scenes.complete(); }
    }
    st.bumpCd = Math.max(0, st.bumpCd - dt);
    st.shake = Math.max(0, st.shake - dt);
    parts.update(dt);
    updateEngines();
  },
  render() {
    const g = ctx.g2d();
    g.save();
    if (st.shake > 0) g.translate((Math.random() - 0.5) * 10 * st.shake, (Math.random() - 0.5) * 10 * st.shake);
    blit(g, S.bg, 0, 0, { ax: 0, ay: 0 });
    // подсветка двери-цели
    const pulse = 0.5 + 0.5 * Math.sin(st.time * 4);
    g.fillStyle = `rgba(127,209,139,${0.12 + 0.18 * pulse})`; g.fillRect(R.door[0], 54, R.door[1] - R.door[0], 66);
    blit(g, S.doorLeaf, R.door[0], 55, { ax: 0, ay: 0 }); blit(g, S.doorLeaf, R.door[1] - 30, 55, { ax: 0, ay: 0 });
    if (hum.y < 260 && st.state === 'play') text(g, '▲', 480, 138 + Math.sin(st.time * 5) * 3, { size: 16, color: '#7fd18b', sw: 3 });
    // объекты по глубине (y)
    const blinkOn = Math.floor(tr.phaseT * L.blinkHz * 2) % 2 === 0;
    const items = tr.cars.map((c) => ({ y: c.y + c.wid / 2, c }));
    items.push({ y: hum.y, h: true });
    items.push({ y: 352, f: () => drawCarLight(g, 584, 352, tr.phase, blinkOn) });
    items.push({ y: 351, f: () => drawWalkLight(g, 408, 351, tr.phase, blinkOn) });
    items.push({ y: 167, f: () => drawWalkLight(g, 408, 167, tr.phase, blinkOn) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.c) {
        const c = it.c, spr = S.cars[c.type][c.color];
        g.fillStyle = 'rgba(20,8,16,.28)'; g.fillRect(c.x - c.len / 2 + 2, c.y - c.wid / 2 + 6, c.len, c.wid);
        blit(g, spr, c.x, c.y, { sx: c.dir });
        if (c.hold > 0 || (c.stopped && c.light)) { g.fillStyle = 'rgba(255,60,80,.55)'; const bx = c.x - c.dir * (c.len / 2 + 1); g.fillRect(bx - 3, c.y - c.wid / 2 + 3, 6, 6); g.fillRect(bx - 3, c.y + c.wid / 2 - 9, 6, 6); }
      } else if (it.h) {
        if (hum.alpha <= 0) continue;
        shadowBlob(g, hum.x, hum.y + 1, 13, 5, 0.35 * hum.alpha);
        const frame = hum.walkT > 0 ? Math.floor(hum.walkT) % 4 : 1;
        const vis = hum.inv > 0 && Math.floor(hum.inv * 10) % 2 === 0 ? 0.45 : 1;
        blit(g, S.human[hum.dir][frame], hum.x, hum.y, { ay: 56 / 60, alpha: vis * hum.alpha });
        if (hum.stun > 0) stunStars(g, hum.x, hum.y - 62, st.time, 3);
      } else it.f();
    }
    // маркеры машин за краем экрана (угроза видна заранее)
    for (const c of tr.cars) {
      const off = c.dir > 0 ? c.x + c.len / 2 < 0 : c.x - c.len / 2 > W;
      if (!off) continue;
      const tEnter = (c.dir > 0 ? -(c.x + c.len / 2) : (c.x - c.len / 2) - W) / Math.max(1, c.v);
      const tProbe = tr.timeToColumn(c, R.test.probeX[0], R.test.probeX[1]);
      if (tEnter > R.edgeWarn && tProbe > R.preview) continue;
      const ex = c.dir > 0 ? 10 : W - 10, a = 0.45 + 0.4 * Math.sin(st.time * 12);
      const grd = g.createRadialGradient(ex, c.y, 2, ex, c.y, 26); grd.addColorStop(0, `rgba(255,240,180,${a})`); grd.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = grd; g.fillRect(ex - 26, c.y - 26, 52, 52);
      text(g, c.dir > 0 ? '▶' : '◀', c.dir > 0 ? 22 : W - 22, c.y, { size: 14, color: '#ffe9a0', sw: 3 });
    }
    parts.draw(g);
    if (ctx.debugState.colliders) drawDebug(g);
    g.restore();
  },
  respawn() { reset(); ctx.objectives.set(scene.objectives); },
  pause() {}, resume() {},
  debugWin() { if (st.state === 'play') { hum.x = 480; hum.y = R.zones.facade[1]; enterDoor(); } },
  debugInfo() { return tr ? `Дорога: ${tr.phase} ${tr.phaseT.toFixed(1)} с · машин ${tr.cars.length} · таймер ${st.timer.toFixed(1)} · столкн. ${st.hits} · зона ${hum.safe}` : ''; },
  exit() {
    for (const h of engines.values()) h.stop(0.1); engines.clear();
    ctx.hud.timer(null); ctx.clear2d(); tr = null; parts = null;
  },
  // для самопроверок
  get _state() { return { st, hum, tr }; },
};
function drawDebug(g) {
  g.save();
  const [px0, px1] = R.test.probeX;
  g.strokeStyle = 'rgba(255,255,0,.7)'; g.setLineDash([6, 6]); g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(px0, 120); g.lineTo(px0, 470); g.moveTo(px1, 120); g.lineTo(px1, 470); g.stroke(); g.setLineDash([]);
  for (const c of tr.cars) { g.strokeStyle = c.committed ? '#ffb000' : c.stopped ? '#7fd1ff' : '#ff5a6e'; g.strokeRect(c.x - c.len / 2, c.y - c.wid / 2, c.len, c.wid); }
  g.strokeStyle = hum.inv > 0 ? '#7fd1ff' : '#7fd18b'; g.lineWidth = 2; g.beginPath(); g.ellipse(hum.x, hum.y, R.human.rx, R.human.ry, 0, 0, 7); g.stroke();
  for (const ln of tr.lanes) {
    const busyNow = tr.laneBusy(ln.id, px0, px1), busySoon = tr.laneBusy(ln.id, px0, px1, R.test.window);
    g.fillStyle = busyNow ? 'rgba(255,90,110,.85)' : busySoon ? 'rgba(255,200,90,.85)' : 'rgba(127,209,139,.9)';
    g.fillRect(px1 + 6, ln.cy - 6, 12, 12);
    text(g, 'П' + ln.id, px1 + 34, ln.cy, { size: 11, sw: 3 });
  }
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(L.stopX, 170); g.lineTo(L.stopX, 320); g.stroke();
  text(g, `${tr.phase} ${tr.phaseT.toFixed(1)}`, 620, 330, { size: 12, sw: 3 });
  g.restore();
}
export default scene;
