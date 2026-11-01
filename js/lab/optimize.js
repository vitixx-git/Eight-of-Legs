// Слияние статики лаборатории (draw calls ≈ 360 → ≈ 60): всё неподвижное — в меши с вертексными цветами по классу
// материала (three/merge.js). Подвижное и меняющее вид остаётся отдельным: установка (бак меняет цвет), контейнер,
// утилизатор (люк, лампа), дверь, банки с пауками и образцы (режим memory), пламя, часы, анализатор, монитор, паутинка,
// учёный. Вызывать после furnishLab и до добавления персонажей в сцену.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStaticVC } from '../three/merge.js';

// Прозрачное стекло (колбы, горлышки) не входит в mergeStaticVC (нужна сортировка) — сливаем отдельно: одинаковый
// материал (цвет, прозрачность, глубина) → один меш. Колбы почти не перекрываются, порядок внутри меша не важен.
function mergeGlass(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.children.length) return;
    const m = o.material; if (!m || Array.isArray(m) || !m.transparent || m.map || m.alphaMap || !o.geometry?.attributes?.position) return;
    for (let p = o; p && p !== root; p = p.parent) if (!p.visible || p.userData.dynamic || p.userData.noMerge) return;
    const k = [m.type, m.color?.getHexString(), m.opacity.toFixed(3), m.depthWrite ? 1 : 0, m.side, m.emissive?.getHexString() ?? '', m.emissiveIntensity ?? 0, o.renderOrder].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  });
  let n = 0, removed = 0;
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    const geos = items.map((o) => {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
      if (!g.attributes.normal) g.computeVertexNormals();
      g.morphAttributes = {}; g.clearGroups(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      return g;
    });
    const mg = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
    if (!mg) continue;
    mg.computeBoundingBox(); mg.computeBoundingSphere();
    const keep = items[0].material, mesh = new THREE.Mesh(mg, keep);
    mesh.name = 'MERGED_GLASS_' + n++; mesh.renderOrder = items[0].renderOrder; mesh.userData = { merged: true, glass: true, count: items.length };
    root.add(mesh);
    for (const o of items) { o.removeFromParent(); o.geometry.dispose(); if (o.material !== keep && !o.material.userData?.shared) o.material.dispose(); removed++; }
  }
  return { meshes: n, removed };
}
// opts.band(minY, mesh) → номер полосы слияния (S10: шкаф — отдельной полосой, чтобы его можно было делать прозрачным).
export function optimizeLab(lab, { keep = [], band = null } = {}) {
  const root = lab.root;
  const mark = (o) => { if (o) o.userData.dynamic = true; };
  for (const n of ['POISON_UNIT', 'POISON_CONTAINER', 'DISPOSER', 'LAB_DOOR_IN', 'JAR_SPIDERS_0', 'JAR_SPIDERS_1', 'WEB_DECOR', ...keep]) mark(lab.objects[n] || root.getObjectByName(n));
  for (const n of ['SPIRIT_FLAME', 'clock_wall', 'analyzer', 'monitor_crt', 'houseplant', 'hazard_floor_sign']) mark(lab.decor.getObjectByName(n));
  lab.decor.children.forEach((o) => { if (o.userData.memoryOnly) mark(o); });
  if (lab.scientist) mark(lab.scientist.group);
  root.traverse((o) => { if (o.isLineSegments || o.isLine) mark(o); });
  const res = mergeStaticVC(root, band ? { band } : {});
  res.glass = mergeGlass(root);
  return res;
}
