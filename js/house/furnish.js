import * as THREE from 'three';
import * as k from './kit.js';
import {houseConfig,rooms,placements,modelSpecs,demoProtected} from './layout.js';
import {makeProp} from './props.js';
import {normalize,loadKitModel} from './kitLoader.js';
import {buildRoomShell} from './room.js';
const aliases={HALL_GROUND:'HALL',BATH_ROOM:'BATH',STUDY_ROOM:'STUDY'};
const clamp=THREE.MathUtils.clamp;
function rulesFor(material,rules){if(rules[material]!==undefined)return rules[material];const keys=Object.keys(rules).filter(key=>key.includes('*')&&new RegExp('^'+key.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$').test(material));keys.sort((a,b)=>b.length-a.length);return rules[keys[0]];}
function recolor(root,id,config){root.traverse(o=>{if(!o.isMesh||o.userData.humanOutline)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){const rule=rulesFor(m.name,config.recolor[id]??{});if(typeof rule==='string')m.color.set(rule);else if(rule){if(rule.color)m.color.set(rule.color);if(rule.emissive){m.emissive.set(rule.emissive);m.emissiveIntensity=rule.intensity??.5;}}else{const h={};m.color.getHSL(h);m.color.setHSL(h.h,Math.min(h.s,.6),h.l);}}});}
export async function furnishRoom(roomId,root,options={}){
 const key=aliases[roomId]??roomId;if(!rooms[key])throw Error('Неизвестная комната: '+roomId);
 const config=structuredClone(options.config??houseConfig),shell=options.buildShell===false?null:buildRoomShell(key,root),owned=new THREE.Group();owned.name='HOUSE_FURNITURE';root.add(owned);
 const instances=[],report=[],colliders=[],issues=[],adjustments=[],transparent=new Map();let progress=0,variant='DAY',occlusionHeight=Infinity;
 let entries=options.manifest?.models??options.manifest??[];
 if(!entries.length&&options.useKit){const response=await fetch(new URL('../../assets/house_kit/house_kit_manifest.json',import.meta.url));if(!response.ok)throw Error('Манифест house_kit: HTTP '+response.status);const data=await response.json();entries=data.models??data;}
 const manifestURL=new URL('../../assets/house_kit/house_kit_manifest.json',import.meta.url);
 for(const [i,placement] of placements[key].entries()){
  const spec=modelSpecs.find(m=>m.id===placement.id),entry=entries.find(m=>m.id===placement.id);let content,status='procedural',error='';
  if(entry){try{content=await loadKitModel({...spec,...entry},manifestURL,config);status='loaded';k.outline(content,['bed_single','chair_wood','chair_office','dresser_tall','dresser_low','bookcase','couch'].includes(spec.id)?2:.8);}catch(e){error=e.message;issues.push(spec.id+': '+error);}}
  if(!content){content=makeProp(spec.id);content.rotation.y=config.rotY[spec.id]??0;normalize(content,{...spec,...(placement.length?{targetLengthCm:placement.length}:{})});recolor(content,spec.id,config);}
  const obj=new THREE.Group();obj.name=placement.role??spec.id+'_'+i;obj.userData.modelId=spec.id;obj.userData.status=status;obj.userData.role=placement.role;obj.add(content);obj.position.fromArray(placement.p);obj.rotation.y=placement.rotation;owned.add(obj);
  obj.userData.surface={};for(const [name,y] of Object.entries(content.userData.surfaces??{}))obj.userData.surface[name]=y*content.scale.y+content.position.y;
  if(spec.id==='ceiling_lamp'){const h=localBox(obj).max.y-obj.position.y;obj.position.y=rooms[key].height-h;}
  const row={id:spec.id,instance:obj.name,status,error,triangles:k.triangles(obj),materials:[],rotY:config.rotY[spec.id]??0,recolor:config.recolor[spec.id]??{}};obj.traverse(o=>{if(o.isMesh&&!o.userData.humanOutline)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!row.materials.includes(m.name))row.materials.push(m.name);});report.push(row);instances.push(obj);
  if(placement.collider)colliders.push({name:obj.name,object:obj,box:null});
 }
 function localBox(obj){root.updateMatrixWorld(true);return k.bounds(obj).applyMatrix4(root.matrixWorld.clone().invert());}
 const byId=id=>instances.filter(o=>o.userData.modelId===id);
 if(key==='STUDY'){
  const bed=byId('bed_single')[0],chair=byId('chair_wood')[0],bedBox=localBox(bed),chairBox=localBox(chair),width=chairBox.max.x-chairBox.min.x;
  chair.position.x=bedBox.min.x-70-width/2;root.updateMatrixWorld(true);
  if(!root.getObjectByName('NOTEBOOK')&&options.buildShell!==false){const notebook=new THREE.Group();notebook.name='NOTEBOOK';notebook.userData.demoOnly=true;chair.add(notebook);notebook.position.set(0,chair.userData.surface.seat??45,0);k.box(notebook,'Notebook',[22,3,16],[0,1.5,0],'#5b6aa8',.8);k.label(notebook,'NotebookTitle','ЗАМЕТКИ',18,9,[0,3.1,0]).rotation.x=-Math.PI/2;}
  const dresser=byId('dresser_tall')[0];if(!root.getObjectByName('KEYS')&&options.buildShell!==false){const keys=new THREE.Group();keys.name='KEYS';keys.userData.demoOnly=true;owned.add(keys);keys.position.set(dresser.position.x,localBox(dresser).max.y+.2,dresser.position.z);
  k.mesh(keys,'KeyRing',new THREE.TorusGeometry(3,.7,5,10),'#d1b36f',[0,1,0],.3).rotation.x=Math.PI/2;k.box(keys,'Key',[1.6,.8,10],[3,1.2,5],'#d1b36f',.3);}
  const protectedPoints=options.protectedPoints??['PASS_CARD','MUG_COFFEE'].map(name=>root.getObjectByName(name)).filter(Boolean).map(o=>root.worldToLocal(o.getWorldPosition(new THREE.Vector3())).toArray());
  for(const obj of instances.filter(o=>['desk_lamp','router','alarm_clock','book_red','tape_dispenser'].includes(o.userData.modelId))){
   const original=obj.position.clone();if(obj.userData.modelId==='tape_dispenser')obj.position.set(-45,75,-163);if(obj.userData.modelId==='alarm_clock')obj.position.set(42,75,-119);
   const b=localBox(obj),distance=point=>Math.hypot(Math.max(b.min.x-point[0],0,point[0]-b.max.x),Math.max(b.min.z-point[2],0,point[2]-b.max.z));
   if(protectedPoints.some(point=>distance(point)<20))issues.push('Демо: проверить зазор на столе для '+obj.name);
   if(!original.equals(obj.position))adjustments.push({object:obj.name,from:original.toArray(),to:obj.position.toArray(),reason:'20 см вокруг демонстрационных PASS_CARD / MUG'});
  }
  const red=byId('book_red');if(red.length>1)red[1].position.y=localBox(red[0]).max.y+.1;
  const book=byId('book')[0];book.position.y=bed.position.y+(bed.userData.surface.blanket??localBox(bed).max.y)+.2;
 }
 if(key==='HALL'){const stand=byId('dresser_low')[0],lamp=byId('kerosene_lamp')[0];lamp.position.y=localBox(stand).max.y+.1;const hanger=root.getObjectByName('COAT_HANGER');if(hanger)colliders.push({name:'COAT_HANGER',object:hanger,box:null});}
 if(key==='BATH'){const rolls=byId('toilet_paper');if(rolls.length>1)rolls[1].position.y=localBox(rolls[0]).max.y+.1;}
 if(key==='LIVING'){const stand=byId('dresser_low')[0],tv=byId('tv_retro')[0];tv.position.y=localBox(stand).max.y+.1;const couch=byId('couch')[0];byId('book')[0].position.y=couch.position.y+(couch.userData.surface.seat??50)+.1;}
 function refreshColliders(){for(const c of colliders){c.box=localBox(c.object);c.box.min.x+=2;c.box.min.z+=2;c.box.max.x-=2;c.box.max.z-=2;}}
 const clocks=[];for(const clock of byId('clock_wall')){const a=clock.getObjectByName('Zeiger 01'),b=clock.getObjectByName('Zeiger 02');if(a&&b){const length=o=>o.userData.handLength??k.bounds(o).getSize(new THREE.Vector3()).length();clocks.push({hour:length(a)<length(b)?a:b,minute:length(a)<length(b)?b:a});}else issues.push('Не найдены узлы стрелок '+clock.name);}
 const lights=[];for(const obj of instances.filter(o=>['ceiling_lamp','desk_lamp','kerosene_lamp'].includes(o.userData.modelId))){const light=new THREE.PointLight('#ffd98a',0,340,2);light.name='HOUSE_WARM_LAMP';light.position.copy(obj.position);light.position.y+=obj.userData.modelId==='ceiling_lamp'?0:20;owned.add(light);light.userData.lampId=obj.userData.modelId;lights.push(light);}
 function update(t=0,sceneProgress=progress){progress=clamp(sceneProgress,0,1);const minutes=key==='STUDY'?485+progress*10:460+progress*12;setClock(minutes);byId('router').forEach(router=>router.traverse(o=>{if(o.isMesh&&!o.userData.humanOutline&&/^LED/.test(o.name))o.material.emissiveIntensity=Math.floor(t*2)%2?.05:.9;}));}
 function setClock(minutes){for(const c of clocks){c.hour.rotation.z=-(minutes%720)/720*Math.PI*2;c.minute.rotation.z=-(minutes%60)/60*Math.PI*2;}}
 function setVariant(value){variant=value;const night=value==='NIGHT';lights.forEach(l=>l.intensity=night?({ceiling_lamp:9000,desk_lamp:700,kerosene_lamp:180}[l.userData.lampId]??0):0);root.traverse(o=>{if(o.userData.windowGlass){o.material.color.set(night?'#ffd98a':'#fff3d6');o.material.emissive.set(night?'#ffd98a':'#fff3d6');o.material.emissiveIntensity=night?.8:.5;}});}
 function setOcclusionHeight(height=Infinity){occlusionHeight=height;root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;if(!transparent.has(o))transparent.set(o,o.material);const original=transparent.get(o),b=new THREE.Box3().setFromObject(o).applyMatrix4(root.matrixWorld.clone().invert());const fade=b.min.y>height;if(fade&&o.material===original){o.material=Array.isArray(original)?original.map(m=>m.clone()):original.clone();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.transparent=true;m.opacity=.2;m.depthWrite=false;}}else if(!fade&&o.material!==original){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();o.material=original;}});}
 const floor=root.getObjectByName('floor_wood');if(floor)report.push({id:'floor_wood',instance:'floor_wood',status:'procedural',error:'',triangles:k.triangles(floor),materials:['FloorTile'],rotY:0,recolor:{}});
 refreshColliders();update(0,0);
 return {key,root,owned,shell,instances,report,colliders,issues,adjustments,config,byId,localBox,update,setClock,setVariant,setOcclusionHeight,refreshColliders,get occlusionHeight(){return occlusionHeight;},get variant(){return variant;},get progress(){return progress;},get triangles(){return k.triangles(root);},get clockCount(){return clocks.length;},pushChair(dx=10){if(key!=='STUDY')return false;const chair=byId('chair_wood')[0];chair.position.z+=dx;refreshColliders();return true;},dispose(){setOcclusionHeight(Infinity);k.dispose(owned);shell?.dispose();}};
}
