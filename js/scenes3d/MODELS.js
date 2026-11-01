// MODELS (?debug=1&scene=MODELS): все пять персонажей по .png-референсам рядом — одна камера, один свет, общая шкала
// 1 ед. = 1 см (паук ≈ 3 см, учёный 178 см, человечки 11–12,5 см) + процедурные кошка и лапка из уха (на голове учёного).
// Серый пол с сеткой как на референсах: крупная — 10 см, мелкая (у малышей) — 1 см; линейка 0–200 см.
// Управление: 0–7 / кнопки — ракурс; ←/→ (A/D) — облёт; ↑/↓ (W/S) — приближение; I — idle; Пробел — атака выбранного;
// O — одежда учёного (pajama/work); N — «как на .png» (все одного роста) ↔ истинный масштаб; R — показать референсы.
// Таблица: габариты (Box3, см), треугольники без обводки/с обводкой, меши (≈ вызовы отрисовки), idle и атака.
import * as THREE from 'three';
import { disposeTree } from '../three/toon.js';
import { t } from '../text/ru.js';
import { createWorld } from './common.js';
import { modelTriangles, triangles } from '../three/toon.js';
import { createSpider } from '../models/spider.js';
import { createScientist } from '../models/scientist.js';
import { createDefReflex } from '../models/def_reflex.js';
import { createDefFear } from '../models/def_fear.js';
import { createDefWill } from '../models/def_will.js';
import { createCat } from '../models/cat.js';
import { createSpiderLegEar } from '../models/spider_leg_ear.js';
import { label as makeLabel } from '../models/humanKit.js';
import { el, button } from '../ui/dom.js';

const REFS = ['REF_01_photo_2026-10-31_17-52-42 (2).jpg', 'REF_02_photo_2026-10-31_17-52-42.jpg', 'REF_03_photo_2026-10-31_17-52-56 (2).jpg', 'REF_04_photo_2026-10-31_17-52-56 (3).jpg', 'REF_05_photo_2026-10-31_17-52-56.jpg'];
// позиции в истинном масштабе (x, z) и «высота как на .png» для режима сравнения силуэтов
const DEFS = [
  { key: 'spider', name: 'Паук (SPIDER)', at: [52, 6], lineupH: 40 },
  { key: 'scientist', name: 'Учёный (SCIENTIST)', at: [0, 0], lineupH: 150 },
  { key: 'reflex', name: 'Рефлекс (DEF_REFLEX)', at: [66, 0], lineupH: 110 },
  { key: 'fear', name: 'Страх (DEF_FEAR)', at: [82, 0], lineupH: 95 },
  { key: 'will', name: 'Воля (DEF_WILL)', at: [98, 0], lineupH: 110 },
  { key: 'cat', name: 'Кошка (CAT)', at: [-75, 10], lineupH: 70 },
];
const LINEUP_X = { cat: -140, scientist: -40, fear: 50, will: 120, reflex: 190, spider: 270 };
const VIEWS = [
  { name: 'Общий план', look: [10, 70, 0], dist: 330, h: 0.32, fov: 40 },
  { name: 'Паук', key: 'spider', dist: 14, h: 0.45, fov: 30 },
  { name: 'Учёный', key: 'scientist', dist: 300, h: 0.12, fov: 35 },
  { name: 'Рефлекс', key: 'reflex', dist: 34, h: 0.12, fov: 30 },
  { name: 'Страх', key: 'fear', dist: 32, h: 0.12, fov: 30 },
  { name: 'Воля', key: 'will', dist: 34, h: 0.12, fov: 30 },
  { name: 'Кошка', key: 'cat', dist: 110, h: 0.3, fov: 32 },
  { name: 'Малыши рядом', look: [76, 6, 0], dist: 75, h: 0.22, fov: 32 },
];
let ctx, W, models, panel, table, refBox, view = 0, yawO = 0, zoom = 1, lineup = false, legEar = null, ruler = null, time = 0, outfit = 'work';
const cur = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const tgt = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

function build(key) {
  if (key === 'spider') {
    const m = createSpider({ clips: false }); m.animator.play('idle');
    const o = { m, back: -1, update: (dt) => { m.animator.update(dt, 10); if (o.back > 0 && (o.back -= dt) <= 0) m.animator.play('idle'); },
      idle: () => { o.back = -1; m.animator.play('idle'); },
      attack: () => { m.animator.play('webShoot'); o.back = 1.2; return 1.2; }, anims: 'idle · webShoot (+walk, crawl, climbEdge, pullLever…)' };
    return o;
  }
  if (key === 'scientist') {
    // «атака» учёного — взмах рукой во сне (S02: опасность для паука), поэтому лёжа на спине прямо на полу
    const m = createScientist({ outfit, badge: outfit === 'work' }); m.animator.play('idle');
    const o = { m, back: -1, update: (dt) => { m.animator.update(dt, 0); if (o.back > 0 && (o.back -= dt) <= 0) m.animator.play('idle'); },
      idle: () => { o.back = -1; m.animator.play('idle'); },
      attack: () => { m.animator.play('toss.arm', { supine: true, bedHeight: 9 }); o.back = 1.4; return 1.4; }, anims: 'idle · toss.arm (лёжа, как в S02) + ещё 20' };
    return o;
  }
  if (key === 'cat') { const m = createCat({}); m.play('idle'); return { m, update: (dt) => m.update(dt), idle: () => m.play('idle'), attack: () => m.attack('hiss'), anims: 'idle · hiss (+walk, run, sit, lie, meow)' }; }
  const m = key === 'reflex' ? createDefReflex() : key === 'fear' ? createDefFear() : createDefWill();
  m.animator.play('idle');
  return { m, update: (dt) => (m.update ? m.update(dt) : m.animator.update(dt)), idle: () => { m.cancelAttack?.(); m.animator.play('idle'); }, attack: () => m.attack(m.attackName), anims: `idle · ${m.attackName}` };
}
function measure(o) {
  const g = o.m.group, s = g.scale.x || 1;
  g.updateMatrixWorld(true);
  // габариты — только видимые части (скрытая одежда и прокси слияния не считаются); исходные меши после mergeSkinned
  // невидимы (материал-заглушка), но стоят в позе — по ним и меряем
  const b = new THREE.Box3(), gb = new THREE.Box3();
  g.traverseVisible((x) => {
    if (!x.isMesh || x.isSkinnedMesh || x.userData.outline || x.userData.humanOutline || x.userData.spiderOutline) return;
    if (x.material?.visible === false && !x.userData.skinProxy) return;
    if (!x.geometry.boundingBox) x.geometry.computeBoundingBox();
    b.union(gb.copy(x.geometry.boundingBox).applyMatrix4(x.matrixWorld));
  });
  const sz = b.getSize(new THREE.Vector3()).divideScalar(s);
  let meshes = 0; g.traverseVisible((x) => { if (x.isMesh && x.material?.visible !== false) meshes++; });
  return { w: sz.x, h: sz.y, d: sz.z, tris: modelTriangles(g), trisAll: triangles(g), meshes };
}
function place() {
  for (const o of models) {
    const g = o.m.group;
    if (lineup) { g.scale.setScalar(o.lineupH / o.size.h); g.position.set(LINEUP_X[o.key], 0, 0); }
    else { g.scale.setScalar(1); g.position.set(o.at[0], 0, o.at[1]); }
    g.rotation.y = o.key === 'spider' ? 0 : 0;
  }
  ruler.visible = !lineup;
  setView(lineup ? 0 : view, true);
}
function focusOf(v) {
  const V = VIEWS[v];
  if (lineup) return { look: new THREE.Vector3(65, 60, 0), dist: 600, h: 0.18, fov: 40 };
  if (!V.key) return { look: new THREE.Vector3(...V.look), dist: V.dist, h: V.h, fov: V.fov };
  const o = models.find((x) => x.key === V.key), g = o.m.group;
  return { look: new THREE.Vector3(g.position.x, o.size.h * 0.55, g.position.z), dist: V.dist, h: V.h, fov: V.fov };
}
function setView(v, snap = false) {
  view = v; yawO = 0; zoom = 1;
  aim(snap);
  panel?.querySelectorAll('.mv-views button').forEach((b, i) => b.classList.toggle('on', i === v));
}
function aim(snap) {
  const f = focusOf(view), d = f.dist * zoom;
  tgt.look.copy(f.look);
  tgt.pos.set(f.look.x + Math.sin(yawO) * d, f.look.y + d * f.h, f.look.z + Math.cos(yawO) * d);
  const cam = W.camera; if (Math.abs(cam.fov - f.fov) > 0.01) { cam.fov = f.fov; cam.updateProjectionMatrix(); }
  cam.near = Math.max(0.05, d / 200); cam.far = Math.max(800, d * 30); cam.updateProjectionMatrix();
  // центр кадра сдвинут вправо — слева панель
  cam.setViewOffset(960, 540, -160, 0, 960, 540);
  if (snap) { cur.pos.copy(tgt.pos); cur.look.copy(tgt.look); }
}
function selected() { const k = VIEWS[view].key; return k ? models.filter((o) => o.key === k) : models; }
function fillTable() {
  table.innerHTML = '';
  const head = el('tr'); for (const h of ['Модель', 'Габариты Ш×В×Г, см', 'Треуг. (без обв.)', 'с обводкой', 'Меши', 'Анимации']) head.append(el('th', '', h));
  table.append(head);
  let sum = 0;
  for (const o of models) {
    const s = o.size; sum += s.tris;
    const tr = el('tr');
    for (const v of [o.name, `${s.w.toFixed(1)} × ${s.h.toFixed(1)} × ${s.d.toFixed(1)}`, String(s.tris), String(s.trisAll), String(s.meshes), o.anims]) tr.append(el('td', '', v));
    table.append(tr);
  }
  const tr = el('tr', 'sum'); tr.append(el('td', '', 'Итого'), el('td', '', ''), el('td', '', String(sum)), el('td'), el('td'), el('td', '', 'лапка из уха: ' + (legEar?.tris ?? '—') + ' треуг.'));
  table.append(tr);
}
function rebuildScientist() {
  const i = models.findIndex((o) => o.key === 'scientist'); const old = models[i];
  legEar?.group.removeFromParent();
  disposeTree(old.m.group);
  const n = { ...DEFS.find((d) => d.key === 'scientist'), ...build('scientist') };
  W.scene.add(n.m.group); for (let k = 0; k < 12; k++) n.update(0.05); n.size = measure(n); models[i] = n;
  legEar.attach(n.m.joints.head, 'R'); legEar.show?.(true);
  place(); fillTable();
}
function grid(size, div, c1, c2, y) { const g = new THREE.GridHelper(size, div, c1, c2); g.position.y = y; g.material.transparent = true; g.material.opacity = 0.55; return g; }
function makeRuler() {
  const g = new THREE.Group(); g.name = 'RULER';
  const m = new THREE.MeshBasicMaterial({ color: '#2a2630' });
  const pole = new THREE.Mesh(new THREE.BoxGeometry(1.2, 200, 1.2), m); pole.position.y = 100; g.add(pole);
  for (let y = 0; y <= 200; y += 10) { const tk = new THREE.Mesh(new THREE.BoxGeometry(y % 50 ? 4 : 8, 0.6, 0.6), m); tk.position.set(y % 50 ? 2 : 4, y, 0); g.add(tk); }
  for (const y of [50, 100, 150, 178, 200]) { const l = makeLabel(y + ' см', { w: 26, h: 7, font: '800 90px Arial' }); l.position.set(-16, y, 0); g.add(l); }
  g.position.set(-35, 0, -10);
  return g;
}
function onKey(e) {
  if (ctx.scenes.currentId !== 'MODELS') return;
  const k = e.code;
  if (/^Digit[0-7]$/.test(k)) { if (lineup) { lineup = false; place(); } setView(+k.slice(5)); }
  else if (k === 'KeyI') selected().forEach((o) => o.idle());
  else if (k === 'Space') { e.preventDefault(); selected().forEach((o) => o.attack()); }
  else if (k === 'KeyO') { outfit = outfit === 'work' ? 'pajama' : 'work'; rebuildScientist(); }
  else if (k === 'KeyN') { lineup = !lineup; place(); }
  else if (k === 'KeyR') refBox.classList.toggle('on');
}

const scene = {
  id: 'MODELS', kind: '3d', series: null, objectives: [], checkpoints: ['start'], cockpit: false,
  async enter(c) {
    ctx = c; ctx.show3d(true); time = 0; view = 0; lineup = false; outfit = 'work';
    W = createWorld(ctx, { palette: 'lab', fov: 40, near: 0.1, far: 8000, lights: { dirPos: [220, 420, 380], target: [20, 0, 0], shadows: false } });
    W.scene.background = new THREE.Color('#8e939a');
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshLambertMaterial({ color: '#9da2a8' }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.05; W.scene.add(floor);
    W.scene.add(grid(1200, 120, '#6e737a', '#80858c', 0.02));
    const fine = grid(80, 80, '#5e636a', '#767b82', 0.04); fine.position.x = 76; W.scene.add(fine);
    ruler = makeRuler(); W.scene.add(ruler);
    models = DEFS.map((d) => { const o = { ...d, ...build(d.key) }; W.scene.add(o.m.group); return o; });
    // габариты — в позе idle (до первого кадра аниматор ещё в позе привязки, руки в стороны)
    for (let i = 0; i < 12; i++) for (const o of models) o.update(0.05);
    for (const o of models) o.size = measure(o);
    legEar = createSpiderLegEar(); legEar.attach(models.find((o) => o.key === 'scientist').m.joints.head, 'R'); legEar.show?.(true);
    // панель
    panel = el('div', 'panel models-panel');
    panel.style.cssText = 'position:absolute;left:8px;top:8px;width:310px;max-height:524px;overflow:auto;pointer-events:auto;padding:6px 8px;font:600 10px var(--font);background:rgba(18,14,26,.86);border-radius:10px;color:#f2ece0;z-index:20';
    panel.append(el('h3', '', 'MODELS · 1 ед. = 1 см'));
    const views = el('div', 'mv-views'); views.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:4px 0';
    VIEWS.forEach((v, i) => views.append(button(`${i} ${v.name}`, () => { if (lineup) { lineup = false; place(); } setView(i); }, 'btn small')));
    const acts = el('div'); acts.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:4px 0';
    acts.append(
      button('I — idle', () => selected().forEach((o) => o.idle()), 'btn small'),
      button('Пробел — атака', () => selected().forEach((o) => o.attack()), 'btn small'),
      button('O — одежда', () => { outfit = outfit === 'work' ? 'pajama' : 'work'; rebuildScientist(); }, 'btn small'),
      button('N — как на .png', () => { lineup = !lineup; place(); }, 'btn small'),
      button('R — референсы', () => refBox.classList.toggle('on'), 'btn small'),
      button(t('menu.back'), () => ctx.scenes.goto('MENU'), 'btn small'));
    table = el('table'); table.style.cssText = 'width:100%;border-collapse:collapse;font:600 10px var(--font);margin-top:6px';
    panel.append(views, acts, table, el('p', '', '←/→ облёт · ↑/↓ приближение · F3 — нет коллайдеров · таблица — в ОТЧЁТ.md'));
    ctx.uiRoot.append(panel);
    refBox = el('div', 'models-refs');
    refBox.style.cssText = 'position:absolute;left:330px;right:8px;bottom:8px;display:none;gap:4px;pointer-events:auto;z-index:20;background:rgba(18,14,26,.8);padding:4px;border-radius:8px';
    for (const f of REFS) { const im = el('img'); im.src = 'assets/refs/' + encodeURIComponent(f); im.style.cssText = 'height:96px;border-radius:4px'; im.alt = f; refBox.append(im); }
    ctx.uiRoot.append(refBox);
    const st = document.createElement('style'); st.textContent = '.models-refs.on{display:flex!important}.models-panel td,.models-panel th{border-bottom:1px solid #3a3346;padding:2px 3px;text-align:left}.models-panel tr.sum td{color:var(--gold)}.models-panel .btn.on{background:#3f7a4a}';
    panel.append(st);
    fillTable();
    window.addEventListener('keydown', onKey);
    place(); setView(0, true);
    W.prewarm();
  },
  update(dt) {
    time += dt;
    const a = ctx.input.axis();
    if (a.x) { yawO += a.x * dt * 1.4; }
    if (a.y) { zoom = Math.max(0.35, Math.min(2.5, zoom * (1 + a.y * dt * 1.2))); }
    aim(false);
    const k = 1 - Math.exp(-dt * 6);
    cur.pos.lerp(tgt.pos, k); cur.look.lerp(tgt.look, k);
    W.camera.position.copy(cur.pos); W.camera.lookAt(cur.look);
    for (const o of models) o.update(dt);
    legEar?.update(dt);
  },
  render() { W.render(); },
  pause() {}, resume() {},
  debugInfo() { return `MODELS: ${VIEWS[view].name}${lineup ? ' · как на .png' : ''} · одежда ${outfit}`; },
  get _dbg() { return { W, models, legEar, setView, camera: W?.camera, get lineup() { return lineup; }, setLineup(v) { lineup = v; place(); } }; },
  exit() {
    window.removeEventListener('keydown', onKey);
    panel?.remove(); panel = null; refBox?.remove(); refBox = null; table = null;
    legEar?.dispose?.(); legEar = null;
    for (const o of models || []) { disposeTree(o.m.group); o.m.dispose?.(); }
    models = null; ruler = null;
    W?.dispose(); W = null;
  },
};
export default scene;
