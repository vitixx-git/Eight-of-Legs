// Аддитивные атаки поверх базового аниматора модели: windup → active (onHit в первый кадр) → recover.
// Повороты — в пространстве родителя (premultiply), поэтому не зависят от локальных осей шарнира.
import * as THREE from 'three';
export const D = Math.PI / 180;
const q = new THREE.Quaternion(), AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
export function swing(node, axis, angle) { if (!node || !angle) return; q.setFromAxisAngle(AX[axis], angle); node.quaternion.premultiply(q); }
export const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
// веса позы «замах» и «удар» по фазе
export function curve(ph, u) {
  if (ph === 'windup') return { wind: smooth(u), strike: 0 };
  if (ph === 'active') return { wind: 1 - smooth(u), strike: smooth(Math.min(1, u * 1.6)) };
  if (ph === 'recover') return { wind: 0, strike: 1 - smooth(u) };
  return { wind: 0, strike: 0 };
}
export function withActions(model, defs, nodes) {
  const st = { name: null, t: 0, dur: null, onHit: null, onEnd: null, fired: false, phase: 'idle' };
  model.actionNames = Object.keys(defs);
  model.attack = (name, opts = {}) => {
    const d = defs[name];
    if (!d) throw new Error('Неизвестная атака: ' + name);
    st.name = name; st.t = 0; st.dur = opts.dur || d.dur; st.onHit = opts.onHit || null; st.onEnd = opts.onEnd || null; st.fired = false; st.phase = 'windup';
    d.start?.(model);
    return st.dur[0] + st.dur[1] + st.dur[2];
  };
  model.cancelAttack = () => { if (st.name) defs[st.name].end?.(model); st.name = null; st.phase = 'idle'; };
  Object.defineProperty(model, 'attackPhase', { get: () => st.phase, configurable: true });
  Object.defineProperty(model, 'attacking', { get: () => !!st.name, configurable: true });
  model.updateActions = (dt) => {
    if (!st.name) return;
    const d = defs[st.name], [w, a, r] = st.dur;
    st.t += dt;
    let ph, u;
    if (st.t < w) { ph = 'windup'; u = st.t / w; }
    else if (st.t < w + a) { ph = 'active'; u = (st.t - w) / a; if (!st.fired) { st.fired = true; st.onHit?.(); } }
    else if (st.t < w + a + r) { if (!st.fired) { st.fired = true; st.onHit?.(); } ph = 'recover'; u = (st.t - w - a) / r; }
    else { const cb = st.onEnd; d.end?.(model); st.name = null; st.phase = 'idle'; cb?.(); return; }
    st.phase = ph;
    d.apply(nodes(), ph, u, curve(ph, u), model, st.t);
  };
  return model;
}
