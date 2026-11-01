export const houseConfig={rotY:{},recolor:{
 bed_single:{Red:'#5b6aa8',DarkRed:'#4a5590',Wood:'#8b5a3c',White:'#e8e2d6'},
 dresser_tall:{'Wood*':'#9a6b4a','Wood_Dark*':'#6b4a32','Wood_Light*':'#b08a5a'},dresser_low:{'Wood*':'#9a6b4a','Wood_Dark*':'#6b4a32','Wood_Light*':'#b08a5a'},
 bookcase:{'Wood1.001':'#8b5a3c','Wood2.001':'#9a6b4a','DarkWood.003':'#6b4a32'},chair_wood:{'Sumele_Dress*':'#6b4a32',Seat:'#8b5a3c'},carpet:{DarkRed:'#c96a5a',LightOrange:'#e9c79a'},curtains:{Couch_Blue:'#8fb3c9'},ceiling_lamp:{'Light.004':{color:'#fff1d6',emissive:'#fff1d6',intensity:.5}},book_red:{'*':'#a5483f'},toilet_paper:{'*':'#f2ece0'}
},simplify:{},texturePolicy:{preserve:true,trim:.1,averageIds:['sponge','toilet_paper','book_red','tape_dispenser','tv_retro']}};
export const modelSpecs=[
 ['bed_single','targetLengthCm',200],['chair_wood','targetHeightCm',85],['chair_office','targetHeightCm',100],['dresser_tall','targetHeightCm',85],['dresser_low','targetHeightCm',50],['bookcase','targetHeightCm',190],['book','targetLengthCm',22],['book_red','targetLengthCm',24],['desk_lamp','targetHeightCm',45],['tape_dispenser','targetLengthCm',15],['router','targetWidthCm',25],['alarm_clock','targetHeightCm',12],['carpet','targetLengthCm',200],['curtains','targetHeightCm',160],['houseplant','targetHeightCm',80],['clock_wall','targetWidthCm',30],['ceiling_lamp','targetWidthCm',45],['couch','targetLengthCm',190],['tv_retro','targetWidthCm',45],['kerosene_lamp','targetHeightCm',35],['floor_wood','targetWidthCm',100],['toothpaste','targetLengthCm',18],['sponge','targetLengthCm',12],['toilet_paper','targetHeightCm',11]
].map(([id,axis,value])=>({id,[axis]:value}));
export const rooms={
 HALL:{id:'HALL_GROUND',label:'Прихожая',width:300,depth:200,height:260,wall:'#e9dcc4',world:[-280,0,-80],camera:[400,300,470],target:[0,85,-20]},
 BATH:{id:'BATH_ROOM',label:'Ванная',width:250,depth:200,height:250,wall:'#c4dad5',world:[-255,300,-80],camera:[340,300,440],target:[0,95,-25]},
 STUDY:{id:'STUDY_ROOM',label:'Комната учёного',width:420,depth:360,height:260,wall:'#e6d0ae',world:[340,300,0],camera:[450,420,600],target:[0,80,-20]},
 LIVING:{id:'LIVING',label:'Гостиная',width:420,depth:360,height:260,wall:'#d2d7ba',world:[340,0,0],camera:[450,400,600],target:[0,85,-20]}
};
const item=(id,p,rotation=0,extra={})=>({id,p,rotation,...extra});
export const placements={
 STUDY:[item('bed_single',[155,0,-75],0,{collider:true}),item('bookcase',[-155,0,-160],0,{collider:true}),item('chair_wood',[0,0,-80],Math.PI,{role:'CHAIR',collider:true}),item('dresser_tall',[-182,0,60],Math.PI/2,{role:'DRESSER',collider:true}),item('desk_lamp',[-70,75,-165]),item('router',[30,75,-168]),item('alarm_clock',[40,75,-125]),item('book_red',[-55,75,-125],Math.PI/18),item('book_red',[-55,79,-125],-Math.PI/22.5),item('tape_dispenser',[5,75,-160]),item('curtains',[-20,95,-174]),item('clock_wall',[155,200,-177]),item('carpet',[0,.5,40],Math.PI/2),item('houseplant',[185,0,150],0,{collider:true}),item('book',[150,52,5],.25),item('ceiling_lamp',[0,240,0])],
 HALL:[item('dresser_low',[-10,0,-79],0,{collider:true}),item('kerosene_lamp',[-50,50,-80]),item('clock_wall',[-10,175,-98]),item('carpet',[-95,.5,-30],0,{length:120}),item('houseplant',[60,0,78],0,{collider:true}),item('ceiling_lamp',[0,240,0])],
 BATH:[item('toothpaste',[-120,113,-45],Math.PI/2),item('toilet_paper',[-120,113,-10]),item('toilet_paper',[-120,124,-10]),item('sponge',[97,58,55]),item('ceiling_lamp',[0,230,0])],
 LIVING:[item('couch',[-40,0,-132]),item('dresser_low',[185,0,-40],-Math.PI/2),item('tv_retro',[185,50,-40],-Math.PI/2-Math.PI/6),item('chair_office',[-170,0,20],Math.PI/2),item('carpet',[0,.5,-20],Math.PI/2),item('houseplant',[-185,0,-155]),item('curtains',[60,95,-174]),item('book',[-40,46,-118],.1),item('ceiling_lamp',[0,240,0])]
};
// Эти точки — только демонстрация: настоящие координаты предметов S08 не предоставлены.
export const demoProtected={PASS_CARD:[15,76,-130],MUG_COFFEE:[-10,76,-157],doorWidth:90,catBox:{min:[20,0,125],max:[110,35,180]}};
export const debugRoutes={HALL:{scene:'S07_Morning',checkpoint:'start'},BATH:{scene:'S07_Morning',checkpoint:'sink'},STUDY:{scene:'S08_Prep',checkpoint:'start'},STAIRS:{scene:'S07_Morning',checkpoint:'landing1'}};
