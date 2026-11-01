import * as THREE from 'three';
import { createSpider } from '../js/models/spider.js';
export async function checkSpider(exportModel){
 const m=createSpider(),results=[];
 function check(label,pass){results.push(`${pass?'OK':'FAIL'} ${label}`);if(!pass)throw new Error(results.join('\n'));}
 m.group.updateMatrixWorld(true);
 const box=new THREE.Box3();m.group.traverse(o=>{if(o.isMesh&&o.name!=='WebThread')box.union(new THREE.Box3().setFromObject(o,true));});
 const size=box.getSize(new THREE.Vector3());
 check('Треугольники ≤ 3000',m.tris<=3000);check('Материалы ≤ 7',Object.keys(m.materials).length<=7);
 const body=new THREE.Box3().setFromObject(m.meshes.Cephalothorax).union(new THREE.Box3().setFromObject(m.meshes.Abdomen));
 check('Длина тела 3 ± 0,1',Math.abs(body.max.z-body.min.z-3)<=.1);
 check('Размах 6 ± 0,2',Math.abs(size.x-6)<=.2);check(`Высота 1,4 ± 0,1 (${box.min.y.toFixed(3)}…${box.max.y.toFixed(3)}) ${Object.values(m.meshes).filter(o=>{const b=new THREE.Box3().setFromObject(o,true);return b.min.y<-.04||b.max.y>1.5;}).map(o=>o.name).join(',')}`,Math.abs(size.y-1.4)<=.1);
 const ys=m.legs.map(l=>l.tip.getWorldPosition(new THREE.Vector3()).y);
 check('Все 8 кончиков на земле',ys.length===8&&ys.every(y=>Math.abs(y)<1e-5));
 check('Две обводки',Object.values(m.meshes).filter(o=>o.userData.spiderOutline).length===2);
 check('11 валидных клипов',m.group.animations.length===11&&m.group.animations.every(c=>c.validate()));
 for(const name of ['idle','walk','crawl','turn','webShoot','climbEdge','earEnter','squish','pullLever','sitChair','release']){
  m.animator.play(name);for(let i=0;i<120;i++){m.animator.update(1/60,22);checkFinite(m);}
 }
 check('Все анимации: конечные трансформации',true);
 m.animator.play('walk');m.animator.update(.1,22);
 const q=m.legs.map(l=>l.hip.quaternion.clone());m.animator.update(.1,22);
 check('Walk изменяет позу лап',m.legs.some((l,i)=>l.hip.quaternion.angleTo(q[i])>.01));
 const data=await exportModel(false);check('GLB: запись и обратное чтение 11 клипов',data.clips===11&&data.bytes>1000);
 m.group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});Object.values(m.materials).forEach(mat=>mat.dispose());
 return results.join('\n');
}
function checkFinite(m){for(const n of m.animator.nodes)if(![...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()].every(Number.isFinite))throw new Error('NaN transform '+n.name);}
