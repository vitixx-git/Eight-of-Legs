// Зеркало (S08): стекло рисуется последним среди непрозрачных и пишет 1 в трафарет там, где оно реально видно
// (человек и кошка перед зеркалом его закрывают). Затем очищается глубина и рисуется «зазеркалье» — отдельная сцена
// с двойником человека (второй экземпляр с зеркальной матрицей, копия поз всех шарниров) и фоном-комнатой —
// только там, где трафарет = 1. Цена — +1 проход на ~30 вызовов, и только пока зеркало в кадре и рядом человек.
import * as THREE from 'three';

const STENCIL_TEST = { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp };
export function stencilize(root, owned) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    const m = src.clone(); Object.assign(m, STENCIL_TEST); m.userData = { mirrorClone: true };
    owned.push(m); o.material = m;
  });
}
export function createMirror(ctx, { width = 40, height = 150, tint = '#b9d4d9', room = { wall: '#e6d0ae', floor: '#a8784e', w: 420, h: 260, d: 360 }, floorY = 0 } = {}) {
  const owned = [];
  const group = new THREE.Group(); group.name = 'MIRROR';
  const glassMat = new THREE.MeshBasicMaterial({ color: '#2b3a44', stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  owned.push(glassMat);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glassMat);
  glass.name = 'MirrorGlass'; glass.renderOrder = 900; group.add(glass);
  // «зазеркалье»
  const mscene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight('#ffe9c4', '#4a3a52', 1.5), dir = new THREE.DirectionalLight('#ffcf8a', 1.6);
  dir.position.set(-300, 800, -500); mscene.add(hemi, dir, dir.target);
  const back = new THREE.Group(); back.matrixAutoUpdate = false; mscene.add(back);
  // фон: «отражённая комната» — коробка изнутри, тон стен и пола, полоса окна
  const R = room;
  const roomBox = new THREE.Mesh(new THREE.BoxGeometry(R.w, R.h, R.d), new THREE.MeshToonMaterial({ color: R.wall, side: THREE.BackSide }));
  roomBox.position.set(0, R.h / 2 - floorY, -R.d / 2 + 2); back.add(roomBox);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(R.w, R.d), new THREE.MeshToonMaterial({ color: R.floor }));
  fl.rotation.x = -Math.PI / 2; fl.position.set(0, -floorY + 0.5, -R.d / 2 + 2); back.add(fl);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(110, 120), new THREE.MeshBasicMaterial({ color: '#fff3d6' }));
  win.position.set(-60, 160 - floorY, -R.d + 4); back.add(win);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.18, depthWrite: false }));
  sheen.renderOrder = 10; mscene.add(sheen);
  for (const o of [roomBox, fl, win, sheen]) { owned.push(o.material, o.geometry); Object.assign(o.material, STENCIL_TEST); }
  let twin = null, src = null, twinOwned = [], active = false;
  const M = new THREE.Matrix4(), S = new THREE.Matrix4().makeScale(1, 1, -1), G = new THREE.Matrix4(), Gi = new THREE.Matrix4();
  const tmpV = new THREE.Vector3(), tmpN = new THREE.Vector3();
  const api = {
    group, glass, scene: mscene,
    // twinModel — второй экземпляр той же модели (makeHuman), srcModel — оригинал
    setTwin(twinModel, srcModel) {
      twin = twinModel; src = srcModel;
      twin.group.matrixAutoUpdate = false; mscene.add(twin.group);
      stencilize(twin.group, twinOwned);
      // общая геометрия деформируемой полы халата — двойник повторяет и её
      const a = src.group.getObjectByName('CoatSkirt'), b = twin.group.getObjectByName('CoatSkirt');
      if (a && b) { b.geometry.dispose(); b.geometry = a.geometry; b.userData.sharedGeometry = true; }
    },
    get active() { return active; },
    set active(v) { active = v; },
    update(camera) {
      if (!twin) return;
      group.updateMatrixWorld(true);
      G.copy(glass.matrixWorld); Gi.copy(G).invert();
      M.multiplyMatrices(G, S).multiply(Gi);
      back.matrix.copy(G); back.matrixWorldNeedsUpdate = true;
      sheen.matrixAutoUpdate = false; sheen.matrix.copy(G); sheen.matrixWorldNeedsUpdate = true;
      src.group.updateMatrixWorld(true);
      twin.group.matrix.multiplyMatrices(M, src.group.matrixWorld); twin.group.matrixWorldNeedsUpdate = true;
      for (const [k, j] of Object.entries(src.joints)) { const t = twin.joints[k]; if (!t) continue; t.position.copy(j.position); t.quaternion.copy(j.quaternion); t.scale.copy(j.scale); }
      const tw = twin.group.getObjectByName('FaceTowel'), sw = src.group.getObjectByName('FaceTowel'); if (tw && sw) tw.visible = sw.visible;
      // стекло видно спереди?
      glass.getWorldPosition(tmpV); tmpN.set(0, 0, 1).transformDirection(glass.matrixWorld);
      const facing = tmpV.sub(camera.position).dot(tmpN) < 0;
      api.visible = facing;
    },
    render(camera) {
      if (!active || !api.visible || !twin) return;
      const r = ctx.renderer.three, ac = r.autoClear;
      r.autoClear = false; r.clearDepth(); r.render(mscene, camera); r.autoClear = ac;
    },
    dispose() {
      if (twin) { twin.group.removeFromParent(); twin.group.traverse((o) => { if (o.isMesh && !o.userData.sharedGeometry) o.geometry.dispose(); }); }
      for (const m of twinOwned) m.dispose();
      for (const o of owned) o.dispose?.();
      glass.geometry.dispose(); sheen.geometry.dispose();
      group.removeFromParent();
    },
  };
  return api;
}
