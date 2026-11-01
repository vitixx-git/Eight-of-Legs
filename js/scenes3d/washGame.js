// Мини-игра «Умывание» (S07): полоса 360×26, зелёная зона 30 % по центру, стрелка дрейфует по синусу 0,55 Гц
// с амплитудой 42 %, A/D смещают её на 0,9 ширины/с. Внутри зоны прогресс шага 1,6 с, вне — стоит;
// 0,6 с подряд вне зоны — ошибка (шаг повторяется). 3 шага. Рисуется поверх 3D на 2D-холсте.
// Шаг 1 «Открыть кран» — отдельная механика: тугой вентиль крутится попеременными нажатиями A/D
// (каждое чередование +push, ~12 нажатий). Без нажатий дольше grace вентиль пружинит назад (back/с).
// Та же сторона дважды подряд — рука соскальзывает (−slip). Нажатия берутся по фронтам оси,
// поэтому работают и стрелки, и автопилот.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';

const W = CFG.wash, TAP = W.tap;
export function createWash(ctx, { onStep, onError, onDone } = {}) {
  const g = {
    step: 0, prog: 0, base: 0, time: 0, outT: 0, errFlash: 0, okFlash: 0, done: false, errors: 0, lastAx: 0, lastPush: 0, idleT: 0, slipT: 0, spin: 0,
    get isTap() { return g.step === 0; },
    get arrow() { return Math.max(0, Math.min(1, 0.5 + g.base + W.amp * Math.sin(g.time * Math.PI * 2 * W.freq))); },
    get inZone() { return Math.abs(g.arrow - 0.5) <= W.zone / 2; },
    update(dt) {
      if (g.done) return;
      g.time += dt; g.errFlash = Math.max(0, g.errFlash - dt); g.okFlash = Math.max(0, g.okFlash - dt);
      const ax = ctx.input.axis().x;
      if (g.isTap) { tapUpdate(dt, ax); return; }
      g.base = Math.max(-0.5 - W.amp, Math.min(0.5 + W.amp, g.base + ax * W.move * dt));
      if (g.inZone) {
        g.outT = 0; g.prog += dt / W.stepTime;
        if (Math.floor(g.prog * 8) !== Math.floor((g.prog - dt / W.stepTime) * 8)) ctx.audio.play('WASH_TICK', { vol: 0.25 });
        if (g.prog >= 1) nextStep();
      } else {
        g.outT += dt;
        if (g.outT >= W.failOut) { g.outT = 0; g.prog = 0; g.errors++; g.errFlash = 0.6; ctx.audio.play('WASH_ERROR', { vol: 0.7 }); onError?.(g.step); }
      }
    },
    draw() {
      if (g.isTap) { drawTap(); return; }
      const c = ctx.g2d(), cx = 480, y = 372, bw = W.barW, bh = W.barH, x0 = cx - bw / 2;
      c.save();
      // подложка
      c.fillStyle = 'rgba(29,21,25,.84)'; rr(c, x0 - 22, y - 74, bw + 44, bh + 118, 12); c.fill();
      c.strokeStyle = '#1d1519'; c.lineWidth = 3; c.stroke();
      c.textAlign = 'center'; c.fillStyle = '#f2ece0';
      c.font = '900 20px Trebuchet MS, Arial'; c.fillText(t('wash.title') + ' · ' + Math.min(W.steps, g.step + 1) + '/' + W.steps, cx, y - 46);
      c.font = '800 17px Trebuchet MS, Arial'; c.fillStyle = g.errFlash > 0 ? '#ff8a8a' : '#ffd36b';
      c.fillText(g.errFlash > 0 ? t('wash.error') : g.done ? t('wash.done') : t('wash.step' + Math.min(W.steps, g.step + 1)), cx, y - 18);
      // полоса и зона
      const shake = g.errFlash > 0 ? Math.sin(g.time * 70) * 4 * g.errFlash : 0;
      c.translate(shake, 0);
      c.fillStyle = '#3a2e48'; rr(c, x0, y, bw, bh, 8); c.fill(); c.strokeStyle = '#1d1519'; c.lineWidth = 2; c.stroke();
      const zw = bw * W.zone, zx = cx - zw / 2;
      c.fillStyle = g.inZone ? '#7fd18b' : '#4f8f5a'; rr(c, zx, y + 2, zw, bh - 4, 6); c.fill();
      // стрелка
      const ax = x0 + g.arrow * bw;
      c.fillStyle = g.inZone ? '#ffffff' : '#ff8a8a'; c.strokeStyle = '#1d1519'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ax, y - 4); c.lineTo(ax - 9, y - 16); c.lineTo(ax + 9, y - 16); c.closePath(); c.fill(); c.stroke();
      c.fillRect(ax - 2, y - 2, 4, bh + 4);
      // прогресс шага и шагов
      c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, x0, y + bh + 12, bw, 10, 5); c.fill();
      c.fillStyle = g.okFlash > 0 ? '#ffffff' : '#7fc8ff'; rr(c, x0, y + bh + 12, bw * Math.min(1, g.prog), 10, 5); c.fill();
      for (let i = 0; i < W.steps; i++) { c.fillStyle = i < g.step ? '#7fd18b' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(cx - 20 + i * 20, y + bh + 36, 5, 0, 7); c.fill(); }
      c.font = '700 14px Trebuchet MS, Arial'; c.fillStyle = 'rgba(242,236,224,.8)'; c.fillText(t('wash.hint'), cx, y + bh + 58);
      c.restore();
    },
  };
  function nextStep() {
    g.prog = 0; g.step++; g.okFlash = 0.5;
    ctx.audio.play('WASH_STEP_OK', { vol: 0.7 });
    onStep?.(g.step);
    if (g.step >= W.steps) { g.done = true; ctx.audio.play('WASH_DONE', { vol: 0.8 }); onDone?.(); }
  }
  function tapUpdate(dt, ax) {
    g.slipT = Math.max(0, g.slipT - dt); g.idleT += dt;
    const s = ax > 0.5 ? 1 : ax < -0.5 ? -1 : 0, prev = g.lastAx; g.lastAx = s;
    if (s !== 0 && s !== prev) {               // фронт нажатия
      if (s !== g.lastPush) {
        const before = g.prog; g.prog = Math.min(1, g.prog + TAP.push); g.lastPush = s; g.idleT = 0; g.spin = 0.18;
        if (Math.floor(g.prog * 6) !== Math.floor(before * 6)) ctx.audio.play('WASH_TICK', { vol: 0.3 });
        if (g.prog >= 1) { g.lastPush = 0; nextStep(); return; }
      } else {                                 // та же рука дважды — соскользнула
        g.prog = Math.max(0, g.prog - TAP.slip); g.slipT = 0.6; g.errFlash = 0.35; g.errors++;
        ctx.audio.play('WASH_ERROR', { vol: 0.5 }); onError?.(g.step);
      }
    }
    if (g.idleT > TAP.grace) g.prog = Math.max(0, g.prog - TAP.back * dt);
    g.spin = Math.max(0, g.spin - dt);
  }
  function drawTap() {   // панель выше обычной на 30 px, чтобы не наезжать на подсказки управления
    const c = ctx.g2d(), cx = 480, y = 342, bw = W.barW, bh = W.barH, x0 = cx - bw / 2;
    c.save();
    c.fillStyle = 'rgba(29,21,25,.84)'; rr(c, x0 - 22, y - 74, bw + 44, 212, 12); c.fill();
    c.strokeStyle = '#1d1519'; c.lineWidth = 3; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#f2ece0';
    c.font = '900 20px Trebuchet MS, Arial'; c.fillText(t('wash.title') + ' · 1/' + W.steps, cx, y - 46);
    c.font = '800 17px Trebuchet MS, Arial'; c.fillStyle = g.slipT > 0 ? '#ff8a8a' : '#ffd36b';
    c.fillText(g.slipT > 0 ? t('wash.slip') : t('wash.step1'), cx, y - 18);
    const shake = g.errFlash > 0 ? Math.sin(g.time * 70) * 4 * g.errFlash : 0;
    c.translate(shake, 0);
    // вентиль: шкала давления по кругу + маховик со спицами, поворот = prog × turns оборотов
    const vx = cx, vy = y + 42, R = 26, ang = g.prog * TAP.turns * Math.PI * 2;
    c.lineWidth = 7; c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.arc(vx, vy, R + 11, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = g.prog > 0.75 ? '#7fd18b' : '#7fc8ff';
    if (g.prog > 0.002) { c.beginPath(); c.arc(vx, vy, R + 11, -Math.PI / 2, -Math.PI / 2 + g.prog * Math.PI * 2); c.stroke(); }
    c.lineCap = 'butt';
    c.save(); c.translate(vx, vy); c.rotate(ang);
    c.fillStyle = '#c94f4f'; c.strokeStyle = '#1d1519'; c.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); c.beginPath(); c.arc(0, -R + 3, 7, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillRect(-3, -R + 6, 6, R - 6); c.restore(); }
    c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fillStyle = '#e8e0d0'; c.fill(); c.stroke();
    c.restore();
    // капли/струя по мере открытия
    if (g.prog > 0.35) { c.fillStyle = 'rgba(127,200,255,.85)'; const n = Math.floor(g.prog * 5); for (let i = 0; i < n; i++) { const k = (g.time * 2.2 + i / n) % 1; c.beginPath(); c.arc(vx + R + 30, vy - 14 + k * 34, 2.5 + g.prog * 1.5, 0, Math.PI * 2); c.fill(); } }
    // клавиши A / D, подсвечена та, что нужна следующей
    const need = g.lastPush === -1 ? 1 : g.lastPush === 1 ? -1 : 0;
    key(c, cx - 120, vy, 'A', need <= 0, g.lastAx === -1);
    key(c, cx + 120, vy, 'D', need >= 0, g.lastAx === 1);
    turnArrow(c, cx - 76, vy, -1, need <= 0); turnArrow(c, cx + 76, vy, 1, need >= 0);
    for (let i = 0; i < W.steps; i++) { c.fillStyle = i < g.step ? '#7fd18b' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(cx - 20 + i * 20, y + 98, 5, 0, 7); c.fill(); }
    c.font = '700 14px Trebuchet MS, Arial'; c.fillStyle = 'rgba(242,236,224,.8)'; c.fillText(t('wash.hintTap'), cx, y + 124);
    c.restore();
  }
  return g;
}
function turnArrow(c, x, y, dir, lit) {   // дуговая стрелка поворота: dir −1 против часовой, +1 по часовой
  const r = 11, a0 = -Math.PI * 0.85, a1 = Math.PI * 0.35;
  c.strokeStyle = c.fillStyle = lit ? 'rgba(255,211,107,.9)' : 'rgba(242,236,224,.35)'; c.lineWidth = 3;
  c.save(); c.translate(x, y); if (dir < 0) c.scale(-1, 1);
  c.beginPath(); c.arc(0, 0, r, a0, a1); c.stroke();
  const ex = Math.cos(a1) * r, ey = Math.sin(a1) * r, tx = -Math.sin(a1), ty = Math.cos(a1);
  c.beginPath(); c.moveTo(ex + tx * 6, ey + ty * 6); c.lineTo(ex - ty * 5, ey + tx * 5); c.lineTo(ex + ty * 5, ey - tx * 5); c.closePath(); c.fill();
  c.restore();
}
function key(c, x, y, label, lit, down) {
  c.fillStyle = down ? '#ffffff' : lit ? '#ffd36b' : '#3a2e48'; c.strokeStyle = '#1d1519'; c.lineWidth = 2;
  rr(c, x - 17, y - 17 + (down ? 2 : 0), 34, 34, 7); c.fill(); c.stroke();
  c.fillStyle = lit || down ? '#1d1519' : 'rgba(242,236,224,.6)'; c.font = '900 18px Trebuchet MS, Arial'; c.textAlign = 'center';
  c.fillText(label, x, y + 6 + (down ? 2 : 0));
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
