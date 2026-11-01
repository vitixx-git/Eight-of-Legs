import * as THREE from 'three';
import { toonMaterial } from '../three/toon.js';
import { SpiderAnimator, createClips } from './spiderAnimator.js';
import { mergeSkinned } from '../three/merge.js';

export function createSpider({ clips = true, merge = true } = {}) {
  const group = new THREE.Group(); group.name = 'SPIDER';
  const armature = new THREE.Group(); armature.name = 'SpiderArmature'; group.add(armature);
  const bones = {}, meshes = {}, legs = [];
  const standard = (name, color, extra = {}) => { const { roughness, metalness, ...rest } = extra; const m = toonMaterial(name, color, rest); m.flatShading = true; return m; };
  const materials = {
    Body: standard('Body', '#2f2433'), Abdomen: standard('Abdomen', '#3a2b45'),
    Pattern: standard('Pattern', '#6b4f7a'), Legs: standard('Legs_Joints', '#ffffff', { vertexColors: true }),
    Eyes: standard('Eyes', '#0d0a0a', { roughness: .3 }),
    Shine: new THREE.MeshBasicMaterial({ name: 'Shine', color: '#ffffff' }),
    Outline: new THREE.MeshBasicMaterial({ name: 'Outline', color: '#1d1519', side: THREE.BackSide })
  };
  function bone(name, parent, position = [0,0,0]) {
    const b = new THREE.Bone(); b.name = name; b.position.fromArray(position); parent.add(b); bones[name] = b; return b;
  }
  function mesh(name, geometry, material, parent, position = [0,0,0]) {
    const m = new THREE.Mesh(geometry, material); m.name = name; m.position.fromArray(position); parent.add(m); meshes[name] = m; return m;
  }
  const sphere = (r,w,h) => new THREE.SphereGeometry(r,w,h);
  function colored(geometry, color) {
    const c = new THREE.Color(color), n = geometry.attributes.position.count, a = new Float32Array(n*3);
    for(let i=0;i<n;i++) c.toArray(a,i*3);
    geometry.setAttribute('color', new THREE.BufferAttribute(a,3)); return geometry;
  }
  function shell(name, geometry, parent) {
    const outline = geometry.clone(), p = outline.attributes.position, n = outline.attributes.normal;
    for(let i=0;i<p.count;i++) p.setXYZ(i,p.getX(i)+n.getX(i)*.06,p.getY(i)+n.getY(i)*.06,p.getZ(i)+n.getZ(i)*.06);
    mesh(name+'_Outline',outline,materials.Outline,parent).userData.spiderOutline = true;
  }
  const root = bone('Root',armature), body = bone('body',root,[0,.50,0]);
  const headGeo = sphere(.6,14,10); headGeo.scale(1,.7,1.1);
  mesh('Cephalothorax',headGeo,materials.Body,body); shell('Cephalothorax',headGeo,body);
  const abdomen = bone('abdomen',body,[0,.20,-1.3]);
  const abdomenGeo = sphere(.85,14,10); abdomenGeo.scale(1,.75,1.25);
  mesh('Abdomen',abdomenGeo,materials.Abdomen,abdomen); shell('Abdomen',abdomenGeo,abdomen);
  bone('spinneret',abdomen,[0,-.12,-1.06]);
  for(let i=0;i<3;i++) {
    const z = (i-1)*.43, y = .6375*Math.sqrt(1-z*z/(1.0625**2));
    const g=sphere(.22,8,6); g.scale(1,.28,1);
    mesh('Pattern'+i,g,materials.Pattern,abdomen,[0,y+.025,z]);
  }
  const up = new THREE.Vector3(0,1,0);
  function segment(name,parent,start,end,length,r1,r2) {
    const b=bone(name,parent,start.toArray());
    b.quaternion.setFromUnitVectors(up,end.clone().sub(start).normalize());
    const geo=colored(new THREE.CylinderGeometry(r2,r1,length,6,1,true),'#2a1f2e');
    mesh(name+'_Mesh',geo,materials.Legs,b,[0,length/2,0]); return b;
  }
  for(const [side,sign] of [['L',1],['R',-1]]) for(let i=0;i<4;i++) {
    const angle=[.98,.33,-.33,-.98][i], dir=new THREE.Vector3(sign*Math.cos(angle),0,Math.sin(angle));
    const hipP=dir.clone().multiplyScalar(.75); hipP.y=.25;
    const kneeP=hipP.clone().addScaledVector(dir,Math.sqrt(1.1**2-.55**2)); kneeP.y=.80;
    const tipP=dir.clone().multiplyScalar(3.08); tipP.y=-.50;
    const delta=tipP.clone().sub(kneeP), d=delta.length(), along=(1.2**2-.7**2+d*d)/(2*d);
    const perpendicular=new THREE.Vector3(-delta.y*dir.x,delta.dot(dir),-delta.y*dir.z).normalize();
    const ankleP=kneeP.clone().addScaledVector(delta,along/d).addScaledVector(perpendicular,Math.sqrt(Math.max(0,1.2**2-along**2)));
    const name=`Leg${i+1}.${side}`;
    const hip=segment(name+'_hip',body,hipP,kneeP,1.1,.12,.095);
    const invHip=hip.quaternion.clone().invert();
    const localAnkle=ankleP.clone().sub(kneeP).applyQuaternion(invHip);
    const knee=segment(name+'_knee',hip,new THREE.Vector3(0,1.1,0),new THREE.Vector3(0,1.1,0).add(localAnkle),1.2,.095,.075);
    const invKnee=knee.quaternion.clone().invert();
    const localTip=tipP.clone().sub(ankleP).applyQuaternion(invHip).applyQuaternion(invKnee);
    const ankle=segment(name+'_ankle',knee,new THREE.Vector3(0,1.2,0),new THREE.Vector3(0,1.2,0).add(localTip),.7,.075,.06);
    const tip=bone(name+'_tip',ankle,[0,.7,0]);
    for(const [b,label] of [[knee,'Knee'],[ankle,'Ankle']]) mesh(name+label,colored(sphere(.1,6,4),'#4a3a52'),materials.Legs,b);
    legs.push({hip,knee,ankle,tip,side,index:i,dir});
  }
  for(const sign of [-1,1]) {
    const geo=colored(new THREE.ConeGeometry(.09,.3,6),'#2a1f2e'); geo.rotateZ(Math.PI);
    mesh('Fang'+sign,geo,materials.Legs,body,[sign*.16,-.28,.53]);
    const palp=bone(sign===1?'palp.L':'palp.R',body,[sign*.36,-.12,.5]);
    const capsule=new THREE.CapsuleGeometry(.07,.26,1,6); capsule.rotateX(Math.PI/2);
    mesh('Palp'+sign,colored(capsule,'#2a1f2e'),materials.Legs,palp,[0,0,.13]);
  }
  const eyes=[[-.19,.2,.575,.16],[.19,.2,.575,.16],[-.39,.23,.44,.08],[.39,.23,.44,.08],[-.3,.35,.42,.08],[.3,.35,.42,.08]];
  eyes.forEach(([x,y,z,r],i)=>{
    mesh('Eye'+i,sphere(r,r===.16?10:6,r===.16?8:4),materials.Eyes,body,[x,y,z]);
    mesh('Shine'+i,sphere(.05,6,4),materials.Shine,body,[x-.025,y+.04,z+r*.88]);
  });
  const thread=mesh('WebThread',new THREE.CylinderGeometry(.02,.02,1,6,1,true),materials.Shine,group);
  thread.scale.set(0,0,0); // zero area until firing; retained in GLB for animation
  let tris=0; group.traverse(o=>{if(o.isMesh) tris+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
  const model={group,bones,meshes,legs,materials,tris};
  model.animator=new SpiderAnimator(model);
  group.animations=clips?createClips(model):[];
  // 64 меша → 4–5 SkinnedMesh (кость = исходный меш, жёсткая привязка): вызовов отрисовки ×0,08, анимация та же
  if (merge) model.skin = mergeSkinned(group);
  console.info(`SPIDER: ${tris} triangles; ${Object.keys(materials).length} materials`);
  return model;
}
