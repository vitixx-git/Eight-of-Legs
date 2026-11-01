// DEF_FEAR: мешковатый свитер до колен, рукава закрывают кисти, большие глаза, брови домиком, капля пота.
// Анимации: intro/hide/idle/tremble + атака scream (крик-волна).
import { createFear } from './fear.js';
import { withActions, swing, D } from './actions.js';
import { mergeSkinned } from '../three/merge.js';
export function createDefFear(opts = {}) {
  const m = createFear(opts);
  m.kind = 'DEF_FEAR';
  withActions(m, {
    scream: {
      dur: [0.4, 0.3, 0.4],
      apply(j, ph, u, { wind, strike }, model, t) {
        j.root.position.y -= 1.0 * wind;
        j.root.position.x += Math.sin(t * 70) * 0.25 * strike;
        swing(j.spine, 'x', (16 * wind - 20 * strike) * D);
        swing(j.head, 'x', (12 * wind - 24 * strike) * D);
        swing(j.jaw, 'x', 28 * strike * D);
        swing(j['shoulder.L'], 'z', (-12 * wind + 100 * strike) * D);
        swing(j['shoulder.R'], 'z', (12 * wind - 100 * strike) * D);
      },
    },
  }, () => m.joints);
  m.update = (dt) => { m.animator.update(dt); m.updateActions(dt); };
  m.idleName = 'idle'; m.attackName = 'scream';
  // ~45–73 меша → 2–4 SkinnedMesh (кость = исходный меш): шарниры, действия и видимость частей работают как раньше
  if (opts.merge !== false) m.skin = mergeSkinned(m.group);
  return m;
}
