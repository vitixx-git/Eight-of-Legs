// Титры (25 с, пропуск удержанием Пробела 1,0 с) → меню (или обратно к итогам, если пришли оттуда — затем меню).
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { el } from './dom.js';
import { createHoldSkip } from './holdskip.js';
let ctx = null, root = null, scroll = null, skip = null, time = 0, h = 0, from = 'MENU', done = false;
const scene = {
  id: 'CREDITS', kind: '2d', series: null, objectives: [], checkpoints: ['start'],
  async enter(c, params) {
    ctx = c; time = 0; done = false; from = params.from || 'MENU'; ctx.show3d(false);
    if (ctx.save.data && ctx.save.flag('poisonDestroyed')) ctx.save.markCompleted(); // сохранение помечается как пройденное
    ctx.audio.setReverb('menu'); ctx.audio.music('M_CREDITS', { fade: 1.5 });
    root = el('div', 'credits'); root.style.background = 'transparent'; scroll = el('div', 'scroll');
    const add = (tag, key, cls) => scroll.append(el(tag, cls || '', t(key)));
    add('h1', 'credits.title'); add('p', 'credits.jam');
    for (const [hk, k] of [['credits.h.design', 'credits.design'], ['credits.h.code', 'credits.code'], ['credits.h.refs', 'credits.refs'], ['credits.h.qa', 'credits.qa']]) { add('h3', hk); add('p', k, 'big'); }
    scroll.append(el('h3', '', 'Three.js')); add('p', 'credits.threeAuthors', 'big'); add('p', 'credits.three');
    add('p', 'credits.audio'); add('p', 'credits.fonts');
    scroll.append(el('div', '', '\u00a0')); add('h1', 'credits.thanks');
    root.append(scroll); ctx.uiRoot.append(root);
    h = scroll.scrollHeight || 900;
    skip = createHoldSkip(ctx, () => scene.finish(), { duration: CFG.credits.holdSkip, label: 'hint.skip' });
  },
  finish() { if (done) return; done = true; ctx.scenes.goto('MENU'); },
  update(dt) {
    time += dt; skip?.update(dt);
    const u = Math.min(1, time / CFG.credits.dur);
    if (scroll) scroll.style.transform = `translateY(${CFG.stage.h - u * (h + CFG.stage.h * 0.55)}px)`;
    if (time >= CFG.credits.dur + 1) scene.finish();
  },
  render() {
    const g = ctx.g2d(); g.fillStyle = '#0f0b18'; g.fillRect(0, 0, CFG.stage.w, CFG.stage.h);
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.3 + 0.3 * Math.sin(time * 1.3 + i); g.fillStyle = '#dfe6ff'; g.fillRect((i * 137) % 960, (i * 71 + time * 6) % 540, 2, 2); }
    g.globalAlpha = 1;
  },
  exit() { skip?.dispose(); skip = null; root?.remove(); root = null; ctx.clear2d(); },
};
export default scene;
