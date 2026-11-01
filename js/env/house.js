// Дом учёного для S07, C_Wardrobe, S08, C_ExitHome. Основа — прототип js/house (комнаты, мебель, «кукольный домик»),
// поверх: винтовая лестница по CFG.stairs (позиция — (θ, r), θ копится непрерывно), дверные проёмы, галерея и коридор
// второго этажа, гардероб, низкие «срезы» передних стен, разрез по высоте человека и слияние статики (≈ 30 вызовов).
// Мировые координаты (см): x — запад(−)/восток(+), z — глубина (+ к камере), y — высота. 1-й этаж y 0, 2-й — y 300.
import * as THREE from 'three';
import { disposeTree } from '../three/toon.js';
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { buildHouse } from '../house/dollhouse.js';
import * as HK from '../house/kit.js';
import { label as kitLabel } from '../three/kit.js';
import { mergeStaticVC, createCutaway, mergeRigid } from '../three/merge.js';

const ST = CFG.stairs, HU = CFG.human, D2R = Math.PI / 180;
export const CX = ST.center[0], CZ = ST.center[1];
export const UP_Y = 300;
const SEG = (() => { // участки лестницы: [θ0, θ1, h0, h1]
  const [a1, b1, h1] = ST.landing1, [a2, b2, h2] = ST.landing2;
  return [[0, a1, 0, h1], [a1, b1, h1, h1], [b1, a2, h1, h2], [a2, b2, h2, h2], [b2, ST.sweep, h2, ST.rise]];
})();
// Высота «пандуса» в точке θ (градусы)
export function stairRamp(th) {
  if (th <= 0) return 0;
  for (const [a, b, h0, h1] of SEG) if (th <= b) return h0 + (h1 - h0) * (th - a) / Math.max(1e-6, b - a);
  return ST.rise;
}
// Ступени: каждые ~stepDeg на наклонных участках; площадки — сплошные
export const STEPS = (() => {
  const out = [];
  for (const [a, b, h0, h1] of SEG) {
    if (h0 === h1) { out.push({ a, b, top: h0, landing: true }); continue; }
    const n = Math.max(1, Math.round((b - a) / ST.stepDeg)), w = (b - a) / n;
    for (let i = 0; i < n; i++) out.push({ a: a + i * w, b: a + (i + 1) * w, top: h0 + (h1 - h0) * (i + 1) / n, landing: false });
  }
  return out;
})();
export function stairTop(th) {
  if (th <= 0) return 0;
  if (th >= ST.sweep) return ST.rise;
  for (const s of STEPS) if (th >= s.a && th < s.b) return s.top;
  return ST.rise;
}
// (θ, r) → мир. θ = 0 — запад (к прихожей), 90 — к камере, 180 — восток, 540 — восток наверху (к кабинету)
export function stairPos(th, r, out = new THREE.Vector3()) { const a = th * D2R; return out.set(CX - r * Math.cos(a), stairTop(th), CZ + r * Math.sin(a)); }
export function stairAngle(x, z) { return Math.atan2(z - CZ, -(x - CX)) / D2R; } // (−180, 180]
export const wrapDeg = (d) => { d = ((d + 180) % 360 + 360) % 360 - 180; return d; };
export function tangentYaw(th, dir = 1) { // курс модели (рад) вдоль кольца при росте θ
  const a = th * D2R, dx = Math.sin(a) * dir, dz = Math.cos(a) * dir; return Math.atan2(dx, dz);
}

// ---- навигация по этажам: прямоугольники «где может стоять центр человека» (уже с учётом радиуса 24) ----
const R = HU.radius;
export const NAV = {
  0: { rects: [
    { id: 'HALL', x0: -430 + R, x1: -130 - R, z0: -180 + R, z1: 20 - R },
    { id: 'DOOR_STAIRS_G', x0: -165, x1: -112, z0: -90 + R, z1: -10 - R, door: true },
  ] },
  300: { rects: [
    { id: 'STUDY', x0: 130 + R, x1: 550 - R, z0: -180 + R, z1: 180 - R },
    { id: 'DOOR_STAIRS_U', x0: 112, x1: 165, z0: -90 + R, z1: -10 - R, door: true },
    { id: 'DOOR_GALLERY', x0: 90, x1: 165, z0: 100 + R, z1: 170 - R, door: true },
    { id: 'GALLERY', x0: -154, x1: 122 - R, z0: 80 + R, z1: 182 - R },
    { id: 'CORRIDOR', x0: -430 + R, x1: -130, z0: 28 + R, z1: 182 - R },
    { id: 'DOOR_BATH', x0: -300 + R, x1: -210 - R, z0: -12, z1: 60, door: true },
    { id: 'BATH', x0: -380 + R, x1: -130 - R, z0: -180 + R, z1: 20 - R },
  ] },
};
export const DOORS = {
  stairsG: { floor: 0, rect: 'DOOR_STAIRS_G', th: [ST.startR ? -8 : -8, 10] },
  stairsU: { floor: 300, rect: 'DOOR_STAIRS_U', th: [530, ST.sweep + 8] },
};
export const POINTS = {
  S07start: [-330, 0, -60], frontDoor: [-430, 0, -110], frontDoorStand: [-395, 0, -110],
  sink: [-305, 300, -147], sinkStand: [-305, 300, -108], wardrobe: [-392, 300, 108], wardrobeStand: [-335, 300, 108],
  S08start: [-330, 300, 108], mirror: [300, 300, 0], keysStand: [214, 300, 66], studyIn: [150, 300, 135], stairTopU: [150, 300, -50], stairBottomG: [-150, 0, -50],
};

function inRect(r, x, z) { return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1; }

export async function buildHouseEnv(ctx, { mode = 'S07', street = false } = {}) {
  const H = await buildHouse();
  const scene = H.scene, root = H.root;
  scene.background = new THREE.Color(CFG.palette.house.bg);
  const room = (key) => H.rooms[key];
  const roomRoot = (key) => H.rooms[key].root;
  const own = new THREE.Group(); own.name = 'HOUSE_GAME'; root.add(own); // добавленное нами (мировые координаты)
  const dyn = new THREE.Group(); dyn.name = 'HOUSE_DYNAMIC'; dyn.userData.dynamic = true; root.add(dyn);
  const WOOD = '#b08a5a', DARK = '#6b4a32';

  // ---- свет: тень статики один раз (autoUpdate выключен на время сцены), лампы-заглушки убираем ----
  const sun = H.lighting.sun, sz = ctx.renderer.shadowSize || 0;
  sun.castShadow = sz > 0; if (sz > 0) sun.shadow.mapSize.set(sz, sz);
  scene.traverse((o) => { if (o.isPointLight) o.visible = false; });

  // ---- убрать старую лестницу и крышу (разрез «кукольного домика»; крыша — только снаружи) ----
  H.stairs.owned.visible = false;
  const roofParts = H.exterior.children.filter((o) => o.name === 'ROOF' || o.name === 'RoofCornice');
  for (const o of roofParts) o.visible = false;
  const path = H.exterior.children.find((o) => o.name === 'PATH'); if (path) path.visible = false;
  // режим «улица» (C_ExitHome): газон прототипа убираем — улица строит свой, ниже пола на 60 см (крыльцо и 3 ступени)
  if (street) { const lawn = H.exterior.children.find((o) => o.name === 'LAWN'); if (lawn) lawn.visible = false; }

  // ---- проёмы: прихожая → лестница (восточная стена), кабинет → лестница и → галерея (западная стена) ----
  const WALL_T = 8;
  function wallZ(parent, color, x, z0, z1, y0, y1, name = 'WallSeg') { if (z1 - z0 < 1) return; HK.box(parent, name, [WALL_T, y1 - y0, z1 - z0], [x, (y0 + y1) / 2, (z0 + z1) / 2], color, 0.8); }
  function doorFrameZ(parent, x, z0, z1, y0) {
    for (const z of [z0, z1]) HK.box(parent, 'DoorFrame', [WALL_T + 4, 215, 7], [x, y0 + 107.5, z], DARK, 0.8);
    HK.box(parent, 'DoorFrameTop', [WALL_T + 4, 8, z1 - z0 + 7], [x, y0 + 215, (z0 + z1) / 2], DARK, 0.8);
  }
  {
    const hall = roomRoot('HALL'); hall.getObjectByName('RIGHT_WALL').visible = false;
    const c = '#e9dcc4';
    wallZ(own, c, -126, -184, -90, 0, 260); wallZ(own, c, -126, -10, 24, 0, 260); wallZ(own, c, -126, -90, -10, 215, 260, 'Lintel');
    doorFrameZ(own, -126, -90, -10, 0);
    // входная дверь (западная стена прихожей): настоящий проём и створка на петлях (открывается наружу)
    const lw = hall.getObjectByName('LEFT_WALL'), sw = lw?.getObjectByName('SideWall');
    if (sw) {
      lw.visible = false;
      const col = '#' + sw.material.color.getHexString(), hg = sw.geometry.parameters.height;
      wallZ(own, col, -434, -180, -151, 0, hg); wallZ(own, col, -434, -69, 20, 0, hg); wallZ(own, col, -434, -151, -69, 212, hg, 'Lintel');
      for (const [z0, z1] of [[-180, -151], [-69, 20]]) HK.box(own, 'Baseboard', [3, 9, z1 - z0], [-429, 4.5, (z0 + z1) / 2], WOOD, 0.8);
      doorFrameZ(own, -431, -153, -67, -3);
    }
  }
  const frontDoor = new THREE.Group(); frontDoor.name = 'FRONT_DOOR_PIVOT'; frontDoor.position.set(-431, 0, -69); dyn.add(frontDoor);
  {
    HK.box(frontDoor, 'DoorLeaf', [5, 208, 80], [0, 104, -41], '#8b5a3c', 1.2);
    HK.box(frontDoor, 'DoorPanel', [6, 70, 56], [0, 150, -41], '#9a6b4a', 0.6); HK.box(frontDoor, 'DoorPanel', [6, 80, 56], [0, 58, -41], '#9a6b4a', 0.6);
    for (const x of [-4, 4]) HK.sphere(frontDoor, 'Handle', 3, [x, 98, -70], '#d1b36f', 0.4);
    mergeRigid(frontDoor);
    const lb = HK.label(frontDoor, 'DoorLabel', t('world.home'), 50, 12, [3.6, 196, -41]); lb.rotation.y = Math.PI / 2;
  }
  {
    const study = roomRoot('STUDY'); study.getObjectByName('LEFT_WALL').visible = false;
    const s = '#e6d0ae';
    wallZ(own, s, 126, -184, -90, 300, 560); wallZ(own, s, 126, -10, 100, 300, 560); wallZ(own, s, 126, 170, 184, 300, 560);
    wallZ(own, s, 126, -90, -10, 515, 560, 'Lintel'); wallZ(own, s, 126, 100, 170, 515, 560, 'Lintel');
    doorFrameZ(own, 126, -90, -10, 300); doorFrameZ(own, 126, 100, 170, 300);
  }
  // задняя стена колодца
  HK.box(own, 'WellBackWall', [260, 560, 8], [0, 280, -184], '#d9c5a5', 0.8);
  // ---- винтовая лестница ----
  // лестница — 3 группы по полвитка (θ 0–180, 180–360, 360–540): вышележащий виток над человеком прозрачнеет
  const stair = new THREE.Group(); stair.name = 'SPIRAL_STAIRS'; dyn.add(stair);
  const stairSeg = [0, 1, 2].map((k) => { const g = new THREE.Group(); g.name = 'STAIR_SEG' + k; g.userData.th0 = k * 180; stair.add(g); return g; });
  const segOf = (th) => stairSeg[Math.max(0, Math.min(2, Math.floor(th / 180)))];
  const R_IN = ST.post / 2, R_OUT = ST.well / 2 - 4;
  const stepMat = WOOD;
  for (const s of STEPS) {
    const a = s.a * D2R, b = s.b * D2R, shape = new THREE.Shape();
    // в плоскости XY: x = −r cosθ, y = r sinθ (потом поворот → z), см. stairPos
    const P = (r, ang) => new THREE.Vector2(-r * Math.cos(ang), r * Math.sin(ang));
    const n = Math.max(2, Math.ceil((s.b - s.a) / 7.5));
    shape.moveTo(P(R_IN, a).x, P(R_IN, a).y);
    for (let i = 0; i <= n; i++) { const p = P(R_OUT, a + (b - a) * i / n); shape.lineTo(p.x, p.y); }
    for (let i = n; i >= 0; i--) { const p = P(R_IN, a + (b - a) * i / n); shape.lineTo(p.x, p.y); }
    const th = s.landing ? 10 : 7;
    const g = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(Math.PI / 2); // y(shape) → z, extrude вниз
    const m = HK.mesh(segOf((s.a + s.b) / 2), s.landing ? 'StairLanding' : 'StairStep', g, s.landing ? '#a17450' : stepMat, [CX, s.top, CZ], 0.8);
    m.receiveShadow = true;
    // подступенок (тонкая «щека» вдоль внешнего края)
  }
  // столб — отдельно: прозрачнеет, когда человек за ним
  const postMat = HK.material('StairPost', DARK);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(R_IN, R_IN, 560, 14), postMat); post.position.set(CX, 280, CZ); post.name = 'STAIR_POST';
  post.castShadow = true; dyn.add(post);
  // перила: стойки каждые 15° и спиральный поручень
  for (let k = 0; k < 3; k++) {
    const railPts = [];
    for (let th = k * 180; th <= (k + 1) * 180 + 0.01; th += 7.5) { const p = stairPos(th, R_OUT - 3); railPts.push(new THREE.Vector3(p.x, stairRamp(th) + 92, p.z)); }
    HK.mesh(stairSeg[k], 'StairRail', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 40, 2.2, 6, false), DARK, [0, 0, 0], 0.5);
  }
  for (let th = 7.5; th < ST.sweep; th += 15) { const p = stairPos(th, R_OUT - 3); HK.cylinder(segOf(th), 'RailPost', 1.3, 92, [p.x, p.y + 46, p.z], DARK, 0.4, 6); }
  // ---- галерея 2-го этажа перед колодцем ----
  // галерея стоит перед колодцем: пока человек не на 2-м этаже — она полупрозрачна (иначе закрывает лестницу)
  const gallery = new THREE.Group(); gallery.name = 'GALLERY'; dyn.add(gallery);
  HK.box(gallery, 'GallerySlab', [260, 12, 102], [0, 294, 131], '#a17450', 1.2);
  HK.box(gallery, 'GalleryBeam', [260, 18, 102], [0, 279, 131], WOOD, 1);
  for (let x = -125; x <= 125; x += 25) HK.cylinder(gallery, 'GalleryPost', 1.3, 90, [x, 345, 82], DARK, 0.4, 6);
  HK.box(gallery, 'GalleryRail', [260, 4, 5], [0, 390, 82], DARK, 0.5);
  // ---- низкие «срезы» передних стен (видно, где стена и где дверь) ----
  const CUT = 34, cap = '#5a3f2c';
  function stubX(x0, x1, z, y0, color) { if (x1 - x0 < 1) return; HK.box(own, 'CutWall', [x1 - x0, CUT, WALL_T], [(x0 + x1) / 2, y0 + CUT / 2, z], color, 0.8); HK.box(own, 'CutCap', [x1 - x0, 3, WALL_T + 1], [(x0 + x1) / 2, y0 + CUT + 1.5, z], cap, 0); }
  stubX(-430, -130, 24, 0, '#e9dcc4');                 // прихожая
  stubX(130, 550, 184, 0, '#d2d7ba');                  // гостиная
  stubX(-380, -300, 24, 300, '#c4dad5'); stubX(-210, -130, 24, 300, '#c4dad5'); // ванная (проём −300…−210)
  stubX(130, 550, 184, 300, '#e6d0ae');                // кабинет
  stubX(-430, 130, 186, 300, '#e9dcc4');               // коридор и галерея (фасад)
  for (const x of [-300, -210]) HK.box(own, 'DoorFrame', [7, 215, WALL_T + 4], [x, 300 + 107.5, 24], DARK, 0.8);
  HK.box(own, 'DoorFrameTop', [97, 8, WALL_T + 4], [-255, 300 + 215, 24], DARK, 0.8);
  // ---- ванная: зеркало над раковиной закрыто полотенцем ----
  {
    const bath = roomRoot('BATH');
    HK.box(bath, 'MirrorTowel', [80, 64, 3], [-50, 150, -90], '#8fb3c9', 0.8);
    HK.box(bath, 'MirrorTowelHem', [82, 6, 4], [-50, 120, -89], '#7798b1', 0.5);
  }
  // ---- гардероб в коридоре (C_Wardrobe) ----
  const wardrobe = new THREE.Group(); wardrobe.name = 'WARDROBE'; wardrobe.position.set(-400, 300, 108); dyn.add(wardrobe);
  HK.box(wardrobe, 'WardrobeBody', [56, 215, 120], [0, 107.5, 0], '#8b5a3c', 2);
  HK.box(wardrobe, 'WardrobeTop', [62, 8, 126], [0, 219, 0], DARK, 1);
  const wDoors = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(29, 0, s * 59); wardrobe.add(pivot);
    HK.box(pivot, 'WardrobeDoor', [4, 200, 58], [1, 106, -s * 29], '#9a6b4a', 1);
    HK.sphere(pivot, 'WardrobeKnob', 2.5, [4, 110, -s * 52], '#d1b36f', 0.4);
    wDoors.push(pivot);
  }
  const wLabel = kitLabel(wardrobe, t('world.wardrobe'), { w: 44, h: 10, pos: [31.5, 190, 0], rot: [0, Math.PI / 2, 0] });
  // ---- кабинет: свободное напольное зеркало (S08) вместо прототипного ----
  const study = roomRoot('STUDY');
  const oldMirror = study.getObjectByName('MIRROR_STAND'); if (oldMirror) oldMirror.visible = false;
  const mirrorStand = new THREE.Group(); mirrorStand.name = 'FLOOR_MIRROR'; mirrorStand.position.set(...POINTS.mirror); dyn.add(mirrorStand);
  HK.box(mirrorStand, 'MirrorFrame', [52, 204, 6], [0, 104, -2], '#8b5a3c', 2);
  HK.box(mirrorStand, 'MirrorFoot', [56, 6, 36], [0, 3, -2], DARK, 1.5);
  HK.box(mirrorStand, 'MirrorBack', [8, 120, 28], [0, 60, -14], DARK, 1);
  // ---- предметы S08 и прочая «динамика» не сливаются ----
  for (const name of ['PASS_CARD', 'MUG_COFFEE', 'NOTEBOOK', 'KEYS', 'CHAIR', 'Drehpunkt']) root.traverse((o) => { if (o.name === name) o.userData.dynamic = true; });
  const front = roomRoot('HALL').getObjectByName('FRONT_DOOR'); if (front) { front.userData.dynamic = true; front.visible = false; }
  // подвижные группы: сливаем их части по шарнирам (вместе с контурами) — заметно меньше вызовов отрисовки
  {
    const rigid = new Set(['PASS_CARD', 'MUG_COFFEE', 'NOTEBOOK', 'KEYS', 'chair_wood', 'EntryDoor']), found = [];
    for (const key of ['HALL', 'STUDY']) roomRoot(key).traverse((o) => { if (rigid.has(o.name)) found.push(o); });
    for (const o of found) mergeRigid(o);
    mergeRigid(wardrobe); mergeRigid(mirrorStand); mergeRigid(gallery);
    for (const g of stairSeg) { mergeRigid(g); g.traverse((o) => { if (o.isMesh && !o.userData.outline) o.receiveShadow = true; }); }
  }
  // ---- препятствия на лестнице ----
  const obstacles = {};
  function makeObstacle(o) {
    const g = new THREE.Group(); g.name = o.id; dyn.add(g);
    const thM = (o.th[0] + o.th[1]) / 2, rM = (o.r[0] + o.r[1]) / 2, p = stairPos(thM, rM);
    g.position.set(p.x, stairTop(thM), p.z); g.rotation.y = tangentYaw(thM);
    if (o.kind === 'sock') { HK.box(g, 'Sock', [10, 3, 22], [0, 1.5, 0], '#d95a7a', 0.4); HK.box(g, 'SockToe', [10, 3.2, 6], [0, 1.6, 9], '#f2ece0', 0.3); HK.box(g, 'SockHeel', [10, 6, 7], [0, 3, -9], '#d95a7a', 0.3); }
    else if (o.id.startsWith('BOX')) { HK.box(g, 'Box', [30, 26, 30], [0, 13, 0], '#c49d58', 1); HK.box(g, 'BoxTape', [31, 1, 6], [0, 26.2, 0], '#e8d6a8', 0); }
    else if (o.id.startsWith('BOOT')) { HK.box(g, 'Boot', [12, 22, 14], [0, 11, -4], '#4a3428', 0.8); HK.box(g, 'BootToe', [12, 9, 16], [0, 4.5, 8], '#4a3428', 0.6); }
    else if (o.kind === 'puddle') { const m = HK.mesh(g, 'Puddle', new THREE.CircleGeometry(1, 20), '#9fd3e6', [0, 0.6, 0], 0); m.rotation.x = -Math.PI / 2; m.scale.set(30, 22, 1); m.material.transparent = true; m.material.opacity = 0.7; m.material.depthWrite = false; m.castShadow = false; }
    mergeRigid(g);
    obstacles[o.id] = { ...o, group: g };
    return g;
  }
  const obsList = mode === 'S08' ? ST.obstacles.map((o) => (o.id === 'BOX_STAIR' ? ST.prepBox : o.id === 'BOOT_STAIR' ? ST.prepBoot : o)).filter((o) => o.kind !== 'sock') : ST.obstacles;
  for (const o of obsList) makeObstacle(o);
  // ---- колайдеры по этажам (мировые AABB, ещё не расширенные на радиус) ----
  function worldBox(key, b) { const off = H.rooms[key].root.position; return { x0: b.min.x + off.x, x1: b.max.x + off.x, z0: b.min.z + off.z, z1: b.max.z + off.z }; }
  const boxes = { 0: [], 300: [] };
  function refreshBoxes() {
    boxes[0].length = 0; boxes[300].length = 0;
    for (const key of ['HALL', 'STUDY']) { const f = room(key); f.refreshColliders(); for (const c of f.colliders) boxes[key === 'HALL' ? 0 : 300].push({ name: c.name, ...worldBox(key, c.box) }); }
    boxes[300].push({ name: 'DESK', x0: 340 - 90, x1: 340 + 50, z0: -180, z1: -110 });
    boxes[300].push({ name: 'SINK', x0: -305 - 36, x1: -305 + 36, z0: -147 - 24, z1: -147 + 24 });
    boxes[300].push({ name: 'BATHTUB', x0: -158 - 30, x1: -130, z0: -90 - 86, z1: -90 + 86 });
    boxes[300].push({ name: 'WARDROBE', x0: -430, x1: -370, z0: 108 - 62, z1: 108 + 62 });
    const mp = mirrorStand.position; boxes[300].push({ name: 'MIRROR', x0: mp.x - 28, x1: mp.x + 28, z0: mp.z - 20, z1: mp.z + 16 });
  }
  refreshBoxes();
  // ---- слияние статики по полосам высоты ----
  const band = (y) => (y < 258 ? 0 : y < 298 ? 1 : y < 400 ? 2 : y < 559 ? 3 : 4);
  const merged = mergeStaticVC(root, { band, skip: (o) => o === post });
  const cut = createCutaway(merged.meshes, { opacity: 0.2 });
  // несливаемая «динамика» тоже уходит в разрез (кроме столба — у него своя прозрачность — и препятствий лестницы)
  for (const o of [wardrobe, mirrorStand]) cut.addObject(o);
  const galleryItems = cut.addObject(gallery, { manual: true });
  const segItems = stairSeg.map((g) => cut.addObject(g, { manual: true }));
  for (const name of ['PASS_CARD', 'MUG_COFFEE', 'NOTEBOOK', 'KEYS', 'CHAIR']) { const o = root.getObjectByName(name); if (o) cut.addObject(o); }
  // ---- API ----
  const env = {
    H, scene, root, own, dyn, stair, stairSeg, gallery, post, wardrobe, wDoors, wLabel, mirrorStand, obstacles, boxes, cut,
    rooms: H.rooms, room, roomRoot, refreshBoxes,
    lastCutN: -1,
    // разрез: всё выше «человек + 80 см» — прозрачность 0,2
    // stairTh — θ человека, если он на лестнице (иначе null)
    setCut(feetY, stairTh = null) {
      const th = feetY + HU.height + HU.cutaway;
      let n = cut.set(th, th + 60);
      n += cut.setManual(galleryItems, feetY < UP_Y - 10, feetY < 150);
      segItems.forEach((items, k) => { n += cut.setManual(items, stairTh != null && k * 180 - stairTh > 150, false) * (k + 1) * 100; });
      if (n !== env.lastCutN) { env.lastCutN = n; ctx.renderer.three.shadowMap.needsUpdate = true; }
      return n;
    },
    showRoof(on) { for (const o of roofParts) o.visible = on; },
    frontDoor, frontK: 0, frontTo: 0,
    setFrontDoor(k, instant = false) { env.frontTo = k; if (instant) { env.frontK = k; frontDoor.rotation.y = k * 1.85; } },
    item(name) { let r = null; root.traverse((o) => { if (!r && o.name === name) r = o; }); return r; },
    inRect, NAV,
    rectAt(floor, x, z) { for (const r of NAV[floor]?.rects || []) if (inRect(r, x, z)) return r; return null; },
    update(dt, time) {
      H.update(time, 0);
      if (Math.abs(env.frontTo - env.frontK) > 1e-3) { env.frontK += (env.frontTo - env.frontK) * (1 - Math.exp(-(dt || 0) * 5)); frontDoor.rotation.y = env.frontK * 1.85; }
    },
    dispose() {
      cut.dispose();
      ctx.renderer.three.shadowMap.autoUpdate = true;
      // сначала всё дерево сцены (в т.ч. слитая статика, обводки, подписи), потом H.dispose() — он делает scene.clear()
      try { disposeTree(scene, { detach: false }); } catch (e) { console.warn('[house dispose tree]', e); }
      try { H.dispose(); } catch (e) { console.warn('[house dispose]', e); }
    },
  };
  // тень статики — один раз; потом — только при смене разреза
  ctx.renderer.three.shadowMap.autoUpdate = false; ctx.renderer.three.shadowMap.needsUpdate = true;
  return env;
}
