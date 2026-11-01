import * as THREE from 'three';
import * as kit from './humanKit.js';
import {HumanAnimator} from './humanAnimator.js';

// Independent simple spec: the scientist and Reflex geometry stay untouched.
export function makeFearHuman(spec={}) {
 const group=new THREE.Group();group.name='HumanArmature';Object.assign(group.userData,{model:'DEF_FEAR',simple:true,fear:true});
 const joints={},materials={};
 const mat=(n,c)=>materials[n]??(materials[n]=kit.material(n,c));
 const skin=mat('Skin','#d7a58a'),hair=mat('Hair','#4a3428'),grey=mat('HairGrey','#9a8f88'),ink=mat('Glasses','#1d1519'),sweater=mat('Sweater','#8a8fa0'),rib=mat('SweaterRib','#767b8c');
 const pivot=(n,p,pos=[0,0,0])=>{const o=new THREE.Group();o.name=n;o.position.fromArray(pos);p.add(o);joints[n]=o;return o;};
 function mesh(n,g,m,p,pos=[0,0,0],scale=[1,1,1],outlined=false){g.scale(...scale);const o=new THREE.Mesh(g,m);o.name=n;o.position.fromArray(pos);p.add(o);o.userData.noOutline=!outlined;if(outlined&&spec.outline!==false){kit.outline(o,.25);o.userData.outlineApplied=true;}return o;}
 const sphere=(r,w=4,h=3)=>new THREE.SphereGeometry(r,w,h);
 // Four triangles per radial sector, including low-poly rounded end fans.
 function cap(r,length,n=6){const h=Math.max(0,length-2*r)/2,ps=[0,h+r,0,0,-h-r,0],ix=[];for(const y of [h,-h])for(let i=0;i<n;i++)ps.push(r*Math.cos(i*2*Math.PI/n),y,r*Math.sin(i*2*Math.PI/n));for(let i=0;i<n;i++){const a=2+i,b=2+(i+1)%n,c=a+n,d=b+n;ix.push(0,b,a,a,b,c,b,d,c,1,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(ix);g.computeVertexNormals();return g;}
 function rod(n,p,a,b,r){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),o=mesh(n,new THREE.CylinderGeometry(r,r,d.length(),3,1,true),ink,p,new THREE.Vector3(...a).addScaledVector(d,.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
 const root=pivot('root',group,[0,3.6,0]),spine=pivot('spine',root),head=pivot('head',spine,[0,3.4,0]);
 mesh('Sweater',cap(1.5,5.9,10),sweater,spine,[0,1.35,0],[1.3,1,.9],true);
 mesh('Collar',new THREE.CylinderGeometry(1.05,1.05,.6,8,1,true),rib,spine,[0,4.1,0]);
 mesh('Hem',new THREE.CylinderGeometry(1.5,1.5,.25,8,1,true),rib,spine,[0,-.9,0],[1.3,1,.9]);
 mesh('Head',sphere(2,8,6),skin,head,[0,1.7,0],[.95,1.05,1],true);
 const nose=mesh('Nose',cap(.3,1.1,5),skin,head,[0,1.55,1.98]);nose.rotation.x=kit.rad(65);
 mesh('HairCap',sphere(2.1,8,5),hair,head,[0,2.75,0],[.95,.5,.96]);
 for(let i=0;i<3;i++){const o=mesh('Tuft'+i,new THREE.ConeGeometry(.32,.7,4),hair,head,[-.7+i*.7,2.8,1.2]);o.rotation.z=Math.PI+(1-i)*.18;}
 for(const [s,k] of [['L',1],['R',-1]]){
  mesh('Ear.'+s,sphere(1),skin,head,[k*1.92,1.7,-.12],[.5,.75,.32]);
  mesh('Grey.'+s,sphere(1),grey,head,[k*1.85,2.4,0],[.3,.7,.85]);
  const eye=mesh('Eye.'+s,sphere(.6,6,4),mat('EyeWhite','#f2ece0'),head,[k*.79,1.9,1.9]);joints['eye.'+s]=eye;
  const pupil=pivot('pupil.'+s,head,[k*.79,1.9,2.49]);mesh('Pupil.'+s,sphere(.14),mat('Pupil','#2a1f1a'),pupil,[0,0,0],[1,1,.4]);
  const frame=mesh('Frame.'+s,new THREE.TorusGeometry(.72,.08,3,8),ink,head,[k*.79,1.85,2.6]);frame.rotation.x=kit.rad(5);
  rod('Temple.'+s,head,[k*1.51,1.85,2.6],[k*1.92,1.85,0],.065);
  const brow=pivot('brow.'+s,head,[k*.79,2.8,1.95]);mesh('Brow.'+s,new THREE.BoxGeometry(.8,.16,.16),mat('Brows','#3a2a22'),brow);
 }
 rod('Bridge',head,[-.1,1.85,2.6],[.1,1.85,2.6],.07);
 const jaw=pivot('jaw',head,[0,.55,1.9]);const mouth=mesh('Mouth',new THREE.TorusGeometry(.35,.08,3,6,kit.rad(120)),mat('Mouth','#7a2630'),jaw);mouth.rotation.z=kit.rad(30);
 const sweat=pivot('sweat',head,[-2.08,2.6,.8]);mesh('SweatDrop',sphere(.22,5,4),mat('Sweat','#9fd8ff'),sweat,[0,0,0],[1,1.35,1]);mesh('SweatTip',new THREE.ConeGeometry(.13,.25,5),materials.Sweat,sweat,[0,.3,0]);
 for(const [s,k] of [['L',1],['R',-1]]){
  const shoulder=pivot('shoulder.'+s,spine,[k*1.5,3.3,0]),elbow=pivot('elbow.'+s,shoulder,[k*1.5,0,0]),wrist=pivot('wrist.'+s,elbow,[k*1.7,0,0]);pivot('hand.'+s,wrist);
  for(const [name,p,r,len] of [['UpperArm',shoulder,.45,1.5],['Sleeve',elbow,.5,1.7]]){const o=mesh(name+'.'+s,cap(r,len+2*r),sweater,p,[k*len/2,0,0],[1,1,1],true);o.rotation.z=Math.PI/2;}
  const hip=pivot('hip.'+s,root,[k*.5,0,0]),knee=pivot('knee.'+s,hip,[0,-1.6,0]),ankle=pivot('ankle.'+s,knee,[0,-1.6,0]);
  mesh('Shin.'+s,cap(.38,2),mat('Pants','#3d4352'),knee,[0,-.8,0],[1,1,1],true);
  mesh('Shoe.'+s,new THREE.BoxGeometry(.7,.5,1.3),mat('Slippers','#8a5a8c'),ankle,[0,-.15,.3],[1,1,1],true);
 }
 const animator=new HumanAnimator(group,joints);animator.play('idle');animator.from=null;animator.update(0);
 const tris=kit.visibleTris(group);console.info('DEF_FEAR triangles (without outline):',tris);
 const model={group,joints,animator,tris,materials,setHideTarget(reflex){animator.hideTarget=reflex;return model;},lookAt(target){animator.lookTarget=target;return model;}};
 return model;
}
