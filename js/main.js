// Точка входа: сцена 960×540 с масштабом, общий контекст ctx, цикл, пауза, отладка (F1–F6), URL-параметры.
import { CFG, RELEASE, GRAPH } from './config.js';
import { t } from './text/ru.js';
import { createLoop } from './core/loop.js';
import { createInput } from './core/input.js';
import { createSave } from './core/save.js';
import { createEvents, listen, listenerStats } from './core/events.js';
import { createTweens } from './core/tween.js';
import { createRng } from './core/rng.js';
import { createSceneManager, SCENE_PATHS, CHECKPOINTS } from './core/scenes.js';
import { hasWebGL, createRenderer } from './three/renderer.js';
import { createAudio } from './audio/engine.js';
import { createHud } from './ui/hud.js';
import { createCard } from './ui/card.js';
import { createObjectives } from './ui/objectives.js';
import { createCockpit } from './ui/cockpit.js';
import { createPause } from './ui/pause.js';
import { loadSettings, applySettings } from './ui/settings.js';
import { el, button, modal, createFade, focusNav } from './ui/dom.js';

const params = new URLSearchParams(location.search);
const DEBUG = !RELEASE && params.get('debug') === '1';
const stage = document.getElementById('stage');
const glCanvas = document.getElementById('gl');
const c2dCanvas = document.getElementById('c2d');
const hudRoot = document.getElementById('hud');
const uiRoot = document.getElementById('ui');
const dbgRoot = document.getElementById('dbg');

const settings = loadSettings();
const events = createEvents();
const ctx = {
  cfg: CFG, debug: DEBUG, params, stage, uiRoot, hudRoot, dbgRoot, settings, events,
  stageScale: 1, webgl: hasWebGL(),
  debugState: { god: false, colliders: false, overlay: false, speedIdx: 0 },
};
window.__game = ctx; // для самопроверок и отладки

// ---------- 2D-холст ----------
const g2 = c2dCanvas.getContext('2d');
ctx.c2d = g2;
ctx.c2dCanvas = c2dCanvas;
ctx.g2d = () => { const k = c2dCanvas.width / CFG.stage.w; g2.setTransform(k, 0, 0, k, 0, 0); return g2; };
ctx.clear2d = () => { g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, c2dCanvas.width, c2dCanvas.height); };
ctx.show3d = (on) => { glCanvas.style.visibility = on ? 'visible' : 'hidden'; };

// ---------- масштаб сцены ----------
function layout() {
  const W = window.innerWidth, H = window.innerHeight;
  const s = Math.max(0.1, Math.min(W / CFG.stage.w, H / CFG.stage.h));
  ctx.stageScale = s;
  stage.style.transform = `translate(${-CFG.stage.w * s / 2}px, ${-CFG.stage.h * s / 2}px) scale(${s})`;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(CFG.stage.w * s * dpr), py = Math.round(CFG.stage.h * s * dpr);
  if (c2dCanvas.width !== px) { c2dCanvas.width = px; c2dCanvas.height = py; }
  ctx.renderer?.setStageScale(s);
}
ctx.stageRect = () => { const r = stage.getBoundingClientRect(); return { left: r.left, top: r.top, scale: ctx.stageScale }; };

// ---------- подсистемы ----------
ctx.renderer = ctx.webgl ? createRenderer(glCanvas, settings) : null;
if (!ctx.renderer) ctx.webgl = false;
ctx.audio = createAudio({ debug: DEBUG });
ctx.input = createInput(window);
ctx.save = createSave({ key: CFG.storage.save, checkpointsOf: (id) => CHECKPOINTS[id] });
ctx.tweens = createTweens();
ctx.rng = createRng(CFG.seed);
ctx.fade = createFade(document.getElementById('fade'));
ctx.hud = createHud(ctx);
ctx.card = createCard(ctx);
ctx.objectives = createObjectives(ctx);
ctx.cockpit = createCockpit(ctx);
ctx.ui = makeUi();
ctx.scenes = createSceneManager(ctx);
ctx.pause = createPause(ctx);
layout();
listen(window, 'resize', layout);
ctx.save.load();
applySettings(ctx);

// ---------- общий UI: загрузка, поражение, ошибки, нет WebGL ----------
function makeUi() {
  let loadEl = null, loadTimer = 0;
  return {
    loading(on, hidden = false) {
      clearTimeout(loadTimer);
      if (!on) { loadEl?.remove(); loadEl = null; return; }
      if (hidden) return;
      loadTimer = setTimeout(() => { if (!loadEl) { loadEl = el('div', 'loading', t('loading')); uiRoot.append(loadEl); } }, CFG.ui.loadingDelay * 1000);
    },
    defeat(title, tip, cb) {
      const box = el('div', 'defeat');
      box.append(el('h1', '', title));
      if (tip) box.append(el('p', '', tip));
      const retry = el('div', 'retry', t('defeat.retry')); retry.style.opacity = '0';
      box.append(retry); uiRoot.append(box);
      const t0 = performance.now();
      let done = false;
      const go = () => { if (done) return; done = true; offK(); offP(); clearTimeout(auto); box.remove(); cb(); };
      const ready = () => performance.now() - t0 > CFG.ui.defeatDelay * 1000 * 0.5;
      setTimeout(() => { retry.style.opacity = '1'; }, CFG.ui.defeatDelay * 500);
      const offK = listen(window, 'keydown', (e) => { if (e.code !== 'Escape' && ready()) { e.preventDefault(); go(); } });
      const offP = listen(box, 'pointerdown', () => { if (ready()) go(); });
      const auto = setTimeout(go, (CFG.ui.defeatDelay + 3) * 1000);
    },
    errorDialog(e, cb) {
      ctx.audio.play('UI_ERROR');
      modal(uiRoot, { title: t('error.generic'), text: DEBUG ? String(e?.stack || e).slice(0, 400) : '', buttons: [{ text: t('nowebgl.menu'), primary: true, onClick: cb }] }, ctx.audio);
    },
    noWebgl(cb) {
      const box = el('div', 'nowebgl');
      box.append(el('h1', '', t('nowebgl.title')), el('p', '', t('nowebgl.text')));
      const b = button(t('nowebgl.menu'), () => { nav.dispose(); box.remove(); cb?.(); }, 'btn primary');
      box.append(b); uiRoot.append(box);
      const nav = focusNav(box, {});
    },
  };
}
// Сцены, требующие WebGL: при его отсутствии — экран «нет WebGL».
const NEEDS_GL = new Set(['S01_Intro', 'S02_Path', 'S03_Meet', 'C_Levers', 'S07_Morning', 'C_Wardrobe', 'S08_Prep', 'C_ExitHome', 'C_LabEntry', 'S10_Lab', 'MODELS']);
const rawGoto = ctx.scenes.goto.bind(ctx.scenes);
ctx.scenes.goto = (id, p = {}) => {
  if (NEEDS_GL.has(id) && !ctx.webgl) { ctx.ui.noWebgl(() => rawGoto('MENU')); return Promise.resolve(); }
  if (GRAPH.debugOnly.includes(id) && !DEBUG) id = 'MENU';
  return rawGoto(id, p);
};

// ---------- звук: разблокировка по первому жесту ----------
const unlock = () => { if (ctx.audio.unlock()) { offU1(); offU2(); } };
const offU1 = listen(window, 'pointerdown', unlock, true);
const offU2 = listen(window, 'keydown', unlock, true);

// ---------- пауза и видимость ----------
const PAUSABLE = (id) => id && !['MENU', 'RESULTS', 'CREDITS'].includes(id);
listen(window, 'keydown', (e) => {
  if (e.code !== 'Escape' || e.repeat) return;
  if (document.querySelector('.modal-back') && !ctx.pause.open) return; // модальные окна закрывают себя сами
  if (ctx.pause.open) return; // в паузе Esc обрабатывает focusNav
  if (!ctx.scenes.started || !PAUSABLE(ctx.scenes.currentId) || ctx.scenes.failing) return;
  e.preventDefault(); ctx.audio.play('UI_PAUSE'); ctx.pause.show();
});
listen(document, 'visibilitychange', () => {
  if (document.hidden) {
    ctx.audio.suspend();
    if (ctx.save.data && PAUSABLE(ctx.scenes.currentId)) ctx.save.write();
    if (ctx.scenes.started && PAUSABLE(ctx.scenes.currentId) && !ctx.pause.open && !ctx.scenes.failing) ctx.pause.show();
  } else if (!ctx.pause.open) ctx.audio.resume();
});

// ---------- цикл ----------
const loop = createLoop({
  step: CFG.loop.step, maxDt: CFG.loop.maxDt,
  update(dt) {
    ctx.input.beginStep();
    if (DEBUG) debugKeys();
    ctx.scenes.update(dt);
    ctx.tweens.update(dt);
    ctx.hud.update(dt);
    ctx.cockpit.update(dt);
    if (ctx.scenes.started && PAUSABLE(ctx.scenes.currentId)) ctx.save.addPlayMs(dt * 1000);
    autosaveTick(dt);
    ctx.input.endStep();
  },
  render(alpha, dt) {
    ctx.renderer?.beginFrame();
    ctx.scenes.render(alpha, dt);
    if (DEBUG && ctx.debugState.overlay) overlayTick(dt);
  },
});
ctx.loop = loop;
// периодическая запись времени игры
// автосохранение раз в 10 с — по времени цикла (setInterval для игровой логики не используем)
let autosaveAcc = 0;
function autosaveTick(dt) { autosaveAcc += dt; if (autosaveAcc < 10) return; autosaveAcc = 0; if (ctx.save.data && PAUSABLE(ctx.scenes.currentId)) ctx.save.write(); }

// ---------- отладка: F1 меню сцен · F2 бессмертие · F3 коллайдеры/окна дороги · F4 скорость · F5 победа · F6 сброс сохранения ----------
// Оверлей FPS/draw calls/треугольники/сцена/чекпоинт виден всегда в debug (скрыть — клавиша «`»).
let ovEl = null, ovAcc = 0, dbgMenu = null;
if (DEBUG) { ctx.debugState.overlay = true; listen(window, 'keydown', (e) => { if (e.code === 'Backquote') { ctx.debugState.overlay = !ctx.debugState.overlay; if (!ctx.debugState.overlay) { ovEl?.remove(); ovEl = null; } } }); }
function debugKeys() {
  const inp = ctx.input, d = ctx.debugState;
  if (inp.pressed('dbg1')) toggleDebugMenu();
  if (inp.pressed('dbg2')) { d.god = !d.god; ctx.hud.toast(t('debug.god') + ': ' + t(d.god ? 'debug.on' : 'debug.off')); }
  if (inp.pressed('dbg3')) { d.colliders = !d.colliders; ctx.events.emit('debug:colliders', d.colliders); ctx.hud.toast(t('debug.colliders') + ': ' + t(d.colliders ? 'debug.on' : 'debug.off')); }
  if (inp.pressed('dbg4')) { d.speedIdx = (d.speedIdx + 1) % CFG.loop.timeScales.length; loop.timeScale = CFG.loop.timeScales[d.speedIdx]; ctx.hud.toast(t('debug.speed') + ' ×' + loop.timeScale); }
  if (inp.pressed('dbg5')) { const s = ctx.scenes.current; if (s?.debugWin) s.debugWin(); else ctx.scenes.complete(); ctx.hud.toast(t('debug.win')); }
  if (inp.pressed('dbg6')) { ctx.save.clear(); ctx.save.ensure(); ctx.hud.toast(t('debug.reset')); }
}
function overlayTick(dt) {
  ovAcc += dt; if (ovEl && ovAcc < 1 / CFG.debug.overlayHz) return; ovAcc = 0;
  if (!ovEl) { ovEl = el('pre', 'dbg-overlay'); dbgRoot.append(ovEl); }
  const info = ctx.renderer?.info, sc = ctx.scenes;
  const lines = [
    `FPS ${loop.fps.toFixed(0)} · ${loop.frameMs.toFixed(1)} мс · ×${loop.timeScale}`,
    `Сцена ${sc.currentId || '—'} · ${sc.checkpoint} · вход ${Math.round(sc.enterMs || 0)} мс`,
    info ? `Вызовов ${info.render.calls} · треуг. ${info.render.triangles}` : '2D',
    info ? `Геометрий ${info.memory.geometries} · текстур ${info.memory.textures} · программ ${info.programs?.length ?? '?'}` : '',
    `Звук: ${ctx.audio.state} · петли ${ctx.audio.activeLoops()} · музыка ${ctx.audio.currentMusic || '—'}`,
    `Слушатели window ${listenerStats.window} · события ${ctx.events.count()} · твины ${ctx.tweens.count()}`,
    `F2 бессм. ${ctx.debugState.god ? 'вкл' : 'выкл'} · F3 колл. ${ctx.debugState.colliders ? 'вкл' : 'выкл'}`,
  ];
  const extra = sc.current?.debugInfo?.(); if (extra) lines.push(extra);
  ovEl.textContent = lines.filter(Boolean).join('\n');
}
function toggleDebugMenu() {
  if (dbgMenu) { dbgMenu.nav.dispose(); dbgMenu.el.remove(); dbgMenu = null; return; }
  const box = el('div', 'panel dbg-menu');
  box.append(el('h2', '', t('debug.title')));
  const grid = el('div', 'grid');
  const close = () => toggleDebugMenu();
  for (const id of Object.keys(SCENE_PATHS)) for (const chk of CHECKPOINTS[id] || ['start']) {
    grid.append(button(`${id}${chk !== 'start' ? ' · ' + chk : ''}`, () => { close(); ctx.save.ensure(); ctx.scenes.goto(id, { checkpoint: chk }); }, 'btn small'));
  }
  box.append(grid);
  const row = el('div', 'row');
  row.append(button(t('debug.tests'), () => { location.search = '?debug=1&test=all'; }, 'btn small'),
    button(t('debug.reset'), () => { ctx.save.clear(); ctx.hud.toast(t('debug.reset')); close(); }, 'btn small'),
    button(t('menu.back'), close, 'btn small'));
  box.append(row);
  uiRoot.append(box);
  dbgMenu = { el: box, nav: focusNav(box, { onEsc: close }) };
}

// ---------- старт ----------
async function boot() {
  loop.start();
  if (DEBUG && params.get('test') === 'all') {
    const { runAllTests } = await import('./tests/run.js');
    runAllTests(ctx);
    return;
  }
  const scene = DEBUG && params.get('scene');
  if (scene && SCENE_PATHS[scene]) {
    ctx.save.ensure();
    await ctx.scenes.goto(scene, { checkpoint: params.get('chk') || 'start', noCard: params.get('card') !== '1' });
    return;
  }
  if (!ctx.webgl) { ctx.ui.noWebgl(() => ctx.scenes.goto('MENU')); return; }
  await ctx.scenes.goto('MENU');
}
boot().catch((e) => { console.error(e); ctx.ui.errorDialog(e, () => ctx.scenes.goto('MENU')); });
