// Частицы (пул объектов, без аллокаций в кадре) и экранные оверлеи: MEM_OVERLAY (зерно, виньетка, помехи), вспышка.
import { INK } from './style.js';
const TYPES = {
  spark: { life: [0.18, 0.32], speed: [140, 280], size: [2, 3.5], color: '#fff1b0', drag: 6, grav: 0 },
  dust: { life: [0.35, 0.6], speed: [30, 90], size: [3, 6], color: '#c8b8d8', drag: 4, grav: -10 },
  web: { life: [0.4, 0.7], speed: [60, 140], size: [5, 9], color: '#f2ece0', drag: 5, grav: 0 },
  drop: { life: [0.45, 0.7], speed: [60, 140], size: [2, 3], color: '#9fd8ff', drag: 1, grav: 380 },
  paper: { life: [0.9, 1.4], speed: [60, 160], size: [4, 6], color: '#f2ece0', drag: 2.5, grav: 60 },
  heart: { life: [0.5, 0.8], speed: [80, 160], size: [3, 4], color: '#d95a7a', drag: 3, grav: 200 },
  star: { life: [0.5, 0.8], speed: [40, 90], size: [3, 4.5], color: '#ffe27a', drag: 3, grav: 0 },
  puff: { life: [0.3, 0.45], speed: [0, 0], size: [8, 12], color: '#fff6e8', drag: 0, grav: 0 },
};
export function createParticles(max = 160, { lessFx = () => false } = {}) {
  const pool = Array.from({ length: max }, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, type: 'spark', rot: 0, vr: 0, color: '' }));
  let alive = 0;
  const rnd = (a) => a[0] + Math.random() * (a[1] - a[0]);
  return {
    emit(type, x, y, n = 6, { dir = null, spread = Math.PI * 2, color = null, speedMul = 1 } = {}) {
      const T = TYPES[type]; if (!T) return;
      if (lessFx()) n = Math.max(1, Math.round(n * 0.4));
      for (let k = 0; k < n; k++) {
        let p = null;
        for (let i = 0; i < pool.length; i++) if (!pool[i].alive) { p = pool[i]; break; }
        if (!p) return;
        const a = dir == null ? Math.random() * Math.PI * 2 : dir + (Math.random() - 0.5) * spread;
        const s = rnd(T.speed) * speedMul;
        p.alive = true; p.type = type; p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
        p.max = p.life = rnd(T.life); p.size = rnd(T.size); p.rot = a; p.vr = (Math.random() - 0.5) * 8; p.color = color || T.color;
        alive++;
      }
    },
    update(dt) {
      for (const p of pool) {
        if (!p.alive) continue;
        p.life -= dt; if (p.life <= 0) { p.alive = false; alive--; continue; }
        const T = TYPES[p.type];
        const k = Math.exp(-T.drag * dt); p.vx *= k; p.vy *= k; p.vy += T.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
    },
    draw(g) {
      for (const p of pool) {
        if (!p.alive) continue;
        const u = p.life / p.max;
        g.globalAlpha = Math.min(1, u * 1.6);
        if (p.type === 'spark') { g.strokeStyle = p.color; g.lineWidth = p.size * 0.7; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); g.stroke(); }
        else if (p.type === 'web') { g.strokeStyle = p.color; g.lineWidth = 1.2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.cos(p.rot) * p.size, p.y + Math.sin(p.rot) * p.size); g.stroke(); }
        else if (p.type === 'paper') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size * 0.65, p.size, p.size * 1.3); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(-p.size / 2, -p.size * 0.65, p.size, p.size * 1.3); g.restore(); }
        else if (p.type === 'star') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color; star(g, p.size); g.fill(); g.restore(); }
        else if (p.type === 'puff') { g.strokeStyle = p.color; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, p.size * (1.8 - u), 0, Math.PI * 2); g.stroke(); }
        else { g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (p.type === 'dust' ? (1.6 - u * 0.6) : 1), 0, Math.PI * 2); g.fill(); }
      }
      g.globalAlpha = 1;
    },
    clear() { for (const p of pool) p.alive = false; alive = 0; },
    get count() { return alive; },
    get capacity() { return pool.length; },
  };
}
export function star(g, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); }
// Звёздочки оглушения над головой
export function stunStars(g, x, y, t, n = 3) {
  for (let i = 0; i < n; i++) {
    const a = t * 4 + i * Math.PI * 2 / n;
    g.save(); g.translate(x + Math.cos(a) * 14, y + Math.sin(a) * 5); g.rotate(t * 3 + i);
    g.fillStyle = '#ffe27a'; star(g, 4.5); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(); g.restore();
  }
}
// MEM_OVERLAY: зерно + виньетка + горизонтальные помехи (для воспоминаний). «Меньше эффектов» — без зерна и помех.
let grain = null;
function grainCanvas() {
  if (grain) return grain;
  grain = document.createElement('canvas'); grain.width = grain.height = 128;
  const g = grain.getContext('2d'), d = g.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 28; }
  g.putImageData(d, 0, 0); return grain;
}
export function memOverlay(g, t, { strength = 1, lessFx = false, w = 960, h = 540, tint = 'rgba(217,199,160,0.10)' } = {}) {
  g.save();
  g.fillStyle = tint; g.globalAlpha = strength; g.fillRect(0, 0, w, h);
  if (!lessFx) {
    const gc = grainCanvas(), ox = (t * 977) % 128, oy = (t * 613) % 128;
    g.globalAlpha = 0.5 * strength; g.translate(-ox, -oy);
    for (let x = 0; x < w + 128; x += 128) for (let y = 0; y < h + 128; y += 128) g.drawImage(gc, x, y);
    g.setTransform(g.getTransform().a, 0, 0, g.getTransform().d, 0, 0);
    if (Math.sin(t * 7.3) > 0.93) { g.globalAlpha = 0.25 * strength; g.fillStyle = '#fff6e8'; const y = (t * 300) % h; g.fillRect(0, y, w, 3); g.fillRect(0, (y + 140) % h, w, 1.5); }
  }
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
  vg.addColorStop(0, 'rgba(43,34,54,0)'); vg.addColorStop(1, 'rgba(43,34,54,0.85)');
  g.globalAlpha = strength; g.fillStyle = vg; g.fillRect(0, 0, w, h);
  g.restore();
}
