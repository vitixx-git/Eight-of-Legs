// S03 «Кто здесь главный?» — потактная таблица (docs/PLAN.md §6.2). Координаты — js/brain/layout.js (polar).
// Защитники (12 см) стоят в ряд у пульта, паук (3 см) — перед ними. Камера на уровне глаз защитников.
export const DEF_POS = [[-12, 0, -8], [0, 0, -8], [12, 0, -8]];
export const SPIDER_POS = [0, 0, 4];
export default {
  dur: 12,
  events: [
    { t: 0, type: 'shot', p: [0, 30, 70], at: [0, 8, -8], fov: 50 },
    { t: 0, type: 'music', id: 'M_BRAIN' }, { t: 0, type: 'amb', id: 'AMB_BRAIN' },
    { t: 0.1, type: 'cam', dur: 2.6, to: { p: [0, 12, 30], at: [0, 6.5, -8] }, ease: 'inOutCubic' },
    { t: 0.4, type: 'anim', actor: 'spider', name: 'walk' },
    { t: 0.4, type: 'move', actor: 'spider', dur: 1.8, to: [0, 0, 4], rotY: Math.PI },
    { t: 2.0, type: 'anim', actor: 'spider', name: 'idle' },
    { t: 0.6, type: 'anim', actor: 'reflex', name: 'intro' }, { t: 0.6, type: 'call', fn: 'plate', args: ['reflex'] },
    { t: 1.0, type: 'anim', actor: 'fear', name: 'intro' }, { t: 1.0, type: 'call', fn: 'plate', args: ['fear'] },
    { t: 1.4, type: 'anim', actor: 'will', name: 'intro' }, { t: 1.4, type: 'call', fn: 'plate', args: ['will'] },
    { t: 0.7, type: 'sfx', id: 'BRN_TALK_BLIP' }, { t: 1.1, type: 'sfx', id: 'BRN_TALK_BLIP', opts: { rate: 1.2 } }, { t: 1.5, type: 'sfx', id: 'BRN_TALK_BLIP', opts: { rate: 0.8 } },
    // Рефлекс
    { t: 2.9, type: 'shot', p: [-9, 10.5, 12], at: [-12, 9, -8], fov: 42 },
    { t: 2.9, type: 'call', fn: 'focus', args: ['reflex'] },
    { t: 3.0, type: 'sfx', id: 'REF_INTRO' },
    { t: 3.0, type: 'sub', key: 'sub.meet.reflex', who: 'name.reflex', dur: 2.2 },
    { t: 3.1, type: 'call', fn: 'attack', args: ['reflex', 'hammerDash'] },
    { t: 3.0, type: 'cam', dur: 2.2, to: { p: [-10, 10.5, 8], at: [-12, 9.5, -8] }, ease: 'inOutQuad' },
    // Страх
    { t: 5.3, type: 'shot', p: [-3, 10, 9], at: [-12, 9, -11], fov: 42 },
    { t: 5.3, type: 'call', fn: 'focus', args: ['fear'] },
    { t: 5.4, type: 'sfx', id: 'FEAR_WHIMPER' },
    { t: 5.4, type: 'sub', key: 'sub.meet.fear', who: 'name.fear', dur: 2.2 },
    { t: 5.4, type: 'cam', dur: 2.2, to: { p: [-5, 10, 6], at: [-12, 9, -11] }, ease: 'inOutQuad' },
    // Воля
    { t: 7.7, type: 'shot', p: [9, 12, 13], at: [12, 10, -8], fov: 42 },
    { t: 7.7, type: 'call', fn: 'focus', args: ['will'] },
    { t: 7.7, type: 'anim', actor: 'will', name: 'talk' },
    { t: 7.8, type: 'sfx', id: 'WILL_INTRO' },
    { t: 7.8, type: 'sub', key: 'sub.meet', who: 'name.will', dur: 2.2 },
    { t: 7.8, type: 'cam', dur: 2.2, to: { p: [10, 11.5, 9], at: [12, 10, -8] }, ease: 'inOutQuad' },
    // общий план и кнопка
    { t: 10.0, type: 'shot', p: [0, 12, 30], at: [0, 6.5, -8], fov: 50 },
    { t: 10.0, type: 'call', fn: 'focus', args: [null] },
    { t: 10.0, type: 'anim', actor: 'will', name: 'guard' },
    { t: 10.0, type: 'anim', actor: 'reflex', name: 'idle' },
    { t: 10.1, type: 'sfx', id: 'CUT_STING' },
    { t: 10.1, type: 'cam', dur: 1.8, to: { p: [0, 11.5, 27], at: [0, 6.5, -8] }, ease: 'outQuad' },
    { t: 10.5, type: 'flag', key: 'meetSeen', value: true },
    { t: 10.5, type: 'call', fn: 'button', essential: true },
  ],
};
