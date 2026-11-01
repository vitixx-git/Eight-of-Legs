import * as THREE from 'three';
import {cabinetView} from '../js/lab/furnish.js';
export function checkLabView(lab){
 const results=[],check=(ok,name)=>results.push({ok:!!ok,name});
 lab.root.updateMatrixWorld(true);
 const origin=new THREE.Vector3(...cabinetView.position),camera=new THREE.PerspectiveCamera(60,.65,1,3000);
 camera.position.copy(origin);camera.lookAt(new THREE.Vector3(...cabinetView.target));camera.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 function visible(point,owner){
  const projected=point.clone().project(camera),direction=point.clone().sub(origin),distance=direction.length();
  if(Math.abs(projected.x)>.95||Math.abs(projected.y)>.95)return false;
  ray.set(origin,direction.normalize());ray.far=distance+1;
  const hit=ray.intersectObject(lab.root,true).find(h=>{let o=h.object;while(o){if(!o.visible||o.userData.humanOutline||o.userData.labOutline||o===lab.markers)return false;o=o.parent;}return h.object.isMesh;});
  if(!hit)return false;
  let node=hit.object;while(node){if(node===owner)return true;node=node.parent;}return false;
 }
 check(['FrontWall','BackWall','LeftWall','RightBack','RightFront','AboveDoor'].every(n=>lab.objects.LAB_WALLS.getObjectByName(n)?.visible),'четыре стены, правая стена с дверным проёмом');
 for(const x of [-85,-20,45])check(visible(new THREE.Vector3(x,170,-218.8),lab.objects.LAB_BOARD),`надпись на доске видна со шкафа (x=${x})`);
 const actor=lab.scientist?.group;
 const bodyInFrame=actor&&[new THREE.Vector3(0,5,0),new THREE.Vector3(0,177,0)].every(p=>{actor.localToWorld(p);p.project(camera);return Math.abs(p.x)<.95&&Math.abs(p.y)<.95;});
 check(bodyInFrame&&visible(actor.localToWorld(new THREE.Vector3(0,157,10)),actor),'учёный виден со шкафа одновременно с доской');
 if(actor){const facing=new THREE.Vector3(0,0,1).transformDirection(actor.matrixWorld),toward=lab.objects.LAB_CABINET.position.clone().sub(actor.position);toward.y=0;check(facing.dot(toward.normalize())>.99,'учёный стоит лицом к шкафу');check(actor.position.z<lab.objects.LAB_TABLE.position.z&&lab.objects.LAB_BOARD.position.z<actor.position.z,'стол перед учёным, доска за его спиной');}
 // Door opening plus a clear interior approach. Ignore floor and ceiling fittings.
 const doorway=new THREE.Box3(new THREE.Vector3(240,1,40),new THREE.Vector3(299,219,160));
 const blockers=[];lab.root.traverse(o=>{if(!o.isMesh||!o.visible||o.userData.humanOutline||o.userData.labOutline)return;let p=o;while(p){if(p===lab.markers||['LAB_DOOR_IN','LAB_WALLS','LAB_FLOOR'].includes(p.name))return;p=p.parent;}if(doorway.intersectsBox(new THREE.Box3().setFromObject(o)))blockers.push(o.name);});
 check(blockers.length===0,'дверь и подход свободны от предметов'+(blockers.length?': '+blockers.join(', '):''));
 check(lab.objects.LAB_CABINET.position.z>150&&lab.objects.LAB_BOARD.position.z< -200,'шкаф и доска у противоположных стен');
 // Compare independent floor furniture and wall decorations, not their assembled parts.
 const bounds=o=>{const box=new THREE.Box3();o.updateWorldMatrix(true,true);o.traverseVisible(m=>{if(m.isMesh&&!m.userData.labOutline&&!m.userData.humanOutline){m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}});return box;};
 check(!lab.decor.getObjectByName('bookcase_archive'),'высокий жёлтый стеллаж рядом с синим шкафом убран');
 check(!lab.decor.getObjectByName('archive_boxes'),'цветные архивные коробки убраны');
 check(!lab.decor.getObjectByName('hazard_floor_sign'),'жёлтый напольный знак убран');
 check(!lab.root.getObjectByName('MOP_BUCKET'),'синее ведро убрано');
 const furniture=['LAB_CABINET','WRITING_DESK','LAB_TABLE','FLASK_SET','POISON_UNIT','DISPOSER','LAB_CHAIR_0','LAB_CHAIR_1','SCIENTIST_COAT','LAB_BOARD'].map(n=>lab.objects[n]);
 furniture.push(...lab.decor.children.filter(o=>['cabinet_low','bookcase_archive','archive_boxes','chair_office','houseplant','hazard_floor_sign','clock_wall'].includes(o.name)&&o.visible));
 const overlaps=[];
 for(let i=0;i<furniture.length;i++)for(let j=i+1;j<furniture.length;j++){const a=bounds(furniture[i]),b=bounds(furniture[j]);if(a.intersectsBox(b))overlaps.push(`${furniture[i].name} / ${furniture[j].name}`);}
 check(overlaps.length===0,'отдельные шкафы, мебель и декор не пересекаются'+(overlaps.length?': '+overlaps.join(', '):''));
 const cabinets=furniture.filter(o=>['LAB_CABINET','cabinet_low','bookcase_archive'].includes(o.name));
 const fittings=lab.root.getObjectByName('WORKSHOP_DETAILS').children.filter(o=>!o.userData.labOutline&&!o.userData.humanOutline&&!['FloorTile','SideSkirting','BackSkirting'].includes(o.name));
 const clashes=[];for(const cabinet of cabinets)for(const fitting of fittings)if(fitting.isMesh&&bounds(cabinet).intersectsBox(bounds(fitting)))clashes.push(`${cabinet.name} / ${fitting.name}`);
 check(clashes.length===0,'шкафы не входят в настенные украшения'+(clashes.length?': '+clashes.join(', '):''));
 const tabletop=bounds(lab.objects.LAB_TABLE);
 for(const n of ['POISON_CONTAINER','FLASK_TUBE_RACK',...Array.from({length:4},(_,i)=>'FLASK_CONE_'+i)]){const b=bounds(lab.objects[n]);check(b.min.x>=tabletop.min.x&&b.max.x<=tabletop.max.x&&b.min.z>=tabletop.min.z&&b.max.z<=tabletop.max.z,`${n} остаётся на столе после переноса`);}
 check(Math.abs(lab.objects.LAB_TABLE.position.z)<40,'рабочий стол ближе к центру комнаты');
 return results;
}
