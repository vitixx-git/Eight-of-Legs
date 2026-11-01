// S06 «Воля» (2D, HP 12): защита 1,6–2,6 с (щит к пауку, укус в ±70° от щита отскакивает, сзади — урон) →
// подготовка 1,0 с (папка над головой, красный круг r 95 заполняется от центра) → удар (урон в круге) → открыт 2,0 с.
// Ниже 50 % — энрейдж: скорость ×1,3, подготовка 0,8 с, 2 ловушки-сетки за цикл (пунктир 0,8 с → сеть, макс 4, 8 с,
// касание — замедление 50 % на 1,5 с без урона).
import { CFG } from '../config.js';
import { createBattle, clampArena, angDiff } from './battleCore.js';
import { getSprites } from '../gfx2d/sprites.js';
import { blit, shadowBlob } from '../gfx2d/style.js';
import { stunStars } from '../gfx2d/fx.js';
const W = CFG.will, A = CFG.battle.arena, D = Math.PI / 180;
export function createWillAI(b) {
  const S = b.sim ? null : getSprites();
  const traps = [];
  const rnd = (a, c) => a + b.rng.next() * (c - a); // сидированный ГПСЧ боя
  const d = {
    name: 'will', x: A.cx, y: A.cy - A.ry * 0.4, hp: W.hp, maxHp: W.hp, radius: W.radius, hitY: 24, armored: true,
    state: 'defend', st: 0, dur: rnd(W.defendMin, W.defendMax), shield: Math.PI / 2, flash: 0, hurtT: 0, knockX: 0, knockY: 0,
    dead: false, deathT: 0, enraged: false, walkT: 0, face: 1, struck: false, traps, lastHitFrame: -1,
    set(s, dur = 0) { d.state = s; d.st = 0; d.dur = dur; },
    bitten({ angle }) {
      if (d.state === 'open' || d.state === 'strike') return 'hit';
      if (d.state === 'prep') return 'hit';
      const diff = Math.abs(angDiff(angle, d.shield));
      if (diff <= W.shieldArc * D) { b.play('WILL_FOLDER_FLAP'); return 'shield'; }
      return 'hit';
    },
    onHit() { b.play('WILL_GRUNT'); if (!d.enraged && d.hp / d.maxHp <= W.enrageAt) d.enrage(); },
    enrage() { d.enraged = true; b.play('WILL_ENRAGE'); },
    onDeath() { b.play('WILL_DEFEAT'); b.emit('paper', d.x, d.y - 30, 10); traps.length = 0; },
    update(dt) {
      d.flash = Math.max(0, d.flash - dt); d.hurtT = Math.max(0, d.hurtT - dt);
      const kd = Math.exp(-CFG.battle.knockDecay * dt); d.x += d.knockX * dt * 0.5; d.y += d.knockY * dt * 0.5; d.knockX *= kd; d.knockY *= kd;
      if (d.dead) { d.deathT += dt; return; }
      for (let i = traps.length - 1; i >= 0; i--) {
        const tp = traps[i]; tp.t += dt;
        if (tp.t >= W.trapTelegraph && !tp.armed) { tp.armed = true; b.play('WILL_TRAP_SNAP'); }
        if (tp.t >= W.trapTelegraph + W.trapLife) { traps.splice(i, 1); continue; }
        if (tp.armed && b.state === 'fight' && Math.hypot(b.spider.x - tp.x, b.spider.y - tp.y) < W.trapR + b.spider.radius * 0.5 && b.spider.slowT <= 0.05 && b.spider.dashT <= 0) {
          b.spider.slowT = W.trapSlowDur; b.play('BAT_SLOW'); b.emit('web', b.spider.x, b.spider.y, 5);
        }
      }
      if (b.state !== 'fight') return;
      const sp = b.spider; d.st += dt;
      const mul = d.enraged ? W.enrageMul : 1;
      const toSp = Math.atan2(sp.y - d.y, sp.x - d.x);
      if (d.state === 'defend') {
        d.shield += Math.max(-W.turnRate * mul * dt, Math.min(W.turnRate * mul * dt, angDiff(toSp, d.shield)));
        const dist = Math.hypot(sp.x - d.x, sp.y - d.y);
        if (dist > W.circleR * 0.55) { d.x += Math.cos(toSp) * W.speed * mul * dt; d.y += Math.sin(toSp) * W.speed * mul * dt; d.walkT += dt; }
        if (d.st >= d.dur) {
          d.set('prep', d.enraged ? W.prepEnrage : W.prep); d.struck = false; b.play('WILL_PREP');
          if (d.enraged) d.setTraps();
        }
      } else if (d.state === 'prep') {
        if (d.st >= d.dur) {
          d.set('strike', W.strike); b.play('WILL_STRIKE'); b.play('WILL_STOMP'); b.shake(CFG.battle.shake.big); b.emit('dust', d.x, d.y + 10, 12); b.emit('paper', d.x, d.y, 3);
          const inCircle = Math.hypot(sp.x - d.x, sp.y - d.y) <= W.circleR + sp.radius * 0.3;
          if (inCircle) b.hitSpider({ source: d, type: 'aoe', amount: W.damage, warned: d.enraged ? W.prepEnrage : W.prep, from: { x: d.x, y: d.y } });
        }
      } else if (d.state === 'strike') {
        if (d.st >= d.dur) { d.set('open', W.open); b.play('WILL_OPEN'); }
      } else if (d.state === 'open') {
        if (d.st >= d.dur) { d.set('defend', rnd(W.defendMin, W.defendMax)); b.play('WILL_SHIELD_UP'); }
      }
      clampArena(d, d.radius * 0.7);
      d.face = sp.x < d.x ? -1 : 1;
    },
    setTraps() {
      const sp = b.spider;
      for (let i = 0; i < W.trapPerCycle; i++) {
        if (traps.length >= W.trapMax) traps.shift();
        const a = b.rng.next() * Math.PI * 2, r = 40 + b.rng.next() * 90;
        const p = { x: sp.x + Math.cos(a) * r, y: sp.y + Math.sin(a) * r * 0.8, t: 0, armed: false };
        clampArena(p, W.trapR); traps.push(p);
      }
      b.play('WILL_TRAP_SET');
    },
    drawUnder(g) {
      const S2 = S;
      for (const tp of traps) {
        if (!tp.armed) { g.save(); g.strokeStyle = 'rgba(242,236,224,.85)'; g.lineWidth = 2; g.setLineDash([5, 5]); g.lineDashOffset = -tp.t * 30; g.beginPath(); g.arc(tp.x, tp.y, W.trapR * (0.6 + 0.4 * tp.t / W.trapTelegraph), 0, 7); g.stroke(); g.restore(); }
        else { const life = W.trapTelegraph + W.trapLife - tp.t; blit(g, S2.webNet, tp.x, tp.y, { sx: W.trapR / 34, sy: W.trapR / 34 * 0.8, alpha: Math.min(1, life) * 0.9 }); }
      }
      if (d.dead) return;
      if (d.state === 'prep' || d.state === 'strike') {
        const u = d.state === 'prep' ? d.st / d.dur : 1;
        g.save();
        g.fillStyle = 'rgba(217,60,80,.18)'; g.beginPath(); g.ellipse(d.x, d.y, W.circleR, W.circleR * 0.8, 0, 0, 7); g.fill();
        g.fillStyle = `rgba(217,60,80,${0.35 + 0.25 * u})`; g.beginPath(); g.ellipse(d.x, d.y, W.circleR * u, W.circleR * 0.8 * u, 0, 0, 7); g.fill();
        g.strokeStyle = '#ff6a7a'; g.lineWidth = 3; g.beginPath(); g.ellipse(d.x, d.y, W.circleR, W.circleR * 0.8, 0, 0, 7); g.stroke();
        if (d.state === 'strike') { g.strokeStyle = 'rgba(255,240,230,.8)'; g.lineWidth = 6; g.beginPath(); g.ellipse(d.x, d.y, W.circleR * (1 + d.st), W.circleR * 0.8 * (1 + d.st), 0, 0, 7); g.stroke(); }
        g.restore();
      }
      if (d.state === 'defend') { // зона щита ±70°
        g.save(); g.fillStyle = 'rgba(217,180,90,.16)'; g.strokeStyle = 'rgba(217,180,90,.55)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(d.x, d.y); g.arc(d.x, d.y, 52, d.shield - W.shieldArc * D, d.shield + W.shieldArc * D); g.closePath(); g.fill(); g.stroke(); g.restore();
      }
    },
    draw(g) {
      shadowBlob(g, d.x, d.y + 4, 26, 10, 0.4);
      if (d.dead) { const u = Math.min(1, d.deathT / CFG.battle.deathDur); blit(g, S.will_defeat, d.x, d.y + 8, { ay: 0.92, alpha: 1 - Math.max(0, u - 0.7) / 0.3 }); return; }
      const fr = Math.floor(d.walkT * 6) % 4;
      let spr = S.willWalk[fr], white = S.willWalkW[fr];
      if (d.state === 'prep') { spr = S.will_prep; white = S.will_prepW; }
      if (d.state === 'strike') { spr = S.will_strike; white = S.will_strikeW; }
      if (d.state === 'open') { spr = S.will_open; white = S.will_openW; }
      const sy = d.hurtT > 0 ? 1 - 0.1 * Math.sin(d.hurtT / 0.3 * Math.PI) : 1;
      const behind = d.state === 'defend' && Math.sin(d.shield) < -0.2;
      const drawFolder = () => { if (d.state !== 'defend') return; const fx = d.x + Math.cos(d.shield) * 24, fy = d.y - 22 + Math.sin(d.shield) * 16; blit(g, S.willFolder, fx, fy, { rot: d.shield - Math.PI / 2, sy: Math.max(0.35, Math.abs(Math.sin(d.shield)) * 0.6 + 0.4) }); };
      if (behind) drawFolder();
      blit(g, spr, d.x, d.y + 8, { ay: 0.92, sx: d.face * (2 - sy), sy });
      if (d.flash > 0 && !b.lessFx) blit(g, white, d.x, d.y + 8, { ay: 0.92, sx: d.face, alpha: d.flash / CFG.battle.flash * 0.8 });
      if (!behind) drawFolder();
      if (d.state === 'open') stunStars(g, d.x, d.y - 58, b.time, 3);
      if (d.enraged) { g.save(); g.globalAlpha = 0.35 + 0.2 * Math.sin(b.time * 8); g.strokeStyle = '#ff5a6e'; g.lineWidth = 2; g.beginPath(); g.ellipse(d.x, d.y + 2, 30, 12, 0, 0, 7); g.stroke(); g.restore(); }
    },
  };
  return d;
}
let ctx = null, battle = null;
const scene = {
  id: 'S06_Will', kind: '2d', series: 6, objectives: ['obj.s6.win'], checkpoints: ['start'],
  hints: [['W A S D', 'hint.move'], ['Пробел', 'hint.bite'], ['Shift', 'hint.dash']],
  async enter(c) {
    ctx = c; ctx.show3d(false);
    battle = createBattle(ctx, { bg: 'WILL', layer: 'will', nameKey: 'name.will', tip: 'tip.s6', halfKey: 'battle.enrage' });
    battle.lessFx = ctx.settings.lessFx;
    battle.setDefender(createWillAI(battle));
    ctx.audio.play('WILL_INTRO', { delay: 0.3 });
  },
  update(dt) { battle.update(dt); },
  render() { battle.render(ctx.g2d()); },
  debugWin() { battle.forceWin(); },
  debugInfo() { return battle?.debugInfo(); },
  exit() { battle?.dispose(); battle = null; ctx.clear2d(); },
};
export default scene;
