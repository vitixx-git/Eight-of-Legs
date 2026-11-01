import * as THREE from 'three';
import * as kit from './humanKit.js';
import { HumanAnimator } from './humanAnimator.js';
import { CoatDynamics } from './coatDynamics.js';
import { makeSimpleHuman } from './simpleHuman.js';
import {addWorkCoat} from './workCoat.js';
import { mergeRigid, mergeSkinned } from '../three/merge.js';

// All dimensions are centimetres. Capsule lengths include the rounded ends.
export function makeHuman(spec={}) {
 if(spec.simple)return makeSimpleHuman(spec);
 const group=new THREE.Group();group.name='HumanArmature';group.userData.model=spec.name||'Human';
 const joints={}, outfits={pajama:[],work:[]}, materials={};
 const mat=(name,color,map)=>materials[name]??(materials[name]=kit.material(name,color,map));
 const skin=mat('Skin','#d7a58a'), hair=mat('Hair','#4a3428'), grey=mat('HairGrey','#9a8f88'), glasses=mat('Glasses','#1d1519');
 const stripes=kit.texture('stripes');stripes.repeat.set(1,1);
 const pj=mat('Pajama','#ffffff',stripes),shirt=mat('Shirt','#e8e4da'),pants=mat('Pants','#3d4352'),coat=mat('Coat','#eef0ec');
 function pivot(name,parent,pos=[0,0,0]){const p=new THREE.Group();p.name=name;p.position.set(...pos);parent.add(p);joints[name]=p;return p;}
 function mesh(name,g,m,parent,pos=[0,0,0],scale=[1,1,1],outfit){const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...pos);o.scale.set(...scale);parent.add(o);if(outfit){o.userData.outfit=outfit;outfits[outfit].push(o);}return o;}
 const sphere=(r,w=8,h=6)=>new THREE.SphereGeometry(r,w,h);
 const cap=(r,length,n=8)=>new THREE.CapsuleGeometry(r,Math.max(0,length-2*r),2,n);
 const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
 const root=pivot('root',group,[0,95,0]),spine=pivot('spine',root,[0,20,0]),chest=pivot('chest',spine,[0,20,0]),neck=pivot('neck',chest,[0,14,0]),head=pivot('head',neck,[0,15,0]);
 mesh('Neck',new THREE.CylinderGeometry(5.5,5.5,9,8),skin,neck,[0,-2,0]);
 const faceSkin=mat('FaceSkin','#d7a58a');faceSkin.flatShading=false;
 mesh('Head',sphere(12.5,16,12),faceSkin,head,[0,0,0],[.95,1.05,1]);
 const nose=mesh('Nose',cap(2.2,8.4),skin,head,[0,-1,12.2]);nose.rotation.x=kit.rad(65);
 mesh('HairCap',sphere(13,12,8),hair,head,[0,6,0],[.95,.55,.96]);
 for(let i=0;i<5;i++){const tuft=mesh('Tuft'+i,new THREE.ConeGeometry(2.3,5,6),hair,head,[-7+i*3.5,10,5]);tuft.rotation.z=kit.rad(20-i*10);}
 // Keep the face clean: no near-coplanar stubble shell over the skin.
 const white=mat('Eyes','#f2ece0'), pupil=mat('Pupils','#2a1f1a');
 for(const [s,sign] of [['L',1],['R',-1]]){
  mesh('Ear.'+s,sphere(1),skin,head,[sign*12,0,0],[3,4.5,2]);
  mesh('Grey.'+s,sphere(1),grey,head,[sign*11.6,5,0],[2,4.5,6]);
  const eye=[sign*4.2,2,11.6];mesh('Eye.'+s,sphere(2.2),white,head,eye);
  // Shallow pupil cap: visible above the white, still beneath the closed eyelid.
  mesh('Pupil.'+s,sphere(1.1),pupil,head,[eye[0],eye[1],eye[2]+1.85],[1,1,.4]);
  const lid=pivot('lid.'+s,head,eye);
  // Upper hemisphere is retracted at zero, rotates over the front at 80 degrees.
  // The inscribed polygon surface must clear the pupil, not just the sphere radius.
  const l=mesh('Lid.'+s,new THREE.SphereGeometry(2.5,16,8,0,Math.PI*2,0,Math.PI/2),skin,lid);l.rotation.x=kit.rad(-80);
  const brow=pivot('brow.'+s,head,[eye[0],6,14.6]);mesh('Brow.'+s,box(5,1,1),hair,brow);
  mesh('Frame.'+s,new THREE.TorusGeometry(3.2,.35,6,12),glasses,head,[eye[0],2,14.8]);
  const temple=mesh('Temple.'+s,new THREE.CylinderGeometry(.35,.35,14,6),glasses,head,[sign*7.4,2,7.8]);temple.rotation.x=Math.PI/2;
 }
 const bridge=mesh('Bridge',new THREE.CylinderGeometry(.35,.35,2.4,6),glasses,head,[0,2,14.8]);bridge.rotation.z=Math.PI/2;
 const jaw=pivot('jaw',head,[0,-6.2,10.7]);const mouth=mesh('Mouth',new THREE.TorusGeometry(3,.4,4,12,kit.rad(140)),mat('Mouth','#7a2630'),jaw);mouth.rotation.z=kit.rad(200);
 for(const outfit of ['pajama','work']){
  const m=outfit==='pajama'?pj:shirt;
  mesh('ShoulderYoke.'+outfit,kit.roundBox(40,10,22),outfit==='pajama'?pj:coat,chest,[0,6,0],[1,1,1],outfit);
  mesh('Torso.'+outfit,cap(17,40,12),m,spine,[0,7,0],[1.05,1,.75],outfit);
  mesh('Pelvis.'+outfit,sphere(15,12,8),outfit==='pajama'?pj:pants,root,[0,0,0],[1,.7,.8],outfit);
 }
 for(let i=0;i<4;i++)mesh('Button'+i,sphere(.9,6,4),mat('Buttons','#e9e1cf'),chest,[0,3-i*6,13.4],[1,1,1],'pajama');
 for(const sign of [-1,1]){
  const collar=mesh('Collar'+sign,box(7,7,1.5),shirt,chest,[sign*4,9,12.5],[1,1,1],'work');collar.rotation.z=sign*.35;
  const lapel=mesh('CoatLapel'+sign,box(5,21,1.4),coat,chest,[sign*6,0,14.5],[1,1,1],'work');lapel.rotation.z=-sign*.22;
 }
 // Continuous sides and back, with a narrow deliberate front opening over the shirt.
 addWorkCoat({mesh:(n,g,m,p,pos=[0,0,0])=>mesh(n,g,m,p,pos,[1,1,1],'work'),coat,penRed:mat('Pen0','#c9524a'),penBlue:mat('Pen1','#4a6fb8'),parent:spine,pocketParent:chest});
 const tie=mesh('Tie',new THREE.ConeGeometry(2.5,20,4),mat('Tie','#7a3b46'),chest,[0,-3,14],[1,1,.35],'work');tie.rotation.z=Math.PI;
 // Pocket and pens are supplied by the shared work-coat builder.
 const badge=pivot('badge',chest,[10,-3,16]);badge.name='PASS_CARD';badge.scale.setScalar(.8);
 mesh('Card',box(8,5,.4),mat('Badge','#c7d6d6'),badge);mesh('CardStripe',box(7,1,.5),mat('BadgeInk','#46586c'),badge,[0,1,0]);badge.visible=false;
 // Finger grooves use a separate transparent decal.
 const groove=mat('FingerGrooves','#ffffff',kit.texture('grooves'));groove.transparent=true;
 for(const [s,sign] of [['L',1],['R',-1]]){
  const shoulder=pivot('shoulder.'+s,chest,[sign*20,10,0]),elbow=pivot('elbow.'+s,shoulder,[sign*28,0,0]),wrist=pivot('wrist.'+s,elbow,[sign*26,0,0]);
  for(const outfit of ['pajama','work'])for(const [parent,len,r,name] of [[shoulder,28,5,'UpperArm'],[elbow,26,4.5,'Forearm']]){
   const o=mesh(name+'.'+s+'.'+outfit,cap(r*1.06,len+2*r),outfit==='pajama'?pj:coat,parent,[sign*len/2,0,0],[1,1,1],outfit);o.rotation.z=Math.PI/2;
  }
  mesh('Hand.'+s,sphere(4.5),skin,wrist,[sign*3,0,0]);
  const thumb=mesh('Thumb.'+s,cap(1.5,7),skin,wrist,[sign*2,-3,2]);thumb.rotation.z=sign*.5;
  mesh('Grooves.'+s,new THREE.PlaneGeometry(5,5),groove,wrist,[sign*3,0,4.1]);pivot('hand.'+s,wrist,[sign*4,0,1]);
  const hip=pivot('hip.'+s,root,[sign*9,-3,0]),knee=pivot('knee.'+s,hip,[0,-42,0]),ankle=pivot('ankle.'+s,knee,[0,-42,0]);
  for(const outfit of ['pajama','work']){
   const m=outfit==='pajama'?pj:pants;
   mesh('Thigh.'+s+'.'+outfit,cap(7,48),m,hip,[0,-21,0],[1,1,1],outfit);
   mesh('Shin.'+s+'.'+outfit,cap(6,48),m,knee,[0,-21,0],[1,1,1],outfit);
   mesh('Shoe.'+s+'.'+outfit,kit.roundBox(10,9,26),mat(outfit==='pajama'?'Slippers':'Shoes',outfit==='pajama'?'#8a5a8c':'#2b2326'),ankle,[0,-3.5,7],[1,1,1],outfit);
  }
  const tail=pivot('coatTail.'+s,root,[sign*15,5,0]);
  // Named attachment points retained for scene compatibility; fabric is continuous.
  tail.userData.fabricAttachment=true;
 }
 function setOutfit(name){if(!outfits[name])throw new Error('Unknown outfit: '+name);for(const key of Object.keys(outfits))for(const o of outfits[key])o.visible=key===name;group.userData.outfit=name;badge.visible=!!group.userData.badge&&name==='work';}
 function setBadge(value){group.userData.badge=!!value;badge.visible=!!value&&group.userData.outfit==='work';}
 const skirt=mesh('CoatSkirt',kit.coatPanel([
  {y:27,w:19.3,d:16.5},{y:14,w:20.5,d:17.5},{y:2,w:21.5,d:18.5},
  {y:-12,w:23,d:21},{y:-26,w:25,d:23},{y:-43,w:27,d:25}
 ],.025,Math.PI*2-.025,[0,0,0],24),coat,root,[0,0,0],[1,1,1],'work');
 const cloth=new CoatDynamics(skirt,joints);
 const towel=mesh('FaceTowel',kit.roundBox(24,13,1.2),mat('Towel','#c9d9da'),chest);towel.visible=false;
 const animator=new HumanAnimator(group,joints);animator.cloth=cloth;
 function setFace(name){animator.setFace(name);}
 // Слияние мешей по шарнирам (draw calls ×0,4); ткань халата и полотенце остаются отдельными.
 if(spec.merge!==false){const keep=new Set([skirt,towel]);mergeRigid(group,{skip:o=>keep.has(o)||o.name==='Grooves.L'||o.name==='Grooves.R'});for(const k of Object.keys(outfits))outfits[k].length=0;group.traverse(o=>{if(o.isMesh&&o.userData.outfit&&outfits[o.userData.outfit])outfits[o.userData.outfit].push(o);});}
 setOutfit('pajama');const pajama=kit.visibleTris(group);setOutfit('work');const work=kit.visibleTris(group);const tris={pajama,work};
 setOutfit(spec.outfit||(spec.variant==='SLEEPER'?'pajama':'work'));setBadge(spec.badge||false);animator.play(spec.variant==='SLEEPER'?'sleepBreath':'idle');animator.update(0,0);
 // учёный и человечки: всё тело — 2–4 SkinnedMesh (кость = исходный меш); ткань халата остаётся отдельной
 if(spec.skin!==false)mergeSkinned(group,{skip:o=>o===skirt});
 console.info('SCIENTIST triangles',tris);
 return {group,joints,animator,setOutfit,setBadge,setFace,tris,materials};
}
