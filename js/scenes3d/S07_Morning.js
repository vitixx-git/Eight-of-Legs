// S07 «Утренние процедуры» (3D, человек, 2–3 мин). Прихожая → винтовая лестница (θ, r; площадки 100 и 200 см;
// носок, коробка, сапог, лужа; кошка) → кабинет → галерея → коридор → ванная: раковина, зеркало под полотенцем,
// зона 50 см, «E — умыться» → мини-игра (3 шага) → полотенце → C_Wardrobe. Равновесие L — humanCtl.js.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { t } from '../text/ru.js';
import { POINTS, stairPos, stairTop, tangentYaw, UP_Y } from '../env/house.js';
import { setupHouse } from './houseKit.js';
import { createStairCat } from './catAI.js';
import { createWash } from './washGame.js';

const ST = CFG.stairs, W = CFG.wash;
let ctx, H, cat, wash, st, water;

function sockReset() {
  const o = H.env.obstacles.SOCK_STAIR; if (!o) return;
  if (!o.home) { o.home = o.group.position.clone(); o.homeRot = o.group.rotation.y; }
  o.used = false; o.off = false; o.fly = null; o.group.visible = true; o.group.position.copy(o.home); o.group.rotation.set(0, o.homeRot, 0);
}
function resetAt(chk) {
  const P = POINTS;
  st = { chk, time: 0, mode: 'play', modeT: 0, upDone: false, sinkDone: false, washDone: false, l1: chk !== 'start', l2: chk === 'landing2' || chk === 'sink', fails: st?.fails || 0, slips: 0 };
  water?.stop(0.1); water = null; wash = null; ctx.clear2d();
  const ctl = H.ctl;
  ctl.st.inputOn = true; ctl.st.carry = false; ctl.camOffset.set(0, CFG.human.cam.height, CFG.human.cam.dist); ctl.lookOffset.set(0, 90, 0);
  if (chk === 'start') ctl.teleport(P.S07start[0], 0, P.S07start[2], Math.PI / 2);
  else if (chk === 'landing1' || chk === 'landing2') { const th = chk === 'landing1' ? 200 : 380, p = stairPos(th, ST.startR); ctl.teleport(p.x, stairTop(th), p.z, tangentYaw(th)); }
  else { ctl.teleport(P.sinkStand[0], UP_Y, P.sinkStand[2] + 30, Math.PI); }
  if (chk === 'sink') { st.upDone = true; }
  sockReset();
  cat.reset(150);
  ctx.hud.prompt(null);
}
function setChk(chk) { if (st.chk === chk) return; st.chk = chk; ctx.scenes.setCheckpoint(chk); ctx.hud.toast(t('toast.checkpoint')); }
function onEvents() {
  for (const e of H.nav.events) {
    if (e.type === 'slip') {
      st.slips++;
      H.ctl.bump(e.obs.add || 14); ctx.audio.play('HUM_SLIP', { vol: 0.8 });
      const g = e.obs.group, dir = new THREE.Vector3(H.ctl.st.vel.x, 0, H.ctl.st.vel.y).normalize();
      e.obs.fly = { t: 0, v: dir.multiplyScalar(180).add(new THREE.Vector3(0, 160, 0)) };
      g.userData.spin = (Math.random() - 0.5) * 20;
    }
    if (e.type === 'exitStairs' && e.floor === UP_Y && !st.upDone) { st.upDone = true; ctx.objectives.done(0); ctx.cockpit.flash('cheer', CFG.ui.cockpit.cheerDur); }
  }
}
function startWash() {
  const ctl = H.ctl, P = POINTS;
  st.mode = 'wash'; st.modeT = 0;
  ctl.act(null, { dur: null, pose: 'use' }); ctl.st.inputOn = false;
  ctl.teleport(P.sinkStand[0], UP_Y, P.sinkStand[2], Math.PI);
  ctl.camOffset.set(170, 150, 150); ctl.lookOffset.set(-10, 115, -45);
  ctl.act(null, { dur: null, pose: 'use' }); ctl.play('wash', { step: 0 });
  ctx.hud.prompt(null);
  wash = createWash(ctx, {
    onStep(n) {
      if (n === 1) { ctx.audio.play('HOUSE_TAP_ON', { vol: 0.8 }); water = ctx.audio.loop('HOUSE_WATER_RUN', { vol: 0.45 }); }
      if (n === 2) ctx.audio.play('HOUSE_SPLASH', { vol: 0.45 });
      if (n === 3) { ctx.audio.play('HUM_WASH_SPLASH', { vol: 0.8 }); ctx.audio.play('HOUSE_SPLASH', { vol: 0.7 }); }
      ctl.st.animName = ''; ctl.play('wash', { step: Math.min(2, n) });
    },
    onError() { H.ctl.follow.shake(0.15); ctx.cockpit.flash('bump'); },
    onDone() { finishWash(); },
  });
}
function finishWash() {
  st.mode = 'towel'; st.modeT = 0;
  water?.stop(0.6); water = null;
  setTimeout(() => { if (st?.mode === 'towel' && ctx.scenes.currentId === 'S07_Morning') { ctx.audio.play('HOUSE_TOWEL', { vol: 0.7 }); H.ctl.st.animName = ''; H.ctl.play('towel'); } }, 500);
}
const scene = {
  id: 'S07_Morning', kind: '3d', series: 7, cockpit: true,
  checkpoints: ['start', 'landing1', 'landing2', 'sink'],
  objectives: ['obj.s7.up', 'obj.s7.sink', 'obj.s7.wash'],
  hints: [['W A S D', 'hint.move'], ['Shift', 'hint.careful'], ['E', 'hint.use']],
  async enter(c, params) {
    ctx = c; ctx.show3d(true); st = null;
    H = await setupHouse(ctx, { mode: 'S07', outfit: 'pajama', start: [POINTS.S07start[0], 0, POINTS.S07start[2]], yaw: Math.PI / 2 });
    H.ctl.onFall = () => ctx.scenes.fail('fail.fall', { tip: 'tip.s7' });
    H.ctl.onHit = (hit) => { if (hit.kind === 'cat') { cat.collide(); return false; } return true; };
    cat = createStairCat(ctx, H.env.scene, { nav: H.nav, ctl: H.ctl, start: 150 });
    resetAt(params.checkpoint || 'start');
    ctx.audio.music('M_HOUSE'); ctx.audio.setReverb('house'); ctx.audio.ambience('AMB_HOUSE_MORNING');
    H.prewarm();
  },
  onStart() { scene.applyDone(); if (st.chk === 'start' && !ctx.scenes.params.retry) setTimeout(() => ctx.scenes.currentId === 'S07_Morning' && ctx.audio.play('HUM_YAWN', { vol: 0.6 }), 600); },
  applyDone() { if (st.upDone) ctx.objectives.done(0, true); },
  update(dt) {
    st.time += dt; st.modeT += dt;
    const ctl = H.ctl, nav = H.nav;
    if (wash && st.mode === 'wash') wash.update(dt);
    ctl.update(dt);
    onEvents();
    cat.update(dt);
    // носок улетает в пролёт
    const so = H.env.obstacles.SOCK_STAIR;
    if (so?.fly) { const f = so.fly; f.t += dt; f.v.y -= 600 * dt; so.group.position.addScaledVector(f.v, dt); so.group.rotation.y += so.group.userData.spin * dt; if (f.t > 1.2) { so.group.visible = false; so.fly = null; so.off = true; } }
    // площадки — контрольные точки
    if (nav.onStairs) {
      if (!st.l1 && nav.th >= ST.landing1[0] && nav.th <= ST.landing1[1]) { st.l1 = true; setChk('landing1'); }
      if (!st.l2 && nav.th >= ST.landing2[0] && nav.th <= ST.landing2[1]) { st.l2 = true; setChk('landing2'); }
    }
    // раковина
    if (st.mode === 'play') {
      const p = ctl.st.pos, s = POINTS.sinkStand, d = Math.hypot(p.x - s[0], p.z - s[2]);
      const near = !nav.onStairs && nav.floor === UP_Y && d <= W.zoneRadius;
      if (near && !st.sinkDone) { st.sinkDone = true; ctx.objectives.done(1); setChk('sink'); }
      ctx.hud.prompt(near ? t('prompt.wash') : null);
      if (near && ctx.input.pressed('use') && ctl.st.mode === 'walk') startWash();
    } else if (st.mode === 'towel') {
      if (st.modeT > 2.2 && !st.washDone) {
        st.washDone = true; ctx.objectives.done(2); ctx.cockpit.flash('cheer', CFG.ui.cockpit.cheerDur);
        ctx.hud.toast(t('wash.done')); ctx.save.setFlag('washed', true);
        setTimeout(() => { if (ctx.scenes.currentId === 'S07_Morning') ctx.scenes.complete(); }, 1300);
      }
    }
    H.tick(dt, st.time);
  },
  updateIdle(dt) { if (!H) return; H.ctl.update(dt); H.tick(dt, st.time); },
  render() {
    H.render();
    if (wash && st.mode === 'wash') { ctx.clear2d(); wash.draw(); }
    else if (st.drew) { ctx.clear2d(); }
    st.drew = !!(wash && st.mode === 'wash');
  },
  respawn(chk) {
    resetAt(chk);
    ctx.objectives.set(scene.objectives, false);
    scene.applyDone();
  },
  pause() {}, resume() {},
  debugWin() {
    if (st.mode === 'play') { st.upDone = st.sinkDone = true; ctx.objectives.done(0, true); ctx.objectives.done(1, true); startWash(); }
    if (st.mode === 'wash') { wash.done = true; finishWash(); }
  },
  debugInfo() {
    const c = H.ctl, n = H.nav;
    return `S07: ${n.onStairs ? `лестница θ ${n.th.toFixed(0)}° r ${n.r.toFixed(0)}` : `${n.region} (${c.st.pos.x.toFixed(0)}, ${c.st.pos.z.toFixed(0)}) y ${n.floor}`} · L ${c.bal.L.toFixed(0)} ${c.bal.stateName} · ${st.mode} · кошка ${cat.s.mode} θ ${cat.s.th.toFixed(0)}${n.puddle ? ' · лужа' : ''}`;
  },
  get _dbg() { return { H, cat, st, wash }; },
  exit() {
    water?.stop(0.1); water = null; ctx.clear2d();
    cat?.dispose(); cat = null;
    H?.dispose(); H = null; wash = null;
  },
};
export default scene;
