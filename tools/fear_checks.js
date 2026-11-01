import * as THREE from 'three';
import {createFear} from '../js/models/fear.js';
import {createReflex} from '../js/models/reflex.js';
import {visibleBox,visibleTris} from '../js/models/humanKit.js';
export function checkFear(){
 const m=createFear(),a=m.animator,j=m.joints,r=[],add=(name,ok,detail='')=>r.push({name,ok,detail});
 a.play('idle');a.from=null;a.play('tremble',{amount:0});a.update(0);const box=visibleBox(m.group),height=box.max.y-box.min.y;
 add('Бюджет ≤ 1000',visibleTris(m.group)<=1000,String(m.tris));add('Рост 11 ± 0,2 см',Math.abs(height-11)<=.2,height.toFixed(3));add('Тапочки на полу',Math.abs(box.min.y)<.001,box.min.y.toFixed(4));
 let mats=true,outlines=true;m.group.traverse(o=>{if(!o.isMesh||o.userData.humanOutline)return;mats&&=o.material.isMeshStandardMaterial&&o.material.flatShading&&o.material.roughness===.69&&o.material.metalness===0&&!o.material.map;outlines&&=o.userData.noOutline?!o.children.some(c=>c.userData.humanOutline):o.children.some(c=>c.userData.humanOutline);});add('Матовые flatShading материалы без текстур',mats);add('Обводка и исключения',outlines);
 add('Руки скрыты рукавами',!m.group.getObjectByName('Hand.L')&&!m.group.getObjectByName('Hand.R')&&!!j['hand.R']);
 a.play('tremble',{amount:1});let bounded=true,ground=true,finite=true,minX=1,maxX=-1;
 for(let i=0;i<3600;i++){a.update(1/60);minX=Math.min(minX,j.root.position.x);maxX=Math.max(maxX,j.root.position.x);bounded&&=Math.abs(j.root.position.x)<=.150001&&Math.abs(j.root.position.z)<=.150001;ground&&=Math.abs(visibleBox(m.group).min.y)<.05;for(const p of Object.values(j))finite&&=[...p.position,...p.quaternion,...p.scale].every(Number.isFinite);}
 add('60 с: дрожь ограничена ±0,15 без накопления',bounded,`${minX.toFixed(3)} … ${maxX.toFixed(3)}`);add('60 с: стопы не отрываются > 0,05',ground);add('Конечность трансформаций',finite);
 a.play('tremble',{amount:0});a.update(.01);add('Отключение дрожи возвращает исходный root',Math.abs(j.root.position.x)<1e-8&&Math.abs(j.root.position.z)<1e-8);
 const ref=createReflex();ref.group.position.set(3,0,2);ref.group.rotation.y=.4;m.setHideTarget(ref).lookAt(new THREE.Vector3(10,0,15));let hidden=0;a.play('intro',{onHidden:()=>hidden++});for(let i=0;i<160;i++)a.update(.01);add('intro: onHidden один раз и автопереход в hide',hidden===1&&a.name==='hide',String(hidden));
 const expected=ref.hideSpot.localToWorld(new THREE.Vector3(0,0,-3.1));add('Укрытие следует за hideSpot с безопасным отступом',m.group.position.distanceTo(expected)<1e-6);add('Одинаковый поворот с Рефлексом',m.group.quaternion.angleTo(ref.group.quaternion)<1e-6);
 m.lookAt(m.group.position.clone().add(new THREE.Vector3(0,0,3)));a.update(.1);add('Паук ближе 6: полный присед',j.root.scale.y===.7);
 m.lookAt(m.group.position.clone().add(new THREE.Vector3(0,0,12)));for(let i=0;i<20;i++)a.update(.1);add('Паук дальше 6: выход из полного приседа',j.root.scale.y===1);
 let sweat=true;for(let i=0;i<200;i++){a.update(.01);sweat&&=j.sweat.scale.x>=0&&j.sweat.scale.x<=1.00001&&j.sweat.position.z<1;}
 add('Капля: масштаб 0…1, вне оправ',sweat);
 for(const model of [m,ref]){model.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}return r;
}
