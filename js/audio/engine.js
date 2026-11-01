// Аудио-движок (Web Audio): источники → panner → шины sfx/amb → master → компрессор → destination.
// Музыка — от секвенсора в bus.music. sfx и amb → send → reverb (ConvolverNode, импульс из затухающего шума).
// Нет Web Audio — все вызовы пустышки.
import { CFG } from '../config.js';
import { RECIPES, LOOPS, renderLayers, POLY_GROUP } from './sfx.js';
import { createMusic } from './music.js';
import { createAmbience } from './ambience.js';
const dbToGain = (db) => Math.pow(10, db / 20);
export function createAudio({ debug = false } = {}) {
  const A = CFG.audio;
  const Ctor = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
  let ac = null, buses = null, music = null, amb = null, noiseBufs = null;
  const vol = { master: 1, music: 1, sfx: 1, amb: 1 };
  const voices = new Map(); // id → [{stop, t}]
  const sceneLoops = new Set();
  let reverbName = null, suspendedByUser = false;
  const stats = { played: 0, warned: new Set() };
  function makeNoise() {
    const len = ac.sampleRate * 2, mk = (fn) => { const b = ac.createBuffer(1, len, ac.sampleRate); const d = b.getChannelData(0); fn(d); return b; };
    let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
    const white = mk((d) => { for (let i = 0; i < d.length; i++) d[i] = rnd(); });
    const pink = mk((d) => { let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = rnd(); b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; } });
    const brown = mk((d) => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * rnd()) / 1.02; d[i] = l * 3.5; } });
    return { white, pink, brown };
  }
  function impulse(sec) {
    const len = Math.max(1, Math.floor(ac.sampleRate * sec)), b = ac.createBuffer(2, len, ac.sampleRate);
    let seed = 777; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, 3.2); }
    return b;
  }
  function build() {
    ac = new Ctor();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = A.comp.threshold; comp.ratio.value = A.comp.ratio; comp.knee.value = A.comp.knee; comp.attack.value = A.comp.attack; comp.release.value = A.comp.release;
    const muffle = ac.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000; muffle.Q.value = 0.7;
    const master = ac.createGain(); master.connect(muffle); muffle.connect(comp); comp.connect(ac.destination);
    const mk = (db) => { const g = ac.createGain(); g.gain.value = dbToGain(db); return g; };
    const musicBus = mk(A.db.music), musicDuck = ac.createGain(), sfxBus = mk(A.db.sfx), ambBus = mk(A.db.amb), ambDuck = ac.createGain();
    musicBus.connect(musicDuck); musicDuck.connect(master); sfxBus.connect(master); ambBus.connect(ambDuck); ambDuck.connect(master);
    const send = ac.createGain(), conv = ac.createConvolver(), lpf = ac.createBiquadFilter(), wet = ac.createGain();
    lpf.type = 'lowpass'; send.connect(conv); conv.connect(lpf); lpf.connect(wet); wet.connect(master); wet.gain.value = 0;
    master.gain.value = dbToGain(A.db.master);
    buses = { master, comp, muffle, music: musicBus, musicDuck, sfx: sfxBus, amb: ambBus, ambDuck, send, conv, lpf, wet };
    noiseBufs = makeNoise();
    music = createMusic(api, ac, musicBus, noiseBufs);
    amb = createAmbience(api, ac, ambBus, send, noiseBufs);
    applyVolumes();
    if (reverbName) api.setReverb(reverbName, true);
    if (api._pendingMusic) { music.play(api._pendingMusic, {}); api._pendingMusic = null; }
    if (api._pendingAmb) { amb.play(api._pendingAmb); api._pendingAmb = null; }
  }
  function applyVolumes() {
    if (!buses) return;
    const now = ac.currentTime;
    buses.master.gain.setTargetAtTime(dbToGain(A.db.master) * vol.master * vol.master, now, 0.03);
    buses.music.gain.setTargetAtTime(dbToGain(A.db.music) * vol.music * vol.music, now, 0.03);
    buses.sfx.gain.setTargetAtTime(dbToGain(A.db.sfx) * vol.sfx * vol.sfx, now, 0.03);
    buses.amb.gain.setTargetAtTime(dbToGain(A.db.amb) * vol.amb * vol.amb, now, 0.03);
  }
  function limitFor(id) { const g = POLY_GROUP(id); return A.poly[g] ?? A.poly.default; }
  function register(id, voice) {
    let list = voices.get(id); if (!list) { list = []; voices.set(id, list); }
    const now = ac.currentTime; for (let i = list.length - 1; i >= 0; i--) if (list[i].end < now) list.splice(i, 1);
    while (list.length >= limitFor(id)) { const old = list.shift(); old.stop(A.stealFade); }
    list.push(voice);
  }
  const api = {
    debug,
    get ready() { return !!ac; },
    get context() { return ac; },
    get state() { return ac ? ac.state : 'none'; },
    stats, buses: () => buses,
    // создать AudioContext по первому жесту пользователя
    unlock() {
      if (!Ctor) return false;
      try { if (!ac) build(); if (ac.state === 'suspended' && !suspendedByUser) ac.resume(); return true; } catch (e) { console.warn('[audio] нет Web Audio', e); return false; }
    },
    play(id, opts = {}) {
      if (!ac) return null;
      if (id.startsWith('M_') || id.startsWith('ST_')) { if (id.startsWith('ST_')) return music.stinger(id); return api.music(id, opts); }
      const rec = RECIPES[id];
      if (!rec) { if (debug && !stats.warned.has(id)) { stats.warned.add(id); console.warn('[audio] неизвестный ID', id); } return null; }
      const out = ac.createGain(); out.gain.value = opts.vol ?? 1;
      const pan = ac.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, opts.pan || 0));
      out.connect(pan); pan.connect(buses.sfx);
      const sendG = ac.createGain(); sendG.gain.value = opts.dry ? 0 : 1; pan.connect(sendG); sendG.connect(buses.send);
      const t0 = ac.currentTime + (opts.delay || 0) + 0.005;
      const { end, nodes } = renderLayers(ac, out, rec, t0, noiseBufs, opts.rate || 1);
      const voice = { end, stop(f = 0.03) { try { const n = ac.currentTime; out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(out.gain.value, n); out.gain.linearRampToValueAtTime(0, n + f); nodes.forEach((s) => { try { s.stop(n + f + 0.01); } catch {} }); } catch {} } };
      register(id, voice);
      const cleanupAt = (end - ac.currentTime + 0.2) * 1000;
      setTimeout(() => { try { pan.disconnect(); sendG.disconnect(); } catch {} }, Math.max(50, cleanupAt));
      stats.played++;
      return voice;
    },
    // Петля (двигатели, заряд и т.п.) → {stop, setPan, setVol, setRate}
    loop(id, opts = {}) {
      const dummy = { stop() {}, setPan() {}, setVol() {}, setRate() {}, setParam() {}, active: false };
      if (!ac) return dummy;
      const rec = LOOPS[id];
      if (!rec) { if (debug && !stats.warned.has(id)) { stats.warned.add(id); console.warn('[audio] неизвестная петля', id); } return dummy; }
      const loopsOfId = [...sceneLoops].filter((l) => l.id === id);
      const lim = limitFor(id);
      while (loopsOfId.length >= lim) loopsOfId.shift().stop(A.stealFade);
      const out = ac.createGain(); out.gain.value = 0;
      const pan = ac.createStereoPanner(); pan.pan.value = opts.pan || 0;
      out.connect(pan); pan.connect(opts.bus === 'amb' ? buses.amb : buses.sfx);
      if (!opts.dry) pan.connect(buses.send);
      const inst = rec(ac, out, noiseBufs, opts);
      const target = opts.vol ?? 1;
      out.gain.setTargetAtTime(target, ac.currentTime, 0.05);
      const handle = {
        id, active: true,
        stop(f = 0.15) { if (!handle.active) return; handle.active = false; sceneLoops.delete(handle); const n = ac.currentTime; out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(out.gain.value, n); out.gain.linearRampToValueAtTime(0, n + f); setTimeout(() => { inst.stop(); try { pan.disconnect(); } catch {} }, (f + 0.1) * 1000); },
        setPan(p) { pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, p)), ac.currentTime, 0.05); },
        setVol(v) { out.gain.setTargetAtTime(v, ac.currentTime, 0.05); },
        setRate(r) { inst.setRate?.(r); },
        setParam(k, v) { inst.setParam?.(k, v); },
      };
      sceneLoops.add(handle);
      return handle;
    },
    music(id, opts = {}) { if (!ac) { api._pendingMusic = id; return; } music.play(id, opts); },
    musicLayer(name, on) { music?.layer(name, on); },
    stopMusic(fade = 1) { api._pendingMusic = null; music?.stop(fade); },
    get currentMusic() { return music?.current || api._pendingMusic || null; },
    ambience(id) { if (!ac) { api._pendingAmb = id; return; } amb.play(id); },
    stopAmbience() { amb?.stop(); },
    ambienceLayer(id, on) { if (!ac) return; amb.layer(id, on); },
    get currentAmbience() { return amb?.current || api._pendingAmb || null; },
    duck(db, sec = 0.5, target = 'music') {
      if (!ac) return;
      const node = target === 'amb' ? buses.ambDuck : buses.musicDuck, n = ac.currentTime;
      node.gain.cancelScheduledValues(n); node.gain.setValueAtTime(node.gain.value, n);
      node.gain.linearRampToValueAtTime(dbToGain(db), n + A.duck.attack);
      node.gain.setValueAtTime(dbToGain(db), n + A.duck.attack + sec);
      node.gain.linearRampToValueAtTime(1, n + A.duck.attack + sec + A.duck.release);
    },
    warnDuck(sec = 0.6) { api.duck(A.duck.warn, sec, 'music'); api.duck(A.duck.amb, sec, 'amb'); },
    cutsceneDuck(on) { if (!ac) return; const n = ac.currentTime; buses.musicDuck.gain.setTargetAtTime(on ? dbToGain(A.duck.cut) : 1, n, 0.2); },
    setVolume(bus, v) { vol[bus] = Math.max(0, Math.min(1, v)); applyVolumes(); },
    setReverb(name, force) {
      if (name === reverbName && !force) return; reverbName = name;
      if (!ac) return;
      const p = A.reverb[name];
      const n = ac.currentTime;
      if (!p) { buses.wet.gain.setTargetAtTime(0, n, 0.1); return; }
      buses.conv.buffer = impulse(p[0]); buses.lpf.frequency.setValueAtTime(p[1], n); buses.wet.gain.setTargetAtTime(p[2], n, 0.1);
    },
    muffle(on, time = A.muffleTime) { if (!ac) return; const n = ac.currentTime; buses.muffle.frequency.cancelScheduledValues(n); buses.muffle.frequency.setValueAtTime(buses.muffle.frequency.value, n); buses.muffle.frequency.exponentialRampToValueAtTime(on ? A.muffleHz : 20000, n + time); },
    suspend() { if (ac && ac.state === 'running') { suspendedByUser = true; ac.suspend(); } },
    resume() { suspendedByUser = false; if (ac && ac.state === 'suspended') ac.resume(); },
    stopScene() {
      for (const l of [...sceneLoops]) l.stop(0.2);
      sceneLoops.clear();
      amb?.clearLayers();
      if (buses) { const n = ac.currentTime; buses.musicDuck.gain.cancelScheduledValues(n); buses.musicDuck.gain.setTargetAtTime(1, n, 0.1); buses.ambDuck.gain.cancelScheduledValues(n); buses.ambDuck.gain.setTargetAtTime(1, n, 0.1); api.muffle(false, 0.2); }
    },
    activeLoops() { return sceneLoops.size; },
    stepPan(x) { return Math.max(-1, Math.min(1, (x - 480) / 480 * A.roadPan)); },
    dispose() { try { music?.stop(0); amb?.stop(); ac?.close(); } catch {} },
  };
  return api;
}
