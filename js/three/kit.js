// Набор примитивов в стиле игры: тон-материал + обводка по категории (человек 1.2, мебель 0.8, мелочь 0.4, паук 0.06).
import * as THREE from 'three';
import { CFG } from '../config.js';
import { toonMaterial, addOutline, glassMaterial, outlineMaterial } from './toon.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const T = CFG.toon.thick;
export const THICK = T;
const matCache = new Map();
// Общие материалы по цвету (для статики); для анимируемых — opts.unique
export function mat(color, opts = {}) {
  if (opts.unique) return toonMaterial(opts.name || 'mat', color, opts.extra || {});
  const key = color + '|' + (opts.emissive || '') + '|' + (opts.flat ? 1 : 0) + '|' + (opts.transparent ? opts.opacity : '') + '|' + (opts.side || 0);
  if (!matCache.has(key)) {
    const extra = {};
    if (opts.emissive) { extra.emissive = new THREE.Color(opts.emissive); extra.emissiveIntensity = opts.emissiveIntensity ?? 0.6; }
    if (opts.transparent) { extra.transparent = true; extra.opacity = opts.opacity ?? 0.5; extra.depthWrite = false; }
    if (opts.side) extra.side = opts.side;
    const m = toonMaterial('kit_' + color, color, extra); if (opts.flat) m.flatShading = true;
    m.userData.shared = true; matCache.set(key, m);
  }
  return matCache.get(key);
}
function finish(parent, geo, color, pos, opts, thick) {
  const m = new THREE.Mesh(geo, color && color.isMaterial ? color : mat(color, opts));
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (opts.rot) m.rotation.set(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0);
  if (opts.scale) Array.isArray(opts.scale) ? m.scale.set(...opts.scale) : m.scale.setScalar(opts.scale);
  if (opts.name) m.name = opts.name;
  m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false;
  const th = opts.outline === undefined ? thick : opts.outline;
  if (th) addOutline(m, th, { scale: opts.outlineScale });
  if (parent) parent.add(m);
  return m;
}
export const box = (parent, size, pos, color, opts = {}) => finish(parent, new THREE.BoxGeometry(size[0], size[1], size[2]), color, pos, opts, T.furniture);
export const roundBox = (parent, size, pos, color, opts = {}) => {
  const [w, h, d] = size, g = new THREE.BoxGeometry(w, h, d, 2, 2, 2), p = g.attributes.position, v = new THREE.Vector3(), r = Math.min(w, h, d) * (opts.radius ?? 0.18);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const q = new THREE.Vector3(THREE.MathUtils.clamp(v.x, -w / 2 + r, w / 2 - r), THREE.MathUtils.clamp(v.y, -h / 2 + r, h / 2 - r), THREE.MathUtils.clamp(v.z, -d / 2 + r, d / 2 - r));
    v.sub(q); if (v.lengthSq() > 0) v.normalize().multiplyScalar(r); v.add(q); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return finish(parent, g, color, pos, opts, T.furniture);
};
export const sphere = (parent, r, pos, color, opts = {}) => finish(parent, new THREE.SphereGeometry(r, opts.seg || 10, opts.segH || 7), color, pos, opts, T.small);
export const capsule = (parent, r, len, pos, color, opts = {}) => finish(parent, new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 2, opts.seg || 8), color, pos, opts, T.small);
export const cyl = (parent, r1, r2, h, pos, color, opts = {}) => finish(parent, new THREE.CylinderGeometry(r1, r2, h, opts.seg || 10, 1, !!opts.open), color, pos, opts, T.small);
export const cone = (parent, r, h, pos, color, opts = {}) => finish(parent, new THREE.ConeGeometry(r, h, opts.seg || 8), color, pos, opts, T.small);
export const torus = (parent, r, tube, pos, color, opts = {}) => finish(parent, new THREE.TorusGeometry(r, tube, opts.radial || 6, opts.tubular || 14, opts.arc || Math.PI * 2), color, pos, opts, T.small);
export const tube = (parent, points, radius, color, opts = {}) => {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return finish(parent, new THREE.TubeGeometry(curve, opts.segments || 24, radius, opts.radial || 6, false), color, null, opts, T.small);
};
export const glass = (parent, size, pos, opts = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), glassMaterial()); if (pos) m.position.set(...pos); if (opts.rot) m.rotation.set(...opts.rot); m.renderOrder = 2; if (parent) parent.add(m); return m; };
// Надпись: CanvasTexture. Текст — из ru.js.
export function labelTexture(text, { font = '800 72px "Trebuchet MS", Arial', fg = '#1d1519', bg = '#f2ece0', border = '#1d1519', pw = 512, ph = 192 } = {}) {
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, pw, ph); }
  if (border) { x.strokeStyle = border; x.lineWidth = Math.max(6, ph * 0.05); x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, pw - x.lineWidth, ph - x.lineWidth); }
  let size = parseInt(/(\d+)px/.exec(font)?.[1] || '72', 10);
  const fam = font.replace(/^.*?\d+px\s*/, ''), weight = /^(\d{3}|bold)/.exec(font)?.[1] || '800';
  do { x.font = `${weight} ${size}px ${fam}`; size -= 2; } while (x.measureText(text).width > pw * 0.9 && size > 12);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, pw / 2, ph / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export function label(parent, text, { w = 40, h = 14, pos = [0, 0, 0], rot = [0, 0, 0], ...style } = {}) {
  const tex = labelTexture(text, { pw: 512, ph: Math.max(64, Math.round(512 * h / w)), ...style });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !style.bg && style.bg !== undefined }));
  m.position.set(...pos); m.rotation.set(...rot); m.name = 'label:' + text;
  if (parent) parent.add(m);
  return m;
}
// Слияние статики по материалу (снижение draw calls). Исключения — userData.dynamic у узла или предка.
export function mergeStatic(root, { minCount = 2 } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  const remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || Array.isArray(o.material)) return;
    let p = o; while (p && p !== root) { if (p.userData.dynamic || !p.visible) return; p = p.parent; }
    const m = o.material; if (m.transparent || (m.map && m.map.isCanvasTexture && !m.userData.shared)) return;
    const g = o.geometry; if (!g.attributes.position || !g.attributes.normal) return;
    const key = m.uuid + '|' + (g.attributes.uv && m.map ? 'uv' : '') + '|' + (g.attributes.color ? 'c' : '') + '|' + o.castShadow + o.receiveShadow;
    if (!groups.has(key)) groups.set(key, { m, items: [], uv: !!(g.attributes.uv && m.map), color: !!g.attributes.color, cast: o.castShadow, recv: o.receiveShadow });
    groups.get(key).items.push(o);
  });
  let merged = 0, removed = 0;
  for (const grp of groups.values()) {
    if (grp.items.length < minCount) continue;
    const geos = [];
    for (const o of grp.items) {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!(name === 'position' || name === 'normal' || (name === 'uv' && grp.uv) || (name === 'color' && grp.color))) g.deleteAttribute(name);
      if (grp.uv && !g.attributes.uv) continue;
      if (grp.color && !g.attributes.color) continue;
      g.morphAttributes = {};
      const mtx = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      g.applyMatrix4(mtx);
      if (mtx.determinant() < 0) for (const a of Object.values(g.attributes)) { const n = a.itemSize; for (let i = 0; i < a.count; i += 3) for (let c = 0; c < n; c++) { const t0 = a.array[i * n + c]; a.array[i * n + c] = a.array[(i + 2) * n + c]; a.array[(i + 2) * n + c] = t0; } }
      geos.push(g);
    }
    if (geos.length < minCount) continue;
    const mg = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!mg) continue;
    const mesh = new THREE.Mesh(mg, grp.m); mesh.name = 'MERGED_' + (grp.m.name || 'mat');
    mesh.castShadow = grp.cast; mesh.receiveShadow = grp.recv; mesh.userData.merged = true;
    root.add(mesh); merged++;
    for (const o of grp.items) remove.push(o);
  }
  for (const o of remove) {
    // дети (не меши) сохраняем: переносим в корень с мировой матрицей
    for (const ch of [...o.children]) if (!remove.includes(ch)) { ch.applyMatrix4(o.matrixWorld); ch.applyMatrix4(inv); root.add(ch); }
    if (!o.userData.sharedGeometry) o.geometry.dispose();
    o.removeFromParent(); removed++;
  }
  return { merged, removed };
}
export { outlineMaterial, glassMaterial };
