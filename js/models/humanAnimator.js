import * as THREE from 'three';
import { sample } from '../anim/clip.js';
import {playReflex,updateReflex} from './reflexMotion.js';
import {playFear,updateFear} from './fearMotion.js';
import {playWill,updateWill} from './willMotion.js';
const D=Math.PI/180, clamp=THREE.MathUtils.clamp;
export const humanAnimations=['idle','sleepBreath','toss.arm','toss.turn','toss.head','fingerTwitch','wakeEyes','sitUp','walk','carefulWalk','wobble','fall','bump','resist','bendPick','carry','wash','towel','useConsole','holdButton','adjustGlasses','pour','write'];
const durations={ 'toss.arm':.5,'toss.turn':.5,'toss.head':.5,fingerTwitch:.6,wakeEyes:.8,sitUp:1.6,fall:.9,bump:.3,bendPick:.5,towel:1.5,adjustGlasses:.8 };
export class HumanAnimator {
 constructor(group,joints){this.group=group;this.joints=joints;this.rest={};for(const [n,j] of Object.entries(joints))this.rest[n]={p:j.position.clone(),q:j.quaternion.clone()};this.face='neutral';this.name='idle';this.t=0;this.phase=0;this.nextShift=5;this.shiftStart=-10;}
 setFace(name){if(!['neutral','surprised','tired','angry'].includes(name))throw new Error('Unknown face: '+name);this.face=name;}
 play(name,opts={}){if(this.group.userData.will)return playWill(this,name,opts);if(this.group.userData.fear)return playFear(this,name,opts);if(this.group.userData.simple)return playReflex(this,name,opts);if(!humanAnimations.includes(name))throw new Error('Unknown animation: '+name);this.from={};for(const [n,j] of Object.entries(this.joints))this.from[n]={p:j.position.clone(),q:j.quaternion.clone()};this.name=name;this.opts=opts;this.t=0;this.phase=0;this.completed=false;return this;}
 update(dt,speed=0){if(this.group.userData.will)return updateWill(this,dt);if(this.group.userData.fear)return updateFear(this,dt);if(this.group.userData.simple)return updateReflex(this,dt);dt=clamp(Number.isFinite(dt)?dt:0,0,.1);this.t+=dt;const j=this.joints,t=this.t,n=this.name,o=this.opts||{};
  for(const [key,v] of Object.entries(j)){v.position.copy(this.rest[key].p);v.quaternion.copy(this.rest[key].q);}
  const rot=(key,x=0,y=0,z=0)=>j[key].rotation.set(x*D,y*D,z*D);
  for(const [s,k] of [['L',1],['R',-1]])rot('shoulder.'+s,0,0,-k*75);
  const reach=(s,angle=60,bend=70)=>{rot('shoulder.'+s,0,-(s==='L'?1:-1)*angle,-(s==='L'?1:-1)*30);rot('elbow.'+s,0,-(s==='L'?1:-1)*bend,0);};
  // Two-link reach in chest space; elbow pole stays outside the torso.
  const pointHand=(s,target,weight=1)=>{
   const shoulder=j['shoulder.'+s],elbow=j['elbow.'+s],k=s==='L'?1:-1;
   const delta=target.clone().sub(shoulder.position),d=clamp(delta.length(),3,53.8),dir=delta.normalize();
   const pole=new THREE.Vector3(k*.55,-1,0);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
   const along=(28*28-26*26+d*d)/(2*d),height=Math.sqrt(Math.max(0,28*28-along*along));
   const upper=dir.clone().multiplyScalar(along).addScaledVector(pole,height),lower=dir.clone().multiplyScalar(d).sub(upper);
   const axis=new THREE.Vector3(k,0,0),q=new THREE.Quaternion().setFromUnitVectors(axis,upper.normalize());
   const e=q.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(axis,lower.normalize()));
   shoulder.quaternion.slerp(q,weight);elbow.quaternion.slerp(e,weight);
  };
  const facePoint=(x,y,z)=>{this.group.updateMatrixWorld(true);return j.chest.worldToLocal(j.head.localToWorld(new THREE.Vector3(x,y,z)));};
  const towel=this.group.getObjectByName('FaceTowel');if(towel)towel.visible=n==='towel';
  let lid=0;
  if(n==='idle'){j.chest.position.y+=Math.sin(t*Math.PI*.5);if(t>this.nextShift){this.shiftStart=t;this.nextShift=t+4+Math.random()*3;}rot('spine',0,0,Math.sin(clamp((t-this.shiftStart)/1.8,0,1)*Math.PI)*2);}
  // Лёжа на спине (o.supine): голова к −Z, лицо вверх; root на высоте o.bedHeight. Те же toss.*, fingerTwitch, wakeEyes.
  const lying=o.supine&&(n==='sleepBreath'||n.startsWith('toss.')||n==='fingerTwitch'||n==='wakeEyes');
  if(lying){
   rot('root',-90,0,0);j.root.position.y=o.bedHeight??66;rot('neck',o.neck??20);j.chest.position.z+=.8*Math.sin(t*Math.PI*.5);
   for(const [s,k] of [['L',1],['R',-1]]){rot('shoulder.'+s,0,0,-k*82);rot('ankle.'+s,40);}
   if(n!=='wakeEyes')lid=80;
   // o.armOut: левая рука поверх одеяла (кисть на животе) — чтобы было видно, как дёргается палец
   if(o.armOut){const a=Array.isArray(o.armOut)?o.armOut:[2,-20,16];pointHand('L',new THREE.Vector3(a[0],a[1],a[2]));}
   if(n==='toss.arm'){const u=sample([[0,0],[.2,1],[.5,0]],t);rot('shoulder.L',-40*u,-40*u,-82+60*u);rot('elbow.L',0,-35*u,0);}
   if(n==='toss.turn')j.root.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),sample([[0,0],[.28,35],[.5,0]],t)*D));
   if(n==='toss.head')rot('head',0,sample([[0,0],[.25,25],[.5,0]],t),0);
  }
  else if(n==='sleepBreath'||n.startsWith('toss.')){
   // Lie on the anatomical right side (-X); the left arm is uppermost.
   // Roll about the body's local longitudinal Y axis, not the world vertical.
   rot('root',0,0,90);j.chest.position.y+=1.5*Math.sin(t*Math.PI*.5);lid=80;
   if(n==='toss.arm'){const u=sample([[0,0],[.2,1],[.5,0]],t);rot('shoulder.L',0,-55*u,-75+65*u);rot('elbow.L',0,-35*u,0);}
   if(n==='toss.turn')j.root.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),sample([[0,0],[.28,65],[.5,0]],t)*D));
   if(n==='toss.head')rot('head',0,sample([[0,0],[.25,25],[.5,0]],t),0);
  }
  if(n==='fingerTwitch'){if(o.armOut)j['wrist.L'].rotateX(28*D*Math.sin(Math.min(t/.6,1)*Math.PI*4));else rot('wrist.R',10*Math.sin(Math.min(t/.6,1)*Math.PI*4));}
  if(n==='wakeEyes')lid=sample([[0,80],[.3,15],[.42,80],[.8,0]],t);
  if(n==='sitUp'){
   // Pelvis is the bed-edge anchor. Start on the side, roll supine, then sit.
   // 70 degrees of torso lift from horizontal; legs reach the bed edge first.
   const roll=o.supine?0:sample([[0,1],[.4,0]],t),lift=sample([[0,0],[.25,0],[1.35,1],[1.6,1]],t);
   const lower=o.legsStraight?0:sample([[0,0],[.55,0],[1.45,1],[1.6,1]],t);
   j.root.position.y=o.bedHeight??50;
   rot('root',-90*(1-roll),0,90*roll);
   rot('spine',70*lift);
   for(const [s,k] of [['L',1],['R',-1]]){
    rot('hip.'+s,0);rot('knee.'+s,90*lower);rot('ankle.'+s,-10*lower);
    // Forearms brace beside the hips, then relax onto the lap.
    rot('shoulder.'+s,-15*Math.sin(lift*Math.PI),-k*18*lift,-k*(75-12*Math.sin(lift*Math.PI)));
    rot('elbow.'+s,0,-k*25*lift,0);
   }
   rot('head',sample([[0,0],[.4,0],[1,12],[1.6,5]],t));
  }
  if(n==='walk'||n==='carefulWalk'){
   const careful=n==='carefulWalk',v=Math.max(0,speed),f=(careful?.9:1.8)*v/(careful?60:140);this.phase+=dt*f*Math.PI*2;
   const stride=f>0?v/f:0;
   // Analytic two-link IK. A planted foot travels backwards at the controller's speed.
   for(const [s,k] of [['L',1],['R',-1]]){
    const ph=((this.phase/(Math.PI*2)+(k===1?0:.5))%1+1)%1,stance=ph<.6;
    const z=stance?stride*.3-v*(ph/(f||1)): -stride*.3+stride*.6*((ph-.6)/.4);
    const lift=stance?0:Math.sin((ph-.6)/.4*Math.PI)*(careful?5:10),y=-Math.sqrt(84*84-Math.pow(stride*.3,2))+lift;
    const dist=Math.min(83.99,Math.hypot(z,y)),a=Math.atan2(z,-y),b=Math.acos(clamp(dist/84,-1,1));
    rot('hip.'+s,(-a-b)/D);rot('knee.'+s,2*b/D);rot('ankle.'+s,(a-b)/D);
    rot('shoulder.'+s,0,-k*22*Math.sin(this.phase+(k===1?0:Math.PI)),-k*(careful?50:75));
   }
   j.root.position.y+=Math.sqrt(84*84-Math.pow(stride*.3,2))-84;rot('spine',4);
  }
  if(n==='wobble'){const L=o.L??0;rot('spine',0,0,(L>=80?9:L>=50?4:0)*Math.sin(t*8));if(L>=80)for(const [s,k] of [['L',1],['R',-1]])rot('shoulder.'+s,Math.sin(t*12)*70,Math.cos(t*12)*45,-k*45);}
  if(n==='fall'){const u=clamp(t/.9,0,1);if(o.stairs){j.root.position.y-=50*u;rot('hip.L',-80*u);rot('hip.R',-80*u);}else {j.root.position.y+=Math.sin(u*Math.PI)*12-78*u;rot('root',-90*u);}}
  if(n==='bump'){rot('spine',-15*Math.sin(Math.min(t/.3,1)*Math.PI));}
  if(n==='resist'){rot('head',0,15*Math.sin(t*14));rot('chest',0,-15*Math.sin(t*14));}
  if(n==='bendPick'){const u=sample([[0,0],[.5,1]],t);rot('spine',45*u);reach('R',55*u,20*u);}
  if(n==='carry'){reach('L',60,20);reach('R',60,20);}
  if(n==='wash'){rot('spine',25);const step=o.step??Math.floor(t/.8)%3;reach('L',70+step*4,90);reach('R',70+step*4,90);}
  if(n==='towel'){
   const u=clamp(t/1.5,0,1),wipe=Math.sin(u*Math.PI*4)*1.8;
   for(const [s,k] of [['L',1],['R',-1]])pointHand(s,facePoint(k*9,-3+wipe,21));
   if(towel){towel.position.copy(facePoint(0,-3+wipe,19));towel.rotation.set(0,0,Math.sin(u*Math.PI*4)*.05);}
  }
  if(n==='useConsole'||n==='holdButton'){reach('R',60,30);rot('wrist.R',n==='holdButton'?2*Math.sin(t*32):0);}
  if(n==='adjustGlasses'){const u=sample([[0,0],[.3,1],[.55,1],[.8,0]],t);pointHand('R',facePoint(-3,2+Math.sin(clamp((t-.3)/.25,0,1)*Math.PI),19),u);}
  if(n==='pour'){reach('R',70,60);rot('wrist.R',0,0,35*Math.sin(t*2));reach('L',60,30);}
  if(n==='write'){pointHand('R',new THREE.Vector3(-17+3*Math.sin(t*3),34+2*Math.sin(t*5),38));rot('wrist.R',8*Math.sin(t*7),6*Math.sin(t*5));}
  const face=this.face;
  for(const [s,k] of [['L',1],['R',-1]]){
   rot('lid.'+s,(lid||(face==='tired'?38:face==='angry'?24:0))*170/80);
   rot('brow.'+s,0,0,face==='angry'?k*15:face==='tired'?-k*12:face==='surprised'?k*15:0);
   j['brow.'+s].position.y+=face==='surprised'?2:face==='angry'?-1.8:face==='tired'?-1:0;
   j['brow.'+s].position.x+=face==='angry'?-k*.65:0;
  }
  j.jaw.scale.set(1,face==='surprised'?1.8:face==='angry'?.35:face==='tired'?.65:1,1);
  rot('jaw',0,0,face==='tired'?172:face==='angry'?180:0);
  if(face==='tired')j.jaw.position.y-=.7;
  // Cloth is updated after pose blending, in root-local coordinates.
  if(this.from){const u=clamp(t/.2,0,1),blend=u*u*(3-2*u);for(const [key,v] of Object.entries(j)){v.position.lerpVectors(this.from[key].p,v.position.clone(),blend);v.quaternion.slerpQuaternions(this.from[key].q,v.quaternion.clone(),blend);}if(u===1)this.from=null;}
  this.cloth?.update(dt,Number.isFinite(speed)?speed:0,n==='walk'||n==='carefulWalk');
  const dur=durations[n];if(dur&&t>=dur&&!this.completed){this.completed=true;o.onComplete?.();}
  this.group.updateMatrixWorld(true);
 }
}
