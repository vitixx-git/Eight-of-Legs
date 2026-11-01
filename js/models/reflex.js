import {makeHuman} from './human.js';
export function createReflex(opts={}){return makeHuman({...opts,name:'DEF_REFLEX',simple:true});}
