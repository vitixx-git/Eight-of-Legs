// DEF_WILL: коренастый, халат, брюки, очки и причёска как у SCIENTIST, щит-папка «ДЕЛО №1».
// Анимации: intro/idle/talk + атака slam (удар щитом сверху).
import { createWill } from './will.js';
import { withActions, swing, D } from './actions.js';
import { mergeSkinned } from '../three/merge.js';
export function createDefWill(opts = {}) {
  const m = createWill(opts);
  m.kind = 'DEF_WILL';
  withActions(m, {
    slam: {
      dur: [0.45, 0.12, 0.45],
      apply(j, ph, u, { wind, strike }) {
        j.root.position.y += 0.5 * wind - 1.2 * strike;
        j.root.position.z += 1.5 * strike;
        swing(j.spine, 'x', (-10 * wind + 25 * strike) * D);
        swing(j['shoulder.L'], 'x', (160 * wind - 40 * strike) * D);
        swing(j['shoulder.R'], 'x', (150 * wind - 40 * strike) * D);
        swing(j['knee.L'], 'x', 30 * strike * D); swing(j['knee.R'], 'x', 30 * strike * D);
        swing(j['hip.L'], 'x', -30 * strike * D); swing(j['hip.R'], 'x', -30 * strike * D);
      },
    },
  }, () => m.joints);
  m.update = (dt) => { m.animator.update(dt); m.updateActions(dt); };
  m.idleName = 'idle'; m.attackName = 'slam';
  // ~45–73 меша → 2–4 SkinnedMesh (кость = исходный меш): шарниры, действия и видимость частей работают как раньше
  if (opts.merge !== false) m.skin = mergeSkinned(m.group);
  return m;
}
