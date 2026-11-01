// DEF_REFLEX: упрощённый makeHuman (худой, спорткостюм с полосами, повязка, молоточек). Анимации: intro/idle + атака hammerDash.
import { createReflex } from './reflex.js';
import { withActions, swing, D } from './actions.js';
import { mergeSkinned } from '../three/merge.js';
export function createDefReflex(opts = {}) {
  const m = createReflex(opts);
  m.kind = 'DEF_REFLEX';
  withActions(m, {
    hammerDash: {
      dur: [0.35, 0.15, 0.35],
      apply(j, ph, u, { wind, strike }) {
        j.root.position.z += -1.0 * wind + 3.2 * strike;
        j.root.position.y -= 0.8 * wind;
        swing(j.spine, 'x', (18 * wind + 24 * strike) * D);
        swing(j['shoulder.R'], 'x', (150 * wind - 70 * strike) * D);
        swing(j['shoulder.L'], 'x', (-35 * wind + 40 * strike) * D);
        swing(j['hip.L'], 'x', (-30 * wind - 25 * strike) * D);
        swing(j['knee.L'], 'x', (45 * wind) * D);
      },
    },
  }, () => m.joints);
  m.update = (dt) => { m.animator.update(dt); m.updateActions(dt); };
  m.idleName = 'idle'; m.attackName = 'hammerDash';
  // ~45–73 меша → 2–4 SkinnedMesh (кость = исходный меш): шарниры, действия и видимость частей работают как раньше
  if (opts.merge !== false) m.skin = mergeSkinned(m.group);
  return m;
}
