// C_Levers «Слишком много рычагов» (3D кат-сцена, 18 с). Барьер гаснет, паук идёт к пульту и запрыгивает в кресло,
// панели загораются по одной, лапа тянется к «РОТ — НЕ ТРОГАТЬ» и отдёргивается, рычаги «РУКИ» и «ГЛАЗА».
// Снаружи: палец дёргается, глаза открываются, человек садится, в окне рассвет. «Теперь я за штурвалом.»
// leversDone = true (и при пропуске). Экран «ГЛАЗА» в мозге показывает спальню глазами человека (RenderTarget).
import * as THREE from 'three';
import { createWorld, camRig, createCutscene, D2R } from './common.js';
import { furnishBrain } from '../brain/furnish.js';
import { optimizeBrain } from '../brain/optimize.js';
import { createSpider } from '../models/spider.js';
import { buildBedroom, BEDROOM_LIGHTS } from '../env/bedroom.js';
import { actorOf } from '../cutscenes/timeline.js';
import TL, { SPIDER_START } from '../cutscenes/data/C_Levers.js';

let signs = [];
let ctx, brainW, root, brain, spider, bedW, bedEnv, eyeCam, rig, cut, active = 'brain', levers = [], leverT = [0, 0, 0, 0], dawnSpan = null, ended = false;
const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
const WARM = { sky: new THREE.Color('#ffd9b0'), key: new THREE.Color('#ffcf8a') };
let baseSky, baseKey, baseHemiI;
function setWorld(name) {
  active = name;
  const cam = brainW.camera; cam.near = name === 'brain' ? 0.25 : 1; cam.updateProjectionMatrix();
  ctx.audio.setReverb(name === 'brain' ? 'brain' : 'bedroom');
}
function updateEyeCam() {
  const head = bedEnv.sleeper.joints.head;
  head.updateWorldMatrix(true, false);
  head.localToWorld(v3.set(0, 3, 9)); head.localToWorld(v3b.set(0, 3, 200));
  eyeCam.position.copy(v3); eyeCam.lookAt(v3b);
}
const scene = {
  id: 'C_Levers', kind: 'cut', series: null, objectives: [], checkpoints: ['start'], cutTitle: 'cut.C_Levers',
  async enter(c) {
    ctx = c; ctx.show3d(true); ended = false; dawnSpan = null; leverT = [0, 0, 0, 0]; active = 'brain';
    brainW = createWorld(ctx, { palette: 'brain', fov: 50, near: 0.25, far: 2500, lights: false });
    bedW = createWorld(ctx, { palette: 'bedroom', fov: 50, near: 1, far: 2500, fog: [300, 1100], lights: BEDROOM_LIGHTS });
    bedEnv = buildBedroom(bedW.scene, { spider: false });
    const ARM = { armOut: [6, -34, 24] };
    bedEnv.sleeper.lie('sleepBreath', ARM); for (let i = 0; i < 8; i++) bedEnv.sleeper.animator.update(0.05);
    for (const w of Object.values(bedEnv.webs)) w.group.visible = false;
    // кадр «палец дёргается»: камера смотрит на кисть поверх одеяла
    const hand = bedEnv.sleeper.joints['hand.L'] || bedEnv.sleeper.joints['wrist.L'];
    const hp = hand ? hand.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(-30, 80, -40);
    const handShot = { p: [hp.x - 34, hp.y + 30, hp.z + 30], at: [hp.x, hp.y - 2, hp.z] };
    baseSky = bedW.lights.hemi.color.clone(); baseKey = bedW.lights.dir.color.clone(); baseHemiI = bedW.lights.hemi.intensity;
    eyeCam = new THREE.PerspectiveCamera(62, 256 / 160, 1, 2000);
    root = new THREE.Group(); root.name = 'BRAIN_ROOT'; brainW.scene.add(root);
    brain = await furnishBrain(root, { eyeView: () => ({ scene: bedW.scene, camera: eyeCam }), onAlarm: () => ctx.audio.play('BRN_ALARM') });
    brain.setTimeline(0);
    optimizeBrain(brain, { keep: ['no_entry_sign_0', 'warning_sign_0', 'warning_sign_1'] });
    const panel = root.getObjectByName('COCKPIT_PANEL');
    signs = ['no_entry_sign_0', 'warning_sign_0', 'warning_sign_1'].map((n) => root.getObjectByName(n)).filter(Boolean);
    levers = [0, 1, 2, 3].map((i) => panel?.getObjectByName('Lever' + i) || null);
    spider = createSpider({ clips: false }); spider.group.userData.brainActor = true;
    spider.group.position.set(...SPIDER_START); spider.group.rotation.y = Math.PI; root.add(spider.group); spider.animator.play('idle');
    rig = camRig(brainW.camera);
    const sl = bedEnv.sleeper;
    const actors = {
      spider: actorOf(spider, { play: (n) => spider.animator.play(n) }),
      sleeper: actorOf(sl, { play: (n) => (n === 'sitUp' ? sl.lie('sitUp', { legsStraight: true }) : sl.lie(n, ARM)) }),
    };
    cut = createCutscene(ctx, TL, {
      camera: rig, actors,
      call: {
        world: (n) => setWorld(n),
        paw: (on) => { spider.group.rotation.y = on ? Math.PI - 0.45 : Math.PI; if (on) spider.animator.play('pullLever'); },
        lever: (i) => { leverT[i] = 0.0001; },
        dawn: (t0, t1) => { dawnSpan = [t0, t1]; },
        handShot: () => { rig.set(handShot.p, handShot.at, 40); bedEnv.rustle(0.5); },
      },
    }, { onEnd: () => { if (ended) return; ended = true; ctx.save.setFlag('leversDone', true); ctx.scenes.complete(); } });
    setWorld('brain');
    rig.set(TL.events[1].p, TL.events[1].at, TL.events[1].fov);
    updateEyeCam();
    brainW.prewarm(); bedW.prewarm(brainW.camera);
  },
  update(dt) {
    cut.update(dt);
    const tm = cut.time;
    rig.update(dt, ctx.settings.shake);
    spider.animator.update(dt, 10);
    brain.setTimeline(Math.min(tm, TL.dur));
    // таблички «ДОСТУП ЗАКРЫТ» уходят в пол вместе с барьером
    const sk = Math.max(0, Math.min(1, (tm - 1.2) / 0.6));
    for (const sg of signs) { sg.position.y = -18 * sk * sk; sg.visible = sk < 1; }
    brain.update(dt, spider.group.position);
    for (let i = 0; i < 4; i++) if (leverT[i] > 0 && levers[i]) { leverT[i] = Math.min(1, leverT[i] + dt / 0.35); levers[i].rotation.x = 50 * D2R * (1 - (1 - leverT[i]) ** 3); }
    if (dawnSpan) {
      const k = Math.max(0, Math.min(1, (tm - dawnSpan[0]) / (dawnSpan[1] - dawnSpan[0])));
      bedEnv.setDawn(k);
      bedW.lights.hemi.color.copy(baseSky).lerp(WARM.sky, k); bedW.lights.dir.color.copy(baseKey).lerp(WARM.key, k);
      bedW.lights.hemi.intensity = baseHemiI * (1 + 0.35 * k);
    }
    bedEnv.update(dt);
    updateEyeCam();
  },
  render() {
    brain.renderFeeds(ctx.renderer.three);
    if (active === 'brain') brainW.render(); else bedW.render(brainW.camera);
  },
  pause() {}, resume() {},
  debugWin() { cut?.skip(); },
  debugSeek(s) { while (cut && !cut.done && cut.time < s) scene.update(1 / 30); },
  get _dbg() { return { brainW, bedW, bedEnv, brain, spider, rig, cut }; },
  debugInfo() { return `C_Levers: ${cut ? cut.time.toFixed(1) : 0}/${TL.dur} с · ${active}`; },
  exit() {
    cut?.dispose(); cut = null;
    brain?.dispose(); brain = null;
    brainW?.dispose(); brainW = null; bedW?.dispose(); bedW = null; bedEnv = null; spider = null; levers = [];
  },
};
export default scene;
