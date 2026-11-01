// Музыка: секвенсор с планировщиком (шаг 1/16, lookahead 100 мс, tick 25 мс).
// 13 инструментов (pad, pluck, bell, bass, marimba, bassoon, lead, kick, snare, hat, clap, tom, shaker),
// 11 треков со слоями + 2 стингера. Лейтмотив паука: E4–G4–F#4–B3 (♪ ♪ ♩ ♩), мажорный: E4–G#4–F#4–B3.
import { CFG } from '../config.js';

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function noteFreq(n) {
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(n);
  if (!m) return 0;
  const midi = (parseInt(m[2], 10) + 1) * 12 + PC[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
// DSL: «E4:2 G4:2 F#4:4 B3:4 .:4» — нота[:шагов]; аккорд «E3+G3+B3:16»; ударные «x» (1), «o» (0.55), «X» (1.35); пауза «.».
function parse(seq) {
  const ev = [];
  let len = 0;
  for (const tok of seq.trim().split(/\s+/)) {
    if (tok === '|') continue;
    const [body, d] = tok.split(':');
    const dur = d ? parseFloat(d) : 1;
    if (body !== '.') {
      let vel = 1, f = [];
      if (body === 'x') f = [0]; else if (body === 'o') { f = [0]; vel = 0.55; } else if (body === 'X') { f = [0]; vel = 1.35; }
      else f = body.split('+').map(noteFreq);
      ev.push({ at: len, f, dur, vel });
    }
    len += dur;
  }
  const arr = new Array(Math.ceil(len)).fill(null);
  for (const e of ev) { const i = Math.round(e.at); if (arr[i]) arr[i].push(e); else arr[i] = [e]; }
  return { arr, len: Math.ceil(len) };
}

// ---------- инструменты ----------
function envG(ac, dest, t, a, d, s, r, dur, peak) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(Math.max(0.0001, peak * s), t + a, d / 3 + 0.001);
  const tr = t + Math.max(a + 0.01, dur);
  g.gain.cancelScheduledValues(tr);
  g.gain.setTargetAtTime(0.0001, tr, r / 4 + 0.001);
  g.connect(dest);
  return { g, end: tr + r };
}
function noiseSrc(ac, bufs, color, t, end) {
  const s = ac.createBufferSource(); s.buffer = bufs[color]; s.loop = true;
  s.start(t, Math.random() * 1.5); s.stop(end + 0.05);
  return s;
}
function filt(ac, type, f, Q = 0.7) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; return b; }
function oscN(ac, type, f, t, end, det = 0) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; o.start(t); o.stop(end + 0.05); return o; }

export const INSTRUMENTS = {
  pad(ac, dest, fs, t, dur, v) {
    const { g, end } = envG(ac, dest, t, 0.45, 0.8, 0.85, 1.1, dur, 0.055 * v);
    const lp = filt(ac, 'lowpass', 1150, 0.4); lp.connect(g);
    for (const f of fs) for (const det of [-8, 8]) oscN(ac, 'sawtooth', f, t, end, det).connect(lp);
  },
  pluck(ac, dest, fs, t, dur, v) {
    const { g, end } = envG(ac, dest, t, 0.004, 0.28, 0.0, 0.18, Math.min(dur, 0.12), 0.13 * v);
    const lp = filt(ac, 'lowpass', 2800, 1.2); lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.3); lp.connect(g);
    for (const f of fs) oscN(ac, 'triangle', f, t, end).connect(lp);
  },
  bell(ac, dest, fs, t, dur, v) {
    for (const f of fs) {
      const { g, end } = envG(ac, dest, t, 0.004, 1.4, 0.0, 0.9, 0.05, 0.085 * v);
      const car = oscN(ac, 'sine', f, t, end), mod = oscN(ac, 'sine', f * 3.5, t, end), mg = ac.createGain();
      mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.2);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g);
    }
  },
  bass(ac, dest, fs, t, dur, v) {
    const { g, end } = envG(ac, dest, t, 0.008, 0.25, 0.55, 0.1, dur * 0.9, 0.16 * v);
    const lp = filt(ac, 'lowpass', 420, 3.5); lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.2); lp.connect(g);
    for (const f of fs) { oscN(ac, 'sawtooth', f, t, end).connect(lp); oscN(ac, 'sine', f / 2, t, end).connect(g); }
  },
  marimba(ac, dest, fs, t, dur, v) {
    for (const f of fs) {
      const { g, end } = envG(ac, dest, t, 0.003, 0.32, 0.0, 0.2, 0.05, 0.14 * v);
      const car = oscN(ac, 'sine', f, t, end), mod = oscN(ac, 'sine', f * 4, t, end), mg = ac.createGain();
      mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.08);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g);
    }
  },
  bassoon(ac, dest, fs, t, dur, v) {
    const { g, end } = envG(ac, dest, t, 0.05, 0.2, 0.8, 0.12, dur * 0.92, 0.06 * v);
    const bp = filt(ac, 'bandpass', 650, 1.1); bp.connect(g);
    const lfo = oscN(ac, 'sine', 5.2, t, end), lg = ac.createGain(); lg.gain.value = 6; lfo.connect(lg);
    for (const f of fs) { const o = oscN(ac, 'square', f, t, end); lg.connect(o.detune); o.connect(bp); }
  },
  lead(ac, dest, fs, t, dur, v) {
    const { g, end } = envG(ac, dest, t, 0.02, 0.3, 0.7, 0.16, dur * 0.95, 0.05 * v);
    const lp = filt(ac, 'lowpass', 2600, 0.8); lp.connect(g);
    const lfo = oscN(ac, 'sine', 5.6, t + 0.12, end), lg = ac.createGain(); lg.gain.value = 9; lfo.connect(lg);
    for (const f of fs) { const o = oscN(ac, 'square', f, t, end); const o2 = oscN(ac, 'sawtooth', f, t, end, 6); lg.connect(o.detune); o.connect(lp); o2.connect(lp); }
  },
  kick(ac, dest, fs, t, dur, v) {
    const { g, end } = envG(ac, dest, t, 0.002, 0.22, 0.0, 0.08, 0.02, 0.5 * v);
    const o = oscN(ac, 'sine', 140, t, end); o.frequency.exponentialRampToValueAtTime(42, t + 0.2); o.connect(g);
  },
  snare(ac, dest, fs, t, dur, v, bufs) {
    const a = envG(ac, dest, t, 0.002, 0.16, 0.0, 0.08, 0.02, 0.2 * v);
    const bp = filt(ac, 'bandpass', 1800, 0.8); bp.connect(a.g); noiseSrc(ac, bufs, 'white', t, a.end).connect(bp);
    const b = envG(ac, dest, t, 0.002, 0.08, 0.0, 0.05, 0.01, 0.12 * v);
    oscN(ac, 'triangle', 190, t, b.end).connect(b.g);
  },
  hat(ac, dest, fs, t, dur, v, bufs) {
    const open = dur > 1.5;
    const a = envG(ac, dest, t, 0.001, open ? 0.22 : 0.045, 0.0, 0.03, 0.01, 0.06 * v);
    const hp = filt(ac, 'highpass', 7600, 0.6); hp.connect(a.g); noiseSrc(ac, bufs, 'white', t, a.end).connect(hp);
  },
  clap(ac, dest, fs, t, dur, v, bufs) {
    const g = ac.createGain(); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t);
    for (const k of [0, 0.011, 0.022]) { g.gain.setValueAtTime(0.17 * v, t + k); g.gain.exponentialRampToValueAtTime(0.02, t + k + 0.009); }
    g.gain.setValueAtTime(0.13 * v, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    const bp = filt(ac, 'bandpass', 1300, 1.0); bp.connect(g); noiseSrc(ac, bufs, 'white', t, t + 0.2).connect(bp);
  },
  tom(ac, dest, fs, t, dur, v) {
    const f0 = fs[0] || 160;
    const { g, end } = envG(ac, dest, t, 0.002, 0.3, 0.0, 0.08, 0.02, 0.28 * v);
    const o = oscN(ac, 'sine', f0, t, end); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.3); o.connect(g);
  },
  shaker(ac, dest, fs, t, dur, v, bufs) {
    const a = envG(ac, dest, t, 0.014, 0.06, 0.0, 0.03, 0.02, 0.045 * v);
    const hp = filt(ac, 'highpass', 5200, 0.7); hp.connect(a.g); noiseSrc(ac, bufs, 'white', t, a.end).connect(hp);
  },
};

// ---------- треки ----------
const MOTIF = 'E4:2 G4:2 F#4:4 B3:4';
const MOTIF_MAJ = 'E4:2 G#4:2 F#4:4 B3:4';
export const TRACKS = {
  M_MENU: { bpm: 70, ch: [
    { inst: 'pad', seq: 'E3+G3+B3:16 C3+E3+G3:16 G2+B2+D3:16 B2+D#3+F#3:16' },
    { inst: 'bell', seq: `${MOTIF} .:4 .:16 ${MOTIF} .:4 .:16`, vel: 0.9, echo: [3, 0.35] },
    { inst: 'pluck', vel: 0.45, seq: 'E3:2 B3:2 E4:2 G4:2 B3:2 E4:2 G3:2 B3:2 C3:2 G3:2 C4:2 E4:2 G3:2 C4:2 E3:2 G3:2 G2:2 D3:2 G3:2 B3:2 D3:2 G3:2 B2:2 D3:2 B2:2 F#3:2 B3:2 D#4:2 F#3:2 B3:2 D#3:2 F#3:2' },
  ] },
  M_BEDROOM: { bpm: 62, ch: [
    { inst: 'pad', vel: 0.75, seq: 'E3+B3+F#4:16 C3+G3+E4:16 A2+E3+C4:16 B2+F#3+D#4:16' },
    { inst: 'marimba', vel: 0.7, seq: 'B4:4 .:4 G4:4 .:4 E4:4 .:12 A4:4 .:4 G4:4 .:4 F#4:8 .:8' },
    { inst: 'bell', vel: 0.55, seq: `.:32 ${MOTIF} .:20`, echo: [3, 0.3] },
  ] },
  M_MEMORY: { bpm: 56, ch: [
    { inst: 'pad', seq: 'E3+G3+B3+D4:32 C3+E3+G3+B3:32' },
    { inst: 'bell', vel: 0.8, seq: 'E4:4 G4:4 F#4:8 B3:16 B4:4 E5:4 D5:4 B4:4 G4:8 F#4:8', echo: [6, 0.4] },
    { inst: 'pluck', vel: 0.3, seq: 'E4:4 B4:4 G4:4 B4:4 E4:4 B4:4 G4:4 B4:4 C4:4 G4:4 E4:4 G4:4 C4:4 G4:4 E4:4 G4:4' },
  ] },
  M_BRAIN: { bpm: 92, ch: [
    { inst: 'bass', seq: 'E2:2 E2:2 E2:2 E3:2 E2:2 E2:2 D3:2 E2:2 C2:2 C2:2 C2:2 C3:2 D2:2 D2:2 D3:2 D2:2' },
    { inst: 'pluck', vel: 0.5, seq: 'B3 E4 G4 E4 B3 E4 G4 B4 B3 E4 G4 E4 B3 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 C5 D4 F#4 A4 F#4 D4 F#4 A4 F#4' },
    { inst: 'pad', vel: 0.7, seq: 'E3+G3+B3:32 C3+E3+G3:16 D3+F#3+A3:16' },
    { inst: 'hat', vel: 0.6, seq: '.:2 o:2 .:2 x:2 .:2 o:2 .:2 x:2' },
    { inst: 'bell', vel: 0.6, seq: `${MOTIF} .:4 .:48`, echo: [3, 0.3] },
  ] },
  M_BATTLE: { bpm: 132, ch: [
    { inst: 'kick', seq: 'x:4 x:4 x:4 x:4' },
    { inst: 'bass', seq: 'E2:2 E2:2 E3:2 E2:2 E2:2 E2:2 D3:2 E2:2 C2:2 C2:2 C3:2 C2:2 D2:2 D2:2 D3:2 B1:2' },
    { inst: 'hat', vel: 0.8, seq: '.:2 x:2 .:2 x:2 .:2 x:2 .:2 x:2' },
    { inst: 'snare', layer: 'reflex', seq: '.:4 x:4 .:4 x:4' },
    { inst: 'pluck', layer: 'reflex', vel: 0.8, seq: 'E4 . E4 . G4:2 E4:2 A4:2 G4:2 F#4:2 D4:2 E4 . E4 . B4:2 A4:2 G4:2 F#4:2 E4:4' },
    { inst: 'bassoon', layer: 'fear', seq: 'E3:8 F3:8 E3:8 D#3:8' },
    { inst: 'tom', layer: 'fear', vel: 0.8, seq: '.:12 x:2 x:2 .:12 x x x x' },
    { inst: 'lead', layer: 'will', seq: 'E4:6 G4:2 F#4:8 B3:6 D4:2 E4:8' },
    { inst: 'snare', layer: 'will', vel: 0.6, seq: '.:12 o o x X .:16' },
    { inst: 'hat', layer: 'half', vel: 0.5, seq: 'x x x x x x x x x x x x x x x x' },
    { inst: 'clap', layer: 'half', seq: '.:4 x:4 .:4 x:4' },
    { inst: 'lead', layer: 'half', vel: 0.7, seq: 'E5:2 G5:2 F#5:4 B4:4 .:4 .:16' },
  ] },
  M_COCKPIT: { bpm: 104, ch: [
    { inst: 'pluck', vel: 0.55, seq: 'E4:2 B4:2 G4:2 B4:2 E4:2 B4:2 G4:2 B4:2 C4:2 G4:2 E4:2 G4:2 D4:2 A4:2 F#4:2 A4:2' },
    { inst: 'shaker', seq: 'x:2 o:2 x:2 o:2 x:2 o:2 x:2 o:2' },
    { inst: 'bass', vel: 0.8, seq: 'E2:4 .:4 B1:4 .:4 C2:4 .:4 D2:4 .:4' },
    { inst: 'pad', vel: 0.45, seq: 'E3+G3+B3:16 C3+E3+G3:8 D3+F#3+A3:8' },
    { inst: 'bell', vel: 0.5, seq: `.:16 ${MOTIF} .:4 .:32`, echo: [3, 0.3] },
  ] },
  M_HOUSE: { bpm: 100, ch: [
    { inst: 'marimba', seq: 'E4:2 G4:2 B4:2 G4:2 A4:2 F#4:2 D4:2 F#4:2 E4:2 G4:2 B4:2 E5:2 D5:2 B4:2 A4:2 F#4:2' },
    { inst: 'bassoon', off: 'quiet', seq: 'E2:4 B2:4 E2:4 B2:4 A2:4 E3:4 B2:4 F#2:4' },
    { inst: 'shaker', off: 'quiet', seq: 'x:2 o:2 x:2 o:2 x:2 o:2 x:2 o:2' },
    { inst: 'kick', off: 'quiet', vel: 0.6, seq: 'x:8 x:8' },
    { inst: 'bassoon', layer: 'wobble', vel: 0.9, seq: 'E3:3 D#3:3 E3:2 .:8 F3:3 E3:3 D#3:2 .:8' },
    { inst: 'tom', layer: 'wobble', vel: 0.5, seq: '.:6 x:2 .:6 x:2' },
  ] },
  M_ROAD: { bpm: 124, ch: [
    { inst: 'kick', seq: 'x:4 x:4 x:4 x:4' },
    { inst: 'hat', vel: 0.7, seq: '.:2 x:2 .:2 x:2 .:2 x:2 .:2 x:2' },
    { inst: 'bass', seq: 'E2:2 E3:2 E2:2 E3:2 G2:2 G3:2 A2:2 A3:2 C2:2 C3:2 C2:2 C3:2 D2:2 D3:2 B1:2 B2:2' },
    { inst: 'pluck', vel: 0.6, seq: 'B4:2 .:2 B4:2 .:2 A4:2 G4:2 F#4:4 G4:2 .:2 G4:2 .:2 F#4:2 E4:2 D4:4' },
    { inst: 'hat', layer: 'urgent', vel: 0.45, seq: 'x x x x x x x x x x x x x x x x' },
    { inst: 'clap', layer: 'urgent', seq: '.:4 x:4 .:4 x:4' },
    { inst: 'lead', layer: 'urgent', vel: 0.75, seq: 'E5:4 D5:4 B4:4 G4:4 A4:4 B4:4 G4:8' },
  ] },
  M_LAB: { bpm: 84, ch: [
    { inst: 'pad', off: 'stopped', vel: 0.8, seq: 'E3+G3+A#3:32 E3+G3+C4:32' },
    { inst: 'bass', off: 'stopped', vel: 0.8, seq: 'E2:1 .:3 E2:1 .:3 E2:1 .:3 F2:1 .:3' },
    { inst: 'bell', off: 'stopped', vel: 0.35, seq: 'B5:1 .:7 B5:1 .:7' },
    { inst: 'hat', off: 'stopped', vel: 0.5, seq: 'x:4 o:4 x:4 o:4' },
    { inst: 'pad', layer: 'stopped', vel: 0.6, seq: 'E3+B3:32 C3+G3:32' },
    { inst: 'tom', layer: 'stopped', vel: 0.35, seq: 'x:2 x:14' },
    { inst: 'pad', layer: 'resolve', seq: 'E3+G#3+B3:16 A2+C#3+E3:16 B2+D#3+F#3:16 E3+G#3+B3:16' },
    { inst: 'bell', layer: 'resolve', seq: `${MOTIF_MAJ} .:4 .:16 ${MOTIF_MAJ} .:4 .:16`, echo: [3, 0.35] },
  ] },
  M_END: { bpm: 76, ch: [
    { inst: 'pad', seq: 'E3+G#3+B3:16 C#3+E3+G#3:16 A2+C#3+E3:16 B2+D#3+F#3:16' },
    { inst: 'bell', seq: `${MOTIF_MAJ} .:4 .:16 ${MOTIF_MAJ} .:4 .:16`, echo: [3, 0.35] },
    { inst: 'pluck', vel: 0.45, seq: 'E3:2 B3:2 E4:2 G#4:2 B3:2 E4:2 G#3:2 B3:2 C#3:2 G#3:2 C#4:2 E4:2 G#3:2 C#4:2 E3:2 G#3:2 A2:2 E3:2 A3:2 C#4:2 E3:2 A3:2 C#3:2 E3:2 B2:2 F#3:2 B3:2 D#4:2 F#3:2 B3:2 D#3:2 F#3:2' },
    { inst: 'bass', vel: 0.6, seq: 'E2:16 C#2:16 A1:16 B1:16' },
    { inst: 'marimba', vel: 0.5, seq: '.:8 B4:4 G#4:4 .:8 C#5:4 B4:4 .:8 A4:4 E4:4 .:8 F#4:4 D#4:4' },
  ] },
  // 11-й трек — титры: лейтмотив в мажоре, лёгкий «шаг» паука на маримбе
  M_CREDITS: { bpm: 96, ch: [
    { inst: 'marimba', vel: 0.7, seq: 'E4:2 G#4:2 B4:2 G#4:2 F#4:2 A4:2 C#5:2 A4:2 E4:2 G#4:2 B4:2 E5:2 D#5:2 B4:2 F#4:4' },
    { inst: 'bell', vel: 0.6, seq: `${MOTIF_MAJ} .:4 .:16 .:32`, echo: [3, 0.3] },
    { inst: 'bass', vel: 0.7, seq: 'E2:4 B1:4 F#2:4 C#2:4 E2:4 G#2:4 B1:8' },
    { inst: 'shaker', vel: 0.8, seq: 'x:2 o:2 x:2 o:2 x:2 o:2 x:2 o:2' },
    { inst: 'pad', vel: 0.5, seq: 'E3+G#3+B3:16 F#3+A3+C#4:16' },
  ] },
};
export const STINGERS = {
  ST_VICTORY: { bpm: 140, len: 24, ch: [
    { inst: 'bell', seq: 'E4:2 G#4:2 F#4:4 B4:8' },
    { inst: 'lead', vel: 0.8, seq: 'B4:2 E5:2 G#5:4 B5:12' },
    { inst: 'pad', seq: 'E3+G#3+B3+E4:20' },
    { inst: 'kick', seq: 'x:8 x:8' },
    { inst: 'clap', seq: '.:8 x:8' },
  ] },
  ST_DEFEAT: { bpm: 90, len: 20, ch: [
    { inst: 'bassoon', seq: 'E3:4 D3:4 C3:4 B2:12' },
    { inst: 'pad', vel: 0.8, seq: 'A2+C3+E3:8 B2+D#3+F#3:14' },
    { inst: 'tom', seq: '.:12 x:8' },
  ] },
};
export const MUSIC_LAYERS = { M_BATTLE: ['reflex', 'fear', 'will', 'half'], M_HOUSE: ['wobble', 'quiet'], M_ROAD: ['urgent'], M_LAB: ['stopped', 'resolve'] };
export const MUSIC_IDS = [...Object.keys(TRACKS), ...Object.keys(STINGERS)];
for (const d of [...Object.values(TRACKS), ...Object.values(STINGERS)]) for (const c of d.ch) { const p = parse(c.seq); c._ev = p.arr; c._len = p.len; }

export function createMusic(api, ac, bus, bufs) {
  const S = CFG.audio.seq;
  const players = [];
  const layers = {};
  let timer = null, current = null;
  const dbToGain = (db) => Math.pow(10, db / 20);
  const target = (c) => { let v = c.layer ? (layers[c.layer] ? 1 : 0) : 1; if (c.off && layers[c.off]) v *= c.offVol ?? 0; return v; };
  function makePlayer(id, def, fade, oneShot) {
    const now = ac.currentTime;
    const out = ac.createGain();
    out.gain.setValueAtTime(oneShot ? 1 : 0.0001, now);
    if (!oneShot) out.gain.exponentialRampToValueAtTime(1, now + Math.max(0.05, fade));
    out.connect(bus);
    const chans = def.ch.map((c) => { const g = ac.createGain(); const tv = target(c); g.gain.value = tv; g.connect(out); return { c, g, on: tv > 0, changed: -10 }; });
    const p = { id, def, out, chans, step: 0, next: now + 0.05, spb: 60 / def.bpm / 4, stopAt: Infinity, oneShot };
    players.push(p);
    if (!timer) timer = setInterval(tick, S.tick * 1000);
    tick();
    return p;
  }
  function schedStep(p, step, t) {
    const now = ac.currentTime;
    for (const ch of p.chans) {
      if (!ch.on && now - ch.changed > 1.2) continue;
      const c = ch.c;
      if (p.oneShot && step >= c._len) continue;
      const evs = c._ev[step % c._len];
      if (!evs) continue;
      for (const e of evs) {
        const fn = INSTRUMENTS[c.inst];
        const v = e.vel * (c.vel ?? 1);
        try {
          fn(ac, ch.g, e.f, t, e.dur * p.spb, v, bufs);
          if (c.echo) fn(ac, ch.g, e.f, t + c.echo[0] * p.spb, e.dur * p.spb, v * c.echo[1], bufs);
        } catch (err) { /* узел мог не создаться при закрытом контексте */ }
      }
    }
  }
  function tick() {
    if (!ac || ac.state === 'closed') return;
    const now = ac.currentTime, horizon = now + S.lookahead;
    for (let i = players.length - 1; i >= 0; i--) {
      const p = players[i];
      if (now > p.stopAt) { try { p.out.disconnect(); } catch {} players.splice(i, 1); continue; }
      if (ac.state !== 'running') continue;
      if (p.next < now - 0.08) p.next = now + 0.02; // догоняем после троттлинга вкладки
      let guard = 0;
      while (p.next < horizon && guard++ < 32) {
        if (p.oneShot && p.step >= p.def.len) { if (p.stopAt === Infinity) p.stopAt = p.next + 2.5; break; }
        schedStep(p, p.step, p.next);
        p.step++; p.next += p.spb;
      }
    }
    if (!players.length && timer) { clearInterval(timer); timer = null; }
  }
  function fadeOut(p, fade) {
    const n = ac.currentTime;
    p.out.gain.cancelScheduledValues(n); p.out.gain.setValueAtTime(Math.max(0.0001, p.out.gain.value), n);
    p.out.gain.exponentialRampToValueAtTime(0.0001, n + Math.max(0.03, fade));
    p.stopAt = n + fade + 0.15;
  }
  return {
    get current() { return current; },
    get players() { return players.length; },
    play(id, opts = {}) {
      const def = TRACKS[id];
      if (!def) { if (STINGERS[id]) return this.stinger(id); return; }
      if (current === id && players.some((p) => p.id === id && p.stopAt === Infinity)) {
        if (opts.layers) for (const name of MUSIC_LAYERS[id] || []) this.layer(name, opts.layers.includes(name));
        return;
      }
      const fade = opts.fade ?? CFG.audio.musicFade;
      for (const p of players) if (!p.oneShot && p.stopAt === Infinity) fadeOut(p, fade);
      for (const k of Object.keys(layers)) delete layers[k];
      if (opts.layers) for (const k of opts.layers) layers[k] = true;
      current = id;
      makePlayer(id, def, fade, false);
    },
    layer(name, on) {
      on = !!on;
      if (!!layers[name] === on) return;
      layers[name] = on;
      const n = ac.currentTime;
      for (const p of players) for (const ch of p.chans) {
        const tv = target(ch.c), was = ch.on;
        ch.on = tv > 0;
        if (was !== ch.on || ch.c.layer === name || ch.c.off === name) { ch.g.gain.setTargetAtTime(tv, n, 0.25); ch.changed = n; }
      }
    },
    layers() { return { ...layers }; },
    stinger(id) {
      const def = STINGERS[id];
      if (!def) return null;
      const n = ac.currentTime, sec = def.len * 60 / def.bpm / 4 + 0.6;
      for (const p of players) if (!p.oneShot && p.stopAt === Infinity) {
        p.out.gain.cancelScheduledValues(n); p.out.gain.setValueAtTime(Math.max(0.0001, p.out.gain.value), n);
        p.out.gain.linearRampToValueAtTime(dbToGain(CFG.audio.stingerDuck), n + 0.08);
        p.out.gain.setValueAtTime(dbToGain(CFG.audio.stingerDuck), n + sec);
        p.out.gain.linearRampToValueAtTime(1, n + sec + 0.8);
      }
      makePlayer(id, def, 0, true);
      return { stop() {} };
    },
    stop(fade = 1) {
      for (const p of players) if (p.stopAt === Infinity) fadeOut(p, fade);
      current = null;
    },
  };
}
