import {bakeBrain} from './bake.js';
export function bakeArena2D(renderer,brain,variant='REFLEX'){if(!['REFLEX','FEAR','WILL'].includes(variant))throw Error('Неизвестный вариант арены');return bakeBrain(renderer,brain,variant);}
