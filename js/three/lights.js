// Свет: полусферический + 1 направленный (тень по качеству) + до 3 точечных.
import * as THREE from 'three';
import { CFG } from '../config.js';
export function makeLights(scene, paletteName, renderer, opts = {}) {
  const p = CFG.palette[paletteName] || CFG.palette.house;
  const hemi = new THREE.HemisphereLight(p.sky, p.ground, (opts.hemi ?? p.hemi) * Math.PI * 0.55);
  const dir = new THREE.DirectionalLight(p.key, (opts.keyI ?? p.keyI) * Math.PI * 0.55);
  const dp = opts.dirPos || [300, 600, 400];
  dir.position.set(dp[0], dp[1], dp[2]);
  const target = opts.target || [0, 0, 0];
  dir.target.position.set(target[0], target[1], target[2]);
  const size = renderer?.shadowSize || 0;
  dir.castShadow = size > 0 && opts.shadows !== false;
  if (dir.castShadow) {
    dir.shadow.mapSize.set(size, size);
    const ext = opts.shadowExtent || 600;
    Object.assign(dir.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: opts.shadowFar || 3000 });
    dir.shadow.bias = -0.0008; dir.shadow.normalBias = opts.normalBias ?? 1.5;
  }
  scene.add(hemi, dir, dir.target);
  const points = [];
  for (const pt of (opts.points || []).slice(0, 3)) {
    const l = new THREE.PointLight(pt.color || '#fff1d6', pt.intensity ?? 1, pt.distance ?? 0, pt.decay ?? 2);
    l.position.set(...pt.pos); scene.add(l); points.push(l);
  }
  if (p.bg) scene.background = new THREE.Color(opts.bg || p.bg);
  return { hemi, dir, points, palette: p, dispose() { if (dir.shadow.map) dir.shadow.map.dispose(); [hemi, dir, dir.target, ...points].forEach((o) => o.removeFromParent()); } };
}
