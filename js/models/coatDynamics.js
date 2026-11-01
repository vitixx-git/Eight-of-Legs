import * as THREE from 'three';

// A single closed shell: anchored waist, damped hem, analytic leg clearance.
// No independent left/right panels, so motion cannot open a seam in the back.
export class CoatDynamics {
 constructor(mesh,joints){
  this.mesh=mesh;this.joints=joints;
  this.rest=mesh.geometry.attributes.position.array.slice();
  this.angle=0;this.velocity=0;this.previousSpeed=0;this.phase=0;
  this.stats={maxAngle:0,minClearance:Infinity};
  this.v=new THREE.Vector3();this.a=new THREE.Vector3();this.b=new THREE.Vector3();
  this.rootInverse=new THREE.Matrix4();this.upper=new THREE.Matrix4();
 }
 update(dt,speed,walking){
  const j=this.joints;
  if(!this.mesh.visible){this.previousSpeed=speed;return;}
  const acceleration=dt>0?(speed-this.previousSpeed)/dt:0;this.previousSpeed=speed;
  this.phase+=dt*(walking?Math.abs(speed)/140*1.8:0)*Math.PI*2;
  const target=THREE.MathUtils.clamp((walking?Math.sin(this.phase)*.055:0)-acceleration*.00012,-.15,.15);
  // Semi-implicit fixed-size substeps remain stable at both 30 and 144 fps.
  let remaining=dt;
  while(remaining>1e-8){const h=Math.min(remaining,1/120);this.velocity+=(70*(target-this.angle)-16*this.velocity)*h;this.angle+=this.velocity*h;remaining-=h;}
  this.angle=THREE.MathUtils.clamp(this.angle,-Math.PI/15,Math.PI/15);
  this.stats.maxAngle=Math.max(this.stats.maxAngle,Math.abs(this.angle));
  j.root.updateWorldMatrix(true,true);
  this.rootInverse.copy(j.root.matrixWorld).invert();
  this.upper.multiplyMatrices(this.rootInverse,j.spine.matrixWorld);
  const legs=[];
  for(const s of ['L','R'])for(const [a,b,r] of [['hip','knee',8.8],['knee','ankle',7.5]]){
   legs.push({a:j[a+'.'+s].getWorldPosition(new THREE.Vector3()).applyMatrix4(this.rootInverse),b:j[b+'.'+s].getWorldPosition(new THREE.Vector3()).applyMatrix4(this.rootInverse),r});
  }
  const p=this.mesh.geometry.attributes.position;let clearance=Infinity;
  for(let i=0;i<p.count;i++){
   const x=this.rest[i*3],y=this.rest[i*3+1],z=this.rest[i*3+2];
   this.v.set(x,y,z);
   const anchor=THREE.MathUtils.smoothstep(y,-3,25);
   this.a.set(x,y-20,z).applyMatrix4(this.upper);
   this.v.lerp(this.a,anchor);
   const free=1-anchor,drop=Math.max(0,5-y);
   this.v.z+=Math.sin(this.angle)*drop*free;
   // Project onto a horizontal cross-section of each trouser capsule.
   // Two passes handle overlapping influence near a knee.
   for(let pass=0;pass<2;pass++)for(const leg of legs){
    const u=THREE.MathUtils.clamp((this.v.y-leg.a.y)/(leg.b.y-leg.a.y||1e-6),0,1);
    this.b.lerpVectors(leg.a,leg.b,u);
    const dy=this.v.y-this.b.y;
    if(Math.abs(dy)>=leg.r)continue;
    const radius=Math.sqrt(leg.r*leg.r-dy*dy)+1.4;
    let dx=this.v.x-this.b.x,dz=this.v.z-this.b.z,d=Math.hypot(dx,dz);
    if(d<radius){if(d<1e-5){dx=x>=0?1:-1;dz=0;d=1;}this.v.x=this.b.x+dx/d*radius;this.v.z=this.b.z+dz/d*radius;}
   }
   for(const leg of legs){const ab=this.a.subVectors(leg.b,leg.a),u=THREE.MathUtils.clamp(this.b.subVectors(this.v,leg.a).dot(ab)/ab.lengthSq(),0,1);this.b.copy(leg.a).addScaledVector(ab,u);clearance=Math.min(clearance,this.v.distanceTo(this.b)-leg.r);}
   p.setXYZ(i,this.v.x,this.v.y,this.v.z);
  }
  this.stats.minClearance=clearance;
  p.needsUpdate=true;this.mesh.geometry.computeVertexNormals();this.mesh.geometry.computeBoundingBox();this.mesh.geometry.computeBoundingSphere();
 }
}
