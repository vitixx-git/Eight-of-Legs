// S03 «Кто здесь главный?» (3D, ~12 с + кнопка). Паук в голове; напротив — Рефлекс, Страх, Воля (12 см, в 4 раза выше
// паука). Камера на уровне глаз защитников, плашки имён, субтитр «Посторонним в голове не место.». На 10,5 с — кнопка
// «Сразиться» в фокусе (Enter / Пробел / клик) → S04. meetSeen = true. Пропуск удержанием Пробела — сразу к кнопке.
// После поражений в боях сцена не повторяется (граф поражений S05/S06 → S04, см. config.js GRAPH.defeat).
import * as THREE from 'three';
import { t } from '../text/ru.js';
import { createWorld, camRig, createCutscene, letterbox } from './common.js';
import { furnishBrain } from '../brain/furnish.js';
import { optimizeBrain } from '../brain/optimize.js';
import { createSpider } from '../models/spider.js';
import { createDefReflex } from '../models/def_reflex.js';
import { createDefFear } from '../models/def_fear.js';
import { createDefWill } from '../models/def_will.js';
import { actorOf } from '../cutscenes/timeline.js';
import { el, button } from '../ui/dom.js';
import TL, { DEF_POS, SPIDER_POS } from '../cutscenes/data/S03.js';

const NAMES = ['reflex', 'fear', 'will'];
let ctx, world, root, brain, spider, defs, rig, cut, plates, btn, fought, time, focusName, btnShown;
const pos = [];
const v3 = new THREE.Vector3();
function showButton() {
  if (btnShown) return; btnShown = true;
  cut?.dispose(); letterbox(ctx, false);
  btn = button(t('prompt.fight'), () => fight(), 'btn primary s3-fight');
  ctx.uiRoot.append(btn);
  requestAnimationFrame(() => btn?.focus({ preventScroll: true }));
  ctx.audio.play('UI_HINT');
  ctx.hud.hints([['Enter Пробел', 'hint.fight']]);
}
function fight() {
  if (fought || !btnShown) return; fought = true;
  ctx.audio.play('UI_CONFIRM');
  ctx.save.setFlag('meetSeen', true);
  ctx.objectives.done(0);
  if (btn) btn.disabled = true;
  ctx.scenes.complete();
}
const scene = {
  id: 'S03_Meet', kind: '3d', series: 3, objectives: ['obj.s3.meet'], checkpoints: ['start'],
  async enter(c) {
    ctx = c; ctx.show3d(true); time = 0; fought = false; btnShown = false; focusName = null; btn = null;
    world = createWorld(ctx, { palette: 'brain', fov: 50, near: 0.3, far: 600, lights: false });
    root = new THREE.Group(); root.name = 'BRAIN_ROOT'; world.scene.add(root);
    brain = await furnishBrain(root, { onAlarm: () => ctx.audio.play('BRN_ALARM') });
    optimizeBrain(brain);
    spider = createSpider({ clips: false }); spider.group.userData.brainActor = true;
    spider.group.position.set(0, 0, 45); spider.group.rotation.y = Math.PI; root.add(spider.group); spider.animator.play('idle');
    defs = [createDefReflex(), createDefFear(), createDefWill()];
    defs.forEach((d, i) => { d.group.userData.brainActor = true; d.group.position.set(...DEF_POS[i]); root.add(d.group); d.animator.play('idle'); });
    defs[1].setHideTarget?.(defs[0]); defs[1].lookAt?.(spider.group);
    plates = NAMES.map((n) => {
      const p = el('div', 's3-plate ' + n); p.append(el('b', '', t('name.' + n)), el('span', '', t('role.' + n)));
      ctx.hudRoot.append(p); return p;
    });
    rig = camRig(world.camera);
    const actors = { spider: actorOf(spider, { play: (n) => spider.animator.play(n) }) };
    NAMES.forEach((n, i) => { actors[n] = actorOf(defs[i], { play: (a) => defs[i].animator.play(a) }); });
    const skipToButton = ctx.save.data?.flags?.meetSeen || ctx.scenes.params?.retry;
    cut = createCutscene(ctx, TL, {
      camera: rig, actors,
      call: {
        plate: (n) => plates[NAMES.indexOf(n)]?.classList.add('on'),
        focus: (n) => { focusName = n; },
        attack: (n, a) => { const d = defs[NAMES.indexOf(n)]; try { d?.attack?.(a); } catch (e) { console.warn(e); } },
        button: () => { plates.forEach((p) => p.classList.add('on')); focusName = null; showButton(); },
      },
    }, { onEnd: () => {} });
    rig.set(TL.events[0].p, TL.events[0].at, TL.events[0].fov);
    ctx.audio.setReverb('brain');
    world.prewarm();
    scene._autoSkip = !!skipToButton;
  },
  onStart() { if (scene._autoSkip) { /* повторный показ: подсказка, что можно пропустить */ ctx.hud.toast(t('hint.skip')); } },
  update(dt) {
    time += dt;
    if (!btnShown) cut.update(dt); else cut.timeline.update(dt);
    rig.update(dt, ctx.settings.shake);
    spider.animator.update(dt, 10);
    for (const d of defs) (d.update ? d.update(dt) : d.animator.update(dt));
    brain.update(dt, spider.group.position);
    if (btnShown && !fought && (ctx.input.pressed('confirm') || ctx.input.pressed('action'))) fight();
    // плашки имён — проекция точки над головой
    world.camera.updateMatrixWorld();
    defs.forEach((d, i) => {
      const p = plates[i];
      const hidden = focusName && focusName !== NAMES[i];
      v3.set(d.group.position.x, d.group.position.y + 14.5, d.group.position.z).project(world.camera);
      const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 && !hidden;
      p.style.visibility = vis ? 'visible' : 'hidden';
      pos[i] = { x: (v3.x + 1) / 2 * 960, y: (1 - v3.y) / 2 * 540, vis };
    });
    // Страх прячется за Рефлексом — плашки не должны перекрываться: верхнюю поднимаем над соседней
    const hit = (q, i) => pos.some((b, j) => j < i && b.vis && Math.abs(q.x - b.x) < 175 && Math.abs(q.y - b.y) < 58);
    for (let i = 1; i < pos.length; i++) {
      const a = pos[i]; if (!a.vis || !hit(a, i)) continue;
      const b = pos.find((q, j) => j < i && q.vis && Math.abs(a.x - q.x) < 175 && Math.abs(a.y - q.y) < 58);
      const opts = [{ x: b.x + 178, y: b.y }, { x: b.x - 178, y: b.y }, { x: a.x, y: b.y - 60 }];
      const ok = opts.find((q) => q.x > 90 && q.x < 870 && q.y > 120 && !hit(q, i)) || opts[2];
      a.x = ok.x; a.y = ok.y;
    }
    pos.forEach((q, i) => { plates[i].style.left = q.x.toFixed(1) + 'px'; plates[i].style.top = q.y.toFixed(1) + 'px'; });
  },
  render() { brain.renderFeeds(ctx.renderer.three); world.render(); },
  pause() {}, resume() {},
  debugWin() { if (!btnShown) cut.skip(); else fight(); },
  debugSeek(s) { while (!btnShown && cut.time < s) scene.update(1 / 30); },
  debugInfo() { return `S03: ${cut ? cut.time.toFixed(1) : 0} с · кнопка ${btnShown ? 'да' : 'нет'}`; },
  get _dbg() { return { world, W: world, root, brain, spider, defs, cut, rig }; },
  exit() {
    if (!btnShown) cut?.dispose();
    letterbox(ctx, false);
    btn?.remove(); btn = null; plates?.forEach((p) => p.remove()); plates = null;
    brain?.dispose(); brain = null;
    world?.dispose(); world = null; defs = null; spider = null; cut = null;
  },
};
export default scene;
