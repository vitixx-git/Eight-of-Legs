import * as THREE from 'three';
import {cameras} from './layout.js';
const cache=new WeakMap(),maskHooks=new WeakMap();
export function arenaCamera(){const h=540/5.11,w=960/5.11;const c=new THREE.OrthographicCamera(-w/2,w/2,h/2,-h/2,.1,500),a=55*Math.PI/180;const target=new THREE.Vector3(0,Math.cos(a)*30/5.11,-Math.sin(a)*30/5.11);c.position.copy(target).add(new THREE.Vector3(0,Math.sin(a)*200,Math.cos(a)*200));c.lookAt(target);c.updateMatrixWorld();return c;}
export function fallbackArena(){const c=document.createElement('canvas');c.width=960;c.height=540;const x=c.getContext('2d');x.fillStyle='#2b2236';x.fillRect(0,0,960,540);x.fillStyle='#71384e';x.beginPath();x.ellipse(480,300,300,246,0,0,Math.PI*2);x.fill();return {canvas:c,fallback:true,draft:true};}
function maskMaterial(m){
 if(maskHooks.has(m))return maskHooks.get(m);
 const uniform={value:0},original=m.onBeforeCompile,originalKey=m.customProgramCacheKey.bind(m),base=originalKey();
 m.onBeforeCompile=function(shader){original.call(this,shader);shader.uniforms.brainArenaMask=uniform;shader.fragmentShader='uniform float brainArenaMask;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() { if(brainArenaMask>0.5){vec2 safeUV=(gl_FragCoord.xy-vec2(960.0,480.0))/vec2(461.0,378.5);if(dot(safeUV,safeUV)<1.0)discard;}');};
 m.customProgramCacheKey=()=>base+'|brain-safe-arena-v2';m.needsUpdate=true;maskHooks.set(m,uniform);return uniform;
}
/** Предварительная компиляция того же набора шейдеров; не подменяет замер холодного запуска. */
export async function prepareBakes(renderer,brain){
 const scene=brain.root.parent;if(!renderer||!scene)return;
 brain.root.traverse(o=>{if(o.isMesh&&o.name!=='Floor'&&o.name!=='Floor_outline')for(const m of Array.isArray(o.material)?o.material:[o.material])maskMaterial(m);});
 if(renderer.compileAsync)await renderer.compileAsync(scene,arenaCamera());else renderer.compile(scene,arenaCamera());
}
export async function bakeBrain(renderer,brain,variant){
 if(!renderer)return variant==='COCKPIT'?fallbackCockpit():fallbackArena();
 let map=cache.get(brain);if(!map){map=new Map();cache.set(brain,map);}
 const key=variant+'|'+brain.generation+'|'+JSON.stringify(brain.config);if(map.has(key))return map.get(key);
 const start=performance.now(),arena=variant!=='COCKPIT',width=arena?960:352,height=arena?540:220;
 const scene=brain.root.parent;if(!scene?.isScene)throw Error('Для запекания root должен находиться непосредственно в THREE.Scene');
 const old={state:brain.state,time:brain.time,timeline:brain.timeline,background:scene.background,target:renderer.getRenderTarget(),autoClear:renderer.autoClear,viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),effects:brain.setEffectsEnabled(false)};
 const drawerState=brain.drawers.map(d=>[d.node,d.node.position.z]);
 const hidden=[],outlines=[],lights=[],uniforms=[],materials=new Map(),batches=[],panelMatrices=[];
 const target=new THREE.WebGLRenderTarget(width*2,height*2,{colorSpace:THREE.SRGBColorSpace});let result;
 try{
  brain.setLogicalTime(0);brain.setState(arena?'sleep':'amber');brain.drawers.forEach(d=>d.node.position.z=d.base+1.2);scene.background=new THREE.Color('#1a0d1c');
  const tint=new THREE.Color({REFLEX:'#ff9f6f',FEAR:'#9f7bff',WILL:'#d95a7a',COCKPIT:'#ffcf8a'}[variant]);
  for(const monitor of brain.monitors){uniforms.push([monitor.dark,monitor.dark.value]);if(!arena)monitor.dark.value=1;}
  brain.root.traverse(o=>{
   const id=o.userData.modelId,n=o.name;
   const actor=o.userData.brainActor||['DEF_REFLEX','DEF_FEAR','DEF_WILL'].includes(o.userData.model)||['SPIDER','DEF_REFLEX','DEF_FEAR','DEF_WILL','REFLEX','FEAR','WILL'].includes(n);
   if(['no_entry_sign','warning_sign'].includes(id)||actor||n==='CONSOLE_BARRIER'||n==='COCKPIT_PANEL'||id==='cockpit_chair'||arena&&(['no_entry_sign','warning_sign','defenders_bench','mind_core','thought_book'].includes(id)||n==='BRAIN_DOME'||n==='NEURONS'||n.startsWith('NERVE_TUBE'))){hidden.push([o,o.visible]);o.visible=false;}
   if(o.userData.brainOutlineWidth){const u=o.userData.brainOutlineWidth;uniforms.push([u,u.value]);u.value*=3;}
   if(o.isLight){lights.push([o,o.color.clone(),o.intensity]);if(arena){o.intensity*=variant==='FEAR'?.7:1;if(o.isPointLight)o.color.copy(tint);}}
   if(o.userData.humanOutline&&o.geometry?.attributes.normal){
    // Размер width задан в сантиметрах: нормализованный GLB имеет собственный масштаб.
    const geometry=o.geometry,copy=geometry.clone(),p=copy.attributes.position,norm=copy.attributes.normal,scale=o.getWorldScale(new THREE.Vector3());
    const w=(o.userData.width??.05)*2;
    for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+norm.getX(i)*w,p.getY(i)+norm.getY(i)*w,p.getZ(i)+norm.getZ(i)*w);
    p.needsUpdate=true;o.geometry=copy;outlines.push([o,geometry,copy]);
   }
   if(o.isMesh){
    if(arena&&o.isInstancedMesh&&o.name.startsWith('BATCH_')){const type=o.name==='BATCH_housing_outline'?'housing':o.name.slice(6),list=brain.panels.lists[type];if(list){panelMatrices.push([o,o.instanceMatrix.array.slice()]);const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();list.forEach((e,i)=>{if(e.seg<3)return;const factor=e.seg===5?1:.4;matrix.fromArray(o.instanceMatrix.array,i*16);matrix.decompose(pos,q,scale);pos.y*=factor;scale.y*=factor;matrix.compose(pos,q,scale);o.setMatrixAt(i,matrix);});o.instanceMatrix.needsUpdate=true;}}
    if(o.isInstancedMesh&&o.name==='BATCH_led'){batches.push([o,o.instanceColor.array.slice()]);for(let i=0;i<o.count;i++){const col=new THREE.Color().fromArray(o.instanceColor.array,i*3).lerp(tint,.5);o.setColorAt(i,col);}o.instanceColor.needsUpdate=true;}
    for(const m of Array.isArray(o.material)?o.material:[o.material]){
     if(n!=='Floor'&&n!=='Floor_outline'){const u=maskMaterial(m);uniforms.push([u,u.value]);u.value=arena?1:0;}
     if(m.emissive&&!materials.has(m)){materials.set(m,[m.emissive.clone(),m.emissiveIntensity]);if(arena&&m.emissiveIntensity>0&&m.emissive.getHex()!==0){m.emissive.copy(tint);m.emissiveIntensity*=variant==='FEAR'?.7:1;}}
    }
   }
  });
  let camera;if(arena)camera=arenaCamera();else{camera=new THREE.PerspectiveCamera(58,width/height,.1,500);camera.position.fromArray(cameras.cockpit.p);camera.lookAt(...cameras.cockpit.at);}
  renderer.autoClear=true;renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.setViewport(0,0,width*2,height*2);renderer.render(scene,camera);
  const pixels=new Uint8Array(width*height*16);renderer.readRenderTargetPixels(target,0,0,width*2,height*2,pixels);
  const full=document.createElement('canvas');full.width=width*2;full.height=height*2;const x=full.getContext('2d'),image=x.createImageData(full.width,full.height);
  for(let y=0;y<full.height;y++)image.data.set(pixels.subarray((full.height-1-y)*full.width*4,(full.height-y)*full.width*4),y*full.width*4);x.putImageData(image,0,0);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(full,0,0,width,height);
  result={canvas,ms:performance.now()-start,draft:brain.report.some(r=>r.status!=='loaded'),variant,cacheKey:key};map.set(key,result);
 }finally{
  renderer.setRenderTarget(old.target);renderer.autoClear=old.autoClear;renderer.setViewport(old.viewport);renderer.setScissor(old.scissor);renderer.setScissorTest(old.scissorTest);target.dispose();
  // Одно и то же разделяемое uniform восстанавливается в обратном порядке.
  uniforms.reverse().forEach(([u,value])=>u.value=value);
  hidden.forEach(([o,value])=>o.visible=value);outlines.forEach(([o,original,copy])=>{o.geometry=original;copy.dispose();});
  lights.forEach(([o,color,intensity])=>{o.color.copy(color);o.intensity=intensity;});materials.forEach(([color,intensity],m)=>{m.emissive.copy(color);m.emissiveIntensity=intensity;});
  scene.background=old.background;brain.setLogicalTime(old.time);if(old.timeline===null)brain.setState(old.state);else brain.setTimeline(old.timeline);
  panelMatrices.forEach(([o,array])=>{o.instanceMatrix.array.set(array);o.instanceMatrix.needsUpdate=true;});
  drawerState.forEach(([node,z])=>node.position.z=z);
  brain.setEffectsEnabled(old.effects);
  batches.forEach(([o,array])=>{o.instanceColor.array.set(array);o.instanceColor.needsUpdate=true;});
 }
 return result;
}
function fallbackCockpit(){const c=document.createElement('canvas');c.width=352;c.height=220;const x=c.getContext('2d');x.fillStyle='#1a0d1c';x.fillRect(0,0,c.width,c.height);return {canvas:c,fallback:true,draft:true};}
export function downloadBake(result,name){result.canvas.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+(result.draft?'_DRAFT':'')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
