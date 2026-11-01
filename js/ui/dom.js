// DOM-помощники: элементы, модальные окна с клавиатурной навигацией, затемнение.
import { listen } from '../core/events.js';
import { t } from '../text/ru.js';
export function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
export function button(text, onClick, cls = 'btn') { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', (e) => { e.preventDefault(); onClick?.(e); }); return b; }

// Фокус-менеджер: стрелки/WS — выбор, Enter/Space — нажать, Esc — назад.
export function focusNav(container, { onEsc, axis = 'v', audio } = {}) {
  let idx = 0;
  const items = () => [...container.querySelectorAll('button:not([disabled]), .setrow[tabindex]')].filter((b) => b.offsetParent !== null || b.getClientRects().length);
  const mark = () => { const list = items(); list.forEach((b, i) => b.classList.toggle('focus', i === idx)); };
  const off = listen(window, 'keydown', (e) => {
    const list = items(); if (!list.length) return;
    const prev = ['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA'], next = ['ArrowDown', 'KeyS', 'ArrowRight', 'KeyD'];
    const cur = list[idx];
    if (cur && cur.classList.contains('setrow') && ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
      e.preventDefault(); cur.dispatchEvent(new CustomEvent('adjust', { detail: ['ArrowLeft', 'KeyA'].includes(e.code) ? -1 : 1 })); return;
    }
    if (prev.includes(e.code) || (axis === 'v' && false)) { e.preventDefault(); idx = (idx - 1 + list.length) % list.length; mark(); audio?.play('UI_FOCUS'); }
    else if (next.includes(e.code)) { e.preventDefault(); idx = (idx + 1) % list.length; mark(); audio?.play('UI_FOCUS'); }
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') { e.preventDefault(); if (e.repeat) return; const b = list[idx]; if (b) { if (b.classList.contains('setrow')) b.dispatchEvent(new CustomEvent('adjust', { detail: 0 })); else b.click(); } }
    else if (e.code === 'Escape') { e.preventDefault(); onEsc?.(); }
  }, true);
  container.addEventListener('mousemove', (e) => { const list = items(); const i = list.indexOf(e.target.closest('button, .setrow')); if (i >= 0 && i !== idx) { idx = i; mark(); } });
  setTimeout(mark, 0);
  return { dispose: off, refresh: mark, focus(i) { idx = i; mark(); } };
}
// Модальное окно. buttons: [{text, onClick, primary}]
export function modal(root, { title, text, buttons = [], onEsc, cls = '' } = {}, audio) {
  const back = el('div', 'modal-back'); const box = el('div', 'panel modal ' + cls);
  if (title) box.append(el('h2', '', title)); if (text) box.append(el('p', '', text));
  const row = el('div', 'row');
  let nav = null;
  const close = () => { nav?.dispose(); back.remove(); };
  for (const b of buttons) row.append(button(b.text, () => { audio?.play('UI_CONFIRM'); close(); b.onClick?.(); }, 'btn' + (b.primary ? ' primary' : '')));
  box.append(row); back.append(box); root.append(back);
  nav = focusNav(box, { onEsc: onEsc ? () => { audio?.play('UI_BACK'); close(); onEsc(); } : null, audio });
  return { close, el: back };
}
export function createFade(elm) {
  let raf = 0, alpha = 0;
  const f = {
    get alpha() { return alpha; },
    set(a) { cancelAnimationFrame(raf); alpha = a; elm.style.opacity = a; elm.style.pointerEvents = a > 0.5 ? 'auto' : 'none'; },
    to(target, dur) {
      cancelAnimationFrame(raf);
      if (!dur) { f.set(target); return Promise.resolve(); }
      const start = alpha, t0 = performance.now();
      return new Promise((res) => {
        const step = (now) => {
          const u = Math.min(1, (now - t0) / (dur * 1000));
          alpha = start + (target - start) * u; elm.style.opacity = alpha; elm.style.pointerEvents = alpha > 0.5 ? 'auto' : 'none';
          if (u < 1) raf = requestAnimationFrame(step); else res();
        };
        raf = requestAnimationFrame(step);
      });
    },
  };
  return f;
}
export function fmtTime(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); }
export { t };
