export const entries = [
 ['spider_specimen','targetLengthCm',4],['hazard_floor_sign','targetHeightCm',70],['chair_office','targetHeightCm',100],['bookcase_archive','targetHeightCm',200],['cabinet_low','targetHeightCm',60],['journal','targetLengthCm',26],['journal_red','targetLengthCm',24],['desk_lamp','targetHeightCm',45],['analyzer','targetWidthCm',30],['monitor_crt','targetWidthCm',45],['tape_dispenser','targetLengthCm',15],['clock_wall','targetWidthCm',35],['pendant_lamp','targetWidthCm',45],['houseplant','targetHeightCm',90],['water_bath','targetWidthCm',30],['timer_clock','targetHeightCm',12],['spirit_lamp','targetHeightCm',25]
].map(([id,key,size])=>({id,file:`models/${id}.glb`,[key]:size}));
export const config={lab:{rotY:{},simplify:{bookcase_archive:.5,monitor_crt:.4,timer_clock:.4,tape_dispenser:.2,spirit_lamp:.6,analyzer:.5,journal_red:.3,spider_specimen:.25},recolor:{
 cabinet_low:{Wood:'#8a9a94',Wood_Dark:'#6f7884',Wood_Light:'#cfd8d4'},bookcase_archive:{'Wood1.001':'#8a9a94','Wood2.001':'#a9b6b0','DarkWood.003':'#6f7884'},chair_office:{Chair:'#3f6bb0'},pendant_lamp:{'Light.004':'#e8fff4'},water_bath:{Grey:'#c9d0d8',Brown:'#6f7884'},spirit_lamp:{'Material.005':'#c9d0d8','Material.007':'#bfe0ff'},spider_specimen:{'Material.001':'#2a1f2e','Material.002':'#4a3a52'},hazard_floor_sign:{Yellow:'#f2c84a',White:'#f2ece0','Pole.001':'#6f7884'}
}}};
// Rotations in radians. Asset-facing corrections are separate from placement rotations.
export const layout=[
 ['cabinet_low',[50,0,199],Math.PI,true],['chair_office',[-185,0,-95],-Math.PI/2,true],['houseplant',[210,0,199],0,true],['clock_wall',[235,205,-223]],['pendant_lamp',[-265,190,-95]],
 ['monitor_crt',[-280,75,-130],Math.PI/2],['analyzer',[-285,75,-95]],['journal',[-250,75,-85]],['journal_red',[-250,75,-150],.14],['journal_red',[-250,78,-150],-.105],['desk_lamp',[-285,75,-40]],['tape_dispenser',[-250,75,-45]],['spirit_lamp',[-120,90,-35]],['timer_clock',[40,90,-40]],['water_bath',[-10,60,199],Math.PI],['journal',[100,60,200]],['journal',[100,63,200],.1],['journal',[100,66,200],-.1]
].map(([id,position,rotation=0,collider=false])=>({id,position,rotation,collider}));
