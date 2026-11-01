import * as THREE from 'three';
export function createEyeFeed(provider){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=160;const x=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const target=new THREE.WebGLRenderTarget(256,160);let last=-1,open=0,renderTick=-1,tick=0;
 function update(t){open=THREE.MathUtils.clamp((t-10.9)/.6,0,1);if(Math.floor(t*15)===last)return;last=Math.floor(t*15);tick=last;x.fillStyle='#3a1430';x.fillRect(0,0,256,160);let noise=(last+1)*170; x.fillStyle='#8a4562';x.globalAlpha=.12;for(let i=0;i<1200;i++){noise=(Math.imul(noise,1664525)+1013904223)>>>0;const px=noise%256;noise=(Math.imul(noise,1664525)+1013904223)>>>0;x.fillRect(px,noise%160,1,1);}x.globalAlpha=1;x.strokeStyle='#6b2947';for(let i=0;i<18;i++){x.beginPath();x.moveTo(0,i*11);x.bezierCurveTo(70,i*11+12,160,i*7,256,i*11);x.stroke();}texture.needsUpdate=true;}
 update(0);
 return {texture,target,get open(){return open;},update,render(renderer){if(open>0&&provider){const view=provider();if(view?.scene&&view?.camera){if(renderTick!==tick){const old=renderer.getRenderTarget();try{renderer.setRenderTarget(target);renderer.render(view.scene,view.camera);renderTick=tick;}finally{renderer.setRenderTarget(old);}}return target.texture;}}return texture;},dispose(){texture.dispose();target.dispose();}};
}
