import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createWill} from '../js/models/will.js';
import {createFear} from '../js/models/fear.js';
import {createReflex} from '../js/models/reflex.js';
import {createScientist} from '../js/models/scientist.js';
import {createSpider} from '../js/models/spider.js';
import {visibleBox} from '../js/models/humanKit.js';
import {checkWill} from './will_checks.js';
import {checkReflex} from './reflex_checks.js';
import {checkHuman} from './scientist_checks.js';
import {checkFear} from './fear_checks.js';
const $=id=>document.getElementById(id),scene=new THREE.Scene();scene.background=new THREE.Color('#777a80');
const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const camera=new THREE.PerspectiveCamera(38,1,.1,500);camera.position.set(30,22,62);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,6,0);
scene.add(new THREE.HemisphereLight(0xf4f3ff,0x585160,2));const light=new THREE.DirectionalLight(0xffeddc,3);light.position.set(10,30,25);scene.add(light,new THREE.GridHelper(70,70,0x56515b,0x6b6670));
const model=createWill(),fear=createFear(),reflex=createReflex(),scientist=createScientist(),spider=createSpider({clips:false});scene.add(model.group,fear.group,reflex.group,scientist.group,spider.group);fear.group.position.x=-8;reflex.group.position.x=9;scientist.group.scale.setScalar(12.5/visibleBox(scientist.group).getSize(new THREE.Vector3()).y);scientist.group.position.x=-17;spider.group.scale.setScalar(3/visibleBox(spider.group).getSize(new THREE.Vector3()).y);spider.group.position.x=17;
let stomps=0,syllables=0,shakeUntil=0,dark=false;
model.onStomp=()=>{stomps++;if($('shake').checked)shakeUntil=performance.now()+120;};model.onSyllable=()=>syllables++;
function play(name){$('pause').checked=false;stomps=syllables=0;model.animator.play(name,name==='talk'?{text:$('text').value}:{});updateMetrics();}
for(const n of ['intro','talk','idle'])$(n).onclick=()=>play(n);
for(const [id,pos,target] of [['front',[0,10,43],[0,6,0]],['side',[40,12,0],[0,6,0]],['face',[0,12,14],[0,10,0]],['all',[30,22,62],[0,6,0]]])$(id).onclick=()=>{for(const other of [fear,reflex,scientist,spider])other.group.visible=id==='all';camera.position.fromArray(pos);controls.target.fromArray(target);controls.update();};$('all').click();
$('bg').onclick=()=>{dark=!dark;scene.background.set(dark?'#22232a':'#c4c6cc');};
$('check').onclick=()=>{const p=scientist.group.position.clone();scientist.group.position.set(0,0,0);const rows=[...checkWill(),...checkReflex(reflex).map(r=>({...r,name:'Рефлекс: '+r.name})),...checkFear().map(r=>({...r,name:'Страх: '+r.name})),...checkHuman(scientist).map(r=>({...r,name:'Учёный: '+r.name}))];scientist.group.position.copy(p);$('results').textContent=rows.map(r=>(r.ok?'✓ ':'✗ ')+r.name+(r.detail?' — '+r.detail:'')).join('\n');};
function updateMetrics(){const name=model.animator.name;for(const n of ['intro','talk','idle'])$(n).setAttribute('aria-pressed',String(n===name));$('metrics').textContent=`Треугольники: ${model.tris} / 1500 (без обводки)\nДействие: ${{intro:'Появление',talk:'Речь',idle:'Стойка со щитом'}[name]}\nСигналы шагов: ${stomps}\nСигналы слогов: ${syllables}`;}
let prev=performance.now();function frame(now){const dt=Math.min((now-prev)/1000,.05);prev=now;if(!$('pause').checked&&!document.hidden)model.animator.update(dt);controls.update();updateMetrics();if(now<shakeUntil&&$('shake').checked){camera.setViewOffset(innerWidth,innerHeight,-150+2*Math.sin(now),2*Math.cos(now),innerWidth,innerHeight);}else camera.setViewOffset(innerWidth,innerHeight,-150,0,innerWidth,innerHeight);renderer.render(scene,camera);requestAnimationFrame(frame);}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();requestAnimationFrame(frame);
window.willPreview={model,fear,reflex,scientist,spider,scene,camera,renderer,check:checkWill};addEventListener('error',e=>{$('error').textContent=e.message;});
