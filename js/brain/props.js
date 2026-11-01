import * as THREE from 'three';
import * as k from './kit.js';
import {colors} from './layout.js';
// Explicit procedural stand-ins, never presented as supplied brain_kit assets.
export function makeProp(id,index=0){
 const g=new THREE.Group();g.userData.proceduralFallback=true;
 const b=(n,s,p,c)=>k.box(g,n,s,p,c),c=(n,r,h,p,col)=>k.cylinder(g,n,r,h,p,col),l=(s,w,h,p)=>k.label(g,s,s,w,h,p);
 const dark='#2b2236',metal='#6b5a7a',pink='#ff6fae';
 if(id==='cockpit_chair'){b('Seat',[5,1,4],[0,2.8,0],'#6b4f7a');b('Back',[5,3,1],[0,4.5,-1.5],'#6b4f7a');c('Pedestal',.5,2.3,[0,1.2,0],metal);b('Foot',[5,.3,4],[0,.15,0],dark);}
 else if(id==='eye_monitor'){b('Body',[14,9,3],[0,4.5,0],dark);b('Screen',[12,7,.1],[0,4.5,1.56],'#3a1430');l('ГЛАЗА',7,1.2,[0,10,1.6]);}
 else if(id==='screen_curtains'){for(const x of [-10,10])b('Curtain',[5,22,2],[x,11,0],'#7a2e55');b('Rail',[25,.6,1],[0,22,0],'#d9b45a');}
 else if(id==='gauge_dial'){const dial=c('Dial',3,1,[0,3,0],'#f2ece0');dial.rotation.x=Math.PI/2;const needle=b('Needle',[.14,2.3,.15],[0,3, .62],'#d95a7a');needle.geometry.translate(0,1,0);l(['ПУЛЬС','СОН','БОДРОСТЬ'][index%3],6,1,[0,-.6,.7]);}
 else if(id==='state_light'){b('Case',[4,20,3],[0,10,0],dark);['Red','Yellow','Green'].forEach((n,i)=>k.sphere(g,n,1.2,[0,16-i*6,1.7],['#d95a7a','#d9b45a','#7fd18b'][i]));}
 else if(id==='memory_cabinet'||id==='memory_cabinet_low'){const h=id.endsWith('low')?8:14;b('Cabinet',[9,h,4],[0,h/2,0],dark);['ДЕТСТВО','ПАРОЛИ','СТЫДНОЕ','ПАУКИ — НЕНАВИЖУ'].forEach((t,i)=>{const drawer=new THREE.Group();drawer.name=i===3?'SpiderDrawer':'Drawer';drawer.position.set(0,h-(i+.5)*h/4,2.1);g.add(drawer);k.box(drawer,'Front',[8,h/4-.3,.3],[0,0,0],metal);k.label(drawer,t,t,7.6,h/4-.6,[0,0,.2]);});}
 else if(id==='emotion_cauldron'){const m=k.mesh(g,'Bowl',new THREE.SphereGeometry(5,12,6,0,Math.PI*2,Math.PI/2,Math.PI/2),metal,[0,5,0]);m.material.side=THREE.DoubleSide;c('Liquid',4.6,.15,[0,4.8,0],pink);for(let i=0;i<6;i++)k.sphere(g,'Bubble'+i,.4,[Math.sin(i)*3,5,Math.cos(i)*3],pink);l('КОТЁЛ ЭМОЦИЙ',10,1.2,[0,1,4.5]);}
 else if(id==='mind_core')k.mesh(g,'Core',new THREE.IcosahedronGeometry(7,1),pink,[0,0,0],{emissive:pink,emissiveIntensity:.9});
 else if(id==='thought_book'){b('Pages',[2,.4,3],[0,.25,0],'#f2ece0');b('Cover',[2.2,.1,3.2],[0,.55,0],colors[index%4]);b('Bottom',[2.2,.1,3.2],[0,0,0],colors[index%4]);}
 else if(id==='neuro_lamp'||id==='panel_lamp'){const r=id==='panel_lamp'?1.7:4;c('Shade',r,1.5,[0,1,0],metal);const bulb=c('Bulb',r*.7,.2,[0,.2,0],'#ffd0f0');bulb.material.emissive.set('#ffd0f0');bulb.material.emissiveIntensity=.6;}
 else if(id==='defenders_bench'){b('Seat',[20,1,4],[0,3,0],metal);for(const x of [-8,8])b('Leg',[1,3,3],[x,1.5,0],dark);b('Back',[20,3,1],[0,5,-1.5],metal);}
 else if(id==='no_entry_sign'||id==='warning_sign'){const large=id==='no_entry_sign',h=large?16:7,w=large?9:7,plate=large?3:2.5;c('Pole',.15,h,[0,h/2,0],metal);b('Sign',[w,plate,.4],[0,h-plate/2,0],'#d95a7a');l(large?'ПОСТОРОННИМ В ГОЛОВЕ НЕ МЕСТО':index?'ВЫСОКОЕ НАПРЯЖЕНИЕ МЫСЛИ':'ОСТОРОЖНО: РЕФЛЕКСЫ',w-.4,plate-.3,[0,h-plate/2,.23]);}
 else if(id==='thought_tape_roll'){const roll=c('Roll',1.5,3,[0,1.5,0],'#f2ece0');roll.rotation.z=Math.PI/2;}
 else if(id==='wake_alarm'){const m=c('Clock',2.3,1,[0,2.5,0],'#d9b45a');m.rotation.x=Math.PI/2;b('Hammer',[.2,1,.2],[0,4.5,0],metal);}
 else if(id==='neuro_modem'){b('Case',[8,2.5,4],[0,1.25,0],dark);for(let i=0;i<4;i++)k.sphere(g,'LED'+i,.2,[-2.5+i*1.5,1.2,2.1],colors[i]);}
 return g;
}
