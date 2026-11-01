// Сохранения v1 (localStorage vosem_lap_save_v1). Чтение в try/catch, строгая проверка.
export const FLAG_KEYS = ['memorySeen', 'meetSeen', 'leversDone', 'dressed', 'mirrorDone', 's10_stopped', 's10_inserted', 'poisonDestroyed'];
export function freshSave(now = Date.now()) {
  return { v: 1, scene: 'S01_Intro', checkpoint: 'start',
    flags: Object.fromEntries(FLAG_KEYS.map((k) => [k, false])),
    items: { pass: false, notebook: false, keys: false },
    stats: { startedAt: now, playMs: 0, retries: 0 }, completed: false, updatedAt: now };
}
// Каждый защитник — отдельная контрольная точка. Продолжение не откатывает пройденные бои.
export function safePoint(scene, checkpoint) {
  if (scene === 'S04_Reflex' || scene === 'S05_Fear' || scene === 'S06_Will') return { scene, checkpoint: 'start' };
  if (scene === 'S09_Road') return { scene: 'S09_Road', checkpoint: 'start' };
  return { scene, checkpoint };
}
export function validate(data, checkpointsOf) {
  if (!data || typeof data !== 'object') return 'not-object';
  if (data.v !== 1) return 'version';
  const cps = checkpointsOf(data.scene);
  if (!cps) return 'scene';
  if (!cps.includes(data.checkpoint)) return 'checkpoint';
  if (!data.flags || typeof data.flags !== 'object') return 'flags';
  if (!data.items || typeof data.items !== 'object') return 'items';
  if (!data.stats || typeof data.stats !== 'object' || !Number.isFinite(data.stats.playMs)) return 'stats';
  return null;
}
export function createSave({ key, checkpointsOf, storage }) {
  let store = storage;
  if (store === undefined) { try { store = window.localStorage; const k = '__vl_probe'; store.setItem(k, '1'); store.removeItem(k); } catch { store = null; } }
  const api = {
    data: null, available: !!store, corrupt: false, lastError: null,
    load() {
      api.corrupt = false; api.data = null;
      if (!store) return null;
      let raw = null;
      try { raw = store.getItem(key); } catch (e) { api.lastError = e; return null; }
      if (raw == null) return null;
      try {
        const d = JSON.parse(raw);
        const err = validate(d, checkpointsOf);
        if (err) { api.corrupt = true; api.lastError = err; return null; }
        for (const k of FLAG_KEYS) d.flags[k] = !!d.flags[k];
        d.items = { pass: !!d.items.pass, notebook: !!d.items.notebook, keys: !!d.items.keys };
        d.stats.retries = Number.isFinite(d.stats.retries) ? d.stats.retries : 0;
        d.stats.startedAt = Number.isFinite(d.stats.startedAt) ? d.stats.startedAt : Date.now();
        api.data = d; return d;
      } catch (e) { api.corrupt = true; api.lastError = 'json'; return null; }
    },
    newGame() { api.data = freshSave(); api.write(); return api.data; },
    ensure() { if (!api.data) api.data = freshSave(); return api.data; },
    write() {
      if (!api.data) return false;
      api.data.updatedAt = Date.now();
      if (!store) return false;
      try { store.setItem(key, JSON.stringify(api.data)); return true; } catch (e) { api.lastError = e; return false; }
    },
    setPoint(scene, checkpoint) { const d = api.ensure(); d.scene = scene; d.checkpoint = checkpoint; api.write(); },
    setFlag(k, v = true) { const d = api.ensure(); d.flags[k] = v; api.write(); },
    flag(k) { return !!api.data?.flags?.[k]; },
    setItem(k, v = true) { const d = api.ensure(); d.items[k] = v; api.write(); },
    addRetry() { const d = api.ensure(); d.stats.retries++; api.write(); },
    // игра пройдена (титры после уничтожения яда): меню предлагает начать заново
    markCompleted() { const d = api.ensure(); d.completed = true; api.write(); },
    addPlayMs(ms) { if (api.data) api.data.stats.playMs += ms; },
    clear() { api.data = null; if (store) try { store.removeItem(key); } catch {} },
    continuePoint() { if (!api.data) return null; return safePoint(api.data.scene, api.data.checkpoint); },
  };
  return api;
}
