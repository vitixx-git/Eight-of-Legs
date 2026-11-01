// Улица между домом учёного и лабораторией №3 (C_ExitHome, C_LabEntry). Координаты — мировые координаты дома (см):
// дом x −430…550, входная дверь в западной стене x −430, z −110. Улица уходит на запад (−x), разметка — как в S09:
// крыльцо + 3 ступени → дорожка → тротуар → полосы 1–2 (поток к −z) → островок со светофором → полосы 3–5 (к +z)
// → тротуар → фасад лаборатории (x −2300) со стеклянными раздвижными дверями (z −110), козырьком, вывеской
// «ЛАБОРАТОРИЯ №3» и считывателем пропусков (LED красный → зелёный). Статика сливается (≈ 6 вызовов отрисовки).
import * as THREE from 'three';
import { t } from '../text/ru.js';
import * as HK from '../house/kit.js';
import { label as kitLabel } from '../three/kit.js';
import { glassMaterial, disposeTree } from '../three/toon.js';
import { mergeStaticVC, mergeRigid } from '../three/merge.js';

export const G = -60;                 // верх газона (газон дома в режиме «улица» опущен — у крыльца 3 ступени)
export const WALK = G + 2, ROAD = G - 12;
export const ST = {
  doorZ: -110,
  porch: [-520, -434], porchW: 130,
  steps: [[-550, -520, -15], [-580, -550, -30], [-610, -580, -45]], // [x0, x1, верх]
  path: [-800, -610],
  walkNear: [-890, -800], lanesA: [-1330, -890], island: [-1450, -1330], lanesB: [-2110, -1450], walkFar: [-2300, -2110],
  lane: 220,
  labX: -2300, labZ: [-560, 340], labDepth: 640, labH: 560,
  labDoor: [-190, -30], doorH: 232,
  reader: [-2295, WALK + 128, -232],
  curb: [-872, WALK, -110],
  laneX: (n) => (n <= 2 ? -890 - (n - 0.5) * 220 : -1450 - (n - 2.5) * 220),
};
const CONCRETE = '#cfc8ba', CURB = '#e4dfd4', ASPHALT = '#565a60', LINE = '#f2ece0', GRASS = '#7fa65a', METAL = '#4d5a60';
const LAB_WALL = '#d3dcdc', LAB_TEAL = '#3fa7a0', LAB_DARK = '#2f4a50', WIN = '#7fb8c9';

let blobTex = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 31);
  g.addColorStop(0, 'rgba(20,16,24,0.55)'); g.addColorStop(1, 'rgba(20,16,24,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  blobTex = new THREE.CanvasTexture(c); blobTex.userData.shared = true;
  return blobTex;
}
// мягкая «тень-пятно» (улица вне теневой камеры дома)
export function blobShadow(parent, w, d, y = 0.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 1; m.name = 'BlobShadow'; parent.add(m); return m;
}

function makeCar(parent, color) {
  const g = new THREE.Group(); g.name = 'PASSING_CAR'; parent.add(g);
  const body = new THREE.Group(); body.name = 'CarBody'; g.add(body);
  HK.box(body, 'CarHull', [168, 52, 400], [0, 50, 0], color, 2);
  HK.box(body, 'CarCabin', [148, 46, 205], [0, 99, -22], color, 2);
  HK.box(body, 'CarGlass', [150, 30, 207], [0, 102, -22], '#3f5a6b', 0);
  HK.box(body, 'CarBumperF', [172, 16, 12], [0, 34, 202], '#3a3a40', 1);
  HK.box(body, 'CarBumperB', [172, 16, 12], [0, 34, -202], '#3a3a40', 1);
  for (const x of [-60, 60]) {
    HK.box(body, 'CarHeadlight', [30, 12, 3], [x, 60, 201], '#fff6c8', 0);
    HK.box(body, 'CarTaillight', [28, 10, 3], [x, 62, -201], '#e04848', 0);
  }
  for (const [x, z] of [[-80, 125], [80, 125], [-80, -125], [80, -125]]) {
    const w = HK.cylinder(body, 'CarWheel', 31, 22, [x, 31, z], '#26262b', 1.2, 12); w.rotation.z = Math.PI / 2;
    const h = HK.cylinder(body, 'CarHub', 13, 23, [x, 31, z], '#c9cdd2', 0, 8); h.rotation.z = Math.PI / 2;
  }
  mergeRigid(g);
  blobShadow(g, 230, 470, 0.6);
  return g;
}

function tree(parent, x, z, s = 1) {
  HK.cylinder(parent, 'TreeTrunk', 10 * s, 170 * s, [x, G + 85 * s, z], '#7a5a3e', 2, 8);
  const a = HK.mesh(parent, 'TreeCrown', new THREE.IcosahedronGeometry(85 * s, 0), '#5f9a4f', [x, G + 230 * s, z], 3);
  const b = HK.mesh(parent, 'TreeCrown', new THREE.IcosahedronGeometry(62 * s, 0), '#74ad5c', [x + 30 * s, G + 300 * s, z - 20 * s], 3);
  a.rotation.y = x * 0.01; b.rotation.y = z * 0.013;
}

// opts.house — рядом есть дом (крыльцо, дорожка, кусты); opts.far — дальняя граница по z
export function buildStreet(scene, { house = true, light = true } = {}) {
  const root = new THREE.Group(); root.name = 'STREET'; scene.add(root);
  const stat = new THREE.Group(); stat.name = 'STREET_STATIC'; root.add(stat);
  const dyn = new THREE.Group(); dyn.name = 'STREET_DYNAMIC'; root.add(dyn);
  const Z0 = -4200, Z1 = 4200, ZL = Z1 - Z0, ZC = (Z0 + Z1) / 2;
  const slab = (name, x0, x1, top, th, color, w = 0, z0 = Z0, z1 = Z1) => {
    const m = HK.box(stat, name, [x1 - x0, th, z1 - z0], [(x0 + x1) / 2, top - th / 2, (z0 + z1) / 2], color, w); m.castShadow = false; m.receiveShadow = true; return m;
  };
  // ---- земля ----
  slab('LawnEast', -800, 3200, G, 30, GRASS);
  slab('LawnWest', -4600, -2300, G, 30, GRASS);
  slab('Road', ST.lanesB[0], ST.lanesA[1], ROAD, 30, ASPHALT);
  slab('WalkNear', ST.walkNear[0], ST.walkNear[1], WALK, 30, CONCRETE);
  slab('CurbNear', ST.walkNear[0] - 2, ST.walkNear[0] + 10, WALK + 1, 16, CURB);
  slab('IslandCurb', ST.island[0], ST.island[1], WALK, 16, CURB);
  slab('IslandGrass', ST.island[0] + 8, ST.island[1] - 8, WALK + 1.5, 4, GRASS);
  slab('WalkFar', ST.walkFar[0], ST.walkFar[1], WALK, 30, CONCRETE);
  slab('CurbFar', ST.walkFar[1] - 10, ST.walkFar[1] + 2, WALK + 1, 16, CURB);
  // ---- разметка: пунктиры между полосами, сплошные у бордюров, «зебра» по оси дверей, стоп-линия полос 3–5 ----
  const mark = (x, z, w, d) => { const m = HK.box(stat, 'RoadMark', [w, 1, d], [x, ROAD + 0.6, z], LINE, 0); m.castShadow = false; return m; };
  for (const lx of [-1110, -1670, -1890]) for (let z = Z0 + 100; z < Z1; z += 700) if (z + 300 < ST.doorZ - 170 || z > ST.doorZ + 170) mark(lx, z + 150, 10, 300);
  for (const lx of [ST.lanesA[1] - 18, ST.lanesA[0] + 18, ST.lanesB[1] - 18, ST.lanesB[0] + 18]) { mark(lx, (Z0 + ST.doorZ - 170) / 2, 8, ST.doorZ - 170 - Z0); mark(lx, (ST.doorZ + 170 + Z1) / 2, 8, Z1 - ST.doorZ - 170); }
  for (const [a, b] of [ST.lanesA, ST.lanesB]) { const n = Math.floor((b - a - 30) / 90); const x0 = (a + b) / 2 - (n - 1) * 45; for (let i = 0; i < n; i++) mark(x0 + i * 90, ST.doorZ, 45, 280); }
  mark((ST.lanesB[0] + ST.lanesB[1]) / 2, ST.doorZ - 205, ST.lanesB[1] - ST.lanesB[0] - 20, 22);
  mark((ST.lanesA[0] + ST.lanesA[1]) / 2, ST.doorZ + 205, ST.lanesA[1] - ST.lanesA[0] - 20, 22);
  // ---- светофор на островке (полосы 3–5) и пешеходный ----
  const tlx = ST.island[0] + 22, tlz = ST.doorZ - 190;
  HK.cylinder(stat, 'LightPole', 6, 330, [tlx, WALK + 165, tlz], '#3b4246', 1.5, 8);
  HK.box(stat, 'LightArm', [10, 10, 60], [tlx, WALK + 320, tlz - 30], '#3b4246', 1.5);
  HK.box(stat, 'CarLightHead', [44, 120, 30], [tlx, WALK + 290, tlz - 60], '#2b3034', 2);
  const lens = (y, color, lit, x = tlx, z = tlz - 76, rx = Math.PI / 2, rz = 0) => {
    const m = HK.mesh(stat, 'Lens', new THREE.CylinderGeometry(12, 12, 3, 12), color, [x, y, z], 0, lit ? { emissive: color, emissiveIntensity: 0.9 } : {});
    m.rotation.x = rx; m.rotation.z = rz; return m;
  };
  lens(WALK + 325, '#e04848', true); lens(WALK + 290, '#5a4a2a', false); lens(WALK + 255, '#2f5a3a', false);
  HK.box(stat, 'WalkLightHead', [26, 56, 30], [tlx + 4, WALK + 215, tlz], '#2b3034', 1.5);
  lens(WALK + 228, '#e04848', true, tlx + 18, tlz, 0, Math.PI / 2); lens(WALK + 202, '#2f5a3a', false, tlx + 18, tlz, 0, Math.PI / 2);
  // ---- фонари вдоль тротуара ----
  for (const [x, z, s] of [[-830, -700, 1], [-830, 520, 1], [-2160, -820, -1], [-2160, 620, -1]]) {
    HK.cylinder(stat, 'LampPole', 5, 430, [x, WALK + 215, z], '#3b4246', 1.2, 8);
    HK.box(stat, 'LampArm', [90, 8, 8], [x - s * 42, WALK + 428, z], '#3b4246', 1.2);
    HK.box(stat, 'LampHead', [40, 12, 22], [x - s * 82, WALK + 420, z], '#eaf0f2', 1.2);
  }
  // ---- дом: крыльцо, ступени, дорожка, кусты, почтовый ящик, деревья ----
  if (house) {
    const zc = ST.doorZ, pw = ST.porchW;
    HK.box(stat, 'Porch', [ST.porch[1] - ST.porch[0], 60, pw], [(ST.porch[0] + ST.porch[1]) / 2, -30, zc], '#b9aa98', 2);
    HK.box(stat, 'PorchTop', [ST.porch[1] - ST.porch[0] + 4, 4, pw + 4], [(ST.porch[0] + ST.porch[1]) / 2, -2, zc], '#a17450', 1.5);
    for (const [x0, x1, top] of ST.steps) HK.box(stat, 'Step', [x1 - x0, top - G + 0.01, 116], [(x0 + x1) / 2, (top + G) / 2, zc], '#b9aa98', 1.5);
    const p = HK.box(stat, 'HousePath', [ST.path[1] - ST.path[0], 4, 100], [(ST.path[0] + ST.path[1]) / 2, WALK - 2, zc], '#d8c8a2', 0); p.castShadow = false;
    // фундамент дома (газон опущен до G)
    HK.box(stat, 'HouseBase', [994, -2 - G, 378], [60, (G - 2) / 2, -1], '#a39284', 2);
    for (const z of [-235, 15]) HK.mesh(stat, 'Bush', new THREE.IcosahedronGeometry(38, 0), '#5f9a4f', [-470, G + 26, z], 2.5);
    HK.box(stat, 'MailPost', [8, 100, 8], [-760, G + 50, zc - 78], '#6b4a32', 1);
    HK.box(stat, 'MailBox', [40, 26, 22], [-760, G + 112, zc - 78], '#d95a5a', 1.5);
    tree(stat, -640, -560, 1.1); tree(stat, -700, 640, 1); tree(stat, 700, -560, 1.2);
  }
  tree(stat, -2240, -760, 0.9); tree(stat, -2240, 560, 0.9);
  // ---- лаборатория №3 ----
  const lab = new THREE.Group(); lab.name = 'LAB3_BUILDING'; stat.add(lab);
  const LX = ST.labX, [LZ0, LZ1] = ST.labZ, LZC = (LZ0 + LZ1) / 2, LW = LZ1 - LZ0, LD = ST.labDepth, LH = ST.labH, cx = LX - LD / 2;
  HK.box(lab, 'LabBody', [LD, LH, LW], [cx, WALK + LH / 2, LZC], LAB_WALL, 4);
  HK.box(lab, 'LabPlinth', [LD + 8, 34, LW + 8], [cx, WALK + 17, LZC], '#8a9a9e', 2);
  HK.box(lab, 'LabStripe', [LD + 4, 26, LW + 4], [cx, WALK + 300, LZC], LAB_TEAL, 2);
  HK.box(lab, 'LabCornice', [LD + 24, 18, LW + 24], [cx, WALK + LH + 9, LZC], '#9aa8ac', 3);
  HK.box(lab, 'LabRoofUnit', [140, 70, 180], [cx - 60, WALK + LH + 53, LZC + 120], '#b7c2c4', 2.5);
  HK.box(lab, 'LabRoofUnit2', [90, 50, 90], [cx + 120, WALK + LH + 43, LZC - 220], '#b7c2c4', 2);
  const [dz0, dz1] = ST.labDoor, DZ = (dz0 + dz1) / 2, DW = dz1 - dz0, DH = ST.doorH;
  for (const y of [150, 430]) for (let z = LZ0 + 80; z < LZ1 - 40; z += 120) {
    if (y < 300 && z > dz0 - 110 && z < dz1 + 60) continue;
    HK.box(lab, 'LabWindowFrame', [6, 104, 92], [LX + 2, WALK + y, z], METAL, 1.5);
    HK.box(lab, 'LabWindow', [8, 92, 80], [LX + 3, WALK + y, z], WIN, 0);
    HK.box(lab, 'LabSill', [16, 6, 96], [LX + 6, WALK + y - 55, z], '#eef2f2', 1);
  }
  // проём: светлый «вестибюль» за стеклом
  HK.box(lab, 'LabLobby', [4, DH, DW], [LX + 1, WALK + DH / 2, DZ], '#7cc9c4', 0);
  HK.box(lab, 'LabLobbyFloor', [4, 10, DW], [LX + 2, WALK + 5, DZ], '#e8d6a8', 0);
  for (const z of [dz0 - 6, dz1 + 6]) HK.box(lab, 'LabDoorPost', [12, DH + 10, 12], [LX + 6, WALK + (DH + 10) / 2, z], METAL, 1.5);
  HK.box(lab, 'LabDoorTop', [14, 18, DW + 24], [LX + 7, WALK + DH + 9, DZ], METAL, 1.5);
  HK.box(lab, 'LabDoorRail', [6, 8, DW * 2 + 40], [LX + 11, WALK + DH + 3, DZ], METAL, 0);
  HK.box(lab, 'LabCanopy', [150, 12, DW + 160], [LX + 75, WALK + DH + 42, DZ], LAB_TEAL, 2.5);
  HK.box(lab, 'SignBoard', [8, 66, 330], [LX + 4, WALK + DH + 108, DZ], LAB_DARK, 2.5);
  const sign = kitLabel(lab, t('world.lab3'), { w: 310, h: 52, pos: [LX + 8.5, WALK + DH + 108, DZ], rot: [0, Math.PI / 2, 0], pw: 1024, ph: 172, font: '800 120px "Trebuchet MS", Arial', fg: '#f2ece0', bg: '#2f4a50', border: '#f2ece0' });
  sign.name = 'LAB3_SIGN';
  // считыватель пропусков справа от двери (если смотреть с улицы)
  const [rx, ry, rz] = ST.reader;
  HK.box(lab, 'CardReader', [8, 30, 18], [rx, ry, rz], '#2a3336', 1.2);
  HK.box(lab, 'CardSlot', [2, 10, 14], [rx + 4.2, ry - 4, rz], '#4f5f66', 0);
  HK.box(lab, 'LabNumber', [3, 40, 40], [LX + 2, WALK + 196, rz], '#f2ece0', 1.2);
  const num = kitLabel(lab, '3', { w: 32, h: 32, pos: [LX + 4, WALK + 196, rz], rot: [0, Math.PI / 2, 0], pw: 128, ph: 128, font: '800 100px Arial' });
  num.name = 'LAB3_NUMBER';
  for (const z of [dz0 - 210, dz1 + 150]) { HK.box(lab, 'Planter', [60, 40, 90], [LX + 50, WALK + 20, z], '#8a9a9e', 2); HK.mesh(lab, 'PlanterBush', new THREE.IcosahedronGeometry(36, 0), '#5f9a4f', [LX + 50, WALK + 62, z], 2); }
  // ---- динамика: створки дверей, LED, проезжающая машина ----
  const leaves = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.name = 'LAB_GLASS_DOOR'; g.position.set(LX + 7, WALK, DZ + s * DW / 4); dyn.add(g);
    const fr = new THREE.Group(); fr.name = 'LeafFrame'; g.add(fr);
    HK.box(fr, 'LeafStile', [5, DH - 4, 6], [0, DH / 2, s * (DW / 4 - 3)], METAL, 1);
    HK.box(fr, 'LeafStile', [5, DH - 4, 6], [0, DH / 2, -s * (DW / 4 - 3)], METAL, 1);
    HK.box(fr, 'LeafRail', [5, 8, DW / 2], [0, DH - 6, 0], METAL, 1); HK.box(fr, 'LeafRail', [5, 14, DW / 2], [0, 9, 0], METAL, 1);
    HK.box(fr, 'LeafHandle', [6, 60, 4], [3, 110, -s * (DW / 4 - 10)], '#c9cdd2', 0.8);
    mergeRigid(g);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(3, DH - 20, DW / 2 - 10), glassMaterial()); gl.name = 'LeafGlass'; gl.position.set(0, DH / 2, 0); gl.renderOrder = 2; g.add(gl);
    g.userData.z0 = g.position.z; g.userData.s = s; leaves.push(g);
  }
  const ledMat = new THREE.MeshBasicMaterial({ color: '#e04848', toneMapped: false }); ledMat.name = 'CardLed';
  const led = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 6), ledMat); led.name = 'CARD_LED'; led.position.set(rx + 4.5, ry + 9, rz); dyn.add(led);
  const ledHalo = new THREE.Mesh(new THREE.CircleGeometry(7, 16), new THREE.MeshBasicMaterial({ color: '#e04848', transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
  ledHalo.position.set(rx + 5, ry + 9, rz); ledHalo.rotation.y = Math.PI / 2; ledHalo.name = 'CARD_LED_HALO'; dyn.add(ledHalo);
  const car = makeCar(dyn, '#d9b45a'); car.visible = false;
  // ---- свет улицы: ключ с востока, чтобы фасад лаборатории (смотрит на +x) не был в тени ----
  let key = null;
  if (light) { key = new THREE.DirectionalLight('#fff4e0', 1.1); key.name = 'STREET_KEY'; key.position.set(-700, 1300, 1100); key.target.position.set(-2000, 0, -110); scene.add(key, key.target); }
  // ---- слияние статики ----
  const merged = mergeStaticVC(stat);
  let doorK = 0, doorTo = 0, carRun = null;
  const street = {
    root, stat, dyn, leaves, led, car, sign, merged,
    setLed(on) { const c = on ? '#5fe07a' : '#e04848'; ledMat.color.set(c); ledHalo.material.color.set(c); },
    setDoor(k, instant = false) { doorTo = k; if (instant) doorK = k; },
    // машина: полоса n (1–5), от z0 до z1 за dur с
    drive(n, z0, z1, dur, color) {
      if (color) car.traverse((o) => { if (o.isMesh && o.name.includes('CarHull')) o.material.color?.set?.(color); });
      car.visible = true; car.position.set(ST.laneX(n), ROAD, z0); car.rotation.y = z1 > z0 ? 0 : Math.PI;
      carRun = { z0, z1, dur, t: 0 };
    },
    update(dt) {
      doorK += (doorTo - doorK) * (1 - Math.exp(-dt * 6));
      for (const g of leaves) g.position.z = g.userData.z0 + g.userData.s * doorK * (DW / 2 + 6);
      if (carRun) {
        carRun.t += dt; const k = Math.min(1, carRun.t / carRun.dur);
        car.position.z = carRun.z0 + (carRun.z1 - carRun.z0) * k;
        if (k >= 1) { car.visible = false; carRun = null; }
      }
    },
    get doorK() { return doorK; },
    dispose() { if (key) { key.removeFromParent(); key.target.removeFromParent(); } disposeTree(root); },
  };
  return street;
}
