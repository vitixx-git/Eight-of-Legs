// Ввод: e.code (раскладка не важна — русская тоже), действия, «грязные» клавиши, blur.
import { listen } from './events.js';
export const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'shift', ShiftRight: 'shift', Space: 'action', KeyE: 'use', Escape: 'pause', Enter: 'confirm', NumpadEnter: 'confirm',
  F1: 'dbg1', F2: 'dbg2', F3: 'dbg3', F4: 'dbg4', F5: 'dbg5', F6: 'dbg6',
};
const GAME_CODES = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'Tab']);

export function createInput(target = window) {
  const held = new Set();       // физически удерживаемые коды
  const dirty = new Set();      // удерживаются, но считаются отпущенными до фактического отпускания
  const queuePressed = new Set(), queueReleased = new Set();
  let pressed = new Set(), released = new Set();
  const anyKeyQueue = [];
  const offs = [];
  const actionOf = (code) => KEYMAP[code];
  const inp = {
    enabled: true, lastDevice: 'keyboard', anyKey: false,
    handleKey(e, isDown) {
      const code = e.code;
      if (!code) return;
      if (GAME_CODES.has(code) && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || ''))) e.preventDefault();
      const a = actionOf(code);
      if (isDown) {
        if (e.repeat) return;
        held.add(code);
        if (a) queuePressed.add(a);
        if (code !== 'Escape') anyKeyQueue.push(code);
      } else {
        held.delete(code);
        if (dirty.has(code)) { dirty.delete(code); return; }
        if (a) queueReleased.add(a);
      }
    },
    // вызывается в начале каждого фиксированного шага
    beginStep() {
      pressed = new Set(queuePressed); released = new Set(queueReleased);
      queuePressed.clear(); queueReleased.clear();
      inp.anyKey = anyKeyQueue.length > 0; anyKeyQueue.length = 0;
    },
    endStep() { pressed.clear(); released.clear(); inp.anyKey = false; },
    down(a) { for (const c of held) if (!dirty.has(c) && actionOf(c) === a) return true; return false; },
    pressed(a) { return pressed.has(a); },
    released(a) { return released.has(a); },
    consume(a) { const had = pressed.has(a) || queuePressed.has(a); pressed.delete(a); queuePressed.delete(a); return had; },
    peekQueued(a) { return queuePressed.has(a); },
    // все удерживаемые клавиши становятся «грязными»
    consumeAll() {
      for (const c of held) dirty.add(c);
      pressed.clear(); released.clear(); queuePressed.clear(); queueReleased.clear(); anyKeyQueue.length = 0; inp.anyKey = false;
    },
    reset() { held.clear(); dirty.clear(); pressed.clear(); released.clear(); queuePressed.clear(); queueReleased.clear(); anyKeyQueue.length = 0; inp.anyKey = false; },
    axis() {
      let x = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
      let y = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
      if (x && y) { const k = Math.SQRT1_2; x *= k; y *= k; }
      return { x, y };
    },
    isHeldCode(code) { return held.has(code) && !dirty.has(code); },
    dispose() { offs.forEach((f) => f()); offs.length = 0; },
    // для самопроверок
    _held: held, _dirty: dirty,
  };
  if (target) {
    offs.push(listen(target, 'keydown', (e) => inp.handleKey(e, true)));
    offs.push(listen(target, 'keyup', (e) => inp.handleKey(e, false)));
    offs.push(listen(target, 'blur', () => inp.reset()));
  }
  return inp;
}
