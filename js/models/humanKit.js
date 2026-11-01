import * as THREE from 'three';
import { toonMaterial } from '../three/toon.js';
export const rad = THREE.MathUtils.degToRad;
// Тон-материал (MeshToonMaterial + gradientMap 3 ступени) вместо Standard — §9.
export function material(name,color,map=null){const m=toonMaterial(name,color,{map});m.flatShading=true;return m;}
export function texture(kind){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 if(kind==='stripes'){x.fillStyle='#7f93b8';x.fillRect(0,0,128,128);x.fillStyle='#55688f';for(let i=0;i<128;i+=32)x.fillRect(i,0,16,128);}
 else {x.clearRect(0,0,128,128);x.fillStyle=kind==='stubble'?'#47372f':'#9b705b';let seed=17;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<(kind==='stubble'?280:16);i++){const a=rand()*128,b=rand()*128;if(kind==='stubble')x.fillRect(a,b,1.5,1.5);else x.fillRect(a,b,1,12);}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
export function roundBox(w,h,d){const g=new THREE.BoxGeometry(w,h,d,2,2,2),p=g.attributes.position,v=new THREE.Vector3(),r=Math.min(w,h,d)*.15;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const q=new THREE.Vector3(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));v.sub(q).normalize().multiplyScalar(r).add(q);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return g;}
export function outline(mesh,width=1.2){const g=mesh.geometry.clone(),p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*width,p.getY(i)+n.getY(i)*width,p.getZ(i)+n.getZ(i)*width);const o=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:'#1d1519',side:THREE.BackSide}));o.name=mesh.name+'_outline';o.userData.humanOutline=true;mesh.add(o);return o;}
// Closed, thick low-poly fabric sector. Each ring may taper or change the front opening.
export function coatPanel(rings,start,end,offset=[0,0,0],steps=12,thickness=1.2){
 const positions=[],indices=[];
 for(let layer=0;layer<2;layer++)for(const ring of rings)for(let i=0;i<=steps;i++){
  const u=i/steps,a=start+(end-start)*u+(ring.open||0)*(1-2*u);
  positions.push(Math.sin(a)*(ring.w-layer*thickness)-offset[0],ring.y-offset[1],Math.cos(a)*(ring.d-layer*thickness)-offset[2]);
 }
 const row=steps+1,count=rings.length*row;
 const quad=(a,b,c,d)=>indices.push(a,d,b,b,d,c);
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<steps;i++){
  const a=r*row+i,b=a+row;quad(a,a+1,b+1,b);quad(count+a,count+b,count+b+1,count+a+1);
 }
 for(const r of [0,rings.length-1])for(let i=0;i<steps;i++){
  const a=r*row+i;if(r===0)quad(a,count+a,count+a+1,a+1);else quad(a,a+1,count+a+1,count+a);
 }
 for(const i of [0,steps])for(let r=0;r<rings.length-1;r++){
  const a=r*row+i,b=a+row;if(i===0)quad(a,b,count+b,count+a);else quad(a,count+a,count+b,b);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function label(text,{w=5,h=2.2,font='800 64px "Trebuchet MS"',fg='#1d1519',bg='#f2ece0'}={}){const c=document.createElement('canvas');c.width=512;c.height=224;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);x.fillStyle=fg;x.font=font;x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,112,480);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),material('FolderLabel','#ffffff',t));}
export function visibleTris(group){let n=0;group.traverseVisible(o=>{if(o.isMesh&&!o.userData.humanOutline)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;}
export function visibleBox(group){group.updateMatrixWorld(true);const b=new THREE.Box3();group.traverseVisible(o=>{if(o.isMesh&&!o.userData.humanOutline){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return b;}
