// SCIENTIST: makeHuman (178 см, шарниры root→spine→chest→neck→head, веки, челюсть; одежда pajama/work, бейдж).
// Атака swat — шлепок рукой (сонный учёный в S02); работает и лёжа (toss.*), и стоя.
import { makeHuman } from './human.js';
import { withActions, swing, D } from './actions.js';
export function createScientist(opts = {}) { return makeHuman({ name: 'SCIENTIST', ...opts }); }
export function createScientistActor(opts = {}) {
  const m = createScientist(opts);
  m.kind = 'SCIENTIST';
  withActions(m, {
    swat: {
      dur: [0.5, 0.12, 0.5],
      apply(j, ph, u, { wind, strike }) {
        swing(j['shoulder.L'], 'x', (140 * wind - 70 * strike) * D);
        swing(j['shoulder.L'], 'z', (35 * wind + 10 * strike) * D);
        swing(j['elbow.L'], 'x', (-40 * wind) * D);
        swing(j.chest, 'y', (-10 * wind + 12 * strike) * D);
      },
    },
  }, () => m.joints);
  m.update = (dt, speed = 0) => { m.animator.update(dt, speed); m.updateActions(dt); };
  m.idleName = 'idle'; m.attackName = 'swat';
  return m;
}
