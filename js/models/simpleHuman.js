import * as THREE from 'three';
import * as kit from './humanKit.js';
import {HumanAnimator} from './humanAnimator.js';
import {makeFearHuman} from './fearHuman.js';
import {makeWillHuman} from './willHuman.js';

// Simple proportions are independent of the centimetre-scale scientist geometry.
export function makeSimpleHuman(spec={}) {
 if(spec.stocky && spec.coat && spec.shield)return makeWillHuman(spec);
 if(spec.sweater && spec.bigEyes)return makeFearHuman(spec);
 const group=new THREE.Group();group.name='HumanArmature';group.userData.model=spec.name||'DEF_REFLEX';group.userData.simple=true;
 const joints={},materials={};
 const mat=(n,c)=>materials[n]??(materials[n]=kit.material(n,c));
 const skin=mat('Skin','#d7a58a'),hair=mat('Hair','#4a3428'),grey=mat('HairGrey','#9a8f88'),ink=mat('Glasses','#1d1519'),suit=mat('Suit','#c0443a'),stripe=mat('Stripe','#f2ece0');stripe.side=THREE.DoubleSide;
 const pivot=(n,p,pos=[0,0,0])=>{const o=new THREE.Group();o.name=n;o.position.fromArray(pos);p.add(o);joints[n]=o;return o;};
 function mesh(n,g,m,p,pos=[0,0,0],scale=[1,1,1],outlined=false){g.scale(...scale);const o=new THREE.Mesh(g,m);o.name=n;o.position.fromArray(pos);p.add(o);o.userData.noOutline=!outlined;if(outlined&&spec.outline!==false){kit.outline(o,.25);o.userData.outlineApplied=true;}return o;}
 const sphere=(r,w=4,h=3)=>new THREE.SphereGeometry(r,w,h);
 const cap=(r,length,n=6)=>{
  const h=Math.max(0,length-2*r)/2,positions=[0,h+r,0,0,-h-r,0],indices=[];
  for(const y of [h,-h])for(let i=0;i<n;i++)positions.push(r*Math.cos(i*Math.PI*2/n),y,r*Math.sin(i*Math.PI*2/n));
  for(let i=0;i<n;i++){const a=2+i,b=2+(i+1)%n,c=a+n,d=b+n;indices.push(0,b,a,a,b,c,b,d,c,1,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
 };
 const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
 function rod(n,p,a,b,r,m){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const o=mesh(n,new THREE.CylinderGeometry(r,r,d.length(),3,1,true),m,p,new THREE.Vector3(...a).addScaledVector(d,.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
 const root=pivot('root',group,[0,4.4,0]),spine=pivot('spine',root),head=pivot('head',spine,[0,4.2,0]);
 mesh('Body',cap(1.25,4.3,8),suit,spine,[0,2.05,0],[.8,1,.65],true);
 mesh('Head',sphere(2,10,7),skin,head,[0,1.2,0],[.95,1.05,1],true);
 const nose=mesh('Nose',cap(.3,1.1,5),skin,head,[0,1.05,1.98]);nose.rotation.x=kit.rad(65);
 mesh('HairCap',sphere(2.1,8,5),hair,head,[0,2.25,0],[.95,.5,.96]);
 for(let i=0;i<3;i++){const o=mesh('Tuft'+i,new THREE.ConeGeometry(.32,.8,4),hair,head,[-.7+i*.7,2.9,.65]);o.rotation.z=(1-i)*.25;}
 for(const [s,k] of [['L',1],['R',-1]]){
  mesh('Ear.'+s,sphere(1),skin,head,[k*1.92,1.2,0],[.5,.75,.32]);
  mesh('Grey.'+s,sphere(1),grey,head,[k*1.85,1.95,0],[.25,.65,.85]);
  const eye=mesh('Pupil.'+s,sphere(.22),mat('Pupils','#2a1f1a'),head,[k*.65,1.5,1.91],[1,1,.5]);joints['pupil.'+s]=eye;
  mesh('Frame.'+s,new THREE.TorusGeometry(.52,.08,3,8),ink,head,[k*.65,1.5,2.04]);
  rod('Temple.'+s,head,[k*1.17,1.5,2.04],[k*1.9,1.5,0],.065,ink);
  const brow=pivot('brow.'+s,head,[k*.65,2.16,1.9]);mesh('Brow.'+s,box(.8,.16,.16),mat('Brows','#3a2a22'),brow);
 }
 rod('Bridge',head,[-.13,1.5,2.04],[.13,1.5,2.04],.07,ink);
 const jaw=pivot('jaw',head,[0,.25,1.85]);const mouth=mesh('Mouth',new THREE.TorusGeometry(.5,.08,3,8,kit.rad(140)),mat('Mouth','#7a2630'),jaw);mouth.rotation.z=kit.rad(200);
 mesh('Headband',new THREE.CylinderGeometry(2.03,2.03,.45,8,1,true),mat('Headband','#f2ece0'),head,[0,2.35,0],[1,1,.98]);
 for(const [s,k] of [['L',1],['R',-1]]){const tail=pivot('band.tail'+s,head,[k*.25,2.25,-1.96]);mesh('BandTail.'+s,box(.6,.25,.05),materials.Headband,tail,[k*.24,-.1,0]);}
 mesh('Collar',new THREE.CylinderGeometry(.85,.85,.15,8,1,true),stripe,spine,[0,4,0]);
 function segment(n,p,r,len,axis,k=1){const o=mesh(n,cap(r,len+2*r),suit,p,axis==='x'?[k*len/2,0,0]:[0,-len/2,0],[1,1,1],true);if(axis==='x')o.rotation.z=Math.PI/2;
  for(const z of [-.1,.1]){const g=new THREE.PlaneGeometry(.1,len);const strip=mesh(n+'.Stripe'+z,g,stripe,p,axis==='x'?[k*len/2,r+.02,z]:[k*(r+.02),-len/2,z]);if(axis==='x')strip.rotation.set(-Math.PI/2,0,Math.PI/2);else strip.rotation.y=k*Math.PI/2;}
 }
 for(const [s,k] of [['L',1],['R',-1]]){
  const shoulder=pivot('shoulder.'+s,spine,[k*1.1,3.5,0]),elbow=pivot('elbow.'+s,shoulder,[k*1.6,0,0]),wrist=pivot('wrist.'+s,elbow,[k*1.5,0,0]);
  segment('UpperArm.'+s,shoulder,.4,1.6,'x',k);segment('Forearm.'+s,elbow,.38,1.5,'x',k);
  mesh('Hand.'+s,sphere(.45,5,4),skin,wrist,[0,0,0],[1,1,1],true);pivot('hand.'+s,wrist);
  const hip=pivot('hip.'+s,root,[k*.55,0,0]),knee=pivot('knee.'+s,hip,[0,-2,0]),ankle=pivot('ankle.'+s,knee,[0,-1.9,0]);
  segment('Thigh.'+s,hip,.5,2,'y',k);segment('Shin.'+s,knee,.45,1.9,'y',k);
  mesh('Shoe.'+s,kit.roundBox(.8,.6,1.6),mat('Shoes','#e9e1cf'),ankle,[0,-.2,.35],[1,1,1],true);
 }
 const hammer=pivot('hammer',joints['hand.R']);
 mesh('HammerHandle',new THREE.CylinderGeometry(.1,.1,3,5,1,true),mat('HammerHandle','#c9d0d8'),hammer,[0,.5,0],[1,1,1],true);
 const shape=new THREE.Shape();shape.moveTo(-.6,0);shape.lineTo(.6,0);shape.lineTo(0,.7);shape.closePath();
 const hg=new THREE.ExtrudeGeometry(shape,{depth:.45,bevelEnabled:false,steps:1});hg.translate(0,0,-.225);
 mesh('HammerHead',hg,mat('HammerHead','#c9524a'),hammer,[0,2,0],[1,1,1],true);
 const hideSpot=pivot('hideSpot',group,[0,0,-1.5]);
 const animator=new HumanAnimator(group,joints);animator.play('idle');animator.from=null;animator.update(0);
 const tris=kit.visibleTris(group);console.info('DEF_REFLEX triangles (without outline):',tris);
 return {group,joints,animator,hideSpot,tris,materials};
}
