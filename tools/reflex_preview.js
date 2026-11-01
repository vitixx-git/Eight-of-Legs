import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createReflex} from '../js/models/reflex.js';
import {createScientist} from '../js/models/scientist.js';
import {createSpider} from '../js/models/spider.js';
import {visibleBox} from '../js/models/humanKit.js';
import {checkReflex} from './reflex_checks.js';
import {checkHuman} from './scientist_checks.js';
const $=id=>document.getElementById(id),scene=new THREE.Scene();scene.background=new THREE.Color('#777a80');
const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const camera=new THREE.PerspectiveCamera(38,1,.1,500);camera.position.set(22,17,43);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,6,0);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xf4f3ff,0x585160,2));const light=new THREE.DirectionalLight(0xffeddc,3);light.position.set(10,30,25);scene.add(light);scene.add(new THREE.GridHelper(50,50,0x56515b,0x6b6670));
const model=createReflex(),scientist=createScientist(),spider=createSpider({clips:false});scene.add(model.group,scientist.group,spider.group);
scientist.group.scale.setScalar(12/visibleBox(scientist.group).getSize(new THREE.Vector3()).y);scientist.group.position.x=-9;
const spiderSize=visibleBox(spider.group).getSize(new THREE.Vector3());spider.group.scale.setScalar(3/spiderSize.y);spider.group.position.x=10;
let beats=0;const labels={intro:'Появление',idle:'Пружинящая стойка'};
function play(n){beats=0;model.animator.play(n,{onBeat:()=>beats++});}
$('intro').onclick=()=>play('intro');$('idle').onclick=()=>play('idle');
for(const [id,pos,target] of [['front',[0,10,39],[0,6,0]],['side',[35,10,0],[0,6,0]],['face',[0,10.5,15],[0,9.8,0]],['all',[22,17,43],[0,6,0]]])$(id).onclick=()=>{camera.position.fromArray(pos);controls.target.fromArray(target);controls.update();};$('all').click();
$('check').onclick=()=>{const position=scientist.group.position.clone();scientist.group.position.set(0,0,0);const r=[...checkReflex(model),...checkHuman(scientist).map(x=>({...x,name:'Учёный: '+x.name}))];scientist.group.position.copy(position);$('results').textContent=r.map(x=>(x.ok?'✓ ':'✗ ')+x.name+(x.detail?' — '+x.detail:'')).join('\n');};
function metrics(){const b=visibleBox(model.group);$('metrics').textContent=`Треугольники: ${model.tris} / 1200 (без обводки)\nРост в текущей позе: ${(b.max.y-b.min.y).toFixed(2)} см\nАнимация: ${labels[model.animator.name]}\nСигналы onBeat: ${beats} / 3`;}
let prev=performance.now();function frame(now){const dt=Math.min((now-prev)/1000,.05);prev=now;if(!$('pause').checked&&!document.hidden)model.animator.update(dt);controls.update();metrics();renderer.render(scene,camera);requestAnimationFrame(frame);}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,-Math.min(155,innerWidth*.16),0,innerWidth,innerHeight);camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();requestAnimationFrame(frame);
window.reflexPreview={model,scientist,spider,scene,camera,renderer,check:()=>checkReflex(model)};addEventListener('error',e=>{$('error').textContent=e.message;});
