// Общая модель равновесия L (0–100) для S07, S08, S10 и окна «Кабина».
export function createBalance(cfg) {
  const b = {
    L: 0, bumpTimer: 0, fallen: false, stateName: 'ok', roll: 0, t: 0, gainMul: 1, warnTimer: 0,
    reset() { b.L = 0; b.bumpTimer = 0; b.fallen = false; b.stateName = 'ok'; b.roll = 0; b.gainMul = 1; },
    add(v) { if (b.fallen) return; b.L = Math.min(cfg.fall, b.L + v * b.gainMul); },
    // Столкновение: не чаще раза в bumpCd
    bump(v = cfg.bump) { if (b.bumpTimer > 0) return false; b.bumpTimer = cfg.bumpCd; b.add(v); return true; },
    cat() { b.add(cfg.cat); },
    // turnDeg — изменение курса за шаг (градусы), speedFrac — 0..1 от полной скорости
    update(dt, { moving = false, careful = false, turnDeg = 0, speedFrac = 0, puddle = false, carry = false, extra = 0 } = {}) {
      b.t += dt; b.bumpTimer = Math.max(0, b.bumpTimer - dt); b.warnTimer = Math.max(0, b.warnTimer - dt);
      b.gainMul = (puddle ? cfg.puddleMul : 1) * (carry ? cfg.carryMul : 1);
      if (b.fallen) return b.stateName;
      if (turnDeg > 0 && speedFrac > 0) b.add(cfg.turn * (Math.abs(turnDeg) / 180) * speedFrac);
      if (extra > 0) b.add(extra * dt);
      // падение проверяется по пику до затухания: add() ограничивает L сотней, и без этого L = 100
      // успевало бы «стечь» до 99,9 в том же шаге, и падения не было бы никогда
      const peak = b.L;
      const decay = !moving ? cfg.decayStand : careful ? cfg.decayCareful : cfg.decayWalk;
      if (extra <= 0) b.L = Math.max(0, b.L - decay * dt);
      const prev = b.stateName;
      b.stateName = peak >= cfg.fall ? 'fall' : b.L >= cfg.shaky ? 'shaky' : b.L >= cfg.wobble ? 'wobble' : 'ok';
      if (b.stateName === 'fall') b.fallen = true;
      const amp = b.stateName === 'shaky' ? cfg.rollShaky : b.stateName === 'wobble' ? cfg.rollWobble : 0;
      b.roll = amp * Math.sin(b.t * (b.stateName === 'shaky' ? 7.5 : 4.2));
      b.changed = prev !== b.stateName;
      return b.stateName;
    },
  };
  return b;
}
