// Окно «Кабина»: 176×110, справа сверху (отступ 12), рамка 3 px #1d1519, радиус 10.
// Пульт с 4 рычагами («НОГИ», «РУКИ», «ГЛАЗА», «РАВНОВЕСИЕ»), паук в кресле, 8 поз + «rest» (финал S10:
// лапы отпускают рычаги, паук откидывается в кресле, глаза прикрыты).
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
const POSES = ['idle', 'walk', 'careful', 'wobble', 'panic', 'bump', 'use', 'cheer', 'rest'];
export function createCockpit(ctx) {
  const box = document.createElement('div'); box.id = 'cockpit';
  const cv = document.createElement('canvas'); box.append(cv); ctx.hudRoot.parentNode.insertBefore(box, ctx.hudRoot.nextSibling);
  const g = cv.getContext('2d');
  const bg = new Image(); let bgOk = false; bg.onload = () => { bgOk = true; }; bg.src = 'assets/brain_baked/SPR_COCKPIT_BG_DRAFT.png';
  let visible = false, pose = 'idle', poseT = 0, tmpPose = null, tmpT = 0, L = 0, time = 0, big = false;
  const C = CFG.ui.cockpit;
  const levers = [0, 0, 0, 0];
  const labels = ['world.legs', 'world.arms', 'world.eyes', 'world.balance'].map((k) => t(k));
  const api = {
    wanted: false,
    POSES,
    show(on) { api.wanted = on; visible = on && ctx.settings.cockpit; box.style.display = visible ? 'block' : 'none'; if (!on) { api.grow(false); } },
    get visible() { return visible; },
    setPose(p) { if (POSES.includes(p) && p !== pose) { pose = p; poseT = 0; } },
    flash(p, dur = CFG.ui.cockpit.bumpDur) { if (POSES.includes(p)) { tmpPose = p; tmpT = dur; } },
    setBalance(v) { L = v; },
    grow(on) { big = on; box.style.width = (on ? C.big.w : C.w) + 'px'; box.style.height = (on ? C.big.h : C.h) + 'px'; },
    get pose() { return tmpPose || pose; },
    update(dt) {
      if (!visible) return;
      time += dt; poseT += dt; if (tmpPose) { tmpT -= dt; if (tmpT <= 0) tmpPose = null; }
      const p = api.pose;
      const target = [0, 0, 0, 0];
      if (p === 'walk') target[0] = Math.sin(time * 9) * 0.8;
      if (p === 'careful') target[0] = Math.sin(time * 4) * 0.4;
      if (p === 'use') target[1] = 1;
      if (p === 'wobble') target[3] = Math.sin(time * 6) * 0.7;
      if (p === 'panic') for (let i = 0; i < 4; i++) target[i] = Math.sin(time * 23 + i * 2) * 0.9;
      if (p === 'cheer') target[2] = 1;
      for (let i = 0; i < 4; i++) levers[i] += (target[i] - levers[i]) * Math.min(1, dt * 12);
      api.draw();
    },
    draw() {
      const w = big ? C.big.w : C.w, h = big ? C.big.h : C.h;
      const dpr = Math.min(2, (window.devicePixelRatio || 1) * (ctx.stageScale || 1));
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      g.setTransform(dpr * w / C.w, 0, 0, dpr * h / C.h, 0, 0);
      const p = api.pose;
      // фон
      if (bgOk) g.drawImage(bg, 0, 0, C.w, C.h);
      else { const gr = g.createLinearGradient(0, 0, 0, C.h); gr.addColorStop(0, '#4a2036'); gr.addColorStop(1, '#2b1424'); g.fillStyle = gr; g.fillRect(0, 0, C.w, C.h); }
      g.fillStyle = 'rgba(20,8,16,.35)'; g.fillRect(0, 0, C.w, C.h);
      // экран-«глаз»: что видит человек
      g.fillStyle = p === 'panic' ? '#5a1a2a' : '#1d2a3a'; g.strokeStyle = '#1d1519'; g.lineWidth = 2;
      rr(g, 52, 6, 72, 26, 4); g.fill(); g.stroke();
      g.fillStyle = p === 'panic' ? '#ff7a8a' : '#7fd1ff'; g.globalAlpha = 0.6 + 0.3 * Math.sin(time * 3);
      for (let i = 0; i < 6; i++) g.fillRect(56 + i * 11, 18 + Math.sin(time * 4 + i) * 4, 6, 2);
      g.globalAlpha = 1;
      // пульт
      g.fillStyle = '#3a2e48'; g.strokeStyle = '#1d1519'; g.lineWidth = 2;
      rr(g, 6, 74, 164, 32, 6); g.fill(); g.stroke();
      const xs = [28, 66, 108, 146];
      for (let i = 0; i < 4; i++) {
        const x = xs[i], a = levers[i] * 0.7;
        g.strokeStyle = '#1d1519'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 90); g.lineTo(x + Math.sin(a) * 14, 90 - Math.cos(a) * 14); g.stroke();
        g.strokeStyle = '#c9c0d0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 90); g.lineTo(x + Math.sin(a) * 14, 90 - Math.cos(a) * 14); g.stroke();
        g.fillStyle = ['#4a8fd9', '#d9b45a', '#7fd18b', '#d95a7a'][i]; g.beginPath(); g.arc(x + Math.sin(a) * 14, 90 - Math.cos(a) * 14, 3.6, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#f2ece0'; g.font = '700 6px Trebuchet MS, Arial'; g.textAlign = 'center'; g.fillText(labels[i], x, 103);
      }
      // кресло
      const rest = p === 'rest' ? Math.min(1, poseT / 0.8) : 0; // откидывание в кресле
      const sx = 88, sy = 54 + (p === 'cheer' ? -3 * Math.abs(Math.sin(time * 8)) : 0) + (p === 'bump' ? 2 : 0) - 5 * rest + (p === 'rest' ? Math.sin(time * 1.6) * 0.6 : 0);
      const wob = p === 'wobble' ? Math.sin(time * 7) * 0.12 : p === 'panic' ? Math.sin(time * 25) * 0.08 : p === 'rest' ? -0.1 * rest : 0;
      g.fillStyle = '#6b4f7a'; g.strokeStyle = '#1d1519'; g.lineWidth = 2; rr(g, sx - 17, 40, 34, 32, 8); g.fill(); g.stroke();
      g.save(); g.translate(sx, sy); g.rotate(wob);
      // лапы к рычагам
      g.strokeStyle = '#2a1f2e'; g.lineWidth = 2;
      const reach = (tx, ty, bend) => { g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo((tx) * 0.5, ty * 0.3 - bend, tx, ty); g.stroke(); };
      for (let i = 0; i < 4; i++) {
        const x = xs[i] - sx + Math.sin(levers[i] * 0.7) * 14, y = 90 - sy - Math.cos(levers[i] * 0.7) * 14;
        // rest: лапы отпускают рычаги и ложатся на подлокотники
        const rx = (i < 2 ? -1 : 1) * (14 + (i % 2 ? 0 : 5)), ry = 10 + (i % 2) * 4;
        reach(x + (rx - x) * rest, y + (ry - y) * rest, 10 - 6 * rest);
      }
      if (p === 'cheer') { reach(-20, -24, 2); reach(20, -24, 2); }
      else if (p === 'rest') { reach(-12, -16, 2); reach(12, -16, 2); } // лапы за головой
      else { reach(-22, -6, 4); reach(22, -6, 4); }
      // брюшко и головогрудь
      g.fillStyle = '#3a2b45'; g.beginPath(); g.ellipse(0, -9, 11, 9, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#6b4f7a'; for (const [x, y] of [[-4, -12], [4, -11], [0, -6]]) { g.beginPath(); g.ellipse(x, y, 2.2, 1.4, 0, 0, 7); g.fill(); }
      g.fillStyle = '#2f2433'; g.beginPath(); g.ellipse(0, 3, 8, 6.5, 0, 0, 7); g.fill(); g.stroke();
      // глаза
      const eyeY = p === 'panic' ? 1 : 2, big2 = p === 'panic' || p === 'bump' ? 2.6 : 2;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-3, eyeY, big2, 0, 7); g.arc(3, eyeY, big2, 0, 7); g.fill();
      g.fillStyle = '#1d1519'; g.beginPath(); g.arc(-3, eyeY + 0.4, 1, 0, 7); g.arc(3, eyeY + 0.4, 1, 0, 7); g.fill();
      if (rest > 0) { g.fillStyle = '#2f2433'; g.beginPath(); g.rect(-6, eyeY - 3, 12, 3 * rest); g.fill(); g.strokeStyle = '#1d1519'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-5.5, eyeY - 3 + 3 * rest); g.lineTo(-0.8, eyeY - 3 + 3 * rest); g.moveTo(0.8, eyeY - 3 + 3 * rest); g.lineTo(5.5, eyeY - 3 + 3 * rest); g.stroke(); }
      if (p === 'panic') { g.fillStyle = '#8fd0ff'; g.beginPath(); g.ellipse(9, -2, 1.5, 2.4, 0, 0, 7); g.fill(); }
      g.restore();
      // индикатор равновесия справа
      const lv = Math.max(0, Math.min(1, L / 100));
      g.fillStyle = 'rgba(0,0,0,.5)'; rr(g, 162, 8, 8, 60, 3); g.fill();
      g.fillStyle = L >= CFG.bal.shaky ? '#d95a7a' : L >= CFG.bal.wobble ? '#e8a04a' : '#7fd18b';
      rr(g, 163, 9 + 58 * (1 - lv), 6, 58 * lv, 2); g.fill();
      if (L >= CFG.bal.shaky && Math.floor(time * 4) % 2 === 0) { g.strokeStyle = '#d95a7a'; g.lineWidth = 3; rr(g, 1.5, 1.5, C.w - 3, C.h - 3, 9); g.stroke(); }
      if (p === 'bump') { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 0, C.w, C.h); }
    },
    dispose() { box.remove(); },
  };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  return api;
}
