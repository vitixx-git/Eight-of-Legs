// S01 «Я тебя помню» (3D кат-сцена, ~18 с). Ночь: паук на шкафу спальни смотрит на спящего → воспоминание
// (лаборатория в режиме memory, вид со шкафа вниз: учёный пишет, доска «АРАХНОЦИД v3», банки с пауками, крупный план,
// «Это он.») → снова спальня. memorySeen = true (и при пропуске). Пропуск — удержание Пробела 1,0 с.
// Таблица событий — cutscenes/data/S01.js. Два мира (спальня и лаборатория) рендерятся одной камерой.
import { CFG } from '../config.js';
import { createWorld, camRig, createCutscene } from './common.js';
import { buildBedroom, BEDROOM_LIGHTS } from '../env/bedroom.js';
import { furnishLab } from '../lab/furnish.js';
import { optimizeLab } from '../lab/optimize.js';
import { actorOf } from '../cutscenes/timeline.js';
import { memOverlay } from '../gfx2d/fx.js';
import TL, { SPIDER_POS } from '../cutscenes/data/S01.js';

let ctx, bedW, labW, bedEnv, lab, rig, cut, active = 'bedroom', memK = 0, time = 0, snore = null, ended = false;
function setWorld(name) {
  active = name;
  const cam = bedW.camera;
  cam.near = name === 'memory' ? 2 : 0.4; cam.updateProjectionMatrix();
  ctx.audio.setReverb(name === 'memory' ? 'memory' : 'bedroom');
  snore?.setVol(name === 'memory' ? 0 : 0.3);
  if (name !== 'memory') ctx.clear2d();
}
const scene = {
  id: 'S01_Intro', kind: 'cut', series: 1, objectives: ['obj.s1.watch'], checkpoints: ['start'],
  async enter(c) {
    ctx = c; ctx.show3d(true); time = 0; memK = 0; ended = false; active = 'bedroom';
    bedW = createWorld(ctx, { palette: 'bedroom', fov: 50, near: 0.4, far: 3000, fog: [300, 1100], lights: BEDROOM_LIGHTS });
    bedEnv = buildBedroom(bedW.scene, {});
    bedEnv.sleeper.lie('sleepBreath');
    const sp = bedEnv.spider;
    sp.group.position.set(...SPIDER_POS); sp.group.rotation.set(0, Math.atan2(0 - SPIDER_POS[0], -87 - SPIDER_POS[2]), 0);
    sp.animator.play('idle');
    bedEnv.glow.visible = false;
    labW = createWorld(ctx, { palette: 'memory', fov: 60, near: 2, far: 3000, lights: false });
    lab = await furnishLab(labW.scene, 'memory', { includeScientist: true });
    lab.markers.visible = false;
    optimizeLab(lab);
    rig = camRig(bedW.camera);
    const actors = {
      spider: actorOf(sp, { play: (n) => sp.animator.play(n) }),
      scientist: actorOf(lab.scientist, { play: (n) => lab.scientist.animator.play(n) }),
    };
    cut = createCutscene(ctx, TL, { camera: rig, actors, call: { world: (name) => setWorld(name) } }, {
      onEnd: () => { if (ended) return; ended = true; ctx.save.setFlag('memorySeen', true); ctx.scenes.complete(); },
    });
    snore = ctx.audio.loop('BED_SNORE_LOOP', { vol: 0.3 });
    setWorld('bedroom');
    rig.set(TL.events[1].p, TL.events[1].at, TL.events[1].fov);
    bedW.prewarm(); labW.prewarm(bedW.camera);
  },
  update(dt) {
    time += dt;
    cut.update(dt);
    rig.update(dt, ctx.settings.shake);
    bedEnv.spider.animator.update(dt, 0);
    bedEnv.update(dt);
    if (active === 'memory') lab.update(dt);
    memK = active === 'memory' ? Math.min(1, memK + dt / 0.4) : 0;
  },
  render() {
    if (active === 'memory') {
      labW.render(bedW.camera);
      ctx.clear2d();
      if (!scene._noOverlay) memOverlay(ctx.g2d(), time, { strength: memK, lessFx: ctx.settings.lessFx });
    } else bedW.render();
  },
  pause() {}, resume() {},
  debugWin() { cut?.skip(); },
  debugSeek(t) { while (cut && !cut.done && cut.time < t) scene.update(1 / 30); },
  get _dbg() { return { bedW, labW, lab, bedEnv, rig, cut }; },
  debugInfo() { return `S01: ${cut ? cut.time.toFixed(1) : 0}/${TL.dur} с · ${active}`; },
  exit() {
    cut?.dispose(); cut = null;
    snore = null; ctx.clear2d();
    lab?.dispose(); lab = null;
    labW?.dispose(); labW = null; bedW?.dispose(); bedW = null; bedEnv = null;
  },
};
export default scene;
