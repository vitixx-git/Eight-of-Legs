import * as THREE from 'three';
import {visibleBox,visibleTris} from '../js/models/humanKit.js';
import {humanAnimations} from '../js/models/humanAnimator.js';
export function checkHuman(m){const results=[],add=(name,ok,detail='')=>results.push({name,ok,detail});const outfit=m.group.userData.outfit,scale=m.group.scale.clone(),name=m.animator.name,face=m.animator.face,badge=m.group.userData.badge;
 m.group.scale.setScalar(1);m.setFace('neutral');m.animator.play('idle');m.animator.update(0);m.animator.from=null;m.animator.update(0);
 const b=visibleBox(m.group),height=b.max.y-b.min.y;add('Рост 178 ± 2 см',Math.abs(height-178)<=2,height.toFixed(2));add('Стопы на полу',Math.abs(b.min.y)<.05,b.min.y.toFixed(3));
 for(const o of ['pajama','work']){m.setOutfit(o);const n=visibleTris(m.group);add('Бюджет '+o,n<=9000,String(n));}
 add('Лицо: без оболочки щетины и текстуры на коже',!m.group.getObjectByName('Stubble')&&!m.materials.Skin.map);
 for(const s of ['L','R']){
  const eye=m.group.getObjectByName('Eye.'+s),pupil=m.group.getObjectByName('Pupil.'+s);
  const front=pupil.position.z+pupil.geometry.parameters.radius*pupil.scale.z;
  add('Зрачок '+s+': виден над белком и под закрытым веком',front>eye.position.z+2.2&&front<eye.position.z+2.35&&Math.abs(pupil.position.x-eye.position.x)<.001&&Math.abs(pupil.position.y-eye.position.y)<.001);
 }
 // Test actual lid triangles, not the nominal sphere radius: facets used to cut through pupils.
 for(const s of ['L','R']){
  const lid=m.group.getObjectByName('Lid.'+s),pivot=m.joints['lid.'+s],pupil=m.group.getObjectByName('Pupil.'+s);
  const center=pivot.getWorldPosition(new THREE.Vector3()),p=pupil.geometry.attributes.position;
  const ray=new THREE.Raycaster(),point=new THREE.Vector3(),direction=new THREE.Vector3();
  let clear=true,tiredCovered=0,closedCovered=0;
  for(let angle=0;angle<=170;angle+=1){
   pivot.rotation.x=angle*Math.PI/180;m.group.updateMatrixWorld(true);
   for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(pupil.matrixWorld);direction.copy(point).sub(center);
    const distance=direction.length();ray.set(center,direction.normalize());
    // From inside, intersect the back faces using a reversed ray from outside.
    ray.set(center.clone().addScaledVector(direction,5),direction.clone().negate());
    const hits=ray.intersectObject(lid,false);
    if(hits.length){clear&&=5-hits[0].distance>distance+.03;if(angle===81)tiredCovered++;if(angle===170)closedCovered++;}
   }
  }
  add('Веко '+s+': не пересекает зрачок при закрытии',clear);
  add('Усталость '+s+': веко перекрывает часть зрачка',tiredCovered>0&&tiredCovered<p.count);
  add('Сон '+s+': веко закрывает весь зрачок',closedCovered===p.count);
  pivot.rotation.x=0;
 }
 // Fabric sectors must be watertight in local space, including their cut edges.
 let closed=true,panels=0;m.group.traverse(o=>{if(o.isMesh&&(o.name==='CoatBodice'||o.name==='CoatSkirt')){
  panels++;const p=o.geometry.attributes.position,idx=o.geometry.index,edges=new Map();
  const vertex=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(4)).join(',');
  for(let i=0;i<idx.count;i+=3)for(let k=0;k<3;k++){const a=vertex(idx.getX(i+k)),b=vertex(idx.getX(i+(k+1)%3)),key=[a,b].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}
  closed&&=[...edges.values()].every(n=>n===2);
 }});add('Халат: замкнутые объёмные детали',closed&&panels===2,String(panels));
 let materials=true;m.group.traverse(o=>{if(o.isMesh){for(const mat of Array.isArray(o.material)?o.material:[o.material])if(!o.userData.humanOutline)materials&&=mat.isMeshStandardMaterial&&(mat.flatShading||mat===m.materials.FaceSkin)&&mat.roughness===.69&&mat.metalness===0;}});add('Матовые материалы; сглажено только лицо',materials);
 const faceMaterial=m.group.getObjectByName('Head').material;add('Лицо: без полос от плоского освещения',!faceMaterial.flatShading&&!faceMaterial.map);
 for(const [key,pos] of Object.entries({root:[0,95,0],'shoulder.L':[20,145,0],'shoulder.R':[-20,145,0],'hip.L':[9,92,0],'hip.R':[-9,92,0],'knee.L':[9,50,0],'ankle.L':[9,8,0]})){
  // Joint specification is checked in the zero-angle T pose, not the animated rest pose.
  for(const [n,j] of Object.entries(m.joints)){j.position.copy(m.animator.rest[n].p);j.quaternion.copy(m.animator.rest[n].q);}m.group.updateMatrixWorld(true);const p=m.joints[key].getWorldPosition(new THREE.Vector3());add('Шарнир '+key,p.distanceTo(new THREE.Vector3(...pos))<.01);
 }
 let finite=true;for(const clip of humanAnimations){m.animator.play(clip,{L:90});for(let i=0;i<30;i++){m.animator.update(.05,140);for(const j of Object.values(m.joints))finite&&=[...j.position,...j.quaternion].every(Number.isFinite);}}add('Все 23 клипа: конечные трансформации',finite);
 // Regression: cloth responds to acceleration, settles at rest and retains welded seams.
 m.setOutfit('work');m.animator.play('walk');for(let i=0;i<120;i++)m.animator.update(1/60,140);
 const cloth=m.animator.cloth,moving=Math.abs(cloth.angle)+Math.abs(cloth.velocity);
 add('Ткань: упругая реакция и предел 12°',moving>1e-4&&cloth.stats.maxAngle<=Math.PI/15+1e-6);
 m.animator.play('idle');for(let i=0;i<240;i++)m.animator.update(1/60,0);
 add('Ткань: затухание после остановки',Math.abs(cloth.angle)<.001&&Math.abs(cloth.velocity)<.001);
 let calls=0;m.animator.play('sitUp',{bedHeight:50,onComplete:()=>calls++});m.animator.from=null;m.animator.update(0);
 add('sitUp: начало на правом боку',Math.abs(m.joints.root.rotation.z-Math.PI/2)<.001);
 for(let i=0;i<100;i++)m.animator.update(.02,0);
 add('sitUp: подъём корпуса 70°, голени вниз',Math.abs(m.joints.spine.rotation.x-70*Math.PI/180)<.001&&Math.abs(m.joints['knee.L'].rotation.x-Math.PI/2)<.001&&Math.abs(m.joints.root.position.y-50)<.001);
 add('sitUp: завершение один раз',calls===1);
 const pose=(clip,time)=>{m.setFace('neutral');m.animator.play(clip);m.animator.from=null;m.animator.update(0);for(let t=0;t<time-1e-6;t+=.01)m.animator.update(Math.min(.01,time-t));};
 const world=n=>m.joints[n].getWorldPosition(new THREE.Vector3());
 pose('sleepBreath',0);add('Сон: правый бок внизу, левая рука сверху',world('shoulder.L').y>world('shoulder.R').y+30);
 pose('toss.arm',.2);add('Сон: взмах верхней левой рукой',world('shoulder.L').y>world('shoulder.R').y+30&&Math.abs(m.joints['elbow.L'].rotation.y)>.5&&Math.abs(m.joints['elbow.R'].rotation.y)<.001);
 pose('sleepBreath',0);
 const axis=new THREE.Vector3(0,1,0).applyQuaternion(m.joints.root.quaternion);pose('toss.turn',.28);
 add('Сон: поворот вокруг продольной оси',axis.distanceTo(new THREE.Vector3(0,1,0).applyQuaternion(m.joints.root.quaternion))<.001&&Math.abs(m.joints.root.quaternion.y)>.1);
 pose('adjustGlasses',.4);const bridge=m.group.getObjectByName('Bridge').getWorldPosition(new THREE.Vector3());add('Очки: кисть у переносицы',world('hand.R').distanceTo(bridge)<10);
 pose('write',.4);add('Доска: кисть выше уровня глаз',world('hand.R').y>world('head').y);
 pose('towel',.6);add('Полотенце: обе кисти у лица',world('hand.L').distanceTo(world('head'))<30&&world('hand.R').distanceTo(world('head'))<30&&m.group.getObjectByName('FaceTowel').visible);
 pose('idle',.3);m.setFace('tired');m.animator.update(0);add('Усталость: опущенные веки',m.joints['lid.L'].rotation.x>.9);
 m.setFace('angry');m.animator.update(0);add('Злость: брови сведены к переносице',m.joints['brow.L'].rotation.z>0&&m.joints['brow.R'].rotation.z<0&&m.joints['brow.L'].position.y<5);
 m.setOutfit('pajama');m.setBadge(true);add('Пропуск скрыт в пижаме',!m.joints.badge.visible);m.setOutfit('work');add('Пропуск виден в халате',m.joints.badge.visible);m.setBadge(badge);
 m.setOutfit(outfit);m.setFace(face);m.group.scale.copy(scale);m.animator.play(name);m.animator.update(0);return results;
}
