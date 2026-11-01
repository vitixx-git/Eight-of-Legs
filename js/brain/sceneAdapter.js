import {furnishBrain} from './furnish.js';
/** Attach to a real S03/C_Levers instance without changing its state machine.
 * owner: {root,eventTarget?,eyeView?,onAlarm?}; tick gets logical time, never wall-clock time.
 * Scene exit MUST call dispose; scene render calls render before its main render.
 */
export async function attachBrain(owner){
 if(!owner?.root)throw Error('attachBrain: требуется root сцены');
 const brain=await furnishBrain(owner.root,{eventTarget:owner.eventTarget,eyeView:owner.eyeView,onAlarm:owner.onAlarm,config:owner.config,manifest:owner.manifest});
 return {brain,update(dt,{spiderPosition,leversTime,fps}={}){if(leversTime!==undefined)brain.setTimeline(leversTime);brain.update(dt,spiderPosition);if(fps!==undefined)brain.noteFPS(fps,dt);},render(renderer){brain.renderFeeds(renderer);},dispose(){brain.dispose();}};
}
