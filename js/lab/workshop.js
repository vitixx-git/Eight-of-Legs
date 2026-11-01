import * as THREE from 'three';
import * as kit from './kit.js';
// Original cartoon workshop dressing; no borrowed models or textures.
export function styleWorkshop(root,objects){
 if(root.getObjectByName('WORKSHOP_DETAILS'))return;
 const g=new THREE.Group();g.name='WORKSHOP_DETAILS';root.add(g);
 const box=(n,s,p,c,w=.5)=>kit.box(g,n,s,p,c,w);
 const tube=(n,a,b,r,c)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);const m=kit.mesh(g,n,new THREE.CylinderGeometry(r,r,v.length(),8),c,start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;};
 const recolor={Floor:'#517c99',FrontWall:'#65b6c6',BackWall:'#8bced5',LeftWall:'#65b6c6',RightBack:'#65b6c6',RightFront:'#65b6c6',AboveDoor:'#65b6c6',Cabinet:'#315a91',Door:'#35a9bd',Handle:'#ffd05b',Top:'#f5d583',Leg:'#346c91',Upright:'#ef9951',Shelf:'#f5d583',Seat:'#ed9d43',Back:'#ed9d43',Machine:'#387ba7',Console:'#f4b648',Base:'#387ba7'};
 for(const obj of Object.values(objects))obj.traverse(o=>{if(o.isMesh&&!o.userData.labOutline&&recolor[o.name]&&!o.material.map)o.material.color.set(recolor[o.name]);});
 // Architectural framing stays behind the existing playable objects.
 for(const x of [-294,-145,85,294]){box('WallRib',[7,292,8],[x,146,-220],'#377fa0');box('RibCap',[15,12,12],[x,279,-216],'#f5bf52');}
 box('BackSkirting',[600,14,10],[0,7,-220],'#315a91');box('UpperRail',[600,10,12],[0,286,-216],'#315a91');
 box('SideSkirting',[10,14,440],[-295,7,0],'#315a91');
 // Keep the entire right-wall doorway (z=40..160) free of trim.
 box('SideSkirting',[10,14,256],[295,7,-92],'#315a91');
 box('SideSkirting',[10,14,56],[295,7,192],'#315a91');
 for(let x=-275;x<300;x+=50)for(let z=-200;z<225;z+=50)if((x+z+475)%100===0)box('FloorTile',[48,.15,48],[x,.12,z],'#638fa6',0);
 tube('YellowPipe',[-286,250,-209],[249,250,-209],4,'#ffc84e');tube('PipeDown',[249,250,-209],[249,180,-209],4,'#ffc84e');
 for(const x of [-275,-130,20,165,249]){const ring=kit.mesh(g,'PipeCoupling',new THREE.CylinderGeometry(6,6,7,8),'#e9913e',[x,250,-209]);ring.rotation.z=Math.PI/2;}
 tube('BluePipe',[-290,225,-210],[-290,275,-210],5,'#3f8db7');tube('BluePipe',[-290,275,-210],[-95,275,-210],5,'#3f8db7');
 // Oversized analog gauge and valve, legible from the overview.
 kit.mesh(g,'GaugeRim',new THREE.CylinderGeometry(18,18,5,12),'#efae48',[102,250,-202]).rotation.x=Math.PI/2;
 kit.mesh(g,'GaugeFace',new THREE.CircleGeometry(15,12),'#f9efd0',[102,250,-199]);
 const needle=box('GaugeNeedle',[2,12,1],[105,253,-198],'#c24a46',0);needle.rotation.z=-.6;
 for(let i=0;i<7;i++){const a=i*Math.PI/6;box('GaugeTick',[1,3,1],[102+Math.cos(a)*12,250+Math.sin(a)*12,-197.8],'#31516e',0);}
 const valve=kit.mesh(g,'ValveWheel',new THREE.TorusGeometry(11,2,5,12),'#dc6550',[-177,250,-198]);for(const a of [0,Math.PI/2]){const spoke=box('ValveSpoke',[20,2,2],[-177,250,-198],'#dc6550');spoke.rotation.z=a;}valve.userData.decor=true;
 // Chunky safety corners and ventilation on the two gameplay machines.
 for(const [name,width,front] of [['POISON_UNIT',50,36],['DISPOSER',60,33]]){
  const p=objects[name];for(const x of [-width/2,width/2])kit.box(p,'SafetyCorner',[7,90,7],[x,57,-front],'#f2b849',.5);
  for(let i=0;i<5;i++)kit.box(p,'Vent',[19,2,1],[0,25+i*5,front+.5],'#214c72',0);
 }
 kit.label(g,'WorkshopPlate','ЛАБОРАТОРИЯ / 08',122,15,[-54,273,-208]);
 // Tool board on the right wall: bright silhouettes without filling the aisles.
 const peg=box('ToolPanel',[4,75,100],[294,159,-100],'#365e88');
 for(let z=-140;z< -50;z+=15)for(let y=135;y<190;y+=15)box('Peg',[1,2,2],[291,y,z],'#8bced5',0);
 for(let i=0;i<3;i++){tube('ToolGrip',[286,138,-130+i*25],[286,168,-130+i*25],2.7,['#ef9951','#f3cc53','#59c2bc'][i]);box('ToolHead',[4,10,13],[286,175,-130+i*25],'#c5dce3');}
 return g;
}

// These are explicit procedural stand-ins, not lab_kit assets.
export function workshopProp(id){
 const g=new THREE.Group();g.userData.proceduralFallback=true;
 const b=(n,s,p,c)=>kit.box(g,n,s,p,c,0);
 const c=(n,r,h,p,col)=>kit.mesh(g,n,new THREE.CylinderGeometry(r,r,h,8),col,p);
 if(id==='cabinet_low'){b('Body',[150,56,36],[0,28,0],'#377fa0');b('Top',[156,4,40],[0,58,0],'#f5d583');for(const x of [-50,0,50]){b('Drawer',[46,43,2],[x,29,19],'#53b4bf');b('Handle',[17,3,4],[x,37,22],'#ffc84e');}}
 else if(id==='bookcase_archive'){b('Back',[34,196,76],[0,98,-4],'#315a91');for(const x of [-19,19])b('Side',[4,200,80],[x,100,0],'#ed9d43');for(const y of [4,53,102,151,198])b('Shelf',[40,4,80],[0,y,0],'#f5d583');for(let i=0;i<12;i++)b('Archive',[28,33,14],[0,23+Math.floor(i/4)*49,-27+(i%4)*18],['#e36b51','#5cb8b4','#ecc554','#8e87bb'][i%4]);const turn=new THREE.Matrix4().makeRotationY(Math.PI/2);for(const child of g.children)child.applyMatrix4(turn);}
 else if(id==='archive_boxes'){for(let row=0;row<3;row++)for(let col=0;col<4;col++)b('ArchiveBox',[14,33,28],[-27+col*18,16.5+row*33,0],['#e36b51','#5cb8b4','#ecc554','#8e87bb'][col]);}
 else if(id==='monitor_crt'||id==='analyzer'){const monitor=id==='monitor_crt';b('Housing',[monitor?45:30,monitor?34:22,25],[0,monitor?20:11,0],monitor?'#e9ae4c':'#66b8bd');b('Panel',[monitor?35:22,monitor?24:12,2],[0,monitor?22:13,13],'#183e52');b('Foot',[28,4,20],[0,2,0],'#315a91');for(let i=0;i<3;i++){const m=c('Indicator',2,2,[-9+i*9,monitor?5:12,15],['#ea6652','#ffc84e','#7dff9a'][i]);m.rotation.x=Math.PI/2;m.material.name='Material.00'+(3+i);}}
 else if(id==='journal'||id==='journal_red'){b('Cover',[24,2,20],[0,1,0],id==='journal_red'?'#db6650':'#548bb1');b('Paper',[22,1.6,18],[0,2.6,0],'#fff0cf');}
 else if(id==='chair_office'){b('Seat',[40,7,38],[0,45,0],'#ed9d43');b('Back',[40,43,7],[0,72,-16],'#46a7bc');c('Stem',4,40,[0,22,0],'#315a91');for(const a of [0,Math.PI/2]){const f=b('Base',[54,5,8],[0,3,0],'#315a91');f.rotation.y=a;}}
 else if(id==='pendant_lamp'||id==='desk_lamp'){if(id==='desk_lamp'){c('Base',12,4,[0,2,0],'#315a91');c('Arm',2,30,[0,18,0],'#f4bb50');}kit.mesh(g,'Shade',new THREE.CylinderGeometry(9,18,12,10),'#f4bb50',[0,id==='desk_lamp'?39:6,0]);}
 else if(id==='clock_wall'||id==='timer_clock'){const r=id==='clock_wall'?17.5:6;c('Rim',r,4,[0,r,0],'#ed9d43').rotation.x=Math.PI/2;kit.mesh(g,'Face',new THREE.CircleGeometry(r*.85,12),'#fff0cf',[0,r,2.1]);for(const [name,l] of [['Zeiger 01',r*.45],['Zeiger 02',r*.7]]){const pivot=new THREE.Group();pivot.name=name;pivot.position.set(0,r,2.5);g.add(pivot);kit.box(pivot,'Hand',[1,l,1],[0,l/2,0],'#315a91',0);}}
 else if(id==='water_bath'){b('Bath',[30,18,25],[0,9,0],'#66b8bd');b('Water',[25,2,20],[0,19,0],'#91d7e5');}
 else if(id==='spirit_lamp'){c('Reservoir',7,13,[0,6.5,0],'#91d7e5');c('Cap',6,4,[0,15,0],'#ed9d43');c('Wick',1,7,[0,20,0],'#fff0cf');}
 else if(id==='tape_dispenser'){b('Base',[15,5,9],[0,2.5,0],'#ed9d43');const roll=kit.mesh(g,'Roll',new THREE.TorusGeometry(4,1.8,5,10),'#fff0cf',[0,8,0]);roll.rotation.y=Math.PI/2;}
 else if(id==='hazard_floor_sign'){b('Sign',[35,52,4],[0,39,0],'#ffc84e');for(const z of [-15,15]){const leg=b('Stand',[28,23,4],[0,12,z],'#ed9d43');leg.rotation.x=z*.025;}kit.label(g,'Warning','!',13,28,[0,42,2.5]);}
 else if(id==='houseplant'){c('Pot',13,23,[0,11.5,0],'#ed9d43');c('Trunk',2,55,[0,42,0],'#706447');for(let i=0;i<7;i++){const a=i*2.4;const leaf=kit.mesh(g,'Leaf',new THREE.IcosahedronGeometry(12,0),'#61ae87',[Math.sin(a)*13,45+i*6,Math.cos(a)*13]);leaf.scale.set(.55,1,.4);}}
 else if(id==='spider_specimen'){kit.mesh(g,'Body',new THREE.IcosahedronGeometry(.9,0),'#433454',[0,1,0]);for(let i=0;i<8;i++){const a=i*Math.PI/4;const leg=b('Leg',[.2,.2,2],[Math.sin(a),.5,Math.cos(a)],'#433454');leg.rotation.y=a;}}
 else return null;
 return g;
}
