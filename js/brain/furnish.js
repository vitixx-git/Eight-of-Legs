import * as THREE from 'three';
import * as k from './kit.js';
import {models,brainConfig,polar,colors} from './layout.js';
import {controlPanel} from './controlPanel.js';
import {buildBrainRoom} from './room.js';
import {makeProp} from './props.js';
import {createEyeFeed} from './eyeFeed.js';
import {loadKitModel,normalize} from '../kit/kitLoader.js';

/** Декор не управляет сюжетом. Время и события принадлежат S03 / C_Levers. */
export async function furnishBrain(root,options={}){
 const config=structuredClone(options.config??brainConfig),room=buildBrainRoom(root);
 const decor=new THREE.Group();decor.name='BRAIN_DECOR';root.add(decor);
 const report=[],instances=[],mixers=[],issues=[];
 const manifestURL=new URL('../../assets/brain_kit/brain_kit_manifest.json',import.meta.url);
 let entries=[],manifestError='';
 if(options.manifest)entries=Array.isArray(options.manifest)?options.manifest:options.manifest.models??[];
 else{
  try{
   const availability=await fetch(new URL('../../assets/brain_kit/availability.json',import.meta.url));
   const a=availability.ok?await availability.json():null;
   if(a?.available){const response=await fetch(manifestURL);if(!response.ok)throw Error('Манифест: HTTP '+response.status);const m=await response.json();entries=Array.isArray(m)?m:m.models??[];}
   else manifestError=a?.reason??'Манифест brain_kit не подключён';
  }catch(e){manifestError=e.message;}
 }
 for(const spec of models){
  const entry=entries.find(e=>e.id===spec.id);let template=null,error='';
  try{if(entry)template=await loadKitModel({...spec,...entry},manifestURL,config);}catch(e){error=e.message;issues.push(spec.id+': '+error);}
  const info={id:spec.id,status:template?'loaded':'procedural',error,materials:template?.userData.materials??[],before:template?.userData.before??0,after:template?.userData.after??0,rotY:config.rotY[spec.id]??0,recolor:config.recolor[spec.id]??{},targetCm:spec.targetHeightCm??spec.targetWidthCm??spec.targetLengthCm,animations:template?.animations?.map(c=>c.name)??[]};report.push(info);
  for(let i=0;i<spec.placements.length;i++){
   const [phi,r,y]=spec.placements[i];const obj=template?template.clone(true):makeProp(spec.id,i);
   if(!template)normalize(obj,spec);
   obj.name=spec.id+'_'+i;obj.userData.modelId=spec.id;
   obj.position.fromArray(polar(phi,r,y));obj.rotation.y=-phi*Math.PI/180;
   if(spec.id==='cockpit_chair')obj.rotation.y=Math.PI;
   if(spec.id==='eye_monitor')obj.rotation.x=-Math.PI/18;
   if(template){obj.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});k.outline(obj,.15);}
   if(spec.id==='thought_book')obj.traverse(o=>{if(o.isMesh&&!o.userData.humanOutline)for(const m of materialList(o))if(/Cover/i.test(m.name)||o.name==='Cover')m.color.set(colors[(i+config.seed)%colors.length]);});
   if(spec.id==='wake_alarm'&&template?.animations?.length){
    const clip=template.animations.find(c=>c.name==='Cylinder.005Action');
    if(clip&&obj.getObjectByName('Cylinder.005')){const mixer=new THREE.AnimationMixer(obj),action=mixer.clipAction(clip);action.setLoop(THREE.LoopRepeat,Infinity);action.play();mixers.push({mixer,action});}
   }
   decor.add(obj);instances.push(obj);if(!template)info.after+=k.triangles(obj);
  }
 }
 function materialList(o){return Array.isArray(o.material)?o.material:[o.material];}
 let panels=controlPanel(config),generation=0;root.add(panels.group);
 const eyeFeed=createEyeFeed(options.eyeView),monitors=[];
 for(const obj of instances.filter(o=>o.userData.modelId==='eye_monitor'))obj.traverse(m=>{
  if(!m.isMesh||m.userData.humanOutline)return;
  const old=materialList(m);if(m.name!=='Screen'&&!old.some(x=>x.name==='Screen'))return;
  const lid={value:0},dark={value:0};
  const screen=new THREE.MeshBasicMaterial({name:'Screen',color:'#ffffff',map:eyeFeed.texture,toneMapped:false});screen.userData.lid=lid;screen.userData.bakeDark=dark;
  screen.onBeforeCompile=shader=>{
   shader.uniforms.eyeOpen=lid;shader.uniforms.bakeDark=dark;shader.uniforms.closedFeed={value:eyeFeed.texture};
   shader.fragmentShader='uniform float eyeOpen; uniform float bakeDark; uniform sampler2D closedFeed;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`\n#ifdef USE_MAP\nvec2 ep=vMapUv-0.5;vec2 euv=0.5+ep*(1.0+0.12*dot(ep,ep));vec4 feed=texture2D(map,euv);if(vMapUv.y<1.0-eyeOpen)feed=texture2D(closedFeed,vMapUv);feed.rgb*=0.96+0.04*sin(vMapUv.y*160.0*3.14159);if(bakeDark>0.5)feed=vec4(0.01033,0.00402,0.01161,1.0);diffuseColor*=feed;\n#endif\n`);
  };
  // Материал экрана не должен подавлять остальные поверхности multi-material GLB.
  m.material=Array.isArray(m.material)?old.map(x=>x.name==='Screen'?screen:x):screen;
  monitors.push({mesh:m,material:screen,lid,dark});
 });
 // Боковые экраны: собственные UV ячеек 1 (пульс) и 7 (сны) общего атласа.
 const sideScreens=[];
 for(const [index,phi] of [-18,18].entries()){
  const g=new THREE.Group();g.name='SCREEN_SIDE_'+index;g.position.fromArray(polar(phi,50,12));g.rotation.y=-phi*Math.PI/180;decor.add(g);
  k.box(g,'SCREEN_SIDE',[8,5,.5],[0,0,0]);
  const geo=new THREE.PlaneGeometry(7.5,4.5),uv=geo.attributes.uv,cell=index===0?1:7;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(cell%4+uv.getX(i))/4,(Math.floor(cell/4)+uv.getY(i))/5);
  const screen=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:panels.atlas,toneMapped:false}));screen.position.z=.3;g.add(screen);sideScreens.push(screen);
  k.label(g,'SideLabel',index===0?'ПУЛЬС':'СНЫ',6,1,[0,-3,.3]);
 }
 // Перфорированная лента действительно соединяет рулон с модемом на +60°.
 const roll=instances.find(o=>o.userData.modelId==='thought_tape_roll');
 const modem=instances.filter(o=>o.userData.modelId==='neuro_modem').find(o=>o.position.x>0&&Math.abs(o.position.z+28.5)<1);
 const tapeMapCanvas=document.createElement('canvas');tapeMapCanvas.width=32;tapeMapCanvas.height=64;
 const tx=tapeMapCanvas.getContext('2d');tx.fillStyle='#f2ece0';tx.fillRect(0,0,32,64);tx.fillStyle='#2b2236';for(let y=0;y<64;y+=12){tx.fillRect(3,y,5,5);tx.fillRect(24,y,5,5);tx.fillRect(13,y+3,5,3);}
 const tapeMap=new THREE.CanvasTexture(tapeMapCanvas);tapeMap.colorSpace=THREE.SRGBColorSpace;tapeMap.wrapT=THREE.RepeatWrapping;tapeMap.minFilter=tapeMap.magFilter=THREE.NearestFilter;
 const start=roll.position.clone().add(new THREE.Vector3(0,1.5,0)),end=modem.position.clone().add(new THREE.Vector3(0,1.2,0)),delta=end.clone().sub(start),length=delta.length();
 const tape=new THREE.Mesh(new THREE.PlaneGeometry(1,length),k.material('ThoughtTape','#ffffff',{map:tapeMap,side:THREE.DoubleSide}));tape.name='THOUGHT_TAPE';tape.position.copy(start).add(end).multiplyScalar(.5);tape.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());tapeMap.repeat.y=length/3;decor.add(tape);
 for(const lamp of instances.filter(o=>o.userData.modelId==='neuro_lamp')){const height=Math.max(1,Math.sqrt(Math.max(0,80**2-lamp.position.x**2-lamp.position.z**2))-lamp.position.y);k.cylinder(decor,'LAMP_CORD',.05,height,[lamp.position.x,lamp.position.y+height/2,lamp.position.z],'#6b5a7a');}
 // Запрошенная интенсивность 0,6, без изменения физики освещения других сцен.
 const lamp=new THREE.PointLight('#ffd0f0',.6,15,2);lamp.name='PANEL_SPOT';lamp.position.set(-11,12,-33);decor.add(lamp);
 const drawers=[];
 for(const o of instances.filter(o=>o.userData.modelId.includes('memory_cabinet'))){
  let drawer=o.getObjectByName('SpiderDrawer');
  if(!drawer){drawer=new THREE.Group();drawer.name='SpiderDrawer';drawer.position.set(0,2,2.2);o.add(drawer);k.box(drawer,'DrawerFront',[7,1.6,.3],[0,0,0]);k.label(drawer,'DrawerLabel','ПАУКИ — НЕНАВИЖУ',6.8,1.2,[0,0,.2]);for(const [i,text] of ['ДЕТСТВО','ПАРОЛИ','СТЫДНОЕ'].entries())k.label(o,'CabinetLabel'+i,text,7,1,[0,4+i*2,2.4]);}
  drawers.push({obj:o,node:drawer,base:drawer.position.z});drawer.position.z+=1.2;
 }
 const events=options.eventTarget??root;
 let t=0,state='sleep',timeline=null,disposed=false,previousLevers=-1,quality='full',lowSeconds=0,effectsEnabled=true;
 const spider=new THREE.Vector3(0,0,45);
 const listeners=[['brain:state',e=>setState(e.state??e.detail?.state)],['C_Levers:time',e=>setTimeline(e.time??e.detail?.time)]];
 listeners.forEach(([name,fn])=>events.addEventListener(name,fn));
 function setState(value){if(!['sleep','waking','amber'].includes(value))throw Error('Неизвестное состояние мозга');state=value;timeline=value==='sleep'?null:value==='waking'?12:16.5;apply(0);}
 function setTimeline(value){if(!Number.isFinite(value))throw Error('Некорректное время');timeline=Math.max(0,value);state=timeline<5.5?'sleep':timeline<14?'waking':'amber';apply(0);}
 function apply(dt){
  const c=timeline??0,awake=c>=11.5,amber=THREE.MathUtils.clamp((c-14)/2.5,0,1);
  const tone=new THREE.Color('#ff6fae').lerp(new THREE.Color('#ffcf8a'),amber);
  room.setAwake(amber);room.objects.CONSOLE_BARRIER.visible=c<1.2;
  panels.update(dt,spider,state,c<5.5?0:c<5.8?1:c<6.1?2:3,c);
  tapeMap.offset.y=-t*.3;
  for(const o of instances){
   const id=o.userData.modelId;
   if(id==='state_light')o.traverse(m=>{if(m.isMesh&&!m.userData.humanOutline)for(const mat of materialList(m)){const index=['Red','Yellow','Green'].findIndex(name=>m.name===name||mat.name===name);if(index>=0){mat.emissive.copy(mat.color);mat.emissiveIntensity=index===(awake?2:c<5.5?0:1)?1.2:0;}}});
   if(id==='neuro_modem')o.traverse(m=>{if(!m.isMesh||m.userData.humanOutline)return;for(const mat of materialList(m))if(/LED|\.00[345]$/.test(m.name+' '+mat.name)){mat.emissive.copy(mat.color);mat.emissiveIntensity=(state!=='sleep'||m.id%2===0)&&Math.sin(t*6+(m.id%11))>0?1:.05;}});
   if(id==='mind_core'){o.rotation.y=t*Math.PI*.2;o.scale.setScalar(1+Math.sin(t*Math.PI*1.6)*.035);o.traverse(m=>{if(m.isMesh&&!m.userData.humanOutline)for(const mat of materialList(m)){mat.color.copy(tone);mat.emissive.copy(tone);mat.emissiveIntensity=.9;}});}
   if(id==='thought_book'){const index=Number(o.name.split('_').pop()),a=index*Math.PI/3+t*Math.PI*.1;o.position.set(Math.sin(a)*15,50+Math.sin(t+index)*4,-Math.cos(a)*15);o.rotation.y=-a;const cover=o.getObjectByName('Cover');if(cover)cover.rotation.z=Math.sin(t*2+index)*.15;}
   if(id==='gauge_dial'){const needle=o.getObjectByName('Needle'),index=Number(o.name.split('_').pop());if(needle)needle.rotation.z=(index===1?(awake?1.2:-1.2):index===2?(awake?-1.2:1.2):(c>=7&&c<8.5?Math.sin(c*18)*1.1:Math.sin(t*4)*.15))+Math.sin(t*29)*.025;}
   if(id==='wake_alarm')o.rotation.z=c>=11.5&&c<13?Math.sin((c-11.5)*Math.PI*24)*.04:0;
   if(id==='screen_curtains')for(const child of o.children)if(child.name==='Curtain')child.position.x=Math.sign(child.position.x)*(10+amber*3);
   if(id==='emotion_cauldron'){
    let liquid=o.getObjectByName('CAULDRON_LIQUID')??o.getObjectByName('Liquid');if(!liquid){liquid=k.cylinder(o,'Liquid',4.3,.15,[0,4.8,0],tone);for(let i=0;i<6;i++)k.sphere(o,'Bubble'+i,.4,[Math.sin(i)*3,5,Math.cos(i)*3],tone);}
    liquid.name='CAULDRON_LIQUID';liquid.material.color.copy(tone);liquid.material.emissive.copy(tone);liquid.material.emissiveIntensity=.7;
    for(let i=0;i<6;i++){const b=o.getObjectByName('Bubble'+i);if(b){const phase=(t*.5+i/6)%1;b.position.y=5+phase*3;b.scale.setScalar(1-phase*.8);b.material.color.copy(tone);b.material.emissive.copy(tone);b.material.emissiveIntensity=.4;}}
   }
  }
  root.updateMatrixWorld(true);
  for(const drawer of drawers){const distance=drawer.obj.getWorldPosition(new THREE.Vector3()).distanceTo(root.localToWorld(spider.clone()));const target=drawer.base+(distance<10?0:1.2);drawer.node.position.z=THREE.MathUtils.damp(drawer.node.position.z,target,25,dt);}
  eyeFeed.update(c>=11.5?11.5+t:c);
  if(effectsEnabled&&options.onAlarm&&c>=11.5&&c<13&&previousLevers<11.5)options.onAlarm();previousLevers=c;
  for(const {mixer,action} of mixers){action.enabled=c>=11.5&&c<13;mixer.setTime(Math.max(0,c-11.5));}
 }
 function update(dt=0,position){if(disposed)return;dt=Math.max(0,dt);t+=dt;if(position)spider.copy(position);apply(dt);}
 function setQuality(low){quality=low?'low':'full';let book=0,lamp=0;for(const o of instances){if(o.userData.modelId==='thought_book')o.visible=!low||book++%2===0;if(o.userData.modelId==='neuro_lamp')o.visible=!low||lamp++===0;}if(low&&!config.simplify.wake_alarm){config.simplify.wake_alarm=.5;import('three/addons/modifiers/SimplifyModifier.js').then(({SimplifyModifier})=>{if(disposed)return;const modifier=new SimplifyModifier();for(const alarm of instances.filter(o=>o.userData.modelId==='wake_alarm'&&!o.userData.proceduralFallback))alarm.traverse(o=>{if(!o.isMesh||o.userData.humanOutline||Array.isArray(o.material)||o.geometry.attributes.position.count<30)return;const old=o.geometry,count=old.attributes.position.count;try{const simplified=modifier.modify(old.clone(),Math.floor(count*.5));if(simplified.attributes.position.count>=3){o.geometry=simplified;old.dispose();}}catch(e){issues.push('Упрощение будильника: '+e.message);}});}).catch(e=>issues.push('SimplifyModifier: '+e.message));}}
 function noteFPS(fps,seconds=1){if(fps>0&&fps<50)lowSeconds+=seconds;else lowSeconds=0;if(lowSeconds>=3&&quality!=='low')setQuality(true);}
 update(0);
 return {root,decor,room,objects:room.objects,report,config,eyeFeed,drawers,instances,issues,monitors,get generation(){return generation;},get quality(){return quality;},get panels(){return panels;},get state(){return state;},get time(){return t;},get timeline(){return timeline;},get triangles(){return k.triangles(root);},manifestError,setState,setTimeline,update,setQuality,noteFPS,setLogicalTime(value){if(!Number.isFinite(value)||value<0)throw Error('Некорректное логическое время');t=value;apply(0);},setEffectsEnabled(value){const old=effectsEnabled;effectsEnabled=value;return old;},
  renderFeeds(renderer){const map=eyeFeed.render(renderer);for(const monitor of monitors){monitor.material.map=map;monitor.lid.value=eyeFeed.open;monitor.material.needsUpdate=false;}},
  regenerate(seed,density){panels.dispose();config.seed=seed;config.density=density;panels=controlPanel(config);root.add(panels.group);sideScreens.forEach(s=>s.material.map=panels.atlas);generation++;update(0);},
  dispose(){if(disposed)return;disposed=true;listeners.forEach(([name,fn])=>events.removeEventListener(name,fn));mixers.forEach(({mixer})=>mixer.stopAllAction());panels.dispose();eyeFeed.dispose();k.dispose(decor);room.dispose();}
 };
}
