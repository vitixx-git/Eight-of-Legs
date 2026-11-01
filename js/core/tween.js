// Твины по реальному времени кадра (UI, камера кат-сцен) или по шагу логики.
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t, outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3), inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  smooth: (t) => t * t * (3 - 2 * t),
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const damp = (a, b, smoothTime, dt) => lerp(a, b, 1 - Math.exp(-dt / Math.max(1e-4, smoothTime / 3)));

export function createTweens() {
  const list = new Set();
  const api = {
    to(obj, props, dur, opts = {}) {
      const tw = { obj, from: {}, to: props, dur: Math.max(1e-4, dur), t: -(opts.delay || 0), ease: ease[opts.ease] || opts.ease || ease.outQuad,
        onUpdate: opts.onUpdate, onDone: opts.onDone, tag: opts.tag || null, started: false };
      list.add(tw);
      return { cancel: () => list.delete(tw), get done() { return !list.has(tw); } };
    },
    call(delay, fn, tag) { return api.to({}, {}, delay, { onDone: fn, tag, ease: 'linear' }); },
    update(dt) {
      for (const tw of [...list]) {
        tw.t += dt;
        if (tw.t < 0) continue;
        if (!tw.started) { tw.started = true; for (const k of Object.keys(tw.to)) tw.from[k] = tw.obj[k]; }
        const u = Math.min(1, tw.t / tw.dur), e = tw.ease(u);
        for (const k of Object.keys(tw.to)) tw.obj[k] = lerp(tw.from[k], tw.to[k], e);
        if (tw.onUpdate) tw.onUpdate(e, u);
        if (u >= 1) { list.delete(tw); if (tw.onDone) tw.onDone(); }
      }
    },
    killTag(tag) { for (const tw of [...list]) if (tw.tag === tag) list.delete(tw); },
    clear() { list.clear(); },
    count() { return list.size; },
  };
  return api;
}
