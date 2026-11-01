import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpider } from '../js/models/spider.js';
import { SPIDER_ACTIONS } from '../js/models/spiderAnimator.js';
import { checkSpider } from './spider_checks.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#view'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#74747b');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,100);
camera.position.set(8,6,10);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.6,-.5);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x403448,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,7,5);scene.add(light);
const grid=new THREE.GridHelper(14,28,0x53515c,0x82818a);grid.position.y=-.025;scene.add(grid);
const model=createSpider();scene.add(model.group);
const status=document.querySelector('#status'),error=document.querySelector('#error');
function metrics(){
 model.group.updateMatrixWorld(true);
 const bodyBox=new THREE.Box3().setFromObject(model.meshes.Cephalothorax).union(new THREE.Box3().setFromObject(model.meshes.Abdomen));
 const visibleBox=new THREE.Box3();model.group.traverse(o=>{if(o.isMesh&&o.visible&&o.name!=='WebThread')visibleBox.union(new THREE.Box3().setFromObject(o,true));});
 const size=visibleBox.getSize(new THREE.Vector3());
 const feet=model.legs.map(l=>l.tip.getWorldPosition(new THREE.Vector3()));
 const result={tris:model.tris,materials:Object.keys(model.materials).length,bodyLength:bodyBox.max.z-bodyBox.min.z,size:size.toArray(),feetY:feet.map(p=>p.y),clips:model.group.animations.map(c=>c.name)};
 status.textContent=`Треугольники: ${model.tris} / 3000\nМатериалы: ${result.materials} / 7\nТело: ${result.bodyLength.toFixed(2)} · Размах: ${size.x.toFixed(2)}\nВысота: ${size.y.toFixed(2)} · Лап: ${feet.length}\nАнимация: ${animationLabels[model.animator.name]}`;
 return result;
}
const animationLabels={idle:'Покой',walk:'Ходьба',crawl:'Красться',turn:'Разворот',webShoot:'Выпустить паутину',climbEdge:'Перелезть через край',earEnter:'Забраться в ухо',squish:'Сплющивание',pullLever:'Потянуть рычаг',sitChair:'Прыгнуть в кресло',release:'Откинуться назад'};
let speed=22;
const buttons=document.querySelector('#buttons');
for(const name of SPIDER_ACTIONS){const button=document.createElement('button');button.textContent=animationLabels[name];button.onclick=()=>{model.animator.play(name);for(const b of buttons.children)b.classList.toggle('active',b===button);metrics();};buttons.append(button);}
document.querySelector('#speed').oninput=e=>{speed=Number(e.target.value);document.querySelector('#speedValue').value=speed;};
for(const [id,pos]of [['front',[0,2,11]],['side',[11,2,-.5]],['top',[0,12,-.49]]])document.querySelector('#'+id).onclick=()=>{camera.position.fromArray(pos);controls.update();};
async function exportModel(download=true){
 const copy=createSpider();copy.group.animator=undefined;
 // Export a clean idle pose, not the currently playing squish/earEnter transform.
 const data=await new GLTFExporter().parseAsync(copy.group,{binary:true,animations:copy.group.animations,onlyVisible:true});
 const gltf=await new GLTFLoader().parseAsync(data,'');
 if(gltf.animations.length!==11)throw new Error('GLB lost animation clips');
 if(download){const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='SPIDER.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 copy.group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});Object.values(copy.materials).forEach(m=>m.dispose());
 return {bytes:data.byteLength,clips:gltf.animations.length};
}
document.querySelector('#export').onclick=async()=>{try{const r=await exportModel();error.textContent='';status.textContent+=`\nGLB: ${r.clips} клипов, ${(r.bytes/1024).toFixed(0)} КБ`;}catch(e){error.textContent=e.message;console.error(e);}};
document.querySelector('#checks').onclick=async()=>{const out=document.querySelector('#checksResult');out.textContent='Проверка…';try{out.textContent=await checkSpider(exportModel);}catch(e){out.textContent=e.message;}};
let prev=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=(now-prev)/1000;prev=now;if(!document.hidden&&!document.querySelector('#pause').checked)model.animator.update(dt,speed);controls.update();renderer.render(scene,camera);}
function resize(){const left=330,width=Math.max(240,innerWidth-left);renderer.domElement.style.marginLeft=left+'px';renderer.domElement.style.width=width+'px';renderer.setSize(width,innerHeight,false);camera.aspect=width/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();metrics();requestAnimationFrame(frame);
// Browser-driven acceptance tests can inspect actual transforms and round-trip export.
window.spiderPreview={model,metrics,exportModel};
