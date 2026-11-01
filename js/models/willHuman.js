import * as THREE from 'three';
import * as kit from './humanKit.js';
import {HumanAnimator} from './humanAnimator.js';
import {addWorkCoat} from './workCoat.js';
export function makeWillHuman(spec={}){
 const group=new THREE.Group();group.name='HumanArmature';Object.assign(group.userData,{model:'DEF_WILL',simple:true,will:true});
 const joints={},materials={},mat=(n,c)=>materials[n]??(materials[n]=kit.material(n,c));
 const skin=mat('Skin','#d7a58a'),hair=mat('Hair','#4a3428'),grey=mat('HairGrey','#9a8f88'),ink=mat('Glasses','#1d1519'),coat=mat('Coat','#eef0ec'),pants=mat('Pants','#3d4352'),shirt=mat('Shirt','#e8e4da');
 const pivot=(n,p,pos=[0,0,0])=>{const o=new THREE.Group();o.name=n;o.position.fromArray(pos);p.add(o);joints[n]=o;return o;};
 function mesh(n,g,m,p,pos=[0,0,0],outlined=true,scale=[1,1,1]){g.scale(...scale);const o=new THREE.Mesh(g,m);o.name=n;o.position.fromArray(pos);p.add(o);o.userData.noOutline=!outlined;if(outlined&&spec.outline!==false){kit.outline(o,.25);o.userData.outlineApplied=true;}return o;}
 const sphere=(r,w=4,h=3)=>new THREE.SphereGeometry(r,w,h),box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
 function cap(r,length,n=6){const h=Math.max(0,length-2*r)/2,ps=[0,h+r,0,0,-h-r,0],ix=[];for(const y of [h,-h])for(let i=0;i<n;i++)ps.push(r*Math.cos(i*2*Math.PI/n),y,r*Math.sin(i*2*Math.PI/n));for(let i=0;i<n;i++){const a=2+i,b=2+(i+1)%n,c=a+n,d=b+n;ix.push(0,b,a,a,b,c,b,d,c,1,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(ix);g.computeVertexNormals();return g;}
 function rod(n,p,a,b,r,m=ink){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),o=mesh(n,new THREE.CylinderGeometry(r,r,d.length(),3,1,true),m,p,new THREE.Vector3(...a).addScaledVector(d,.5).toArray(),false);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
 const root=pivot('root',group,[0,4.7,0]),spine=pivot('spine',root),head=pivot('head',spine,[0,3.9,0]);
 mesh('Body',cap(1.4,4.8,10),shirt,spine,[0,1.8,0],true,[1.25,1,.95]);
 mesh('Head',sphere(2,10,7),skin,head,[0,1.7,0]);
 const nose=mesh('Nose',cap(.32,1.19,5),skin,head,[0,1.55,1.98],false);nose.rotation.x=kit.rad(65);
 mesh('HairCap',sphere(2.1,8,5),hair,head,[0,2.75,0],false,[.95,.5,.96]);
 for(let i=0;i<3;i++){const o=mesh('Tuft'+i,new THREE.ConeGeometry(.32,.7,4),hair,head,[-.7+i*.7,3.08,.35],false);o.rotation.x=-.65;}
 for(const [s,k] of [['L',1],['R',-1]]){
  mesh('Ear.'+s,sphere(1),skin,head,[k*1.92,1.7,0],false,[.5,.75,.32]);mesh('Grey.'+s,sphere(1),grey,head,[k*1.85,2.4,0],false,[.25,.65,.85]);
  mesh('Pupil.'+s,sphere(.22),mat('Pupil','#2a1f1a'),head,[k*.65,1.85,1.91],false,[1,1,.5]);
  mesh('Frame.'+s,new THREE.TorusGeometry(.52,.08,3,8),ink,head,[k*.65,1.85,2.04],false);rod('Temple.'+s,head,[k*1.17,1.85,2.04],[k*1.9,1.85,0],.065);
  const b=pivot('brow.'+s,head,[k*.65,2.5,1.95]);mesh('Brow.'+s,box(.9,.2,.2),mat('Brows','#3a2a22'),b,undefined,false);
 }
 rod('Bridge',head,[-.13,1.85,2.04],[.13,1.85,2.04],.07);
 const jaw=pivot('jaw',head,[0,.65,1.5]);const mouth=mesh('Mouth',new THREE.TorusGeometry(.5,.08,3,6,Math.PI/2),mat('Mouth','#7a2630'),jaw,[0,0,.4],false);mouth.rotation.z=Math.PI/4;
 mesh('Stubble',new THREE.SphereGeometry(1.3,6,3,0,Math.PI*2,Math.PI/2,Math.PI/2),mat('Stubble','#b8876e'),jaw,[0,.1,-.6],false,[1,.6,.55]);
 // Shared scientist construction, scaled and widened to the stocky silhouette.
 addWorkCoat({mesh:(n,g,m,p,pos=[0,0,0],outline=true)=>mesh(n,g,m,p,[pos[0],pos[1]+(n==='CoatBodice'?0:1.9),pos[2]],outline),coat,penRed:mat('PenRed','#c9524a'),penBlue:mat('PenBlue','#4a6fb8'),parent:spine,scale:.1,steps:8,rings:[{y:4,w:1.9,d:1.4,open:.36},{y:1.5,w:1.95,d:1.5,open:.18},{y:-.3,w:1.95,d:1.5,open:.1}]});
 const tie=mesh('Tie',new THREE.ConeGeometry(.27,2,4),mat('Tie','#7a3b46'),spine,[0,2.35,1.42],false,[1,1,.3]);tie.rotation.z=Math.PI;
 for(const [s,k] of [['L',1],['R',-1]]){
  const collar=mesh('Collar.'+s,box(.65,.6,.15),shirt,spine,[k*.38,3.65,1.3],false);collar.rotation.z=k*.35;
  const tail=pivot('coatTail.'+s,root,[k*.98,.1,0]);mesh('CoatTail.'+s,box(1.8,3,.1),coat,tail,[0,-1.5,1.5]);
  const shoulder=pivot('shoulder.'+s,spine,[k*1.9,3.3,0]),elbow=pivot('elbow.'+s,shoulder,[k*1.6,0,0]),wrist=pivot('wrist.'+s,elbow,[k*1.5,0,0]);
  for(const [n,p,r,len] of [['UpperArm',shoulder,.55,1.6],['Forearm',elbow,.5,1.5]]){const o=mesh(n+'.'+s,cap(r,len+2*r),coat,p,[k*len/2,0,0]);o.rotation.z=Math.PI/2;}
  mesh('Hand.'+s,sphere(.55,5,4),skin,wrist);pivot('hand.'+s,wrist);
  const hip=pivot('hip.'+s,root,[k*.95,-.1,0]),knee=pivot('knee.'+s,hip,[0,-2,0]),ankle=pivot('ankle.'+s,knee,[0,-2,0]);
  mesh('Thigh.'+s,cap(.65,2.7),pants,hip,[0,-1,0]);mesh('Shin.'+s,cap(.58,2.7),pants,knee,[0,-1,0]);mesh('Shoe.'+s,kit.roundBox(.9,.7,1.8),mat('Shoes','#2b2326'),ankle,[0,-.25,.35]);
 }
 const shield=pivot('shield',joints['hand.L']);
 const folder=mat('Folder','#d9b45a');mesh('FolderBack',kit.roundBox(8,10,.15),folder,shield,[0,0,-.325]);mesh('Paper',box(7.6,9.6,.5),mat('Paper','#f2ece0'),shield);
 mesh('FolderFront',kit.roundBox(8,10,.15),folder,shield,[0,0,.325]);mesh('FolderSpine',box(.2,10,.8),folder,shield,[-3.9,0,0]);
 for(const x of [-2,2])mesh('FolderTie'+x,box(.1,1.2,.05),mat('FolderTie','#8a6a2a'),shield,[x,4.5,.43],false);
 mesh('FolderGrip',box(1.4,.4,.3),folder,shield,[1,2.3,-.65],false);
 const label=kit.label('ДЕЛО №1');label.position.set(0,0,.42);label.userData.noOutline=true;shield.add(label);materials.FolderLabel=label.material;
 const animator=new HumanAnimator(group,joints);const model={group,joints,animator,shield,materials,onStomp:spec.onStomp,onSyllable:spec.onSyllable};animator.model=model;
 animator.play('idle');animator.from=null;animator.update(0);model.tris=kit.visibleTris(group);console.info('DEF_WILL triangles (without outline):',model.tris);return model;
}
