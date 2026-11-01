import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createScientist} from '../js/models/scientist.js';
import {humanAnimations} from '../js/models/humanAnimator.js';
import {visibleBox} from '../js/models/humanKit.js';
import {checkHuman} from './scientist_checks.js';
const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();scene.background=new THREE.Color('#777a80');
const camera=new THREE.PerspectiveCamera(38,1,.1,2000);camera.position.set(245,185,360);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,93,0);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xf4f3ff,0x585160,2));const light=new THREE.DirectionalLight(0xffeddc,3);light.position.set(120,250,180);scene.add(light);
const grid=new THREE.GridHelper(400,20,0x56515b,0x6b6670);scene.add(grid);
const model=createScientist();scene.add(model.group);
const animationLabels={idle:'Покой',sleepBreath:'Дыхание во сне','toss.arm':'Взмах рукой во сне','toss.turn':'Поворот во сне','toss.head':'Движение головой во сне',fingerTwitch:'Подёргивание кисти',wakeEyes:'Открыть глаза',sitUp:'Сесть на кровати',walk:'Ходьба',carefulWalk:'Осторожная ходьба',wobble:'Потеря равновесия',fall:'Падение',bump:'Столкновение',resist:'Сопротивление',bendPick:'Поднять предмет',carry:'Нести предмет',wash:'Умыться',towel:'Вытереть лицо',useConsole:'Использовать пульт',holdButton:'Удерживать кнопку',adjustGlasses:'Поправить очки',pour:'Налить из колбы',write:'Писать на доске'};
const faceLabels={neutral:'Спокойствие',surprised:'Удивление',tired:'Усталость',angry:'Злость'};
let animation='idle';
for(const name of humanAnimations){const b=document.createElement('button');b.textContent=animationLabels[name];b.addEventListener('click',()=>{animation=name;model.animator.play(name,{L:+$('balance').value});metrics();for(const x of $('buttons').children)x.classList.toggle('active',x===b);});$('buttons').append(b);}
for(const name of ['neutral','surprised','tired','angry']){const b=document.createElement('button');b.textContent=faceLabels[name];b.onclick=()=>model.setFace(name);$('faces').append(b);}
$('outfit').onchange=()=>{model.setOutfit($('outfit').value);metrics();};$('badge').onchange=()=>model.setBadge($('badge').checked);
// Three.js handles negative determinants by reversing front-face winding at render time.
// Never reverse shared geometry indices: that would flip the non-mirrored model too.
$('mirror').onchange=()=>{model.group.scale.x=$('mirror').checked?-1:1;};
$('balance').oninput=()=>{model.animator.opts.L=+$('balance').value;};
$('speed').oninput=()=>{$('speedValue').textContent=$('speed').value;};
for(const [id,pos] of [['front',[0,110,420]],['side',[420,110,0]],['top',[0,470,.01]],['face',[0,166,110]]])$(id).onclick=()=>{camera.position.set(...pos);controls.target.set(0,id==='face'?162:90,0);controls.update();};
function metrics(){const b=visibleBox(model.group),size=b.getSize(new THREE.Vector3());$('metrics').textContent=`Треугольники: пижама ${model.tris.pajama} · халат ${model.tris.work}\nВысота в текущей позе: ${size.y.toFixed(1)} см\nАнимация: ${animationLabels[animation]}`;}
$('check').onclick=()=>{const result=checkHuman(model);$('results').textContent=result.map(x=>(x.ok?'✓ ':'✗ ')+x.name+(x.detail?' — '+x.detail:'')).join('\n');metrics();};
let lastMetrics=0;let prev=performance.now();function frame(now){if(now-lastMetrics>300){metrics();lastMetrics=now;}const dt=Math.min((now-prev)/1000,.05);prev=now;if(!$('pause').checked&&!document.hidden)model.animator.update(dt,+$('speed').value);controls.update();renderer.render(scene,camera);requestAnimationFrame(frame);}function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();metrics();requestAnimationFrame(frame);
window.scientistPreview={model,scene,camera,renderer,check:()=>checkHuman(model)};
addEventListener('error',e=>{$('error').textContent=e.message;});
