// Единый 2D-стиль: обводка #1d1519 3–5 px, тень — смещение (−0,15w; −0,2h) со смешением с #2e2440,
// блик mix(цвет, #fff6e8, 0.22). Всё рисуется кодом; спрайты запекаются в офскрин-холсты (кэш).
import { CFG } from '../config.js';
export const INK = CFG.toon.outline, SHADOW = CFG.toon.shadowTint, LIGHT = CFG.toon.highlight;
const rgbCache = new Map();
export function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(hex, v); }
  return v;
}
export function mix(a, b, t) { const x = rgb(a), y = rgb(b); const c = x.map((v, i) => Math.round(v + (y[i] - v) * t)); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }
export const shade = (c, k = 0.45) => mix(c, SHADOW, k);
export const light = (c) => mix(c, LIGHT, CFG.toon.highlightMix);
// Тон-фигура: path(g) строит контур; w,h — габариты для смещения тени.
export function toon(g, path, color, w, h, { lw = 3, hl = true, outline = true } = {}) {
  g.save();
  path(g); g.fillStyle = shade(color); g.fill();
  g.save(); path(g); g.clip(); g.translate(-0.15 * w, -0.2 * h); path(g); g.fillStyle = color; g.fill(); g.restore();
  if (hl) { g.save(); path(g); g.clip(); g.translate(-0.3 * w, -0.36 * h); g.scale(1, 1); path(g); g.fillStyle = light(color); g.globalAlpha = 0.55; g.fill(); g.restore(); }
  if (outline) { path(g); g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); }
  g.restore();
}
export const ell = (x, y, rx, ry, rot = 0) => (g) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); };
export const rrect = (x, y, w, h, r) => (g) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
export const poly = (pts) => (g) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
export function line(g, pts, w, color = INK, cap = 'round') { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = color; g.lineCap = cap; g.lineJoin = 'round'; g.stroke(); }
// Толстая «конечность» с обводкой: сначала тёмная линия, потом цветная поверх.
export function limb(g, pts, w, color, lw = 3) { line(g, pts, w + lw * 2, INK); line(g, pts, w, color); }
// Офскрин-холст с запасом разрешения (×2) для чёткости при масштабировании сцены.
export const RES = 2;
export function bake(w, h, draw) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES);
  const g = c.getContext('2d'); g.scale(RES, RES); draw(g, w, h);
  c.lw = w; c.lh = h; return c;
}
// Белый силуэт (вспышка урона) и цветной вариант (клоны Страха)
export function tint(src, color, alpha = 1) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  c.lw = src.lw; c.lh = src.lh; return c;
}
// Рисование запечённого спрайта: якорь (ax, ay) в долях, поворот, масштаб, отражение.
export function blit(g, spr, x, y, { ax = 0.5, ay = 0.5, rot = 0, sx = 1, sy = 1, alpha = 1 } = {}) {
  if (!spr) return;
  g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (sx !== 1 || sy !== 1) g.scale(sx, sy);
  if (alpha !== 1) g.globalAlpha *= alpha;
  g.drawImage(spr, -spr.lw * ax, -spr.lh * ay, spr.lw, spr.lh);
  g.restore();
}
export function shadowBlob(g, x, y, rx, ry, a = 0.35) { g.save(); g.fillStyle = `rgba(20,8,16,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
export function text(g, s, x, y, { size = 16, color = '#f2ece0', align = 'center', weight = 800, stroke = INK, sw = 4, base = 'middle' } = {}) {
  g.save(); g.font = `${weight} ${size}px "Trebuchet MS", Arial, sans-serif`; g.textAlign = align; g.textBaseline = base;
  if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y); g.restore();
}
