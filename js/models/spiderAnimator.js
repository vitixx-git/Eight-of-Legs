import * as THREE from 'three';
export const SPIDER_ACTIONS=['idle','walk','crawl','turn','webShoot','climbEdge','earEnter','squish','pullLever','sitChair','release'];
const durations={idle:5,walk:1/2.2,crawl:1/2.2,turn:.5,webShoot:.65,climbEdge:.3,earEnter:1.6,squish:.15,pullLever:.6,sitChair:.8,release:.5};
const loops=new Set(['idle','walk','crawl','turn']);
const rad=THREE.MathUtils.degToRad;
const smooth=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
export class SpiderAnimator {
  constructor(model) {
    this.model=model; this.nodes=[...Object.values(model.bones),model.meshes.WebThread];
    this.rest=this.nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()}));
    this.name='idle';this.time=0;this.phase=0;this.options={};this.blend=1;this.nextTwitch=2+Math.random()*2;
  }
  play(name,opts={}) {
    name=name.replace(/^SpiderArmature\|Spider_/,'');name=name[0].toLowerCase()+name.slice(1);
    if(!SPIDER_ACTIONS.includes(name)) throw new Error('Unknown spider animation: '+name);
    this.from=this.nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()}));
    this.name=name;this.options=opts;this.time=0;this.phase=0;this.blend=0;this.completed=false;
    return this;
  }
  update(dt,speed=22) {
    if(!Number.isFinite(dt)||dt<0)return;
    dt=Math.min(dt,.1); this.time+=dt;
    const m=this.model,b=m.bones,t=this.time,n=this.name,d=durations[n],u=Math.min(1,t/d);
    this.nodes.forEach((node,i)=>{const r=this.rest[i];node.position.copy(r.p);node.quaternion.copy(r.q);node.scale.copy(r.s);});
    const rot=(node,x=0,y=0,z=0)=>node.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)));
    const locomotion=['walk','crawl','turn'].includes(n);
    if(n==='idle') {
      b.abdomen.scale.setScalar(1+.03*Math.sin(t*Math.PI*2*1.2));
      if(t>this.nextTwitch+.2)this.nextTwitch=t+2+Math.random()*2;
      const twitch=t>=this.nextTwitch?Math.sin((t-this.nextTwitch)/.2*Math.PI)*rad(15):0;
      rot(b['palp.L'],0,twitch);rot(b['palp.R'],0,-twitch);
    }
    if(locomotion) {
      const amp=n==='crawl'?.6:n==='turn'?.5:1;
      this.phase+=dt*2*Math.PI*(n==='turn'?2.2:2.2*Math.abs(speed)/22);
      for(const leg of m.legs) {
        const phase=this.phase+((leg.index+(leg.side==='R'?1:0))%2)*Math.PI;
        const lift=Math.max(0,Math.sin(phase));
        // Rotate about world/body Y for the fan sweep, and local X for leg lift.
        const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rad(18)*Math.cos(phase)*amp*(n==='turn'?1:(leg.side==='L'?1:-1)));
        leg.hip.quaternion.premultiply(yaw);
        rot(leg.hip,rad(15)*lift*amp);rot(leg.knee,-rad(20)*lift*amp);rot(leg.ankle,rad(12)*lift*amp);
      }
      b.body.position.y+=(n==='crawl'?-.2:0)+.05*amp*Math.sin(this.phase*2);
      if(n==='turn')rot(b.Root,0,t*rad(720)*(this.options.direction??1));
    }
    m.meshes.WebThread.scale.set(0,0,0);
    if(n==='webShoot') {
      const bend=t<.15?smooth(t/.15):1-smooth((t-.4)/.25);
      rot(b.abdomen,rad(20)*bend);
      m.group.updateMatrixWorld(true);
      const start=b.spinneret.getWorldPosition(new THREE.Vector3());
      const target=this.options.target?.clone()??m.group.localToWorld(new THREE.Vector3(0,3,-6));
      const end=start.clone().lerp(target,smooth(t/.4));
      m.group.worldToLocal(start);m.group.worldToLocal(end);
      const delta=end.clone().sub(start),thread=m.meshes.WebThread;
      thread.position.copy(start).add(end).multiplyScalar(.5);thread.scale.set(1,delta.length(),1);
      if(delta.lengthSq()>1e-8)thread.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
      if(t>=d)thread.scale.set(0,0,0);
    }
    if(n==='climbEdge') {
      const angle=rad(90)*smooth(u),pivot=this.options.pivot?.clone()??new THREE.Vector3(0,0,1);
      b.Root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),angle);
      b.Root.position.copy(pivot).sub(pivot.clone().applyQuaternion(b.Root.quaternion));
    }
    if(n==='earEnter') {b.Root.scale.setScalar(1-.8*u*u);b.Root.position.z=(this.options.distance??2)*u*u;}
    if(n==='squish')b.Root.scale.set(1+.25*u,1-.7*u,1+.25*u);
    if(n==='pullLever')for(const l of m.legs.filter(l=>l.index===0)){const a=Math.sin(u*Math.PI);rot(l.hip,-rad(35)*a);rot(l.knee,rad(40)*a);}
    if(n==='sitChair') {b.Root.position.y=8*u*(1-u);if(this.options.target)b.Root.position.addScaledVector(this.options.target,u);}
    if(n==='earEnter'||n==='sitChair')for(const l of m.legs){const a=n==='earEnter'?smooth(u):Math.sin(Math.PI*u);rot(l.hip,rad(30)*a);rot(l.knee,-rad(45)*a);rot(l.ankle,rad(30)*a);}
    if(n==='release'){rot(b.body,-rad(25)*smooth(u));for(const l of m.legs)rot(l.hip,rad(20)*smooth(u));}
    this.blend=Math.min(1,this.blend+dt/.15);
    if(this.from&&this.blend<1)this.nodes.forEach((node,i)=>{const f=this.from[i],a=smooth(this.blend);node.position.lerpVectors(f.p,node.position.clone(),a);node.quaternion.slerpQuaternions(f.q,node.quaternion.clone(),a);node.scale.lerpVectors(f.s,node.scale.clone(),a);});
    m.group.updateMatrixWorld(true);
    if(!loops.has(n)&&u>=1&&!this.completed){this.completed=true;this.options.onComplete?.();}
  }
}

// Bake the same rigid-bone motion used at runtime. No skeleton/skin is required in glTF.
export function createClips(model) {
  const animator=model.animator,clips=[];
  for(const name of SPIDER_ACTIONS) {
    animator.play(name);animator.blend=1;animator.from=null;
    const duration=durations[name],frames=Math.ceil(duration*30),times=[];
    const samples=animator.nodes.map(()=>({position:[],quaternion:[],scale:[]}));
    for(let i=0;i<=frames;i++) {
      animator.update(i===0?0:duration/frames,22);times.push(i*duration/frames);
      animator.nodes.forEach((node,j)=>{node.position.toArray(samples[j].position,samples[j].position.length);node.quaternion.toArray(samples[j].quaternion,samples[j].quaternion.length);node.scale.toArray(samples[j].scale,samples[j].scale.length);});
    }
    const tracks=[];
    animator.nodes.forEach((node,i)=>{
      tracks.push(new THREE.VectorKeyframeTrack(node.name+'.position',times,samples[i].position));
      tracks.push(new THREE.QuaternionKeyframeTrack(node.name+'.quaternion',times,samples[i].quaternion));
      tracks.push(new THREE.VectorKeyframeTrack(node.name+'.scale',times,samples[i].scale));
    });
    const title=name[0].toUpperCase()+name.slice(1);
    clips.push(new THREE.AnimationClip('SpiderArmature|Spider_'+title,duration,tracks));
  }
  animator.play('idle');animator.blend=1;animator.from=null;animator.update(0);
  return clips;
}
