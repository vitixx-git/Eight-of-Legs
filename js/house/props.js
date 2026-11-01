import * as THREE from 'three';
import * as k from './kit.js';
export function makeProp(id){
 const g=new THREE.Group();g.name=id;g.userData.proceduralFallback=true;g.userData.surfaces={};
 const big=['bed_single','chair_wood','chair_office','dresser_tall','dresser_low','bookcase','couch'].includes(id),w=big?2:.8;
 const b=(n,s,p,c)=>k.box(g,n,s,p,c,w),c=(n,r,h,p,col)=>k.cylinder(g,n,r,h,p,col,w),s=(n,r,p,col)=>k.sphere(g,n,r,p,col,w);
 const wood='#9a6b4a',dark='#6b4a32',light='#b08a5a',cream='#e8e2d6';
 if(id==='bed_single'){
  b('Wood',[100,15,200],[0,28,0],'#8b5a3c');b('Headboard',[104,90,7],[0,45,-96],'#8b5a3c');b('White',[96,16,190],[0,43,0],cream);b('Red',[98,6,142],[0,54,24],'#5b6aa8');b('Pillow',[72,13,36],[0,56,-67],cream);for(const x of [-42,42])for(const z of [-86,86])b('Leg',[9,22,9],[x,11,z],dark);g.userData.surfaces.blanket=57;
 }else if(id==='chair_wood'||id==='chair_office'){
  const office=id==='chair_office',height=office?100:85; b('Seat',[44,7,44],[0,43,0],office?'#5b6d6d':'#8b5a3c');b('Back',[44,34,6],[0,height-17,-19],office?'#5b6d6d':dark);
  if(office){c('Post',4,40,[0,20,0],'#615d63');for(let i=0;i<5;i++){const bar=b('Foot',[38,4,6],[Math.cos(i*1.256)*13,3,Math.sin(i*1.256)*13],'#615d63');bar.rotation.y=-i*1.256;}}
  else {for(const x of [-17,17])for(const z of [-17,17])b('Sumele_DressLeg',[5,40,5],[x,20,z],dark);for(const x of [-18,18])b('BackPost',[5,45,5],[x,62,-19],dark);}
  g.userData.surfaces.seat=46.5;
 }else if(id==='dresser_tall'||id==='dresser_low'){
  const height=id==='dresser_tall'?85:50,width=id==='dresser_tall'?70:110; b('Wood',[width,height-8,40],[0,height/2,0],wood);b('Wood_LightTop',[width+4,5,44],[0,height-2.5,0],light);for(let i=0;i<3;i++){b('Wood_DarkDrawer',[width-8,(height-15)/3-2,3],[0,10+(i+.5)*(height-15)/3,21.5],dark);b('Handle',[15,2,3],[0,10+(i+.5)*(height-15)/3,24],light);}g.userData.surfaces.top=height;
 }else if(id==='bookcase'){
  b('Wood1.001',[74,190,6],[0,95,-15],'#8b5a3c');for(const x of [-38,38])b('Wood2.001',[5,190,34],[x,95,0],wood);for(let j=0;j<5;j++){b('DarkWood.003',[76,4,34],[0,6+j*44,0],dark);if(j<4)for(let i=0;i<6;i++){const h=22+(i*13+j*7)%13;const book=b('Spine',[6,h,21],[-28+i*10,10+j*44+h/2,1],['#5b6aa8','#a5483f','#8ca57f','#c49d58'][i%4]);book.rotation.z=i%3===0?.08:0;}}
 }else if(id==='book'||id==='book_red'){
  const length=id==='book_red'?24:22;b('Paper',[length*.72,3,length],[0,2,0],cream);for(const y of [.4,3.6])b('Cover',[length*.75,.8,length+1],[0,y,0],id==='book_red'?'#a5483f':'#6a8b77');g.userData.surfaces.top=4;
 }else if(id==='desk_lamp'){
  c('Base',10,3,[0,1.5,0],dark);const stem=c('Stem',1.5,32,[0,18,0],'#6e777a');stem.rotation.z=-.2;const shade=k.mesh(g,'Shade',new THREE.ConeGeometry(13,14,12,1,true),'#b77a4d',[-6,39,0],.8);shade.rotation.z=-.2;const bulb=s('Bulb',4,[-6,34,0],'#fff1d6');bulb.material.emissive.set('#fff1d6');bulb.material.emissiveIntensity=.5;g.userData.lamp=true;
 }else if(id==='tape_dispenser'){b('Body',[8,5,15],[0,2.5,0],'#637d8c');const roll=k.mesh(g,'Tape',new THREE.TorusGeometry(3,1.3,5,10),'#ddc18e',[0,5,-2],.8);roll.rotation.y=Math.PI/2;}
 else if(id==='router'){b('Case',[25,5,16],[0,2.5,0],'#d9d3bd');for(const x of [-10,10])c('Antenna',.7,12,[x,8,-5],'#6b6f75');for(let i=0;i<4;i++){const led=s('LED'+i,.7,[-7+i*4,3,8.5],'#7fd18b');led.material.emissive.set('#7fd18b');led.material.emissiveIntensity=.8;}}
 else if(id==='alarm_clock'){b('Body',[14,11,6],[0,5.5,0],'#8ca48d');k.label(g,'ClockDigits','07:45',12,6,[0,6,3.1]);}
 else if(id==='carpet'){k.box(g,'DarkRed',[110,.7,200],[0,.35,0],'#c96a5a',0);k.box(g,'LightOrange',[94,.08,184],[0,.80,0],'#e9c79a',0);k.box(g,'Pattern',[80,.08,170],[0,.94,0],'#c96a5a',0);}
 else if(id==='curtains'){for(const sign of [-1,1]){b('Couch_Blue',[35,160,7],[sign*66,80,0],'#8fb3c9');for(let j=0;j<3;j++)b('Fold',[3,160,8],[sign*66-12+j*12,80,1],'#7798b1');}b('Rod',[175,4,4],[0,159,-2],dark);}
 else if(id==='houseplant'){const pot=k.mesh(g,'Pot',new THREE.CylinderGeometry(15,11,25,10),'#af6a4d',[0,12.5,0],.8);c('Stem',2,58,[0,44,0],dark);for(let i=0;i<9;i++){const leaf=s('Leaf',12,[Math.cos(i*2.4)*15,37+i*4.8,Math.sin(i*2.4)*15],i%2?'#63865b':'#7f9c67');leaf.scale.set(1.4,.4,.75);leaf.rotation.z=(i%2?1:-1)*.4;}}
 else if(id==='clock_wall'){
  const frame=c('Frame',15,3,[0,15,0],dark);frame.rotation.x=Math.PI/2;const face=c('Face',13,3.5,[0,15,0],cream);face.rotation.x=Math.PI/2;
  const pivot=new THREE.Group();pivot.name='Drehpunkt';pivot.position.set(0,15,2.5);g.add(pivot);
  for(const [name,len] of [['Zeiger 01',8],['Zeiger 02',11]]){const h=new THREE.Group();h.name=name;const hand=k.box(h,'Hand',[1.5,len,1],[0,len/2,0],'#3c3437',.3);h.userData.handLength=len;pivot.add(h);}
  for(let i=0;i<12;i++)b('Tick',[1,2,.5],[Math.sin(i*Math.PI/6)*10.5,15+Math.cos(i*Math.PI/6)*10.5,2.5],dark);
 }else if(id==='ceiling_lamp'){c('Mount',6,3,[0,18,0],dark);const shade=k.mesh(g,'Shade',new THREE.CylinderGeometry(11,22.5,15,12),'#d4bd8c',[0,9,0],.8);const bulb=c('Light.004',18,1,[0,1,0],'#fff1d6');bulb.material.emissive.set('#fff1d6');bulb.material.emissiveIntensity=.5;g.userData.lamp=true;}
 else if(id==='couch'){b('Seat',[190,26,78],[0,30,0],'#7b9480');b('Back',[190,62,18],[0,47,-31],'#627965');for(const x of [-87,87])b('Arm',[16,48,78],[x,36,0],'#627965');for(const x of [-45,45])b('Cushion',[76,13,53],[x,47,5],'#91a18d');for(const x of [-78,78])for(const z of [-24,24])b('Foot',[6,14,6],[x,7,z],dark);g.userData.surfaces.seat=53.5;}
 else if(id==='tv_retro'){b('WoodBody',[45,34,30],[0,20,0],wood);b('Screen',[32,25,1],[0,20,15.6],'#9fc9e0');const screen=g.getObjectByName('Screen');screen.material.emissive.set('#9fc9e0');screen.material.emissiveIntensity=.4;for(const x of [-15,15])b('Leg',[4,6,12],[x,3,0],dark);}
 else if(id==='kerosene_lamp'){c('Base',9,5,[0,2.5,0],dark);c('Glass',6,23,[0,17,0],'#f0d397');c('Cap',8,5,[0,32,0],dark);const flame=s('Flame',3,[0,16,0],'#ffd98a');flame.material.emissive.set('#ffd98a');flame.material.emissiveIntensity=.6;}
 else if(id==='floor_wood')b('FloorTile',[100,2,100],[0,1,0],'#a8784e');
 else if(id==='toothpaste'){b('Tube',[5,4,18],[0,2,0],'#ece5d5');b('Stripe',[5.2,.2,10],[0,4.2,0],'#7698b1');b('Brush',[2,1,17],[7,1,0],'#8fb3c9');b('Bristles',[3,2,5],[7,2.5,-6],cream);}
 else if(id==='sponge')b('Sponge',[8,3,12],[0,1.5,0],'#d8b75d');
 else if(id==='toilet_paper'){const roll=c('Roll',5.5,11,[0,5.5,0],'#f2ece0');c('Core',1.5,.1,[0,11.1,0],dark);}
 return g;
}
