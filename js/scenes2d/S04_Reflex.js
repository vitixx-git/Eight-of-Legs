// S04 «Рефлекс» (2D, HP 10): подход 0,9 с → предупреждение 0,8 с (стрелка-коридор 34, мигание 6 Гц, свист) →
// рывок 560 px/с по прямой → оглушение 1,5 с (укусы проходят). Вне оглушения укус отскакивает с искрой.
// Ниже 50 % — двойной рывок, второе предупреждение 0,5 с.
import { CFG } from '../config.js';
import { createBattle, clampArena, insideArena } from './battleCore.js';
import { getSprites } from '../gfx2d/sprites.js';
import { blit, shadowBlob } from '../gfx2d/style.js';
import { stunStars } from '../gfx2d/fx.js';
const R = CFG.reflex, A = CFG.battle.arena;
export function createReflexAI(b) {
  const S = b.sim ? null : getSprites();
  const d = {
    name: 'reflex', x: A.cx, y: A.cy - A.ry * 0.45, hp: R.hp, maxHp: R.hp, radius: R.radius, hitY: 22,
    state: 'approach', st: 0, dir: 0, dashLeft: 0, dashCount: 0, hitThisDash: false, flash: 0, hurtT: 0, knockX: 0, knockY: 0, dead: false, deathT: 0, face: 1, walkT: 0, warnDur: R.warn, lastHitFrame: -1,
    set(s) { d.state = s; d.st = 0; },
    bitten() { if (d.state === 'stun') return 'hit'; b.play('REF_HAMMER'); return 'armor'; },
    onHit() { b.play('REF_TAUNT', { delay: 0.25 }); },
    onDeath() { b.play('REF_DEFLATE'); },
    update(dt) {
      d.flash = Math.max(0, d.flash - dt); d.hurtT = Math.max(0, d.hurtT - dt);
      const kd = Math.exp(-CFG.battle.knockDecay * dt); d.x += d.knockX * dt; d.y += d.knockY * dt; d.knockX *= kd; d.knockY *= kd;
      if (d.dead) { d.deathT += dt; return; }
      if (b.state !== 'fight') return;
      const sp = b.spider; d.st += dt;
      const half = d.hp / d.maxHp <= 0.5;
      if (d.state === 'approach') {
        const a = Math.atan2(sp.y - d.y, sp.x - d.x); d.x += Math.cos(a) * R.walk * dt; d.y += Math.sin(a) * R.walk * dt; d.walkT += dt;
        if (d.st >= R.approach) { d.dashCount = half ? 2 : 1; d.startWarn(R.warn); }
      } else if (d.state === 'warn') {
        if (d.st >= d.warnDur) { d.set('dash'); d.hitThisDash = false; b.play('REF_DASH'); }
      } else if (d.state === 'dash') {
        const sx = Math.cos(d.dir) * R.dashSpeed * dt, sy = Math.sin(d.dir) * R.dashSpeed * dt;
        d.x += sx; d.y += sy;
        if (!b.sim && Math.random() < 0.5) b.emit('dust', d.x, d.y + 18, 1);
        if (!d.hitThisDash && Math.hypot(sp.x - d.x, sp.y - d.y) < sp.radius + d.radius * 0.85) {
          const r = b.hitSpider({ source: d, type: 'melee', amount: R.damage, warned: d.warnDur, from: { x: d.x - Math.cos(d.dir) * 30, y: d.y - Math.sin(d.dir) * 30 } });
          if (r === 'hit' || r === 'god') d.hitThisDash = true;
        }
        const wall = clampArena(d, d.radius * 0.6);
        if (wall || d.st >= R.dashMax) {
          b.play('REF_IMPACT_WALL'); b.shake(CFG.battle.shake.big * 0.6); b.emit('dust', d.x, d.y, 8); b.emit('spark', d.x, d.y - 10, 5);
          d.dashCount--;
          if (d.dashCount > 0) d.startWarn(R.warnHalf);
          else { d.set('stun'); b.play('REF_STUN'); if (!b.sim) b.parts.emit('star', d.x, d.y - 46, 3); }
        }
      } else if (d.state === 'stun') {
        if (d.st >= R.stun) d.set('recover');
      } else if (d.state === 'recover') {
        if (d.st >= R.recover) d.set('approach');
      }
      clampArena(d, d.radius * 0.6);
      d.face = sp.x < d.x ? -1 : 1;
    },
    startWarn(dur) {
      const sp = b.spider; d.set('warn'); d.warnDur = dur;
      d.dir = Math.atan2(sp.y - d.y, sp.x - d.x);
      b.play(dur < R.warn ? 'REF_WARN_SHORT' : 'REF_WARN_WHISTLE');
      if (!b.sim) b.parts.emit('puff', d.x, d.y - 20, 1);
    },
    drawUnder(g) {
      if (d.state !== 'warn' || d.dead) return;
      // стрелка-коридор шириной 34 до края арены, мигание 6 Гц, нарастание
      const u = d.st / d.warnDur, on = Math.floor(d.st * R.blinkHz * 2) % 2 === 0;
      let len = 0; const step = 8; while (len < 900 && insideArena(d.x + Math.cos(d.dir) * (len + step), d.y + Math.sin(d.dir) * (len + step), 4)) len += step;
      g.save(); g.translate(d.x, d.y); g.rotate(d.dir);
      g.fillStyle = on ? `rgba(255,90,110,${0.25 + 0.35 * u})` : `rgba(255,200,120,${0.12 + 0.2 * u})`;
      g.fillRect(0, -R.corridor / 2, len, R.corridor);
      g.strokeStyle = on ? 'rgba(255,240,230,.9)' : 'rgba(255,240,230,.4)'; g.lineWidth = 2; g.setLineDash([10, 8]); g.lineDashOffset = -d.st * 120;
      g.strokeRect(0, -R.corridor / 2, len, R.corridor); g.setLineDash([]);
      g.fillStyle = on ? '#ff5a6e' : '#ffd08a'; g.beginPath(); g.moveTo(len, 0); g.lineTo(len - 26, -R.corridor * 0.8); g.lineTo(len - 26, R.corridor * 0.8); g.closePath(); g.fill();
      g.restore();
    },
    draw(g) {
      const k = b.time;
      shadowBlob(g, d.x, d.y + 4, 22, 9, 0.4);
      let spr = S.reflexWalk[Math.floor(d.walkT * 8) % 4], white = S.reflexWalkW[Math.floor(d.walkT * 8) % 4], rot = 0, sy = 1;
      if (d.dead) { const u = Math.min(1, d.deathT / CFG.battle.deathDur); blit(g, S.reflexDeflate, d.x, d.y + 6, { ay: 0.92, sx: d.face, alpha: 1 - Math.max(0, u - 0.7) / 0.3 }); return; }
      if (d.state === 'warn') { spr = S.reflexCrouch; white = S.reflexCrouchW; }
      if (d.state === 'dash') { spr = S.reflexDash; white = S.reflexDashW; rot = Math.cos(d.dir) >= 0 ? 0.35 : -0.35; }
      if (d.state === 'stun') { spr = S.reflexStun; white = S.reflexStunW; }
      if (d.hurtT > 0) sy = 1 - 0.12 * Math.sin(d.hurtT / 0.3 * Math.PI);
      const shake = d.state === 'warn' ? Math.sin(k * 60) * 1.2 : 0;
      blit(g, spr, d.x + shake, d.y + 6, { ay: 0.92, sx: d.face * (2 - sy), sy, rot });
      if (d.flash > 0 && !b.lessFx) blit(g, white, d.x, d.y + 6, { ay: 0.92, sx: d.face, rot, alpha: d.flash / CFG.battle.flash * 0.8 });
      if (d.state === 'stun') stunStars(g, d.x, d.y - 44, k, 3);
    },
  };
  return d;
}
let ctx = null, battle = null;
const scene = {
  id: 'S04_Reflex', kind: '2d', series: 4, objectives: ['obj.s4.win'], checkpoints: ['start'],
  hints: [['W A S D', 'hint.move'], ['Пробел', 'hint.bite'], ['Shift', 'hint.dash']],
  async enter(c) {
    ctx = c; ctx.show3d(false);
    battle = createBattle(ctx, { bg: 'REFLEX', layer: 'reflex', nameKey: 'name.reflex', tip: 'tip.s4' });
    battle.lessFx = ctx.settings.lessFx;
    battle.setDefender(createReflexAI(battle));
    ctx.audio.play('REF_INTRO', { delay: 0.3 });
  },
  update(dt) { battle.update(dt); },
  render() { battle.render(ctx.g2d()); },
  debugWin() { battle.forceWin(); },
  debugInfo() { return battle?.debugInfo(); },
  exit() { battle?.dispose(); battle = null; ctx.clear2d(); },
};
export default scene;
