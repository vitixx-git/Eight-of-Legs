// Ядро 2D-боёв S04–S06: паук (движение, укус windup→active→recover, рывок с неуязвимостью),
// единая система урона через события, i-frames, hitstop, knockback, частицы (пул), тряска (отключаемая), HUD.
// Событие урона: { source, target, type: 'melee'|'ranged'|'aoe'|'dot', amount, crit, effects: {slow, stun}, warned, frame }.
import { CFG, GRAPH } from '../config.js';
import { t } from '../text/ru.js';
import { createEvents } from '../core/events.js';
import { createRng } from '../core/rng.js';
import { getSprites } from '../gfx2d/sprites.js';
import { blit, shadowBlob, text, INK } from '../gfx2d/style.js';
import { createParticles } from '../gfx2d/fx.js';

const B = CFG.battle, SP = B.spider, A = B.arena, D = Math.PI / 180;
const BG = {};
function loadBg(name) {
  if (BG[name]) return BG[name];
  const img = new Image(); img.src = `assets/brain_baked/SPR_ARENA_BG_${name}_DRAFT.png`;
  BG[name] = img; return img;
}
// Процедурная арена (если PNG не загрузился): пол-эллипс, стены, панели.
function drawArenaFallback(g) {
  g.fillStyle = '#1a0d1c'; g.fillRect(0, 0, 960, 540);
  g.fillStyle = '#2b1424'; g.beginPath(); g.ellipse(A.cx, A.cy - 10, A.rx + 40, A.ry + 40, 0, 0, 7); g.fill();
  g.fillStyle = '#5a2340'; g.beginPath(); g.ellipse(A.cx, A.cy, A.rx + 8, A.ry + 8, 0, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
}
export const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
export function insideArena(x, y, pad = 0) { const dx = (x - A.cx) / (A.rx - pad), dy = (y - A.cy) / (A.ry - pad); return dx * dx + dy * dy <= 1; }
export function clampArena(p, pad = 0) {
  const dx = (p.x - A.cx) / (A.rx - pad), dy = (p.y - A.cy) / (A.ry - pad), d = Math.hypot(dx, dy);
  if (d > 1) { p.x = A.cx + dx / d * (A.rx - pad); p.y = A.cy + dy / d * (A.ry - pad); return true; }
  return false;
}

export function createBattle(ctx, opts) {
  const S = getSprites();
  const bus = createEvents();
  const settings = ctx.settings || {};
  const lessFx = () => !!settings.lessFx;
  const parts = createParticles(B.particles, { lessFx });
  const bg = opts.bg ? loadBg(opts.bg) : null;
  const inp = ctx.input;
  const audio = ctx.audio;
  const b = {
    bus, parts, rng: createRng(opts.seed ?? CFG.seed), time: 0, frame: 0, hitstop: 0, shakeT: 0, shakeAmp: 0, state: 'intro', stateT: 0, sim: !!opts.sim,
    defender: null, targets: [], hazards: [],
    stats: { violations: [], spiderHits: 0, iframeBlocks: 0, dashes: 0, defenderHits: 0, bites: 0 },
    spider: {
      x: A.cx, y: A.cy + A.ry * 0.55, vx: 0, vy: 0, face: -Math.PI / 2, hp: SP.hp, maxHp: SP.hp, radius: SP.radius,
      iframes: 0, dashT: 0, dashCd: 0, dashDir: 0, bite: { phase: 'none', t: 0, cd: 0, hitDone: false },
      flash: 0, hurtT: 0, knockX: 0, knockY: 0, slowT: 0, dead: false, deathT: 0, walkT: 0, trail: [], spawnT: 0, lastHitFrame: -1,
    },
    dispHp: 1, lagHp: 1,
  };
  const sp = b.spider;
  b.setDefender = (d) => { b.defender = d; b.targets = [d]; b.dispHp = 1; b.lagHp = 1; };
  b.play = (id, o) => { if (!b.sim) audio.play(id, o); };
  b.shake = (amp) => { if (b.sim || !settings.shake || !amp) return; b.shakeAmp = Math.max(b.shakeAmp, amp); b.shakeT = 0.35; };
  b.stop = (sec = B.hitstop) => { if (lessFx()) return; b.hitstop = Math.max(b.hitstop, sec); };
  b.emit = (type, x, y, n, o) => { if (!b.sim) parts.emit(type, x, y, n, o); };

  // ---------- урон по пауку ----------
  b.hitSpider = (ev) => {
    ev.frame = b.frame; ev.target = sp;
    if (sp.dead || b.state !== 'fight') return 'ignored';
    if ((ev.warned ?? 0) < B.minWarn - 1e-6) { b.stats.violations.push({ src: ev.source?.name, warned: ev.warned, t: b.time }); return 'rejected'; }
    if (sp.dashT > 0) return 'dodged';
    if (sp.iframes > 0) { b.stats.iframeBlocks++; return 'iframes'; }
    if (sp.lastHitFrame === b.frame) return 'double';
    if (ctx.debugState?.god && !b.sim) { b.emit('spark', sp.x, sp.y, 4); return 'god'; }
    sp.lastHitFrame = b.frame;
    sp.hp = Math.max(0, sp.hp - (ev.amount || 1));
    sp.iframes = B.iframes; sp.flash = B.flash; sp.hurtT = 0.25;
    const fx = ev.from ? ev.from.x : (ev.source?.x ?? sp.x), fy = ev.from ? ev.from.y : (ev.source?.y ?? sp.y + 1);
    const a = Math.atan2(sp.y - fy, sp.x - fx);
    sp.knockX = Math.cos(a) * B.knockback; sp.knockY = Math.sin(a) * B.knockback;
    if (ev.effects?.slow) sp.slowT = Math.max(sp.slowT, ev.effects.slow);
    b.stats.spiderHits++;
    b.stop();
    b.emit('web', sp.x, sp.y, 8); b.emit('heart', 40 + (sp.hp) * 26, 506, 6);
    b.play('SPD_HURT'); b.play('BAT_HIT_SPIDER'); b.play('BAT_HEART_LOST');
    bus.emit('damage', ev);
    if (sp.hp <= 0) b.killSpider();
    return 'hit';
  };
  b.killSpider = () => {
    sp.dead = true; sp.deathT = 0; b.state = 'defeat'; b.stateT = 0;
    b.play('SPD_DEATH'); b.shake(B.shake.death); b.emit('dust', sp.x, sp.y, 12); b.emit('web', sp.x, sp.y, 10);
    if (!b.sim) audio.stopMusic(0.6);
    bus.emit('spiderDeath', {});
  };
  // ---------- урон по защитнику ----------
  b.hitDefender = (target, ev = {}) => {
    if (!target || target.dead || b.state !== 'fight') return 'ignored';
    if (target.lastHitFrame === b.frame) return 'double';
    target.lastHitFrame = b.frame;
    const amount = ev.amount || 1;
    target.hp = Math.max(0, target.hp - amount);
    target.flash = B.flash; target.hurtT = 0.3;
    const a = Math.atan2(target.y - sp.y, target.x - sp.x);
    target.knockX = Math.cos(a) * B.knockback * 0.45; target.knockY = Math.sin(a) * B.knockback * 0.45;
    b.stats.defenderHits++;
    b.stop();
    b.emit('spark', target.x, target.y - 20, B.sparkCount, { dir: a, spread: 1.6 });
    b.emit('dust', target.x, target.y, 4);
    b.play('BAT_HIT_DEF'); b.play('SPD_BITE_HIT');
    bus.emit('damage', { source: sp, target, type: 'melee', amount, frame: b.frame });
    target.onHit?.(ev);
    if (!b.sim && target.maxHp && target.hp / target.maxHp <= 0.5 && !b.halfOn) { b.halfOn = true; audio.musicLayer('half', true); ctx.hud?.banner(t(opts.halfKey || 'battle.half'), 'warn', 1.4); }
    if (target.hp <= 0) {
      target.dead = true; target.deathT = 0; target.onDeath?.();
      b.play('BAT_DEATH_DEF'); b.shake(B.shake.death); b.stop(B.hitstop * 1.6);
      b.emit('puff', target.x, target.y - 20, 3); b.emit('star', target.x, target.y - 30, 6);
      if (target === b.defender) b.win();
    }
    return 'hit';
  };
  b.blocked = (target, kind = 'block') => {
    const a = Math.atan2(sp.y - target.y, sp.x - target.x);
    sp.knockX = Math.cos(a) * B.knockback * 0.5; sp.knockY = Math.sin(a) * B.knockback * 0.5;
    b.emit('spark', (sp.x + target.x) / 2, (sp.y + target.y) / 2 - 10, 6, { dir: a, spread: 1.2 });
    b.play('SPD_BITE_BLOCK'); b.play(kind === 'shield' ? 'BAT_SHIELD_HIT' : kind === 'armor' ? 'BAT_ARMOR_SPARK' : 'BAT_BLOCK');
    if (!b.sim && kind !== 'miss') ctx.hud?.toast(t('battle.block'), 0.6);
  };
  b.win = () => {
    if (b.state === 'victory') return;
    b.state = 'victory'; b.stateT = 0;
    if (!b.sim) {
      // Сразу фиксируем следующий бой: даже выход во время анимации победы не отнимает победу.
      const next = GRAPH.next[ctx.scenes?.currentId];
      if (next && ctx.save?.data) ctx.save.setPoint(next, 'start');
      audio.stopMusic(0.4); audio.play('ST_VICTORY'); ctx.hud.banner(t('battle.win'), 'good', 2); ctx.objectives.done(0);
    }
    bus.emit('victory', {});
  };
  b.forceWin = () => { if (b.state !== 'fight') { b.state = 'fight'; } const d = b.defender; d.hp = 1; d.lastHitFrame = -1; b.hitDefender(d, { amount: 99 }); };

  // ---------- управление пауком ----------
  function startBite() {
    sp.bite.phase = 'windup'; sp.bite.t = 0; sp.bite.cd = SP.biteCd; sp.bite.hitDone = false; b.stats.bites++;
    // мягкое автоприцеливание: ближайшая цель в радиусе укуса +20 и в ±60° от взгляда
    let best = null, bd = 1e9;
    for (const tg of b.targets) {
      if (!tg || tg.dead || tg.hidden) continue;
      const d = Math.hypot(tg.x - sp.x, tg.y - sp.y) - (tg.radius || 0);
      const ad = Math.abs(angDiff(Math.atan2(tg.y - sp.y, tg.x - sp.x), sp.face));
      if (d < SP.biteRange + 20 && ad < 60 * D && d < bd) { bd = d; best = tg; }
    }
    if (best) sp.face = Math.atan2(best.y - sp.y, best.x - sp.x);
    b.play('SPD_BITE');
  }
  function biteActive() {
    if (sp.bite.hitDone) return;
    for (const tg of b.targets) {
      if (!tg || tg.dead || tg.hidden) continue;
      const dx = tg.x - sp.x, dy = (tg.y - (tg.hitY || 0)) - sp.y, d = Math.hypot(dx, dy) - (tg.radius || 0);
      const ad = Math.abs(angDiff(Math.atan2(dy, dx), sp.face));
      if (d <= SP.biteRange - sp.radius * 0.3 && ad <= SP.biteArcDeg / 2 * D) {
        sp.bite.hitDone = true;
        const res = tg.bitten ? tg.bitten({ from: sp, angle: Math.atan2(sp.y - tg.y, sp.x - tg.x) }) : 'hit';
        if (res === 'hit') b.hitDefender(tg, { amount: 1, type: 'melee' });
        else if (res === 'pop') { /* копия развеяна */ }
        else if (res) b.blocked(tg, res);
        return;
      }
    }
  }
  function updateSpider(dt) {
    if (sp.dead) { sp.deathT += dt; return; }
    const ax = inp && b.state === 'fight' && !b.sim ? inp.axis() : (b.botAxis || { x: 0, y: 0 });
    const slow = sp.slowT > 0 ? CFG.will.trapSlow : 1;
    sp.slowT = Math.max(0, sp.slowT - dt);
    sp.iframes = Math.max(0, sp.iframes - dt); sp.flash = Math.max(0, sp.flash - dt); sp.hurtT = Math.max(0, sp.hurtT - dt);
    sp.dashCd = Math.max(0, sp.dashCd - dt); sp.bite.cd = Math.max(0, sp.bite.cd - dt);
    const fighting = b.state === 'fight';
    const wantDash = fighting && (b.sim ? b.botDash : inp.pressed('shift'));
    const wantBite = fighting && (b.sim ? b.botBite : inp.pressed('action'));
    if (wantDash && sp.dashCd <= 0 && sp.dashT <= 0) {
      sp.dashDir = (ax.x || ax.y) ? Math.atan2(ax.y, ax.x) : sp.face; sp.dashT = SP.dashDur; sp.dashCd = SP.dashCd; b.stats.dashes++;
      b.play('SPD_DASH'); b.emit('puff', sp.x, sp.y, 1); b.emit('dust', sp.x, sp.y, 4);
      if (sp.bite.phase !== 'none') sp.bite.phase = 'none';
    }
    if (wantBite && sp.bite.cd <= 0 && sp.dashT <= 0 && sp.bite.phase === 'none') startBite();
    if (sp.dashT > 0) {
      sp.dashT -= dt;
      sp.vx = Math.cos(sp.dashDir) * SP.dashSpeed; sp.vy = Math.sin(sp.dashDir) * SP.dashSpeed;
      sp.face = sp.dashDir;
      if (b.frame % 3 === 0) { sp.trail.push({ x: sp.x, y: sp.y, a: sp.face, life: 0.18 }); if (sp.trail.length > 3) sp.trail.shift(); }
    } else {
      const biting = sp.bite.phase !== 'none';
      const sMul = (biting ? 0.35 : 1) * slow;
      const tx = ax.x * SP.speed * sMul, ty = ax.y * SP.speed * sMul, k = Math.min(1, SP.accel * dt);
      sp.vx += (tx - sp.vx) * k; sp.vy += (ty - sp.vy) * k;
      if ((ax.x || ax.y) && !biting) { const want = Math.atan2(ax.y, ax.x); sp.face += angDiff(want, sp.face) * Math.min(1, dt * 16); }
    }
    for (const tr of sp.trail) tr.life -= dt;
    while (sp.trail.length && sp.trail[0].life <= 0) sp.trail.shift();
    // укус: windup → active → recover
    if (sp.bite.phase !== 'none') {
      sp.bite.t += dt;
      if (sp.bite.phase === 'windup' && sp.bite.t >= SP.biteWindup) { sp.bite.phase = 'active'; sp.bite.t = 0; }
      if (sp.bite.phase === 'active') { biteActive(); if (sp.bite.t >= SP.biteActive) { sp.bite.phase = 'recover'; sp.bite.t = 0; } }
      if (sp.bite.phase === 'recover' && sp.bite.t >= SP.biteRecover) { sp.bite.phase = 'none'; sp.bite.t = 0; }
    }
    // knockback
    const kd = Math.exp(-B.knockDecay * dt);
    sp.x += (sp.vx + sp.knockX) * dt; sp.y += (sp.vy + sp.knockY) * dt; sp.knockX *= kd; sp.knockY *= kd;
    if (clampArena(sp, sp.radius)) { sp.knockX *= 0.3; sp.knockY *= 0.3; }
    // столкновение с телом защитника — выталкивание без урона
    for (const tg of b.targets) {
      if (!tg || tg.dead || tg.hidden || tg.ghost) continue;
      const dx = sp.x - tg.x, dy = sp.y - tg.y, d = Math.hypot(dx, dy), min = sp.radius + (tg.radius || 0) * 0.8;
      if (d < min && d > 0.01) { sp.x = tg.x + dx / d * min; sp.y = tg.y + dy / d * min; }
    }
    const spd = Math.hypot(sp.vx, sp.vy);
    sp.walkT += dt * (spd / 40);
    if (spd > 30 && !b.sim && Math.floor(sp.walkT * 2) !== Math.floor((sp.walkT - dt * spd / 40) * 2)) audio.play('SPD_STEP_SOFT', { vol: 0.5 });
  }

  // ---------- цикл ----------
  b.update = (dt) => {
    b.frame++;
    if (b.hitstop > 0) { b.hitstop -= dt; parts.update(dt * 0.2); return; }
    b.time += dt; b.stateT += dt;
    if (b.shakeT > 0) b.shakeT -= dt;
    if (b.state === 'intro') {
      sp.spawnT += dt;
      if (b.stateT >= B.introDelay) { b.state = 'fight'; b.stateT = 0; if (!b.sim) { ctx.hud.banner(t('battle.fight'), '', 0.9); audio.play('BAT_START'); } }
    }
    updateSpider(dt);
    if (b.defender) b.defender.update(dt, b);
    for (let i = b.hazards.length - 1; i >= 0; i--) { const h = b.hazards[i]; if (h.update(dt, b) === false) b.hazards.splice(i, 1); }
    parts.update(dt);
    // HP-полоска с плавным «хвостом»
    const d = b.defender;
    if (d) { const tgt = d.hp / d.maxHp; b.dispHp += (tgt - b.dispHp) * Math.min(1, dt * 12); if (b.lagHp > b.dispHp) b.lagHp = Math.max(b.dispHp, b.lagHp - dt * 0.35); else b.lagHp = b.dispHp; }
    if (b.state === 'victory' && b.stateT >= B.victoryDelay && !b.done) { b.done = true; if (!b.sim) ctx.scenes.complete(); }
    if (b.state === 'defeat' && b.stateT >= B.deathDur + B.defeatAfter * 0.3 && !b.done) { b.done = true; if (!b.sim) ctx.scenes.fail('fail.battle', { tip: opts.tip }); }
  };

  // ---------- отрисовка ----------
  function drawSpider(g) {
    const s = sp;
    for (const tr of s.trail) blit(g, S.spiderWalk[0], tr.x, tr.y, { rot: tr.a + Math.PI / 2, alpha: tr.life / 0.18 * 0.45 });
    shadowBlob(g, s.x + 2, s.y + 4, 15, 9, 0.35);
    if (s.dead) {
      const u = Math.min(1, s.deathT / B.deathDur);
      blit(g, S.spiderDead, s.x, s.y, { rot: s.face + Math.PI / 2 + u * 2.5, sx: 1 - u * 0.3, sy: 1 - u * 0.3, alpha: 1 - Math.max(0, u - 0.6) / 0.4 });
      return;
    }
    let spr, white;
    if (s.bite.phase !== 'none') { const i = s.bite.phase === 'windup' ? 0 : s.bite.phase === 'active' ? 1 : 2; spr = S.spiderBite[i]; white = S.spiderBiteW[i]; }
    else { const i = Math.floor(s.walkT * 6) % 6; spr = S.spiderWalk[i]; white = S.spiderWalkW[i]; }
    const spawn = b.state === 'intro' ? Math.min(1, s.spawnT / 0.5) : 1;
    let alpha = spawn;
    if (s.iframes > 0 && s.flash <= 0) alpha *= lessFx() ? 0.65 : 0.55 + 0.35 * Math.cos(s.iframes * Math.PI * 2 * 5);
    const squash = s.hurtT > 0 ? 1 - 0.18 * Math.sin(s.hurtT / 0.25 * Math.PI) : 1;
    const rot = s.face + Math.PI / 2;
    blit(g, spr, s.x, s.y, { rot, sx: squash * spawn, sy: (2 - squash) * spawn, alpha });
    if (s.flash > 0 && !lessFx()) blit(g, white, s.x, s.y, { rot, alpha: s.flash / B.flash * 0.85 });
    if (s.bite.phase === 'active') blit(g, S.biteArc, s.x + Math.cos(s.face) * 18, s.y + Math.sin(s.face) * 18, { rot, alpha: 0.9 });
    if (s.slowT > 0) { g.strokeStyle = 'rgba(242,236,224,.7)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { const a = i * 1.57 + b.time; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + Math.cos(a) * 18, s.y + Math.sin(a) * 18); g.stroke(); } }
  }
  function drawHud(g) {
    // сердечки паука
    text(g, t('hp.spider'), 14, 492, { size: 13, align: 'left' });
    for (let i = 0; i < sp.maxHp; i++) blit(g, i < sp.hp ? S.heart : S.heartEmpty, 26 + i * 26, 514);
    // полоса защитника
    const d = b.defender; if (!d) return;
    const w = 280, x = 480 - w / 2, y = 26;
    text(g, t(opts.nameKey), 480, 14, { size: 15 });
    g.fillStyle = 'rgba(29,21,25,.8)'; g.fillRect(x - 3, y - 3, w + 6, 18);
    g.fillStyle = '#f2ece0'; g.fillRect(x, y, w * b.lagHp, 12);
    g.fillStyle = d.armored ? '#d9b45a' : '#d95a7a'; g.fillRect(x, y, w * b.dispHp, 12);
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x - 1.5, y - 1.5, w + 3, 15);
    for (let i = 1; i < d.maxHp; i++) { g.fillStyle = 'rgba(29,21,25,.45)'; g.fillRect(x + w * i / d.maxHp - 0.5, y, 1, 12); }
  }
  b.render = (g) => {
    g.save();
    if (b.shakeT > 0 && settings.shake) { const k = b.shakeAmp * (b.shakeT / 0.35); g.translate((Math.random() - 0.5) * k * 2, (Math.random() - 0.5) * k * 2); }
    if (bg && bg.complete && bg.naturalWidth) g.drawImage(bg, 0, 0, 960, 540); else drawArenaFallback(g);
    for (const h of b.hazards) h.drawUnder?.(g, b);
    b.defender?.drawUnder?.(g, b);
    // сортировка по y: паук и цели
    const list = [{ y: sp.y, draw: () => drawSpider(g) }];
    for (const tg of b.targets) if (tg && tg.draw) list.push({ y: tg.y, draw: () => tg.draw(g, b) });
    list.sort((p, q) => p.y - q.y).forEach((o) => o.draw());
    for (const h of b.hazards) h.draw?.(g, b);
    b.defender?.drawOver?.(g, b);
    parts.draw(g);
    if (ctx.debugState?.colliders) {
      g.strokeStyle = '#7fd18b'; g.lineWidth = 1; g.beginPath(); g.ellipse(A.cx, A.cy, A.rx, A.ry, 0, 0, 7); g.stroke();
      g.beginPath(); g.arc(sp.x, sp.y, sp.radius, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(sp.x, sp.y); g.arc(sp.x, sp.y, SP.biteRange, sp.face - SP.biteArcDeg / 2 * D, sp.face + SP.biteArcDeg / 2 * D); g.closePath(); g.stroke();
      for (const tg of b.targets) if (tg && !tg.dead) { g.strokeStyle = '#d95a7a'; g.beginPath(); g.arc(tg.x, tg.y, tg.radius, 0, 7); g.stroke(); }
    }
    g.restore();
    drawHud(g);
  };
  b.debugInfo = () => `Паук HP ${sp.hp}/${sp.maxHp} · i-frames ${sp.iframes.toFixed(2)} · частиц ${parts.count}/${parts.capacity} · защитник HP ${b.defender?.hp ?? '-'} · ${b.defender?.state || ''}`;
  b.dispose = () => { parts.clear(); bus.clear?.(); b.hazards.length = 0; b.targets.length = 0; };
  // старт
  if (!b.sim) {
    audio.setReverb('brain'); audio.music('M_BATTLE', { layers: [opts.layer] }); audio.ambience('AMB_BRAIN');
    ctx.hud.banner(t('battle.ready'), '', B.introDelay);
    audio.play('SPD_SPAWN');
  }
  return b;
}
