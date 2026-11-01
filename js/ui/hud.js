// HUD: подсказки-кейкапы (3,5 с), подсказки действий, субтитры, тосты, баннеры, шкалы, таймер, кольцо удержания.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { el } from './dom.js';
export function createHud(ctx) {
  const root = ctx.hudRoot;
  const owned = new Set();
  let hintsEl = null, hintTimer = 0, promptEl = null, promptText = '', subEl = null, subTimer = 0, toastEl = null, toastTimer = 0;
  let bannerEl = null, bannerTimer = 0;
  const meters = new Map();
  let timerEl = null, ringEl = null;
  const add = (e) => { root.append(e); owned.add(e); return e; };
  const hud = {
    hints(list) {
      hintsEl?.remove();
      hintsEl = add(el('div', 'hints'));
      for (const [keys, label] of list) {
        const h = el('div', 'hint');
        for (const k of keys.split(' ')) h.append(el('span', 'key', k));
        h.append(el('span', '', t(label)));
        hintsEl.append(h);
      }
      hintTimer = CFG.ui.hintDur;
    },
    prompt(text) {
      if (!text) { if (promptEl) { promptEl.remove(); owned.delete(promptEl); promptEl = null; promptText = ''; } return; }
      if (text === promptText && promptEl) return;
      if (!promptEl) promptEl = add(el('div', 'prompt'));
      promptEl.textContent = text; promptText = text;
    },
    subtitle(text, dur = 2.5, who = '') {
      if (!subEl) subEl = add(el('div', 'subtitle'));
      subEl.innerHTML = '';
      if (who) subEl.append(el('span', 'who', who + ':'));
      subEl.append(document.createTextNode(text));
      subEl.style.opacity = '1'; subTimer = Math.max(CFG.ui.subtitleMin, dur);
    },
    clearSubtitle() { if (subEl) subEl.style.opacity = '0'; subTimer = 0; },
    toast(text, dur = CFG.ui.toast) { if (!toastEl) toastEl = add(el('div', 'toast')); toastEl.textContent = text; toastEl.style.opacity = '1'; toastTimer = dur; },
    banner(text, cls = '', dur = 2.0) { if (!bannerEl) bannerEl = add(el('div', 'banner')); bannerEl.className = 'banner ' + cls; bannerEl.textContent = text; bannerEl.style.opacity = '1'; bannerTimer = dur; },
    meter(id, labelKey, value, { x = 12, y = 120, state = '' } = {}) {
      let m = meters.get(id);
      if (!m) {
        const e = add(el('div', 'meter')); e.style.left = x + 'px'; e.style.top = y + 'px';
        const lab = el('div', '', t(labelKey)); const bar = el('div', 'bar'); const fill = el('div', 'fill'); bar.append(fill); e.append(lab, bar);
        m = { e, fill }; meters.set(id, m);
      }
      m.fill.style.width = Math.round(Math.max(0, Math.min(1, value)) * 100) + '%';
      m.e.className = 'meter ' + state;
    },
    removeMeter(id) { const m = meters.get(id); if (m) { m.e.remove(); owned.delete(m.e); meters.delete(id); } },
    timer(text, red = false, pos = '') {
      if (text == null) { timerEl?.remove(); timerEl = null; return; }
      if (!timerEl) timerEl = add(el('div', 'timer' + (pos ? ' ' + pos : '')));
      timerEl.textContent = text; timerEl.classList.toggle('red', red);
    },
    // кольцо удержания (например, «Удерживай E»), позиция — в логических пикселях
    ring(progress, x = 480, y = 300, label = 'E') {
      if (progress == null) { ringEl?.remove(); ringEl = null; return; }
      if (!ringEl) {
        ringEl = add(el('div', 'ring'));
        ringEl.innerHTML = '<svg viewBox="0 0 46 46" width="46" height="46"><circle cx="23" cy="23" r="18" fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.25)" stroke-width="5"/><circle class="p" cx="23" cy="23" r="18" fill="none" stroke="#7fd18b" stroke-width="5" stroke-linecap="round" stroke-dasharray="113.1" stroke-dashoffset="113.1" transform="rotate(-90 23 23)"/><text x="23" y="28" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">E</text></svg>';
      }
      ringEl.style.left = (x - 23) + 'px'; ringEl.style.top = (y - 23) + 'px';
      const tx = ringEl.querySelector('text'); if (tx.textContent !== label) tx.textContent = label;
      ringEl.querySelector('.p').setAttribute('stroke-dashoffset', String(113.1 * (1 - Math.max(0, Math.min(1, progress)))));
    },
    update(dt) {
      if (hintsEl && hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) { hintsEl.style.opacity = '0'; } }
      if (subEl && subTimer > 0) { subTimer -= dt; if (subTimer <= 0) subEl.style.opacity = '0'; }
      if (toastEl && toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastEl.style.opacity = '0'; }
      if (bannerEl && bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) bannerEl.style.opacity = '0'; }
    },
    clear() {
      for (const e of owned) e.remove(); owned.clear(); meters.clear();
      hintsEl = promptEl = subEl = toastEl = bannerEl = timerEl = ringEl = null; promptText = '';
    },
  };
  return hud;
}
