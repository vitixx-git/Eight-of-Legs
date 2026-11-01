import * as THREE from 'three';
const D=Math.PI/180,T=2*Math.PI,clamp=THREE.MathUtils.clamp;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Seeded, bounded 18 Hz sample noise. Absolute time prevents accumulated drift.
function noise(t,seed){const n=Math.floor(t*18),f=t*18-n;const hash=i=>{const x=Math.sin(i*127.1+seed*311.7)*43758.5453;return 2*(x-Math.floor(x))-1;};return THREE.MathUtils.lerp(hash(n),hash(n+1),smooth(f));}
export function playFear(a,name,opts={}) {
 if(!['idle','intro','hide','tremble'].includes(name))throw new Error('Unknown fear animation: '+name);
 if(name==='tremble'){a.amount=clamp(opts.amount??1,0,1);a.trembleEnabled=opts.enabled!==false;return a;}
 a.from={};for(const [n,j] of Object.entries(a.joints))a.from[n]={p:j.position.clone(),q:j.quaternion.clone()};
 a.name=name;a.opts=opts;a.t=0;a.completed=false;a.cycle=-1;a.peekSide=1;a.amount=clamp(opts.amount??(name==='hide'?.5:1),0,1);a.trembleEnabled=true;
 a.groupOrigin=a.group.position.clone();return a;
}
export function updateFear(a,dt) {
 dt=clamp(Number.isFinite(dt)?dt:0,0,.1);a.t+=dt;a.totalTime=(a.totalTime||0)+dt;
 const j=a.joints,t=a.t,o=a.opts||{},time=a.totalTime;
 for(const [n,p] of Object.entries(j)){p.position.copy(a.rest[n].p);p.quaternion.copy(a.rest[n].q);}
 const rot=(n,x=0,y=0,z=0)=>j[n].rotation.set(x*D,y*D,z*D);
 j.root.scale.set(1,1,1);for(const s of ['L','R'])j['eye.'+s].scale.setScalar(1);
 rot('spine',12);rot('head',-8);
 for(const [s,k] of [['L',1],['R',-1]]){
  rot('hip.'+s,-6,0,-k*3);rot('knee.'+s,12);rot('ankle.'+s,-6,k*8);rot('brow.'+s,0,0,k*25);
  // Covered hands reach the chin; elbow stays outside the sweater.
  const shoulder=j['shoulder.'+s],elbow=j['elbow.'+s],target=new THREE.Vector3(k*.7,3.6,1.45),delta=target.sub(shoulder.position),dist=clamp(delta.length(),.3,3.19),dir=delta.normalize();
  const pole=new THREE.Vector3(k,-.6,.3);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
  const along=(1.5**2-1.7**2+dist**2)/(2*dist),h=Math.sqrt(Math.max(0,1.5**2-along**2));
  const upper=dir.clone().multiplyScalar(along).addScaledVector(pole,h),lower=dir.clone().multiplyScalar(dist).sub(upper),axis=new THREE.Vector3(k,0,0),q=new THREE.Quaternion().setFromUnitVectors(axis,upper.normalize());
  shoulder.quaternion.copy(q);elbow.quaternion.copy(q.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(axis,lower.normalize())));
 }
 const worldTarget=a.lookTarget?.isObject3D?a.lookTarget.getWorldPosition(new THREE.Vector3()):a.lookTarget?.clone?.();
 let near=false;
 if(worldTarget){a.group.updateMatrixWorld(true);const pos=a.group.getWorldPosition(new THREE.Vector3());near=pos.distanceTo(worldTarget)<6;const local=a.group.worldToLocal(worldTarget.clone());rot('head',-8,clamp(Math.atan2(local.x,local.z)/D,-20,20));for(const s of ['L','R']){j['pupil.'+s].position.x+=clamp(local.x*.025,-.16,.16);j['pupil.'+s].position.y+=clamp((local.y-8)*.025,-.12,.12);}}
 function anchor(){
  const ref=a.hideTarget;if(!ref?.hideSpot)return;
  ref.group.updateMatrixWorld(true);
  // hideSpot is only 1.5 cm behind Reflex, inside his head/body envelope.
  // Add clearance in target-local space instead of allowing mesh penetration.
  const pos=ref.hideSpot.localToWorld(new THREE.Vector3(0,0,-3.1));
  a.group.position.copy(a.group.parent?a.group.parent.worldToLocal(pos):pos);
  const q=ref.group.getWorldQuaternion(new THREE.Quaternion());if(a.group.parent)q.premultiply(a.group.parent.getWorldQuaternion(new THREE.Quaternion()).invert());a.group.quaternion.copy(q);
 }
 if(a.name==='intro'){
  const p=clamp(t/.8,0,1);j.root.position.z=-2+1.2*p;const step=Math.sin(p*Math.PI*6);j.root.position.y+=.06*Math.abs(step);rot('hip.L',-6+8*step);rot('hip.R',-6-8*step);
  const surprise=smooth((t-.8)/.1);for(const s of ['L','R']){j['eye.'+s].scale.setScalar(1+.15*surprise);j['brow.'+s].position.y+=.3*surprise;}
  if(t>1.1)j.root.position.z*=1-smooth((t-1.1)/.4);
  if(t>1.1&&a.hideTarget){const ref=a.hideTarget;ref.group.updateMatrixWorld(true);const dest=ref.hideSpot.localToWorld(new THREE.Vector3(0,0,-3.1));if(a.group.parent)a.group.parent.worldToLocal(dest);a.group.position.lerpVectors(a.groupOrigin,dest,smooth((t-1.1)/.4));rot('knee.L',12+8*Math.sin(t*55));rot('knee.R',12-8*Math.sin(t*55));}
  if(t>=1.5&&!a.completed){a.completed=true;o.onHidden?.();a.play('hide',{amount:.5});a.from=null;anchor();}
 } else if(a.name==='hide'){
  anchor();const cycle=Math.floor(t/2.6),u=t%2.6;
  if(cycle!==a.cycle){a.cycle=cycle;a.peekSide=Math.random()<.5?-1:1;a.peekPause=.4+Math.random()*.4;}
  const end=.5+a.peekPause;const peek=near?0:u<.5?smooth(u/.5):u<end?1:1-smooth((u-end)/.15);
  j.spine.position.x+=a.peekSide*peek;rot('spine',12,0,-a.peekSide*20*peek);
  a.sweatKick=u>=end&&u<end+.3?Math.sin((u-end)/.3*Math.PI)*.4:0;
  if(near){j.root.scale.y=.7;for(const s of ['L','R']){rot('shoulder.'+s,0,s==='L'?-45:45,s==='L'?25:-25);rot('elbow.'+s,0,s==='L'?-95:95);}}else j.root.scale.y=1;
 }else j.root.scale.y=1;
 const amount=a.trembleEnabled===false?0:clamp(a.amount??1,0,1);
 j.root.position.x+=.15*amount*noise(time,1);j.root.position.z+=.15*amount*noise(time,2);
 for(const [s,k] of [['L',1],['R',-1]]){j['pupil.'+s].position.x+=.05*amount*noise(time,k+4);j['pupil.'+s].position.y+=.05*amount*noise(time,k+9);j['knee.'+s].rotation.z+=k*4*D*amount*Math.sin(T*9*time);}
 const drop=time%1.8;j.sweat.position.y-=.6*clamp(drop/1.5,0,1);j.sweat.position.y+=a.sweatKick||0;
 j.sweat.scale.setScalar(drop<1.5?1:drop<1.6?1-(drop-1.5)/.1:(drop-1.6)/.2);
 // Ground each slipper after pose/blend. Tremble remains horizontal only.
 if(a.from){const u=smooth(t/.15);for(const [n,p] of Object.entries(j)){p.position.lerpVectors(a.from[n].p,p.position.clone(),u);p.quaternion.slerpQuaternions(a.from[n].q,p.quaternion.clone(),u);}if(t>=.15)a.from=null;}
 a.group.updateMatrixWorld(true);const inv=a.group.matrixWorld.clone().invert(),v=new THREE.Vector3();
 for(const s of ['L','R']){const shoe=a.group.getObjectByName('Shoe.'+s),ps=shoe.geometry.attributes.position;let low=Infinity;for(let i=0;i<ps.count;i++){v.fromBufferAttribute(ps,i).applyMatrix4(shoe.matrixWorld).applyMatrix4(inv);low=Math.min(low,v.y);}j['hip.'+s].position.y-=low/j.root.scale.y;}
 a.group.updateMatrixWorld(true);
}
