// Простая шина событий. count() — для test.leaks.
export function createEvents() {
  const map = new Map();
  const ev = {
    on(type, fn) { if (!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); return () => ev.off(type, fn); },
    once(type, fn) { const off = ev.on(type, (p) => { off(); fn(p); }); return off; },
    off(type, fn) { const s = map.get(type); if (s) { s.delete(fn); if (!s.size) map.delete(type); } },
    emit(type, payload) { const s = map.get(type); if (!s) return; for (const fn of [...s]) { try { fn(payload); } catch (e) { console.error('[events]', type, e); } } },
    clear(type) { if (type) map.delete(type); else map.clear(); },
    count() { let n = 0; for (const s of map.values()) n += s.size; return n; },
  };
  return ev;
}
// Учёт слушателей window/document — для test.leaks.
export const listenerStats = { window: 0 };
export function listen(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  if (target === window || target === document) listenerStats.window++;
  return () => { target.removeEventListener(type, fn, opts); if (target === window || target === document) listenerStats.window--; };
}
