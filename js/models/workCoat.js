import * as THREE from 'three';
import {coatPanel} from './humanKit.js';
// Same closed bodice, pocket and pens at both scales; caller owns materials/outfit visibility.
export function addWorkCoat({mesh,coat,penRed,penBlue,parent,pocketParent=parent,scale=1,steps=12,rings}){
 const s=scale;
 const defaults=[{y:32,w:19.5,d:12.5,open:.34},{y:23,w:21,d:15,open:.24},{y:2,w:20,d:15,open:.08},{y:-17,w:19.5,d:15,open:.04}];
 const rs=rings||defaults.map(r=>({...r,y:r.y*s,w:r.w*s,d:r.d*s}));
 mesh('CoatBodice',coatPanel(rs,0,Math.PI*2,[0,0,0],steps,1.2*s),coat,parent);
 mesh('Pocket',new THREE.BoxGeometry(8*s,8*s,s),coat,pocketParent,[10*s,-3*s,15*s]);
 for(const [i,m] of [penRed,penBlue].entries())mesh('Pen'+i,new THREE.CylinderGeometry(.55*s,.55*s,7*s,steps===12?6:4),m,pocketParent,[(8+i*3)*s,s,16*s],false);
}
