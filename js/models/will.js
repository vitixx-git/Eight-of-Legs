import {makeHuman} from './human.js';
export function createWill(opts={}){return makeHuman({...opts,name:'DEF_WILL',simple:true,stocky:true,coat:true,shield:true});}
