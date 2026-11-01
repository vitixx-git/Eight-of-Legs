// C_ExitHome «Выход из дома» (11 с) — потактная таблица (docs/PLAN.md §6.5). Мировые координаты дома (см):
// входная дверь x −430, z −110; крыльцо y 0, три ступени (−15, −30, −45), дорожка и тротуар y −58 (env/street.js).
// Человек выходит, спускается по 3 ступеням, идёт к бордюру (x −866). Камера показывает дорогу и лабораторию №3.
export const HUMAN_START = [-395, 0, -110];
const W = -58, Z = -110, L = -Math.PI / 2; // курс «на запад» (к дороге)
export default {
  dur: 11,
  events: [
    { t: 0, type: 'shot', p: [-770, 90, 200], at: [-430, 105, -110], fov: 40 },
    { t: 0, type: 'music', id: 'M_HOUSE' }, { t: 0, type: 'amb', id: 'AMB_STREET' },
    { t: 0, type: 'call', fn: 'outside' },
    { t: 0.3, type: 'call', fn: 'door', args: [1] }, { t: 0.3, type: 'sfx', id: 'HOUSE_FRONT_DOOR' },
    { t: 0.7, type: 'anim', actor: 'human', name: 'walk' },
    { t: 0.7, type: 'move', actor: 'human', dur: 1.1, to: [-482, 0, Z], rotY: L, ease: 'inQuad' },
    { t: 1.4, type: 'cam', dur: 1.7, to: { p: [-830, 140, 250], at: [-575, 55, Z] }, ease: 'inOutQuad' },
    // три ступени
    { t: 1.8, type: 'move', actor: 'human', dur: 0.34, to: [-535, -15, Z], ease: 'linear' }, { t: 1.95, type: 'sfx', id: 'HUM_STEP_STAIR' },
    { t: 2.14, type: 'move', actor: 'human', dur: 0.34, to: [-565, -30, Z], ease: 'linear' }, { t: 2.3, type: 'sfx', id: 'HUM_STEP_STAIR' },
    { t: 2.48, type: 'move', actor: 'human', dur: 0.34, to: [-595, -45, Z], ease: 'linear' }, { t: 2.64, type: 'sfx', id: 'HUM_STEP_STAIR' },
    { t: 2.82, type: 'move', actor: 'human', dur: 0.34, to: [-630, W, Z], ease: 'linear' },
    { t: 3.3, type: 'call', fn: 'door', args: [0] }, { t: 3.6, type: 'sfx', id: 'HOUSE_DOOR_CLOSE', opts: { vol: 0.6 } },
    // дорожка → бордюр; камера раскрывает улицу
    { t: 3.16, type: 'move', actor: 'human', dur: 2.6, to: [-866, W, Z], ease: 'outQuad' },
    { t: 3.3, type: 'cam', dur: 2.9, to: { p: [-590, 172, -28], at: [-1700, 112, Z] }, ease: 'inOutQuad' },
    { t: 5.4, type: 'call', fn: 'car', args: [2, 2300, -2900, 2.8] },
    { t: 5.8, type: 'anim', actor: 'human', name: 'idle' },
    { t: 5.95, type: 'sfx', id: 'ROAD_PASSBY', opts: { vol: 0.9 } },
    { t: 6.0, type: 'sub', key: 'sub.exithome', who: 'name.spider', dur: 2.8 },
    // вывеска «ЛАБОРАТОРИЯ №3» крупно
    { t: 7.6, type: 'shot', p: [-1500, 300, 160], at: [-2295, 288, Z], fov: 32 },
    { t: 7.7, type: 'cam', dur: 1.8, to: { p: [-1590, 292, 105], at: [-2295, 284, Z], fov: 30 }, ease: 'inOutQuad' },
    // человек у бордюра поправляет очки
    { t: 9.5, type: 'shot', p: [-1070, 85, 60], at: [-866, 95, Z], fov: 40 },
    { t: 9.6, type: 'anim', actor: 'human', name: 'adjustGlasses' },
    { t: 10.4, type: 'fade', to: 1, dur: 0.6 },
    { t: 11, type: 'goto' },
  ],
};
