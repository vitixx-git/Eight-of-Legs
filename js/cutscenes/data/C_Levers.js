// C_Levers «Слишком много рычагов» — потактная таблица (docs/PLAN.md §6.3). Время таймлайна = время мозга
// (brain.setTimeline): барьер гаснет 1,2 с; панели 5,5/5,8/6,1; дрожь датчика «РОТ» 7–8,5; пробуждение 11,5;
// янтарный свет 14–16,5. Снаружи (спальня): палец дёргается, глаза открываются, человек садится, рассвет.
export const SPIDER_START = [0, 0, 8];
export const CHAIR_SEAT = [0, 3.2, -26];
export default {
  dur: 18,
  events: [
    { t: 0, type: 'call', fn: 'world', args: ['brain'] },
    { t: 0, type: 'shot', p: [0, 9, 30], at: [0, 6, -26], fov: 50 },
    { t: 0, type: 'music', id: 'M_BRAIN' }, { t: 0, type: 'amb', id: 'AMB_BRAIN' },
    { t: 1.2, type: 'sfx', id: 'BRN_BARRIER_OFF' },
    { t: 1.5, type: 'anim', actor: 'spider', name: 'walk' },
    { t: 1.5, type: 'move', actor: 'spider', dur: 2.2, to: [0, 0, -19], rotY: Math.PI, ease: 'inOutQuad' },
    { t: 1.5, type: 'cam', dur: 2.5, to: { p: [7, 8, -4], at: [0, 4, -28] }, ease: 'inOutQuad' },
    { t: 3.7, type: 'anim', actor: 'spider', name: 'sitChair' },
    { t: 3.7, type: 'move', actor: 'spider', dur: 0.8, to: [0, 3.2, -26], rotY: Math.PI, ease: 'outQuad' },
    { t: 4.3, type: 'sfx', id: 'BRN_CHAIR' },
    { t: 4.6, type: 'anim', actor: 'spider', name: 'idle' },
    { t: 4.8, type: 'shot', p: [0, 9.5, -17], at: [0, 7, -33], fov: 45 },
    { t: 5.5, type: 'sfx', id: 'BRN_PANEL_ON' }, { t: 5.8, type: 'sfx', id: 'BRN_PANEL_ON', opts: { rate: 1.12 } }, { t: 6.1, type: 'sfx', id: 'BRN_PANEL_ON', opts: { rate: 1.25 } },
    // лапа к «РОТ — НЕ ТРОГАТЬ» и отдёргивается
    { t: 6.6, type: 'shot', p: [6, 9, -21], at: [7.5, 6.5, -30], fov: 40 },
    { t: 6.8, type: 'call', fn: 'paw', args: [1] },
    { t: 7.2, type: 'sfx', id: 'UI_DENY' },
    { t: 7.3, type: 'sub', key: 'sub.levers.mouth', who: 'name.spider', dur: 1.9 },
    { t: 7.5, type: 'call', fn: 'paw', args: [0] },
    // рычаги РУКИ и ГЛАЗА
    { t: 8.6, type: 'shot', p: [-3, 12, -19], at: [0, 6.5, -31], fov: 42 },
    { t: 8.9, type: 'anim', actor: 'spider', name: 'pullLever' },
    { t: 8.9, type: 'call', fn: 'lever', args: [1] },
    { t: 9.1, type: 'sfx', id: 'BRN_LEVER' },
    { t: 10.0, type: 'anim', actor: 'spider', name: 'pullLever' },
    { t: 10.0, type: 'call', fn: 'lever', args: [2] },
    { t: 10.2, type: 'sfx', id: 'BRN_LEVER', opts: { rate: 1.1 } },
    { t: 10.8, type: 'shot', p: [0, 12.5, -31], at: [0, 14, -50], fov: 45 },
    { t: 10.9, type: 'cam', dur: 0.8, to: { p: [0, 13, -35], at: [0, 14, -50] }, ease: 'outQuad' },
    { t: 11.5, type: 'music', id: 'M_COCKPIT' },
    // снаружи: спальня
    { t: 11.8, type: 'call', fn: 'world', args: ['bedroom'] },
    { t: 11.8, type: 'call', fn: 'handShot' },
    { t: 11.8, type: 'anim', actor: 'sleeper', name: 'fingerTwitch' },
    { t: 11.8, type: 'amb', id: 'AMB_BEDROOM' },
    { t: 12.5, type: 'shot', p: [26, 98, -56], at: [0, 76, -86], fov: 40 },
    { t: 12.6, type: 'anim', actor: 'sleeper', name: 'wakeEyes' },
    { t: 12.7, type: 'sfx', id: 'BRN_EYE_OPEN' },
    { t: 13.3, type: 'shot', p: [-130, 150, 130], at: [70, 80, -60], fov: 50 },
    { t: 13.3, type: 'call', fn: 'dawn', args: [13.3, 16.2] },
    { t: 13.4, type: 'anim', actor: 'sleeper', name: 'sitUp' },
    { t: 13.5, type: 'sfx', id: 'BRN_SIT_UP' },
    { t: 13.7, type: 'sfx', id: 'BRN_DAWN' },
    { t: 14.6, type: 'sfx', id: 'HUM_YAWN' },
    { t: 13.4, type: 'cam', dur: 2.2, to: { p: [-110, 140, 100], at: [60, 90, -60] }, ease: 'inOutQuad' },
    // снова кабина
    { t: 15.6, type: 'call', fn: 'world', args: ['brain'] },
    { t: 15.6, type: 'shot', p: [5, 15, -13], at: [0, 5, -29], fov: 50 },
    { t: 15.6, type: 'amb', id: 'AMB_COCKPIT' },
    { t: 15.8, type: 'sub', key: 'sub.levers', who: 'name.spider', dur: 2.0 },
    { t: 15.9, type: 'sfx', id: 'SPD_CHEER' },
    { t: 16.0, type: 'flag', key: 'leversDone', value: true },
    { t: 16.0, type: 'cam', dur: 2.0, to: { p: [2, 17, -9], at: [0, 9, -40] }, ease: 'inOutQuad' },
    { t: 18, type: 'goto' },
  ],
};
