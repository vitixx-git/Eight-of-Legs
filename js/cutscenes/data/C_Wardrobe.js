// C_Wardrobe «Выглядеть человеком» (12 с) — потактная таблица (docs/PLAN.md §6.4). Мировые координаты дома (см):
// коридор 2-го этажа y 300, гардероб x −400, z 108 (дверцы к +x). Человек выходит из ванной (−255, 300, 0).
const Y = 300;
export const HUMAN_START = [-255, Y, 0];
export default {
  dur: 12,
  events: [
    { t: 0, type: 'shot', p: [-180, Y + 260, 560], at: [-320, Y + 90, 70], fov: 42 },
    { t: 0, type: 'music', id: 'M_HOUSE' }, { t: 0, type: 'amb', id: 'AMB_HOUSE_MORNING' },
    { t: 0.2, type: 'anim', actor: 'human', name: 'walk' },
    { t: 0.2, type: 'move', actor: 'human', dur: 2.1, to: [-332, Y, 104], rotY: -Math.PI / 2, ease: 'inOutQuad' },
    { t: 1.0, type: 'cam', dur: 1.8, to: { p: [-230, Y + 230, 470], at: [-365, Y + 100, 100] }, ease: 'inOutQuad' },
    { t: 2.3, type: 'anim', actor: 'human', name: 'idle' },
    { t: 2.5, type: 'call', fn: 'doors', args: [1] }, { t: 2.5, type: 'sfx', id: 'HOUSE_DOOR_OPEN' },
    { t: 3.0, type: 'anim', actor: 'human', name: 'walk' },
    { t: 3.0, type: 'move', actor: 'human', dur: 0.9, to: [-388, Y, 108], rotY: -Math.PI / 2, ease: 'inQuad' },
    { t: 3.9, type: 'call', fn: 'hide', essential: true },
    { t: 3.9, type: 'call', fn: 'doors', args: [0] }, { t: 4.0, type: 'sfx', id: 'HOUSE_DOOR_CLOSE' },
    { t: 4.3, type: 'call', fn: 'rattle', args: [2.6] }, { t: 4.3, type: 'sfx', id: 'HOUSE_WARDROBE_RATTLE' },
    { t: 4.7, type: 'sfx', id: 'HUM_CLOTH' }, { t: 5.5, type: 'sfx', id: 'HUM_CLOTH', opts: { rate: 1.1 } },
    { t: 5.2, type: 'shot', p: [-235, Y + 205, 460], at: [-372, Y + 95, 112], fov: 42 },
    { t: 6.3, type: 'call', fn: 'sock' }, { t: 6.3, type: 'sfx', id: 'HOUSE_SOCK_POP' },
    { t: 6.8, type: 'sub', key: 'sub.wardrobe', who: 'name.spider', dur: 2.4 },
    { t: 7.4, type: 'outfit', actor: 'human', value: 'work' },
    { t: 7.4, type: 'flag', key: 'dressed', value: true },
    { t: 7.9, type: 'shot', p: [-215, Y + 235, 480], at: [-345, Y + 100, 100], fov: 42 },
    { t: 8.0, type: 'call', fn: 'doors', args: [1] }, { t: 8.0, type: 'sfx', id: 'HOUSE_DOOR_OPEN' },
    { t: 8.1, type: 'call', fn: 'show', essential: true },
    { t: 8.2, type: 'anim', actor: 'human', name: 'walk' },
    { t: 8.2, type: 'move', actor: 'human', dur: 1.1, to: [-318, Y, 108], rotY: Math.PI / 2, ease: 'outQuad' },
    { t: 9.3, type: 'anim', actor: 'human', name: 'adjustGlasses' },
    { t: 9.3, type: 'call', fn: 'doors', args: [0] },
    { t: 9.3, type: 'cam', dur: 1.7, to: { p: [-205, Y + 185, 385], at: [-326, Y + 130, 108] }, ease: 'inOutQuad' },
    { t: 9.6, type: 'sfx', id: 'HUM_CLOTH' },
    { t: 10.2, type: 'anim', actor: 'human', name: 'idle' },
    { t: 11.3, type: 'fade', to: 1, dur: 0.6 },
    { t: 12, type: 'goto' },
  ],
};
