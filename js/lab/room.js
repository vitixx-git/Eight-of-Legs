import * as THREE from 'three';
import * as kit from './kit.js';
// Only creates missing named procedural objects. Existing gameplay transforms win.
export function buildRoom(root){
 const objects={};
 function part(name,pos,build){let g=root.getObjectByName(name);if(!g){g=new THREE.Group();g.name=name;g.position.fromArray(pos);root.add(g);build(g);}objects[name]=g;return g;}
 const b=(g,n,s,p,c,w=.8)=>kit.box(g,n,s,p,c,w);
 const cyl=(g,n,r,h,p,c,extra={})=>kit.mesh(g,n,new THREE.CylinderGeometry(r,r,h,10),c,p,extra);
 const label=(g,t,w,h,p,rot=0)=>kit.label(g,'Label',t,w,h,p,rot);
 part('LAB_FLOOR',[0,0,0],g=>{b(g,'Floor',[600,4,450],[0,-2,0],'#9aaea8',0);for(let x=-300;x<=300;x+=50)b(g,'TileLine',[.5,.1,450],[x,.05,0],'#6f7884',0);for(let z=-225;z<=225;z+=50)b(g,'TileLine',[600,.1,.5],[0,.05,z],'#6f7884',0);});
 part('LAB_WALLS',[0,0,0],g=>{b(g,'FrontWall',[600,300,4],[0,150,227],'#65b6c6',0);b(g,'BackWall',[600,300,4],[0,150,-227],'#bdcec8',0);b(g,'LeftWall',[4,300,450],[-302,150,0],'#a9bdb7',0);b(g,'RightBack',[4,300,265],[302,150,-92.5],'#a9bdb7',0);b(g,'RightFront',[4,300,65],[302,150,192.5],'#a9bdb7',0);b(g,'AboveDoor',[4,80,120],[302,260,100],'#a9bdb7',0);});
 part('LAB_DOOR_IN',[300,0,100],g=>{b(g,'Door',[3,215,116],[0,107.5,0],'#6f7884');label(g,'ЛАБОРАТОРИЯ',95,18,[-3,177,0],-Math.PI/2);});
 part('LAB_CABINET',[-230,0,202],g=>{b(g,'Cabinet',[95,200,40],[0,100,0],'#6f7884',2);for(const x of [-23,23]){b(g,'Door',[44,185,2],[x,100,21],'#8a9a94');b(g,'Handle',[2,20,3],[x*.35,105,24],'#cfd8d4');}});
 part('LAB_BOARD',[-20,150,-223],g=>{b(g,'Frame',[172,93,4],[0,0,0],'#6f7884');b(g,'Board',[164,85,2],[0,0,3],'#314840',0);label(g,'АРАХНОЦИД v3',150,22,[0,20,4.1]);label(g,'C₈H₁₀ · СТАБИЛИЗАЦИЯ',138,14,[0,-14,4.1]);});
 function table(name,pos,size,height){return part(name,pos,g=>{b(g,'Top',[size[0],4,size[1]],[0,height-2,0],'#cfd8d4',1);for(const x of [-size[0]/2+6,size[0]/2-6])for(const z of [-size[1]/2+6,size[1]/2-6])b(g,'Leg',[5,height-4,5],[x,(height-4)/2,z],'#6f7884');});}
 objects.LAB_CABINET.rotation.y=Math.PI;
 const labTable=table('LAB_TABLE',[-40,0,-20],[200,80],90);labTable.rotation.y=Math.PI;
 const desk=table('WRITING_DESK',[-265,0,-95],[70,140],75);if(!desk.getObjectByName('Drawers')){b(desk,'Drawers',[48,65,45],[0,33,40],'#8a9a94');for(const y of [25,53])b(desk,'DrawerHandle',[20,2,3],[0,y,64],'#6f7884');}
 part('PENDANT_CORD',[-265,245,-95],g=>cyl(g,'Cord',.5,110,[0,0,0],'#1d1519'));
 function flask(g,name,pos,color='#7dff9a'){const f=new THREE.Group();f.name=name;f.position.fromArray(pos);g.add(f);kit.mesh(f,'Glass',new THREE.CylinderGeometry(3,9,22,8), '#bfe0ff',[0,11,0],{transparent:true,opacity:.45,depthWrite:false});cyl(f,'Neck',3,10,[0,26,0],'#bfe0ff',{transparent:true,opacity:.45,depthWrite:false});kit.mesh(f,'Liquid',new THREE.CylinderGeometry(4,7,12,8),color,[0,7,0],{emissive:color,emissiveIntensity:.15});return f;}
 part('FLASK_SET',[235,0,-207],g=>{for(const y of [65,115,165]){b(g,'Shelf',[100,4,30],[0,y,0],'#cfd8d4');for(const x of [-32,0,32])flask(g,'StoredFlask',[x,y+2,0]);}for(const x of [-48,48])b(g,'Upright',[4,180,4],[x,90,-12],'#6f7884');});
 for(let i=0;i<4;i++)part('FLASK_CONE_'+i,[-65+i*28,90,0],g=>flask(g,'Flask',[0,0,0]));
 part('FLASK_TUBE_RACK',[10,90,-40],g=>{b(g,'Rack',[35,2,14],[0,3,0],'#6f7884');for(let i=0;i<5;i++)cyl(g,'Tube',1.6,17,[-12+i*6,12,0],'#bfe0ff');});
 part('POISON_UNIT',[-268,0,90],g=>{b(g,'Base',[50,25,70],[0,12.5,0],'#6f7884',2);cyl(g,'Tank',23,95,[0,72,0],'#7dff9a',{emissive:'#7dff9a',emissiveIntensity:.25});b(g,'Top',[52,8,65],[0,123,0],'#6f7884');b(g,'Console',[12,35,55],[30,55,0],'#8a9a94');label(g,'СТОП',32,14,[37,61,0],Math.PI/2);});
 part('POISON_CONTAINER',[-36,90,-40],g=>{cyl(g,'Container',9,30,[0,15,0],'#7dff9a');cyl(g,'Lid',10,4,[0,32,0],'#6f7884');label(g,'АРАХНОЦИД',24,7,[0,18,9.2]);});
 part('DISPOSER',[262,0,-20],g=>{b(g,'Machine',[60,115,65],[0,57.5,0],'#6f7884',2);b(g,'Hatch',[3,38,40],[-31,72,0],'#1d1519');cyl(g,'Lamp',4,3,[-33,102,0],'#7fd18b').rotation.z=Math.PI/2;label(g,'УТИЛИЗАТОР',53,12,[-31.8,30,0],-Math.PI/2);});
 part('HAZARD_SIGN',[-298,230,90],g=>label(g,'⚠ АРАХНОЦИД',80,35,[0,0,0],Math.PI/2));
 for(const [i,p] of [[0,[170,0,-95]],[1,[90,0,135]]])part('LAB_CHAIR_'+i,p,g=>{b(g,'Seat',[38,5,38],[0,46,0],'#3f6bb0');b(g,'Back',[38,38,4],[0,67,-17],'#3f6bb0');for(const x of [-15,15])for(const z of [-15,15])b(g,'Leg',[3,44,3],[x,22,z],'#6f7884');});
 part('SCIENTIST_COAT',[291,160,190],g=>b(g,'HangingCoat',[8,60,35],[0,0,0],'#eef0ec'));
 for(const x of [-150,150])for(const z of [-110,110])part(`LAB_LAMP_${x}_${z}`,[x,298,z],g=>{b(g,'LightPanel',[80,3,25],[0,0,0],'#e8fff4');const light=new THREE.PointLight('#e8fff4',35000,650,2);light.position.y=-10;g.add(light);});
 part('WEB_DECOR',[-230,202,190],g=>{const pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;pts.push(new THREE.Vector3(0,0,0),new THREE.Vector3(Math.cos(a)*24,0,Math.sin(a)*16));}for(const r of [.35,.65,1])for(let i=0;i<8;i++){const a=i*Math.PI/4,n=(i+1)*Math.PI/4;pts.push(new THREE.Vector3(Math.cos(a)*24*r,0,Math.sin(a)*16*r),new THREE.Vector3(Math.cos(n)*24*r,0,Math.sin(n)*16*r));}g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#e9e6f0'})));});
 for(let i=0;i<2;i++)part('JAR_SPIDERS_'+i,[25+i*27,60,195-i*3],g=>{cyl(g,'Jar',11,27,[0,13.5,0],'#bfe0ff',{transparent:true,opacity:.25,depthWrite:false});cyl(g,'Liquid',10,18,[0,9,0],'#7dff9a',{transparent:true,opacity:.25,depthWrite:false});cyl(g,'Lid',12,3,[0,28,0],'#6f7884');});
 const ambient=new THREE.HemisphereLight('#e8fff4','#4e4b61',2);ambient.name='LAB_AMBIENT';if(!root.getObjectByName(ambient.name))root.add(ambient);
 return objects;
}
