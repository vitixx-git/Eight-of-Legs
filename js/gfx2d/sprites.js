// Спрайты боёв по .png-референсам (цвета взяты из моделей): SPR_SPIDER_TOP, SPR_BITE_ARC, SPR_DODGE_RING,
// SPR_REFLEX, SPR_FEAR, SPR_FEAR_CLONE, SPR_WILL (+ папка-щит), SPR_WILL_TRAP, SPR_HEART. Запекаются один раз (кэш).
import { toon, ell, rrect, poly, line, limb, bake, tint, INK, shade, light, text } from './style.js';
import { t } from '../text/ru.js';
const D = Math.PI / 180;
const C = {
  spBody: '#2f2433', spAbd: '#3a2b45', spPat: '#6b4f7a', spLeg: '#2a1f2e', spJoint: '#4a3a52',
  skin: '#d7a58a', hair: '#4a3428', grey: '#9a8f88', suit: '#c0443a', stripe: '#f2ece0', shoes: '#e9e1cf', hHandle: '#c9d0d8', hHead: '#c9524a',
  sweater: '#8a8fa0', rib: '#767b8c', pants: '#3d4352', slippers: '#8a5a8c', eye: '#f2ece0', pupil: '#2a1f1a', brow: '#3a2a22', mouth: '#7a2630', sweat: '#9fd8ff',
  coat: '#eef0ec', shirt: '#e8e4da', tie: '#7a3b46', wShoes: '#2b2326', stubble: '#b8876e', folder: '#d9b45a', folderTie: '#8a6a2a', paper: '#f2ece0',
};
export const COLORS = C;
let cache = null;

// ---------- паук (вид сверху, «вперёд» = −y) ----------
function spider(g, { phase = 0, bite = -1, dead = 0 } = {}) {
  g.translate(32, 32);
  const legs = [];
  for (const k of [-1, 1]) for (let i = 0; i < 4; i++) {
    const groupA = (k === -1) === (i % 2 === 0);
    const sw = (groupA ? 1 : -1) * Math.sin(phase) * 12;
    const base = [k * 4.5, -8 + i * 3.3];
    let a = [-58, -22, 14, 48][i] + sw;
    let femur = 11, tibia = 12;
    if (dead) { femur = 6; tibia = 6; a = [-40, -15, 15, 40][i]; }
    const ang = (k === 1 ? a : 180 - a) * D;
    const knee = [base[0] + Math.cos(ang) * femur, base[1] + Math.sin(ang) * femur - 2];
    const bend = (i < 2 ? -24 : 26) * (k === 1 ? 1 : -1) * (dead ? 3 : 1);
    const ang2 = ang + bend * D;
    const tip = [knee[0] + Math.cos(ang2) * tibia, knee[1] + Math.sin(ang2) * tibia];
    legs.push([base, knee, tip]);
  }
  for (const L of legs) limb(g, L, 2.4, C.spLeg, 1.5);
  for (const L of legs) { g.fillStyle = C.spJoint; g.beginPath(); g.arc(L[1][0], L[1][1], 1.5, 0, 7); g.fill(); }
  const lunge = bite === 1 ? -3 : bite === 0 ? 1.5 : 0;
  toon(g, ell(0, 9, 10, 12.5), dead ? '#4a3a52' : C.spAbd, 20, 25, { lw: 2.5 });
  g.fillStyle = C.spPat;
  for (const [y, w] of [[4, 3.6], [9, 3.0], [14, 2.2]]) { g.beginPath(); g.ellipse(0, y, w, w * 0.6, 0, 0, 7); g.fill(); }
  g.strokeStyle = shade(C.spPat, 0.2); g.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-5 + i, 11 + i * 3); g.lineTo(0, 13 + i * 3); g.lineTo(5 - i, 11 + i * 3); g.stroke(); }
  g.save(); g.translate(0, lunge);
  toon(g, ell(0, -6, 7.5, 7), C.spBody, 15, 14, { lw: 2.5 });
  // хелицеры/клыки
  const open = bite === 0 ? 1 : bite === 1 ? -0.4 : bite === 2 ? 0.4 : 0.2;
  for (const k of [-1, 1]) {
    g.save(); g.translate(k * 2.2, -12.2); g.rotate(k * open * 0.6);
    toon(g, poly([[-1.4, 0], [1.4, 0], [0, -4.2]]), '#1d1519', 3, 4, { lw: 1, hl: false });
    g.restore();
    g.fillStyle = C.spLeg; g.beginPath(); g.ellipse(k * 4.6, -11.5, 1.6, 2.4, k * 0.4, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
  }
  // глаза: 2 главных + 4 малых
  if (!dead) {
    for (const k of [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(k * 2.3, -10, 2.1, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.8; g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(k * 2.3, -10.6, 1.1, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(k * 2.3 - 0.4, -11.1, 0.4, 0, 7); g.fill();
      for (const [x, y] of [[4.4, -8.6], [3.8, -6.6]]) { g.fillStyle = '#e8e0f0'; g.beginPath(); g.arc(k * x, y, 0.9, 0, 7); g.fill(); }
    }
  } else {
    g.strokeStyle = '#f2ece0'; g.lineWidth = 1;
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * 2.3 - 1.3, -11.3); g.lineTo(k * 2.3 + 1.3, -8.7); g.moveTo(k * 2.3 + 1.3, -11.3); g.lineTo(k * 2.3 - 1.3, -8.7); g.stroke(); }
  }
  g.restore();
}
// ---------- Рефлекс (64×80, якорь — ноги) ----------
function reflex(g, { step = 0, pose = 'walk' } = {}) {
  const crouch = pose === 'crouch' ? 6 : pose === 'dash' ? 4 : 0;
  const sit = pose === 'stun', flat = pose === 'deflate';
  if (flat) { g.translate(32, 74); g.scale(1.5, 0.35); g.translate(-32, -74); }
  const hipY = 54 + crouch + (sit ? 10 : 0);
  // ноги
  const lf = sit ? [[27, hipY], [20, hipY + 6], [14, hipY + 8]] : [[27, hipY], [26 - step * 3, 63 + crouch * 0.5], [25 - step * 5, 72]];
  const rf = sit ? [[37, hipY], [44, hipY + 6], [50, hipY + 8]] : [[37, hipY], [38 + step * 3, 63 + crouch * 0.5], [39 + step * 5, 72]];
  limb(g, lf, 7, C.suit, 2.5); limb(g, rf, 7, C.suit, 2.5);
  line(g, [lf[0], lf[1], lf[2]], 1.5, C.stripe); line(g, [rf[0], rf[1], rf[2]], 1.5, C.stripe);
  for (const f of [lf[2], rf[2]]) toon(g, ell(f[0], f[1] + 1.5, 4.6, 2.8), C.shoes, 9, 5, { lw: 2 });
  // торс
  const ty = 31 + crouch + (sit ? 10 : 0);
  toon(g, rrect(21, ty, 22, 25, 7), C.suit, 22, 25, { lw: 2.6 });
  line(g, [[32, ty + 2], [32, ty + 22]], 1.6, C.stripe);
  // руки: левая свободна, правая с молоточком
  const raise = pose === 'crouch' ? 1 : pose === 'dash' ? 0.6 : 0;
  const la = [[22, ty + 5], [16, ty + 14], [17, ty + 22 - raise * 4]];
  const ra = raise ? [[42, ty + 5], [50, ty - 2], [46, ty - 10]] : [[42, ty + 5], [48, ty + 14], [47, ty + 22]];
  limb(g, la, 5.5, C.suit, 2.4); limb(g, ra, 5.5, C.suit, 2.4);
  line(g, la, 1.3, C.stripe); line(g, ra, 1.3, C.stripe);
  toon(g, ell(la[2][0], la[2][1], 3, 3), C.skin, 6, 6, { lw: 2 });
  const hand = ra[2];
  // молоточек
  g.save(); g.translate(hand[0], hand[1]); g.rotate(raise ? -2.2 : 0.25);
  limb(g, [[0, 0], [0, -14]], 2, C.hHandle, 1.5);
  toon(g, rrect(-6, -20, 12, 7, 2.5), C.hHead, 12, 7, { lw: 2 });
  g.restore();
  toon(g, ell(hand[0], hand[1], 3, 3), C.skin, 6, 6, { lw: 2 });
  // голова
  const hy = ty - 9;
  toon(g, ell(32, hy, 10.5, 10), C.skin, 21, 20, { lw: 2.6 });
  g.save(); ell(32, hy, 10.5, 10)(g); g.clip();
  g.fillStyle = C.hair; g.beginPath(); g.ellipse(32, hy - 8, 12, 7, 0, 0, 7); g.fill();
  g.fillStyle = C.stripe; g.fillRect(20, hy - 5, 24, 3.6); g.fillStyle = '#c0443a'; g.fillRect(20, hy - 3.6, 24, 1);
  g.restore();
  // хвостики повязки
  line(g, [[21, hy - 3], [16, hy + 1], [13, hy - 1]], 2, C.stripe);
  // лицо
  if (sit || flat) {
    g.strokeStyle = INK; g.lineWidth = 1.3;
    for (const x of [28, 36]) { g.beginPath(); g.arc(x, hy + 1, 2, 0, Math.PI * 1.6); g.stroke(); }
  } else {
    g.fillStyle = INK; g.beginPath(); g.arc(28.5, hy + 1, 1.4, 0, 7); g.arc(35.5, hy + 1, 1.4, 0, 7); g.fill();
    g.strokeStyle = C.brow || INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(26, hy - 2.5); g.lineTo(30.5, hy - 1.2); g.moveTo(38, hy - 2.5); g.lineTo(33.5, hy - 1.2); g.stroke();
  }
  g.strokeStyle = C.mouth; g.lineWidth = 1.4; g.beginPath();
  if (pose === 'crouch' || pose === 'dash') { g.moveTo(29, hy + 5.5); g.lineTo(35, hy + 5.5); } else g.arc(32, hy + 4, 2.4, 0.2, Math.PI - 0.2);
  g.stroke();
}
// ---------- Страх (64×80) ----------
function fear(g, { pose = 'idle', breath = 0, sweat = true } = {}) {
  const faint = pose === 'faint';
  if (faint) { g.translate(32, 66); g.rotate(-Math.PI / 2 * 0.92); g.translate(-32, -66); }
  const b = breath;
  // ноги-тапки
  toon(g, ell(25, 73, 6, 3.2), C.slippers, 12, 6, { lw: 2 }); toon(g, ell(39, 73, 6, 3.2), C.slippers, 12, 6, { lw: 2 });
  limb(g, [[26, 64], [25, 71]], 5, C.pants, 2); limb(g, [[38, 64], [39, 71]], 5, C.pants, 2);
  // свитер-мешок до колен
  const up = pose === 'scream';
  toon(g, (gg) => { gg.beginPath(); gg.moveTo(18, 34 + b); gg.quadraticCurveTo(32, 26 + b, 46, 34 + b); gg.quadraticCurveTo(52, 50, 49, 66); gg.quadraticCurveTo(32, 70, 15, 66); gg.quadraticCurveTo(12, 50, 18, 34 + b); gg.closePath(); }, C.sweater, 36, 40, { lw: 2.8 });
  g.strokeStyle = C.rib; g.lineWidth = 1.5;
  for (let x = 19; x <= 46; x += 4) { g.beginPath(); g.moveTo(x, 62); g.lineTo(x, 66.5); g.stroke(); }
  // рукава закрывают кисти
  const la = up ? [[19, 38], [10, 28], [12, 18]] : [[19, 38], [13, 48], [17, 56]];
  const ra = up ? [[45, 38], [54, 28], [52, 18]] : [[45, 38], [51, 48], [47, 56]];
  limb(g, la, 8, C.sweater, 2.4); limb(g, ra, 8, C.sweater, 2.4);
  for (const p of [la[2], ra[2]]) toon(g, ell(p[0], p[1], 4.6, 4), C.rib, 9, 8, { lw: 2 });
  // голова
  const hy = 22 + b * 0.5;
  toon(g, ell(32, hy, 11, 10.5), C.skin, 22, 21, { lw: 2.6 });
  g.save(); ell(32, hy, 11, 10.5)(g); g.clip(); g.fillStyle = C.hair; g.beginPath(); g.ellipse(32, hy - 9, 13, 6.5, 0, 0, 7); g.fill(); g.restore();
  // большие глаза, брови домиком
  const shut = pose === 'hurt' || faint;
  for (const k of [-1, 1]) {
    const ex = 32 + k * 4.6, ey = hy + 1;
    if (shut) { g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex - 2.5, ey - 1.5 * k * 0 - 1.5); g.lineTo(ex + k * 0.5, ey); g.lineTo(ex - 2.5 + 5 * (k === 1 ? 1 : 0), ey + 1.5); g.stroke(); continue; }
    g.fillStyle = C.eye; g.beginPath(); g.ellipse(ex, ey, 3.6, 4.2, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = C.pupil; g.beginPath(); g.arc(ex + k * 0.3, ey + 0.6, up ? 0.9 : 1.3, 0, 7); g.fill();
    g.strokeStyle = C.brow; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ex - k * 3, ey - 5.2); g.lineTo(ex + k * 2.2, ey - 7.4); g.stroke();
  }
  g.fillStyle = C.mouth; g.beginPath();
  if (up) g.ellipse(32, hy + 6.6, 2.4, 3, 0, 0, 7); else { g.ellipse(32, hy + 6.4, 2, 1.1, 0, 0, 7); }
  g.fill();
  if (sweat) { toon(g, (gg) => { gg.beginPath(); gg.moveTo(43, hy - 7); gg.quadraticCurveTo(46.5, hy - 1.5, 43, hy - 0.5); gg.quadraticCurveTo(39.5, hy - 1.5, 43, hy - 7); gg.closePath(); }, C.sweat, 5, 6, { lw: 1.3 }); }
}
// ---------- Воля (72×84) ----------
function will(g, { pose = 'idle', step = 0 } = {}) {
  const dn = pose === 'strike' ? 4 : 0, lying = pose === 'defeat';
  if (lying) { g.translate(36, 72); g.rotate(Math.PI / 2 * 0.95); g.translate(-36, -72); }
  // ноги
  limb(g, [[30, 58 + dn], [29 - step * 2, 70], [28 - step * 3, 77]], 8, C.pants, 2.5);
  limb(g, [[42, 58 + dn], [43 + step * 2, 70], [44 + step * 3, 77]], 8, C.pants, 2.5);
  toon(g, ell(28 - step * 3, 79, 5.5, 3), C.wShoes, 11, 6, { lw: 2 }); toon(g, ell(44 + step * 3, 79, 5.5, 3), C.wShoes, 11, 6, { lw: 2 });
  // халат
  const ty = 32 + dn;
  toon(g, (gg) => { gg.beginPath(); gg.moveTo(19, ty + 4); gg.quadraticCurveTo(36, ty - 4, 53, ty + 4); gg.lineTo(56, ty + 32); gg.quadraticCurveTo(36, ty + 36, 16, ty + 32); gg.closePath(); }, C.coat, 40, 34, { lw: 2.8 });
  g.fillStyle = C.shirt; g.beginPath(); g.moveTo(31, ty + 1); g.lineTo(36, ty + 18); g.lineTo(41, ty + 1); g.fill();
  g.fillStyle = C.tie; g.beginPath(); g.moveTo(34.5, ty + 2); g.lineTo(37.5, ty + 2); g.lineTo(38, ty + 14); g.lineTo(36, ty + 17); g.lineTo(34, ty + 14); g.fill();
  g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(36, ty + 18); g.lineTo(36, ty + 33); g.stroke();
  g.fillStyle = '#4a6fb8'; g.fillRect(45, ty + 9, 1.6, 6); g.fillStyle = '#c9524a'; g.fillRect(47.5, ty + 9, 1.6, 6);
  // руки
  let la, ra;
  if (pose === 'prep') { la = [[20, ty + 6], [16, ty - 6], [26, ty - 18]]; ra = [[52, ty + 6], [56, ty - 6], [46, ty - 18]]; }
  else if (pose === 'strike') { la = [[20, ty + 6], [18, ty + 18], [28, ty + 30]]; ra = [[52, ty + 6], [54, ty + 18], [44, ty + 30]]; }
  else if (pose === 'open') { la = [[20, ty + 6], [10, ty + 10], [4, ty + 6]]; ra = [[52, ty + 6], [62, ty + 10], [68, ty + 6]]; }
  else { la = [[20, ty + 6], [15, ty + 17], [17, ty + 27]]; ra = [[52, ty + 6], [57, ty + 17], [55, ty + 27]]; }
  limb(g, la, 7.5, C.coat, 2.4); limb(g, ra, 7.5, C.coat, 2.4);
  for (const p of [la[2], ra[2]]) toon(g, ell(p[0], p[1], 3.6, 3.6), C.skin, 7, 7, { lw: 2 });
  // голова: причёска и очки как у учёного, щетина
  const hy = ty - 10;
  toon(g, ell(36, hy, 12, 11), C.skin, 24, 22, { lw: 2.6 });
  g.save(); ell(36, hy, 12, 11)(g); g.clip();
  g.fillStyle = C.stubble; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(36, hy + 8, 9, 5, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  g.fillStyle = C.hair; g.beginPath(); g.ellipse(36, hy - 9, 14, 7, 0, 0, 7); g.fill();
  g.fillStyle = C.grey; g.fillRect(23, hy - 4, 3, 5); g.fillRect(46, hy - 4, 3, 5);
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 1.5;
  g.beginPath(); g.arc(31.5, hy + 0.5, 3.2, 0, 7); g.moveTo(43.7, hy + 0.5); g.arc(40.5, hy + 0.5, 3.2, 0, 7); g.moveTo(34.7, hy); g.lineTo(37.3, hy); g.stroke();
  const angry = pose === 'prep' || pose === 'strike';
  if (pose === 'open' || lying) { g.lineWidth = 1.2; for (const x of [31.5, 40.5]) { g.beginPath(); g.moveTo(x - 1.4, hy - 0.9); g.lineTo(x + 1.4, hy + 1.9); g.moveTo(x + 1.4, hy - 0.9); g.lineTo(x - 1.4, hy + 1.9); g.stroke(); } }
  else { g.fillStyle = INK; g.beginPath(); g.arc(31.5, hy + 0.8, 1.2, 0, 7); g.arc(40.5, hy + 0.8, 1.2, 0, 7); g.fill(); }
  g.strokeStyle = C.brow; g.lineWidth = 2; g.beginPath();
  if (angry) { g.moveTo(28, hy - 5); g.lineTo(34, hy - 3); g.moveTo(44, hy - 5); g.lineTo(38, hy - 3); } else { g.moveTo(28, hy - 4.5); g.lineTo(34, hy - 4.5); g.moveTo(38, hy - 4.5); g.lineTo(44, hy - 4.5); }
  g.stroke();
  g.strokeStyle = C.mouth; g.lineWidth = 1.6; g.beginPath();
  if (angry) { g.moveTo(32, hy + 6.5); g.lineTo(40, hy + 6.5); } else if (pose === 'open') g.arc(36, hy + 7.5, 2.4, Math.PI + 0.3, -0.3); else { g.moveTo(32.5, hy + 6.5); g.lineTo(39.5, hy + 6); }
  g.stroke();
  // папка над головой / при ударе — в руках
  if (pose === 'prep') folder(g, 36, ty - 26, 0, 1.0);
  if (pose === 'strike') folder(g, 36, ty + 34, 0, 1.0, true);
}
// Папка «ДЕЛО №1» (щит)
function folder(g, x, y, rot = 0, s = 1, flat = false) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, flat ? s * 0.55 : s);
  toon(g, rrect(-11, -8, 22, 16, 2.5), C.folder, 22, 16, { lw: 2.4 });
  g.fillStyle = C.paper; g.fillRect(-9, -9.5, 18, 2.2);
  g.fillStyle = C.folderTie; g.fillRect(-1, -8, 2, 16);
  text(g, t('world.case'), 0, 1.5, { size: 4.6, color: INK, stroke: null, weight: 800 });
  g.restore();
}
function heart(g, full) {
  const p = (gg) => { gg.beginPath(); gg.moveTo(12, 19); gg.bezierCurveTo(1, 11, 2, 2, 8, 3); gg.bezierCurveTo(10.5, 3.4, 12, 5.5, 12, 6.5); gg.bezierCurveTo(12, 5.5, 13.5, 3.4, 16, 3); gg.bezierCurveTo(22, 2, 23, 11, 12, 19); gg.closePath(); };
  if (full) toon(g, p, '#d95a7a', 20, 16, { lw: 2.4 });
  else { p(g); g.fillStyle = 'rgba(29,21,25,.6)'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke(); }
}
function webNet(g) {
  g.translate(40, 40); g.strokeStyle = 'rgba(242,236,224,.9)'; g.lineWidth = 1.4;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); g.stroke(); }
  for (const r of [9, 17, 25, 33]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4, rr = r * (i % 2 ? 0.92 : 1); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
}
function biteArc(g) {
  g.translate(40, 40);
  const grd = g.createRadialGradient(0, 0, 20, 0, 0, 40); grd.addColorStop(0, 'rgba(255,246,232,0)'); grd.addColorStop(0.7, 'rgba(255,246,232,.85)'); grd.addColorStop(1, 'rgba(255,246,232,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 40, -Math.PI / 2 - 40 * D, -Math.PI / 2 + 40 * D); g.arc(0, 0, 24, -Math.PI / 2 + 40 * D, -Math.PI / 2 - 40 * D, true); g.closePath(); g.fill();
}
export function getSprites() {
  if (cache) return cache;
  const S = {};
  S.spiderWalk = Array.from({ length: 6 }, (_, i) => bake(64, 64, (g) => spider(g, { phase: i / 6 * Math.PI * 2 })));
  S.spiderBite = [0, 1, 2].map((b) => bake(64, 64, (g) => spider(g, { bite: b })));
  S.spiderDead = bake(64, 64, (g) => spider(g, { dead: 1 }));
  S.spiderWalkW = S.spiderWalk.map((c) => tint(c, '#ffffff'));
  S.spiderBiteW = S.spiderBite.map((c) => tint(c, '#ffffff'));
  S.biteArc = bake(80, 80, biteArc);
  S.reflexWalk = [-1, 0, 1, 0].map((s) => bake(64, 80, (g) => reflex(g, { step: s })));
  S.reflexCrouch = bake(64, 80, (g) => reflex(g, { pose: 'crouch' }));
  S.reflexDash = bake(64, 80, (g) => reflex(g, { pose: 'dash' }));
  S.reflexStun = bake(64, 80, (g) => reflex(g, { pose: 'stun' }));
  S.reflexDeflate = bake(64, 80, (g) => reflex(g, { pose: 'deflate' }));
  S.fearIdle = [0, 1.2].map((b) => bake(64, 80, (g) => fear(g, { breath: b })));
  S.fearScream = bake(64, 80, (g) => fear(g, { pose: 'scream' }));
  S.fearHurt = bake(64, 80, (g) => fear(g, { pose: 'hurt' }));
  S.fearFaint = bake(64, 80, (g) => fear(g, { pose: 'faint' }));
  S.fearClone = [0, 1.2].map((b) => tint(bake(64, 80, (g) => fear(g, { breath: b, sweat: false })), '#9fb4ff', 0.0));
  S.fearCloneRaw = [0, 1.2].map((b) => bake(64, 80, (g) => fear(g, { breath: b, sweat: false })));
  S.fearGlow = S.fearIdle.map((c) => tint(c, '#ffffff'));
  S.willWalk = [-1, 0, 1, 0].map((s) => bake(72, 84, (g) => will(g, { step: s })));
  for (const p of ['prep', 'strike', 'open', 'defeat']) S['will_' + p] = bake(72, 84, (g) => will(g, { pose: p }));
  S.willFolder = bake(26, 20, (g) => folder(g, 13, 10, 0, 1));
  S.webNet = bake(80, 80, webNet);
  S.heart = bake(24, 22, (g) => heart(g, true));
  S.heartEmpty = bake(24, 22, (g) => heart(g, false));
  for (const k of ['reflexWalk', 'fearIdle', 'willWalk']) S[k + 'W'] = S[k].map((c) => tint(c, '#ffffff'));
  for (const k of ['reflexCrouch', 'reflexDash', 'reflexStun', 'fearScream', 'fearHurt', 'will_prep', 'will_strike', 'will_open']) S[k + 'W'] = tint(S[k], '#ffffff');
  cache = S;
  return S;
}
export { folder as drawFolder, spider as drawSpiderTop };
