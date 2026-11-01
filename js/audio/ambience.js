// 10 петель окружения (полностью синтез). Основная петля кросс-фейдится; дополнительные слои (AMB_LAB_MACHINE) — layer(id,on).
export const AMB_IDS = ['AMB_MENU_NIGHT', 'AMB_BEDROOM', 'AMB_MEMORY', 'AMB_BRAIN', 'AMB_COCKPIT', 'AMB_HOUSE_MORNING', 'AMB_BATH', 'AMB_STREET', 'AMB_LAB', 'AMB_LAB_MACHINE'];

function kit(ac, out, bufs) {
  const nodes = [], timers = [];
  const k = {
    alive: true, nodes, timers,
    noise(color, type, f, Q, gain) {
      const s = ac.createBufferSource(); s.buffer = bufs[color]; s.loop = true;
      const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q;
      const g = ac.createGain(); g.gain.value = gain;
      s.connect(b); b.connect(g); g.connect(out); s.start(ac.currentTime, Math.random() * 1.5);
      nodes.push(s); return { s, b, g };
    },
    tone(type, f, gain, lp) {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
      const g = ac.createGain(); g.gain.value = gain;
      if (lp) { const b = ac.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = lp; o.connect(b); b.connect(g); } else o.connect(g);
      g.connect(out); o.start(); nodes.push(o); return { o, g };
    },
    lfo(rate, depth, param) {
      const o = ac.createOscillator(); o.frequency.value = rate; const g = ac.createGain(); g.gain.value = depth;
      o.connect(g); g.connect(param); o.start(); nodes.push(o); return o;
    },
    // одиночное событие: тональный «чирп» с огибающей
    chirp(f0, f1, dur, vol, type = 'sine', pan = 0, delay = 0) {
      const t = ac.currentTime + 0.02 + delay;
      const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ac.createStereoPanner(); p.pan.value = pan;
      o.connect(g); g.connect(p); p.connect(out); o.start(t); o.stop(t + dur + 0.05);
    },
    burst(type, f, Q, dur, vol, pan = 0, delay = 0, color = 'white') {
      const t = ac.currentTime + 0.02 + delay;
      const s = ac.createBufferSource(); s.buffer = bufs[color]; s.loop = true;
      const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.2, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ac.createStereoPanner(); p.pan.value = pan;
      s.connect(b); b.connect(g); g.connect(p); p.connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    },
    every(min, max, fn) {
      const go = () => {
        if (!k.alive) return;
        if (ac.state === 'running') { try { fn(); } catch {} }
        timers.push(setTimeout(go, (min + Math.random() * (max - min)) * 1000));
      };
      timers.push(setTimeout(go, (min + Math.random() * (max - min)) * 500));
    },
    rpan() { return Math.random() * 1.4 - 0.7; },
  };
  return k;
}
const birds = (k, vol) => { const n = 2 + (Math.random() * 3 | 0), p = k.rpan(), base = 2400 + Math.random() * 1200; for (let i = 0; i < n; i++) k.chirp(base, base * (1.3 + Math.random() * 0.3), 0.07, vol, 'sine', p, i * 0.11); };
export const AMB = {
  AMB_MENU_NIGHT(k) {
    const w = k.noise('pink', 'lowpass', 450, 0.5, 0.13); k.lfo(0.07, 220, w.b.frequency);
    k.every(0.25, 0.7, () => { const p = k.rpan(); for (let i = 0; i < 3; i++) k.chirp(4300, 4200, 0.028, 0.012, 'sine', p, i * 0.05); });
    k.every(8, 15, () => { k.chirp(390, 340, 0.35, 0.03, 'sine', -0.4); k.chirp(380, 330, 0.5, 0.03, 'sine', -0.4, 0.45); });
  },
  AMB_BEDROOM(k) {
    k.noise('brown', 'lowpass', 220, 0.4, 0.22);
    let tock = false;
    k.every(1.0, 1.0, () => { tock = !tock; k.burst('highpass', tock ? 2600 : 3300, 1.5, 0.025, 0.04, 0.5); });
    k.every(0.5, 1.4, () => { const p = -0.6; for (let i = 0; i < 3; i++) k.chirp(4300, 4200, 0.025, 0.005, 'sine', p, i * 0.05); });
  },
  AMB_MEMORY(k) {
    const a = k.tone('sine', 164.81, 0.022), b = k.tone('sine', 246.94, 0.018);
    k.lfo(0.2, 0.012, a.g.gain); k.lfo(0.27, 0.01, b.g.gain);
    const w = k.noise('pink', 'bandpass', 1400, 2, 0.05); k.lfo(0.09, 500, w.b.frequency);
    k.every(1.5, 3.5, () => { const f = [1318.5, 1568, 1975.5][Math.random() * 3 | 0]; k.chirp(f, f * 0.998, 1.3, 0.012, 'sine', k.rpan()); });
  },
  AMB_BRAIN(k) {
    k.tone('sine', 55, 0.05); const t = k.tone('triangle', 110, 0.018); k.lfo(0.3, 0.012, t.g.gain);
    k.noise('pink', 'lowpass', 600, 0.6, 0.06);
    k.every(0.3, 1.2, () => { const f = 300 + Math.random() * 400; k.chirp(f, f * 1.8, 0.07, 0.018, 'sine', k.rpan()); });
  },
  AMB_COCKPIT(k) {
    k.tone('square', 60, 0.025, 240); k.noise('pink', 'lowpass', 1500, 0.5, 0.04);
    k.every(2, 5, () => { const f = Math.random() < 0.5 ? 1200 : 1600; k.chirp(f, f, 0.06, 0.018, 'sine', k.rpan()); k.chirp(f * 1.25, f * 1.25, 0.06, 0.016, 'sine', 0, 0.09); });
  },
  AMB_HOUSE_MORNING(k) {
    k.noise('pink', 'lowpass', 900, 0.5, 0.035);
    k.every(1.2, 4, () => birds(k, 0.022));
    k.every(10, 20, () => k.burst('lowpass', 300, 0.6, 2.2, 0.05, k.rpan(), 0, 'brown'));
  },
  AMB_BATH(k) {
    k.noise('pink', 'lowpass', 700, 0.6, 0.06);
    k.every(1.4, 3.2, () => { const p = k.rpan() * 0.5; k.chirp(1100, 480, 0.05, 0.05, 'sine', p); k.chirp(900, 420, 0.04, 0.015, 'sine', p, 0.18); });
  },
  AMB_STREET(k) {
    const r = k.noise('brown', 'lowpass', 180, 0.5, 0.3); k.lfo(0.1, 0.08, r.g.gain);
    k.noise('pink', 'lowpass', 800, 0.4, 0.03);
    k.every(3, 7, () => birds(k, 0.015));
    k.every(12, 25, () => { const p = k.rpan(); k.chirp(330, 330, 0.35, 0.012, 'sawtooth', p); k.chirp(415, 415, 0.35, 0.01, 'sawtooth', p); });
  },
  AMB_LAB(k) {
    k.tone('sawtooth', 120, 0.012, 400); k.tone('sine', 240, 0.006);
    k.noise('pink', 'lowpass', 1100, 0.5, 0.05);
    k.every(4, 8, () => { k.chirp(1800, 1800, 0.05, 0.012, 'sine', k.rpan()); });
    k.every(0.6, 1.8, () => { const f = 400 + Math.random() * 500; k.chirp(f, f * 1.6, 0.06, 0.012, 'sine', -0.5 + Math.random() * 0.4); });
  },
  AMB_LAB_MACHINE(k) {
    const m = k.tone('sawtooth', 70, 0.035, 300); k.lfo(2, 0.02, m.g.gain);
    k.noise('white', 'bandpass', 3000, 1.5, 0.008);
    k.every(3, 6, () => k.chirp(200, 420, 0.5, 0.014, 'sawtooth', 0.3));
  },
};

export function createAmbience(api, ac, bus, send, bufs) {
  let main = null;
  const extra = new Map();
  function start(id) {
    const def = AMB[id];
    if (!def) { if (api.debug) console.warn('[audio] неизвестное окружение', id); return null; }
    const out = ac.createGain(); out.gain.value = 0.0001; out.connect(bus);
    const s = ac.createGain(); s.gain.value = 0.5; out.connect(s); s.connect(send);
    out.gain.setTargetAtTime(1, ac.currentTime, 0.35);
    const k = kit(ac, out, bufs);
    def(k);
    return {
      id,
      stop(f = 1.2) {
        k.alive = false; k.timers.forEach(clearTimeout);
        out.gain.cancelScheduledValues(ac.currentTime); out.gain.setTargetAtTime(0.0001, ac.currentTime, f / 4);
        setTimeout(() => { k.nodes.forEach((n) => { try { n.stop(); } catch {} }); try { out.disconnect(); s.disconnect(); } catch {} }, f * 1000 + 300);
      },
    };
  }
  return {
    get current() { return main?.id || null; },
    play(id) {
      if (main && main.id === id) return;
      main?.stop();
      main = id ? start(id) : null;
    },
    layer(id, on) {
      if (on && !extra.has(id)) { const h = start(id); if (h) extra.set(id, h); }
      else if (!on && extra.has(id)) { extra.get(id).stop(0.8); extra.delete(id); }
    },
    clearLayers() { for (const h of extra.values()) h.stop(0.5); extra.clear(); },
    stop() { main?.stop(); main = null; this.clearLayers(); },
  };
}
