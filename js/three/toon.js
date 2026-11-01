// Тон-шейдинг: MeshToonMaterial + gradientMap 3×1 [90,170,255] NearestFilter, обводка #1d1519 BackSide.
import * as THREE from 'three';
import { CFG } from '../config.js';
let ramp = null;
export function gradientMap() {
  if (!ramp) {
    ramp = new THREE.DataTexture(new Uint8Array(CFG.toon.gradient), 3, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.generateMipmaps = false; ramp.needsUpdate = true;
    ramp.userData.shared = true;
  }
  return ramp;
}
export function toonMaterial(name, color, extra = {}) {
  const m = new THREE.MeshToonMaterial({ name, color, gradientMap: gradientMap(), ...extra });
  return m;
}
const outlineMats = new Map();
export function outlineMaterial(color = CFG.toon.outline) {
  if (!outlineMats.has(color)) {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }); m.name = 'Outline'; m.userData.shared = true;
    outlineMats.set(color, m);
  }
  return outlineMats.get(color);
}
let glassMat = null;
export function glassMaterial() {
  if (!glassMat) {
    glassMat = new THREE.MeshBasicMaterial({ color: CFG.toon.glass.color, transparent: true, opacity: CFG.toon.glass.opacity, depthWrite: false });
    glassMat.name = 'Glass'; glassMat.userData.shared = true;
  }
  return glassMat;
}
// Обводка: клон со сдвигом вершин по нормали; без гладких нормалей — масштаб ×1.03.
export function addOutline(mesh, thickness = CFG.toon.thick.furniture, opts = {}) {
  const src = mesh.geometry;
  let g;
  const flat = opts.scale || src.type === 'BoxGeometry' || mesh.userData.flatNormals;
  if (flat) {
    g = src;
    const o = new THREE.Mesh(g, outlineMaterial());
    src.computeBoundingBox();
    const size = src.boundingBox.getSize(new THREE.Vector3());
    const s = Math.max(size.x, size.y, size.z) || 1;
    const k = opts.scaleK || Math.max(CFG.toon.scaleNoNormals, 1 + (2 * thickness) / s);
    src.boundingBox.getCenter(o.position).multiplyScalar(1 - k);
    o.scale.setScalar(k);
    o.name = mesh.name + '_outline'; o.userData.outline = true; o.userData.humanOutline = true; o.userData.sharedGeometry = true;
    mesh.add(o); return o;
  }
  g = src.clone();
  const p = g.attributes.position, n = g.attributes.normal;
  if (n) for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * thickness, p.getY(i) + n.getY(i) * thickness, p.getZ(i) + n.getZ(i) * thickness);
  const o = new THREE.Mesh(g, outlineMaterial());
  o.name = mesh.name + '_outline'; o.userData.outline = true; o.userData.humanOutline = true;
  mesh.add(o); return o;
}
// Подсчёт и освобождение ресурсов
export function triangles(root, visibleOnly = true) {
  let n = 0;
  const f = (o) => { if (o.isMesh && o.geometry && o.material?.visible !== false) { const c = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; n += (c / 3) * (o.isInstancedMesh ? o.count : 1); } };
  if (visibleOnly) root.traverseVisible(f); else root.traverse(f);
  return Math.round(n);
}
export function modelTriangles(root) { // без обводки
  let n = 0;
  root.traverseVisible((o) => { if (o.isMesh && o.material?.visible !== false && !o.userData.outline && !o.userData.humanOutline && !o.userData.spiderOutline && !o.userData.labOutline) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return Math.round(n);
}
const TEX_SLOTS = ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'bumpMap', 'aoMap', 'lightMap', 'specularMap', 'roughnessMap', 'metalnessMap', 'displacementMap', 'envMap', 'matcap', 'gradientMap'];
// Освобождение GPU-ресурсов поддерева: геометрии, материалы, текстуры (все слоты и uniforms шейдеров),
// скелеты (bone-текстуры SkinnedMesh), карты теней источников света, фон сцены. Общие (userData.shared) — не трогаем.
// В three.js dispose() освобождает только видеопамять: объект можно снова отрисовать — он загрузится заново.
export function disposeTree(root, { detach = true } = {}) {
  const gs = new Set(), ms = new Set(), ts = new Set(), sk = new Set();
  const addTex = (t) => { if (t && t.isTexture && !t.userData?.shared) ts.add(t); };
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData?.shared) gs.add(o.geometry);
    if (o.isSkinnedMesh && o.skeleton) sk.add(o.skeleton);
    if (o.isLight) { if (o.shadow?.map) { o.shadow.map.dispose(); o.shadow.map = null; } }
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (m.userData?.shared) continue;
      ms.add(m);
      for (const k of TEX_SLOTS) addTex(m[k]);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) { const v = u?.value; if (Array.isArray(v)) v.forEach(addTex); else addTex(v); }
    }
  });
  if (root.isScene) { addTex(root.background); addTex(root.environment); }
  gs.forEach((g) => g.dispose()); ms.forEach((m) => m.dispose()); ts.forEach((t) => t.dispose()); sk.forEach((s) => s.dispose());
  if (detach) root.removeFromParent();
}
