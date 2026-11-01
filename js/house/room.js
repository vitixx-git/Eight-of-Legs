import * as THREE from 'three';
import * as k from './kit.js';
import {rooms,demoProtected} from './layout.js';
export function makeWindow(root,x,z){
 const g=new THREE.Group();g.name='WINDOW';g.position.set(x,100,z);root.add(g);
 for(const px of [-60,60])k.box(g,'Frame',[6,140,6],[px,70,0],'#b08a5a',.8);
 for(const py of [0,140])k.box(g,'Frame',[120,6,6],[0,py,0],'#b08a5a',.8);
 for(const [size,pos] of [[[4,140,5],[0,70,0]],[[120,4,5],[0,70,0]]])k.box(g,'Mullion',size,pos,'#b08a5a',.8);
 const glass=k.box(g,'Glass',[114,134,1],[0,70,-1],'#fff3d6',0);glass.material.emissive.set('#fff3d6');glass.material.emissiveIntensity=.5;glass.userData.windowGlass=true;glass.castShadow=false;
 return g;
}
export function door(root,name,pos,rotation=0,label=''){
 const g=new THREE.Group();g.name=name;g.position.fromArray(pos);g.rotation.y=rotation;root.add(g);
 k.box(g,'DoorLeaf',[82,205,5],[0,102.5,0],'#8b5a3c',1.2);
 for(const x of [-45,45])k.box(g,'DoorFrame',[7,215,9],[x,107.5,0],'#6b4a32',.8);
 k.box(g,'DoorFrameTop',[96,8,9],[0,215,0],'#6b4a32',.8);
 k.sphere(g,'Handle',3,[28,95,4],'#d1b36f',.4);
 if(label)k.label(g,'DoorLabel',label,72,16,[0,177,3]);
 return g;
}
function floor(root,spec,bath){
 const nx=Math.ceil(spec.width/100),nz=Math.ceil(spec.depth/100),sx=spec.width/nx,sz=spec.depth/nz;
 const geom=new THREE.BoxGeometry(sx-.5,2,sz-.5),mat=k.material('FloorTile',bath?'#d0ddd5':'#a8784e');
 const mesh=new THREE.InstancedMesh(geom,mat,nx*nz),dummy=new THREE.Object3D(),color=new THREE.Color();mesh.name='floor_wood';mesh.userData.modelId='floor_wood';mesh.receiveShadow=true;
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const i=z*nx+x;dummy.position.set(-spec.width/2+(x+.5)*sx,-1,-spec.depth/2+(z+.5)*sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.set(bath?'#d0ddd5':(i%3===0?'#a17450':i%3===1?'#b7895d':'#ad7c50'));mesh.setColorAt(i,color);}
 root.add(mesh);return mesh;
}
/** Самостоятельная оболочка только для прототипа. Не заменяет неизвестную геометрию S07/S08. */
export function buildRoomShell(key,root){
 const spec=rooms[key],owned=new THREE.Group();owned.name='HOUSE_PROCEDURAL_SHELL';root.add(owned);const objects={};
 const part=(name,build)=>{let obj=root.getObjectByName(name);if(!obj){obj=new THREE.Group();obj.name=name;owned.add(obj);build(obj);}objects[name]=obj;return obj;};
 part('HOUSE_FLOOR',g=>floor(g,spec,key==='BATH'));
 part('BACK_WALL',g=>{const z=-spec.depth/2-4;if(key==='STUDY'||key==='LIVING'){const wx=key==='STUDY'?-20:60,shape=new THREE.Shape();shape.moveTo(-spec.width/2,0);shape.lineTo(spec.width/2,0);shape.lineTo(spec.width/2,spec.height);shape.lineTo(-spec.width/2,spec.height);shape.closePath();const hole=new THREE.Path();hole.moveTo(wx-60,100);hole.lineTo(wx-60,240);hole.lineTo(wx+60,240);hole.lineTo(wx+60,100);hole.closePath();shape.holes.push(hole);const geo=new THREE.ExtrudeGeometry(shape,{depth:8,bevelEnabled:false});k.mesh(g,'BackWall',geo,spec.wall,[0,0,-spec.depth/2-8],.8);}else k.box(g,'BackWall',[spec.width,spec.height,8],[0,spec.height/2,z],spec.wall,.8);k.box(g,'Skirting',[spec.width,9,3],[0,4.5,-spec.depth/2+1],'#b08a5a',.8);});
 for(const side of [-1,1])part(side<0?'LEFT_WALL':'RIGHT_WALL',g=>{k.box(g,'SideWall',[8,spec.height,spec.depth],[side*(spec.width/2+4),spec.height/2,0],spec.wall,.8);k.box(g,'Baseboard',[3,9,spec.depth],[side*(spec.width/2-1),4.5,0],'#b08a5a',.8);});
 part('FRONT_WALL',g=>{for(const sign of [-1,1])k.box(g,'FrontSide',[(spec.width-96)/2,spec.height,8],[sign*(48+(spec.width-96)/4),spec.height/2,spec.depth/2+4],spec.wall,.8);g.visible=false;});
 part('HOUSE_CEILING',g=>{k.box(g,'Ceiling',[spec.width,6,spec.depth],[0,spec.height+3,0],'#e9dcc4',.8);g.visible=false;});
 if(key==='STUDY'){
  part('DESK',g=>{g.position.set(-20,0,-145);k.box(g,'Desktop',[140,5,70],[0,72.5,0],'#b08a5a',2);for(const x of [-59,59])for(const z of [-25,25])k.box(g,'DeskLeg',[7,70,7],[x,35,z],'#6b4a32',1.2);});
  for(const name of ['PASS_CARD','MUG_COFFEE'])part(name,g=>{g.userData.demoOnly=true;g.position.fromArray(demoProtected[name]);if(name==='PASS_CARD'){k.box(g,'Card',[9,.6,6],[0,.3,0],'#f2ece0',.4);k.box(g,'Stripe',[9,.2,1.5],[0,.7,1],'#5b6aa8',0);}else{const cup=k.mesh(g,'Mug',new THREE.CylinderGeometry(5,4.4,10,12),'#e9c79a',[0,5,0],.5);k.cylinder(g,'Coffee',4.2,.1,[0,10.1,0],'#523325',0);const handle=k.mesh(g,'Handle',new THREE.TorusGeometry(3.5,1,5,10),'#e9c79a',[5.3,5,0],.4);}});
  part('MIRROR_STAND',g=>{g.position.set(-200,0,-40);g.rotation.y=Math.PI/2;k.box(g,'Frame',[48,170,8],[0,85,0],'#8b5a3c',2);k.box(g,'Mirror',[40,158,1],[0,85,5],'#b9d4d9',.8);k.box(g,'Foot',[50,6,34],[0,3,0],'#6b4a32',2);});
  part('CAT_BED',g=>{g.position.set(125,3,135);const bed=k.cylinder(g,'Bed',28,7,[0,0,0],'#8f9b78',1);bed.scale.z=.75;});
  makeWindow(owned,-20,-spec.depth/2+5);
  part('STUDY_DOOR',g=>{door(g,'ROOM_DOOR',[0,0,spec.depth/2],Math.PI);g.visible=false;});
 }else if(key==='HALL'){
  part('FRONT_DOOR',g=>{door(g,'EntryDoor',[-150,0,-30],Math.PI/2,'ДОМ');});
  part('COAT_HANGER',g=>{g.position.set(-135,0,55);k.cylinder(g,'Post',2,170,[0,85,0],'#6b4a32',.8);for(let i=0;i<4;i++){const a=i*Math.PI/2;const hook=k.cylinder(g,'Hook',1,25,[Math.cos(a)*10,150,Math.sin(a)*10],'#6b4a32',.4);hook.rotation.z=Math.PI/2;hook.rotation.y=a;}k.box(g,'Scarf',[18,85,1],[9,109,9],'#d95a7a',.4);k.cylinder(g,'Foot',15,4,[0,2,0],'#6b4a32',.8);});
 }else if(key==='BATH'){
  part('SINK',g=>{g.position.set(-50,0,-67);k.box(g,'Cabinet',[66,72,45],[0,36,0],'#cbd6cc',2);k.box(g,'Basin',[72,10,48],[0,77,0],'#f2ece0',1);k.box(g,'Water',[49,1,30],[0,82.6,0],'#b9d4d9',.4);k.cylinder(g,'Tap',2,15,[0,89,-15],'#8e9798',.4);});
  part('BATHTUB',g=>{g.position.set(97,0,-10);k.box(g,'Tub',[56,53,165],[0,26.5,0],'#f2ece0',2);k.box(g,'TubWater',[44,1,149],[0,53.3,0],'#b9d4d9',.4);for(const x of [-27,27])k.box(g,'Rim',[6,6,171],[x,56,0],'#f2ece0',1);for(const z of [-83,83])k.box(g,'Rim',[55,6,6],[0,56,z],'#f2ece0',1);});
  part('BATH_MIRROR',g=>{k.box(g,'Frame',[75,80,5],[-50,145,-96],'#8e9798',1);k.box(g,'Mirror',[68,73,1],[-50,145,-92],'#b9d4d9',.4);});
  part('BATH_SHELF',g=>{g.position.set(-122,110,-30);k.box(g,'Shelf',[14,3,60],[0,1.5,0],'#e9dcc4',.8);});
  part('TOWEL',g=>k.box(g,'Towel',[2,45,28],[-119,80,50],'#8fb3c9',.8));
  part('SOAP',g=>k.box(g,'Soap',[10,3,6],[-72,84,-62],'#d9ac9a',.4));
  part('BATH_MAT',g=>k.box(g,'Mat',[65,.8,43],[-25,.4,58],'#85a69b',.4));
  part('BATH_DOOR',g=>{door(g,'BathroomDoor',[0,0,100],Math.PI);g.visible=false;});
 }else if(key==='LIVING')makeWindow(owned,60,-175);
 return {owned,objects,dispose(){k.dispose(owned);}};
}
export function buildStairs(root){
 const owned=new THREE.Group();owned.name='HOUSE_STAIRS';root.add(owned);const ramp=new THREE.Group();ramp.name='STAIR_RAMP';owned.add(ramp);
 k.cylinder(owned,'STAIR_POST',7,300,[0,150,-50],'#6b4a32',1);
 for(let i=0;i<16;i++){
  const a=Math.PI/2+i*Math.PI/8,b=a+Math.PI/8,shape=new THREE.Shape();shape.moveTo(Math.cos(a)*25,Math.sin(a)*25);shape.lineTo(Math.cos(a)*119,Math.sin(a)*119);shape.absarc(0,0,119,a,b,false);shape.lineTo(Math.cos(b)*25,Math.sin(b)*25);shape.absarc(0,0,25,b,a,true);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:7,bevelEnabled:false,curveSegments:3});geo.rotateX(-Math.PI/2);const step=k.mesh(ramp,'STAIR_STEP_'+i,geo,'#b08a5a',[0,i*18.75,-50],.8);step.receiveShadow=true;
  const mid=a+Math.PI/16,x=Math.cos(mid)*119,z=-Math.sin(mid)*119-50;k.cylinder(owned,'STAIR_RAIL_POST',1.2,75,[x,i*18.75+45,z],'#6b4a32',.4,6);
 }
 const points=[];for(let i=0;i<=64;i++){const a=Math.PI/2+i/64*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*119,i/64*300+85,-Math.sin(a)*119-50));}
 k.mesh(owned,'STAIR_RAIL',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,2,6,false),'#6b4a32',[0,0,0],.5);
 k.box(owned,'UP_LANDING',[255,12,85],[0,294,-137.5],'#b08a5a',1.2);
 k.box(owned,'STAIR_BACK',[260,555,8],[0,277.5,-184],'#d9c5a5',.8);
 door(owned,'WARDROBE_DOOR',[0,300,-174],0,'ГАРДЕРОБ');
 const prototypes=[['SOCK_STAIR',[-65,40,-105],[18,4,12],'#d95a7a'],['BOX_STAIR',[94,112,-68],[23,25,23],'#b08a5a'],['BOOT_STAIR',[-45,205,50],[16,18,25],'#6b4a32'],['PUDDLE_STAIR',[-75,230,-105],[24,.5,20],'#b9d4d9'],['COFFEE_SPILL',[30,300,-140],[22,.5,18],'#6b4a32']];
 for(const [name,pos,size,col] of prototypes){const o=k.box(owned,name,size,pos,col,.4);o.userData.demoOnly=true;}
 return {owned,dispose(){k.dispose(owned);}};
}
