import * as THREE from 'three';
import {outline as hull,label as makeLabel} from '../models/humanKit.js';
import {gradientMap} from '../three/toon.js';
const ramp=gradientMap();
export function material(name,color,extra={}){return new THREE.MeshToonMaterial({name,color,gradientMap:ramp,...extra});}
export function outline(mesh,w=2){const o=hull(mesh,w);o.userData.labOutline=true;o.userData.width=w;return o;}
export function mesh(parent,name,geometry,color,position=[0,0,0],extra={}){const m=new THREE.Mesh(geometry,material(name,color,extra));m.name=name;m.position.fromArray(position);parent.add(m);return m;}
export function box(parent,name,size,position,color='#cfd8d4',w=.8){const m=mesh(parent,name,new THREE.BoxGeometry(...size),color,position);if(w)outline(m,w);return m;}
export function label(parent,name,text,w,h,position,rotation=0){const m=makeLabel(text,{w,h,font:'800 120px Arial'});m.material=material(name,'#ffffff',{map:m.material.map});m.name=name;m.position.fromArray(position);m.rotation.y=rotation;parent.add(m);return m;}
export function tris(root){let n=0;root.traverseVisible(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;}
export function dispose(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){ms.add(m);if(m.map)ts.add(m.map);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());root.removeFromParent();}
