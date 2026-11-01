// Слияние статики мозга (draw calls S03 ≈ 220 → ≤ 150). Сливаются только узлы, созданные декором
// (BRAIN_DECOR) и процедурным адаптером (BRAIN_PROCEDURAL_ADAPTER): извилины, нервы, нейроны, пол, купол,
// корпуса шкафов/котла/пульта, лампы-шнуры. Остаётся отдельным всё, что анимирует furnish.apply или сцена:
// светофоры (эмиссия), модемы (LED), ядро, книги, будильник, плафоны (setQuality скрывает), стрелки приборов,
// шторки, жидкость/пузыри котла, ящики шкафов, рычаги пульта, барьер; экраны и подписи (текстуры) не сливаются
// сами. Панель controlPanel (InstancedMesh, regenerate) лежит вне этих групп и не трогается.
import { mergeStaticVC } from '../three/merge.js';

const DYN_MODELS = new Set(['state_light', 'neuro_modem', 'mind_core', 'thought_book', 'wake_alarm', 'neuro_lamp']);
const DYN_NODE = /^(Needle|Curtain|CAULDRON_LIQUID|Liquid|Bubble\d+|SpiderDrawer|Lever\d+)$/;

export function optimizeBrain(brain, { keep = [] } = {}) {
  const mark = (o) => { if (o) o.userData.dynamic = true; };
  for (const o of brain.instances) {
    if (DYN_MODELS.has(o.userData.modelId)) mark(o);
    o.traverse((c) => { if (DYN_NODE.test(c.name)) mark(c); });
  }
  mark(brain.objects.CONSOLE_BARRIER);
  brain.objects.COCKPIT_PANEL?.traverse((c) => { if (DYN_NODE.test(c.name)) mark(c); });
  for (const n of keep) mark(brain.root.getObjectByName(n));
  const res = { meshes: 0, removed: 0 };
  for (const g of [brain.room.owned, brain.decor]) {
    const r = mergeStaticVC(g);
    res.meshes += r.meshes.length; res.removed += r.removed;
  }
  return res;
}
