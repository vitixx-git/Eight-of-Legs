// C_LabEntry «Вход в лабораторию» (10 с) — потактная таблица (docs/PLAN.md §6.6).
// Снаружи (координаты улицы, env/street.js): фасад x −2300, двери z −190…−30, считыватель (−2295, 70, −232).
// Внутри (координаты лаборатории, js/lab): комната x ±300, z ±225, дверь (300, 0, 100), шкаф (−230, 0, 202),
// паутинка на шкафу (−230, 202, 190).
export const HUMAN_START = [-2135, -58, -120];
const W = -58, L = -Math.PI / 2;
export default {
  dur: 10,
  events: [
    { t: 0, type: 'shot', p: [-1975, 135, -430], at: [-2282, 118, -185], fov: 38 },
    { t: 0, type: 'amb', id: 'AMB_STREET' }, { t: 0, type: 'call', fn: 'reverb', args: ['street'] },
    { t: 0.05, type: 'anim', actor: 'human', name: 'walk' },
    { t: 0.05, type: 'move', actor: 'human', dur: 1.5, to: [-2262, W, -216], rotY: L, ease: 'outQuad' },
    // пропуск у считывателя: LED красный → зелёный
    { t: 1.6, type: 'anim', actor: 'human', name: 'useConsole' }, { t: 1.6, type: 'call', fn: 'card', args: [true] },
    { t: 1.75, type: 'shot', p: [-2222, 98, -400], at: [-2290, 74, -226], fov: 32 },
    { t: 2.0, type: 'sfx', id: 'LAB_CARD_BEEP' },
    { t: 2.35, type: 'call', fn: 'led', args: [true], essential: true }, { t: 2.35, type: 'sfx', id: 'LAB_LED_GREEN' },
    { t: 2.4, type: 'sub', key: 'sub.labentry', dur: 1.6 },
    { t: 2.75, type: 'call', fn: 'card', args: [false] }, { t: 2.75, type: 'anim', actor: 'human', name: 'idle' },
    // двери разъезжаются
    { t: 2.85, type: 'shot', p: [-1945, 150, -70], at: [-2300, 125, -112], fov: 40 },
    { t: 2.85, type: 'call', fn: 'door', args: [1] }, { t: 2.85, type: 'sfx', id: 'LAB_DOOR_SLIDE' },
    { t: 3.3, type: 'anim', actor: 'human', name: 'walk' },
    { t: 3.3, type: 'move', actor: 'human', dur: 0.6, to: [-2256, W, -112], rotY: L, ease: 'inOutQuad' },
    { t: 3.9, type: 'move', actor: 'human', dur: 0.6, to: [-2297, W, -110], rotY: L, ease: 'linear' },
    { t: 3.95, type: 'fade', to: 1, dur: 0.35 },
    // внутри: знакомая лаборатория
    { t: 4.4, type: 'call', fn: 'inside', essential: true },
    { t: 4.4, type: 'shot', p: [235, 235, 345], at: [-70, 95, -30], fov: 50 },
    { t: 4.45, type: 'fade', to: 0, dur: 0.45 },
    { t: 4.45, type: 'music', id: 'M_LAB' }, { t: 4.45, type: 'amb', id: 'AMB_LAB' },
    { t: 4.5, type: 'sfx', id: 'LAB_DOOR_SLIDE', opts: { vol: 0.45, rate: 1.1 } },
    { t: 4.5, type: 'anim', actor: 'human', name: 'walk' },
    { t: 4.5, type: 'move', actor: 'human', dur: 1.7, to: [196, 0, 72], rotY: -Math.PI / 2 - 0.35, ease: 'outQuad' },
    { t: 4.6, type: 'cam', dur: 2.0, to: { p: [205, 225, 320], at: [-110, 110, 10] }, ease: 'inOutQuad' },
    { t: 5.2, type: 'sub', key: 'sub.labentry2', who: 'name.spider', dur: 2.4 },
    { t: 6.2, type: 'anim', actor: 'human', name: 'adjustGlasses' },
    // камера задерживается на верхе шкафа с паутинкой
    { t: 6.7, type: 'call', fn: 'frontWall', args: [true] },
    { t: 6.7, type: 'shot', p: [-30, 250, -30], at: [-230, 190, 190], fov: 44 },
    { t: 6.75, type: 'cam', dur: 2.5, to: { p: [-112, 252, 70], at: [-230, 200, 192], fov: 38 }, ease: 'inOutQuad' },
    { t: 7.0, type: 'call', fn: 'glint' },
    { t: 7.0, type: 'anim', actor: 'human', name: 'idle' },
    { t: 9.4, type: 'fade', to: 1, dur: 0.6 },
    { t: 10, type: 'goto' },
  ],
};
