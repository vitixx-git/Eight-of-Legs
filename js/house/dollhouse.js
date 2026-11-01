import * as THREE from 'three';
import * as k from './kit.js';
import {rooms,houseConfig} from './layout.js';
import {furnishRoom} from './furnish.js';
import {buildStairs} from './room.js';
export function makeDollCamera(){
 // 1680 см вместо 1450: заданный дом шириной 980 см + поля не помещается в правые 65% кадра 1450 см.
 const width=1680,height=945,camera=new THREE.OrthographicCamera(-896,784,height/2,-height/2,.1,4000),target=new THREE.Vector3(-159,378,0),angle=8*Math.PI/180;
 camera.position.copy(target).add(new THREE.Vector3(0,Math.sin(angle)*1800,Math.cos(angle)*1800));camera.lookAt(target);camera.updateMatrixWorld();return camera;
}
export function addLighting(scene){const ambient=new THREE.HemisphereLight('#ffd9a8','#4a3a52',.6);ambient.name='HOUSE_AMBIENT';const sun=new THREE.DirectionalLight('#ffcf8a',1);sun.name='HOUSE_SUN';sun.position.set(-400,1000,-600);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-900;sun.shadow.camera.right=900;sun.shadow.camera.top=900;sun.shadow.camera.bottom=-900;sun.shadow.camera.far=2400;sun.shadow.normalBias=3;sun.shadow.bias=-.001;const fill=new THREE.DirectionalLight('#fff1d6',.8);fill.name='HOUSE_VIEW_FILL';fill.position.set(200,500,1400);scene.add(ambient,sun,sun.target,fill);const moon=new THREE.Mesh(new THREE.SphereGeometry(27,16,10),new THREE.MeshBasicMaterial({color:'#f2ece0'}));moon.name='HOUSE_MOON';moon.position.set(-690,650,-200);scene.add(moon);moon.visible=false;
 return {ambient,sun,moon,fill,setVariant(value){const night=value==='NIGHT';scene.background=new THREE.Color(night?'#2b2740':'#bfe0f2');ambient.color.set(night?'#6a6aa0':'#ffd9a8');ambient.groundColor.set(night?'#1d1519':'#4a3a52');ambient.intensity=night?.4:.6;sun.color.set(night?'#9eabd5':'#ffcf8a');sun.intensity=night?.25:1;sun.castShadow=!night;fill.color.set(night?'#96a5cc':'#fff1d6');fill.intensity=night?.1:.8;moon.visible=night;}};
}
export async function buildHouse(options={}){
 const scene=new THREE.Scene(),root=new THREE.Group();root.name='HOUSE';scene.add(root);const furnished={};
 for(const key of Object.keys(rooms)){const group=new THREE.Group();group.name=rooms[key].id;group.position.fromArray(rooms[key].world);root.add(group);furnished[key]=await furnishRoom(key,group,{config:options.config??houseConfig,manifest:options.manifest,useKit:options.useKit});}
 const stairs=buildStairs(root),exterior=new THREE.Group();exterior.name='HOUSE_CUTAWAY_ONLY';root.add(exterior);
 for(const y of [-12,270,290])k.box(exterior,'FLOOR_SLAB',[988,20,370],[60,y,-1],'#6b4a32',1.5);
 // Перекрытие не закрывает винтовую лестницу: две плиты по сторонам колодца.
 const middleSlabs=[];for(const child of [...exterior.children])if(child.name==='FLOOR_SLAB'&&(child.position.y===270||child.position.y===290)){child.visible=false;middleSlabs.push(child);}
 for(const [x,width] of [[-280,300],[340,420]]){k.box(exterior,'FLOOR_SLAB',[width,20,365],[x,290,0],'#6b4a32',1.5);k.box(exterior,'CEILING_BEAM',[width,20,365],[x,270,0],'#b08a5a',1);}
 k.box(exterior,'SOLID_UPPER_WALL',[50,260,205],[-405,430,-80],'#e6d0ae',1);
 const roofShape=new THREE.Shape();roofShape.moveTo(-450,560);roofShape.lineTo(60,760);roofShape.lineTo(570,560);roofShape.closePath();const roofGeo=new THREE.ExtrudeGeometry(roofShape,{depth:390,bevelEnabled:false});k.mesh(exterior,'ROOF',roofGeo,'#8a4a3a',[0,0,-190],2);
 k.box(exterior,'RoofCornice',[1035,12,390],[60,559,5],'#6b4a32',1);
 const lawn=k.box(exterior,'LAWN',[6000,8,4250],[-150,-30,1875],'#7fa65a',0);lawn.receiveShadow=true;
 k.box(exterior,'PATH',[125,1,2500],[-365,-25,1300],'#d8c8a2',0);
 const lighting=addLighting(scene);let variant='DAY',logicalTime=0;
 function setVariant(value){variant=value;lighting.setVariant(value);for(const f of Object.values(furnished))f.setVariant(value);lawn.material.color.set(value==='NIGHT'?'#43544e':'#7fa65a');}
 function update(t=0,p=0){logicalTime=t;for(const f of Object.values(furnished))f.update(t,p);}
 setVariant('DAY');update(0,0);
 return {scene,root,rooms:furnished,stairs,exterior,lighting,config:structuredClone(options.config??houseConfig),setVariant,update,get time(){return logicalTime;},get variant(){return variant;},get report(){return Object.values(furnished).flatMap(f=>f.report);},get triangles(){return k.triangles(root);},dispose(){for(const f of Object.values(furnished))f.dispose();stairs.dispose();k.dispose(exterior);lighting.sun.shadow.dispose();lighting.moon.geometry.dispose();lighting.moon.material.dispose();scene.clear();}};
}
