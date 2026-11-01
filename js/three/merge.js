// Слияние геометрии для снижения draw calls (бюджет ≤ 150).
// mergeStaticVC — статика окружения: все меши одного «класса» материала (тип, сторона, flat, эмиссия) сливаются
//   в один меш с вертексными цветами; группы дополнительно делятся по «полосам» высоты (для разреза «кукольного домика»).
// mergeRigid — персонажи: меши-дети одного шарнира сливаются (анимация шарниров сохраняется), обводки — отдельно.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _box = new THREE.Box3();
export function materialClass(m) {
  if (!m || Array.isArray(m)) return null;
  if (m.map || m.alphaMap || m.transparent || m.opacity < 1 || m.userData?.noMerge || m.wireframe || m.visible === false) return null;
  if (!(m.isMeshToonMaterial || m.isMeshBasicMaterial || m.isMeshLambertMaterial || m.isMeshStandardMaterial)) return null;
  const em = m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0 ? m.emissive.getHexString() + ':' + m.emissiveIntensity.toFixed(2) : '';
  return [m.type, m.side, m.flatShading ? 1 : 0, em, m.depthTest ? 1 : 0, m.depthWrite ? 1 : 0, m.gradientMap ? m.gradientMap.uuid : ''].join('|');
}
// Геометрия в пространстве mtx: только position/normal + вертексный цвет материала
function prepGeometry(geo, mtx, color, keepColor = false) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  const vc = keepColor && g.attributes.color && g.attributes.color.itemSize >= 3 ? g.attributes.color : null;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && !(vc && name === 'color')) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.morphAttributes = {}; g.clearGroups();
  g.applyMatrix4(mtx);
  if (mtx.determinant() < 0) { // зеркальный масштаб: разворачиваем треугольники
    for (const a of Object.values(g.attributes)) {
      const n = a.itemSize, arr = a.array;
      for (let i = 0; i < a.count; i += 3) for (let c = 0; c < n; c++) { const t = arr[i * n + c]; arr[i * n + c] = arr[(i + 2) * n + c]; arr[(i + 2) * n + c] = t; }
    }
  }
  const cnt = g.attributes.position.count, col = new Float32Array(cnt * 3);
  // уже слитая геометрия (вертексные цвета) — цвет вершины × цвет материала
  if (vc) for (let i = 0; i < cnt; i++) { col[i * 3] = vc.getX(i) * color.r; col[i * 3 + 1] = vc.getY(i) * color.g; col[i * 3 + 2] = vc.getZ(i) * color.b; }
  else for (let i = 0; i < cnt; i++) { col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const vcCache = new Map();
// Один общий материал с вертексными цветами на «класс» (не освобождается при выходе из сцены)
function mergedMaterial(src) {
  const key = materialClass(src);
  if (!vcCache.has(key)) {
    const m = src.clone(); m.vertexColors = true; m.color.set('#ffffff'); m.name = 'VC_' + src.type + '_' + vcCache.size;
    m.userData = { mergedVC: true, shared: true };
    vcCache.set(key, m);
  }
  return vcCache.get(key);
}
function hiddenUp(o, root) { let p = o; while (p && p !== root) { if (!p.visible || p.userData.dynamic || p.userData.noMerge) return true; p = p.parent; } return false; }

// Статика: root — узел окружения. opts.band(minY) → номер полосы; opts.skip(mesh) → true, чтобы не трогать.
export function mergeStaticVC(root, { band = () => 0, skip = null, minCount = 1 } = {}) {
  root.updateMatrixWorld(true);
  _inv.copy(root.matrixWorld).invert();
  const groups = new Map(), all = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isSprite) return;
    if (hiddenUp(o, root) || (skip && skip(o))) return;
    const key = materialClass(o.material); if (key === null) return;
    const g = o.geometry; if (!g?.attributes?.position) return;
    _box.setFromObject(o); if (_box.isEmpty()) return;
    const b = band(_box.min.y, o);
    const k = key + '#' + b + '#' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
    if (!groups.has(k)) groups.set(k, { mat: o.material, band: b, items: [], minY: Infinity, cast: o.castShadow, recv: o.receiveShadow });
    const grp = groups.get(k); grp.items.push(o); grp.minY = Math.min(grp.minY, _box.min.y);
  });
  const out = [], remove = new Set();
  for (const grp of groups.values()) {
    if (grp.items.length < minCount) continue;
    const geos = grp.items.map((o) => prepGeometry(o.geometry, _m.multiplyMatrices(_inv, o.matrixWorld).clone(), o.material.color || new THREE.Color(1, 1, 1)));
    const mg = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
    if (!mg) continue;
    mg.computeBoundingBox(); mg.computeBoundingSphere();
    const mesh = new THREE.Mesh(mg, mergedMaterial(grp.mat));
    mesh.name = 'MERGED_' + out.length; mesh.castShadow = grp.cast; mesh.receiveShadow = grp.recv;
    mesh.userData = { merged: true, band: grp.band, minY: grp.minY, count: grp.items.length };
    root.add(mesh); out.push(mesh); all.push(...grp.items);
    for (const o of grp.items) remove.add(o);
  }
  for (const o of remove) {
    for (const ch of [...o.children]) if (!remove.has(ch)) { o.updateMatrixWorld(true); ch.updateMatrixWorld(true); const w = ch.matrixWorld.clone(); root.add(ch); ch.matrix.multiplyMatrices(_inv, w); ch.matrix.decompose(ch.position, ch.quaternion, ch.scale); }
    o.removeFromParent();
  }
  return { meshes: out, removed: remove.size };
}

// Персонажи: сливаем меши-листья под каждым шарниром по классу материала и userData.outfit.
// Обводки всех слитых мешей шарнира — в один меш на одежду. opts.skip(mesh) → true — не трогать
// (анимируемые меши, деформируемая ткань, переключаемые предметы).
const isOutline = (o) => o.isMesh && (o.userData.outline || o.userData.humanOutline || o.userData.spiderOutline || o.material?.side === THREE.BackSide);
export function mergeRigid(group, { skip = null } = {}) {
  group.updateMatrixWorld(true);
  const nodes = [];
  group.traverse((o) => { if (!o.isMesh) nodes.push(o); });
  let before = 0, after = 0;
  for (const node of nodes) {
    const groups = new Map(), outl = new Map();
    for (const c of node.children) {
      if (!c.isMesh || isOutline(c) || (skip && skip(c))) continue;
      if (c.children.some((ch) => !isOutline(ch))) continue;
      if (!c.visible && !c.userData.outfit) continue;
      const key = materialClass(c.material); if (key === null) continue;
      if (c.children.some((ch) => materialClass(ch.material) === null)) continue;
      const k = key + '#' + (c.userData.outfit || '') + '#' + (c.castShadow ? 1 : 0);
      if (!groups.has(k)) groups.set(k, { mat: c.material, items: [], outfit: c.userData.outfit, cast: c.castShadow, visible: c.visible });
      groups.get(k).items.push(c);
    }
    const total = [...groups.values()].reduce((n, g) => n + g.items.length + g.items.reduce((m, c) => m + c.children.length, 0), 0);
    const groupsAfter = groups.size + new Set([...groups.values()].filter((g) => g.items.some((c) => c.children.length)).map((g) => g.outfit || '')).size;
    if (groupsAfter >= total) continue; // выигрыша нет
    for (const grp of groups.values()) {
      const geos = [];
      for (const c of grp.items) {
        c.updateMatrix();
        geos.push(prepGeometry(c.geometry, c.matrix.clone(), c.material.color));
        for (const oc of c.children) {
          oc.updateMatrix();
          const ok = grp.outfit || '';
          if (!outl.has(ok)) outl.set(ok, { mat: oc.material, geos: [], outfit: grp.outfit, visible: grp.visible });
          outl.get(ok).geos.push(prepGeometry(oc.geometry, new THREE.Matrix4().multiplyMatrices(c.matrix, oc.matrix), oc.material.color));
        }
      }
      const mg = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
      if (!mg) continue;
      before += grp.items.length;
      mg.computeBoundingSphere();
      const mesh = new THREE.Mesh(mg, mergedMaterial(grp.mat)); mesh.name = 'RIGID_' + node.name + '_' + after;
      mesh.castShadow = grp.cast; mesh.userData.outfit = grp.outfit; mesh.userData.rigid = true; mesh.visible = grp.visible;
      node.add(mesh); after++;
      for (const c of grp.items) { for (const oc of [...c.children]) { before++; if (!oc.userData.sharedGeometry) oc.geometry.dispose(); } c.removeFromParent(); if (!c.userData.sharedGeometry) c.geometry.dispose(); }
    }
    for (const o of outl.values()) {
      const og = mergeGeometries(o.geos, false); o.geos.forEach((g) => g.dispose());
      if (!og) continue;
      og.computeBoundingSphere();
      const om = new THREE.Mesh(og, mergedMaterial(o.mat));
      om.name = 'RIGID_' + node.name + '_outline'; om.userData.outline = true; om.userData.humanOutline = true; om.userData.outfit = o.outfit; om.visible = o.visible;
      node.add(om); after++;
    }
  }
  return { before, after };
}

// Разрез «кукольного домика»: меши с minY выше порога получают полупрозрачный материал (без записи глубины).
export function createCutaway(meshes, { opacity = 0.2 } = {}) {
  const mk = (m, minY) => { m.userData.cast0 = m.castShadow; return { m, solid: m.material, faded: null, minY: minY ?? m.userData.minY ?? 0, on: false, hid: false, ro: m.renderOrder }; };
  const items = meshes.map((m) => mk(m));
  const box = new THREE.Box3();
  function apply(it, fade, hide) {
    if (hide !== it.hid) { it.hid = hide; it.m.visible = !hide; }
    if (fade !== it.on) {
      it.on = fade;
      if (fade) { if (!it.faded) { it.faded = it.solid.clone(); it.faded.transparent = true; it.faded.opacity = opacity * (it.solid.opacity ?? 1); it.faded.depthWrite = false; } it.m.material = it.faded; it.m.castShadow = false; it.m.renderOrder = 5; }
      else { it.m.material = it.solid; it.m.castShadow = it.m.userData.cast0 ?? true; it.m.renderOrder = it.ro; }
    }
  }
  return {
    items,
    // несливаемые объекты (шкаф, зеркало, предметы): общий minY по мировому AABB
    addObject(obj, { manual = false } = {}) {
      obj.updateWorldMatrix(true, true); box.setFromObject(obj); const y = box.min.y, out = [];
      obj.traverse((o) => { if (o.isMesh && !Array.isArray(o.material)) { const it = mk(o, y); it.manual = manual; items.push(it); out.push(it); } });
      return out;
    },
    // ручное управление (галерея, витки лестницы): fade/hide задаются снаружи; возвращает число прозрачных
    setManual(list, fade, hide = false) { let n = 0; for (const it of list) { apply(it, fade, hide); if (fade) n++; } return n; },
    removeObject(obj) { const ms = new Set(); obj.traverse((o) => { if (o.isMesh) ms.add(o); }); for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (!ms.has(it.m)) continue; if (it.on) { it.m.material = it.solid; it.m.renderOrder = it.ro; } it.faded?.dispose(); items.splice(i, 1); } },
    // выше threshold — полупрозрачно (без записи глубины), выше hideAbove — скрыто совсем (не копим слои «плёнки»)
    set(threshold, hideAbove = Infinity) {
      let n = 0;
      for (const it of items) {
        if (it.manual) continue;
        const fade = it.minY > threshold, hide = it.minY > hideAbove;
        apply(it, fade, hide);
        if (fade) n++;
      }
      return n;
    },
    dispose() { for (const it of items) { if (it.on) it.m.material = it.solid; it.faded?.dispose(); } },
  };
}

// mergeSkinned — персонаж целиком → по одному SkinnedMesh на класс материала (обычно 2–3 вызова вместо 25–30).
// Кость = исходный меш (жёсткая привязка, вес 1). Исходные меши остаются в графе — их двигают шарниры и аниматор,
// их visible по-прежнему управляет видимостью (одежда, бейдж, полотенце): скрытая часть получает нулевую матрицу
// кости. Сами они больше не рисуются (материал-заглушка visible: false). skip(mesh) — оставить меш как есть
// (деформируемая ткань, прозрачное).
const SKIN_PROXY = new THREE.MeshBasicMaterial({ visible: false }); SKIN_PROXY.name = 'SkinProxy'; SKIN_PROXY.userData.shared = true;
const _zero = new THREE.Matrix4().makeScale(0, 0, 0), _off = new THREE.Matrix4();
export function mergeSkinned(group, { skip = null } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const classes = new Map(), parts = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.material === SKIN_PROXY) return;
    if (skip && skip(o)) return;
    if (o.morphTargetInfluences || o.userData.noMerge) return;
    let p = o.parent, keep = false; while (p && p !== group) { if (skip && skip(p)) { keep = true; break; } p = p.parent; }
    if (keep) return;
    const key = materialClass(o.material); if (key === null) return;
    if (!classes.has(key)) classes.set(key, { mat: o.material, items: [], cast: false });
    const c = classes.get(key); c.items.push(o); if (o.castShadow) c.cast = true;
    parts.push(o);
  });
  if (parts.length < 4) return { before: parts.length, after: parts.length };
  const bones = parts, index = new Map(bones.map((b, i) => [b, i]));
  const inverses = bones.map((b) => new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld).invert());
  const chains = bones.map((b) => { const a = []; let p = b; while (p && p !== group) { a.push(p); p = p.parent; } return a; });
  const skeleton = new THREE.Skeleton(bones, inverses);
  skeleton.update = function update() {
    const bm = this.boneMatrices;
    for (let i = 0; i < bones.length; i++) {
      let vis = true; const ch = chains[i];
      for (let k = 0; k < ch.length; k++) if (!ch[k].visible) { vis = false; break; }
      if (vis) _off.multiplyMatrices(bones[i].matrixWorld, this.boneInverses[i]); else _off.copy(_zero);
      _off.toArray(bm, i * 16);
    }
    if (this.boneTexture !== null) this.boneTexture.needsUpdate = true;
  };
  const out = [];
  for (const c of classes.values()) {
    const geos = [];
    for (const o of c.items) {
      const g = prepGeometry(o.geometry, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), o.material.color, !!o.material.vertexColors);
      const n = g.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), bi = index.get(o);
      for (let v = 0; v < n; v++) { si[v * 4] = bi; sw[v * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      geos.push(g);
    }
    const mg = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
    if (!mg) continue;
    const isOut = c.items.every((o) => isOutline(o));
    const sm = new THREE.SkinnedMesh(mg, mergedMaterial(c.mat));
    sm.name = 'SKIN_' + (isOut ? 'outline' : out.length); sm.frustumCulled = false; sm.castShadow = c.cast;
    sm.userData.skinMerged = true; if (isOut) { sm.userData.outline = true; sm.userData.humanOutline = true; }
    group.add(sm); sm.updateMatrixWorld(true);
    sm.bind(skeleton, sm.matrixWorld.clone());
    out.push(sm);
  }
  for (const o of parts) { o.userData.skinProxy = true; o.userData.srcMaterial = o.material; o.material = SKIN_PROXY; o.castShadow = false; }
  group.userData.skinned = { skeleton, meshes: out, parts: parts.length };
  return { before: parts.length, after: out.length };
}
