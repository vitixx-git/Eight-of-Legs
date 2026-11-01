// Карточка серии: чёрный фон, «СЕРИЯ N» 18 + название 44 + задачи. 2,0 с, пропуск любой клавишей, кроме Esc.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { el } from './dom.js';
import { listen } from '../core/events.js';
export function createCard(ctx) {
  let current = null;
  return {
    get active() { return !!current; },
    lastRect: null,
    show(series, objectives) {
      return new Promise((resolve) => {
        const root = el('div', 'card');
        root.append(el('div', 'series', t('card.series', { n: series })), el('div', 'title', t('card.s' + series)));
        const ul = el('ul');
        for (const k of objectives) ul.append(el('li', '', t(k, { n: 0 })));
        root.append(ul, el('div', 'skip', t('card.skip')));
        ctx.uiRoot.append(root);
        ctx.audio.play('UI_CARD_IN');
        const t0 = performance.now();
        let done = false, raf = 0;
        const finish = () => {
          if (done) return; done = true; cancelAnimationFrame(raf); offKey(); offClick();
          this.lastRect = ul.getBoundingClientRect();
          root.style.transition = 'opacity .25s'; root.style.opacity = '0';
          setTimeout(() => root.remove(), 260);
          current = null; resolve();
        };
        const offKey = listen(window, 'keydown', (e) => { if (e.code !== 'Escape' && performance.now() - t0 > 250) { e.preventDefault(); finish(); } });
        const offClick = listen(root, 'pointerdown', () => finish());
        const tick = () => { if (performance.now() - t0 >= CFG.ui.cardDur * 1000) finish(); else raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        current = { finish };
      });
    },
    skip() { current?.finish(); },
  };
}
