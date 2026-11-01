// Пропуск удержанием Пробела 1,0 с: кольцо 18 px в правом нижнем углу.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { el } from './dom.js';
export function createHoldSkip(ctx, onSkip, { duration = CFG.ui.holdSkip, label = 'hint.skip' } = {}) {
  const root = el('div', 'holdskip');
  const r = CFG.ui.holdRing, c = 2 * Math.PI * r;
  root.innerHTML = `<span><span class="key">Пробел</span> ${t(label)}</span><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="${r}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="4"/><circle class="p" cx="22" cy="22" r="${r}" fill="none" stroke="#d9b45a" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 22 22)"/></svg>`;
  ctx.hudRoot.append(root);
  const p = root.querySelector('.p');
  let prog = 0, fired = false, last = performance.now();
  return {
    get progress() { return prog; },
    update(dt) {
      if (fired) return;
      // удержание меряется реальным временем: при просадке FPS (dt урезан до 0,1) или замедлении F4 пропуск всё равно занимает 1,0 с;
      // после паузы (большой разрыв) берём игровой dt
      const now = performance.now(), gap = (now - last) / 1000; last = now;
      dt = gap > 1.0 ? dt : gap;
      const held = ctx.input.down('action');
      prog = held ? Math.min(1, prog + dt / duration) : Math.max(0, prog - dt * 2);
      p.setAttribute('stroke-dashoffset', String(c * (1 - prog)));
      root.style.opacity = prog > 0 ? '1' : '.6';
      if (prog >= 1) { fired = true; ctx.audio.play('UI_SKIP'); onSkip(); }
    },
    dispose() { root.remove(); },
  };
}
