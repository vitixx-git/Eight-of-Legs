import * as THREE from 'three';
import {rooms,debugRoutes} from './layout.js';
import {makeDollCamera} from './dollhouse.js';
const cache=new WeakMap();
export function projectHotspots(house,camera=makeDollCamera()){
 camera.updateMatrixWorld(true);house?.root.updateMatrixWorld(true);const result={};
 const project=(name,box,matrix)=>{const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(matrix).project(camera));const left=Math.min(...points.map(p=>(p.x*.5+.5)*1920)),right=Math.max(...points.map(p=>(p.x*.5+.5)*1920)),top=Math.min(...points.map(p=>(-.5*p.y+.5)*1080)),bottom=Math.max(...points.map(p=>(-.5*p.y+.5)*1080));result[name]={x:Math.round(left),y:Math.round(top),width:Math.round(right-left),height:Math.round(bottom-top)};};
 for(const [key,spec] of Object.entries(rooms)){const matrix=house?house.rooms[key].root.matrixWorld:new THREE.Matrix4().makeTranslation(...spec.world);project(key,new THREE.Box3(new THREE.Vector3(-spec.width/2,0,-spec.depth/2),new THREE.Vector3(spec.width/2,spec.height,spec.depth/2)),matrix);}
 project('STAIRS',new THREE.Box3(new THREE.Vector3(-130,0,-180),new THREE.Vector3(130,555,80)),house?.root.matrixWorld??new THREE.Matrix4());return result;
}
export function fallbackHouse(variant='DAY',hotspots=projectHotspots(null)){
 const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const x=canvas.getContext('2d'),night=variant==='NIGHT';x.fillStyle=night?'#2b2740':'#bfe0f2';x.fillRect(0,0,1920,1080);x.fillStyle=night?'#43544e':'#7fa65a';x.fillRect(0,950,1920,130);
 const labels={HALL:'ПРИХОЖАЯ',BATH:'ВАННАЯ',STUDY:'КОМНАТА',LIVING:'ГОСТИНАЯ',STAIRS:'ЛЕСТНИЦА'};
 for(const key of ['STAIRS','HALL','BATH','LIVING','STUDY']){const h=hotspots[key];x.fillStyle=night?'#655949':rooms[key]?.wall??'#b08a5a';x.fillRect(h.x,h.y,h.width,h.height);x.strokeStyle='#1d1519';x.lineWidth=6;x.strokeRect(h.x,h.y,h.width,h.height);x.fillStyle=night?'#fff1d6':'#49372f';x.font='bold 21px Arial';x.textAlign='center';x.fillText(labels[key],h.x+h.width/2,h.y+34);x.fillStyle=night?'#ffd98a':'#e9c79a';if(key!=='STAIRS'){x.fillRect(h.x+22,h.y+62,Math.min(75,h.width-44),72);x.fillStyle=night?'#7b6653':'#9a6b4a';x.fillRect(h.x+h.width*.35,h.y+h.height-75,h.width*.5,60);}else{for(let i=0;i<14;i++){const y=h.y+h.height-22-i*(h.height-45)/14;x.fillStyle=i%2?'#6b4a32':'#b08a5a';x.fillRect(h.x+20+(i%2)*h.width*.24,y,h.width*.6,13);}}}
 const top=hotspots.STUDY.y,left=hotspots.HALL.x-18,right=hotspots.STUDY.x+hotspots.STUDY.width+18;x.fillStyle='#8a4a3a';x.beginPath();x.moveTo(left,top);x.lineTo((left+right)/2,Math.max(70,top-165));x.lineTo(right,top);x.closePath();x.fill();x.stroke();
 const wardrobe=hotspots.STAIRS;x.fillStyle='#f2ece0';x.fillRect(wardrobe.x+20,wardrobe.y+65,wardrobe.width-40,30);x.fillStyle='#1d1519';x.font='bold 20px Arial';x.fillText('ГАРДЕРОБ',wardrobe.x+wardrobe.width/2,wardrobe.y+88);
 return {canvas,hotspots,variant,draft:true,fallback:true,ms:0};
}
export async function bakeHouse2D(renderer,house,variant='DAY'){
 if(!['DAY','NIGHT'].includes(variant))throw Error('Неизвестное освещение дома');
 if(!renderer)return fallbackHouse(variant,projectHotspots(house));
 let map=cache.get(house);if(!map){map=new Map();cache.set(house,map);}const key=variant+'|'+(house.revision??0)+'|'+JSON.stringify(house.config);if(map.has(key))return map.get(key);
 const start=performance.now(),camera=makeDollCamera(),hotspots=projectHotspots(house,camera);
 const old={variant:house.variant,time:house.time,target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),autoClear:renderer.autoClear};
 const animations=[];house.root.traverse(o=>{if(/^Zeiger 0[12]$/.test(o.name))animations.push([o,o.rotation.clone()]);});const occlusion=Object.fromEntries(Object.entries(house.rooms).map(([key,f])=>[key,f.occlusionHeight]));
 const visibility=[],outlines=[],progress=Object.fromEntries(Object.entries(house.rooms).map(([key,f])=>[key,f.progress]));
 const target=new THREE.WebGLRenderTarget(3840,2160,{colorSpace:THREE.SRGBColorSpace});let result;
 try{
  house.root.traverse(o=>{visibility.push([o,o.visible]);if(o.userData.houseDebug||o.userData.houseActor)o.visible=false;});
  for(const f of Object.values(house.rooms)){f.setOcclusionHeight(Infinity);f.root.visible=true;for(const name of ['LEFT_WALL','RIGHT_WALL']){const wall=f.root.getObjectByName(name);if(wall)wall.visible=true;}f.setClock(465);}house.exterior.visible=true;house.stairs.owned.visible=true;house.setVariant(variant);
  house.root.traverse(o=>{if(o.userData.humanOutline&&o.geometry?.attributes.normal){const original=o.geometry,copy=original.clone(),p=copy.attributes.position,n=copy.attributes.normal,w=(o.userData.width??.8)*2;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*w,p.getY(i)+n.getY(i)*w,p.getZ(i)+n.getZ(i)*w);p.needsUpdate=true;o.geometry=copy;outlines.push([o,original,copy]);}});
  renderer.setRenderTarget(target);renderer.setViewport(0,0,3840,2160);renderer.setScissorTest(false);renderer.autoClear=true;renderer.render(house.scene,camera);
  const pixels=new Uint8Array(3840*2160*4);renderer.readRenderTargetPixels(target,0,0,3840,2160,pixels);const full=document.createElement('canvas');full.width=3840;full.height=2160;const x=full.getContext('2d'),image=x.createImageData(3840,2160);for(let y=0;y<2160;y++)image.data.set(pixels.subarray((2159-y)*3840*4,(2160-y)*3840*4),y*3840*4);x.putImageData(image,0,0);
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;canvas.getContext('2d').drawImage(full,0,0,1920,1080);result={canvas,variant,hotspots,ms:performance.now()-start,draft:true,fallback:false};map.set(key,result);
 }finally{renderer.setRenderTarget(old.target);renderer.setViewport(old.viewport);renderer.setScissor(old.scissor);renderer.setScissorTest(old.scissorTest);renderer.autoClear=old.autoClear;target.dispose();outlines.forEach(([o,original,copy])=>{o.geometry=original;copy.dispose();});visibility.forEach(([o,v])=>o.visible=v);house.setVariant(old.variant);for(const [key,f] of Object.entries(house.rooms))f.update(old.time,progress[key]);for(const [key,f] of Object.entries(house.rooms))f.setOcclusionHeight(occlusion[key]);animations.forEach(([o,r])=>o.rotation.copy(r));}
 return result;
}
export function hitTestHotspots(hotspots,x,y){for(const key of ['BATH','STUDY','HALL','LIVING','STAIRS']){const h=hotspots[key];if(x>=h.x&&x<=h.x+h.width&&y>=h.y&&y<=h.y+h.height)return {room:key,...debugRoutes[key]};}return null;}
export function downloadCanvas(canvas,name){canvas.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
