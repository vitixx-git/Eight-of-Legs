import * as THREE from 'three';
import * as shared from '../lab/kit.js';
export const material=shared.material;
export function mesh(p,n,g,c,pos=[0,0,0],w=.8,extra={}){const m=new THREE.Mesh(g,material(n,c,extra));m.name=n;m.position.fromArray(pos);m.castShadow=true;m.receiveShadow=false;p.add(m);if(w)shared.outline(m,w);return m;}
export function box(p,n,s,pos,c='#9a6b4a',w=2){return mesh(p,n,new THREE.BoxGeometry(...s),c,pos,w);}
export function cylinder(p,n,r,h,pos,c,w=.8,segments=10){return mesh(p,n,new THREE.CylinderGeometry(r,r,h,segments),c,pos,w);}
export function sphere(p,n,r,pos,c,w=.8){return mesh(p,n,new THREE.SphereGeometry(r,10,6),c,pos,w);}
export function label(p,n,text,w,h,pos){const c=document.createElement('canvas');c.width=1024;c.height=Math.max(128,Math.round(1024*h/w));const x=c.getContext('2d');x.fillStyle='#f2ece0';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#1d1519';x.lineWidth=12;x.strokeRect(6,6,c.width-12,c.height-12);x.fillStyle='#1d1519';let size=150;do{x.font=`800 ${size}px Arial`;size-=2;}while(x.measureText(text).width>940&&size>22);x.textAlign='center';x.textBaseline='middle';x.fillText(text,512,c.height/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide,toneMapped:false}));m.name=n;m.position.fromArray(pos);p.add(m);return m;}
export function outline(root,width){root.updateMatrixWorld(true);const all=[];root.traverse(o=>{if(o.isMesh&&!o.userData.humanOutline)all.push(o);});for(const o of all){const s=o.getWorldScale(new THREE.Vector3());shared.outline(o,width/Math.max(.001,Math.abs(s.x)));}}
export function bounds(root){root.updateMatrixWorld(true);const b=new THREE.Box3();root.traverse(o=>{if(o.isMesh&&!o.userData.humanOutline){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return b;}
export function triangles(root){let n=0;root.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return n;}
export const dispose=shared.dispose;
