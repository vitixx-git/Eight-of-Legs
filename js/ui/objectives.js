// Блок задач слева сверху: «○» → «✓» (#7fd18b) со вспышкой и UI_TASK_DONE.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { el } from './dom.js';
export function createObjectives(ctx) {
  let root = null, items = [], keys = [], vars = {};
  const api = {
    set(list, animate = false, v = {}) {
      api.clear(); keys = list.slice(); vars = { ...v };
      root = el('div'); root.id = 'objectives';
      items = keys.map((k) => { const d = el('div', 'obj'); d.append(el('span', 'm', '○'), el('span', 'tx', t(k, vars[k] || { n: 0 }))); root.append(d); return { d, done: false }; });
      ctx.hudRoot.append(root);
      api.markCurrent();
      if (animate && ctx.card.lastRect) {
        const st = ctx.stageRect(), r = ctx.card.lastRect, s = st.scale;
        const dx = (r.left - st.left) / s - 12, dy = (r.top - st.top) / s - 12;
        root.style.transformOrigin = '0 0';
        root.style.transform = `translate(${dx}px, ${dy}px) scale(1.25)`;
        root.style.opacity = '0.4';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!root) return;
          root.style.transition = `transform ${CFG.ui.cardTween}s cubic-bezier(.2,.8,.2,1), opacity ${CFG.ui.cardTween}s`;
          root.style.transform = 'translate(0,0) scale(1)'; root.style.opacity = '1';
        }));
      }
    },
    markCurrent() { let found = false; items.forEach((it) => { const cur = !it.done && !found; if (cur) found = true; it.d.classList.toggle('current', cur); }); },
    done(i, silent = false) {
      const it = items[i]; if (!it || it.done) return;
      it.done = true; it.d.classList.add('done', 'flash'); it.d.querySelector('.m').textContent = '✓';
      if (!silent) ctx.audio.play('UI_TASK_DONE');
      setTimeout(() => it.d.classList.remove('flash'), CFG.ui.doneFlash * 1000);
      api.markCurrent();
    },
    isDone(i) { return !!items[i]?.done; },
    text(i, v) { const it = items[i]; if (!it) return; vars[keys[i]] = v; it.d.querySelector('.tx').textContent = t(keys[i], v); },
    clear() { root?.remove(); root = null; items = []; keys = []; },
    get count() { return items.length; },
  };
  return api;
}
