const iframe=document.querySelector('iframe'),out=document.querySelector('#results'),results=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function check(ok,name){results.push(`${ok?'ПРОВЕРЕНО':'ОШИБКА'}: ${name}`);out.textContent=results.join('\n');if(!ok)throw Error(name);}
try{
 for(let i=0;i<200&&!iframe.contentWindow.game;i++)await wait(100);
 const w=iframe.contentWindow,g=w.game,c=g.ctx,d=iframe.contentDocument;
 check(!!g,'игровые модули загружены');d.querySelector('.splash').dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true}));await wait(600);
 check(c.manager.current.id==='MENU','сплэш → меню');c.save.reset();c.manager.goto('MENU');
 d.querySelector('.menu button').click();await wait(2300);check(g.phase==='CHOICE','меню → перелёт → выбор');
 for(const label of ['Может, да?','Точно да?','Ну да же!','ДА']){d.querySelectorAll('.answers button')[1].click();await wait(30);check(d.querySelectorAll('.answers button')[1].textContent===label,`правая табличка: ${label}`);}
 d.querySelectorAll('.answers button')[1].click();await wait(1000);
 for(let i=0;i<200&&g.phase!=='AUTOWALK';i++)await wait(100);
 check(g.phase==='AUTOWALK','выбор → автопуть, панели предварительно готовы');check(c.save.data.stats.saidNo===4,'счётчик отказов сохранён');
 const before=g.time;g.pause();await wait(250);check(g.time===before,'пауза останавливает время');g.resume();
 for(let i=0;i<1801&&c.manager.current.id==='S01_Intro';i++)c.manager.update(1/60);
 check(c.manager.current.id==='S03_Meet','автопуть → серия 2');check(c.save.data.introDone&&c.save.data.memorySeen,'финальные флаги сохранены');
 c.manager.update(3);check(d.body.textContent.includes('точка подключения S03_Meet'),'показано честное ограничение S03');
 c.manager.goto('MENU');check(d.body.textContent.includes('Продолжить'),'сохранение включает продолжение');
 for(let i=0;i<10;i++){c.manager.goto('S01_Intro',{checkpoint:'choice'});c.manager.update(.1);c.manager.goto('MENU');}
 await wait(500);check(c.manager.current.id==='MENU','10 переходов меню ↔ интро без исключений');
 check(!d.querySelector('#notice').textContent.includes('Не удалось'),'нет перехваченных runtime-ошибок');
 out.textContent+='\nИТОГ: проверки пройдены. Геометрии/слушатели и GPU-время требуют отдельного профилирования.';
}catch(e){out.textContent+='\nСБОЙ: '+e.message;console.error(e);}
