// Примитивы синтеза и рецепты всех звуковых эффектов (docs/PLAN.md §10.3).
// osc(type, f0, f1, dur, env) · noise(color, dur, filter, env) · fm(fc, ratio, index, dur, env); env = ADSR.
const dbg = (db) => Math.pow(10, db / 20);
export function osc(ac, out, L, t0, rate = 1) {
  const o = ac.createOscillator(); o.type = L.type || 'sine';
  const f0 = L.f0 * rate, f1 = (L.f1 ?? L.f0) * rate, dur = L.dur;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) { if (L.lin) o.frequency.linearRampToValueAtTime(f1, t0 + dur); else o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur); }
  if (L.det) o.detune.value = L.det;
  let src = o, nodes = [o];
  if (L.vib) { const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = L.vib[0]; lg.gain.value = L.vib[1] * rate; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05); nodes.push(lfo); }
  const g = env(ac, L, t0);
  if (L.ft) { const bq = ac.createBiquadFilter(); bq.type = L.ft; bq.frequency.value = L.fq || 1000; bq.Q.value = L.Q || 1; src.connect(bq); bq.connect(g); } else src.connect(g);
  g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
  return { end: t0 + dur, nodes };
}
export function noise(ac, out, L, t0, bufs, rate = 1) {
  const s = ac.createBufferSource(); s.buffer = bufs[L.color || 'white']; s.loop = true;
  s.playbackRate.value = rate;
  const bq = ac.createBiquadFilter(); bq.type = L.ft || 'lowpass'; bq.Q.value = L.Q ?? 1;
  const f0 = (L.f0 || 2000) * rate, f1 = (L.f1 ?? L.f0 ?? 2000) * rate;
  bq.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) bq.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + L.dur);
  const g = env(ac, L, t0);
  s.connect(bq); bq.connect(g); g.connect(out);
  const off = (L.off || 0) % 1.5; s.start(t0, off); s.stop(t0 + L.dur + 0.05);
  return { end: t0 + L.dur, nodes: [s] };
}
export function fm(ac, out, L, t0, rate = 1) {
  const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain();
  const fc = L.fc * rate, fc1 = (L.fc1 ?? L.fc) * rate;
  car.frequency.setValueAtTime(fc, t0); mod.frequency.setValueAtTime(fc * L.ratio, t0);
  if (fc1 !== fc) { car.frequency.exponentialRampToValueAtTime(fc1, t0 + L.dur); mod.frequency.exponentialRampToValueAtTime(fc1 * L.ratio, t0 + L.dur); }
  mg.gain.setValueAtTime(fc * L.ratio * L.index, t0);
  mg.gain.exponentialRampToValueAtTime(Math.max(0.01, fc * L.ratio * L.index * (L.idxEnd ?? 0.2)), t0 + L.dur);
  mod.connect(mg); mg.connect(car.frequency); car.type = L.type || 'sine';
  const g = env(ac, L, t0); car.connect(g); g.connect(out);
  car.start(t0); mod.start(t0); car.stop(t0 + L.dur + 0.05); mod.stop(t0 + L.dur + 0.05);
  return { end: t0 + L.dur, nodes: [car, mod] };
}
// ADSR: a, d, s (доля), r; пик = db
function env(ac, L, t0) {
  const g = ac.createGain(), peak = dbg(L.db ?? -12), dur = L.dur;
  const a = Math.min(L.a ?? 0.004, dur * 0.5), r = Math.min(L.r ?? dur * 0.7, dur - a), d = L.d ?? 0, s = L.s ?? 1;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  if (d > 0) g.gain.linearRampToValueAtTime(peak * s, t0 + a + d);
  g.gain.setValueAtTime(peak * (d > 0 ? s : 1), Math.max(t0 + a + d, t0 + dur - r));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  return g;
}
export function renderLayers(ac, out, rec, t0, bufs, rate = 1) {
  let end = t0; const nodes = [];
  for (const L of rec) {
    const t = t0 + (L.delay || 0) / rate;
    const r = L.k === 'o' ? osc(ac, out, L, t, rate) : L.k === 'n' ? noise(ac, out, L, t, bufs, rate) : fm(ac, out, L, t, rate);
    end = Math.max(end, r.end); nodes.push(...r.nodes);
  }
  return { end, nodes };
}
// DSL
const o = (type, f0, f1, dur, db, x = {}) => ({ k: 'o', type, f0, f1, dur, db, ...x });
const n = (color, dur, db, ft, f0, f1, Q = 1, x = {}) => ({ k: 'n', color, dur, db, ft, f0, f1: f1 ?? f0, Q, ...x });
const f = (fc, ratio, index, dur, db, x = {}) => ({ k: 'f', fc, ratio, index, dur, db, ...x });
const at = (delay, L) => ({ ...L, delay: (L.delay || 0) + delay });
const rep = (L, count, gap, step = 1) => Array.from({ length: count }, (_, i) => ({ ...L, delay: (L.delay || 0) + i * gap, f0: L.f0 ? L.f0 * Math.pow(step, i) : L.f0, f1: L.f1 ? L.f1 * Math.pow(step, i) : L.f1, fc: L.fc ? L.fc * Math.pow(step, i) : L.fc }));
const notes = (type, freqs, gap, dur, db, x = {}) => freqs.map((fr, i) => o(type, fr, fr, dur, db, { ...x, delay: i * gap }));
const N = { B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392, Gs4: 415.3, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, B5: 987.77, E3: 164.81, A3: 220, Gs3: 207.65 };

export const RECIPES = {
  // ---- UI ----
  UI_FOCUS: [o('sine', 540, 540, 0.055, -24)],
  UI_CONFIRM: [o('sine', 740, 980, 0.12, -18), at(0.04, o('triangle', 1480, 1480, 0.08, -26))],
  UI_BACK: [o('sine', 620, 420, 0.1, -20)],
  UI_DENY: [o('triangle', 180, 90, 0.14, -18)],
  UI_TOGGLE: [o('square', 880, 880, 0.03, -28), at(0.035, o('square', 1320, 1320, 0.03, -30))],
  UI_SLIDER: [o('sine', 900, 900, 0.025, -30)],
  UI_CARD_IN: [n('pink', 0.5, -24, 'bandpass', 400, 2400, 0.8, { a: 0.2 }), o('sine', 110, 110, 0.6, -22, { a: 0.05 })],
  UI_TASK_DONE: notes('triangle', [N.E5, N.G5, N.B5], 0.06, 0.16, -16),
  UI_SKIP: [n('white', 0.25, -22, 'highpass', 1200, 6000, 0.7)],
  UI_PAUSE: [o('sine', 440, 330, 0.12, -22)],
  UI_BIG_SUCCESS: [...notes('triangle', [N.E4, N.Gs4, N.B4, N.E5], 0.09, 0.5, -14), n('white', 1.2, -26, 'highpass', 4000, 9000, 0.5, { a: 0.05 })],
  UI_HINT: [o('sine', 660, 660, 0.08, -26), at(0.09, o('sine', 880, 880, 0.08, -26))],
  UI_TICK: [o('square', 1200, 1200, 0.03, -24)],
  UI_TICK_LAST: [o('square', 1600, 1600, 0.06, -20)],
  UI_START: [o('sine', 220, 440, 0.4, -18, { a: 0.02 }), at(0.12, o('triangle', 660, 660, 0.3, -22))],
  UI_ERROR: [o('sawtooth', 160, 120, 0.25, -22, { ft: 'lowpass', fq: 900 })],
  // ---- Паук ----
  SPD_STEP: [n('white', 0.025, -34, 'highpass', 5000, 5000, 1)],
  SPD_STEP_SOFT: [n('white', 0.02, -40, 'highpass', 6000, 6000, 1)],
  SPD_WEB_SHOOT: [n('white', 0.35, -18, 'bandpass', 3000, 900, 2, { a: 0.01 }), o('sine', 1800, 600, 0.3, -26)],
  SPD_WEB_CLIMB: rep(n('white', 0.06, -26, 'bandpass', 2600, 2600, 3), 5, 0.12),
  SPD_EDGE: [o('sine', 300, 600, 0.15, -22), n('white', 0.08, -30, 'highpass', 3000)],
  SPD_EAR_ENTER: [n('brown', 1.4, -14, 'lowpass', 1200, 200, 1, { a: 0.3 }), o('sine', 220, 70, 1.5, -18, { a: 0.2 })],
  SPD_BITE: [n('white', 0.06, -16, 'bandpass', 2400, 1200, 2), o('square', 900, 300, 0.06, -26)],
  SPD_BITE_HIT: [o('square', 240, 80, 0.12, -14), n('white', 0.08, -18, 'lowpass', 3000, 800)],
  SPD_BITE_BLOCK: [o('triangle', 1800, 1700, 0.18, -18), o('square', 2400, 2300, 0.08, -26)],
  SPD_DASH: [n('pink', 0.22, -18, 'bandpass', 600, 2400, 1.5, { a: 0.02 })],
  SPD_HURT: [o('square', 760, 300, 0.16, -16, { vib: [30, 60] }), n('white', 0.1, -20, 'bandpass', 1800)],
  SPD_DEATH: [o('triangle', 600, 80, 0.9, -14, { vib: [9, 40] }), n('pink', 0.6, -22, 'lowpass', 2000, 200)],
  SPD_SPAWN: [o('sine', 200, 800, 0.3, -20), n('white', 0.2, -28, 'highpass', 4000)],
  SPD_SIGH: [n('pink', 1.2, -18, 'bandpass', 900, 400, 1.2, { a: 0.3 }), o('sine', 300, 200, 1.1, -30, { a: 0.3 })],
  SPD_CHEER: notes('square', [N.E5, N.G5, N.E5, N.B5], 0.07, 0.08, -24),
  SPD_LEVER: [o('square', 200, 120, 0.08, -18), n('white', 0.05, -24, 'bandpass', 1500), at(0.08, o('square', 300, 300, 0.04, -24))],
  // ---- Спальня / спящий ----
  BED_SNORE: [n('brown', 1.1, -14, 'lowpass', 220, 420, 3, { a: 0.5, r: 0.4 }), o('sawtooth', 70, 80, 1.1, -30, { a: 0.5, ft: 'lowpass', fq: 300 })],
  BED_SNORE_STOP: [n('brown', 0.25, -14, 'lowpass', 420, 120, 3, { a: 0.02 })],
  BED_CREAK_WARN: [o('sawtooth', 140, 95, 0.55, -16, { vib: [18, 12], ft: 'bandpass', fq: 600, Q: 4 }), at(0.3, o('sawtooth', 120, 80, 0.5, -18, { vib: [14, 10], ft: 'bandpass', fq: 500, Q: 4 }))],
  BED_TOSS: [n('pink', 0.6, -14, 'lowpass', 1600, 400, 0.7, { a: 0.08 })],
  BED_SWAT: [n('brown', 0.25, -10, 'lowpass', 900, 200, 1), o('sine', 110, 50, 0.25, -14)],
  BED_MUMBLE: [o('sawtooth', 140, 120, 0.9, -20, { vib: [5, 18], ft: 'bandpass', fq: 700, Q: 3, a: 0.1 })],
  BED_WAKE: [o('sawtooth', 160, 260, 0.6, -14, { ft: 'bandpass', fq: 800, Q: 2 }), at(0.3, o('sine', 400, 200, 0.4, -20))],
  HEARTBEAT: [o('sine', 62, 40, 0.16, -8), at(0.18, o('sine', 55, 36, 0.2, -11))],
  CLOCK_TICK: [n('white', 0.015, -30, 'bandpass', 3500, 3500, 6)],
  MOON_SHIMMER: [o('sine', 1760, 1760, 1.2, -32, { vib: [6, 8], a: 0.4 })],
  WEB_GLINT: [o('sine', 2637, 2637, 0.25, -30), at(0.06, o('sine', 3520, 3520, 0.2, -32))],
  EAR_MUFFLE: [n('brown', 0.8, -16, 'lowpass', 300, 120, 1, { a: 0.2 })],
  // ---- Воспоминание ----
  MEM_WHOOSH: [n('pink', 0.8, -14, 'bandpass', 300, 3000, 1.2, { a: 0.4, r: 0.3 })],
  MEM_GLITCH: rep(o('square', 900, 300, 0.04, -24), 4, 0.05, 1.3),
  MEM_PEN_SCRATCH: rep(n('white', 0.09, -28, 'bandpass', 4000, 3000, 4), 4, 0.13),
  MEM_JAR_CLINK: [o('sine', 2200, 2200, 0.4, -22), o('sine', 3310, 3310, 0.3, -28)],
  MEM_STING: [o('sawtooth', N.E3, N.E3, 1.4, -16, { ft: 'lowpass', fq: 900, a: 0.05 }), o('sawtooth', N.E3 * 1.06, N.E3 * 1.06, 1.4, -18, { ft: 'lowpass', fq: 900, a: 0.05 })],
  MEM_OUT: [n('pink', 0.7, -16, 'bandpass', 3000, 300, 1.2, { a: 0.05 })],
  // ---- Голова / кабина ----
  BRN_TALK_BLIP: [o('square', 520, 480, 0.045, -24)],
  REF_INTRO: rep(o('square', 600, 900, 0.07, -18), 3, 0.11, 1.12),
  FEAR_INTRO: [o('triangle', 700, 400, 0.5, -18, { vib: [14, 40] })],
  WILL_INTRO: [o('sine', 80, 45, 0.3, -8), n('brown', 0.25, -14, 'lowpass', 600, 100)],
  WILL_STOMP: [o('sine', 70, 40, 0.25, -10), n('brown', 0.2, -16, 'lowpass', 500, 80)],
  BRN_BARRIER_OFF: [o('sawtooth', 400, 60, 0.8, -16, { ft: 'lowpass', fq: 2000 }), n('pink', 0.6, -22, 'highpass', 2000, 400)],
  BRN_PANEL_ON: [o('square', 1200, 1200, 0.05, -24), at(0.05, o('sine', 1800, 1800, 0.12, -24))],
  BRN_BUTTON: [o('square', 400, 400, 0.04, -20)],
  BRN_LEVER: [o('square', 180, 120, 0.12, -16), n('white', 0.1, -22, 'bandpass', 1200, 600, 2)],
  BRN_CHAIR: [n('pink', 0.3, -18, 'lowpass', 800, 300), o('sine', 160, 90, 0.2, -20)],
  BRN_ALARM: rep(o('square', 880, 880, 0.12, -20), 3, 0.2),
  BRN_EYE_OPEN: [o('sine', 300, 900, 0.5, -18, { a: 0.1 }), n('white', 0.4, -28, 'highpass', 5000)],
  BRN_SIT_UP: [n('pink', 0.8, -16, 'lowpass', 900, 300, 0.7, { a: 0.2 })],
  BRN_DAWN: [...notes('sine', [N.E4, N.B4, N.E5, N.Gs4 * 2], 0.25, 1.6, -22, { a: 0.3 })],
  // ---- Бой: общее ----
  BAT_START: [o('sawtooth', 220, 440, 0.25, -18, { ft: 'lowpass', fq: 2000 }), at(0.25, o('square', 660, 660, 0.2, -20))],
  BAT_HIT_DEF: [o('square', 300, 90, 0.14, -12), n('white', 0.12, -16, 'lowpass', 4000, 600)],
  BAT_HIT_SPIDER: [o('triangle', 900, 260, 0.2, -12, { vib: [40, 80] }), n('white', 0.1, -18, 'bandpass', 2500)],
  BAT_BLOCK: [o('triangle', 1500, 1400, 0.22, -16), n('white', 0.06, -22, 'highpass', 3000)],
  BAT_ARMOR_SPARK: [o('square', 2600, 2200, 0.1, -20), n('white', 0.12, -20, 'highpass', 5000, 3000)],
  BAT_SHIELD_HIT: [o('sine', 180, 120, 0.25, -12), n('pink', 0.2, -18, 'bandpass', 800, 400, 2)],
  BAT_DEATH_DEF: [o('sawtooth', 500, 60, 1.0, -14, { vib: [8, 30], ft: 'lowpass', fq: 1800 }), n('pink', 0.8, -20, 'lowpass', 3000, 200)],
  BAT_WHOOSH: [n('pink', 0.18, -20, 'bandpass', 500, 2000, 1.4)],
  BAT_STEP_DEF: [n('brown', 0.05, -26, 'lowpass', 500)],
  BAT_COUNTDOWN: [o('square', 660, 660, 0.1, -20)],
  BAT_SLOW: [o('sine', 500, 250, 0.4, -20, { vib: [6, 20] })],
  BAT_HEART_LOST: [o('triangle', 520, 260, 0.25, -16)],
  // ---- Рефлекс ----
  REF_WARN_WHISTLE: [o('sine', 600, 1800, 0.8, -16, { a: 0.6, r: 0.05, lin: true })],
  REF_WARN_SHORT: [o('sine', 900, 2000, 0.5, -16, { a: 0.4, r: 0.05, lin: true })],
  REF_DASH: [n('pink', 0.35, -12, 'bandpass', 800, 3000, 1.2, { a: 0.02 }), o('sawtooth', 200, 400, 0.3, -22, { ft: 'lowpass', fq: 1500 })],
  REF_IMPACT_WALL: [o('sine', 90, 40, 0.3, -8), n('brown', 0.3, -12, 'lowpass', 800, 100)],
  REF_STUN: rep(o('sine', 1400, 1400, 0.1, -22), 3, 0.12, 1.12),
  REF_HAMMER: [o('square', 1000, 1000, 0.04, -18), n('white', 0.05, -22, 'highpass', 3000)],
  REF_DEFLATE: [o('sawtooth', 700, 90, 1.0, -16, { vib: [11, 60], ft: 'lowpass', fq: 1600 })],
  REF_TAUNT: [o('square', 500, 700, 0.08, -22), at(0.1, o('square', 700, 500, 0.08, -22))],
  // ---- Страх ----
  FEAR_RING: [o('sine', 300, 900, 0.5, -18, { vib: [7, 30] }), n('pink', 0.4, -28, 'bandpass', 800, 2400, 2)],
  FEAR_RING_HIT: [o('triangle', 1100, 500, 0.25, -14, { vib: [30, 60] })],
  FEAR_BLINK: [o('sine', 1600, 400, 0.18, -18), n('white', 0.15, -26, 'highpass', 4000, 1500)],
  FEAR_CLONE: rep(o('triangle', 800, 820, 0.12, -22), 3, 0.08, 1.2),
  FEAR_CLONE_POP: [o('sine', 900, 200, 0.18, -16), n('white', 0.12, -22, 'bandpass', 2000, 800)],
  FEAR_WHIMPER: [o('triangle', 900, 600, 0.45, -20, { vib: [12, 50] })],
  FEAR_TREMBLE: [o('sine', 220, 220, 0.4, -30, { vib: [18, 15] })],
  FEAR_FAINT: [o('triangle', 800, 120, 1.1, -14, { vib: [6, 80] })],
  // ---- Воля ----
  WILL_GRUNT: [o('sawtooth', 120, 90, 0.3, -16, { ft: 'lowpass', fq: 800 })],
  WILL_SHIELD_UP: [n('pink', 0.2, -18, 'bandpass', 600, 1200, 2), o('sine', 200, 260, 0.15, -22)],
  WILL_PREP: [o('sawtooth', 110, 220, 1.0, -18, { a: 0.8, r: 0.05, ft: 'lowpass', fq: 1200 })],
  WILL_STRIKE: [o('sine', 80, 35, 0.4, -6), n('brown', 0.35, -10, 'lowpass', 1200, 90)],
  WILL_OPEN: [o('triangle', 400, 300, 0.3, -20), at(0.15, o('triangle', 300, 220, 0.3, -22))],
  WILL_ENRAGE: [o('sawtooth', 90, 180, 0.9, -12, { ft: 'lowpass', fq: 900, vib: [8, 10] })],
  WILL_TRAP_SET: [o('square', 1200, 1200, 0.05, -24), at(0.1, o('square', 1200, 1200, 0.05, -24))],
  WILL_TRAP_SNAP: [n('white', 0.15, -16, 'bandpass', 2000, 900, 2), o('square', 300, 200, 0.1, -20)],
  WILL_FOLDER_FLAP: [n('pink', 0.12, -20, 'bandpass', 1400, 700, 1.5)],
  WILL_DEFEAT: [o('sawtooth', 300, 50, 1.2, -12, { ft: 'lowpass', fq: 1200 }), n('pink', 1.0, -18, 'lowpass', 2000, 100)],
  // ---- Человек ----
  HUM_STEP: [n('brown', 0.07, -20, 'lowpass', 700, 300, 1), n('white', 0.02, -32, 'highpass', 3000)],
  HUM_STEP_STAIR: [o('sine', 140, 90, 0.08, -18), n('brown', 0.06, -22, 'lowpass', 900)],
  HUM_STEP_CAREFUL: [n('brown', 0.06, -27, 'lowpass', 500)],
  HUM_WOBBLE_WARN: [o('sine', 330, 300, 0.25, -16, { vib: [7, 20] }), at(0.25, o('sine', 300, 270, 0.3, -18, { vib: [7, 20] }))],
  HUM_FALL: [n('brown', 0.5, -8, 'lowpass', 900, 120), o('sine', 120, 45, 0.45, -10), at(0.25, n('pink', 0.3, -16, 'lowpass', 1200, 300))],
  HUM_BUMP: [o('sine', 160, 90, 0.12, -14), n('brown', 0.1, -18, 'lowpass', 700)],
  HUM_SLIP: [o('sine', 500, 1500, 0.3, -18, { lin: true }), n('pink', 0.25, -24, 'bandpass', 1200, 3000, 2)],
  HUM_YAWN: [o('sawtooth', 220, 140, 1.4, -20, { ft: 'bandpass', fq: 700, Q: 2, a: 0.3, vib: [4, 6] })],
  HUM_RESIST_GRUNT: [o('sawtooth', 150, 110, 0.35, -16, { ft: 'bandpass', fq: 600, Q: 2, vib: [20, 12] })],
  HUM_PICKUP: notes('triangle', [N.C5, N.E5], 0.06, 0.12, -18),
  HUM_BEND: [n('pink', 0.3, -24, 'lowpass', 900, 500)],
  HUM_SIGH: [n('pink', 1.0, -18, 'bandpass', 800, 350, 1.2, { a: 0.25 })],
  HUM_GASP: [n('white', 0.3, -16, 'bandpass', 1500, 2500, 2, { a: 0.02 })],
  HUM_OOF: [o('sawtooth', 200, 120, 0.2, -16, { ft: 'bandpass', fq: 700, Q: 2 })],
  HUM_CLOTH: rep(n('pink', 0.12, -24, 'bandpass', 1800, 1000, 1.5), 3, 0.15),
  HUM_WASH_SPLASH: [n('white', 0.5, -14, 'bandpass', 1500, 600, 0.8, { a: 0.01 }), at(0.1, n('white', 0.4, -18, 'highpass', 3000, 1500))],
  // ---- Дом ----
  HOUSE_DOOR_OPEN: [o('sawtooth', 200, 320, 0.5, -22, { ft: 'bandpass', fq: 900, Q: 6, vib: [20, 8] })],
  HOUSE_DOOR_CLOSE: [o('sine', 100, 60, 0.2, -12), n('brown', 0.15, -16, 'lowpass', 900)],
  HOUSE_TAP_ON: [o('square', 400, 300, 0.05, -24), n('white', 0.3, -22, 'bandpass', 2500, 1800, 1, { a: 0.1 })],
  HOUSE_SPLASH: [n('white', 0.35, -16, 'bandpass', 1200, 500, 0.8)],
  HOUSE_TOWEL: [n('pink', 0.5, -20, 'bandpass', 1400, 900, 1.2, { a: 0.1 })],
  HOUSE_WARDROBE_RATTLE: rep(n('brown', 0.08, -14, 'lowpass', 900, 600), 6, 0.11),
  HOUSE_SOCK_POP: [o('sine', 220, 440, 0.3, -14, { vib: [12, 30] })],
  HOUSE_MUG_TIP: [o('sine', 1900, 1700, 0.15, -18), at(0.12, o('sine', 1500, 1400, 0.2, -20))],
  HOUSE_COFFEE_SPILL: [n('brown', 0.6, -16, 'lowpass', 1400, 300, 1, { a: 0.03 })],
  HOUSE_CHAIR_SCRAPE: [o('sawtooth', 180, 140, 0.35, -20, { ft: 'bandpass', fq: 1100, Q: 5, vib: [30, 15] })],
  HOUSE_KEYS: rep(o('sine', 3200, 3200, 0.08, -24), 4, 0.05, 1.07),
  HOUSE_PAPER: [n('white', 0.25, -22, 'bandpass', 3000, 1800, 1.4)],
  HOUSE_FRONT_DOOR: [o('sine', 90, 55, 0.3, -10), n('brown', 0.25, -14, 'lowpass', 800)],
  HOUSE_SOCK_BOING: [o('sine', 220, 440, 0.3, -14, { vib: [12, 30] })],
  // ---- Кошка ----
  CAT_MEOW: [o('sawtooth', 700, 520, 0.45, -16, { ft: 'bandpass', fq: 1400, Q: 3, a: 0.06, vib: [6, 20] })],
  CAT_HISS: [n('white', 0.6, -16, 'highpass', 3000, 4000, 1, { a: 0.05 })],
  CAT_PURR: [o('sawtooth', 26, 26, 1.2, -18, { ft: 'lowpass', fq: 300, vib: [2, 3] })],
  CAT_RUN: rep(n('brown', 0.04, -24, 'lowpass', 900), 6, 0.08),
  CAT_STEP: [n('brown', 0.03, -32, 'lowpass', 700)],
  CAT_YOWL: [o('sawtooth', 900, 600, 0.6, -14, { ft: 'bandpass', fq: 1600, Q: 3, vib: [9, 40] })],
  // ---- Умывание / зеркало ----
  WASH_STEP_OK: notes('triangle', [N.E5, N.B5], 0.07, 0.14, -16),
  WASH_ERROR: [o('triangle', 300, 200, 0.2, -18)],
  WASH_DONE: [...notes('triangle', [N.E4, N.Gs4, N.B4], 0.08, 0.3, -16), n('white', 0.6, -24, 'bandpass', 2000, 800)],
  WASH_TICK: [o('sine', 1500, 1500, 0.02, -32)],
  PREP_MIRROR_STING: [o('sawtooth', N.E4, N.E4 * 1.06, 1.2, -14, { ft: 'lowpass', fq: 1600, a: 0.02 }), o('square', N.B3 / 2, N.B3 / 2, 1.2, -20, { ft: 'lowpass', fq: 600 }), n('white', 0.5, -24, 'highpass', 5000)],
  PREP_LEG_TWITCH: [o('square', 1200, 700, 0.05, -24)],
  PREP_LEG_RETRACT: [o('sine', 900, 200, 0.3, -18)],
  // ---- Дорога ----
  ROAD_HONK: [o('square', 392, 392, 0.4, -14, { ft: 'lowpass', fq: 1800 }), o('square', 466, 466, 0.4, -16, { ft: 'lowpass', fq: 1800 })],
  ROAD_HONK_BUS: [o('sawtooth', 220, 220, 0.6, -12, { ft: 'lowpass', fq: 1200 }), o('sawtooth', 277, 277, 0.6, -14, { ft: 'lowpass', fq: 1200 })],
  ROAD_SCREECH: [n('white', 0.7, -14, 'bandpass', 3200, 2400, 8, { a: 0.02 }), o('sawtooth', 1800, 1500, 0.6, -24, { ft: 'bandpass', fq: 2000, Q: 6 })],
  ROAD_CRASH_SOFT: [o('sine', 100, 50, 0.3, -10), n('brown', 0.35, -12, 'lowpass', 1500, 200)],
  ROAD_LIGHT_GREEN: notes('sine', [N.E5, N.G5], 0.12, 0.18, -18),
  ROAD_LIGHT_RED: notes('sine', [N.G5, N.E5], 0.12, 0.18, -20),
  ROAD_LIGHT_BLINK: [o('square', 1000, 1000, 0.05, -26)],
  ROAD_BEEP_WALK: [o('square', 2000, 2000, 0.03, -28)],
  ROAD_TIMER_20: notes('triangle', [N.B4, N.Fs4], 0.15, 0.2, -16),
  ROAD_TIMER_10: notes('triangle', [N.B4, N.Fs4, N.B3], 0.12, 0.2, -14),
  ROAD_TIMER_TICK: [o('square', 1400, 1400, 0.06, -18)],
  ROAD_DOOR: [o('sine', 600, 600, 0.1, -20), at(0.1, o('sine', 800, 800, 0.15, -20))],
  ROAD_PASSBY: [n('pink', 0.9, -20, 'bandpass', 300, 900, 1, { a: 0.4, r: 0.4 })],
  // ---- Лаборатория ----
  LAB_DOOR_SLIDE: [n('pink', 0.9, -16, 'bandpass', 400, 900, 1.5, { a: 0.1 }), o('sawtooth', 70, 90, 0.9, -22, { ft: 'lowpass', fq: 400 })],
  LAB_CARD_BEEP: [o('square', 1000, 1000, 0.08, -20)],
  LAB_LED_GREEN: notes('sine', [N.C5, N.G5], 0.08, 0.15, -18),
  LAB_CONSOLE_LEVER: [o('square', 160, 100, 0.15, -14), n('white', 0.1, -20, 'bandpass', 1000)],
  LAB_MACHINE_STOP: [o('sawtooth', 220, 40, 1.4, -14, { ft: 'lowpass', fq: 1200 }), n('pink', 1.2, -22, 'lowpass', 2000, 100)],
  LAB_PICKUP_CONTAINER: [o('sine', 600, 900, 0.15, -18), n('white', 0.1, -26, 'bandpass', 2500)],
  LAB_HATCH_OPEN: [o('sawtooth', 120, 220, 0.6, -18, { ft: 'lowpass', fq: 900 }), at(0.55, o('square', 500, 500, 0.06, -22))],
  LAB_INSERT: [o('sine', 300, 150, 0.3, -12), n('brown', 0.2, -16, 'lowpass', 800), at(0.25, o('square', 900, 900, 0.06, -22))],
  LAB_DISPOSE_BOOM: [o('sine', 70, 30, 1.2, -6), n('brown', 1.0, -10, 'lowpass', 2500, 80), at(0.05, n('white', 0.6, -18, 'highpass', 3000, 1000))],
  LAB_LAMP_GREEN: notes('sine', [N.E5, N.Gs4 * 2, N.B5], 0.07, 0.25, -18),
  LAB_BUBBLE: [o('sine', 500, 1200, 0.07, -26)],
  LAB_KEYPAD: [o('square', 1300, 1300, 0.04, -24)],
  // ---- Кат-сцены ----
  CUT_WHOOSH: [n('pink', 0.6, -16, 'bandpass', 400, 2400, 1, { a: 0.25 })],
  CUT_STING: [o('sawtooth', N.E3, N.E3, 0.9, -16, { ft: 'lowpass', fq: 1400 }), o('sawtooth', N.B3, N.B3, 0.9, -18, { ft: 'lowpass', fq: 1400 })],
  CUT_SWELL: [n('pink', 2.0, -18, 'bandpass', 200, 1600, 0.8, { a: 1.6, r: 0.3 })],
  BOING_SOFT: [o('sine', 220, 440, 0.3, -14, { vib: [12, 30] })],
  PAPER_FLIP: [n('white', 0.3, -18, 'highpass', 2000, 600, 0.8)],
};
// Группы полифонии: шаги 2, урон 1, двигатели 6, UI 3, остальное 4
export function POLY_GROUP(id) {
  if (/STEP/.test(id)) return 'step';
  if (/^(BAT_HIT|SPD_HURT|FEAR_RING_HIT|BAT_HEART)/.test(id)) return 'damage';
  if (/ENGINE/.test(id)) return 'engine';
  if (/^UI_/.test(id)) return 'ui';
  return 'default';
}
// Петли: (ac, out, bufs, opts) → {stop, setRate, setParam}
function noiseSrc(ac, bufs, color) { const s = ac.createBufferSource(); s.buffer = bufs[color]; s.loop = true; return s; }
export const LOOPS = {
  ROAD_ENGINE(ac, out, bufs, opts) {
    const o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = opts.freq || 62;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 2;
    const nz = noiseSrc(ac, bufs, 'brown'), ng = ac.createGain(); ng.gain.value = 0.5;
    const g = ac.createGain(); g.gain.value = 0.16;
    o1.connect(lp); nz.connect(ng); ng.connect(lp); lp.connect(g); g.connect(out); o1.start(); nz.start();
    return { stop() { try { o1.stop(); nz.stop(); } catch {} }, setRate(r) { o1.frequency.setTargetAtTime((opts.freq || 62) * r, ac.currentTime, 0.1); } };
  },
  ROAD_BUS_ENGINE(ac, out, bufs, opts) { return LOOPS.ROAD_ENGINE(ac, out, bufs, { ...opts, freq: 41 }); },
  LAB_DISPOSE_CHARGE(ac, out, bufs) {
    const o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 70;
    const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 140;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = ac.createGain(); g.gain.value = 0.18;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); o1.start(); o2.start();
    return { stop() { try { o1.stop(); o2.stop(); } catch {} }, setParam(k, v) { const n = ac.currentTime; o1.frequency.setTargetAtTime(70 + v * 330, n, 0.05); o2.frequency.setTargetAtTime(140 + v * 660, n, 0.05); lp.frequency.setTargetAtTime(500 + v * 3500, n, 0.05); g.gain.setTargetAtTime(0.12 + v * 0.22, n, 0.05); } };
  },
  HOUSE_WATER_RUN(ac, out, bufs) {
    const nz = noiseSrc(ac, bufs, 'white'), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 7; lg.gain.value = 500; lfo.connect(lg); lg.connect(bp.frequency);
    const g = ac.createGain(); g.gain.value = 0.22; nz.connect(bp); bp.connect(g); g.connect(out); nz.start(); lfo.start();
    return { stop() { try { nz.stop(); lfo.stop(); } catch {} } };
  },
  BED_SNORE_LOOP(ac, out, bufs) {
    const nz = noiseSrc(ac, bufs, 'brown'), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 3;
    const amp = ac.createGain(); amp.gain.value = 0;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.3; const lg = ac.createGain(); lg.gain.value = 0.35;
    const offs = ac.createConstantSource(); offs.offset.value = 0.05;
    lfo.connect(lg); lg.connect(amp.gain); offs.connect(amp.gain);
    nz.connect(lp); lp.connect(amp); amp.connect(out); nz.start(); lfo.start(); offs.start();
    return { stop() { try { nz.stop(); lfo.stop(); offs.stop(); } catch {} } };
  },
  SPIDER_WIND(ac, out, bufs) {
    const nz = noiseSrc(ac, bufs, 'pink'), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.6;
    const g = ac.createGain(); g.gain.value = 0.1; nz.connect(bp); bp.connect(g); g.connect(out); nz.start();
    return { stop() { try { nz.stop(); } catch {} } };
  },
};
export const SFX_IDS = Object.keys(RECIPES);
export const LOOP_IDS = Object.keys(LOOPS);
