import * as THREE from 'three';
const D=Math.PI/180,clamp=THREE.MathUtils.clamp;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const hash=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
export function playWill(a,name,opts={}){
 if(!['intro','talk','idle','guard'].includes(name))throw new Error('Unknown Will animation: '+name);
 a.from={};for(const [n,j] of Object.entries(a.joints))a.from[n]={p:j.position.clone(),q:j.quaternion.clone()};
 a.name=name==='guard'?'idle':name;a.opts=opts;a.t=0;a.completed=false;a.stomps=0;a.syllables=0;
 a.duration=Number.isFinite(opts.duration)?Math.max(0,opts.duration):.07*Array.from(opts.text||'Посторонним в голове не место.').filter(c=>/\p{L}/u.test(c)).length;
 a.speech=[];let t=0,i=0;while(t<a.duration){const pause=i%5===4;a.speech.push({start:t,end:Math.min(a.duration,t+1/(5+2*hash(i))),pause,amp:(.55+.45*hash(i+200))*8});t=a.speech.at(-1).end;i++;}return a;
}
export function updateWill(a,dt){
 dt=clamp(Number.isFinite(dt)?dt:0,0,.1);a.t+=dt;const j=a.joints,t=a.t,o=a.opts||{},intro=a.name==='intro',talk=a.name==='talk';
 for(const [n,p] of Object.entries(j)){p.position.copy(a.rest[n].p);p.quaternion.copy(a.rest[n].q);}
 const rot=(n,x=0,y=0,z=0)=>j[n].rotation.set(x*D,y*D,z*D);
 rot('spine',5);rot('head',-3);j.spine.position.y+=.1*Math.sin(t*Math.PI*.8);
 for(const [s,k] of [['L',1],['R',-1]]){rot('brow.'+s,0,0,k*20);rot('hip.'+s,-4);rot('knee.'+s,8);rot('ankle.'+s,-4);rot('coatTail.'+s,2*Math.sin(t*2.5-.6),0,k*1.5*Math.sin(t*2.5));}
 function reach(s,target){const k=s==='L'?1:-1,delta=new THREE.Vector3(...target).sub(j['shoulder.'+s].position),d=clamp(delta.length(),.12,3.09),dir=delta.normalize(),pole=new THREE.Vector3(k,-.5,0);pole.addScaledVector(dir,-pole.dot(dir)).normalize();const along=(1.6**2-1.5**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,1.6**2-along*along)),up=dir.clone().multiplyScalar(along).addScaledVector(pole,h),low=dir.clone().multiplyScalar(d).sub(up),axis=new THREE.Vector3(k,0,0),q=new THREE.Quaternion().setFromUnitVectors(axis,up.normalize());j['shoulder.'+s].quaternion.copy(q);j['elbow.'+s].quaternion.copy(q.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(axis,low.normalize())));}
 let thrust=0;
 if(intro){const p=Math.min(t,1);j.root.position.z=-3+3*smooth(p);if(t<1){const step=Math.min(1,Math.floor(t/.5)),u=(t-step*.5)/.5,s=step===0?'L':'R';rot('hip.'+s,-4-35*Math.sin(Math.PI*u));rot('knee.'+s,8+48*Math.sin(Math.PI*u));rot('spine',5,0,(step===0?1:-1)*6*Math.sin(Math.PI*u));}
  for(const time of [.5,1]){const u=(t-time)/.15;if(u>=0&&u<1)j.root.position.y-=.3*Math.sin(Math.PI*u);}
  thrust=1.5*Math.sin(Math.PI*clamp((t-1)/.3,0,1));
  for(const [s,k] of [['L',1],['R',-1]])rot('coatTail.'+s,12*Math.sin(Math.PI*clamp((t-.12)/1.15,0,1)),0,k*4*Math.sin(t*7));
 }
 const grip=new THREE.Vector3(1,2.3,-.65).applyEuler(new THREE.Euler(35*D,(10+2*Math.sin(t*2.5))*D,0)).add(new THREE.Vector3(0,.2,4.5+thrust));reach('L',grip.toArray());reach('R',[-2.2,.55,.8]);
 if(talk){const idx=a.speech.findIndex(v=>t>=v.start&&t<v.end);if(idx>=0){const v=a.speech[idx],u=(t-v.start)/(v.end-v.start);if(!v.pause){rot('jaw',v.amp*Math.sin(Math.PI*u));rot('head',-3+3*Math.sin(Math.PI*u));}}
  const u=(t-a.duration*.5)/.3;if(u>=0&&u<=1)reach('R',[-1.5,1.6,1+2*Math.sin(Math.PI*u)]);
 }
 if(a.from){const u=smooth(t/.2);for(const [n,p] of Object.entries(j)){if(n==='shield')continue;p.position.lerpVectors(a.from[n].p,p.position.clone(),u);p.quaternion.slerpQuaternions(a.from[n].q,p.quaternion.clone(),u);}if(t>=.2)a.from=null;}
 // Ground each shoe independently; rising step foot retains its intentional lift.
 a.group.updateMatrixWorld(true);const inv=a.group.matrixWorld.clone().invert(),v=new THREE.Vector3();
 for(const s of ['L','R']){const shoe=a.group.getObjectByName('Shoe.'+s),ps=shoe.geometry.attributes.position;let low=Infinity;for(let i=0;i<ps.count;i++){v.fromBufferAttribute(ps,i).applyMatrix4(shoe.matrixWorld).applyMatrix4(inv);low=Math.min(low,v.y);}let lift=0;if(intro&&t<1){const step=Math.min(1,Math.floor(t/.5)),u=(t-step*.5)/.5;if(s===(step===0?'L':'R'))lift=1.1*Math.sin(Math.PI*u);}j['hip.'+s].position.y+=lift-low;}
 // Keep rigid coat flaps ahead of the moving trouser envelope, in root coordinates.
 for(const s of ['L','R'])a.group.getObjectByName('CoatTail.'+s).position.z=1.5;
 a.group.updateMatrixWorld(true);const rootInv=j.root.matrixWorld.clone().invert();
 for(const s of ['L','R']){let legFront=-Infinity,tailBack=Infinity;for(const prefix of ['Thigh.','Shin.','CoatTail.']){const obj=a.group.getObjectByName(prefix+s),ps=obj.geometry.attributes.position;for(let i=0;i<ps.count;i++){v.fromBufferAttribute(ps,i).applyMatrix4(obj.matrixWorld).applyMatrix4(rootInv);if(prefix==='CoatTail.')tailBack=Math.min(tailBack,v.z);else legFront=Math.max(legFront,v.z);}}const flap=a.group.getObjectByName('CoatTail.'+s);flap.position.z=1.5+Math.max(0,legFront+.15-tailBack);}
 // Conservative world-space clearance also covers the tilted torso during stomps.
 a.group.updateMatrixWorld(true);
 for(const s of ['L','R']){const flap=a.group.getObjectByName('CoatTail.'+s);flap.geometry.computeBoundingBox();const tb=flap.geometry.boundingBox.clone().applyMatrix4(flap.matrixWorld);let front=-Infinity;for(const prefix of ['Thigh.','Shin.']){const leg=a.group.getObjectByName(prefix+s);leg.geometry.computeBoundingBox();front=Math.max(front,leg.geometry.boundingBox.clone().applyMatrix4(leg.matrixWorld).max.z);}const dz=Math.max(0,front+.1-tb.min.z),axis=new THREE.Vector3(0,0,1).transformDirection(j['coatTail.'+s].matrixWorld);flap.position.z+=dz/Math.max(.5,axis.z);}
 // Shield stays rigid in the grip, in front of the body, independent of elbow orientation.
 a.group.updateMatrixWorld(true);const shield=j.shield,parent=shield.parent;
 const p=j.spine.localToWorld(new THREE.Vector3(0,.2,4.5+thrust));shield.position.copy(parent.worldToLocal(p));
 const desired=j.spine.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(35*D,(10+2*Math.sin(t*2.5))*D,0)));
 shield.quaternion.copy(parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));a.group.updateMatrixWorld(true);
 if(intro){while(a.stomps<2&&t>=[.5,1][a.stomps]){a.stomps++;(o.onStomp||a.model?.onStomp)?.();}}
 if(talk){while(a.syllables<a.speech.length&&t>=a.speech[a.syllables].start){const v=a.speech[a.syllables++];if(!v.pause)(o.onSyllable||a.model?.onSyllable)?.();}}
 if((intro&&t>=1.5||talk&&t>=a.duration)&&!a.completed){a.completed=true;o.onComplete?.();if(a.name!=='idle')a.play('idle');}
}
