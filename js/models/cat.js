// CAT — процедурная кошка (на референсах нет — додумана): рыжая полосатая, белая грудка, ~48 см тело, 26 см в холке.
// Шарниры: root → body → (chest → neck → head → jaw, ear.L/R) · leg.{FL,FR,BL,BR} → knee · tail0..4.
// Анимации: idle, walk (диагональные пары), run, sit, lie, meow, tailFlick (оверлей), hiss.
import * as THREE from 'three';
import { toonMaterial, addOutline } from '../three/toon.js';
import { modelTriangles } from '../three/toon.js';
import { mergeRigid, mergeSkinned } from '../three/merge.js';
const D = Math.PI / 180;
export const CAT_ANIMS = ['idle', 'walk', 'run', 'sit', 'lie', 'meow', 'hiss'];
export function createCat(opts = {}) {
  const group = new THREE.Group(); group.name = 'CAT';
  const M = {
    fur: toonMaterial('CatFur', opts.color || '#d9823b'), stripe: toonMaterial('CatStripe', '#a35424'),
    white: toonMaterial('CatWhite', '#f2ece0'), nose: toonMaterial('CatNose', '#e08a8a'),
    eye: toonMaterial('CatEye', '#c8d84a', { emissive: new THREE.Color('#3a4a10'), emissiveIntensity: 0.4 }), pupil: toonMaterial('CatPupil', '#1d1519'),
  };
  for (const m of Object.values(M)) m.flatShading = true;
  const joints = {};
  const pivot = (n, parent, pos = [0, 0, 0]) => { const o = new THREE.Group(); o.name = n; o.position.fromArray(pos); parent.add(o); joints[n] = o; return o; };
  const mesh = (n, g, m, parent, pos = [0, 0, 0], th = 0.8) => { const o = new THREE.Mesh(g, m); o.name = n; o.position.fromArray(pos); o.castShadow = true; parent.add(o); if (th) addOutline(o, th); return o; };
  const root = pivot('root', group);
  const body = pivot('body', root, [0, 24, 0]);
  const torso = new THREE.CapsuleGeometry(9, 26, 3, 8); torso.rotateX(Math.PI / 2); torso.scale(1, 0.95, 1);
  mesh('Torso', torso, M.fur, body);
  for (let i = 0; i < 3; i++) { const g = new THREE.TorusGeometry(9.2, 1.1, 3, 10, Math.PI); g.rotateZ(0); const s = mesh('Stripe' + i, g, M.stripe, body, [0, 0, -8 + i * 7], 0); s.rotation.y = Math.PI / 2; s.rotation.z = Math.PI / 2; s.rotation.x = Math.PI / 2; s.scale.set(1, 1, 1); }
  const chestG = new THREE.SphereGeometry(7, 8, 6); chestG.scale(1, 1.1, 0.8);
  mesh('Chest', chestG, M.white, body, [0, -2.5, 15], 0);
  const chest = pivot('chest', body, [0, 3, 16]);
  const neck = pivot('neck', chest, [0, 2, 3]);
  const head = pivot('head', neck, [0, 6, 4]);
  const headG = new THREE.SphereGeometry(7.5, 10, 8); headG.scale(1.05, 0.92, 0.95);
  mesh('Head', headG, M.fur, head);
  const muzzle = new THREE.SphereGeometry(3.6, 8, 6); muzzle.scale(1.2, 0.8, 0.9);
  mesh('Muzzle', muzzle, M.white, head, [0, -2.4, 5.6], 0.4);
  mesh('Nose', new THREE.SphereGeometry(1.0, 6, 4), M.nose, head, [0, -1.0, 8.4], 0);
  for (const [s, k] of [['L', 1], ['R', -1]]) {
    const ear = pivot('ear.' + s, head, [k * 4.2, 5.4, -0.5]);
    const eg = new THREE.ConeGeometry(2.6, 5.5, 4); eg.rotateY(Math.PI / 4);
    mesh('Ear' + s, eg, M.fur, ear, [0, 2.4, 0], 0.4);
    const inner = new THREE.ConeGeometry(1.4, 3.6, 3); mesh('EarIn' + s, inner, M.nose, ear, [0, 2.0, 0.9], 0);
    const eyeG = new THREE.SphereGeometry(1.9, 8, 6); eyeG.scale(1, 1.1, 0.6);
    mesh('Eye' + s, eyeG, M.eye, head, [k * 2.9, 1.2, 6.2], 0);
    const pg = new THREE.SphereGeometry(1.0, 6, 4); pg.scale(0.45, 1.25, 0.5);
    const p = mesh('Pupil' + s, pg, M.pupil, head, [k * 2.9, 1.2, 7.25], 0); joints['pupil.' + s] = p;
  }
  const jaw = pivot('jaw', head, [0, -3.6, 4.2]);
  const jg = new THREE.SphereGeometry(2.4, 6, 4); jg.scale(1.1, 0.5, 1); mesh('Jaw', jg, M.white, jaw, [0, -0.4, 1.4], 0.3);
  const legs = { FL: [5.5, -2, 13], FR: [-5.5, -2, 13], BL: [5.5, -2, -13], BR: [-5.5, -2, -13] };
  for (const [n, p] of Object.entries(legs)) {
    const hip = pivot('leg.' + n, body, p);
    const up = new THREE.CapsuleGeometry(2.6, 8, 2, 6); mesh('Leg' + n, up, M.fur, hip, [0, -5.5, 0], 0.5);
    const knee = pivot('knee.' + n, hip, [0, -11, 0]);
    const lo = new THREE.CapsuleGeometry(2.0, 7, 2, 6); mesh('Shin' + n, lo, n[0] === 'F' ? M.white : M.fur, knee, [0, -5, 0], 0.5);
    const paw = new THREE.SphereGeometry(2.5, 6, 4); paw.scale(1, 0.6, 1.3); mesh('Paw' + n, paw, M.white, knee, [0, -10.4, 0.8], 0.4);
  }
  let parent = pivot('tail0', body, [0, 4, -20]);
  for (let i = 0; i < 5; i++) {
    const r = 2.2 - i * 0.25, len = 7;
    const g = new THREE.CapsuleGeometry(r, len - 2 * r + 1, 2, 6); g.translate(0, len / 2, 0);
    mesh('Tail' + i, g, i === 4 ? M.stripe : (i % 2 ? M.stripe : M.fur), parent, [0, 0, 0], 0.4);
    if (i < 4) parent = pivot('tail' + (i + 1), parent, [0, len, 0]);
  }
  const rest = {}; for (const [n, j] of Object.entries(joints)) rest[n] = { p: j.position.clone(), q: j.quaternion.clone() };
  const anim = { name: 'idle', t: 0, flick: -10, speed: 25, blend: 1, prev: null };
  const rot = (n, x = 0, y = 0, z = 0) => { const j = joints[n]; if (j) j.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x * D, y * D, z * D))); };
  function pose(name, t, speed) {
    const w = (f, ph = 0) => Math.sin(t * Math.PI * 2 * f + ph);
    // хвост по умолчанию — дуга вверх
    rot('tail0', -55 + 6 * w(0.4), 8 * w(0.3), 0); rot('tail1', 18, 0, 0); rot('tail2', 14, 6 * w(0.4, 1), 0); rot('tail3', 10, 0, 0); rot('tail4', 8, 10 * w(0.5, 2), 0);
    if (name === 'idle') { joints.body.position.y += 0.4 * w(0.5); rot('head', 4 * w(0.15), 15 * w(0.08), 0); }
    if (name === 'walk' || name === 'run') {
      const run = name === 'run', f = run ? 3.0 : Math.max(0.8, speed / 30), a = run ? 38 : 24;
      if (!run) { // диагональные пары: FL+BR, FR+BL
        const s1 = w(f), s2 = w(f, Math.PI);
        rot('leg.FL', -a * s1); rot('leg.BR', -a * s1); rot('leg.FR', -a * s2); rot('leg.BL', -a * s2);
        rot('knee.FL', Math.max(0, s1) * 30); rot('knee.BR', -Math.max(0, s1) * 30); rot('knee.FR', Math.max(0, s2) * 30); rot('knee.BL', -Math.max(0, s2) * 30);
        joints.body.position.y += 0.6 * Math.abs(w(f * 2));
        rot('head', 3 * w(f * 2), 0, 0);
      } else { // галоп: передние вместе, задние в противофазе
        const s1 = w(f), s2 = w(f, Math.PI * 0.9);
        rot('leg.FL', -a * s1); rot('leg.FR', -a * s1 * 0.9); rot('leg.BL', -a * s2); rot('leg.BR', -a * s2 * 0.9);
        rot('knee.FL', Math.max(0, s1) * 40); rot('knee.FR', Math.max(0, s1) * 40); rot('knee.BL', -Math.max(0, s2) * 40); rot('knee.BR', -Math.max(0, s2) * 40);
        rot('body', 8 * w(f), 0, 0); joints.body.position.y += 2 * Math.abs(w(f));
        rot('tail0', 40, 0, 0);
      }
    }
    if (name === 'sit') {
      rot('body', -32, 0, 0); joints.body.position.y -= 3; joints.body.position.z -= 4;
      rot('leg.FL', 32); rot('leg.FR', 32);
      rot('leg.BL', -60); rot('leg.BR', -60); rot('knee.BL', 120); rot('knee.BR', 120);
      rot('head', 28, 10 * w(0.1), 0);
      rot('tail0', 55, 0, 0); rot('tail1', -10, 25, 0); rot('tail2', 0, 25, 0);
    }
    if (name === 'lie') {
      joints.body.position.y -= 15;
      for (const n of ['FL', 'FR']) { rot('leg.' + n, -80); rot('knee.' + n, 0); }
      for (const n of ['BL', 'BR']) { rot('leg.' + n, 80); rot('knee.' + n, -150); }
      rot('head', 8 + 3 * w(0.25), 0, 0); joints.body.scale.set(1 + 0.02 * w(0.3), 1, 1);
      rot('tail0', 80, 0, 0); rot('tail1', 0, 30, 0); rot('tail2', 0, 25, 0); rot('tail3', 0, 20, 0);
    }
    if (name === 'meow' || name === 'hiss') {
      const hiss = name === 'hiss', u = Math.min(1, t / (hiss ? 0.3 : 0.25)), open = hiss ? 1 : Math.max(0, Math.sin(Math.min(1, t / 0.8) * Math.PI));
      rot('jaw', 26 * open); rot('head', hiss ? -5 : -18 * u);
      if (hiss) { rot('ear.L', 0, 0, 50); rot('ear.R', 0, 0, -50); joints.body.position.y += 2; rot('body', 0, 0, 0); rot('tail0', -20, 0, 0); for (let i = 1; i < 5; i++) rot('tail' + i, 0, 0, 0); }
      if (anim.sitBase) { rot('body', -32 * 0, 0, 0); }
    }
  }
  function update(dt) {
    dt = Math.min(0.1, Math.max(0, dt || 0)); anim.t += dt;
    for (const [n, j] of Object.entries(joints)) { if (!rest[n]) continue; j.position.copy(rest[n].p); j.quaternion.copy(rest[n].q); }
    joints.body.scale.set(1, 1, 1);
    pose(anim.name, anim.t, anim.speed);
    const ft = anim.t - anim.flick; // tailFlick оверлей
    if (ft >= 0 && ft < 0.5) { const s = Math.sin(ft / 0.5 * Math.PI * 2); rot('tail3', 0, 35 * s, 0); rot('tail4', 0, 45 * s, 0); }
    // плавное смешивание с предыдущей позой
    if (anim.blend < 1 && anim.prev) {
      anim.blend = Math.min(1, anim.blend + dt / 0.25);
      for (const [n, j] of Object.entries(joints)) { const p = anim.prev[n]; if (!p) continue; j.position.lerpVectors(p.p, j.position.clone(), anim.blend); j.quaternion.slerpQuaternions(p.q, j.quaternion.clone(), anim.blend); }
    }
  }
  function play(name, o = {}) {
    if (!CAT_ANIMS.includes(name)) throw new Error('Неизвестная анимация кошки: ' + name);
    if (anim.name === name && !o.restart) return;
    anim.prev = {}; for (const [n, j] of Object.entries(joints)) anim.prev[n] = { p: j.position.clone(), q: j.quaternion.clone() };
    anim.name = name; anim.t = 0; anim.blend = 0; if (o.speed) anim.speed = o.speed;
  }
  const model = {
    group, joints, materials: M, kind: 'CAT',
    play, update, tailFlick() { anim.flick = anim.t; },
    setSpeed(v) { anim.speed = v; },
    get anim() { return anim.name; },
    idleName: 'idle', attackName: 'hiss',
    attack(name = 'hiss', { onHit, onEnd } = {}) { play('hiss', { restart: true }); setTimeout(() => onHit?.(), 300); setTimeout(() => { play('idle'); onEnd?.(); }, 900); return 0.9; },
  };
  if (opts.merge !== false) { const js = new Set(Object.values(joints)); mergeRigid(group, { skip: (o) => js.has(o) }); if (opts.skin !== false) mergeSkinned(group); }
  // lite — для игровых сцен (кошка мелкая в кадре): без контура на ушах, челюсти, голенях и хвосте (−13 вызовов)
  if (opts.lite) {
    const minor = /^(ear\.|jaw|knee\.|tail)/;
    group.traverse((o) => { if (o.isMesh && (o.userData.outline || o.userData.humanOutline || /_outline$/.test(o.name))) { let p = o.parent; while (p && !joints[p.name]) p = p.parent; if (p && minor.test(p.name)) o.visible = false; } });
  }
  update(0);
  model.tris = modelTriangles(group);
  return model;
}
