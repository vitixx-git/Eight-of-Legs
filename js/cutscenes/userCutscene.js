// C_User — кат-сцена от пользователя (ТЗ §5). Файл подключается манифестом assets/cutscene/user_cutscene.json
// (форматы — assets/cutscene/README.md): «video» (mp4/webm), «frames» (последовательность кадров + звук),
// «timeline» (слои-картинки с ключами). Предзагрузка начинается в меню (CFG.userCutscene.preloadOnMenu),
// таймаут CFG.userCutscene.timeout. Пропуск — удержание Пробела 1 с; Esc — пауза (видео/звук тоже на паузе);
// M — без звука; потеря фокуса вкладки → пауза. Нет манифеста → встроенный 2D-пролог (7,5 с);
// манифест есть, но файл не загрузился → пролог + сообщение. Позиция в графе: CFG.userCutscene.position.
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { createHoldSkip } from '../ui/holdskip.js';
import { listen } from '../core/events.js';
import { text as txt } from '../gfx2d/style.js';
import { el } from '../ui/dom.js';

const U = CFG.userCutscene, W = CFG.stage.w, H = CFG.stage.h;
let cache = null;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const lerp = (a, b, k) => a + (b - a) * k;

function withTimeout(p, sec) {
  let id; const to = new Promise((_, rej) => { id = setTimeout(() => rej(new Error('timeout')), sec * 1000); });
  return Promise.race([p, to]).finally(() => clearTimeout(id));
}
function loadVideo(src) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'auto'; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    const off = () => { v.removeEventListener('loadeddata', ok); v.removeEventListener('error', bad); };
    const ok = () => { off(); resolve(v); }, bad = () => { off(); reject(new Error('video ' + src)); };
    v.addEventListener('loadeddata', ok); v.addEventListener('error', bad);
    v.src = src; v.load();
  });
}
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => rej(new Error('img ' + src)); i.src = src; }); }
function loadAudio(src) {
  return new Promise((resolve, reject) => {
    const a = new Audio(); a.preload = 'auto';
    const off = () => { a.removeEventListener('canplaythrough', ok); a.removeEventListener('error', bad); };
    const ok = () => { off(); resolve(a); }, bad = () => { off(); reject(new Error('audio ' + src)); };
    a.addEventListener('canplaythrough', ok); a.addEventListener('error', bad); a.src = src; a.load();
  });
}
// «frames»: массив путей или шаблон {pattern: "frames/f_{000}.jpg", count: 90, start: 1}
export function expandFrames(f) {
  if (Array.isArray(f)) return f;
  if (!f || !f.pattern) return [];
  const m = f.pattern.match(/\{(0*)\}/); const pad = m ? m[1].length || 1 : 1;
  const out = []; for (let i = 0; i < (f.count || 0); i++) out.push(f.pattern.replace(/\{0*\}/, String((f.start ?? 1) + i).padStart(pad, '0')));
  return out;
}

// Предзагрузка (кэшируется): {mode: 'video'|'frames'|'timeline'|'fallback', man, error}
export function preloadUserCutscene() {
  if (cache) return cache;
  cache = (async () => {
    let man = null;
    try {
      const res = await withTimeout(fetch(U.manifest, { cache: 'no-cache' }), U.timeout);
      if (!res.ok) return { mode: 'fallback', error: null };
      man = await res.json();
    } catch (e) { return { mode: 'fallback', error: null }; }
    const base = new URL(U.manifest, location.href);
    const abs = (p) => new URL(p, base).href;
    try {
      const audio = man.audio ? await withTimeout(loadAudio(abs(man.audio)), U.timeout).catch(() => null) : null;
      if (!man || man.type === 'builtin' || man.type === 'none') return { mode: 'fallback', man, error: null, builtin: true };
      if (man.type === 'video') return { mode: 'video', man, video: await withTimeout(loadVideo(abs(man.src)), U.timeout) };
      if (man.type === 'frames') {
        const list = expandFrames(man.frames);
        if (!list.length) throw new Error('frames: пустой список');
        const frames = await withTimeout(Promise.all(list.map((f) => loadImage(abs(f)))), U.timeout * 3);
        return { mode: 'frames', man, frames, audio };
      }
      if (man.type === 'timeline') {
        const srcs = [...new Set((man.layers || []).map((l) => l.src).filter(Boolean))];
        const imgs = await withTimeout(Promise.all(srcs.map((s) => loadImage(abs(s)))), U.timeout * 2);
        const map = Object.fromEntries(srcs.map((s, i) => [s, imgs[i]]));
        return { mode: 'timeline', man, imgs: map, audio };
      }
      throw new Error('неизвестный type: ' + man.type);
    } catch (e) {
      console.warn('[C_User] файл кат-сцены не загрузился — встроенный пролог', e);
      return { mode: 'fallback', man, error: String(e.message || e) };
    }
  })();
  return cache;
}
export function resetUserCutsceneCache() { cache = null; }

// ---------- встроенный пролог (2D, 7,5 с): город → окно Лаборатории №3 → паук на нити ----------
const STARS = Array.from({ length: 70 }, (_, i) => [(i * 211.7) % W, ((i * 97.3) % (H * 0.55)), 0.6 + ((i * 13) % 10) / 10, i * 1.7]);
const BLD = (() => { const out = []; let x = -40, i = 0; while (x < W + 80) { const w = 60 + ((i * 37) % 70), h = 90 + ((i * 53) % 150); out.push([x, w, h, i]); x += w + 6; i++; } return out; })();
function drawPrologue(g, tm, lessFx) {
  const D = U.fallbackDur;
  g.fillStyle = '#0c0918'; g.fillRect(0, 0, W, H);
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0d0a1c'); sky.addColorStop(0.7, '#2a2148'); sky.addColorStop(1, '#3a2c55');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (const [x, y, r, ph] of STARS) { g.globalAlpha = 0.35 + 0.35 * Math.sin(tm * 1.7 + ph); g.fillStyle = '#e6ecff'; g.fillRect(x, y, r * 1.6, r * 1.6); }
  g.globalAlpha = 1;
  // камера: общий план → наезд на окно лаборатории
  const k = smooth((tm - 2.0) / 3.2), zoom = 1 + k * 1.6, fx = lerp(480, 640, k), fy = lerp(300, 318, k);
  g.save();
  g.translate(480, 270); g.scale(zoom, zoom); g.translate(-fx, -fy);
  // луна
  g.fillStyle = 'rgba(207,224,255,0.16)'; g.beginPath(); g.arc(250, 120, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d8e4ff'; g.beginPath(); g.arc(250, 120, 42, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#b9c6ea'; g.beginPath(); g.arc(238, 110, 8, 0, Math.PI * 2); g.arc(262, 132, 5, 0, Math.PI * 2); g.fill();
  // дальний город
  for (const [x, w, h, i] of BLD) {
    g.fillStyle = '#1b1530'; g.fillRect(x, H - 70 - h * 0.8, w, h * 0.8 + 70);
    for (let wy = H - 60 - h * 0.8; wy < H - 80; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 16) {
      if (((wx * 7 + wy * 3 + i) % 11) < 2) { g.fillStyle = '#ffd98a'; g.globalAlpha = 0.55; g.fillRect(wx, wy, 7, 9); g.globalAlpha = 1; }
    }
  }
  // Лаборатория №3
  g.fillStyle = '#2b2440'; g.fillRect(540, 200, 220, 340); g.fillStyle = '#231d36'; g.fillRect(540, 190, 220, 14);
  g.strokeStyle = '#120e1c'; g.lineWidth = 3; g.strokeRect(540, 200, 220, 340);
  g.fillStyle = '#d9b45a'; g.fillRect(570, 214, 160, 30); g.strokeRect(570, 214, 160, 30);
  txt(g, t('world.lab3'), 650, 230, { size: 17, color: '#1d1519', stroke: null });
  // окна (одно светится — там яд)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const wx = 562 + c * 66, wy = 268 + r * 62, lit = r === 1 && c === 1;
    g.fillStyle = lit ? '#bff7c8' : '#3a3352'; g.fillRect(wx, wy, 46, 40); g.strokeRect(wx, wy, 46, 40);
    if (lit) {
      const pulse = 0.5 + 0.5 * Math.sin(tm * 3);
      g.fillStyle = `rgba(127,209,139,${0.25 + 0.2 * pulse})`; g.beginPath(); g.arc(wx + 23, wy + 20, 34, 0, Math.PI * 2); g.fill();
      // колба
      g.fillStyle = '#6fe08a'; g.beginPath(); g.moveTo(wx + 18, wy + 8); g.lineTo(wx + 28, wy + 8); g.lineTo(wx + 28, wy + 16); g.lineTo(wx + 35, wy + 34); g.lineTo(wx + 11, wy + 34); g.lineTo(wx + 18, wy + 16); g.closePath(); g.fill();
      g.lineWidth = 1.5; g.stroke(); g.lineWidth = 3;
      g.fillStyle = '#f2ece0'; g.fillRect(wx + 15, wy + 24, 16, 6);
    }
  }
  // земля
  g.fillStyle = '#100c1a'; g.fillRect(-200, H - 18, W + 400, 60);
  g.restore();
  // паук на нити (появляется в 3-й части, в экранных координатах)
  const s = smooth((tm - 4.6) / 1.4);
  if (s > 0) {
    const sx = 760, sy = lerp(-30, 210, s) + Math.sin(tm * 2.2) * 4 * s;
    g.strokeStyle = 'rgba(220,228,255,0.85)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx, sy - 14); g.stroke();
    g.save(); g.translate(sx, sy); g.rotate(Math.sin(tm * 1.3) * 0.08);
    g.strokeStyle = '#1d1519'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
      const a = (-0.9 + i * 0.6), kx = side * (16 + i * 2);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(kx, -10 + i * 6 + a * 4, side * (24 + i * 3), 6 + i * 7); g.stroke();
    }
    g.fillStyle = '#2f2433'; g.beginPath(); g.ellipse(0, 4, 13, 15, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -10, 9, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    const blink = Math.sin(tm * 5) > 0.97 ? 0.2 : 1;
    g.fillStyle = '#fff6e8'; g.beginPath(); g.ellipse(-3.5, -11, 2.6, 2.6 * blink, 0, 0, Math.PI * 2); g.ellipse(3.5, -11, 2.6, 2.6 * blink, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // подписи — по одной, с мягким появлением
  const lines = [['ucut.l1', 0.4, 2.3], ['ucut.l2', 2.6, 4.6], ['ucut.l3', 4.9, D - 0.3]];
  for (const [key, a, b] of lines) {
    const al = Math.min(smooth((tm - a) / 0.5), 1 - smooth((tm - b + 0.4) / 0.4));
    if (al <= 0) continue;
    g.globalAlpha = al; txt(g, t(key), 480, 470 - (1 - al) * 6, { size: 24, color: '#f2ece0', sw: 6 }); g.globalAlpha = 1;
  }
  // виньетка
  if (!lessFx) {
    const vg = g.createRadialGradient(480, 270, 200, 480, 270, 620); vg.addColorStop(0, 'rgba(8,6,12,0)'); vg.addColorStop(1, 'rgba(8,6,12,0.7)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
}

// «timeline»: слои {src, t0, t1, from:{x,y,scale,alpha,rot}, to:{...}, ease?} в координатах 960×540
function drawLayers(g, man, imgs, tm) {
  g.fillStyle = man.background || '#000'; g.fillRect(0, 0, W, H);
  for (const L of man.layers || []) {
    const t0 = L.t0 ?? 0, t1 = L.t1 ?? (man.duration || 10);
    if (tm < t0 || tm > t1) continue;
    const u = smooth((tm - t0) / Math.max(0.001, t1 - t0)), a = L.from || {}, b = L.to || a;
    const v = (k, d) => lerp(a[k] ?? d, b[k] ?? a[k] ?? d, u);
    const img = imgs[L.src]; if (!img) continue;
    g.save(); g.globalAlpha = clamp01(v('alpha', 1)); g.translate(v('x', W / 2), v('y', H / 2)); g.rotate(v('rot', 0)); const s = v('scale', 1);
    g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s); g.restore();
  }
}
function drawContain(g, img, iw, ih) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (!iw || !ih) return;
  const k = Math.min(W / iw, H / ih), w = iw * k, h = ih * k;
  g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

let ctx = null, data = null, time = 0, dur = 0, ending = false, hold = null, offKey = null, media = null, videoEl = null;
let subs = [], subIdx = 0, muted = false, muteEl = null, started = false;
function mediaVolume() { const s = ctx.settings; return s.mute || muted ? 0 : (s.master / 100) * (s.music / 100); }
function applyVolume() { if (media) { media.volume = Math.max(0, Math.min(1, mediaVolume())); media.muted = mediaVolume() <= 0; } if (muteEl) muteEl.textContent = muted ? 'M — включить звук' : 'M — без звука'; }
function playMedia() {
  if (!media) return;
  const p = media.play();
  if (p?.catch) p.catch(() => { muted = true; applyVolume(); media.play().catch(() => {}); ctx.hud.toast('M — включить звук'); });
}

const scene = {
  id: 'C_User', kind: 'cut', series: null, objectives: [], checkpoints: ['start'],
  async enter(c) {
    ctx = c; time = 0; ending = false; subIdx = 0; muted = false; started = false; media = null; videoEl = null;
    ctx.show3d(false); ctx.clear2d();
    data = await preloadUserCutscene();
    const man = data.man || {};
    subs = (man.subtitles || []).filter((s) => s && s.text != null).slice().sort((a, b) => a.t - b.t);
    if (data.mode === 'video') {
      videoEl = data.video; media = videoEl; videoEl.currentTime = 0;
      dur = Number.isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : (man.duration || 30);
      videoEl.className = 'layer ucut-video'; ctx.stage.insertBefore(videoEl, ctx.hudRoot);
    } else if (data.mode === 'frames') {
      dur = man.duration || data.frames.length / (man.fps || 12); media = data.audio;
    } else if (data.mode === 'timeline') {
      dur = man.duration || 10; media = data.audio;
    } else {
      dur = U.fallbackDur; subs = [];
      // финальная позиция без файла: встроенный пролог там неуместен — сцена сразу завершится в onStart
    }
    const ownSound = !!media || man.keepGameMusic === false;
    if (ownSound && !man.keepGameMusic) { ctx.audio.stopMusic(U.fadeIn); ctx.audio.ambience(null); }
    else if (data.mode === 'fallback') { ctx.audio.music('M_MENU'); ctx.audio.ambience('AMB_MENU_NIGHT'); ctx.audio.setReverb('menu'); }
    if (media) { muteEl = el('div', 'ucut-mute'); ctx.hudRoot.append(muteEl); applyVolume(); }
    hold = createHoldSkip(ctx, () => scene.finish());
    offKey = listen(window, 'keydown', (e) => { if (e.code === 'KeyM' && media && !e.repeat) { muted = !muted; applyVolume(); } });
  },
  onStart() {
    started = true;
    if (data.mode === 'fallback' && U.position === 'afterS10') { scene.finish(); return; }
    if (data.mode === 'fallback' && data.error) ctx.hud.toast(t('ucut.missing'));
    playMedia();
  },
  update(dt) {
    if (ending) return;
    hold?.update(dt);
    if (videoEl) time = videoEl.currentTime; else if (data.mode === 'frames' && media) time = media.currentTime || time + dt; else time += dt;
    while (subIdx < subs.length && subs[subIdx].t <= time) { const s = subs[subIdx++]; ctx.hud.subtitle(String(s.text), s.dur || 2.5, s.who || ''); }
    if (time >= dur - 0.02 || videoEl?.ended) scene.finish();
  },
  render() {
    if (!data) return;
    const g = ctx.g2d();
    if (data.mode === 'video') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    if (data.mode === 'frames') { const fps = data.man.fps || 12, i = Math.min(data.frames.length - 1, Math.floor(time * fps)); const im = data.frames[i]; drawContain(g, im, im.naturalWidth, im.naturalHeight); return; }
    if (data.mode === 'timeline') { drawLayers(g, data.man, data.imgs, time); return; }
    drawPrologue(g, time, ctx.settings.lessFx);
  },
  pause() { media?.pause?.(); },
  resume() { if (started && !ending) playMedia(); },
  finish() {
    if (ending) return; ending = true;
    if (media) { const m = media, v0 = m.volume; let k = 1; const id = setInterval(() => { k -= 0.1; try { m.volume = Math.max(0, v0 * k); } catch {} if (k <= 0) clearInterval(id); }, U.fadeOut * 100); }
    ctx.scenes.complete();
  },
  exit() {
    try { media?.pause?.(); } catch {}
    if (videoEl) videoEl.remove();
    hold?.dispose(); hold = null; offKey?.(); offKey = null; muteEl?.remove(); muteEl = null;
    ctx.clear2d(); media = null; videoEl = null;
  },
  debugInfo() { return `C_User: ${data?.builtin ? 'builtin (встроенный пролог)' : data?.mode || '…'} · ${time.toFixed(1)}/${dur.toFixed(1)} с${data?.error ? ' · ошибка: ' + data.error : ''}`; },
};
export default scene;
