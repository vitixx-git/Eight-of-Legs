export const brainVisual={
 floor:'#71384e',dome:'#4a2036',fold:'#8a4562',nerve:'#b25b7f',neuron:'#e8a6c5',
 sleep:{sky:'#5a2340',ground:'#1a0d1c',ambient:.5,key:'#f3b3be',keyIntensity:2.1,fill:'#d95a7a',fillIntensity:100},
 awake:{sky:'#ffcf8a',ground:'#614238',ambient:1.4,key:'#ffe0ad',keyIntensity:4.2,fill:'#ffc08a',fillIntensity:230}
};
export const colors=['#4a8fd9','#d9b45a','#7fd18b','#d95a7a'];
export const brainConfig={seed:170,density:1,rotY:{},simplify:{},recolor:{
 cockpit_chair:{Chair:'#6b4f7a','Grey.007':'#3a2e48'},
 memory_cabinet:{'Wood*':'#3a2e48','Wood_Dark*':'#2b2236','Wood_Light*':'#6b5a7a',Marble:{color:'#9f7bff',emissive:'#9f7bff',intensity:.2}},
 memory_cabinet_low:{'Wood*':'#3a2e48','Wood_Dark*':'#2b2236','Wood_Light*':'#6b5a7a'},
 neuro_modem:{'*':'#2b2236','*.003':{color:'#7fd18b',emissive:'#7fd18b'},'*.004':{color:'#d9b45a',emissive:'#d9b45a'},'*.005':{color:'#d95a7a',emissive:'#d95a7a'}},
 eye_monitor:{Body:'#3a2e48','Chrome details':'#6b5a7a'},gauge_dial:{'*':'#2b2236','Dial*':'#f2ece0','Face*':'#f2ece0','Needle*':'#d95a7a'},state_light:{'*':'#2b2236',Red:'#d95a7a',Yellow:'#d9b45a',Green:'#7fd18b'},emotion_cauldron:{Grey:'#3a2e48',Brown:'#6b5a7a'},screen_curtains:{Couch_Blue:'#7a2e55',LightMetal:'#d9b45a'},mind_core:{Material:{color:'#ff6fae',emissive:'#ff6fae',intensity:.9}},neuro_lamp:{'Light.004':{color:'#ffd0f0',emissive:'#ffd0f0'}},no_entry_sign:{Sign:'#d95a7a',Border:'#f2ece0'},warning_sign:{Yellow:'#f2c84a'},thought_book:{Cover:'#4a8fd9',Paper:'#f2ece0'}}};
export const labels=['ЗЕВОТА','ЧИХ','ИКОТА','МУРАШКИ','СЛЮНИ','ГОЛОД','КОФЕ!!!','ПАРОЛЬ ОТ WI-FI','ПЕСНЯ В ГОЛОВЕ','ЗАБЫТЬ ИМЯ','НЕЛОВКОЕ 2009','ДЕТСКИЕ СТРАХИ'];
export const segments=[[-40,40,12,20],[-95,-40,16,0],[40,95,16,0],[-150,-95,10,0],[95,150,10,0],[165,195,4,0]];
const row=(id,axis,size,placements)=>({id,[axis]:size,placements});
export const models=[
 row('cockpit_chair','targetHeightCm',6,[[0,26,0]]),row('eye_monitor','targetWidthCm',14,[[0,50,14]]),row('screen_curtains','targetHeightCm',22,[[0,52,6]]),
 row('gauge_dial','targetWidthCm',6,[[-30,56,8],[0,56,8],[30,56,8]]),row('state_light','targetHeightCm',20,[[-28,46,0],[28,46,0]]),
 row('wake_alarm','targetHeightCm',5,[[18.43494882,34.78505426,8]]),row('panel_lamp','targetHeightCm',4,[[-18.43494882,34.78505426,8]]),
 row('neuro_modem','targetWidthCm',8,[[-60,57,16],[60,57,16],[-105,57,10],[105,57,10]]),row('thought_tape_roll','targetHeightCm',3,[[60,45,0]]),
 row('memory_cabinet','targetHeightCm',14,[[-135,52,0],[135,52,0]]),row('memory_cabinet_low','targetHeightCm',8,[[160,50,0]]),
 row('emotion_cauldron','targetWidthCm',10,[[-85,44,0]]),row('mind_core','targetWidthCm',14,[[0,0,50]]),
 row('thought_book','targetLengthCm',3,Array.from({length:6},(_,i)=>[i*60,15,45+i%3*4])),row('neuro_lamp','targetWidthCm',8,[[-90,30,45],[90,30,45]]),
 row('defenders_bench','targetLengthCm',20,[[-45,42,0]]),row('no_entry_sign','targetHeightCm',16,[[12,18,0]]),row('warning_sign','targetHeightCm',7,[[-14,20,0],[24,20,0]])];
export function polar(phi,r,y=0){const a=phi*Math.PI/180;return [r*Math.sin(a),y,-r*Math.cos(a)];}
export const cameras={overview:{p:[105,85,125],at:[0,17,-5]},spider:{p:[0,2,45],at:[0,12,-35]},meet:{p:[0,15,32],at:[0,13,-26]},cockpit:{p:[13,16,0],at:[0,14,-46]}};
