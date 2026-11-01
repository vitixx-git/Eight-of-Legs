// Навигация человека по дому: этажи — объединение прямоугольников NAV (центр человека) минус мебель (AABB + радиус),
// лестница — режим (θ, r) с непрерывным θ: вход у нижней двери (θ≈0) или верхней (θ≈540), выход — наружу за r 120.
// Препятствия лестницы задаются в (θ, r): block — упор (+14), sock — скольжение один раз (+14), puddle — лужа.
// Подвижные круги (кошка) — nav.dyn [{id, x, y, z, r, kind}].
import { CFG } from '../config.js';
import { NAV, stairPos, stairTop, stairAngle, wrapDeg, CX, CZ, UP_Y } from '../env/house.js';

const ST = CFG.stairs, HU = CFG.human, R = HU.radius, D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createHouseNav(env, { obstacles = env.obstacles } = {}) {
  const obs = Object.values(obstacles || {});
  const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  const rectOf = (floor, x, z) => { for (const r of NAV[floor].rects) if (inRect(r, x, z)) return r; return null; };
  const boxOf = (floor, x, z) => { for (const b of env.boxes[floor]) if (!b.off && x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R) return b; return null; };
  const dynOf = (x, y, z) => { for (const d of nav.dyn) if (!d.off && Math.abs(d.y - y) < 70 && Math.hypot(x - d.x, z - d.z) < R + d.r) return d; return null; };
  // диапазоны (θ, r) из CFG — уже «запретная зона центра»; запас 6 см — только чтобы ступня не влезала в предмет
  // угловой запас — постоянный для препятствия (по среднему r): если бы он зависел от текущего r, у границы зоны
  // шаг внутрь по радиусу «расширял» зону и человек застревал в углу (баг S08: θ 312,5° r 76 у коробки)
  const PAD = 6, padOf = (r) => (PAD / Math.max(r, 30)) / D2R;
  const padTh = (o) => o._padTh ?? (o._padTh = padOf((o.r[0] + o.r[1]) / 2));
  const inObs = (o, th, r, pad = true) => { const p = pad ? padTh(o) : 0, pr = pad ? PAD : 0; return th > o.th[0] - p && th < o.th[1] + p && r > o.r[0] - pr && r < o.r[1] + pr; };
  const P = { x: 0, y: 0, z: 0 };
  const sp = (th, r) => { const a = th * D2R; P.x = CX - r * Math.cos(a); P.z = CZ + r * Math.sin(a); P.y = stairTop(th); return P; };

  function floorBlock(floor, x, z) {
    if (!rectOf(floor, x, z)) return { name: 'wall', kind: 'wall', bump: false };
    const b = boxOf(floor, x, z); if (b) return { name: b.name, kind: 'furniture', box: b, bump: b.bump, add: b.add };
    const d = dynOf(x, floor, z); if (d) return { name: d.id, kind: d.kind || 'dyn', dyn: d, bump: false };
    return null;
  }
  function stairBlock(th, r, y, x, z) {
    if (th < -8 || th > ST.sweep + 8) return { name: 'wall', kind: 'wall', bump: false };
    for (const o of obs) if (o.kind === 'block' && !o.off && inObs(o, th, r)) return { name: o.id, kind: 'obstacle', obs: o, add: o.add };
    const d = dynOf(x, y, z); if (d) return { name: d.id, kind: d.kind || 'dyn', dyn: d, bump: false };
    return null;
  }
  const normal = (dx, dz, hx, hz) => { // нормаль упора по тому, какая ось свободна
    if (!dx) return [0, -Math.sign(dz)]; if (!dz) return [-Math.sign(dx), 0];
    if (!hx) return [0, -Math.sign(dz)]; if (!hz) return [-Math.sign(dx), 0];
    const l = Math.hypot(dx, dz); return [-dx / l, -dz / l];
  };

  const nav = {
    floor: 0, onStairs: false, th: 0, r: ST.startR, dyn: [], puddle: false, region: '', events: [],
    rectOf, boxOf,
    place(st, x, y, z) {
      const r = Math.hypot(x - CX, z - CZ);
      if (y > 1 && y < UP_Y - 1 || (r <= ST.rMax && !rectOf(y >= 150 ? UP_Y : 0, x, z))) {
        // на лестнице: θ по ближайшему витку к высоте y
        const a = stairAngle(x, z); let best = 0, bd = 1e9;
        for (let k = -1; k <= 2; k++) { const th = a + 360 * k; if (th < -8 || th > ST.sweep + 8) continue; const d = Math.abs(stairTop(th) - y); if (d < bd) { bd = d; best = th; } }
        nav.placeStairs(st, best, clamp(r, ST.rMin, ST.rMax));
      } else {
        nav.onStairs = false; nav.floor = y >= 150 ? UP_Y : 0; st.pos.set(x, nav.floor, z);
        nav.region = rectOf(nav.floor, x, z)?.id || '';
      }
      nav.puddle = false;
    },
    placeStairs(st, th, r) { nav.onStairs = true; nav.th = th; nav.r = r; const p = sp(th, r); st.pos.set(p.x, p.y, p.z); nav.region = 'STAIRS'; },
    get feetY() { return nav.onStairs ? stairTop(nav.th) : nav.floor; },
    step(st, dx, dz) {
      nav.events.length = 0;
      return nav.onStairs ? stepStairs(st, dx, dz) : stepFloor(st, dx, dz);
    },
  };

  function enterStairs(st, x, z, fromFloor) {
    const a = stairAngle(x, z), r = clamp(Math.hypot(x - CX, z - CZ), ST.rMin, ST.rMax);
    const th = fromFloor === 0 ? clamp(a, -8, 10) : clamp(ST.sweep + wrapDeg(a - 180), 530, ST.sweep + 8);
    nav.placeStairs(st, th, r);
    nav.events.push({ type: 'enterStairs', from: fromFloor });
  }
  function stepFloor(st, dx, dz) {
    const p = st.pos, x1 = p.x + dx, z1 = p.z + dz, f = nav.floor;
    const r1 = Math.hypot(x1 - CX, z1 - CZ);
    if (r1 <= ST.rMax) {
      const a = stairAngle(x1, z1);
      if (f === 0 && Math.abs(a) <= 14) { enterStairs(st, x1, z1, 0); return { hit: null }; }
      if (f === UP_Y && Math.abs(wrapDeg(a - 180)) <= 14) { enterStairs(st, x1, z1, UP_Y); return { hit: null }; }
    }
    const hit = floorBlock(f, x1, z1);
    if (!hit) { p.x = x1; p.z = z1; nav.region = rectOf(f, x1, z1)?.id || nav.region; return { hit: null }; }
    const hx = dx ? floorBlock(f, x1, p.z) : hit, hz = dz ? floorBlock(f, p.x, z1) : hit;
    if (dx && !hx) p.x = x1; else if (dz && !hz) p.z = z1;
    const n = normal(dx, dz, hx, hz);
    if (hit.box) { // нормаль от центра бокса — точнее для «врезался в стол»
      const b = hit.box, cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1), ex = p.x - cx, ez = p.z - cz, l = Math.hypot(ex, ez);
      if (l > 1e-3) { n[0] = ex / l; n[1] = ez / l; }
    }
    return { hit: { ...hit, nx: n[0], nz: n[1] } };
  }
  function stepStairs(st, dx, dz) {
    const p = st.pos, x1 = p.x + dx, z1 = p.z + dz;
    const a1 = stairAngle(x1, z1), th1 = nav.th + wrapDeg(a1 - wrapDeg(nav.th));
    let r1 = Math.hypot(x1 - CX, z1 - CZ);
    // выходы
    if (r1 > ST.rMax) {
      if (th1 <= 10 && rectOf(0, x1, z1)) { nav.onStairs = false; nav.floor = 0; p.set(x1, 0, z1); nav.region = rectOf(0, x1, z1).id; nav.events.push({ type: 'exitStairs', floor: 0 }); return { hit: null }; }
      if (th1 >= 530 && rectOf(UP_Y, x1, z1)) { nav.onStairs = false; nav.floor = UP_Y; p.set(x1, UP_Y, z1); nav.region = rectOf(UP_Y, x1, z1).id; nav.events.push({ type: 'exitStairs', floor: UP_Y }); return { hit: null }; }
    }
    let rail = null;
    if (r1 > ST.rMax || r1 < ST.rMin) { rail = { name: r1 > ST.rMax ? 'rail' : 'post', kind: 'wall', bump: false }; r1 = clamp(r1, ST.rMin, ST.rMax); }
    const tryAt = (th, r) => { const q = sp(th, r); return stairBlock(th, r, q.y, q.x, q.z); };
    let hit = tryAt(th1, r1), thN = th1, rN = r1;
    if (hit) {
      const hT = tryAt(th1, nav.r), hR = tryAt(nav.th, r1);
      if (!hT) { thN = th1; rN = nav.r; } else if (!hR) { thN = nav.th; rN = r1; } else { thN = nav.th; rN = nav.r; }
    }
    // скользкое и лужи
    for (const o of obs) {
      if (o.off) continue;
      if (o.kind === 'sock' && !o.used && inObs(o, thN, rN, false)) { o.used = true; nav.events.push({ type: 'slip', id: o.id, obs: o }); }
    }
    nav.puddle = obs.some((o) => o.kind === 'puddle' && !o.off && inObs(o, thN, rN, false));
    nav.th = thN; nav.r = rN;
    const q = sp(thN, rN); p.set(q.x, q.y, q.z);
    const H = hit || rail;
    if (!H) return { hit: null };
    let nx, nz;
    if (hit?.obs) { const o = hit.obs, c = sp((o.th[0] + o.th[1]) / 2, (o.r[0] + o.r[1]) / 2), ex = p.x - c.x, ez = p.z - c.z, l = Math.hypot(ex, ez) || 1; nx = ex / l; nz = ez / l; }
    else if (hit?.dyn) { const ex = p.x - hit.dyn.x, ez = p.z - hit.dyn.z, l = Math.hypot(ex, ez) || 1; nx = ex / l; nz = ez / l; }
    else { const ex = p.x - CX, ez = p.z - CZ, l = Math.hypot(ex, ez) || 1, s = H.name === 'rail' ? -1 : 1; nx = s * ex / l; nz = s * ez / l; }
    return { hit: { ...H, nx, nz } };
  }
  return nav;
}
