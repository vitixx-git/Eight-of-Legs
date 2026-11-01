import * as THREE from 'three';
import {material} from '../lab/kit.js';
import {labels as defaultLabels,colors,segments} from './layout.js';
const random=a=>()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
/** A scene-wide batch owns every segment: ten draw calls, including labels/screens and housing outlines. */
export function controlPanel(opts={}){
 const group=new THREE.Group();group.name='CONTROL_PANELS';const seed=opts.seed??170,rnd=random(seed),density=Math.max(.2,Math.min(1,opts.density??1));
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const x=canvas.getContext('2d');
 const atlas=new THREE.CanvasTexture(canvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.minFilter=atlas.magFilter=THREE.NearestFilter;
 const types=['housing','round','square','toggle','knob','slider','led','screen','trim'],lists=Object.fromEntries(types.map(t=>[t,[]]));
 const cylinder=new THREE.CylinderGeometry(1,1,1,8);cylinder.rotateX(Math.PI/2);
 const geo={housing:new THREE.BoxGeometry(1,1,1),round:cylinder,square:new THREE.BoxGeometry(1,1,1),toggle:cylinder.clone(),knob:cylinder.clone(),slider:new THREE.BoxGeometry(1,1,1),led:new THREE.SphereGeometry(1,4,3),screen:new THREE.PlaneGeometry(1,1),trim:new THREE.BoxGeometry(1,1,1)};
 const segs=opts.arcFrom!==undefined?[[opts.arcFrom,opts.arcTo,opts.yTo??12,opts.tilt??0]]:segments;
 const add=(type,p,s,c,seg,anim=null,cell=0)=>lists[type].push({p,s,c:new THREE.Color(c),seg,anim,cell,phase:rnd()*6.28,hz:.5+rnd()*2.5,glow:0});
 segs.forEach(([from,to,top,tilt],seg)=>{
  const r=opts.r??57,bottom=opts.yFrom??0,steps=Math.ceil((to-from)/5);
  function at(a,y,depth=0){const angle=a*Math.PI/180,rad=r-depth-(y-bottom)*Math.tan(tilt*Math.PI/180);return {pos:new THREE.Vector3(rad*Math.sin(angle),y,-rad*Math.cos(angle)),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(-tilt*Math.PI/180,-angle,0))};}
  for(let i=0;i<steps;i++){const a=from+(i+.5)*(to-from)/steps,p=at(a,(top+bottom)/2);add('housing',p,[(to-from)/steps*Math.PI/180*r+.1,top-bottom,1.2],'#2b2236',seg);}
  for(const y of [bottom+.25,top-.25])for(let i=0;i<steps;i++)add('trim',at(from+(i+.5)*(to-from)/steps,y,.7),[(to-from)/steps*Math.PI/180*r,.25,.18],'#6b5a7a',seg);
  const cols=Math.floor((to-from)*r*Math.PI/180/4*density),rows=Math.max(1,Math.floor((top-bottom)/3.4));
  for(let c=0;c<cols;c++)for(let row=0;row<rows;row++){
   const a=from+(c+.5)/cols*(to-from),y=bottom+1.6+row*3.4,p=at(a,y,1),v=rnd(),color=[...colors,'#f2ece0','#ff6a5a'][Math.floor(rnd()*6)];
   if(v<.16)add('screen',p,[3,2,1],'#ffffff',seg,null,Math.floor(rnd()*8));
   else if(v<.29){add('slider',p,[2.9,.22,.12],'#100d16',seg);add('square',at(a,y,1.3),[.45,.7,.3],color,seg,'slider');}
   else if(v<.44){add('knob',p,[.5,.5,.45],'#6b5a7a',seg);add('trim',at(a,y+.25,1.4),[.08,.3,.08],'#f2ece0',seg);}
   else if(v<.59){add('square',p,[.8,.8,.16],'#6b5a7a',seg);add('toggle',at(a,y,1.5),[.08,.08,.8],'#f2ece0',seg,rnd()<.1?'toggle':null);}
   else if(v<.75){for(let j=0;j<4;j++)add('led',at(a+(j-1.5)*.5,y,1.2),[.15,.15,.15],['#7fd18b','#ff6a5a','#d9b45a','#9f7bff'][j],seg,'led');}
   else add(v<.87?'square':'round',p,v<.87?[.8,.8,.4]:[.3+rnd()*.3,.3+rnd()*.3,.4],color,seg,'button');
  }
  for(let i=0;i<2;i++){const cell=8+(seg*2+i)%12;add('screen',at(from+(to-from)*(i+.5)/2,top+1.3,1.1),[11,2.1,1],'#ffffff',seg,null,cell);}
 });
 // Atlas coordinates are per-instance, leaving all screens and labels in one draw call.
 const meshes={};for(const type of types){const list=lists[type],g=geo[type];let m;
  if(type==='screen'){
   const cells=new Float32Array(list.length);list.forEach((e,i)=>cells[i]=e.cell);g.setAttribute('cell',new THREE.InstancedBufferAttribute(cells,1));
   m=new THREE.MeshBasicMaterial({map:atlas,side:THREE.DoubleSide});m.onBeforeCompile=s=>{s.vertexShader='attribute float cell; varying float vCell;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvCell=cell;');s.fragmentShader='varying float vCell;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','vec2 auv=vec2((mod(vCell,4.0)+vMapUv.x)/4.0,(floor(vCell/4.0)+vMapUv.y)/5.0); diffuseColor *= texture2D(map,auv);');};
  }else m=type==='led'?new THREE.MeshBasicMaterial({color:'white'}):material(type,'white');
  if(type==='round'||type==='square'){g.setAttribute('pulse',new THREE.InstancedBufferAttribute(new Float32Array(list.length),1));m.onBeforeCompile=s=>{s.vertexShader='attribute float pulse; varying float vPulse;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPulse=pulse;');s.fragmentShader='varying float vPulse;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vPulse;');};}
  const mesh=new THREE.InstancedMesh(g,m,list.length);mesh.name='BATCH_'+type;mesh.frustumCulled=false;meshes[type]=mesh;group.add(mesh);
 }
 // Обводки корпусов всех сегментов — один дополнительный пакет, всего 10.
 const outlineWidth={value:.15};
 const shellMaterial=new THREE.MeshBasicMaterial({color:'#1d1519',side:THREE.BackSide});
 shellMaterial.onBeforeCompile=shader=>{shader.uniforms.brainOutlineWidth=outlineWidth;shader.vertexShader='uniform float brainOutlineWidth;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
#ifdef USE_INSTANCING
transformed += normal * vec3(brainOutlineWidth/length(instanceMatrix[0].xyz),brainOutlineWidth/length(instanceMatrix[1].xyz),brainOutlineWidth/length(instanceMatrix[2].xyz));
#endif`);};
 const shell=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),shellMaterial,lists.housing.length);shell.name='BATCH_housing_outline';shell.frustumCulled=false;shell.userData.panelOutline=true;shell.userData.brainOutlineWidth=outlineWidth;group.add(shell);
 const shellDummy=new THREE.Object3D();lists.housing.forEach((e,i)=>{shellDummy.position.copy(e.p.pos);shellDummy.quaternion.copy(e.p.q);shellDummy.scale.fromArray(e.s);shellDummy.updateMatrix();shell.setMatrixAt(i,shellDummy.matrix);});
 const dummy=new THREE.Object3D(),col=new THREE.Color();let t=0,last=-1;
 function draw(){x.fillStyle='#100d16';x.fillRect(0,0,512,256);for(let cell=0;cell<20;cell++){
  const left=cell%4*128,top=256-(Math.floor(cell/4)+1)*51.2;x.save();x.translate(left,top);x.beginPath();x.rect(2,2,124,47);x.clip();x.strokeStyle='#7fd18b';x.fillStyle='#7fd18b';x.lineWidth=2;
  if(cell>=8){x.fillStyle='#f2ece0';x.fillRect(0,0,128,52);x.fillStyle='#1d1519';x.font='800 14px Trebuchet MS';x.textAlign='center';const words=(opts.labels??defaultLabels)[(cell-8)%12].split(' '),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&x.measureText(next).width>116){lines.push(line);line=word;}else line=next;}lines.push(line);lines.forEach((text,i)=>x.fillText(text,64,26+(i-(lines.length-1)/2)*17));}
  else if(cell===3||cell===4||cell===5){x.font='bold 24px monospace';x.fillText(cell===3?String(Math.floor(t*13)).padStart(5,'0'):cell===4?'zzz':'♥',12,34);}
  else if(cell===6){x.beginPath();x.arc(64,26,22,0,Math.PI*2);x.moveTo(64,26);x.lineTo(64+Math.cos(t*2)*22,26+Math.sin(t*2)*22);x.stroke();}
  else{ x.beginPath();for(let i=0;i<126;i++){let y=26+Math.sin(i*.12+t*3+cell)*15;if(cell===1)y=26+(i%40<8?Math.sin(i)*20:0);if(cell===2){x.fillRect(i,40,3,-Math.abs(Math.sin(i*.2+t))*30);continue;}if(cell===7)y=5+random(seed+Math.floor(t*12)+i)()*40;i?x.lineTo(i,y):x.moveTo(i,y);}x.stroke();}x.restore();
 }atlas.needsUpdate=true;}
 function update(dt=0,spider=null,state='sleep',wave=0,timeline=0){t+=Math.max(0,dt);if(Math.floor(t*12)!==last){last=Math.floor(t*12);draw();}
  for(const type of types){const mesh=meshes[type];lists[type].forEach((e,i)=>{
   dummy.position.copy(e.p.pos);dummy.quaternion.copy(e.p.q);dummy.scale.fromArray(e.s);
   if(e.anim==='slider')dummy.translateX(Math.sin(t*.6+e.phase));
   if(e.anim==='toggle')dummy.rotateX(Math.floor((t+e.phase)/(3+e.phase*.8)+(timeline>=7&&timeline<8.5?Math.floor(timeline*5):0))%2?.5:-.5);
   col.copy(e.c);if(e.anim==='led'){const on=state!=='sleep'||i%2===0;col.multiplyScalar(on&&Math.sin(t*e.hz*6.283+e.phase)>.1?1:.08);}
   if(e.anim==='button'){const distance=spider?Math.hypot(e.p.pos.x-spider.x,e.p.pos.z-spider.z):Infinity;const target=distance<8?.6*(1-distance/8)*(.5+.5*Math.sin(t*8-distance)):0;e.glow=Math.max(target,e.glow*Math.exp(-Math.max(0,dt)/.4));col.lerp(new THREE.Color('#ffffff'),e.glow);}
   const rank=[0,1,1,2,2,3][e.seg]??0;if(rank>wave)col.multiplyScalar(.3);
   if(e.seg===0&&timeline>0&&timeline<.1)col.lerp(new THREE.Color('#ffffff'),.9);
   if(timeline>=14&&e.anim==='led')col.lerp(new THREE.Color('#ffd19a'),THREE.MathUtils.clamp((timeline-14)/2.5,0,1)*.35);if(mesh.geometry.attributes.pulse)mesh.geometry.attributes.pulse.setX(i,e.glow??0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,col);
  });mesh.instanceMatrix.needsUpdate=true;if(mesh.geometry.attributes.pulse)mesh.geometry.attributes.pulse.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
 update(0);return {group,update,atlas,lists,get time(){return t;},dispose(){for(const o of [...Object.values(meshes),shell]){o.geometry.dispose();o.material.dispose();}atlas.dispose();group.removeFromParent();}};
}
