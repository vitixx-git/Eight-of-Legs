// SceneManager: реестр, граф переходов, карточки серий, поражения, контрольные точки.
import { CFG, GRAPH } from '../config.js';
import { t } from '../text/ru.js';

export const SCENE_PATHS = {
  MENU: '../ui/menu.js', RESULTS: '../ui/results.js', CREDITS: '../ui/credits.js', C_User: '../cutscenes/userCutscene.js',
  S01_Intro: '../scenes3d/S01_Intro.js', S02_Path: '../scenes3d/S02_Path.js', S03_Meet: '../scenes3d/S03_Meet.js',
  S04_Reflex: '../scenes2d/S04_Reflex.js', S05_Fear: '../scenes2d/S05_Fear.js', S06_Will: '../scenes2d/S06_Will.js',
  C_Levers: '../scenes3d/C_Levers.js', S07_Morning: '../scenes3d/S07_Morning.js', C_Wardrobe: '../scenes3d/C_Wardrobe.js',
  S08_Prep: '../scenes3d/S08_Prep.js', C_ExitHome: '../scenes3d/C_ExitHome.js', S09_Road: '../scenes2d/S09_Road.js',
  C_LabEntry: '../scenes3d/C_LabEntry.js', S10_Lab: '../scenes3d/S10_Lab.js',
  MODELS: '../scenes3d/MODELS.js', SOUNDROOM: '../scenes2d/SOUNDROOM.js',
};
// Чекпоинты дублируются здесь, чтобы проверять сохранение без загрузки модулей сцен.
export const CHECKPOINTS = {
  MENU: ['start'], C_User: ['start'], S01_Intro: ['start'], S02_Path: ['start', 'bed', 'pillow'], S03_Meet: ['start'],
  S04_Reflex: ['start'], S05_Fear: ['start'], S06_Will: ['start'], C_Levers: ['start'],
  S07_Morning: ['start', 'landing1', 'landing2', 'sink'], C_Wardrobe: ['start'], S08_Prep: ['start', 'descent'],
  C_ExitHome: ['start'], S09_Road: ['start'], C_LabEntry: ['start'], S10_Lab: ['start', 'stopped', 'inserted'],
  RESULTS: ['start'], CREDITS: ['start'], MODELS: ['start'], SOUNDROOM: ['start'],
};
const NO_SAVE = new Set(['MENU', 'RESULTS', 'CREDITS', 'MODELS', 'SOUNDROOM']);

export function createSceneManager(ctx) {
  const cache = new Map();
  let busy = false, queued = null;
  const sm = {
    current: null, currentId: null, checkpoint: 'start', params: {}, started: false, transitioning: false,
    async load(id) {
      if (cache.has(id)) return cache.get(id);
      const path = SCENE_PATHS[id];
      if (!path) throw new Error('Неизвестная сцена ' + id);
      const mod = await import(path);
      const scene = mod.default;
      if (!scene || scene.id !== id) throw new Error('Сцена ' + id + ' не соответствует контракту');
      cache.set(id, scene); return scene;
    },
    nextOf(id) {
      const uc = CFG.userCutscene;
      if (id === 'C_User') return uc.position === 'afterS10' ? 'RESULTS' : 'S01_Intro';
      if (id === 'MENU') return uc.enabled && uc.position === 'beforeS01' ? 'C_User' : 'S01_Intro';
      if (id === 'S10_Lab' && uc.enabled && uc.position === 'afterS10') return 'C_User';
      return GRAPH.next[id];
    },
    async goto(id, params = {}) {
      if (busy) { queued = [id, params]; return; }
      busy = true; sm.transitioning = true; sm.started = false;
      try {
        const fadeDur = params.transition === 'none' ? 0 : CFG.ui.fade;
        await ctx.fade.to(1, fadeDur);
        if (sm.current) {
          try { sm.current.exit(); } catch (e) { console.error('[scene exit]', sm.currentId, e); }
          ctx.renderer?.releaseScene?.();
          ctx.audio.stopScene(); ctx.hud.clear(); ctx.objectives.clear(); ctx.cockpit.show(false); ctx.tweens.killTag('scene');
        }
        sm.current = null;
        ctx.input.consumeAll();
        const scene = await sm.load(id);
        const cps = scene.checkpoints || ['start'];
        const chk = cps.includes(params.checkpoint) ? params.checkpoint : cps[0];
        sm.currentId = id; sm.checkpoint = chk; sm.params = params;
        ctx.renderer?.clear?.();
        ctx.clear2d();
        const series = scene.series || null;
        const showCard = series && !params.noCard && !params.retry && params.transition !== 'none';
        let cardPromise = Promise.resolve();
        if (showCard) cardPromise = ctx.card.show(series, scene.objectives || []);
        if (!NO_SAVE.has(id) && ctx.save.data) { ctx.save.setPoint(id, chk); }
        const loadTimer = performance.now();
        ctx.ui.loading(true, showCard);
        await scene.enter(ctx, { ...params, checkpoint: chk });
        ctx.ui.loading(false);
        sm.enterMs = performance.now() - loadTimer;
        sm.current = scene;
        await cardPromise;
        if (scene.objectives && scene.objectives.length && scene.kind !== 'cut') ctx.objectives.set(scene.objectives, showCard, scene.objectiveVars);
        ctx.cockpit.show(!!scene.cockpit && ctx.settings.cockpit);
        ctx.input.consumeAll();
        await ctx.fade.to(0, fadeDur);
        sm.started = true;
        if (scene.hints && !params.retry) ctx.hud.hints(scene.hints);
        if (scene.onStart) scene.onStart();
        ctx.events.emit('scene:start', { id, checkpoint: chk });
      } catch (e) {
        console.error('[scene goto]', id, e);
        ctx.ui.loading(false);
        ctx.fade.set(0);
        ctx.ui.errorDialog(e, () => { busy = false; sm.goto('MENU'); });
      } finally {
        busy = false; sm.transitioning = false;
        if (queued) { const q = queued; queued = null; sm.goto(q[0], q[1]); }
      }
    },
    complete(params = {}) {
      if (!sm.currentId || sm.transitioning) return;
      const next = sm.nextOf(sm.currentId);
      if (next) sm.goto(next, params);
    },
    // «С контрольной точки» из паузы: перезапуск сцены без карточки
    restartCheckpoint() {
      if (!sm.currentId || sm.transitioning) return;
      ctx.save.addRetry();
      sm.goto(sm.currentId, { checkpoint: sm.checkpoint, retry: true });
    },
    setCheckpoint(chk) {
      sm.checkpoint = chk;
      if (!NO_SAVE.has(sm.currentId) && ctx.save.data) ctx.save.setPoint(sm.currentId, chk);
      ctx.events.emit('checkpoint', { id: sm.currentId, chk });
    },
    // Поражение: оверлей, затем возврат по графу.
    fail(reasonKey, opts = {}) {
      if (!sm.started || sm.failing) return;
      if (ctx.debugState?.god && !opts.force) { ctx.hud.toast('[F2] ' + t(reasonKey)); return false; }
      sm.failing = true;
      const id = sm.currentId;
      const rule = GRAPH.defeat[id] || [id, 'chk'];
      const target = rule[0], chk = rule[1] === 'chk' ? sm.checkpoint : rule[1];
      ctx.save.addRetry();
      ctx.audio.play('ST_DEFEAT');
      ctx.events.emit('defeat', { id, reason: reasonKey });
      const sameScene = target === id && typeof sm.current?.respawn === 'function';
      const extra = target === 'S04_Reflex' && id !== 'S04_Reflex' ? t('defeat.toS04') : '';
      ctx.ui.defeat(t(reasonKey), opts.tip ? t(opts.tip) : extra, () => {
        sm.failing = false;
        if (sameScene) { ctx.input.consumeAll(); sm.current.respawn(chk); }
        else sm.goto(target, { checkpoint: chk, retry: true });
      });
      return true;
    },
    update(dt) { if (sm.current && sm.started && !sm.failing) sm.current.update(dt); else if (sm.current && sm.current.updateIdle) sm.current.updateIdle(dt); },
    render(alpha) { if (sm.current) sm.current.render(alpha); },
    pause() { sm.current?.pause?.(); },
    resume() { sm.current?.resume?.(); },
  };
  return sm;
}
