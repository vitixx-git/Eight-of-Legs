// Настройки (localStorage vosem_lap_settings_v1): громкости 0–100 шаг 5, звук выкл, качество, тряска, «Меньше эффектов», кабина.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { el, button, focusNav } from './dom.js';
export const DEFAULT_SETTINGS = { master: 100, music: 80, sfx: 100, amb: 80, mute: false, quality: 'high', shake: true, lessFx: false, cockpit: true };
export function loadSettings() {
  const s = { ...DEFAULT_SETTINGS };
  try {
    const d = JSON.parse(localStorage.getItem(CFG.storage.settings) || 'null');
    if (d && typeof d === 'object') {
      for (const k of ['master', 'music', 'sfx', 'amb']) if (Number.isFinite(d[k])) s[k] = Math.max(0, Math.min(100, Math.round(d[k] / 5) * 5));
      for (const k of ['mute', 'shake', 'lessFx', 'cockpit']) if (typeof d[k] === 'boolean') s[k] = d[k];
      if (['low', 'med', 'high'].includes(d.quality)) s.quality = d.quality;
    }
  } catch {}
  return s;
}
export function saveSettings(s) { try { localStorage.setItem(CFG.storage.settings, JSON.stringify(s)); } catch {} }
export function applySettings(ctx) {
  const s = ctx.settings;
  ctx.audio.setVolume('master', s.mute ? 0 : s.master / 100);
  ctx.audio.setVolume('music', s.music / 100); ctx.audio.setVolume('sfx', s.sfx / 100); ctx.audio.setVolume('amb', s.amb / 100);
  if (ctx.renderer && ctx.renderer.quality !== s.quality) ctx.renderer.applyQuality();
  ctx.cockpit?.show(ctx.cockpit.wanted && s.cockpit);
  ctx.events.emit('settings', s);
}
export function openControls(ctx, onClose) {
  const back = el('div', 'modal-back'); const box = el('div', 'panel modal settings');
  box.append(el('h2', '', t('controls.title')));
  const tb = el('table', 'controls');
  for (const k of ['move', 'shift', 'action', 'use', 'pause', 'confirm', 'skip']) {
    const tr = el('tr'); tr.append(el('td', '', t('controls.' + k)));
    const td = el('td'); for (const key of t('controls.' + k + 'Keys').split(' / ')) td.append(el('span', 'key', key), document.createTextNode(' '));
    tr.append(td); tb.append(tr);
  }
  box.append(tb, el('p', '', t('controls.note')));
  const close = () => { nav.dispose(); back.remove(); onClose?.(); };
  const row = el('div', 'row'); row.append(button(t('settings.back'), () => { ctx.audio.play('UI_BACK'); close(); })); box.append(row);
  back.append(box); ctx.uiRoot.append(back);
  const nav = focusNav(box, { onEsc: close, audio: ctx.audio });
  return { close };
}
export function openSettings(ctx, onClose) {
  const s = ctx.settings;
  const back = el('div', 'modal-back'); const box = el('div', 'panel modal settings');
  box.append(el('h2', '', t('settings.title')));
  const commit = () => { saveSettings(s); applySettings(ctx); };
  const slider = (key) => {
    const r = el('div', 'setrow'); r.tabIndex = 0;
    const input = el('input'); input.type = 'range'; input.min = 0; input.max = 100; input.step = 5; input.value = s[key];
    const val = el('span', 'val', String(s[key]));
    const set = (v) => { s[key] = Math.max(0, Math.min(100, v)); input.value = s[key]; val.textContent = s[key]; commit(); ctx.audio.play(key === 'music' ? 'UI_FOCUS' : 'UI_SLIDER'); };
    input.addEventListener('input', () => set(Number(input.value)));
    r.addEventListener('adjust', (e) => set(s[key] + 5 * (e.detail || 0)));
    const right = el('div', 'row'); right.append(input, val);
    r.append(el('span', '', t('settings.' + key)), right); return r;
  };
  const toggle = (key, label) => {
    const r = el('div', 'setrow'); r.tabIndex = 0;
    const b = el('button', 'toggle'); b.type = 'button';
    const draw = () => { b.textContent = s[key] ? t('settings.on') : t('settings.off'); b.classList.toggle('on', s[key]); };
    const flip = () => { s[key] = !s[key]; draw(); commit(); ctx.audio.play('UI_TOGGLE'); };
    b.addEventListener('click', flip); r.addEventListener('adjust', flip);
    draw(); r.append(el('span', '', t(label)), b); return r;
  };
  const seg = (key, opts) => {
    const r = el('div', 'setrow'); r.tabIndex = 0;
    const g = el('div', 'seg'); const bs = {};
    const draw = () => { for (const o of opts) bs[o].classList.toggle('on', s[key] === o); };
    for (const o of opts) { const b = el('button', '', t('settings.q.' + o)); b.type = 'button'; b.addEventListener('click', () => { s[key] = o; draw(); commit(); ctx.audio.play('UI_TOGGLE'); }); bs[o] = b; g.append(b); }
    r.addEventListener('adjust', (e) => { const i = opts.indexOf(s[key]); const n = Math.max(0, Math.min(opts.length - 1, i + (e.detail || 1))); s[key] = opts[n]; draw(); commit(); ctx.audio.play('UI_TOGGLE'); });
    draw(); r.append(el('span', '', t('settings.quality')), g); return r;
  };
  box.append(el('h3', '', t('settings.sound')), slider('master'), slider('music'), slider('sfx'), slider('amb'), toggle('mute', 'settings.mute'));
  box.append(el('h3', '', t('settings.video')), seg('quality', ['low', 'med', 'high']));
  box.append(el('h3', '', t('settings.access')), toggle('shake', 'settings.shake'), toggle('lessFx', 'settings.lessfx'), toggle('cockpit', 'settings.cockpit'));
  box.append(el('h3', '', t('settings.help')));
  const close = () => { nav.dispose(); back.remove(); onClose?.(); };
  const row = el('div', 'row');
  row.append(button(t('settings.controls'), () => { nav.dispose(); openControls(ctx, () => { nav2(); }); }, 'btn small'), button(t('settings.back'), () => { ctx.audio.play('UI_BACK'); close(); }, 'btn small'));
  box.append(row); back.append(box); ctx.uiRoot.append(back);
  let nav = focusNav(box, { onEsc: close, audio: ctx.audio });
  const nav2 = () => { nav = focusNav(box, { onEsc: close, audio: ctx.audio }); };
  return { close };
}
