import * as THREE from 'three';
import {buildRoom} from './room.js';
import {layout,config as defaults} from './layout.js';
import {loadKitModel} from '../kit/kitLoader.js';
import * as kit from './kit.js';
import {styleWorkshop,workshopProp} from './workshop.js';
import {createScientist} from '../models/scientist.js';
export const cabinetView={position:[-230,211,180],target:[10,125,-160]};
export async function furnishLab(root,mode='live',options={}){
 const config=options.config??structuredClone(defaults),objects=buildRoom(root),decor=new THREE.Group();decor.name='LAB_DECOR';root.add(decor);
 styleWorkshop(root,objects);
 const manifestURL=new URL('../../assets/lab_kit/lab_kit_manifest.json',import.meta.url),report=[],colliders=[],markers=new THREE.Group();markers.name='MISSING_ASSETS';root.add(markers);
 let manifest,manifestError='';try{const r=await fetch(manifestURL);if(!r.ok)throw Error('HTTP '+r.status);manifest=await r.json();}catch(e){manifestError=e.message;}
 const pending=!manifest||manifest.pendingAssets===true,entries=Array.isArray(manifest)?manifest:manifest?.models??[];
 const loaded=new Map();await Promise.all(entries.map(async entry=>{try{if(pending)throw Error('GLB не предоставлен');const obj=await loadKitModel(entry,manifestURL,config.lab);loaded.set(entry.id,obj);report.push({id:entry.id,status:'loaded',...obj.userData});}catch(e){report.push({id:entry.id,status:'missing',error:e.message});}}));
 function add(id,position,rotation=0,collider=false){const template=loaded.get(id)??workshopProp(id);if(!loaded.has(id)){const p=new THREE.Mesh(new THREE.OctahedronGeometry(3),new THREE.MeshBasicMaterial({color:'#d99b55',wireframe:true}));p.name=id;p.position.fromArray(position);markers.add(p);}if(!template)return null;const obj=template.clone(true);obj.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});obj.name=id;obj.position.fromArray(position);obj.rotation.y=rotation;decor.add(obj);const meshes=[];obj.traverse(o=>{if(o.isMesh)meshes.push(o);});const width=id==='spider_specimen'?.3:['cabinet_low','bookcase_archive','chair_office','houseplant'].includes(id)?2:.8;meshes.forEach(m=>kit.outline(m,width));if(collider){const b=new THREE.Box3().setFromObject(obj);b.expandByScalar(-2);colliders.push({id,box:b,object:obj});}return obj;}
 for(const p of layout)add(p.id,p.position,p.rotation,p.collider);
 for(let j=0;j<2;j++)for(let i=0;i<3;i++){const s=add('spider_specimen',[21+j*27+i*4,63,195-j*3]);if(s)s.userData.memoryOnly=true;}
 // Optional actor is excluded from background bakes. Model source remains untouched.
 let scientist=null;
 if(options.includeScientist!==false){scientist=createScientist();scientist.setOutfit('work');scientist.group.name='LAB_SCIENTIST';scientist.group.position.set(65,0,-95);scientist.group.rotation.y=Math.atan2(-230-65,202+95);root.add(scientist.group);scientist.animator.play('idle');}
 const flame=kit.mesh(decor,'SPIRIT_FLAME',new THREE.ConeGeometry(1.5,4,6),'#7dc9ff',[-120,117,-35],{emissive:'#7dc9ff',emissiveIntensity:1});
 const screenCanvas=document.createElement('canvas');screenCanvas.width=256;screenCanvas.height=128;const ctx=screenCanvas.getContext('2d'),tex=new THREE.CanvasTexture(screenCanvas);tex.colorSpace=THREE.SRGBColorSpace;
 // Screen is attached in normalized +Z-facing asset coordinates, not room coordinates.
 const monitor=decor.getObjectByName('monitor_crt');let screen=null;if(monitor){const bb=new THREE.Box3().setFromObject(monitor),size=bb.getSize(new THREE.Vector3());screen=kit.mesh(monitor,'SCREEN_WAVE',new THREE.PlaneGeometry(27,20),'#ffffff',[0,size.y*.59,monitor.userData.proceduralFallback?15.2:13],{map:tex,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:.25});}
 const lights=[];for(const z of [68,112]){const l=new THREE.PointLight('#7dff9a',7000,170,2);l.position.set(-238,80,z);root.add(l);lights.push(l);}
 let state='idle',t=0,elapsed=0,stoppedAge=Infinity,lastScreen=-1,currentMode=mode;
 const clock=decor.getObjectByName('clock_wall');let hands=[];if(clock){clock.traverse(o=>{if(/^Zeiger 0[12]$/.test(o.name))hands.push(o);});hands.sort((a,b)=>new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3()).length()-new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).length());hands=hands.map(h=>({node:h,base:h.rotation.z}));}
 const analyzer=decor.getObjectByName('analyzer');const indicators=[];analyzer?.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(/Material\.00[345]/.test(m.name))indicators.push(m);});
 function setMode(value){if(!['live','memory'].includes(value))throw Error('Неизвестный режим');currentMode=value;for(const n of ['JAR_SPIDERS_0','JAR_SPIDERS_1'])objects[n].visible=value==='memory';objects.WEB_DECOR.visible=value==='live';for(const n of ['houseplant','hazard_floor_sign']){const o=decor.getObjectByName(n);if(o)o.visible=value==='live';}decor.children.forEach(o=>{if(o.userData.memoryOnly)o.visible=value==='memory';});}
 function setState(value){if(!['idle','stopped','carrying','inserted','destroyed'].includes(value))throw Error('Неизвестное состояние');if(state==='idle'&&value!=='idle')stoppedAge=0;if(value==='idle')stoppedAge=Infinity;state=value;lastScreen=-1;}
 function drawScreen(){ctx.fillStyle='#102018';ctx.fillRect(0,0,256,128);ctx.strokeStyle='#7dff9a';ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<256;x++){const y=state==='idle'?64+Math.sin(x*.1+t*3)*22:64;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();if(state==='destroyed'){ctx.fillStyle='#7dff9a';ctx.font='bold 28px Arial';ctx.textAlign='center';ctx.fillText('НОРМА',128,40);}tex.needsUpdate=true;}
 function update(dt=0){dt=Math.max(0,Math.min(dt,.1));t+=dt;elapsed+=dt;scientist?.animator.update(dt);if(state!=='idle')stoppedAge+=dt;const burn=currentMode==='memory'||state==='idle'?1:Math.max(0,1-stoppedAge/.5);flame.visible=burn>0;flame.scale.setScalar(burn*(1+Math.sin(t*19)*.08));lights.forEach(l=>l.intensity=currentMode==='memory'||state==='idle'?7000:7000*Math.max(0,1-stoppedAge/1.5));const tank=objects.POISON_UNIT.getObjectByName('Tank');if(tank){tank.material.color.set(state==='idle'?'#7dff9a':'#6f7884');tank.material.emissiveIntensity=state==='idle'?.25:0;}indicators.forEach((m,i)=>{m.emissive.copy(m.color);m.emissiveIntensity=(state==='idle'?Math.floor(t)%3===i:i===2)?1:0;});const minutes=currentMode==='memory'?21*60+30:8*60+52+(options.scene==='S10'?Math.min(2,elapsed/(options.duration??60)*2):0);hands.forEach(({node,base},i)=>node.rotation.z=base-(i===0?minutes/720:minutes/60)*Math.PI*2);if(Math.floor(t*15)!==lastScreen){lastScreen=Math.floor(t*15);drawScreen();}}
 setMode(mode);update(0);
 const events=['stopped','destroyed'].map(type=>{const listener=()=>setState(type);root.addEventListener(type,listener);return[type,listener];});
 return {root,decor,objects,scientist,colliders,report,markers,config,manifestError,setMode,setState,update,get mode(){return currentMode;},get state(){return state;},get triangles(){return kit.tris(root);},get kitTriangles(){return kit.tris(decor)-kit.tris(flame);},dispose(){events.forEach(([type,fn])=>root.removeEventListener(type,fn));lights.forEach(l=>l.removeFromParent());kit.dispose(decor);kit.dispose(markers);if(scientist)kit.dispose(scientist.group);tex.dispose();}};
}
