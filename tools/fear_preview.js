import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createFear} from '../js/models/fear.js';
import {createReflex} from '../js/models/reflex.js';
import {createScientist} from '../js/models/scientist.js';
import {createSpider} from '../js/models/spider.js';
import {visibleBox} from '../js/models/humanKit.js';
import {checkFear} from './fear_checks.js';
import {checkReflex} from './reflex_checks.js';
import {checkHuman} from './scientist_checks.js';
const $=id=>document.getElementById(id),scene=new THREE.Scene();scene.background=new THREE.Color('#777a80');
const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const camera=new THREE.PerspectiveCamera(38,1,.1,500);camera.position.set(26,19,48);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,5,0);controls.enableDamping=false;
scene.add(new THREE.HemisphereLight(0xf4f3ff,0x585160,2));const light=new THREE.DirectionalLight(0xffeddc,3);light.position.set(10,30,25);scene.add(light,new THREE.GridHelper(60,60,0x56515b,0x6b6670));
const model=createFear(),reflex=createReflex(),scientist=createScientist(),spider=createSpider({clips:false});scene.add(model.group,reflex.group,scientist.group,spider.group);reflex.group.position.x=6;scientist.group.scale.setScalar(11/visibleBox(scientist.group).getSize(new THREE.Vector3()).y);scientist.group.position.x=-10;spider.group.scale.setScalar(3/visibleBox(spider.group).getSize(new THREE.Vector3()).y);
model.setHideTarget(reflex).lookAt(spider.group);let hidden=0,dark=false;
function distance(){const origin=model.group.position;spider.group.position.set(origin.x,0,origin.z+Number($('distance').value));$('distanceValue').value=$('distance').value;}
distance();$('distance').oninput=distance;
$('amount').oninput=()=>{model.animator.play('tremble',{amount:Number($('amount').value)});$('amountValue').value=$('amount').value;};
$('intro').onclick=()=>{model.group.position.set(-3,0,-2);model.animator.play('intro',{onHidden:()=>hidden++});};
$('hide').onclick=()=>model.animator.play('hide');$('idle').onclick=()=>{model.group.position.set(0,0,0);model.animator.play('idle');distance();};$('tremble').onclick=()=>$('amount').oninput();
for(const [id,pos,target] of [['front',[0,10,45],[0,5,0]],['side',[40,10,0],[0,5,0]],['face',[0,10,15],[0,8.7,0]],['all',[26,19,48],[0,5,0]]])$(id).onclick=()=>{camera.position.fromArray(pos);controls.target.fromArray(target);controls.update();};$('all').click();
$('bg').onclick=()=>{dark=!dark;scene.background.set(dark?'#22232a':'#c4c6cc');};
$('check').onclick=()=>{const p=scientist.group.position.clone();scientist.group.position.set(0,0,0);const rows=[...checkFear(),...checkReflex(reflex).map(r=>({...r,name:'Рефлекс: '+r.name})),...checkHuman(scientist).map(r=>({...r,name:'Учёный: '+r.name}))];scientist.group.position.copy(p);$('results').textContent=rows.map(r=>(r.ok?'✓ ':'✗ ')+r.name+(r.detail?' — '+r.detail:'')).join('\n');};
let prev=performance.now();function frame(now){const dt=Math.min((now-prev)/1000,.05);prev=now;if(!$('pause').checked&&!document.hidden){model.animator.update(dt);distance();}controls.update();const b=visibleBox(model.group);$('metrics').textContent=`Треугольники: ${model.tris} / 1000 (без обводки)\nРост сейчас: ${(b.max.y-b.min.y).toFixed(2)} см\nАнимация: ${{intro:'Появление',hide:'Укрытие',idle:'Стойка'}[model.animator.name]}\nСигналы onHidden: ${hidden}`;renderer.render(scene,camera);requestAnimationFrame(frame);}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,-Math.min(150,innerWidth*.16),0,innerWidth,innerHeight);camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();requestAnimationFrame(frame);
window.fearPreview={model,reflex,scientist,spider,scene,camera,renderer,check:checkFear};addEventListener('error',e=>{$('error').textContent=e.message;});
