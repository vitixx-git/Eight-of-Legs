// «Звуковая комната» (?debug=1&scene=SOUNDROOM): кнопка на каждый ID из audio/ids.js, переключатели петель, музыки,
// слоёв и окружения, ползунки шин master/music/sfx/amb. Только для отладки (GRAPH.debugOnly).
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { el, button } from '../ui/dom.js';
import { SFX_GROUPS, LOOP_IDS, MUSIC_IDS, STINGER_IDS, AMB_IDS, MUSIC_LAYERS, ALL_IDS } from '../audio/ids.js';
import { text } from '../gfx2d/style.js';
let ctx = null, root = null, loops = new Map(), time = 0, info = null, lastPlayed = '—';
function section(title) { const s = el('div', 'sr-sec'); s.append(el('h3', '', title)); const grid = el('div', 'sr-grid'); s.append(grid); root.querySelector('.sr-body').append(s); return grid; }
function play(id, fn) { ctx.audio.unlock(); fn(); lastPlayed = id; }
const scene = {
  id: 'SOUNDROOM', kind: '2d', series: null, objectives: [], checkpoints: ['start'],
  async enter(c) {
    ctx = c; ctx.show3d(false); time = 0;
    root = el('div', 'panel soundroom');
    const head = el('div', 'sr-head');
    head.append(el('h2', '', t('debug.soundroom') + ` · ${ALL_IDS.length} ID`));
    info = el('span', 'sr-info', '');
    head.append(info, button(t('menu.back'), () => ctx.scenes.goto('MENU'), 'btn small'));
    root.append(head, el('div', 'sr-body'));
    ctx.uiRoot.append(root);
    // шины
    const buses = section('Шины');
    for (const bus of ['master', 'music', 'sfx', 'amb']) {
      const row = el('label', 'sr-slider'); row.append(el('span', '', bus));
      const r = el('input'); r.type = 'range'; r.min = '0'; r.max = '100'; r.value = String(Math.round((ctx.settings.vol?.[bus] ?? 1) * 100));
      r.addEventListener('input', () => { ctx.audio.unlock(); ctx.audio.setVolume(bus, +r.value / 100); });
      row.append(r); buses.append(row);
    }
    const mute = button('Тишина (стоп всё)', () => { for (const h of loops.values()) h.stop(); loops.clear(); ctx.audio.stopMusic(0.3); ctx.audio.stopAmbience(); }, 'sr-btn danger');
    buses.append(mute);
    // музыка, слои, стингеры
    const mus = section('Музыка (11 треков + 2 стингера) и слои');
    for (const id of MUSIC_IDS) mus.append(button(id, () => play(id, () => ctx.audio.music(id, { fade: 0.5 })), 'sr-btn music'));
    for (const id of STINGER_IDS) mus.append(button(id, () => play(id, () => ctx.audio.play(id)), 'sr-btn music'));
    for (const [track, layers] of Object.entries(MUSIC_LAYERS)) for (const L of layers) {
      const b = button(`${track} · ${L}`, () => { ctx.audio.unlock(); if (ctx.audio.currentMusic !== track) ctx.audio.music(track, { fade: 0.3 }); b.classList.toggle('on'); ctx.audio.musicLayer(L, b.classList.contains('on')); }, 'sr-btn layer');
      mus.append(b);
    }
    // окружение
    const amb = section('Окружение (10 петель)');
    for (const id of AMB_IDS) amb.append(button(id, () => play(id, () => ctx.audio.ambience(id)), 'sr-btn amb'));
    amb.append(button('стоп окружение', () => ctx.audio.stopAmbience(), 'sr-btn danger'));
    // петли
    const lp = section('Петли эффектов (вкл/выкл)');
    for (const id of LOOP_IDS) {
      const b = button(id, () => {
        ctx.audio.unlock();
        if (loops.has(id)) { loops.get(id).stop(); loops.delete(id); b.classList.remove('on'); return; }
        const h = ctx.audio.loop(id, { vol: 0.8 }); h.setParam?.('p', 0.5); loops.set(id, h); b.classList.add('on'); lastPlayed = id;
      }, 'sr-btn loop');
      lp.append(b);
    }
    // эффекты по группам
    for (const [g, ids] of Object.entries(SFX_GROUPS)) {
      const grid = section(`${g} (${ids.length})`);
      for (const id of ids) grid.append(button(id, () => play(id, () => ctx.audio.play(id)), 'sr-btn'));
    }
    ctx.audio.stopMusic(0.2); ctx.audio.stopAmbience(); ctx.audio.setReverb('menu');
  },
  update(dt) {
    time += dt;
    if (info) info.textContent = `звук: ${ctx.audio.state} · петли: ${ctx.audio.activeLoops()} · музыка: ${ctx.audio.currentMusic || '—'} · окружение: ${ctx.audio.currentAmbience || '—'} · последний: ${lastPlayed}`;
  },
  render() {
    const g = ctx.g2d();
    const gr = g.createLinearGradient(0, 0, 0, CFG.stage.h); gr.addColorStop(0, '#211b29'); gr.addColorStop(1, '#0f0b18');
    g.fillStyle = gr; g.fillRect(0, 0, CFG.stage.w, CFG.stage.h);
    for (let i = 0; i < 24; i++) { const x = i * 40 + 20, h = 10 + 30 * Math.abs(Math.sin(time * 2 + i * 0.7)); g.fillStyle = 'rgba(217,180,90,.18)'; g.fillRect(x - 6, CFG.stage.h - h, 12, h); }
    text(g, '♪', 920, 520, { size: 22, color: 'rgba(217,180,90,.4)', stroke: null });
  },
  exit() { for (const h of loops.values()) h.stop(); loops.clear(); root?.remove(); root = null; ctx.clear2d(); },
};
export default scene;
