import * as THREE from 'three';
import * as shared from '../lab/kit.js';
export {controlPanel} from './controlPanel.js';
export const material=shared.material;
export function box(p,n,s,v,c='#3a2e48',w=.15){return shared.box(p,n,s,v,c,w);}
export function mesh(p,n,g,c,v=[0,0,0],extra={}){const m=shared.mesh(p,n,g,c,v,extra);shared.outline(m,.05);return m;}
export function sphere(p,n,r,v,c){return mesh(p,n,new THREE.SphereGeometry(r,8,6),c,v);}
export function cylinder(p,n,r,h,v,c){return mesh(p,n,new THREE.CylinderGeometry(r,r,h,8),c,v);}
// Unlit, high-resolution signs remain legible even in the sleeping room.
export function label(p,n,text,w,h,v){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.max(128,Math.round(1024*h/w));
 const ctx=canvas.getContext('2d'),padding=32;let font=120,lines=[];
 function wrap(){ctx.font=`800 ${font}px "Trebuchet MS", Arial`;lines=[];let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>canvas.width-padding*2){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);}
 do{wrap();if(lines.length*font*1.15<=canvas.height-padding)break;font-=2;}while(font>24);
 ctx.fillStyle='#f2ece0';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#1d1519';ctx.lineWidth=10;ctx.strokeRect(5,5,canvas.width-10,canvas.height-10);
 ctx.fillStyle='#1d1519';ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,canvas.width/2,canvas.height/2+(i-(lines.length-1)/2)*font*1.15));
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map,toneMapped:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.name=n;mesh.position.fromArray(v);mesh.userData.brainLabel={text,lines,width:w,height:h};p.add(mesh);return mesh;
}
export const dispose=shared.dispose;
export function triangles(root){let count=0;root.traverseVisible(o=>{if(o.isMesh)count+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return count;}
export function outline(root,w=.15){const a=[];root.traverse(o=>{if(o.isMesh&&!o.userData.humanOutline)a.push(o);});root.updateMatrixWorld(true);a.forEach(o=>{const scale=o.getWorldScale(new THREE.Vector3()),local=w/Math.max(.001,Math.abs(scale.x));const hull=shared.outline(o,local);hull.userData.width=local;});}
export function rng(a){return ()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
