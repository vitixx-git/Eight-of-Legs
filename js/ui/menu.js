// Главное меню: 2D-силуэт ночной спальни, луна, паук на нити (качание 6,5 с), пылинки в луче.
// Кнопки: Играть → Новая игра / Продолжить; Выйти. Ссылки: Настройки, Управление, Авторы.
import { CFG, GRAPH } from '../config.js';
import { t } from '../text/ru.js';
import { el, button, focusNav, modal } from './dom.js';
import { openSettings, openControls } from './settings.js';
import { listen } from '../core/events.js';

const P = CFG.palette.menu, M = CFG.ui.menu;
let ctx = null, root = null, nav = null, time = 0, dust = [], startEl = null, offs = [];
function drawSpider(g, x, y, s, swing) {
  g.save(); g.translate(x, y); g.rotate(-swing * 0.6); g.scale(s, s);
  g.strokeStyle = '#1d1519'; g.lineWidth = 2.2; g.lineCap = 'round';
  for (const k of [-1, 1]) for (let i = 0; i < 4; i++) {
    const a = (-0.9 + i * 0.55) , wig = Math.sin(time * 3 + i) * 0.08;
    g.beginPath(); g.moveTo(0, 0);
    const kx = k * (10 + i * 1.5), ky = -6 + i * 4;
    g.quadraticCurveTo(k * 7, ky - 8, kx, ky + Math.sin(a + wig) * 3);
    g.lineTo(k * (14 + i * 2), ky + 9 + i * 1.5);
    g.stroke();
  }
  g.fillStyle = P.spider; g.beginPath(); g.ellipse(0, 8, 7.5, 9, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = P.spiderLight; g.beginPath(); g.ellipse(-2, 6, 2, 1.4, 0, 0, 7); g.ellipse(2.5, 9, 1.8, 1.2, 0, 0, 7); g.fill();
  g.fillStyle = '#3a2b45'; g.beginPath(); g.ellipse(0, -2, 5.5, 4.8, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-2, -3, 1.6, 0, 7); g.arc(2, -3, 1.6, 0, 7); g.fill();
  g.fillStyle = '#1d1519'; g.beginPath(); g.arc(-2, -2.6, 0.8, 0, 7); g.arc(2, -2.6, 0.8, 0, 7); g.fill();
  g.restore();
}
function drawRoom(g) {
  const W = CFG.stage.w, H = CFG.stage.h;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#171126'); bg.addColorStop(1, P.bg);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // окно с луной
  const wx = 600, wy = 70, ww = 230, wh = 200;
  const sky = g.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#24325a'); sky.addColorStop(1, '#3b3560');
  g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = '#e8eeff';
  for (let i = 0; i < 18; i++) { const sx = wx + ((i * 73) % ww), sy = wy + ((i * 41) % (wh - 40)); const a = 0.4 + 0.4 * Math.sin(time * 1.5 + i); g.globalAlpha = a; g.fillRect(sx, sy, 1.6, 1.6); }
  g.globalAlpha = 1;
  const mx = wx + 160, my = wy + 62;
  const halo = g.createRadialGradient(mx, my, 10, mx, my, 90); halo.addColorStop(0, 'rgba(216,228,255,.45)'); halo.addColorStop(1, 'rgba(216,228,255,0)');
  g.fillStyle = halo; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = P.moon; g.beginPath(); g.arc(mx, my, 30, 0, 7); g.fill();
  g.fillStyle = 'rgba(160,170,210,.5)'; g.beginPath(); g.arc(mx - 9, my - 6, 6, 0, 7); g.arc(mx + 8, my + 9, 4, 0, 7); g.fill();
  // рама окна
  g.strokeStyle = P.silhouette; g.lineWidth = 12; g.strokeRect(wx, wy, ww, wh);
  g.lineWidth = 7; g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
  // шторы
  g.fillStyle = '#120d1c';
  g.beginPath(); g.moveTo(wx - 40, wy - 20); g.quadraticCurveTo(wx - 10 + Math.sin(time * 0.7) * 4, wy + wh / 2, wx - 30, wy + wh + 40); g.lineTo(wx - 60, wy + wh + 40); g.lineTo(wx - 60, wy - 20); g.fill();
  g.beginPath(); g.moveTo(wx + ww + 40, wy - 20); g.quadraticCurveTo(wx + ww + 12 + Math.sin(time * 0.6 + 1) * 4, wy + wh / 2, wx + ww + 30, wy + wh + 40); g.lineTo(wx + ww + 60, wy + wh + 40); g.lineTo(wx + ww + 60, wy - 20); g.fill();
  // лунный луч
  g.save(); g.globalCompositeOperation = 'lighter';
  const beam = g.createLinearGradient(wx, wy, wx - 260, H);
  beam.addColorStop(0, `rgba(190,205,255,${M.moonAlpha})`); beam.addColorStop(1, 'rgba(190,205,255,0)');
  g.fillStyle = beam; g.beginPath(); g.moveTo(wx, wy + 10); g.lineTo(wx + ww, wy + 10); g.lineTo(wx + ww - 300, H); g.lineTo(wx - 330, H); g.closePath(); g.fill();
  for (const d of dust) { g.globalAlpha = 0.35 + 0.35 * Math.sin(time * 2 + d.p); g.fillStyle = '#dfe6ff'; g.fillRect(d.x, d.y, d.s, d.s); }
  g.restore(); g.globalAlpha = 1;
  // пол
  g.fillStyle = '#0c0914'; g.fillRect(0, 440, W, 100);
  // кровать с силуэтом спящего
  g.fillStyle = P.silhouette;
  g.beginPath(); g.moveTo(330, 440); g.lineTo(330, 360); g.quadraticCurveTo(340, 340, 360, 345); g.lineTo(640, 352); g.lineTo(700, 380); g.lineTo(700, 440); g.closePath(); g.fill();
  g.fillRect(320, 300, 18, 140); g.fillRect(692, 360, 14, 80);
  const br = 1 + Math.sin(time * Math.PI * 2 / 4) * 0.02;
  g.beginPath(); g.ellipse(520, 352 - 4 * br, 130, 22 * br, -0.03, 0, 7); g.fill(); // одеяло
  g.beginPath(); g.ellipse(372, 340, 30, 13, 0, 0, 7); g.fill(); // подушка
  g.beginPath(); g.arc(388, 330, 15, 0, 7); g.fill(); // голова
  // шкаф слева (оттуда спускается паук)
  g.fillRect(40, 120, 190, 320); g.fillRect(30, 108, 210, 16);
  g.fillStyle = '#100c18'; g.fillRect(56, 140, 74, 280); g.fillRect(140, 140, 74, 280);
  g.fillStyle = P.silhouette; g.fillRect(124, 260, 6, 26); g.fillRect(140, 260, 6, 26);
  // тумбочка с будильником
  g.fillStyle = P.silhouette; g.fillRect(250, 380, 60, 60);
  g.fillStyle = '#4fd1a0'; g.globalAlpha = 0.65 + 0.2 * Math.sin(time * 2); g.font = '700 12px Trebuchet MS, Arial'; g.fillText('03:17', 262, 374); g.globalAlpha = 1;
  g.fillStyle = P.silhouette; g.fillRect(256, 360, 48, 20);
  // паук на нити с потолка (правее кнопок, чтобы его было видно)
  const len = M.threadLen[0] + (M.threadLen[1] - M.threadLen[0]) * (0.5 + 0.5 * Math.sin(time * 0.5));
  const sw = Math.sin(time * Math.PI * 2 / M.swingPeriod) * M.swingAmp;
  const ax = M.anchor[0], ay = M.anchor[1], sx = ax + Math.sin(sw) * len, sy = ay + Math.cos(sw) * len;
  g.strokeStyle = P.thread; g.globalAlpha = 0.75; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(sx, sy); g.stroke(); g.globalAlpha = 1;
  drawSpider(g, sx, sy + 6, 1.6, sw);
  // виньетка
  const vg = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function continueInfo() {
  const p = ctx.save.data ? ctx.save.continuePoint() : null;
  if (!p) return null;
  const n = GRAPH.series[p.scene];
  if (p.scene === 'RESULTS' || ctx.save.data.completed || ctx.save.flag('poisonDestroyed')) return { ...p, label: t('menu.completed'), done: true };
  const label = n ? t('menu.continueAt', { n, title: t('card.s' + n) }) : t('cut.' + p.scene) !== 'cut.' + p.scene ? t('cut.' + p.scene) : p.scene;
  return { ...p, label };
}
function build() {
  root?.remove(); nav?.dispose();
  root = el('div', 'menu-root');
  const title = el('div', 'menu-title'); title.append(document.createTextNode(t('game.title')), el('small', '', t('game.subtitle')));
  const btns = el('div', 'menu-buttons');
  const links = el('div', 'menu-links');
  root.append(title, btns, links, el('div', 'menu-version', t('menu.version', { v: CFG.version })));
  ctx.uiRoot.append(root);
  showMain(btns, links);
}
function showMain(btns, links) {
  btns.innerHTML = ''; links.innerHTML = '';
  nav?.dispose();
  btns.append(
    button(t('menu.play'), () => { ctx.audio.play('UI_CONFIRM'); showPlay(btns, links); }, 'btn primary'),
    button(t('menu.exit'), () => { ctx.audio.play('UI_CONFIRM'); nav.dispose(); modal(ctx.uiRoot, { text: t('menu.exitText'), buttons: [{ text: t('menu.ok'), primary: true, onClick: () => { try { window.close(); } catch {} rebind(btns); } }], onEsc: () => rebind(btns) }, ctx.audio); }),
  );
  const link = (key, fn) => { const b = button(t(key), () => { ctx.audio.play('UI_CONFIRM'); fn(); }, 'link'); links.append(b); };
  link('menu.settings', () => { nav.dispose(); openSettings(ctx, () => rebind(btns)); });
  link('menu.controls', () => { nav.dispose(); openControls(ctx, () => rebind(btns)); });
  link('menu.authors', () => { ctx.scenes.goto('CREDITS', { from: 'MENU' }); });
  nav = focusNav(root, { audio: ctx.audio });
}
function rebind() { nav?.dispose(); nav = focusNav(root, { audio: ctx.audio, onEsc: null }); }
function showPlay(btns, links) {
  btns.innerHTML = '';
  nav?.dispose();
  const info = continueInfo();
  const startNew = () => {
    ctx.audio.play('UI_START');
    ctx.save.newGame();
    ctx.scenes.goto(ctx.scenes.nextOf('MENU'));
  };
  btns.append(button(t('menu.new'), () => {
    if (info && !info.done) { nav.dispose(); modal(ctx.uiRoot, { text: t('menu.newConfirm'), buttons: [{ text: t('menu.yes'), primary: true, onClick: startNew }, { text: t('menu.no'), onClick: () => rebind() }], onEsc: () => rebind() }, ctx.audio); }
    else startNew();
  }, 'btn primary'));
  const cont = button(info ? t('menu.continue') : t('menu.continue'), () => {
    if (!info) return;
    ctx.audio.play('UI_START');
    if (info.done) { ctx.scenes.goto('RESULTS'); return; }
    ctx.scenes.goto(info.scene, { checkpoint: info.checkpoint });
  });
  if (!info) cont.disabled = true;
  btns.append(cont);
  if (info) { const s = el('div', 'menu-start', info.label); s.style.position = 'static'; s.style.fontSize = '15px'; s.style.opacity = '.75'; btns.append(s); }
  btns.append(button(t('menu.back'), () => { ctx.audio.play('UI_BACK'); showMain(btns, links); }));
  nav = focusNav(root, { audio: ctx.audio, onEsc: () => { ctx.audio.play('UI_BACK'); showMain(btns, links); } });
  if (ctx.save.corrupt) { nav.dispose(); modal(ctx.uiRoot, { text: t('menu.corrupt'), buttons: [{ text: t('menu.yes'), primary: true, onClick: () => { ctx.save.corrupt = false; startNew(); } }, { text: t('menu.no'), onClick: () => { ctx.save.corrupt = false; rebind(); } }] }, ctx.audio); }
}
const scene = {
  id: 'MENU', kind: '2d', series: null, objectives: [], checkpoints: ['start'],
  async enter(c) {
    ctx = c; time = 0;
    ctx.show3d(false);
    dust = Array.from({ length: M.dustCount }, (_, i) => ({ x: 330 + ((i * 97) % 420), y: 120 + ((i * 53) % 380), s: 1 + (i % 3) * 0.6, p: i, vx: 4 + (i % 5), vy: 2 + (i % 3) }));
    ctx.audio.setReverb('menu');
    ctx.audio.music('M_MENU');
    ctx.audio.ambience('AMB_MENU_NIGHT');
    // предзагрузка пользовательской кат-сцены, пока игрок в меню (ТЗ §5)
    if (CFG.userCutscene.enabled && CFG.userCutscene.preloadOnMenu) import('../cutscenes/userCutscene.js').then((m) => m.preloadUserCutscene()).catch(() => {});
    build();
    if (!ctx.audio.ready && !scene._started) {
      startEl = el('div', 'menu-start', t('menu.start'));
      root.append(startEl);
      const off = () => { startEl?.remove(); startEl = null; scene._started = true; };
      offs.push(listen(window, 'pointerdown', off), listen(window, 'keydown', off));
    }
  },
  update(dt) {
    time += dt;
    for (const d of dust) { d.x -= d.vx * dt; d.y += d.vy * dt; if (d.y > 520 || d.x < 220) { d.y = 110 + Math.random() * 60; d.x = 450 + Math.random() * 330; } }
  },
  updateIdle(dt) { scene.update(dt); },
  render() { const g = ctx.g2d(); drawRoom(g); },
  exit() { offs.forEach((f) => f()); offs = []; nav?.dispose(); nav = null; root?.remove(); root = null; startEl = null; ctx.clear2d(); },
};
export default scene;
