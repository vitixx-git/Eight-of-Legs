import {makeHuman} from './human.js';
export function createFear(opts={}) {
 return makeHuman({...opts,name:'DEF_FEAR',simple:true,sweater:true,sleevesCoverHands:true,bigEyes:true});
}
