// SPIDER_LEG_EAR — лапка паука, торчащая из уха человека (событие зеркала в S08). 3 сегмента, пушок, коготок.
// API: attach(head, side) — крепление к голове makeHuman; twitch() — рывок на 6 см; retract(dt) — втягивание; update(dt).
import * as THREE from 'three';
import { toonMaterial, addOutline } from '../three/toon.js';
const D = Math.PI / 180;
export function createSpiderLegEar() {
  const group = new THREE.Group(); group.name = 'SPIDER_LEG_EAR';
  const mat = toonMaterial('LegEar', '#2a1f2e'), joint = toonMaterial('LegEarJoint', '#4a3a52'), hair = toonMaterial('LegEarHair', '#6a5872');
  mat.flatShading = joint.flatShading = true;
  const segs = [];
  let parent = group;
  const lens = [2.2, 2.8, 1.8], rads = [0.32, 0.26, 0.2];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Group(); p.name = 'seg' + i; parent.add(p); if (i) p.position.y = lens[i - 1];
    const g = new THREE.CylinderGeometry(rads[i] * 0.8, rads[i], lens[i], 6, 1); g.translate(0, lens[i] / 2, 0);
    const m = new THREE.Mesh(g, mat); p.add(m); addOutline(m, 0.08);
    const k = new THREE.Mesh(new THREE.SphereGeometry(rads[i] * 1.2, 6, 4), joint); p.add(k);
    for (let h = 0; h < 3; h++) { const hg = new THREE.ConeGeometry(0.06, 0.5, 3); const hm = new THREE.Mesh(hg, hair); hm.position.set(Math.cos(h * 2.1) * rads[i], lens[i] * (0.3 + h * 0.2), Math.sin(h * 2.1) * rads[i]); hm.rotation.z = Math.cos(h * 2.1) * -0.9; hm.rotation.x = Math.sin(h * 2.1) * 0.9; p.add(hm); }
    segs.push(p); parent = p;
  }
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 4), joint); claw.position.y = lens[2] + 0.25; segs[2].add(claw);
  const st = { out: 0, target: 1, twitchT: 9, t: 0 };
  return {
    group, segs,
    tris: 3 * (12 + 24 + 9) + 4,
    attach(head, side = 'R', earPos = null) {
      const k = side === 'L' ? 1 : -1;
      head.add(group);
      group.position.fromArray(earPos || [k * 11.2, 1.0, 0.5]);
      group.rotation.set(0, 0, -k * 70 * D);
    },
    twitch() { st.twitchT = 0; },
    show(on) { st.target = on ? 1 : 0; },
    get visibleAmount() { return st.out; },
    update(dt) {
      st.t += dt; st.twitchT += dt;
      st.out += (st.target - st.out) * Math.min(1, dt * 6);
      group.visible = st.out > 0.02;
      group.scale.setScalar(Math.max(0.001, st.out));
      const tw = st.twitchT < 0.25 ? Math.sin(st.twitchT / 0.25 * Math.PI) : 0;
      segs[0].rotation.z = (8 * Math.sin(st.t * 7) + 25 * tw) * D;
      segs[1].rotation.z = (-30 + 12 * Math.sin(st.t * 9 + 1) - 35 * tw) * D;
      segs[2].rotation.z = (-25 + 10 * Math.sin(st.t * 11 + 2)) * D;
      group.position.x += 0; // крепление неподвижно; рывок — в сегментах
    },
    dispose() { group.removeFromParent(); group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); mat.dispose(); joint.dispose(); hair.dispose(); },
  };
}
