import * as THREE from 'three';
import {visibleBox,visibleTris} from '../js/models/humanKit.js';
import {HumanAnimator} from '../js/models/humanAnimator.js';
export function checkReflex(m){
 const r=[],add=(name,ok,detail='')=>r.push({name,ok,detail}),a=m.animator;
 const snapshot=Object.fromEntries(Object.entries(m.joints).map(([n,j])=>[n,{p:j.position.clone(),q:j.quaternion.clone(),s:j.scale.clone()}]));
 const state={...a};
 const pose=(name,time)=>{a.play(name);a.from=null;a.update(0);for(let t=0;t<time-1e-8;t+=.01)a.update(Math.min(.01,time-t));};
 pose('idle',0);const b=visibleBox(m.group),h=b.max.y-b.min.y;
 add('Бюджет ≤ 1200',visibleTris(m.group)<=1200,String(visibleTris(m.group)));
 add('Рост 12 ± 0,2 см',Math.abs(h-12)<=.2,h.toFixed(3));add('Опора стоп y = 0',Math.abs(b.min.y)<.001,b.min.y.toFixed(4));
 add('Общий HumanAnimator',a instanceof HumanAnimator);
 let mats=true,outlines=true;m.group.traverse(o=>{if(!o.isMesh||o.userData.humanOutline)return;mats&&=o.material.isMeshStandardMaterial&&o.material.flatShading&&o.material.roughness===.69&&o.material.metalness===0&&!o.material.map;outlines&&=o.userData.noOutline?!o.children.some(c=>c.userData.humanOutline):o.children.some(c=>c.userData.humanOutline);});
 add('Матовые однотонные low-poly материалы',mats);add('Обводка только на отмеченных деталях',outlines);
 add('Молоточек прикреплён к правой кисти',m.joints.hammer.parent===m.joints['hand.R']);add('hideSpot за спиной',m.hideSpot.position.distanceTo(new THREE.Vector3(0,0,-1.5))<1e-8);
 const at=t=>{pose('idle',t);return m.joints.root.position.y;},y0=at(0),y25=at(.25),y50=at(.5);add('idle: период 0,5 с, подъём 0,3 см',Math.abs(y50-y0)<.001&&y25-y0>.29&&y25-y0<.35,(y25-y0).toFixed(3));
 let beats=0,done=0,finite=true;a.play('intro',{onBeat:()=>beats++,onComplete:()=>done++});a.from=null;a.update(0);
 for(let i=0;i<180;i++){a.update(.01);for(const j of Object.values(m.joints))finite&&=[...j.position,...j.quaternion,...j.scale].every(Number.isFinite);}
 add('intro: три onBeat и одно завершение',beats===3&&done===1,`${beats} / ${done}`);add('Конечные трансформации',finite);
 pose('intro',.25);add('Прыжок: высота 3 и середина пути −2',Math.abs(m.joints.root.position.z+2)<.01&&Math.abs(m.joints.root.position.y-7.4)<.01,`z=${m.joints.root.position.z.toFixed(3)}, таз=${m.joints.root.position.y.toFixed(3)}`);
 pose('intro',1.5);const end=Object.fromEntries(Object.entries(m.joints).map(([n,j])=>[n,j.quaternion.clone()]));pose('idle',0);add('intro заканчивается в стартовой позе idle',Object.entries(m.joints).every(([n,j])=>j.quaternion.angleTo(end[n])<.002),Object.entries(m.joints).filter(([n,j])=>j.quaternion.angleTo(end[n])>=.002).map(([n,j])=>n+':'+j.quaternion.angleTo(end[n]).toFixed(3)).join(', '));
 let clear=true,minClear=Infinity;const hp=new THREE.Vector3();
 for(const clip of ['intro','idle']){a.play(clip);a.from=null;for(let i=0;i<(clip==='idle'?600:150);i++){a.update(.01);const inverse=m.joints.head.matrixWorld.clone().invert();for(const name of ['HammerHead','HammerHandle']){const mesh=m.group.getObjectByName(name),p=mesh.geometry.attributes.position;for(let v=0;v<p.count;v++){hp.fromBufferAttribute(p,v).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);const d=Math.sqrt((hp.x/1.9)**2+((hp.y-1.2)/2.1)**2+(hp.z/2)**2);minClear=Math.min(minClear,d);clear&&=d>1;}}}}
 add('Молоточек: выборка вершин вне головы (intro и idle)',clear,minClear.toFixed(3));
 let bodyClear=true;for(const clip of ['intro','idle']){a.play(clip);a.from=null;for(let i=0;i<(clip==='idle'?600:150);i++){a.update(.01);const inv=m.joints.spine.matrixWorld.clone().invert();for(const name of ['HammerHead','HammerHandle']){const mesh=m.group.getObjectByName(name),p=mesh.geometry.attributes.position;for(let k=0;k<p.count;k++){hp.fromBufferAttribute(p,k).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);const dy=Math.max(0,Math.abs(hp.y-2.05)-.9);bodyClear&&=Math.sqrt((hp.x/.8)**2+dy*dy+(hp.z/.65)**2)>1.25;}}}}
 add('Молоточек: выборка вершин вне тела',bodyClear);
 Object.assign(a,state);for(const [n,s] of Object.entries(snapshot)){m.joints[n].position.copy(s.p);m.joints[n].quaternion.copy(s.q);m.joints[n].scale.copy(s.s);}m.group.updateMatrixWorld(true);return r;
}
