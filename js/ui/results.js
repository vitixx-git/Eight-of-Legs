// Экран итогов: время в игре, число повторов, «Пройти заново» / «Титры» / «Главное меню». Тёплое утро в 2D.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { el, button, focusNav, modal, fmtTime } from './dom.js';
let ctx = null, root = null, nav = null, time = 0;
function draw(g) {
  const W = CFG.stage.w, H = CFG.stage.h;
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#ffd9a8'); sky.addColorStop(0.6, '#f3b3be'); sky.addColorStop(1, '#6b4f7a');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const sx = 760, sy = 150 + Math.sin(time * 0.3) * 4;
  const halo = g.createRadialGradient(sx, sy, 20, sx, sy, 200); halo.addColorStop(0, 'rgba(255,246,232,.9)'); halo.addColorStop(1, 'rgba(255,246,232,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff6e8'; g.beginPath(); g.arc(sx, sy, 46, 0, 7); g.fill();
  // силуэт лаборатории и дома
  g.fillStyle = '#4a3a62'; g.fillRect(80, 330, 240, 210); g.fillRect(120, 300, 160, 40);
  g.fillStyle = '#d9b45a'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) g.fillRect(100 + i * 56, 350 + j * 52, 30, 26);
  g.fillStyle = '#3a2e48'; g.beginPath(); g.moveTo(600, 360); g.lineTo(700, 290); g.lineTo(800, 360); g.fill(); g.fillRect(615, 360, 170, 180);
  g.fillStyle = '#2b2236'; g.fillRect(0, 470, W, 70);
  // паук машет лапкой на крыше дома
  const px = 700, py = 286 + Math.abs(Math.sin(time * 4)) * -3;
  g.fillStyle = '#2f2433'; g.strokeStyle = '#1d1519'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(px, py, 9, 7, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(px, py - 12, 6, 5, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(px + 5, py - 12); g.lineTo(px + 16, py - 26 + Math.sin(time * 9) * 4); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px - 2, py - 13, 1.6, 0, 7); g.arc(px + 2, py - 13, 1.6, 0, 7); g.fill();
}
const scene = {
  id: 'RESULTS', kind: '2d', series: null, objectives: [], checkpoints: ['start'],
  async enter(c) {
    ctx = c; time = 0; ctx.show3d(false);
    ctx.audio.setReverb('menu'); ctx.audio.music('M_END'); ctx.audio.ambience('AMB_HOUSE_MORNING');
    const d = ctx.save.ensure();
    if (d.scene !== 'RESULTS') { d.scene = 'RESULTS'; d.checkpoint = 'start'; }
    d.flags.poisonDestroyed = true; ctx.save.write();
    root = el('div', 'results');
    root.append(el('h1', '', t('results.title')), el('div', 'sub', t('results.thanks')));
    const stats = el('div', 'stats');
    const stat = (k, v) => { const s = el('div', 'stat'); s.append(el('span', '', t(k)), el('b', '', v)); stats.append(s); };
    stat('results.time', fmtTime(d.stats.playMs)); stat('results.retries', String(d.stats.retries));
    root.append(stats);
    const row = el('div', 'col');
    row.append(
      button(t('results.credits'), () => { ctx.audio.play('UI_CONFIRM'); ctx.scenes.goto('CREDITS', { from: 'RESULTS' }); }, 'btn primary'),
      button(t('results.replay'), () => {
        nav.dispose();
        modal(ctx.uiRoot, { text: t('results.replayConfirm'), buttons: [
          { text: t('menu.yes'), primary: true, onClick: () => { ctx.save.newGame(); ctx.scenes.goto(ctx.scenes.nextOf('MENU')); } },
          { text: t('menu.no'), onClick: () => { nav = focusNav(root, { audio: ctx.audio }); } }], onEsc: () => { nav = focusNav(root, { audio: ctx.audio }); } }, ctx.audio);
      }),
      button(t('results.menu'), () => { ctx.audio.play('UI_BACK'); ctx.scenes.goto('MENU'); }),
    );
    root.append(row);
    ctx.uiRoot.append(root);
    nav = focusNav(root, { audio: ctx.audio });
    ctx.audio.play('ST_VICTORY');
  },
  update(dt) { time += dt; },
  updateIdle(dt) { time += dt; },
  render() { draw(ctx.g2d()); },
  exit() { nav?.dispose(); root?.remove(); root = null; ctx.clear2d(); },
};
export default scene;
