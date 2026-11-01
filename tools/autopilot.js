// Автопилот для headless-проверок сцен человека (S07, S08, S10): подменяет input.axis / input.down('shift').
// Маршрут: [{x, z} — точка на этаже · {th, r} — цель на лестнице · {careful: bool} · {wait: с} · {use: true} — нажать E
//           · {hold: с} — удерживать E · {wash: true} — играть мини-игру умывания до конца]
const D2R = Math.PI / 180;
export function install(route, { tol = 10, log = false } = {}) {
  const g = window.__game, inp = g.input;
  const origAxis = inp.__origAxis || (inp.__origAxis = inp.axis.bind(inp));
  const origDown = inp.__origDown || (inp.__origDown = inp.down.bind(inp));
  const origPressed = inp.__origPressed || (inp.__origPressed = inp.pressed.bind(inp));
  const ap = window.__ap = { route, i: 0, careful: false, done: false, t: 0, holdE: false, pressE: 0, trace: [], last: performance.now() };
  const H = () => g.scenes.current?._dbg?.H || g.scenes.current?._dbg;
  function step() {
    if (ap.done || ap.off) return null;
    const sc = g.scenes.current, D = sc?._dbg; if (!D) return null;
    const ctl = D.H?.ctl || D.ctl, nav = D.H?.nav || D.nav; if (!ctl) return null;
    // время — игровое (headless идёт медленнее реального)
    const gt = ctl.st.time, dt = ap.lastGT == null ? 0 : Math.max(0, Math.min(0.2, gt - ap.lastGT)); ap.lastGT = gt;
    const p = ctl.st.pos, wp = route[ap.i];
    if (!wp) { ap.done = true; return { x: 0, y: 0 }; }
    const next = () => { ap.trace.push([ap.i, Math.round(p.x), Math.round(p.y), Math.round(p.z), nav?.onStairs ? Math.round(nav.th) : null]); ap.i++; ap.t = 0; };
    ap.t += dt;
    if (wp.careful != null) { ap.careful = wp.careful; next(); return { x: 0, y: 0 }; }
    if (wp.wait != null) { if (ap.t >= wp.wait) next(); return { x: 0, y: 0 }; }
    if (wp.use) { ap.pressE = 2; next(); return { x: 0, y: 0 }; }
    if (wp.hold != null) { ap.holdE = ap.t < wp.hold; if (ap.t >= wp.hold + 0.1) next(); return { x: 0, y: 0 }; }
    if (wp.wash) { const w = D.wash; if (!w || w.done) { if (ap.t > 0.5) next(); return { x: 0, y: 0 }; } if (w.isTap) return { x: Math.floor(ap.t / 0.12) % 2 ? 1 : -1, y: 0, raw: true }; return { x: Math.max(-1, Math.min(1, (0.5 - w.arrow) * 30)), y: 0, raw: true }; } // кран — чередование A/D // ось мини-игры — экранная, без пересчёта от камеры
    if (wp.until) { if (wp.until(D)) next(); return { x: 0, y: 0 }; }
    if (wp.th != null) {
      if (!nav.onStairs) { ap.err = 'not on stairs at wp ' + ap.i; return { x: 0, y: 0 }; }
      const dth = wp.th - nav.th, dr = (wp.r ?? 78) - nav.r;
      if (Math.abs(dth) < 2.5 && Math.abs(dr) < 6) { next(); return { x: 0, y: 0 }; }
      const a = nav.th * D2R, s = Math.abs(dth) < 2.5 ? 0 : Math.sign(dth);
      const tx = Math.sin(a) * s, tz = Math.cos(a) * s, rx = -Math.cos(a), rz = Math.sin(a), k = Math.max(-1, Math.min(1, dr / 18));
      let x = tx + rx * k, z = tz + rz * k; const l = Math.hypot(x, z) || 1; return { x: x / l, y: z / l };
    }
    if (wp.x != null) {
      const dx = wp.x - p.x, dz = wp.z - p.z, d = Math.hypot(dx, dz);
      if (wp.stairs ? nav?.onStairs : d < (wp.tol || tol)) { next(); return { x: 0, y: 0 }; }
      if ( (wp.floor != null && !nav?.onStairs && nav?.floor === wp.floor && wp.anyPoint)) { next(); return { x: 0, y: 0 }; }
      return { x: dx / d, y: dz / d };
    }
    next(); return { x: 0, y: 0 };
  }
  // мировое направление → оси ввода относительно камеры (как в humanCtl)
  const toAxis = (r) => {
    if (!r || (!r.x && !r.y)) return r;
    const D = g.scenes.current?._dbg, cam = D?.H?.camera || D?.H?.ctl?.camera || D?.ctl?.camera || D?.camera;
    if (!cam) return r;
    const f = cam.getWorldDirection(new cam.position.constructor()); f.y = 0; if (f.lengthSq() < 1e-6) return r; f.normalize();
    const rx = -f.z, rz = f.x;
    return { x: r.x * rx + r.y * rz, y: -(r.x * f.x + r.y * f.z) };
  };
  inp.axis = () => { const r = step(); return r ? (r.raw ? r : toAxis(r)) : origAxis(); };
  inp.down = (a) => (a === 'shift' && ap.careful && !ap.done) || (a === 'use' && ap.holdE) || origDown(a);
  inp.pressed = (a) => { if (a === 'use' && ap.pressE > 0) { ap.pressE--; return true; } return origPressed(a); };
  return 'installed ' + route.length;
}
export function uninstall() { const inp = window.__game.input; if (inp.__origAxis) { inp.axis = inp.__origAxis; inp.down = inp.__origDown; inp.pressed = inp.__origPressed; } window.__ap = null; }
