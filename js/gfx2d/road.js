// Спрайты S09 «Дорога»: SPR_ROAD_BG (+ SPR_LAB_FACADE_2D), SPR_TRAFFIC_LIGHT, SPR_HUMAN_ROAD (4 кадра × 4 направления),
// 5 машин (HATCH, SEDAN, TAXI, VAN, BUS). Всё рисуется кодом и запекается один раз (кэш). Вид — «сверху» для дороги
// и фасад в анфас (как в классических играх про переход дороги). Цвета учёного — из 3D-модели (human.js).
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { toon, ell, rrect, poly, line, limb, bake, INK, shade, light, mix, text } from './style.js';
import { COLORS } from './sprites.js';
const R = CFG.road, W = CFG.stage.w, H = CFG.stage.h;
const P = {
  asphalt: '#4b4f5c', asphalt2: '#454956', mark: '#e8e4da', curb: '#9a948c', curbDark: '#6e6862', walk: '#b9b2aa', walk2: '#aaa39b',
  grass: '#7fa05a', grass2: '#6b8c4a', wall: '#d6ebe3', wall2: '#b8d3ca', base: '#8fa7a0', glass: '#8bced5', glass2: '#5e9fb0',
  sign: '#2e4a52', signInk: '#e8fff4', door: '#a8dde3', frame: '#3d4a52', tree: '#6b9a4a', tree2: '#557d3a', trunk: '#6a4a3a',
};
let cache = null;

// ---------- фон: фасад лаборатории, тротуары, 5 полос, островок, зебра, стоп-линия ----------
function drawBg(g) {
  const Z = R.zones;
  // небо-полоска и фасад (0–120)
  const sky = g.createLinearGradient(0, 0, 0, 40); sky.addColorStop(0, '#cfe8ff'); sky.addColorStop(1, '#e8f4ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, 40);
  g.fillStyle = P.wall2; g.fillRect(0, 8, 300, 112); g.fillRect(660, 8, 300, 112); // соседние корпуса
  for (let x = 14; x < 300; x += 46) for (let y = 22; y < 100; y += 36) { g.fillStyle = P.glass2; g.fillRect(x, y, 30, 24); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 3, y + 3, 8, 18); }
  for (let x = 676; x < 960; x += 46) for (let y = 22; y < 100; y += 36) { g.fillStyle = P.glass2; g.fillRect(x, y, 30, 24); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 3, y + 3, 8, 18); }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(0, 8, 300, 112); g.strokeRect(660, 8, 300, 112);
  // главный корпус «ЛАБОРАТОРИЯ №3»
  toon(g, rrect(300, 0, 360, 124, 6), P.wall, 360, 124, { lw: 4, hl: false });
  g.fillStyle = P.base; g.fillRect(302, 104, 356, 18);
  for (const x of [318, 372, 568, 622]) { g.fillStyle = P.glass; g.fillRect(x, 44, 36, 46); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 4, 48, 9, 38); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(x, 44, 36, 46); g.beginPath(); g.moveTo(x + 18, 44); g.lineTo(x + 18, 90); g.stroke(); }
  // вывеска
  toon(g, rrect(380, 8, 200, 28, 6), P.sign, 200, 28, { lw: 3, hl: false });
  text(g, t('world.lab3'), 480, 22.5, { size: 17, color: P.signInk, stroke: null });
  // козырёк над дверью и табличка «СМЕНА 9:00»
  toon(g, poly([[436, 44], [524, 44], [532, 54], [428, 54]]), '#c0443a', 104, 10, { lw: 3, hl: false });
  toon(g, rrect(528, 66, 30, 20, 3), '#f2ece0', 30, 20, { lw: 2, hl: false });
  text(g, t('world.shift'), 543, 76, { size: 5.5, color: INK, stroke: null });
  // дверной проём (сама дверь — отдельный спрайт, она открывается)
  g.fillStyle = '#2b3a40'; g.fillRect(R.door[0] - 2, 54, R.door[1] - R.door[0] + 4, 70);
  // считыватель пропусков
  g.fillStyle = '#3d4a52'; g.fillRect(520, 88, 6, 10); g.fillStyle = '#d95a7a'; g.fillRect(521.5, 90, 3, 3);
  // ступенька
  g.fillStyle = '#c9c2b8'; g.fillRect(436, 118, 88, 6); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(436, 118, 88, 6);

  // тротуар сверху (120–170)
  tiles(g, Z.sidewalkTop[0], Z.sidewalkTop[1]);
  // тротуар снизу (470–540) и бордюр 460–470
  tiles(g, Z.sidewalkBottom[0], Z.sidewalkBottom[1]);
  // асфальт полос 3–5 и 1–2
  asphalt(g, Z.lane5[0], Z.lane3[1]);
  asphalt(g, Z.lane2[0], Z.lane1[1]);
  // бордюры
  curb(g, Z.sidewalkTop[1] - 4); curb(g, Z.lane1[1]); curb(g, Z.island[0] - 2); curb(g, Z.island[1] - 4);
  g.fillStyle = P.curb; g.fillRect(0, Z.lane1[1], W, Z.sidewalkBottom[0] - Z.lane1[1]);
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(0, Z.lane1[1]); g.lineTo(W, Z.lane1[1]); g.moveTo(0, Z.sidewalkBottom[0]); g.lineTo(W, Z.sidewalkBottom[0]); g.stroke();
  // островок (320–360): газон и мощёный «карман» у перехода
  g.fillStyle = P.grass; g.fillRect(0, Z.island[0] + 2, W, Z.island[1] - Z.island[0] - 6);
  for (let x = 6; x < W; x += 13) { g.fillStyle = (x * 7) % 3 ? P.grass2 : '#93b46a'; g.fillRect(x, Z.island[0] + 6 + (x * 13) % 22, 3, 5); }
  g.fillStyle = P.walk; g.fillRect(400, Z.island[0] + 2, 160, Z.island[1] - Z.island[0] - 6);
  g.strokeStyle = P.walk2; g.lineWidth = 1; for (let x = 400; x <= 560; x += 20) { g.beginPath(); g.moveTo(x, Z.island[0] + 2); g.lineTo(x, Z.island[1] - 4); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(0, Z.island[0] + 2, W, Z.island[1] - Z.island[0] - 6);
  for (const x of [120, 260, 700, 840]) bush(g, x, Z.island[0] + 20);
  // разметка: пунктир между полосами
  for (const y of [Z.lane2[1], Z.lane4[1], Z.lane5[1]]) for (let x = 10; x < W; x += 70) { g.fillStyle = P.mark; g.fillRect(x, y - 2, 40, 4); }
  // зебра на полосах 3–5 (x 420–540) и стоп-линия x 560
  const [zx0, zx1] = R.light.x;
  for (let y = Z.lane5[0] + 5; y < Z.lane3[1] - 6; y += 15) { g.fillStyle = P.mark; g.fillRect(zx0 + 4, y, zx1 - zx0 - 8, 8); }
  g.fillStyle = P.mark; g.fillRect(R.light.stopX, Z.lane5[0] + 2, 6, Z.lane3[1] - Z.lane5[0] - 4);
  // стрелки направления
  for (const [y, d] of [[435, 1], [385, 1], [295, -1], [245, -1], [195, -1]]) for (const x of [120, 820]) arrow(g, x, y, d);
  // деревья и фонари на тротуаре у фасада
  for (const x of [60, 220, 740, 900]) tree(g, x, 150);
  for (const x of [340, 620]) lamp(g, x, 160);
  // скамейка и урна у дома (снизу)
  toon(g, rrect(150, 496, 90, 12, 3), '#8a5a3a', 90, 12, { lw: 2.5, hl: false });
  toon(g, rrect(760, 490, 20, 24, 4), '#5e6b74', 20, 24, { lw: 2.5, hl: false });
  // крыльцо дома учёного (нижний край)
  toon(g, rrect(430, 528, 100, 20, 3), '#c9b8a4', 100, 20, { lw: 3, hl: false });
}
function tiles(g, y0, y1) {
  g.fillStyle = P.walk; g.fillRect(0, y0, W, y1 - y0);
  g.strokeStyle = P.walk2; g.lineWidth = 1;
  for (let y = y0; y < y1; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); const off = ((y - y0) / 18) % 2 ? 18 : 0; for (let x = off; x < W; x += 36) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, Math.min(y1, y + 18)); g.stroke(); } }
}
function asphalt(g, y0, y1) {
  g.fillStyle = P.asphalt; g.fillRect(0, y0, W, y1 - y0);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 260; i++) { g.fillStyle = rnd() < 0.5 ? P.asphalt2 : '#535866'; g.fillRect(rnd() * W, y0 + rnd() * (y1 - y0), 2 + rnd() * 3, 1.5); }
}
function curb(g, y) { g.fillStyle = P.curb; g.fillRect(0, y, W, 4); g.fillStyle = P.curbDark; for (let x = 0; x < W; x += 24) g.fillRect(x, y, 2, 4); }
function arrow(g, x, y, d) { g.save(); g.translate(x, y); g.scale(d, 1); g.fillStyle = 'rgba(232,228,218,.55)'; g.beginPath(); g.moveTo(-16, -3); g.lineTo(6, -3); g.lineTo(6, -8); g.lineTo(18, 0); g.lineTo(6, 8); g.lineTo(6, 3); g.lineTo(-16, 3); g.closePath(); g.fill(); g.restore(); }
function bush(g, x, y) { for (const [dx, dy, r] of [[-12, 2, 10], [0, -3, 12], [12, 2, 10]]) toon(g, ell(x + dx, y + dy, r, r * 0.8), P.tree, r * 2, r * 1.6, { lw: 2.5 }); }
function tree(g, x, y) {
  g.fillStyle = 'rgba(20,8,16,.25)'; g.beginPath(); g.ellipse(x, y + 8, 26, 9, 0, 0, 7); g.fill();
  toon(g, rrect(x - 5, y - 30, 10, 38, 3), P.trunk, 10, 38, { lw: 2.5, hl: false });
  for (const [dx, dy, r] of [[-16, -40, 18], [14, -42, 18], [0, -58, 22]]) toon(g, ell(x + dx, y + dy, r, r * 0.9), P.tree, r * 2, r * 1.8, { lw: 3 });
}
function lamp(g, x, y) {
  line(g, [[x, y], [x, y - 110]], 8, INK); line(g, [[x, y], [x, y - 110]], 4, '#5e6b74');
  toon(g, rrect(x - 12, y - 120, 24, 10, 4), '#5e6b74', 24, 10, { lw: 2.5, hl: false });
  g.fillStyle = '#fff1b0'; g.fillRect(x - 8, y - 111, 16, 3);
}

// ---------- человек (вид 3/4 сверху): dir 0 вниз, 1 вверх, 2 влево, 3 вправо; step −1/0/1/0 ----------
function human(g, dir, step) {
  const C = COLORS, cx = 20, side = dir >= 2, flip = dir === 2 ? -1 : 1;
  g.translate(cx, 0);
  if (side) g.scale(flip, 1);
  // ноги
  if (side) {
    const s = step * 6;
    limb(g, [[-2, 40], [-2 - s, 55]], 6, C.pants, 2); limb(g, [[2, 40], [2 + s, 55]], 6, shade(C.pants, 0.2), 2);
    toon(g, rrect(-2 - s - 3, 52, 9, 5, 2), C.wShoes, 9, 5, { lw: 2, hl: false }); toon(g, rrect(2 + s - 3, 52, 9, 5, 2), C.wShoes, 9, 5, { lw: 2, hl: false });
  } else {
    const a = step * 3;
    limb(g, [[-5, 40], [-5, 54 - a]], 6, C.pants, 2); limb(g, [[5, 40], [5, 54 + a]], 6, C.pants, 2);
    toon(g, rrect(-9, 51 - a, 8, 6, 2), C.wShoes, 8, 6, { lw: 2, hl: false }); toon(g, rrect(1, 51 + a, 8, 6, 2), C.wShoes, 8, 6, { lw: 2, hl: false });
  }
  // руки (за корпусом при виде сбоку — дальняя)
  const sw = step * (side ? 7 : 3);
  if (side) limb(g, [[0, 25], [-sw, 38]], 5, shade(C.coat, 0.25), 2);
  // халат
  if (side) toon(g, poly([[-7, 22], [7, 22], [9, 46], [-9, 46]]), C.coat, 18, 24, { lw: 2.5 });
  else toon(g, poly([[-10, 22], [10, 22], [12, 46], [-12, 46]]), C.coat, 24, 24, { lw: 2.5 });
  if (dir === 0) { // рубашка, галстук, бейдж
    g.fillStyle = C.shirt; g.beginPath(); g.moveTo(-4, 22); g.lineTo(4, 22); g.lineTo(2, 36); g.lineTo(-2, 36); g.closePath(); g.fill();
    g.fillStyle = C.tie; g.beginPath(); g.moveTo(-1.5, 24); g.lineTo(1.5, 24); g.lineTo(2, 33); g.lineTo(0, 35); g.lineTo(-2, 33); g.closePath(); g.fill();
    g.fillStyle = '#c7d6d6'; g.fillRect(4.5, 28, 4, 3); g.fillStyle = '#46586c'; g.fillRect(4.5, 28, 4, 1);
    line(g, [[-4, 22], [-2, 40]], 1.2, shade(C.coat, 0.4)); line(g, [[4, 22], [2, 40]], 1.2, shade(C.coat, 0.4));
  } else if (dir === 1) { line(g, [[0, 34], [0, 46]], 1.2, shade(C.coat, 0.4)); }
  else { g.fillStyle = shade(C.coat, 0.2); g.fillRect(1, 34, 5, 4); }
  if (side) limb(g, [[0, 25], [sw, 38]], 5, C.coat, 2);
  else { limb(g, [[-11, 25], [-13, 38 + sw]], 5, C.coat, 2); limb(g, [[11, 25], [13, 38 - sw]], 5, C.coat, 2); }
  // кисти
  g.fillStyle = C.skin; g.strokeStyle = INK; g.lineWidth = 1.5;
  if (side) { g.beginPath(); g.arc(sw, 39.5, 2.5, 0, 7); g.fill(); g.stroke(); }
  else { for (const [x, y] of [[-13, 39.5 + sw], [13, 39.5 - sw]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); g.stroke(); } }
  // голова
  toon(g, ell(0, 13, 8.5, 9), C.skin, 17, 18, { lw: 2.5 });
  g.fillStyle = C.hair;
  if (dir === 1) { g.beginPath(); g.ellipse(0, 12, 8.6, 9, 0, 0, 7); g.fill(); g.fillStyle = C.grey; g.fillRect(-8, 13, 3, 5); g.fillRect(5, 13, 3, 5); }
  else if (dir === 0) {
    g.beginPath(); g.ellipse(0, 7, 8.4, 5, 0, Math.PI, 0); g.fill(); g.fillRect(-8.4, 7, 3, 5); g.fillRect(5.4, 7, 3, 5);
    g.fillStyle = C.grey; g.fillRect(-8.4, 10, 2.5, 4); g.fillRect(5.9, 10, 2.5, 4);
    g.strokeStyle = INK; g.lineWidth = 1.4; g.strokeRect(-6.5, 11.5, 5, 3.6); g.strokeRect(1.5, 11.5, 5, 3.6); g.beginPath(); g.moveTo(-1.5, 13); g.lineTo(1.5, 13); g.stroke();
    g.fillStyle = INK; g.fillRect(-4.6, 12.6, 1.5, 1.6); g.fillRect(3.2, 12.6, 1.5, 1.6);
    g.strokeStyle = C.mouth; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2.5, 18); g.quadraticCurveTo(0, 19.4, 2.5, 18); g.stroke();
  } else {
    g.beginPath(); g.ellipse(-1.5, 8, 8, 5.5, 0, Math.PI * 0.9, Math.PI * 2.05); g.fill(); g.fillRect(-8.5, 8, 5, 8);
    g.fillStyle = C.grey; g.fillRect(-6, 11, 3, 4);
    g.fillStyle = C.skin; g.beginPath(); g.moveTo(8, 12); g.lineTo(10.5, 15); g.lineTo(8, 16); g.fill(); // нос
    g.strokeStyle = INK; g.lineWidth = 1.4; g.strokeRect(2.5, 11.5, 5, 3.6); g.beginPath(); g.moveTo(-3, 12.5); g.lineTo(2.5, 12.5); g.stroke();
    g.fillStyle = INK; g.fillRect(5, 12.6, 1.5, 1.6);
  }
}

// ---------- машины (вид сверху, «вперёд» = +x) ----------
function car(g, type, color) {
  const [len, wid] = R.cars[type];
  g.translate(len / 2 + 4, wid / 2 + 4);
  const hw = wid / 2, hl = len / 2;
  // колёса
  g.fillStyle = '#1a1418';
  for (const sx of type === 'BUS' ? [-0.36, 0.3] : [-0.3, 0.3]) for (const sy of [-1, 1]) g.fillRect(sx * len - 7, sy * (hw + 1) - 3, 14, 6);
  // кузов
  const body = color;
  toon(g, rrect(-hl, -hw, len, wid, Math.min(10, wid * 0.32)), body, len, wid, { lw: 3 });
  const glass = '#33415e', glassHi = 'rgba(207,232,255,.55)';
  if (type === 'BUS') {
    toon(g, rrect(-hl + 8, -hw + 6, len - 26, wid - 12, 4), light(body), len - 26, wid - 12, { lw: 2, hl: false });
    for (let x = -hl + 16; x < hl - 30; x += 22) { g.fillStyle = shade(body, 0.25); g.fillRect(x, -6, 14, 12); }
    g.fillStyle = glass; g.beginPath(); g.moveTo(hl - 14, -hw + 4); g.lineTo(hl - 4, -hw + 7); g.lineTo(hl - 4, hw - 7); g.lineTo(hl - 14, hw - 4); g.closePath(); g.fill();
    g.fillStyle = glassHi; g.fillRect(hl - 12, -hw + 7, 3, wid - 18);
    g.fillStyle = '#1d1519'; g.fillRect(hl - 26, -5, 9, 10); text(g, '3', hl - 21.5, 0.5, { size: 8, color: '#ffd08a', stroke: null });
  } else {
    const cab = type === 'VAN' ? [hl * 0.25, hl * 0.62] : type === 'HATCH' ? [-hl * 0.15, hl * 0.42] : [-hl * 0.25, hl * 0.38];
    // лобовое
    g.fillStyle = glass; g.beginPath(); g.moveTo(cab[1], -hw + 5); g.lineTo(cab[1] + 9, -hw + 7); g.lineTo(cab[1] + 9, hw - 7); g.lineTo(cab[1], hw - 5); g.closePath(); g.fill();
    g.fillStyle = glassHi; g.fillRect(cab[1] + 2, -hw + 8, 2.5, wid - 16);
    // крыша
    const roofStart = type === 'VAN' ? -hl + 6 : cab[0];
    toon(g, rrect(roofStart, -hw + 5, cab[1] - roofStart, wid - 10, 5), type === 'VAN' ? light(body) : shade(body, 0.12), cab[1] - roofStart, wid - 10, { lw: 2, hl: false });
    // заднее стекло
    if (type !== 'VAN') { g.fillStyle = glass; g.beginPath(); g.moveTo(cab[0], -hw + 6); g.lineTo(cab[0] - 7, -hw + 8); g.lineTo(cab[0] - 7, hw - 8); g.lineTo(cab[0], hw - 6); g.closePath(); g.fill(); }
    else { g.fillStyle = '#4a8fd9'; g.fillRect(-hl + 8, -hw + 1, len * 0.5, 3); g.fillRect(-hl + 8, hw - 4, len * 0.5, 3); }
    // зеркала
    g.fillStyle = body; g.strokeStyle = INK; g.lineWidth = 1.5;
    for (const sy of [-1, 1]) { g.beginPath(); g.ellipse(cab[1] + 3, sy * (hw + 1.5), 3, 2, 0, 0, 7); g.fill(); g.stroke(); }
    if (type === 'TAXI') {
      toon(g, rrect((roofStart + cab[1]) / 2 - 7, -5, 14, 10, 2), '#f2ece0', 14, 10, { lw: 1.5, hl: false });
      for (let i = 0; i < 4; i++) { g.fillStyle = INK; g.fillRect((roofStart + cab[1]) / 2 - 6 + i * 3.5, i % 2 ? -4 : 0, 1.8, 4); }
      g.fillStyle = INK; for (let x = -hl + 6; x < hl - 6; x += 8) { g.fillRect(x, hw - 4, 4, 2); g.fillRect(x + 4, -hw + 2, 4, 2); }
    }
  }
  // фары и стоп-сигналы
  g.fillStyle = '#fff3c4'; g.fillRect(hl - 4, -hw + 3, 3, 6); g.fillRect(hl - 4, hw - 9, 3, 6);
  g.fillStyle = '#d93a4a'; g.fillRect(-hl + 1, -hw + 3, 3, 6); g.fillRect(-hl + 1, hw - 9, 3, 6);
}
export const CAR_COLORS = { HATCH: ['#c0443a', '#7fd18b', '#6b4f7a'], SEDAN: ['#4a8fd9', '#e8e4da', '#3d4352'], TAXI: ['#f2c94c'], VAN: ['#e9eef0', '#9fd0c8'], BUS: ['#e8a04a'] };

export function getRoadSprites() {
  if (cache) return cache;
  const S = { bg: bake(W, H, drawBg), human: [], cars: {} };
  for (let d = 0; d < 4; d++) S.human.push([-1, 0, 1, 0].map((s) => bake(40, 60, (g) => human(g, d, s))));
  for (const type of Object.keys(R.cars)) {
    const [len, wid] = R.cars[type];
    S.cars[type] = CAR_COLORS[type].map((c) => bake(len + 8, wid + 8, (g) => car(g, type, c)));
  }
  // дверь лаборатории (две створки)
  S.doorLeaf = bake(30, 66, (g) => { toon(g, rrect(1, 1, 28, 64, 2), P.door, 28, 64, { lw: 2.5, hl: false }); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(5, 5, 5, 54); g.fillStyle = P.frame; g.fillRect(1, 30, 28, 3); });
  cache = S;
  return S;
}
// Светофоры (рисуются каждый кадр — состояние меняется): автомобильный для полос 3–5 и пешеходный.
export function drawCarLight(g, x, y, phase, blinkOn) {
  line(g, [[x, y], [x, y - 64]], 7, INK); line(g, [[x, y], [x, y - 64]], 3.5, '#5e6b74');
  toon(g, rrect(x - 9, y - 104, 18, 44, 5), '#2b2f38', 18, 44, { lw: 2.5, hl: false });
  const carGreen = phase === 'red', carYellow = phase === 'blink' && blinkOn;
  lampDot(g, x, y - 96, '#ff4a5a', !carGreen && !carYellow); lampDot(g, x, y - 82, '#ffd04a', carYellow); lampDot(g, x, y - 68, '#5aff8a', carGreen);
}
export function drawWalkLight(g, x, y, phase, blinkOn) {
  line(g, [[x, y], [x, y - 40]], 6, INK); line(g, [[x, y], [x, y - 40]], 3, '#5e6b74');
  toon(g, rrect(x - 9, y - 72, 18, 32, 4), '#2b2f38', 18, 32, { lw: 2.5, hl: false });
  const green = phase === 'green' || (phase === 'blink' && blinkOn);
  manIcon(g, x, y - 64, phase === 'red' ? '#ff4a5a' : '#4a2a30', false);
  manIcon(g, x, y - 49, green ? '#5aff8a' : '#24402c', true);
}
function lampDot(g, x, y, c, on) {
  g.fillStyle = on ? c : mix(c, '#1d1519', 0.75); g.beginPath(); g.arc(x, y, 5.2, 0, 7); g.fill();
  if (on) { g.save(); g.globalAlpha = 0.35; g.fillStyle = c; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); g.restore(); }
}
function manIcon(g, x, y, c, walking) {
  g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 1.6; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y - 4, 1.8, 0, 7); g.fill();
  g.beginPath(); g.moveTo(x, y - 2); g.lineTo(x, y + 2);
  if (walking) { g.moveTo(x, y + 2); g.lineTo(x - 2.5, y + 5.5); g.moveTo(x, y + 2); g.lineTo(x + 2.5, y + 5.5); g.moveTo(x, y - 1); g.lineTo(x - 2.5, y + 1.5); g.moveTo(x, y - 1); g.lineTo(x + 2.5, y + 0.5); }
  else { g.moveTo(x - 1, y + 2); g.lineTo(x - 1, y + 5.5); g.moveTo(x + 1, y + 2); g.lineTo(x + 1, y + 5.5); g.moveTo(x - 2.5, y - 1); g.lineTo(x - 2.5, y + 2); g.moveTo(x + 2.5, y - 1); g.lineTo(x + 2.5, y + 2); }
  g.stroke();
}
