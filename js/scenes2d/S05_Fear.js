// S05 «Страх» (2D, HP 8): кольца каждые 2,2 с (150 px/с, толщина 18, три разрыва по 62° видны с появления засечками),
// ≤ 3 колец, ориентации соседних колец расходятся ≤ 120°. Страх отходит 50 px/с и дрожит. Каждый 3-й цикл — 3 фигуры по
// треугольнику (настоящий — мерцающий белый контур и капля пота; укус копии её развеивает). После попадания —
// телепорт на противоположную сторону (FEAR_BLINK): за подход один укус.
import { CFG } from '../config.js';
import { createBattle, clampArena, angDiff } from './battleCore.js';
import { getSprites } from '../gfx2d/sprites.js';
import { blit, shadowBlob } from '../gfx2d/style.js';
const F = CFG.fear, A = CFG.battle.arena, D = Math.PI / 180;
const WINDUP = 0.5; // вдох перед кольцом (телеграф ≥ 0,4 с)
// Одна геометрия проходов для картинки и коллизий; углы идут по окружности без скачка на ±π.
export function fearRingGaps(base, count = F.gapCount) {
  const n = Math.max(1, Math.min(5, Math.trunc(count) || 1));
  return Array.from({ length: n }, (_, i) => base + i * Math.PI * 2 / n);
}
export function fearRingArcs(ring) {
  const gaps = ring.gaps || [ring.gap], half = F.gapDeg * D / 2;
  return gaps.map((gap, i) => ({ from: gap + half, to: (gaps[i + 1] ?? gaps[0] + Math.PI * 2) - half }));
}
export function isFearRingGap(ring, angle, spiderRadius, distance) {
  const half = F.gapDeg * D / 2 - Math.atan2(spiderRadius * 0.4, Math.max(1, distance));
  return (ring.gaps || [ring.gap]).some(gap => Math.abs(angDiff(angle, gap)) < half);
}

export function createFearAI(b) {
  const S = b.sim ? null : getSprites();
  const R = () => b.rng.next(); // сидированный ГПСЧ боя (честность атак)
  let lastGap = R() * Math.PI * 2, cycle = 0;
  const rings = [];
  const clones = [];
  const d = {
    name: 'fear', x: A.cx, y: A.cy - A.ry * 0.4, hp: F.hp, maxHp: F.hp, radius: F.radius, hitY: 22,
    state: 'idle', st: 0, ringT: F.ringFirstDelay, windT: -1, flash: 0, hurtT: 0, knockX: 0, knockY: 0, dead: false, deathT: 0,
    tele: 0, teleTo: null, hidden: false, rings, clones, lastHitFrame: -1, face: 1, breath: 0,
    bitten() { if (d.tele > 0) return 'miss'; return 'hit'; },
    onHit() {
      b.play('FEAR_WHIMPER');
      // телепорт на противоположную сторону арены относительно паука
      const sp = b.spider; const tx = A.cx - (sp.x - A.cx) * 0.9, ty = A.cy - (sp.y - A.cy) * 0.9;
      d.teleTo = { x: tx, y: ty }; clampArena(d.teleTo, d.radius * 1.5); d.tele = F.teleportDur;
      for (const c of clones) c.life = Math.min(c.life, 0.3);
      b.play('FEAR_BLINK', { delay: 0.1 });
    },
    onDeath() { b.play('FEAR_FAINT'); rings.length = 0; for (const c of clones) c.life = 0; },
    update(dt) {
      d.flash = Math.max(0, d.flash - dt); d.hurtT = Math.max(0, d.hurtT - dt); d.breath += dt;
      const kd = Math.exp(-CFG.battle.knockDecay * dt); d.x += d.knockX * dt; d.y += d.knockY * dt; d.knockX *= kd; d.knockY *= kd;
      if (d.dead) { d.deathT += dt; return; }
      if (b.state !== 'fight') return;
      const sp = b.spider;
      // телепорт
      if (d.tele > 0) {
        const before = d.tele; d.tele -= dt;
        if (before > F.teleportDur / 2 && d.tele <= F.teleportDur / 2 && d.teleTo) { d.x = d.teleTo.x; d.y = d.teleTo.y; b.emit('puff', d.x, d.y - 20, 2); }
        d.hidden = d.tele > F.teleportDur * 0.25 && d.tele < F.teleportDur * 0.75;
        if (d.tele <= 0) { d.hidden = false; d.teleTo = null; }
      }
      // отход от паука
      const a = Math.atan2(d.y - sp.y, d.x - sp.x), dist = Math.hypot(d.x - sp.x, d.y - sp.y);
      if (dist < 260 && d.tele <= 0) { d.x += Math.cos(a) * F.retreat * dt; d.y += Math.sin(a) * F.retreat * dt; }
      clampArena(d, d.radius * 1.4);
      d.face = sp.x < d.x ? -1 : 1;
      // кольца: вдох (телеграф) → выпуск
      d.ringT -= dt;
      if (d.ringT <= 0 && d.windT < 0 && rings.length < F.maxRings && d.tele <= 0) { d.windT = 0; b.play('FEAR_TREMBLE'); }
      if (d.windT >= 0) {
        d.windT += dt;
        if (d.windT >= WINDUP) {
          d.windT = -1; d.ringT = F.ringEvery - WINDUP; cycle++;
          const spread = (R() * 2 - 1) * F.gapSpreadMax * D;
          lastGap = lastGap + spread;
          rings.push({ x: d.x, y: d.y, r: d.radius, gap: lastGap, gaps: fearRingGaps(lastGap), born: b.time, hit: false, warned: WINDUP });
          b.play('FEAR_RING');
          if (cycle % F.cloneEvery === 0) d.spawnClones();
        }
      }
      // движение колец, урон при касании вне разрыва
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.r += F.ringSpeed * dt; r.warned += dt;
        if (r.r > F.ringMaxR) { rings.splice(i, 1); continue; }
        if (r.hit) continue;
        const ds = Math.hypot(sp.x - r.x, sp.y - r.y);
        if (Math.abs(ds - r.r) < F.ringThick / 2 + sp.radius * 0.55) {
          const ang = Math.atan2(sp.y - r.y, sp.x - r.x);
          const inGap = isFearRingGap(r, ang, sp.radius, ds);
          if (!inGap) { const res = b.hitSpider({ source: d, type: 'aoe', amount: F.damage, warned: r.warned, from: { x: r.x, y: r.y } }); if (res === 'hit' || res === 'god') { r.hit = true; b.play('FEAR_RING_HIT'); } }
        }
      }
      for (let i = clones.length - 1; i >= 0; i--) { const c = clones[i]; c.life -= dt; c.breath += dt; if (c.life <= 0) { clones.splice(i, 1); const ti = b.targets.indexOf(c); if (ti >= 0) b.targets.splice(ti, 1); b.emit('puff', c.x, c.y - 20, 1); } }
    },
    spawnClones() {
      // настоящий и 2 копии — по треугольнику вокруг центра, r 150
      const base = R() * Math.PI * 2, realIdx = Math.floor(R() * 3) % 3;
      for (let i = 0; i < 3; i++) {
        const p = { x: A.cx + Math.cos(base + i * 2.094) * F.cloneRadius, y: A.cy + Math.sin(base + i * 2.094) * F.cloneRadius * 0.75 };
        if (i === realIdx) { d.x = p.x; d.y = p.y; b.emit('puff', p.x, p.y - 20, 1); continue; }
        const c = { name: 'fearClone', clone: true, ghost: true, x: p.x, y: p.y, radius: F.radius, hitY: 22, life: F.cloneLife, breath: Math.random(), dead: false, face: 1,
          bitten() { c.life = 0; b.play('FEAR_CLONE_POP'); b.emit('puff', c.x, c.y - 20, 2); b.emit('dust', c.x, c.y, 6); return 'pop'; },
          draw(g) { if (b.sim) return; const fr = Math.floor(c.breath * 2) % 2; shadowBlob(g, c.x, c.y + 4, 18, 8, 0.25); blit(g, S.fearCloneRaw[fr], c.x + Math.sin(b.time * 50 + 1) * F.trembleAmp, c.y + 6, { ay: 0.92, sx: c.face, alpha: Math.min(1, c.life * 3) * 0.95 }); } };
        clones.push(c); b.targets.push(c);
      }
      b.play('FEAR_CLONE');
    },
    drawUnder(g) {
      for (const r of rings) {
        const age = b.time - r.born, arcs = fearRingArcs(r);
        g.save(); g.lineCap = 'butt';
        g.strokeStyle = r.hit ? 'rgba(160,140,200,.45)' : 'rgba(150,190,255,.75)'; g.lineWidth = F.ringThick;
        for (const arc of arcs) { g.beginPath(); g.arc(r.x, r.y, r.r, arc.from, arc.to); g.stroke(); }
        g.strokeStyle = 'rgba(29,21,25,.8)'; g.lineWidth = 2;
        for (const rr of [r.r - F.ringThick / 2, r.r + F.ringThick / 2]) for (const arc of arcs) {
          g.beginPath(); g.arc(r.x, r.y, Math.max(1, rr), arc.from, arc.to); g.stroke();
        }
        // Белые засечки у обоих краёв каждого из трёх проходов.
        g.strokeStyle = '#ffffff'; g.lineWidth = 3;
        for (const arc of arcs) for (const ang of [arc.from, arc.to]) {
          const c = Math.cos(ang), s = Math.sin(ang); g.beginPath();
          g.moveTo(r.x + c * (r.r - F.ringThick * 0.8), r.y + s * (r.r - F.ringThick * 0.8));
          g.lineTo(r.x + c * (r.r + F.ringThick * 0.8), r.y + s * (r.r + F.ringThick * 0.8)); g.stroke();
        }
        // Вспышка только вдоль твёрдых дуг — никогда не закрашивает отверстия.
        if (age < 0.3) {
          g.globalAlpha = (1 - age / 0.3) * 0.35; g.strokeStyle = '#fff'; g.lineWidth = F.ringThick + 6;
          for (const arc of arcs) { g.beginPath(); g.arc(r.x, r.y, r.r, arc.from, arc.to); g.stroke(); }
        }
        g.restore();
      }
      if (d.windT >= 0 && !d.dead) { // вдох: сходящийся круг-предупреждение
        const u = d.windT / WINDUP; g.save(); g.strokeStyle = `rgba(150,190,255,${0.3 + 0.5 * u})`; g.lineWidth = 3; g.setLineDash([6, 6]);
        g.beginPath(); g.arc(d.x, d.y, d.radius + 60 * (1 - u), 0, 7); g.stroke(); g.restore();
      }
    },
    draw(g) {
      if (d.hidden) return;
      const tr = Math.sin(b.time * 50) * F.trembleAmp, fr = Math.floor(d.breath * 2) % 2;
      shadowBlob(g, d.x, d.y + 4, 18, 8, 0.4);
      if (d.dead) { const u = Math.min(1, d.deathT / CFG.battle.deathDur); blit(g, S.fearFaint, d.x, d.y + 6, { ay: 0.92, alpha: 1 - Math.max(0, u - 0.7) / 0.3 }); return; }
      const alpha = d.tele > 0 ? Math.abs(d.tele / F.teleportDur - 0.5) * 2 : 1;
      // мерцающий белый контур настоящего Страха
      if (!b.lessFx || clones.length) blit(g, S.fearGlow[fr], d.x + tr, d.y + 7, { ay: 0.92, sx: d.face * 1.12, sy: 1.08, alpha: (0.35 + 0.35 * Math.sin(b.time * 14)) * alpha });
      let spr = S.fearIdle[fr], white = S.fearIdleW[fr];
      if (d.windT >= 0) { spr = S.fearScream; white = S.fearScreamW; }
      if (d.hurtT > 0) { spr = S.fearHurt; white = S.fearHurtW; }
      blit(g, spr, d.x + tr, d.y + 6, { ay: 0.92, sx: d.face, alpha });
      if (d.flash > 0 && !b.lessFx) blit(g, white, d.x + tr, d.y + 6, { ay: 0.92, sx: d.face, alpha: d.flash / CFG.battle.flash * 0.8 });
    },
  };
  return d;
}
let ctx = null, battle = null;
const scene = {
  id: 'S05_Fear', kind: '2d', series: 5, objectives: ['obj.s5.win'], checkpoints: ['start'],
  hints: [['W A S D', 'hint.move'], ['Пробел', 'hint.bite'], ['Shift', 'hint.dash']],
  async enter(c) {
    ctx = c; ctx.show3d(false);
    battle = createBattle(ctx, { bg: 'FEAR', layer: 'fear', nameKey: 'name.fear', tip: 'tip.s5' });
    battle.lessFx = ctx.settings.lessFx;
    battle.setDefender(createFearAI(battle));
    ctx.audio.play('FEAR_INTRO', { delay: 0.3 });
  },
  update(dt) { battle.update(dt); },
  render() { battle.render(ctx.g2d()); },
  debugWin() { battle.forceWin(); },
  debugInfo() { return battle?.debugInfo(); },
  exit() { battle?.dispose(); battle = null; ctx.clear2d(); },
};
export default scene;
