// Единый WebGLRenderer на #gl. Логика 960×540, рендер в реальные пиксели (CSS-масштаб × pixelRatio качества).
import * as THREE from 'three';
import { CFG } from '../config.js';
import { disposeTree } from './toon.js';
export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
export function createRenderer(canvas, settings) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: true, powerPreference: 'high-performance' });
  } catch (e) { console.error('[renderer]', e); return null; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor('#0b0910', 1);
  renderer.info.autoReset = false;
  renderer.localClippingEnabled = true;
  let stageScale = 1;
  // Страховка от утечек (test.leaks): всё, что сцена отрисовала (сцены и render target'ы), освобождается
  // после её exit() — даже если сама сцена что-то забыла. Повторная отрисовка просто загрузит ресурсы заново.
  const rendered = new Set(), targets = new Set();
  const rawRender = renderer.render.bind(renderer), rawSetRT = renderer.setRenderTarget.bind(renderer);
  renderer.render = (scene, camera) => { if (scene?.isScene) rendered.add(scene); return rawRender(scene, camera); };
  renderer.setRenderTarget = (rt, ...rest) => { if (rt) targets.add(rt); return rawSetRT(rt, ...rest); };
  const api = {
    three: renderer, canvas,
    get quality() { return settings.quality; },
    applyQuality() {
      const q = CFG.quality[settings.quality] || CFG.quality.high;
      const dpr = window.devicePixelRatio || 1;
      const pr = settings.quality === 'high' ? Math.min(dpr, q.pixelRatio) : q.pixelRatio;
      renderer.setPixelRatio(Math.max(0.5, pr * stageScale));
      renderer.setSize(CFG.stage.w, CFG.stage.h, false);
      renderer.shadowMap.enabled = q.shadow > 0;
      api.shadowSize = q.shadow;
      api.version++;
    },
    version: 0, shadowSize: 1024,
    setStageScale(s) { stageScale = s; api.applyQuality(); },
    render(scene, camera) { renderer.render(scene, camera); },
    beginFrame() { renderer.info.reset(); },
    clear() { renderer.setClearColor('#0b0910', 1); renderer.clear(); },
    get info() { return renderer.info; },
    releaseScene() {
      rawSetRT(null);
      for (const sc of rendered) { try { disposeTree(sc, { detach: false }); } catch (e) { console.warn('[release]', e); } }
      for (const rt of targets) { try { rt.dispose(); } catch {} }
      rendered.clear(); targets.clear();
      renderer.renderLists.dispose();
    },
    dispose() { renderer.dispose(); },
  };
  api.applyQuality();
  return api;
}
