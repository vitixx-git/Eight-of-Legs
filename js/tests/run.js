// Встроенные самопроверки (§12): ?debug=1&test=all. Без Node — всё в браузере.
// Параметры: &only=input,save,... — выбрать группы; &n=10 — циклов enter/exit в test.leaks.
// Итог: панель на экране, строки «[TEST] …» в консоли, window.__tests = { done, pass, results }.
import { CFG, GRAPH } from '../config.js';
import { SCENE_PATHS, CHECKPOINTS } from '../core/scenes.js';
import { createInput, KEYMAP } from '../core/input.js';
import { createSave, freshSave, FLAG_KEYS } from '../core/save.js';
import { createBalance } from '../core/balance.js';
import { makeSurfaces, edgeStep, resolveOn, surfCam, BED } from '../env/bedroom.js';
import { listenerStats } from '../core/events.js';
import { roadWindowStats } from '../scenes2d/S09_Road.js';
import { createBattle } from '../scenes2d/battleCore.js';
import { createReflexAI } from '../scenes2d/S04_Reflex.js';
import { createFearAI, fearRingGaps, fearRingArcs, isFearRingGap } from '../scenes2d/S05_Fear.js';
import { createWillAI } from '../scenes2d/S06_Will.js';
import { SFX_IDS, LOOP_IDS, MUSIC_IDS, STINGER_IDS, AMB_IDS, ALL_IDS } from '../audio/ids.js';
import { RECIPES, LOOPS } from '../audio/sfx.js';
import { TRACKS, STINGERS } from '../audio/music.js';
import { AMB } from '../audio/ambience.js';
import { SOURCES } from './sources.js';
import { createWash } from '../scenes3d/washGame.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const SCENES = Object.keys(SCENE_PATHS).filter((id) => id !== 'TEST_BLANK');

// ---------- мини-фреймворк ----------
function group(name) {
  const g = { name, checks: [], ok: true, ms: 0, note: '' };
  g.check = (cond, label, detail = '') => { g.checks.push({ ok: !!cond, label, detail: String(detail) }); if (!cond) g.ok = false; return !!cond; };
  g.eq = (a, b, label) => g.check(a === b, label, `${a} ${a === b ? '=' : '≠'} ${b}`);
  g.near = (a, b, tol, label) => g.check(Math.abs(a - b) <= tol, label, `${a.toFixed(3)} ≈ ${b} ± ${tol}`);
  return g;
}

// ---------- test.input ----------
function testInput() {
  const g = group('test.input');
  const ev = (code, extra = {}) => ({ code, key: extra.key ?? '', repeat: !!extra.repeat, target: extra.target ?? null, preventDefault() { this.prevented = true; } });
  // коды → действия, в т.ч. русская раскладка (e.key = «ц», «ф», «у»…, e.code тот же)
  const table = [['KeyW', 'ц', 'up'], ['KeyA', 'ф', 'left'], ['KeyS', 'ы', 'down'], ['KeyD', 'в', 'right'], ['KeyE', 'у', 'use'],
    ['ArrowUp', '', 'up'], ['ArrowLeft', '', 'left'], ['ArrowDown', '', 'down'], ['ArrowRight', '', 'right'],
    ['Space', ' ', 'action'], ['ShiftLeft', '', 'shift'], ['ShiftRight', '', 'shift'], ['Enter', '', 'confirm'], ['NumpadEnter', '', 'confirm'], ['Escape', '', 'pause']];
  for (const [code, key, action] of table) {
    const inp = createInput(null);
    inp.handleKey(ev(code, { key }), true); inp.beginStep();
    const okDown = inp.pressed(action) && inp.down(action);
    inp.endStep(); inp.handleKey(ev(code, { key }), false); inp.beginStep();
    g.check(okDown && inp.released(action) && !inp.down(action), `${code}${key ? ' («' + key + '»)' : ''} → ${action}`);
  }
  g.check(Object.values(KEYMAP).every((a) => typeof a === 'string'), 'KEYMAP: все коды сопоставлены действиям');
  { // автоповтор не даёт повторного нажатия
    const inp = createInput(null);
    inp.handleKey(ev('KeyE'), true); inp.beginStep(); inp.endStep();
    inp.handleKey(ev('KeyE', { repeat: true }), true); inp.beginStep();
    g.check(!inp.pressed('use') && inp.down('use'), 'автоповтор (repeat) игнорируется');
  }
  { // нажатие и отпускание между шагами не теряется
    const inp = createInput(null);
    inp.handleKey(ev('KeyE'), true); inp.handleKey(ev('KeyE'), false); inp.beginStep();
    g.check(inp.pressed('use') && !inp.down('use'), 'короткое нажатие между шагами доходит до шага');
  }
  { // поглощение: consume и consumeAll («грязные» клавиши до отпускания)
    const inp = createInput(null);
    inp.handleKey(ev('KeyE'), true); inp.beginStep();
    g.check(inp.consume('use') && !inp.pressed('use'), 'consume() поглощает нажатие');
    inp.endStep();
    inp.handleKey(ev('KeyW'), true); inp.beginStep();
    g.check(inp.down('up'), 'удержание W до поглощения');
    inp.consumeAll(); inp.endStep(); inp.beginStep();
    g.check(!inp.down('up') && !inp.pressed('up'), 'consumeAll(): удерживаемая W считается отпущенной');
    inp.endStep(); inp.handleKey(ev('KeyW'), false); inp.beginStep();
    g.check(!inp.released('up'), 'отпускание «грязной» клавиши не порождает released');
    inp.endStep(); inp.handleKey(ev('KeyW'), true); inp.beginStep();
    g.check(inp.pressed('up') && inp.down('up'), 'после повторного нажатия клавиша снова работает');
  }
  { // preventDefault только для игровых клавиш и не в полях ввода
    const inp = createInput(null);
    const a = ev('Space'), b = ev('KeyQ'), c = ev('Space', { target: { tagName: 'INPUT' } });
    inp.handleKey(a, true); inp.handleKey(b, true); inp.handleKey(c, true);
    g.check(a.prevented && !b.prevented && !c.prevented, 'preventDefault: Space/стрелки — да, прочие и поля ввода — нет');
  }
  { // blur сбрасывает удержание; dispose снимает слушателей
    const target = new EventTarget();
    const inp = createInput(target);
    target.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyD' }));
    inp.beginStep();
    const was = inp.down('right');
    target.dispatchEvent(new Event('blur')); inp.endStep(); inp.beginStep();
    g.check(was && !inp.down('right') && inp._held.size === 0, 'blur окна сбрасывает удерживаемые клавиши');
    inp.dispose();
    target.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyA' }));
    inp.beginStep();
    g.check(!inp.down('left'), 'dispose() снимает слушателей');
  }
  return g;
}

// ---------- test.save ----------
function memStorage() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
function testSave() {
  const g = group('test.save');
  const cpOf = (id) => CHECKPOINTS[id];
  const KEY = 'vl_test_save';
  { // запись → чтение
    const st = memStorage(), s1 = createSave({ key: KEY, checkpointsOf: cpOf, storage: st });
    s1.newGame(); s1.setPoint('S07_Morning', 'sink'); s1.setFlag('dressed'); s1.setItem('keys'); s1.addRetry(); s1.addPlayMs(1234); s1.write();
    const s2 = createSave({ key: KEY, checkpointsOf: cpOf, storage: st }), d = s2.load();
    g.check(d && d.scene === 'S07_Morning' && d.checkpoint === 'sink' && d.flags.dressed && d.items.keys && d.stats.retries === 1 && d.stats.playMs === 1234, 'запись/чтение: сцена, точка, флаги, предметы, статистика');
    g.check(FLAG_KEYS.every((k) => typeof d.flags[k] === 'boolean'), 'все флаги — boolean');
    g.eq(JSON.stringify(s2.continuePoint()), JSON.stringify({ scene: 'S07_Morning', checkpoint: 'sink' }), 'continuePoint = сохранённая точка');
  }
  const loadRaw = (raw) => { const st = memStorage(); st.setItem(KEY, raw); const s = createSave({ key: KEY, checkpointsOf: cpOf, storage: st }); let d, thrown = null; try { d = s.load(); } catch (e) { thrown = e; } return { s, d, thrown }; };
  { const r = loadRaw('{"v":1,"scene":'); g.check(!r.thrown && r.d === null && r.s.corrupt && r.s.lastError === 'json', 'повреждённый JSON → null, без исключения', r.s.lastError); }
  { const r = loadRaw('null'); g.check(!r.thrown && r.d === null && r.s.corrupt, 'JSON null → отклонён'); }
  { const d = freshSave(); d.v = 2; const r = loadRaw(JSON.stringify(d)); g.check(r.d === null && r.s.lastError === 'version', 'v ≠ 1 → отклонено', r.s.lastError); }
  { const d = freshSave(); d.scene = 'S99_Nope'; const r = loadRaw(JSON.stringify(d)); g.check(r.d === null && r.s.lastError === 'scene', 'неизвестная сцена → отклонено', r.s.lastError); }
  { const d = freshSave(); d.scene = 'S02_Path'; d.checkpoint = 'nowhere'; const r = loadRaw(JSON.stringify(d)); g.check(r.d === null && r.s.lastError === 'checkpoint', 'неизвестная контрольная точка → отклонено', r.s.lastError); }
  { const d = freshSave(); delete d.flags.dressed; d.items = {}; const r = loadRaw(JSON.stringify(d)); g.check(r.d && r.d.flags.dressed === false && r.d.items.pass === false, 'отсутствующие флаги/предметы → false'); }
  for (const [scene, chk] of [['S04_Reflex', 'start'], ['S05_Fear', 'start'], ['S06_Will', 'start']]) {
    const d = freshSave(); d.scene = scene; d.checkpoint = chk; const r = loadRaw(JSON.stringify(d));
    const p = r.s.continuePoint();
    g.check(p && p.scene === scene && p.checkpoint === 'start', `сохранение в ${scene} → продолжение с того же защитника`, p && p.scene);
    g.check(GRAPH.defeat[scene][0] === scene, `поражение в ${scene} не возвращает к предыдущему защитнику`);
  }
  { const d = freshSave(); d.scene = 'S09_Road'; d.checkpoint = 'start'; const r = loadRaw(JSON.stringify(d)); const p = r.s.continuePoint(); g.check(p.scene === 'S09_Road' && p.checkpoint === 'start', 'дорога → с начала'); }
  { // localStorage недоступен
    const s = createSave({ key: KEY, checkpointsOf: cpOf, storage: null }); let thrown = null, w;
    try { s.newGame(); s.setFlag('meetSeen'); w = s.write(); s.load(); } catch (e) { thrown = e; }
    g.check(!thrown && s.available === false && w === false && s.data === null, 'нет localStorage → игра без сохранений, без исключений');
  }
  { // хранилище бросает исключения (приватный режим / квота)
    const bad = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceeded'); }, removeItem() { throw new Error('x'); } };
    const s = createSave({ key: KEY, checkpointsOf: cpOf, storage: bad }); let thrown = null, w, d;
    try { d = s.load(); s.newGame(); w = s.write(); s.clear(); } catch (e) { thrown = e; }
    g.check(!thrown && d === null && w === false, 'исключения хранилища перехватываются', thrown?.message);
  }
  return g;
}

// ---------- test.graph ----------
async function testGraph(ctx) {
  const g = group('test.graph');
  for (const id of SCENES) {
    let sc = null, err = '';
    try { sc = await ctx.scenes.load(id); } catch (e) { err = e.message; }
    if (!g.check(sc, `${id}: модуль загружается`, err)) continue;
    const fnOk = ['enter', 'exit', 'update', 'render'].every((k) => typeof sc[k] === 'function');
    const cps = sc.checkpoints || [];
    g.check(fnOk && cps.length > 0 && cps[0] === 'start' && JSON.stringify(cps) === JSON.stringify(CHECKPOINTS[id]), `${id}: enter/exit/update/render, чекпоинты [${cps.join(', ')}]`);
    if (GRAPH.series[id]) g.eq(sc.series, GRAPH.series[id], `${id}: номер серии`);
  }
  for (const [from, to] of Object.entries(GRAPH.next)) g.check(SCENE_PATHS[from] && SCENE_PATHS[to], `переход ${from} → ${to}`);
  for (const [from, [to, chk]] of Object.entries(GRAPH.defeat)) g.check(SCENE_PATHS[from] && SCENE_PATHS[to] && (chk === 'chk' || CHECKPOINTS[to].includes(chk)), `поражение ${from} → ${to}/${chk}`);
  g.check(GRAPH.order.every((id) => SCENE_PATHS[id]), 'GRAPH.order: все id существуют');
  // полный путь по графу: MENU → … → CREDITS → MENU, каждая серия по порядку
  const uc = { ...CFG.userCutscene };
  const walk = () => { const path = ['MENU']; let id = 'MENU'; for (let i = 0; i < 40; i++) { id = ctx.scenes.nextOf(id); if (!id) break; path.push(id); if (id === 'MENU') break; } return path; };
  try {
    CFG.userCutscene.enabled = false;
    const p = walk(), series = p.filter((id) => GRAPH.series[id]).map((id) => GRAPH.series[id]);
    g.check(p[p.length - 1] === 'MENU' && p.includes('RESULTS') && p.includes('CREDITS'), 'путь MENU → … → RESULTS → CREDITS → MENU', p.join(' → '));
    g.eq(series.join(','), '1,2,3,4,5,6,7,8,9,10', 'все 10 серий по порядку');
    const unreachable = GRAPH.order.filter((id) => id !== 'C_User' && !p.includes(id));
    g.check(unreachable.length === 0, 'все сцены сюжета достижимы', unreachable.join(', '));
    CFG.userCutscene.enabled = true; CFG.userCutscene.position = 'beforeS01';
    g.check(ctx.scenes.nextOf('MENU') === 'C_User' && ctx.scenes.nextOf('C_User') === 'S01_Intro', 'ролик пользователя «beforeS01»: MENU → C_User → S01');
    CFG.userCutscene.position = 'afterS10';
    g.check(ctx.scenes.nextOf('S10_Lab') === 'C_User' && ctx.scenes.nextOf('C_User') === 'RESULTS', 'ролик пользователя «afterS10»: S10 → C_User → RESULTS');
  } finally { Object.assign(CFG.userCutscene, uc); }
  return g;
}

// ---------- test.road ----------
function testRoad() {
  const g = group('test.road');
  const res = roadWindowStats({ duration: CFG.road.test.duration });
  for (const r of res) g.check(r.ok, `полоса ${r.lane}: окон ≥ ${CFG.road.test.window} с — ${r.windows}, макс. ожидание ${r.maxWait} с (≤ ${CFG.road.test.every})`);
  g.eq(res[0]?.collided ?? -1, 0, 'машины не въезжают друг в друга');
  g.note = `симуляция ${CFG.road.test.duration} с, ${res.length} полос`;
  return g;
}

// ---------- test.balance ----------
function testBalance() {
  const g = group('test.balance');
  const dt = 1 / 60, B = CFG.bal;
  { const b = createBalance(B); for (let i = 0; i < 60 / dt; i++) b.update(dt, { moving: true, speedFrac: 1, turnDeg: 0 }); g.eq(b.L, 0, 'прямая ходьба 60 с → L = 0'); }
  { const b = createBalance(B); b.update(dt, { moving: true, speedFrac: 1, turnDeg: 180 }); g.near(b.L, 38, 2, 'разворот 180° за шаг на полной скорости → +38 ± 2'); }
  { const b = createBalance(B); const n = Math.round(0.3 / dt); for (let i = 0; i < n; i++) b.update(dt, { moving: true, speedFrac: 1, turnDeg: 180 / n }); g.near(b.L, 38, 2, 'разворот 180° за 0,3 с на полной скорости → +38 ± 2'); }
  { const b = createBalance(B); const n = Math.round(0.3 / dt); for (let i = 0; i < n; i++) b.update(dt, { moving: true, speedFrac: 0.5, turnDeg: 180 / n }); g.near(b.L, 19, 2, 'тот же разворот на половине скорости → +19 ± 2'); }
  { const b = createBalance(B); b.L = 60; for (let i = 0; i < 1 / dt; i++) b.update(dt, { moving: false }); g.near(b.L, 40, 0.05, 'стоя: −20 в секунду'); }
  { const b = createBalance(B); b.L = 60; for (let i = 0; i < 1 / dt; i++) b.update(dt, { moving: true, careful: true }); g.near(b.L, 60 - B.decayCareful, 0.05, `осторожный шаг: −${B.decayCareful} в секунду`); }
  { const b = createBalance(B); b.bump(); b.bump(); g.eq(b.L, B.bump, `удар не чаще раза в ${B.bumpCd} с`); }
  { const b = createBalance(B); b.L = 99; b.add(5); b.update(dt, {}); g.check(b.fallen && b.stateName === 'fall', 'L ≥ 100 → падение'); }
  return g;
}

// ---------- test.nav ----------
// S02: ходьба паука по поверхностям спальни без «невидимых стен» — та же пошаговая логика, что в moveSpider
// (edgeStep → переход, иначе resolveOn), но без кадров и анимаций: переход через край считается мгновенным.
function testNav() {
  const g = group('test.nav');
  const S = makeSurfaces(), SP = CFG.spider3d, r = SP.radius, sp = SP.speed, dt = CFG.loop.step, kv = 1 - Math.exp(-12 * dt); // шаг как в игре (1/60 с)
  let landings = 0, badLandings = 0;
  // dir — [dx, dz] или функция (x, z) → [dx, dz] (идти к цели); итог: поверхность, точка, цепочка переходов
  const walk = (surf, x, z, dir, sec = 3) => {
    let vx = 0, vz = 0, path = surf;
    for (let t = 0; t < sec; t += dt) {
      const [dx, dz] = typeof dir === 'function' ? dir(x, z) : dir, l = Math.hypot(dx, dz) || 1;
      vx += (dx / l * sp - vx) * kv; vz += (dz / l * sp - vz) * kv;
      const nx = x + vx * dt, nz = z + vz * dt;
      const e = edgeStep(S, surf, x, z, nx, nz, vx, vz, r, SP.edgeMinV * sp);
      if (e) {
        surf = e.to; x = e.x; z = e.z; path += '→' + surf; landings++;
        const [cx, cz] = resolveOn(S[surf], x, z, r); if (Math.hypot(cx - x, cz - z) > 1e-6) badLandings++;
        continue;
      }
      [x, z] = resolveOn(S[surf], nx, nz, r);
    }
    return { surf, x, z, path, s: `${path} (${x.toFixed(1)}, ${z.toFixed(1)})` };
  };
  const all = (list, want) => { const bad = list.filter((w) => w.surf !== want); return { ok: !bad.length, s: (bad.length ? bad : list).map((w) => w.s).join('; ') }; };
  { const res = all([1, -1].flatMap((sx) => [-94, -84, -74].map((z0) => walk('T', sx * 55, z0, [-sx, 0], 2))), 'P');
    g.check(res.ok, 'матрас → подушка сбоку (справа и слева, 6 точек): упёрся в край — забрался', res.s); }
  { const res = all([1, -1].flatMap((sx) => [29, 35, 41].map((x0) => walk('T', sx * x0, -62, [0, -1], 2))), 'P');
    g.check(res.ok, 'матрас → подушка спереди, рядом с плечами (|x| 29–41, 6 точек)', res.s); }
  { const w = walk('T', 45, -60, [-0.2, -1], 3); g.check(w.surf === 'T', 'идёт вдоль края подушки (11° к краю) — не затягивает наверх', w.s); }
  { const list = [walk('P', 30, -85, [1, 0], 1.5), walk('P', -30, -85, [-1, 0], 1.5), walk('P', 33, -80, [0, 1], 1.5), walk('P', -33, -80, [0, 1], 1.5)];
    g.check(list.every((w) => w.path.startsWith('P→T')), 'подушка → матрас: с боков и спереди (4 точки; спереди дальше — на одеяло)', list.map((w) => w.s).join('; ')); }
  { const a = walk('P', 20, -80, [0, 1], 2), b = walk('P', 30, -85, [0, -1], 2), c = walk('T', 35, -62, [-1, 0], 2);
    g.check(a.surf === 'P' && a.z <= S.P.b.z1 - r + 1e-6 && b.surf === 'P' && c.surf === 'T' && c.x >= BED.shoulders.x1 + r - 1e-6,
      'плечи спящего и изголовье — настоящие препятствия (видимые)', [a.s, b.s, c.s].join('; ')); }
  { const a = walk('B', 40, -40, [0, -1], 2), b = walk('B', -40, -40, [0, -1], 2), c = walk('B', 0, -40, [0, -1], 2);
    g.check(a.path.startsWith('B→T') && b.path.startsWith('B→T') && c.surf === 'B', 'одеяло → матрас через край (|x| ≥ 26,5); по центру упирается в подбородок', [a.s, b.s, c.s].join('; ')); }
  { const to = (ex) => (x, z) => [ex - x, BED.head.z - z], near = (w, ex) => w.surf === 'P' && Math.hypot(w.x - ex, w.z - BED.head.z) <= SP.earRadius;
    const res = [[walk('B', 45, -40, to(12), 6), 12], [walk('T', 60, -85, to(12), 4), 12], [walk('T', 36, -62, to(12), 4), 12],
      [walk('B', -45, -40, to(-12), 6), -12], [walk('T', -60, -85, to(-12), 4), -12]];
    g.check(res.every(([w, ex]) => near(w, ex)), `путь к уху «прямо к цели» (правое и левое ухо; с одеяла, с бока и спереди матраса) — в радиусе ${SP.earRadius} см`, res.map(([w]) => w.s).join('; ')); }
  { // «просто держи W»: на подушке «вперёд» — по камере (surfCam); с любой точки половины W приводит к уху
    const starts = [[38, -96.5], [16, -96.5], [38, -85], [38, -73], [13, -73], [20, -90], [30, -80]];
    const res = [1, -1].flatMap((sx) => starts.map(([x0, z0]) => [walk('P', sx * x0, z0, (x, z) => surfCam(S.P, x, z), 5), sx * 12]));
    g.check(res.every(([w, ex]) => w.surf === 'P' && Math.hypot(w.x - ex, w.z - BED.head.z) <= SP.earRadius),
      `подушка: зажатая W (вперёд по камере) с любой точки половины доводит до уха — за головой нет «кармана» (${res.length} точек)`, res.map(([w]) => w.s).join('; ')); }
  { const w = walk('P', -20, -80, (x, z) => [1, 0.6], 4);
    g.check(w.surf === 'P' && w.x < 0, 'перед лицом прохода нет: подбородок и шея — препятствие (с левой половины подушки на правую — только в обход)', w.s); }
  g.check(landings > 0 && badLandings === 0, `точки приземления после края — внутри поверхности и вне препятствий (${landings})`, badLandings ? badLandings + ' плохих' : '');
  return g;
}

// ---------- test.battle ----------
function stubCtx(input = null) {
  const nop = () => {}, handle = { stop: nop, setPan: nop, setVol: nop, setRate: nop, setParam: nop };
  const stub = () => new Proxy({}, { get: (_, k) => (k === 'ready' ? false : () => handle) });
  return { settings: { shake: false, lessFx: true }, input, audio: stub(), hud: stub(), scenes: stub(), debugState: {} };
}
function testBattle() {
  const g = group('test.battle');
  const dt = 1 / 60, minWarn = CFG.battle.minWarn;
  { // Отверстия должны быть проходами и в коллизиях, и на картинке, включая переход через ±π.
    for (const base of [0, Math.PI - 0.01, -Math.PI + 0.01, 7.5]) {
      const ring = { gap: base, gaps: fearRingGaps(base) }, arcs = fearRingArcs(ring);
      g.eq(ring.gaps.length, 3, `Страх: три отверстия (угол ${base.toFixed(2)})`);
      g.check(ring.gaps.every(a => isFearRingGap(ring, a, 16, 150)), 'все три отверстия безопасны для паука');
      g.check(arcs.every(a => !isFearRingGap(ring, (a.from + a.to) / 2, 16, 150)), 'твёрдые дуги между отверстиями опасны');
      g.check(arcs.every(a => a.to > a.from), 'отрисовка не перекрывает отверстия и шов окружности');
    }
  }

  for (const [name, make] of [['S04 Рефлекс', createReflexAI], ['S05 Страх', createFearAI], ['S06 Воля', createWillAI]]) {
    const b = createBattle(stubCtx(), { sim: true });
    const d = make(b); b.setDefender(d);
    const hits = [];
    b.bus.on('damage', (e) => { if (e.target === b.spider) hits.push(e); });
    let rnd = 1;
    const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
    let ang = 0;
    for (let i = 0; i < 120 / dt; i++) {
      const sp = b.spider, tx = d.x - sp.x, ty = d.y - sp.y, dist = Math.hypot(tx, ty) || 1;
      ang += dt * 0.9;
      // бот: кружит вокруг защитника, иногда подходит и кусает
      const want = dist > 140 ? 1 : dist < 70 ? -1 : 0;
      b.botAxis = { x: tx / dist * want + Math.cos(ang) * 0.6, y: ty / dist * want + Math.sin(ang) * 0.6 };
      b.botBite = dist < 80 && rand() < 0.2; b.botDash = false;
      if (sp.hp <= 1) sp.hp = sp.maxHp;
      if (d.hp <= 2) d.hp = d.maxHp;
      b.update(dt);
    }
    const unwarned = hits.filter((e) => !((e.warned ?? 0) >= minWarn - 1e-6));
    g.check(hits.length > 0, `${name}: атаки защитника доходят до паука (${hits.length} попаданий за 120 с)`);
    g.check(unwarned.length === 0 && b.stats.violations.length === 0, `${name}: каждое попадание с предупреждением ≥ ${minWarn} с`, `мин. ${Math.min(...hits.map((e) => e.warned)).toFixed(2)} с`);
    g.eq(b.stats.dashes, 0, `${name}: без нажатия Shift рывков нет`);
  }
  { // i-frames 1 с, отклонение атаки без предупреждения
    const b = createBattle(stubCtx(), { sim: true }); b.state = 'fight';
    const sp = b.spider, src = { x: sp.x, y: sp.y - 40, name: 'test' };
    const r1 = b.hitSpider({ source: src, type: 'melee', amount: 1, warned: 1 });
    g.near(sp.iframes, CFG.battle.iframes, 1e-6, 'после попадания i-frames = 1 с');
    const t0 = b.time; while (b.time - t0 < 0.5) b.update(dt);
    const r2 = b.hitSpider({ source: src, type: 'melee', amount: 1, warned: 1 });
    while (b.time - t0 < CFG.battle.iframes + 0.05) b.update(dt);
    const r3 = b.hitSpider({ source: src, type: 'melee', amount: 1, warned: 1 });
    g.check(r1 === 'hit' && r2 === 'iframes' && r3 === 'hit', 'повторное попадание через 0,5 с блокируется, через 1,05 с проходит', [r1, r2, r3].join(' / '));
    const hp = sp.hp; while (sp.iframes > 0) b.update(dt);
    const r4 = b.hitSpider({ source: src, type: 'melee', amount: 1, warned: 0.2 });
    g.check(r4 === 'rejected' && sp.hp === hp && b.stats.violations.length === 1, 'атака без предупреждения ≥ 0,4 с не наносит урона и фиксируется', r4);
  }
  { // рывок — только по нажатию (удержание Shift не повторяет рывок)
    const held = new Set(['shift']), press = new Set();
    const inp = { axis: () => ({ x: 1, y: 0 }), pressed: (a) => press.has(a), down: (a) => held.has(a), released: () => false, consume: () => false };
    const b = createBattle(stubCtx(inp), { sim: false });
    while (b.state !== 'fight') b.update(dt);
    for (let i = 0; i < 2 / dt; i++) b.update(dt);
    const n0 = b.stats.dashes;
    press.add('shift'); b.update(dt); press.delete('shift');
    const n1 = b.stats.dashes;
    for (let i = 0; i < 3 / dt; i++) b.update(dt);
    g.check(n0 === 0 && n1 === 1 && b.stats.dashes === 1, 'Shift удерживается 5 с: ровно один рывок по нажатию', `${n0} → ${n1} → ${b.stats.dashes}`);
    b.dispose?.();
  }
  return g;
}

// ---------- переходы между сценами (для audio/leaks) ----------
// ---------- test.wash ----------
// Шаг 1 «Открыть кран»: вентиль крутится только чередованием A/D, пружинит назад, повтор стороны — соскальзывание.
function testWash() {
  const g = group('test.wash'), T = CFG.wash.tap, dt = 1 / 60;
  let ax = 0, steps = [], errs = 0;
  const w = createWash({ ...stubCtx({ axis: () => ({ x: ax, y: 0 }) }), g2d: () => null }, { onStep: (n) => steps.push(n), onError: () => errs++ });
  const tick = (a, n = 3) => { ax = a; for (let i = 0; i < n; i++) w.update(dt); };
  g.check(w.isTap, 'первый шаг — вентиль, а не полоса');
  tick(1); g.near(w.prog, T.push, 1e-6, 'нажатие D — один поворот');
  tick(1, 30); g.check(w.prog <= T.push, 'удержание клавиши не крутит вентиль', w.prog.toFixed(3));
  w.prog = T.push; tick(-1); tick(1); tick(-1); g.near(w.prog, T.push * 4, 1e-6, 'каждое чередование A/D добавляет push');
  tick(0); tick(-1); g.check(errs === 1 && w.prog < T.push * 4, 'та же сторона дважды — соскальзывание', `${errs} · ${w.prog.toFixed(3)}`);
  const p0 = w.prog; tick(0, 60); g.check(w.prog < p0, 'без нажатий вентиль пружинит назад', `${p0.toFixed(3)} → ${w.prog.toFixed(3)}`);
  let a = 1, k = 0; while (w.step === 0 && k++ < 40) { tick(a, 2); a = -a; }
  g.check(w.step === 1 && steps[0] === 1 && !w.isTap, 'полный поворот открывает кран → шаг 2 (полоса)', `${k} нажатий`);
  g.check(k <= Math.ceil(1 / T.push) + 3, 'открыть кран можно примерно за ' + Math.ceil(1 / T.push) + ' нажатий', k);
  return g;
}

async function gotoAndWait(ctx, id, { timeout = 30000 } = {}) {
  const t0 = performance.now();
  ctx.scenes.goto(id, { transition: 'none', noCard: true, checkpoint: 'start' });
  while (performance.now() - t0 < timeout) {
    const sm = ctx.scenes;
    if (sm.currentId === id && sm.started && !sm.transitioning) return true;
    await sleep(16);
  }
  return false;
}

// ---------- test.audio ----------
async function testAudio(ctx) {
  const g = group('test.audio');
  const miss = (ids, table) => ids.filter((id) => !table[id]);
  g.check(miss(SFX_IDS, RECIPES).length === 0, `SFX: у всех ${SFX_IDS.length} ID есть рецепт`, miss(SFX_IDS, RECIPES).join(', '));
  g.check(miss(LOOP_IDS, LOOPS).length === 0, `петли: у всех ${LOOP_IDS.length} ID есть рецепт`, miss(LOOP_IDS, LOOPS).join(', '));
  g.check(miss(MUSIC_IDS, TRACKS).length === 0, `музыка: все ${MUSIC_IDS.length} треков`, miss(MUSIC_IDS, TRACKS).join(', '));
  g.check(miss(STINGER_IDS, STINGERS).length === 0, `стингеры: ${STINGER_IDS.length}`, miss(STINGER_IDS, STINGERS).join(', '));
  g.check(miss(AMB_IDS, AMB).length === 0, `эмбиенты: ${AMB_IDS.length}`, miss(AMB_IDS, AMB).join(', '));
  const dup = ALL_IDS.filter((id, i) => ALL_IDS.indexOf(id) !== i);
  g.check(dup.length === 0, 'ID не повторяются', dup.join(', '));
  const extra = Object.keys(RECIPES).filter((id) => !SFX_IDS.includes(id));
  g.check(extra.length === 0, 'все рецепты внесены в реестр ids.js', extra.join(', '));
  // все ID, которые вызывает код (play/loop/music/ambience/… и {type:'sfx', id} в таймлайнах), есть в реестре
  const used = new Map(), re = [/\b(?:play|loop|music|ambience|ambienceLayer|stinger)\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g, /type:\s*['"](?:sfx|music|amb)['"],\s*id:\s*['"]([A-Z][A-Z0-9_]+)['"]/g, /\bsfx:\s*['"]([A-Z][A-Z0-9_]+)['"]/g];
  let files = 0;
  for (const src of SOURCES) {
    try {
      const txt = await (await fetch(new URL(src, import.meta.url))).text(); files++;
      for (const r of re) for (const m of txt.matchAll(r)) { if (!used.has(m[1])) used.set(m[1], src); }
    } catch (e) { g.check(false, 'чтение ' + src, e.message); }
  }
  const unknown = [...used.keys()].filter((id) => !ALL_IDS.includes(id));
  g.check(unknown.length === 0, `код (${files} файлов) вызывает ${used.size} ID — все есть в реестре`, unknown.map((id) => id + ' (' + used.get(id) + ')').join(', '));
  // повторный вход не увеличивает число активных петель
  ctx.audio.unlock();
  if (ctx.audio.ready) {
    for (const id of ['S01_Intro', 'S02_Path']) {
      const counts = [];
      for (let k = 0; k < 3; k++) {
        const ok = await gotoAndWait(ctx, id);
        counts.push(ok ? ctx.audio.activeLoops() : -1);
        await gotoAndWait(ctx, 'TEST_BLANK');
        counts.push(ctx.audio.activeLoops());
      }
      const ins = counts.filter((_, i) => i % 2 === 0), outs = counts.filter((_, i) => i % 2 === 1);
      g.check(ins[0] > 0 && ins.every((n) => n === ins[0]) && outs.every((n) => n === 0), `${id}: петель при входе ${ins.join('/')}, после выхода ${outs.join('/')}`);
    }
  } else g.check(true, 'Web Audio недоступен — проверка петель пропущена');
  return g;
}

// ---------- test.leaks ----------
function snapshot(ctx) {
  const mem = ctx.renderer?.info?.memory;
  return { win: listenerStats.window, tweens: ctx.tweens.count(), events: ctx.events.count(), geo: mem?.geometries ?? 0, tex: mem?.textures ?? 0, loops: ctx.audio.activeLoops(), dom: (ctx.uiRoot?.querySelectorAll('*').length ?? 0) + (ctx.hudRoot?.querySelectorAll('*').length ?? 0) };
}
async function testLeaks(ctx, n, progress) {
  const g = group('test.leaks');
  const keys = ['win', 'tweens', 'events', 'geo', 'tex', 'loops'];
  const list = SCENES.filter((id) => id !== 'C_User' || CFG.userCutscene.enabled);
  let i = 0;
  for (const id of list) {
    progress(`test.leaks: ${id} (${++i}/${list.length})`);
    const snaps = [];
    let fail = '';
    for (let k = 0; k < n; k++) {
      if (!(await gotoAndWait(ctx, id))) { fail = 'не дождались входа'; break; }
      await frames(3);
      if (!(await gotoAndWait(ctx, 'TEST_BLANK'))) { fail = 'не дождались выхода'; break; }
      await frames(2);
      snaps.push(snapshot(ctx));
    }
    if (fail) { g.check(false, `${id}: ${fail}`); continue; }
    // первый цикл — прогрев общих кэшей (материалы, спрайты, шрифты); дальше рост недопустим
    const base = snaps[0], last = snaps[snaps.length - 1];
    const grow = keys.filter((k) => last[k] > base[k]);
    g.check(grow.length === 0 && last.loops === 0, `${id}: ×${n} — слушатели ${base.win}→${last.win}, твины ${base.tweens}→${last.tweens}, события ${base.events}→${last.events}, геометрии ${base.geo}→${last.geo}, текстуры ${base.tex}→${last.tex}, петли ${last.loops}`, grow.join(', '));
    if (last.dom > base.dom) g.check(false, `${id}: DOM-узлы интерфейса растут ${base.dom}→${last.dom}`);
  }
  return g;
}

// ---------- запуск и отчёт ----------
export async function runAllTests(ctx) {
  const params = new URLSearchParams(location.search);
  const only = (params.get('only') || '').split(',').filter(Boolean);
  const n = Math.max(2, +(params.get('n') || 10));
  const want = (k) => !only.length || only.includes(k);
  SCENE_PATHS.TEST_BLANK = '../tests/blank.js'; CHECKPOINTS.TEST_BLANK = ['start'];
  const KEY = CFG.storage.save; let backup = null;
  try { backup = localStorage.getItem(KEY); } catch {}
  const box = document.createElement('div'); box.className = 'panel tests-panel';
  box.innerHTML = '<h2>Самопроверки</h2><div class="tests-status">…</div><pre class="tests-out"></pre>';
  (ctx.dbgRoot || ctx.uiRoot).append(box);
  const out = box.querySelector('.tests-out'), status = box.querySelector('.tests-status');
  const progress = (s) => { status.textContent = s; };
  const results = [];
  window.__tests = { done: false, pass: false, results };
  const print = (gr) => {
    const bad = gr.checks.filter((c) => !c.ok);
    const head = `${gr.ok ? '✔' : '✘'} ${gr.name} — ${gr.checks.length - bad.length}/${gr.checks.length}${gr.note ? ' · ' + gr.note : ''} (${gr.ms} мс)`;
    console.log('[TEST]', head);
    for (const c of gr.checks) if (!c.ok || params.get('verbose')) console.log('[TEST]   ', c.ok ? 'ok ' : 'FAIL', c.label, c.detail ? '— ' + c.detail : '');
    out.textContent += head + '\n' + bad.map((c) => '    ✘ ' + c.label + (c.detail ? ' — ' + c.detail : '')).join('\n') + (bad.length ? '\n' : '');
  };
  const tests = [['input', testInput], ['save', testSave], ['graph', testGraph], ['road', testRoad], ['balance', testBalance], ['nav', testNav], ['battle', testBattle], ['wash', testWash], ['audio', testAudio], ['leaks', (c) => testLeaks(c, n, progress)]];
  ctx.save.ensure();
  for (const [k, fn] of tests) {
    if (!want(k)) continue;
    progress('test.' + k + '…');
    const t0 = performance.now();
    let gr;
    try { gr = await fn(ctx); } catch (e) { gr = group('test.' + k); gr.check(false, 'исключение: ' + e.message, (e.stack || '').split('\n')[1] || ''); console.error(e); }
    gr.ms = Math.round(performance.now() - t0);
    results.push(gr); print(gr);
    await sleep(0);
  }
  if (ctx.scenes.currentId) await gotoAndWait(ctx, 'TEST_BLANK');
  try { if (backup === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, backup); } catch {}
  ctx.save.load();
  const pass = results.every((r) => r.ok);
  const total = results.reduce((s, r) => s + r.checks.length, 0), failed = results.reduce((s, r) => s + r.checks.filter((c) => !c.ok).length, 0);
  progress(pass ? `Все проверки пройдены: ${total}` : `Провалено ${failed} из ${total}`);
  status.classList.add(pass ? 'ok' : 'bad');
  console.log('[TEST] ИТОГ', pass ? 'PASS' : 'FAIL', `${total - failed}/${total}`);
  const back = document.createElement('button'); back.className = 'btn small'; back.textContent = 'В меню';
  back.onclick = () => { location.search = '?debug=1'; };
  box.append(back);
  window.__tests = { done: true, pass, results, total, failed };
  return window.__tests;
}
