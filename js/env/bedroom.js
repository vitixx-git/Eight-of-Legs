// Спальня ночью — общее окружение S01, S02 и C_Levers. Единицы — см, Y вверх. Кровать вдоль Z, изголовье к −Z.
// Поверхности S02: F — пол (y 0), B — одеяло (карта высот с бугром над телом и складками), T — верх матраса (y 55),
// P — подушка (ямка у головы). Переходы: паутина W1 (F→B у изножья), W2 (T→P), края с анимацией 0,3 с —
// одеяла B↔T (z = −58) и подушки T↔P (с боков и спереди; по центру спереди — плечи спящего, сзади — изголовье).
// На подушке препятствия — голова (круг), подбородок и затылок (боксы): две половины, у каждой своё ухо.
// Лунный свет — 3 плоские аддитивные полосы, «облегающие» поверхности; «на свету» = центр паука внутри полосы.
import * as THREE from 'three';
import { CFG } from '../config.js';
import * as K from '../three/kit.js';
import { toonMaterial, addOutline, glassMaterial } from '../three/toon.js';
import { createScientist } from '../models/scientist.js';
import { createSpider } from '../models/spider.js';
import { mergeStatic } from '../three/kit.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const bell = (d, w) => Math.exp(-(d * d) / (w * w));

export const BED = {
  top: 55, blanket: 62, pillowTop: 63,
  blanketZ: [-58, 100], blanketX: 72, edgeZ: -58, edgeX: [26.5, 67],
  mattress: { x: 68, z0: -98, z1: 98 },
  pillow: { x: 42, z0: -100, z1: -69, cz: -85 },
  head: { x: 0, z: -87, r: 13 }, dipW: 8,
  shoulders: { x0: -26, x1: 26, z0: -72, z1: -58 }, chin: { x0: -10, x1: 10, z0: -76, z1: -58 },
  // затылок: голова лежит вплотную к изголовью — без этого между головой и задним краем подушки был «карман»,
  // в котором паук застревал; earAim — точка, куда смотрит камера на подушке (между центром головы и ухом)
  nape: { x0: -13, x1: 13, z0: -100, z1: -88 }, earAim: 6, camZMin: -97,
  wardrobe: { x0: 118, x1: 182, z0: 58, z1: 122, h: 190 },
  nightstand: { x0: -124, x1: -84, z0: -104, z1: -64, h: 56 },
  descent: [146, 0, 128],
  W1: { from: [0, 0, 122], to: [0, 0, 95], fromS: 'F', toS: 'B' },
  W2: { from: [56, 55, -88], to: [33, 0, -88], fromS: 'T', toS: 'P' },
  folds: [54, 16, -32], foldHalf: 4.5, foldAmp: 2.6,
  // полосы лунного света: центр XZ, длина вдоль, ширина поперёк, угол (рад) вокруг Y
  strips: [
    { c: [-20, 112], len: 260, w: 26, a: 0.16 },
    { c: [10, 18], len: 330, w: 32, a: 0.14 },
    { c: [36, -86], len: 150, w: 22, a: 0.10 },
  ],
  sleeperZ: -20, bedHeight: 66, neck: 30,
  room: { x0: -200, x1: 260, z0: -170, z1: 230, h: 260 },
};
// профиль бугра одеяла над телом вдоль z (грудь, живот, ноги, стопы)
const HUMP = [[-66, 8], [-58, 21], [-28, 21], [-6, 19], [14, 16], [28, 13], [52, 13], [64, 19], [86, 20], [97, 6], [104, 0]];
function humpA(z) {
  if (z <= HUMP[0][0]) return HUMP[0][1];
  for (let i = 1; i < HUMP.length; i++) if (z <= HUMP[i][0]) { const [z0, a0] = HUMP[i - 1], [z1, a1] = HUMP[i]; const u = (z - z0) / (z1 - z0); return a0 + (a1 - a0) * u * u * (3 - 2 * u); }
  return 0;
}
// высота одеяла (с напуском по бокам и в изножье); rustle — колыхание при ворочании
export function blanketH(x, z, rustle = 0) {
  const ax = Math.abs(x);
  let y = BED.blanket + humpA(z) * smooth(44, 14, ax) * (1 + rustle * 0.08 * Math.sin(z * 0.15));
  for (const zf of BED.folds) y += BED.foldAmp * bell(z - zf, 3.2);
  y += 2.2 * bell(z + 55.5, 2.4);
  if (ax > 72) y -= (ax - 72) * 2.8;
  if (z > 100) y -= (z - 100) * 4.3;
  return y;
}
export function pillowH(x, z) {
  const ex = smooth(42, 33, Math.abs(x)), ez = smooth(16, 10, Math.abs(z - BED.pillow.cz));
  const d = Math.hypot(x - BED.head.x, z - BED.head.z);
  return BED.top + 8 * Math.sqrt(ex * ez) - 2.2 * bell(d, 15);
}
// верхняя поверхность в точке (для «облегания» полос света, штриховки и тени ладони)
export function topY(x, z) {
  const ax = Math.abs(x);
  let y = 0;
  if (ax <= 74 && Math.abs(z) <= 104) y = ax <= BED.mattress.x && Math.abs(z) <= 98 ? BED.top : 38;
  if (ax <= BED.pillow.x && z >= BED.pillow.z0 && z <= BED.pillow.z1) y = Math.max(y, pillowH(x, z));
  if (ax <= 82 && z >= BED.blanketZ[0] - 2 && z <= 110) { const b = blanketH(x, z); if (b > 2) y = Math.max(y, b); }
  return y;
}
export function stripLocal(s, x, z) {
  const dx = x - s.c[0], dz = z - s.c[1], c = Math.cos(s.a), n = Math.sin(s.a);
  return [dx * c + dz * n, -dx * n + dz * c];
}
export function inMoon(x, z) {
  for (const s of BED.strips) { const [u, v] = stripLocal(s, x, z); if (Math.abs(u) <= s.len / 2 && Math.abs(v) <= s.w / 2) return true; }
  return false;
}
export function inFold(z) { for (const zf of BED.folds) if (Math.abs(z - zf) < BED.foldHalf) return true; return false; }
export function inDip(x, z) { const d = Math.hypot(x - BED.head.x, z - BED.head.z); return d >= BED.head.r && d <= BED.head.r + BED.dipW; }

// Поверхности: h(x,z), границы, коллайдеры (боксы/круги), направление камеры (XZ), локальный базис (u, v)
export function makeSurfaces() {
  const W = BED.wardrobe, N = BED.nightstand, R = BED.room;
  const S = {
    // пол: у левой стены и плинтуса задней — вплотную; у окна (x1) и открытого края (z1) — запас для камеры
    F: { id: 'F', h: () => 0, b: { x0: R.x0 + 3, x1: R.x1 - 12, z0: R.z0 + 4.5, z1: R.z1 - 12 }, cam: [-1, -0.1],
      boxes: [{ x0: -78, x1: 78, z0: -106, z1: 109 }, { x0: W.x0, x1: W.x1, z0: W.z0, z1: W.z1 }, { x0: N.x0, x1: N.x1, z0: N.z0, z1: N.z1 },
        { x0: 52, x1: 66, z0: 104, z1: 130 }, { x0: 30, x1: 44, z0: 116, z1: 142 }, { x0: -42, x1: -14, z0: 128, z1: 150 }, { x0: -178, x1: -122, z0: 30, z1: 90 }], circles: [] },
    B: { id: 'B', h: (x, z) => blanketH(x, z), b: { x0: -71, x1: 71, z0: BED.edgeZ + 0.01, z1: 99 }, cam: [0, -1], boxes: [], circles: [] },
    T: { id: 'T', h: () => BED.top, b: { x0: -67, x1: 67, z0: -97, z1: BED.edgeZ - 0.01 }, cam: [0, -1],
      boxes: [{ x0: -BED.pillow.x, x1: BED.pillow.x, z0: -110, z1: BED.pillow.z1 }, { ...BED.shoulders }], circles: [] },
    // на подушке камера смотрит из-за паука на голову, чуть в сторону уха своей половины: «вперёд» (W) с любой точки
    // половины приводит к уху (паук скользит по голове к нему), A/D — вокруг головы.
    // Подбородок/шея закрывают проход перед лицом, затылок — за головой: две половины подушки, у каждой своё ухо
    P: { id: 'P', h: (x, z) => pillowH(x, z), b: { x0: -40, x1: 40, z0: -98, z1: -71 }, cam: (x, z) => pillowCam(x, z), boxes: [{ ...BED.chin }, { ...BED.nape }],
      circles: [{ x: BED.head.x, z: BED.head.z, r: BED.head.r }] },
  };
  for (const s of Object.values(S)) { s.toUV = (x, z) => [x - s.b.x0, z - s.b.z0]; s.fromUV = (u, v) => [u + s.b.x0, v + s.b.z0]; }
  return S;
}
// цель — точка между центром головы и ухом своей половины: тогда «вперёд» стягивает паука по голове к уху, а не
// в сторону (к центру головы — паук останавливался там, где коснулся); за головой — не круче 1:4 к изножью
function pillowCam(x, z) {
  const dx = BED.head.x + (x < BED.head.x ? -BED.earAim : BED.earAim) - x;
  return [dx, Math.min(BED.head.z - z, 0.25 * Math.abs(dx))];
}
// направление камеры поверхности в точке (XZ, не нормировано)
export function surfCam(s, x, z) { return typeof s.cam === 'function' ? s.cam(x, z) : s.cam; }

// ---- навигация паука (чистые функции: их вызывает S02 и проверяет test.nav) ----
// Столкновения: границы поверхности и препятствия (боксы, круги), расширенные на радиус паука r
export function resolveOn(s, x, z, r) {
  const b = s.b;
  x = clamp(x, b.x0 + r, b.x1 - r); z = clamp(z, b.z0 + r, b.z1 - r);
  for (const bx of s.boxes) {
    const x0 = bx.x0 - r, x1 = bx.x1 + r, z0 = bx.z0 - r, z1 = bx.z1 + r;
    if (x > x0 && x < x1 && z > z0 && z < z1) {
      const px = Math.min(x - x0, x1 - x), pz = Math.min(z - z0, z1 - z);
      if (px < pz) x = x - x0 < x1 - x ? x0 : x1; else z = z - z0 < z1 - z ? z0 : z1;
    }
  }
  for (const c of s.circles) {
    const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), rr = c.r + r;
    if (d < rr) { const k = rr / Math.max(1e-4, d); x = c.x + dx * k; z = c.z + dz * k; }
  }
  return [x, z];
}
// Края-переходы (анимация 0,3 с). (x, z) — где паук сейчас, (nx, nz) — куда шагает, (vx, vz) — скорость.
// Правило одно: паук упёрся в край (шагнул за границу своей поверхности, уже расширенную на радиус) и идёт
// поперёк края со скоростью ≥ minV — перелезает; скольжение вдоль края ничего не делает.
// Одеяло B↔T — верхний край одеяла при |x| 26,5…67 (по центру — подбородок и плечи спящего).
// Подушка T↔P — её край на уровне матраса: с боков и спереди (|x| ≥ 27,4, рядом плечи); сзади — изголовье.
// Возвращает точку приземления { to, x, z } (внутри границ новой поверхности, вне препятствий) или null.
// (Раньше край одеяла срабатывал только при пересечении линии z = −58, а граница одеяла с радиусом паука
// держала его на 1,4 см раньше: при шаге 1/60 с (0,37 см) переход был недостижим — «невидимая стена».)
export function edgeStep(S, surf, x, z, nx, nz, vx, vz, r, minV) {
  const ax = Math.abs(nx), PL = BED.pillow, SH = BED.shoulders, PB = S.P.b, TB = S.T.b, BB = S.B.b, m = r + 0.6, sx = nx < 0 ? -1 : 1;
  const onEdgeX = ax >= BED.edgeX[0] && ax <= BED.edgeX[1], ex = sx * clamp(ax, SH.x1 + m, TB.x1 - m);
  if (surf === 'B' && nz < BB.z0 + r && onEdgeX && -vz >= minV) return { to: 'T', x: ex, z: BED.edgeZ - 3.5 };
  if (surf === 'T' && nz > TB.z1 - r && onEdgeX && vz >= minV) return { to: 'B', x: ex, z: BED.edgeZ + 3.5 };
  if (surf === 'T') {
    const X = PL.x + r, Z = PL.z1 + r;
    if (ax >= X || nz >= Z) return null; // не касается подушки
    if (Math.abs(x) >= X - 1e-6) { // сбоку
      const s0 = x < 0 ? -1 : 1;
      return -s0 * vx >= minV ? { to: 'P', x: s0 * (PB.x1 - m), z: clamp(nz, PB.z0 + m, PB.z1 - m) } : null;
    }
    if (ax < SH.x1 + r - 1e-6 || -vz < minV) return null; // спереди, но не у плеч
    return { to: 'P', x: sx * Math.min(ax, PB.x1 - m), z: PB.z1 - m };
  }
  if (surf === 'P') {
    if (ax > PB.x1 - r && sx * vx >= minV) return { to: 'T', x: sx * (PL.x + m), z: clamp(nz, TB.z0 + m, PB.z1 - m) };
    if (nz > PB.z1 - r && ax >= SH.x1 + r + 0.5 && vz >= minV) return { to: 'T', x: sx * clamp(ax, SH.x1 + m, TB.x1 - m), z: PL.z1 + m };
  }
  return null;
}
// Препятствия для камеры (AABB): шкаф, тумбочка, стул, изголовье; плюс стены комнаты
export const CAM_BLOCKERS = [
  { min: [118, 0, 58], max: [182, 196, 125] }, { min: [-124, 0, -104], max: [-84, 80, -64] },
  { min: [-174, 0, 36], max: [-126, 96, 84] }, { min: [-78, 18, -112], max: [78, 114, -100] },
];
const _ro = new THREE.Vector3(), _rd = new THREE.Vector3();
// Камера не уходит в мебель: отрезок цель→камера обрезается по первому пересечению (+ запас)
export function cameraClip(target, cam, margin = 3) {
  _rd.copy(cam).sub(target); const len = _rd.length(); if (len < 1e-3) return cam;
  _rd.divideScalar(len); let tMin = len;
  for (const b of CAM_BLOCKERS) {
    let t0 = 0, t1 = len, ok = true;
    for (let a = 0; a < 3 && ok; a++) {
      const o = target.getComponent(a), d = _rd.getComponent(a), lo = b.min[a], hi = b.max[a];
      if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) ok = false; continue; }
      let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) ok = false;
    }
    if (ok && t0 > 0.01 && t0 < tMin) tMin = t0;
  }
  if (tMin < len) cam.copy(target).addScaledVector(_rd, Math.max(4, tMin - margin));
  const R = BED.room; cam.x = clamp(cam.x, R.x0 + 4, R.x1 - 4); cam.z = clamp(cam.z, R.z0 + 4, R.z1 - 4); cam.y = Math.max(cam.y, 3);
  return cam;
}
// Нормаль поверхности по конечным разностям
export function surfNormal(s, x, z, out = new THREE.Vector3()) {
  const e = 0.8, hx = s.h(x + e, z) - s.h(x - e, z), hz = s.h(x, z + e) - s.h(x, z - e);
  return out.set(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
}

// Сетка, «облегающая» поверхности (полосы света, штриховка, тень ладони)
function drapeGrid(nu, nv, map) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2), idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = j * (nu + 1) + i; uv[k * 2] = i / nu; uv[k * 2 + 1] = j / nv; }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  g.userData.update = (fn) => {
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = j * (nu + 1) + i, [x, z] = fn(i / nu, j / nv); pos[k * 3] = x; pos[k * 3 + 1] = topY(x, z) + 0.35; pos[k * 3 + 2] = z; }
    g.attributes.position.needsUpdate = true; g.computeBoundingSphere();
  };
  if (map) g.userData.update(map);
  return g;
}
export function makeDiscDecal(material, rings = 6, segs = 28) {
  const g = drapeGrid(segs, rings);
  const m = new THREE.Mesh(g, material); m.renderOrder = 3; m.frustumCulled = false;
  m.userData.place = (cx, cz, r) => g.userData.update((u, v) => { const a = u * Math.PI * 2, rr = v * r; return [cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]; });
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Сборка спальни в root. opts.spider — добавить паука; opts.sleeper — спящий.
export function buildBedroom(root, { spider: withSpider = true, sleeper: withSleeper = true } = {}) {
  const P = CFG.palette.bedroom, R = BED.room;
  const statics = new THREE.Group(); statics.name = 'BEDROOM_STATIC'; root.add(statics);
  const dyn = new THREE.Group(); dyn.name = 'BEDROOM_DYNAMIC'; dyn.userData.dynamic = true; root.add(dyn);
  const noCast = { cast: false };
  // пол, стены
  K.box(statics, [R.x1 - R.x0, 4, R.z1 - R.z0], [(R.x0 + R.x1) / 2, -2, (R.z0 + R.z1) / 2], '#4a3a52', { cast: false, outline: 0 });
  for (let i = 0; i < 14; i++) K.box(statics, [R.x1 - R.x0, 0.3, 1.2], [(R.x0 + R.x1) / 2, 0.05, R.z0 + 14 + i * 29], '#3d3046', { cast: false, outline: 0, receive: true });
  K.box(statics, [R.x1 - R.x0, R.h, 6], [(R.x0 + R.x1) / 2, R.h / 2, R.z0 - 3], '#2e2a48', { ...noCast, outline: 0 });
  K.box(statics, [6, R.h, R.z1 - R.z0], [R.x0 - 3, R.h / 2, (R.z0 + R.z1) / 2], '#29253f', { ...noCast, outline: 0 });
  K.box(statics, [6, R.h, R.z1 - R.z0], [R.x1 + 3, R.h / 2, (R.z0 + R.z1) / 2], '#29253f', { ...noCast, outline: 0 });
  K.box(statics, [R.x1 - R.x0, 10, 3], [(R.x0 + R.x1) / 2, 5, R.z0 + 1.5], '#3d3046', { ...noCast, outline: 0.4 });
  // окно в правой стене (x = 260): рама, переплёт, стекло, луна, шторы
  const win = new THREE.Group(); win.position.set(R.x1 - 1, 0, 10); statics.add(win);
  const winPane = new THREE.Mesh(new THREE.BoxGeometry(2, 104, 124), new THREE.MeshBasicMaterial({ color: '#9fb4e8' }));
  winPane.position.set(R.x1 - 1, 158, 10); winPane.name = 'WINDOW_PANE'; dyn.add(winPane);
  for (const z of [-62, 0, 62]) K.box(win, [5, 110, 5], [-2, 158, z], '#d8d4ea', { ...noCast, outline: 0.4 });
  for (const y of [104, 158, 212]) K.box(win, [5, 5, 128], [-2, y, 0], '#d8d4ea', { ...noCast, outline: 0.4 });
  K.glass(win, [1, 100, 120], [-3, 158, 0]);
  for (const z of [-80, 80]) K.box(win, [6, 150, 22], [-6, 150, z], '#5a3a5a', { ...noCast, outline: 0.6 });
  // кровать: рама, ножки, изголовье, матрас (T)
  K.box(statics, [148, 18, 208], [0, 29, 0], '#5a4250');
  for (const x of [-68, 68]) for (const z of [-98, 98]) K.box(statics, [8, 20, 8], [x, 10, z], '#47323e', { outline: 0.4 });
  K.roundBox(statics, [152, 92, 8], [0, 66, -106], '#5a4250', { radius: 0.4 });
  K.box(statics, [136, 17, 196], [0, 46.5, 0], '#b4b2cf', { outline: 0.6 });
  // тумбочка, будильник, лампа
  const N = BED.nightstand;
  K.box(statics, [N.x1 - N.x0, N.h, N.z1 - N.z0], [(N.x0 + N.x1) / 2, N.h / 2, (N.z0 + N.z1) / 2], '#4a3440');
  K.box(statics, [30, 2, 2], [(N.x0 + N.x1) / 2, 40, N.z1 + 0.5], '#d9b45a', { outline: 0 });
  K.roundBox(statics, [12, 9, 6], [-112, N.h + 4.5, -84], '#d95a7a', { radius: 0.3 });
  K.cyl(statics, 6, 8, 16, [-96, N.h + 8, -90], '#6b4f7a');
  K.cone(statics, 13, 14, [-96, N.h + 22, -90], '#e8d6b0', { seg: 10 });
  // шкаф (паук начинает на нём)
  const Wd = BED.wardrobe, wx = (Wd.x0 + Wd.x1) / 2, wz = (Wd.z0 + Wd.z1) / 2;
  K.box(statics, [Wd.x1 - Wd.x0, Wd.h, Wd.z1 - Wd.z0], [wx, Wd.h / 2, wz], '#4a3440');
  K.box(statics, [2, Wd.h - 24, 29], [Wd.x0 - 1, Wd.h / 2 + 4, wz - 15.5], '#563c4a', { outline: 0.4 });
  K.box(statics, [2, Wd.h - 24, 29], [Wd.x0 - 1, Wd.h / 2 + 4, wz + 15.5], '#563c4a', { outline: 0.4 });
  for (const z of [-4, 4]) K.cyl(statics, 1.2, 1.2, 14, [Wd.x0 - 3, 105, wz + z], '#d9b45a', { outline: 0 });
  K.box(statics, [Wd.x1 - Wd.x0 + 6, 5, Wd.z1 - Wd.z0 + 6], [wx, Wd.h + 2.5, wz], '#3a2a34', { outline: 0.6 });
  // паутинка на шкафу
  const webM = new THREE.MeshBasicMaterial({ color: '#cfd8ff', transparent: true, opacity: 0.45, depthWrite: false });
  const thread = (a, b, r = 0.08, parent = statics, m = webM) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb); const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 4, 1, true), m); t.position.copy(va).add(vb).multiplyScalar(0.5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); parent.add(t); return t; };
  for (let i = 0; i < 5; i++) thread([Wd.x0 + 2, Wd.h + 5, Wd.z1 - 2 - i * 5], [Wd.x0 + 2 + i * 6, Wd.h + 5, Wd.z1 - 2]);
  // стул с одеждой, тапочки, книга, коврик
  K.box(statics, [44, 4, 44], [-150, 45, 60], '#5a4250'); K.box(statics, [44, 50, 4], [-150, 70, 38], '#5a4250');
  for (const x of [-170, -130]) for (const z of [40, 80]) K.box(statics, [4, 45, 4], [x, 22, z], '#47323e', { outline: 0.3 });
  K.roundBox(statics, [40, 7, 30], [-150, 50, 62], '#4a8fd9', { radius: 0.4 });
  K.roundBox(statics, [12, 7, 24], [59, 3.5, 117], '#8a5a8c', { radius: 0.4, rot: [0, 0.3, 0] });
  K.roundBox(statics, [12, 7, 24], [37, 3.5, 129], '#8a5a8c', { radius: 0.4, rot: [0, -0.2, 0] });
  K.box(statics, [26, 4, 20], [-28, 2, 139], '#815c6a', { rot: [0, 0.4, 0] });
  K.box(statics, [170, 0.4, 120], [0, 0.2, 150], '#6b4f7a', { cast: false, outline: 0 });
  // одеяло (карта высот, вершинные цвета: складки темнее, отворот светлее)
  const bl = new THREE.PlaneGeometry(164, 168, 40, 58); bl.rotateX(-Math.PI / 2); bl.translate(0, 0, 24);
  const bp = bl.attributes.position, col = new Float32Array(bp.count * 3), cA = new THREE.Color('#6d76a8'), cF = new THREE.Color('#4f5682'), cE = new THREE.Color('#c9c6e0'), tmpC = new THREE.Color();
  const shapeBlanket = (rustle = 0) => {
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), z = bp.getZ(i); bp.setY(i, Math.max(blanketH(x, z, rustle), 26)); }
    bp.needsUpdate = true; bl.computeVertexNormals();
  };
  for (let i = 0; i < bp.count; i++) {
    const z = bp.getZ(i); let k = 0; for (const zf of BED.folds) k = Math.max(k, bell(z - zf, 3.2));
    tmpC.copy(cA).lerp(cF, k * 0.9).lerp(cE, bell(z + 55.5, 2.6)); col.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
  }
  bl.setAttribute('color', new THREE.BufferAttribute(col, 3));
  shapeBlanket();
  const blanket = new THREE.Mesh(bl, toonMaterial('Blanket', '#ffffff', { vertexColors: true })); blanket.name = 'BLANKET';
  blanket.castShadow = true; blanket.receiveShadow = true; addOutline(blanket, 0.5); dyn.add(blanket);
  // подушка (P) — карта высот с ямкой
  const pg = new THREE.PlaneGeometry(86, 34, 24, 12); pg.rotateX(-Math.PI / 2); pg.translate(0, 0, BED.pillow.cz);
  const pp = pg.attributes.position; for (let i = 0; i < pp.count; i++) pp.setY(i, Math.max(pillowH(pp.getX(i), pp.getZ(i)), BED.top + 0.2));
  pg.computeVertexNormals();
  const pillow = new THREE.Mesh(pg, toonMaterial('Pillow', '#d8d4ea')); pillow.name = 'PILLOW'; pillow.receiveShadow = true; pillow.castShadow = true;
  addOutline(pillow, 0.4); statics.add(pillow);
  // полосы лунного света (аддитивные)
  const moonMat = new THREE.MeshBasicMaterial({ color: P.moon, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const strips = BED.strips.map((s, i) => {
    const g = drapeGrid(Math.ceil(s.len / 5), 4, (u, v) => { const lu = (u - 0.5) * s.len, lv = (v - 0.5) * s.w, c = Math.cos(s.a), n = Math.sin(s.a); return [s.c[0] + lu * c - lv * n, s.c[1] + lu * n + lv * c]; });
    const m = new THREE.Mesh(g, moonMat); m.name = 'MOON_STRIP_' + i; m.renderOrder = 2; dyn.add(m); return m;
  });
  // паутины W1/W2 с пульсирующим бликом
  const glintTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(220,235,255,.6)'); gr.addColorStop(1, 'rgba(200,220,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const glintMat = new THREE.SpriteMaterial({ map: glintTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const webs = {};
  const surfaces = makeSurfaces();
  for (const key of ['W1', 'W2']) {
    const w = BED[key], a = [...w.from], b = [...w.to];
    a[1] = surfaces[w.fromS].h(a[0], a[2]); b[1] = surfaces[w.toS].h(b[0], b[2]);
    const grp = new THREE.Group(); grp.name = 'WEB_' + key; dyn.add(grp);
    thread([a[0], a[1] + 0.3, a[2]], [b[0], b[1] + 0.6, b[2]], 0.1, grp, webM);
    thread([a[0] - 1.5, a[1] + 0.1, a[2] + 1], [b[0] - 0.5, b[1] + 0.5, b[2] + 0.5], 0.06, grp, webM);
    const s1 = new THREE.Sprite(glintMat); s1.scale.setScalar(5); s1.position.set(a[0], a[1] + 1.5, a[2]); grp.add(s1);
    const s2 = new THREE.Sprite(glintMat); s2.scale.setScalar(3.5); s2.position.set(b[0], b[1] + 1.5, b[2]); grp.add(s2);
    webs[key] = { a, b, group: grp, glints: [s1, s2], ...w };
  }
  // спящий (на спине, голова на подушке)
  let sleeper = null, earL = null, earR = null;
  if (withSleeper) {
    sleeper = createScientist({ outfit: 'pajama' }); sleeper.setOutfit?.('pajama');
    sleeper.group.position.set(0, 0, BED.sleeperZ); dyn.add(sleeper.group);
    sleeper.lie = (name = 'sleepBreath', extra = {}) => sleeper.animator.play(name, { supine: true, bedHeight: BED.bedHeight, neck: BED.neck, ...extra });
    sleeper.lie(); for (let i = 0; i < 8; i++) sleeper.animator.update(0.05);
    earL = sleeper.group.getObjectByName('Ear.L'); earR = sleeper.group.getObjectByName('Ear.R');
  }
  // ладонь для «прихлопа» (стилизованная), штриховка зоны и тень ладони
  const skin = '#e9b99a';
  const palm = new THREE.Group(); palm.name = 'SWAT_PALM'; palm.visible = false; dyn.add(palm);
  K.roundBox(palm, [11, 3, 12], [0, 0, 0], skin, { radius: 0.45, outline: 0.4 });
  for (let i = 0; i < 4; i++) K.capsule(palm, 1.3, 8, [-4.2 + i * 2.8, 0, -9], skin, { rot: [Math.PI / 2, 0, 0], outline: 0.3 });
  K.capsule(palm, 1.4, 7, [6.5, 0, -1], skin, { rot: [Math.PI / 2, 0, -0.9], outline: 0.3 });
  const hatchTex = canvasTex(128, 128, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(217,90,122,0.95)'; g.lineWidth = 9; for (let i = -w; i < w * 2; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i - w, w); g.stroke(); } });
  hatchTex.wrapS = hatchTex.wrapT = THREE.RepeatWrapping; hatchTex.repeat.set(5, 1);
  const zone = makeDiscDecal(new THREE.MeshBasicMaterial({ map: hatchTex, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  zone.visible = false; zone.name = 'SWAT_ZONE'; dyn.add(zone);
  const shadow = makeDiscDecal(new THREE.MeshBasicMaterial({ color: '#0b0712', transparent: true, opacity: 0.0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 }), 4, 20);
  shadow.visible = false; shadow.name = 'PALM_SHADOW'; dyn.add(shadow);
  // мягкое световое пятно под пауком — читаемость на тёмном одеяле
  const glowTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,210,.55)'); gr.addColorStop(0.55, 'rgba(255,230,200,.25)'); gr.addColorStop(1, 'rgba(255,230,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const glow = makeDiscDecal(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5 }), 3, 16);
  { const uv = glow.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { const a = uv.getX(i) * Math.PI * 2, r = uv.getY(i) * 0.5; uv.setXY(i, 0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r); } }
  glow.name = 'SPIDER_GLOW'; glow.visible = false; dyn.add(glow);
  // «!» над головой
  const bangTex = canvasTex(64, 64, (g, w) => { g.fillStyle = '#d9b45a'; g.beginPath(); g.arc(w / 2, w / 2, 28, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = '#1d1519'; g.stroke(); g.fillStyle = '#1d1519'; g.font = '900 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', w / 2, w / 2 + 2); });
  const bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: bangTex, depthTest: false, transparent: true })); bang.scale.setScalar(12); bang.position.set(0, 112, BED.head.z); bang.visible = false; bang.renderOrder = 9; dyn.add(bang);
  // паук
  let spider = null, spiderThread = null;
  if (withSpider) {
    spider = createSpider({ clips: false }); spider.group.name = 'SPIDER'; dyn.add(spider.group);
    spiderThread = thread([0, 0, 0], [0, 1, 0], 0.07, dyn, webM); spiderThread.visible = false;
  }
  mergeStatic(statics);
  // рассвет (C_Levers): тёплый свет в окне
  const dawnCols = { win: new THREE.Color('#ffcf8a'), night: new THREE.Color('#9fb4e8'), moonN: new THREE.Color(P.moon), moonD: new THREE.Color('#ffd9a0') };
  let rustleT = 0, t = 0, moonBase = 0.2;
  const env = {
    root, statics, dyn, sleeper, spider, spiderThread, palm, zone, shadow, bang, glow, webs, strips, blanket, surfaces,
    // уши: 'L' — справа от изножья (x > 0), 'R' — слева; подходят оба
    earWorld(out = new THREE.Vector3(), side = 'L') { const e = side === 'R' ? earR : earL; return e ? e.getWorldPosition(out) : out.set(side === 'R' ? -12 : 12, 74, BED.head.z); },
    headWorld(out = new THREE.Vector3()) { return sleeper ? sleeper.joints.head.getWorldPosition(out) : out.set(0, 74, BED.head.z); },
    rustle(dur = 0.6) { rustleT = dur; },
    setThread(a, b) { if (!spiderThread) return; const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = Math.max(0.01, va.distanceTo(vb)); spiderThread.visible = true; spiderThread.position.copy(va).add(vb).multiplyScalar(0.5); spiderThread.scale.set(1, len, 1); spiderThread.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); },
    hideThread() { if (spiderThread) spiderThread.visible = false; },
    setDawn(k) {
      k = clamp(k, 0, 1);
      winPane.material.color.copy(dawnCols.night).lerp(dawnCols.win, k);
      moonMat.color.copy(dawnCols.moonN).lerp(dawnCols.moonD, k); moonBase = 0.2 + 0.14 * k;
    },
    update(dt) {
      t += dt;
      sleeper?.animator.update(dt);
      if (rustleT > 0) { rustleT = Math.max(0, rustleT - dt); shapeBlanket(Math.sin(rustleT * 14) * rustleT * 2); if (rustleT === 0) shapeBlanket(0); }
      const g = 0.75 + 0.25 * Math.sin(t * Math.PI * 2 * CFG.spider3d.glintHz);
      for (const w of Object.values(webs)) { w.glints[0].material.opacity = g; w.glints[0].scale.setScalar(4 + 2 * g); }
      moonMat.opacity = moonBase + 0.015 * Math.sin(t * 0.9);
    },
  };
  return env;
}
// Свет спальни: полусфера + «луна» из окна с тенью
export const BEDROOM_LIGHTS = { dirPos: [520, 420, 40], target: [0, 30, 0], shadowExtent: 320, shadowFar: 1400, normalBias: 0.6 };
