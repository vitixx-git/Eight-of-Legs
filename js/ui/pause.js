// Пауза (Esc): update не вызывается, render — да (размытие), звук suspend().
import { t } from '../text/ru.js';
import { el, button, focusNav, modal } from './dom.js';
import { openSettings, openControls } from './settings.js';
export function createPause(ctx) {
  let back = null, nav = null;
  const p = {
    get open() { return !!back; },
    show() {
      if (back) return;
      ctx.loop.paused = true; ctx.scenes.pause(); ctx.audio.suspend(); ctx.stage.classList.add('blur');
      back = el('div', 'modal-back'); const box = el('div', 'panel modal');
      box.append(el('h2', '', t('pause.title')));
      const col = el('div', 'col');
      const canRestart = typeof ctx.scenes.current?.respawn === 'function' || ['S04_Reflex', 'S05_Fear', 'S06_Will', 'S09_Road'].includes(ctx.scenes.currentId);
      col.append(
        button(t('pause.resume'), () => p.hide(), 'btn primary'),
        button(t('pause.settings'), () => { nav.dispose(); openSettings(ctx, () => { nav = focusNav(box, { onEsc: () => p.hide() }); }); }),
        button(t('pause.controls'), () => { nav.dispose(); openControls(ctx, () => { nav = focusNav(box, { onEsc: () => p.hide() }); }); }),
      );
      if (canRestart && ctx.scenes.current?.kind !== 'cut') col.append(button(t('pause.restart'), () => { p.hide(true); ctx.scenes.restartCheckpoint(); }));
      col.append(button(t('pause.menu'), () => {
        nav.dispose();
        modal(ctx.uiRoot, { text: t('pause.menuConfirm'), buttons: [
          { text: t('menu.yes'), primary: true, onClick: () => { p.hide(true); ctx.scenes.goto('MENU'); } },
          { text: t('menu.no'), onClick: () => { nav = focusNav(box, { onEsc: () => p.hide() }); } }],
        onEsc: () => { nav = focusNav(box, { onEsc: () => p.hide() }); } });
      }));
      box.append(col); back.append(box); ctx.uiRoot.append(back);
      nav = focusNav(box, { onEsc: () => p.hide() });
    },
    hide(silent) {
      if (!back) return;
      nav?.dispose(); back.remove(); back = null;
      ctx.stage.classList.remove('blur');
      ctx.input.consumeAll(); ctx.loop.resetAccumulator();
      ctx.audio.resume(); ctx.scenes.resume(); ctx.loop.paused = false;
      if (!silent) ctx.audio.play('UI_BACK');
    },
  };
  return p;
}
