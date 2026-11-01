import * as THREE from 'three';
const D=Math.PI/180,T=Math.PI*2,clamp=THREE.MathUtils.clamp;
export function playReflex(a,name,opts={}){
 if(!['idle','intro'].includes(name))throw new Error('Unknown simple animation: '+name);
 a.from={};for(const [n,j] of Object.entries(a.joints))a.from[n]={p:j.position.clone(),q:j.quaternion.clone()};
 a.name=name;a.opts=opts;a.t=0;a.completed=false;a.beats=0;
 a.nextBlink=3+Math.random()*2;a.nextTap=4+Math.random()*2;a.blinkStart=-10;a.tapStart=-10;return a;
}
export function updateReflex(a,dt){
 dt=clamp(Number.isFinite(dt)?dt:0,0,.1);a.t+=dt;
 const j=a.joints,o=a.opts||{},intro=a.name==='intro',t=intro?Math.min(a.t,1.5):a.t;
 for(const [n,p] of Object.entries(j)){p.position.copy(a.rest[n].p);p.quaternion.copy(a.rest[n].q);}
 const rot=(n,x=0,y=0,z=0)=>j[n].rotation.set(x*D,y*D,z*D);
 // Two-link reach with an outward elbow pole, shared by the shoulder rest and palm tap.
 function reach(s,target){const k=s==='L'?1:-1,delta=new THREE.Vector3(...target).sub(j['shoulder.'+s].position),d=clamp(delta.length(),.15,3.09),dir=delta.normalize();
  const pole=new THREE.Vector3(k,-.5,0);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
  const along=(1.6**2-1.5**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,1.6**2-along**2));
  const upper=dir.clone().multiplyScalar(along).addScaledVector(pole,h),lower=dir.clone().multiplyScalar(d).sub(upper),axis=new THREE.Vector3(k,0,0);
  const q=new THREE.Quaternion().setFromUnitVectors(axis,upper.normalize());j['shoulder.'+s].quaternion.copy(q);j['elbow.'+s].quaternion.copy(q.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(axis,lower.normalize())));
 }
 const u=intro?0:t,bounce=.5-.5*Math.cos(T*2*u),bend=10+10*bounce;
 j.root.position.y+=.3*bounce;rot('hip.L',-bend/2);rot('hip.R',-bend/2);rot('knee.L',bend);rot('knee.R',bend);
 for(const s of ['L','R'])rot('ankle.'+s,-bend/2+12*bounce);
 reach('L',[1.5,1.8,1.15]);reach('R',[-2.6,4.7,.45]);
 // Keep the handle on the outside of the head, not over the face.
 rot('hand.R',0,0,-20+3*Math.sin(T*2*u));
 // Euler angles keep the full 360 degree hammer turn while ending at identity.
 for(const [s,k] of [['L',1],['R',-1]]){rot('brow.'+s,0,0,-k*10);rot('band.tail'+s,10*Math.sin(T*2*u-.65),k*15,k*10);}
 let blink=1;
 if(!intro){
  if(t>=a.nextBlink){a.blinkStart=a.nextBlink;a.nextBlink=t+3+Math.random()*2;}
  const b=(t-a.blinkStart)/.12;if(b>=0&&b<=1)blink=1-.9*Math.sin(Math.PI*b);
  if(t>=a.nextTap){a.tapStart=a.nextTap;a.nextTap=t+4+Math.random()*2;}
  const tap=(t-a.tapStart)/.5;
  if(tap>=0&&tap<=1){const w=Math.sin(Math.PI*tap);reach('L',[.7,3.2,1.5]);reach('R',[-2.1,3.8,1.5]);rot('hand.R',0,0,35*w);}
 }
 for(const s of ['L','R'])j['pupil.'+s].scale.y=blink;
 if(intro){
  if(t<.5){const p=t/.5;j.root.position.z=-4+4*p;j.root.position.y+=12*p*(1-p);rot('hip.L',-25*Math.sin(Math.PI*p));rot('hip.R',-25*Math.sin(Math.PI*p));rot('knee.L',40*Math.sin(Math.PI*p));rot('knee.R',40*Math.sin(Math.PI*p));}
  if(t>=.5&&t<.65){const p=(t-.5)/.15;j.root.position.y-=.5*Math.sin(Math.PI*p);rot('knee.L',10+20*Math.sin(Math.PI*p));rot('knee.R',10+20*Math.sin(Math.PI*p));}
  if(t>=.5&&t<1.1){const p=(t-.5)/.6,w=Math.sin(Math.PI*p);j.root.position.y+=.25*(1-Math.cos(p*Math.PI*4));
   const restL=j['shoulder.L'].quaternion.clone(),restE=j['elbow.L'].quaternion.clone();
   rot('shoulder.L',p*720,0,-55);rot('elbow.L',0,0,15);
   j['shoulder.L'].quaternion.slerp(restL,1-w);j['elbow.L'].quaternion.slerp(restE,1-w);
   reach('R',[-2.6-.35*w*Math.sin(p*Math.PI*4),4.7-.7*w*(1-Math.cos(p*Math.PI*4)),.45+.35*w]);
  }
  if(t>=1.1){const p=(t-1.1)/.4,w=Math.sin(Math.PI*p);reach('R',[-2.6-.5*w,4.7+1.1*w,.45]);rot('hammer',0,p*360,0);}
  const beats=[0,.55,.85];while(a.beats<beats.length&&a.t>=beats[a.beats]){a.beats++;o.onBeat?.();}
 }
 // Counter-rotate the grip: the hammer always points up and away from the head,
 // even while the elbow circles. Its own pivot remains free for the 360° spin.
 a.group.updateMatrixWorld(true);
 const parentQ=j['wrist.R'].getWorldQuaternion(new THREE.Quaternion());
 const spineQ=j.spine.getWorldQuaternion(new THREE.Quaternion());
 const outward=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-.65,.76,0).normalize());
 j['hand.R'].quaternion.copy(parentQ.invert().multiply(spineQ).multiply(outward));
 // Ground both shoes without changing the jump height or animated root bounce.
 a.group.updateMatrixWorld(true);let low=Infinity;
 const inverse=a.group.matrixWorld.clone().invert(),v=new THREE.Vector3();
 for(const s of ['L','R']){const shoe=a.group.getObjectByName('Shoe.'+s),p=shoe.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(shoe.matrixWorld).applyMatrix4(inverse);low=Math.min(low,v.y);}}
 const lift=(intro&&t<.5)?12*(t/.5)*(1-t/.5):intro?-.5*Math.sin(Math.PI*clamp((t-.5)/.15,0,1)):.3*bounce;
 for(const s of ['L','R'])j['hip.'+s].position.y+=lift-low;
 if(a.from){const p=clamp(a.t/.15,0,1),w=p*p*(3-2*p);for(const [n,v] of Object.entries(j)){v.position.lerpVectors(a.from[n].p,v.position.clone(),w);v.quaternion.slerpQuaternions(a.from[n].q,v.quaternion.clone(),w);}if(p===1)a.from=null;}
 a.group.updateMatrixWorld(true);
 if(intro&&a.t>=1.5&&!a.completed){a.completed=true;o.onComplete?.();}
}
