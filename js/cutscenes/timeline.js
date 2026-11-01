// Таймлайн кат-сцен: события по времени (секунды от начала). Типы:
//  shot {p, at, fov?}          — мгновенная склейка камеры
//  cam  {dur, to:{p, at}, ease} — проезд камеры (интерполяция позиции и точки взгляда)
//  anim {actor, name}          — анимация актёра (actor.play(name))
//  move {actor, dur, to:[x,y,z], rotY?, ease} — перемещение актёра
//  sub  {key, dur, who?}       — субтитр (ключ text/ru.js)
//  sfx  {id, opts?} · music {id, opts?} · amb {id} — звук (при пропуске не играет)
//  flag {key, value}           — флаг сохранения (при пропуске применяется)
//  outfit {actor, value}       — смена одежды (при пропуске применяется)
//  call {fn, args?, essential?} — функция окружения (essential — выполняется и при пропуске)
//  fade {to, dur}              — затемнение
//  goto {}                     — конец: переход по графу (при пропуске — сразу)
// skip() мгновенно применяет setFlag, setOutfit, essential-call и goto; sfx пропускает.
import { ease as EASE, lerp } from '../core/tween.js';
import { t } from '../text/ru.js';
export function createTimeline(ctx, def, env) {
  const events = def.events.map((e, i) => ({ ...e, i, fired: false })).sort((a, b) => a.t - b.t || a.i - b.i);
  const moving = []; // активные интерполяции
  let time = 0, done = false, skipped = false;
  const actor = (name) => { const a = env.actors?.[name]; if (!a) console.warn('[timeline] нет актёра', name); return a; };
  // новая склейка/проезд отменяет незавершённый проезд камеры; новое перемещение актёра — его прошлое перемещение
  const cancel = (pred) => { for (let i = moving.length - 1; i >= 0; i--) if (pred(moving[i].e)) moving.splice(i, 1); };
  function apply(e, instant) {
    switch (e.type) {
      case 'shot': cancel((m) => m.type === 'cam'); env.camera.set(e.p, e.at, e.fov); break;
      case 'cam': {
        cancel((m) => m.type === 'cam');
        if (instant) { env.camera.set(e.to.p, e.to.at, e.to.fov); break; }
        const from = env.camera.get();
        moving.push({ e, t0: e.t, dur: e.dur, fn: (u) => {
          const k = (EASE[e.ease] || EASE.inOutCubic)(u);
          env.camera.set(from.p.map((v, i) => lerp(v, e.to.p[i], k)), from.at.map((v, i) => lerp(v, e.to.at[i], k)), e.to.fov != null ? lerp(from.fov, e.to.fov, k) : undefined);
        } });
        break;
      }
      case 'anim': if (!instant) actor(e.actor)?.play(e.name, e.opts); break;
      case 'move': {
        const a = actor(e.actor); if (!a) break;
        cancel((m) => m.type === 'move' && m.actor === e.actor);
        if (instant || !e.dur) { a.setPos(e.to, e.rotY); break; }
        const from = a.getPos(), r0 = a.getRot?.() ?? 0;
        moving.push({ e, t0: e.t, dur: e.dur, fn: (u) => {
          const k = (EASE[e.ease] || EASE.inOutQuad)(u);
          a.setPos(from.map((v, i) => lerp(v, e.to[i], k)), e.rotY != null ? lerp(r0, e.rotY, Math.min(1, k * 2)) : undefined);
        } });
        break;
      }
      case 'sub': if (!instant) ctx.hud.subtitle(t(e.key), e.dur || 2.5, e.who ? t(e.who) : ''); break;
      case 'sfx': if (!instant) ctx.audio.play(e.id, e.opts || {}); break;
      case 'music': if (!instant) ctx.audio.music(e.id, e.opts || {}); break;
      case 'amb': if (!instant) ctx.audio.ambience(e.id); break;
      case 'flag': ctx.save.setFlag(e.key, e.value ?? true); break;
      case 'outfit': actor(e.actor)?.setOutfit?.(e.value); break;
      case 'call': if (!instant || e.essential) env.call?.[e.fn]?.(...(e.args || []), { instant }); break;
      case 'fade': if (!instant) ctx.fade.to(e.to, e.dur || 0.4); break;
      case 'goto': done = true; env.onEnd?.(); break;
      default: console.warn('[timeline] неизвестный тип', e.type);
    }
  }
  const tl = {
    get time() { return time; }, get done() { return done; }, get skipped() { return skipped; }, dur: def.dur,
    update(dt) {
      if (done) return;
      time += dt;
      for (const e of events) { if (e.fired || e.t > time) continue; e.fired = true; apply(e, false); }
      for (let i = moving.length - 1; i >= 0; i--) {
        const m = moving[i], u = Math.min(1, (time - m.t0) / Math.max(1e-3, m.dur));
        m.fn(u); if (u >= 1) moving.splice(i, 1);
      }
    },
    // Мгновенно применяет флаги/одежду/essential-вызовы и переход. Звуки не играют.
    skip() {
      if (done) return; skipped = true;
      for (const m of moving) m.fn(1); moving.length = 0;
      for (const e of events) { if (e.fired) continue; e.fired = true; if (['flag', 'outfit', 'call', 'goto', 'move', 'cam', 'shot'].includes(e.type)) apply(e, true); }
      if (!done) { done = true; env.onEnd?.(); }
    },
    // для самопроверок: список эффектов, которые обязательно применит skip()
    essentials() { return events.filter((e) => ['flag', 'outfit', 'goto'].includes(e.type) || (e.type === 'call' && e.essential)).map((e) => e.type + ':' + (e.key || e.value || e.fn || '')); },
  };
  return tl;
}
// Помощник: обёртка над объектом THREE для таймлайна (setPos/getPos/play/setOutfit)
export function actorOf(model, { play, setOutfit } = {}) {
  const g = model.group || model;
  return {
    model,
    setPos(p, rotY) { g.position.set(p[0], p[1], p[2]); if (rotY != null) g.rotation.y = rotY; },
    getPos() { return [g.position.x, g.position.y, g.position.z]; },
    getRot() { return g.rotation.y; },
    play(name, opts) { if (play) play(name, opts); else if (model.animator) model.animator.play(name); },
    setOutfit(v) { if (setOutfit) setOutfit(v); else model.setOutfit?.(v); },
  };
}
