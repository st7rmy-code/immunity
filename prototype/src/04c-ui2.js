/* ===== ИНТЕРФЕЙС v2: проверки и прогресс, тренажёр фишинговых страниц, наставник ===== */

/* --- Проверки (диагностика и итоговая) --- */
const TEST={on:false,phase:null,form:null,items:[],i:0,ans:[],t0:0,rep:false};
function startTest(phase){const form=Assess.formFor(phase);
  Object.assign(TEST,{on:true,phase,form,rep:Assess.list(phase).length>0,items:shuffle(ITEMS.filter(i=>i.f===form)),i:0,ans:[]});
  showTab('progress');renderTest();}
function renderTest(){const box=$('#progBody');box.innerHTML='';const it=TEST.items[TEST.i],pre=TEST.phase==='pre';
  box.append(el('div',{class:'ph'},el('div',{class:'stack',style:'gap:2px'},el('span',{class:'eyebrow',text:pre?'Входная диагностика':'Итоговая проверка'}),el('h2',{text:'Задание '+(TEST.i+1)+' из '+TEST.items.length})),
    el('button',{class:'btn sm ghost',onclick:()=>{TEST.on=false;renderProgress();toast('Проверка прервана, ответы не сохранены');}},'Прервать')));
  box.append(el('div',{class:'dots','aria-hidden':'true'},TEST.items.map((_,i)=>el('i',{class:i<TEST.i?'done':i===TEST.i?'cur':''}))));
  if(TEST.rep&&!TEST.i)box.append(el('p',{class:'small',style:'color:var(--warn)',text:'Вы уже проходили эту форму: результат повторной попытки менее надёжен и весит меньше.'}));
  const card=el('div',{class:'swcard'},el('div',{class:'swhead'},el('div',{class:'avatar',text:initials(it.from)}),el('div',{},el('b',{text:it.from}),el('span',{text:it.kind}))),it.ctx?el('div',{class:'small muted',style:'padding:10px 18px 0;font-style:italic',text:'Ситуация: '+it.ctx}):null,el('div',{class:'swbody',text:it.text}));
  const wrap=el('div',{class:'swwrap'},card);
  if(it.type==='judge'){wrap.append(el('p',{class:'small muted',style:'text-align:center',text:'Это мошенничество?'}),el('div',{class:'swbtns'},el('button',{class:'btn danger',onclick:()=>answer(0)},'Опасно'),el('button',{class:'btn primary',onclick:()=>answer(1)},'Безопасно')),el('p',{class:'small faint',style:'text-align:center',text:'Клавиши: ← опасно, → безопасно'}));}
  else{wrap.append(el('b',{text:it.q}),el('div',{class:'stack',style:'gap:8px'},it.opts.map((o,i)=>el('button',{class:'btn wrap opt',onclick:()=>answer(i)},el('span',{class:'mono',text:(i+1)+'.'}),o))),el('p',{class:'small faint',text:'Клавиши 1–4'}));}
  wrap.append(el('p',{class:'tiny faint',style:'text-align:center',text:'Подсказок нет, ответы разберём в конце. Отвечайте так, как поступили бы в жизни.'}));
  box.append(wrap);TEST.t0=Date.now();window.scrollTo({top:0});}
function answer(a){if(!TEST.on)return;const it=TEST.items[TEST.i];const ok=it.type==='judge'?(a===0)===!!it.scam:a===it.ans;
  TEST.ans.push({id:it.id,ok,ms:Date.now()-TEST.t0,a});TEST.i++;if(TEST.i>=TEST.items.length)finishTest();else renderTest();}
document.addEventListener('keydown',e=>{if(!TEST.on||$('#tab-progress').hidden)return;if(/input|textarea|select/i.test(document.activeElement&&document.activeElement.tagName))return;const it=TEST.items[TEST.i];if(!it)return;
  if(it.type==='judge'){if(e.key==='ArrowLeft'){e.preventDefault();answer(0);}if(e.key==='ArrowRight'){e.preventDefault();answer(1);}}
  else{const n=+e.key;if(n>=1&&n<=it.opts.length){e.preventDefault();answer(n-1);}}});
function finishTest(){const t={phase:TEST.phase,form:TEST.form,ts:Date.now(),rep:TEST.rep,ans:TEST.ans};S.tests.push(t);
  Evidence.recordMany(TEST.ans.map(x=>{const it=ITEM_BY[x.id],legit=it.type==='judge'&&!it.scam;return{k:'item',id:it.id,sk:it.sk,lvl:2,res:x.ok?'ok':'bad',s:x.ok?1:0,legit:legit||undefined,fp:(legit&&!x.ok)||undefined,ms:x.ms,mk:x.ok?[]:it.mk.filter(m=>m!=='legit'||legit),ph:TEST.phase,ans:x.a};}));
  TEST.on=false;renderReport(t);renderIndex();renderNext();}
function cmpRow(label,a,b,fmt,better){const d=b-a,same=fmt(a)===fmt(b),good=better==='up'?d>0:d<0;
  const tg=same?['','без изменений']:better==='time'?['',d<0?'быстрее':'медленнее']:[good?'ok':'bad',good?'лучше':'хуже'];
  return el('div',{class:'cmp'},el('span',{text:label}),el('span',{class:'mono muted',text:fmt(a)}),el('span',{class:'arrow',text:'→'}),el('b',{class:'mono',text:fmt(b)}),el('span',{class:'tag '+tg[0],text:tg[1]}));}
function compareBlock(pre,post){const a=Assess.summary(pre),b=Assess.summary(post);if(!a||!b)return null;
  const rows=[cmpRow('Доля верных решений',a.acc,b.acc,v=>pct(v),'up'),a.fp!=null&&b.fp!=null?cmpRow('Ложные тревоги на обычных сообщениях',a.fp,b.fp,v=>pct(v),'down'):null,a.tpr!=null&&b.tpr!=null?cmpRow('Распознано мошенничество',a.tpr,b.tpr,v=>pct(v),'up'):null,a.med&&b.med?cmpRow('Время решения (медиана)',a.med,b.med,v=>fmtSec(v),'time'):null];
  const sk=el('div',{class:'stack',style:'gap:6px'},CAT_KEYS.map(c=>{const x=a.sk[c],y=b.sk[c];return el('div',{class:'cmp sk'},el('span',{text:CATS[c]}),el('span',{class:'mono muted',text:x.ok+'/'+x.n}),el('span',{class:'arrow',text:'→'}),el('b',{class:'mono',text:y.ok+'/'+y.n}),el('span',{class:'tag '+(y.ok>x.ok?'ok':y.ok<x.ok?'bad':''),text:y.ok>x.ok?'лучше':y.ok<x.ok?'хуже':'так же'}));}));
  return el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'До и после обучения'}),el('span',{class:'small muted',text:'разные задания одинаковой сложности'})),el('div',{class:'stack',style:'gap:8px'},rows),el('h3',{text:'По темам'}),sk,
    el('p',{class:'tiny faint',text:'Каждая проверка — 12 заданий, поэтому это ориентир, а не точное измерение. Главное — меняется ли качество решений: доля верных ответов и ложные тревоги, а не количество пройденных материалов. Скорость сама по себе не цель: быстрый верный ответ хорош, быстрый неверный — нет.'}));}
function renderReport(t){const box=$('#progBody');box.innerHTML='';const r=Assess.summary(t),pre=t.phase==='pre';
  box.append(el('div',{class:'ph'},el('div',{class:'stack',style:'gap:2px'},el('span',{class:'eyebrow',text:pre?'Входная диагностика':'Итоговая проверка'}),el('h2',{text:r.ok+' из '+r.n+' решений верные'})),el('button',{class:'btn sm',onclick:()=>{renderProgress();}},'К прогрессу')));
  box.append(el('div',{class:'kpis'},
    el('div',{class:'kpi'},el('span',{text:'Доля верных решений'}),el('b',{text:pct(r.acc)}),el('span',{text:r.ok+' из '+r.n})),
    el('div',{class:'kpi'},el('span',{text:'Распознано мошенничество'}),el('b',{text:pct(r.tpr)}),el('span',{text:'опасные сообщения и звонки'})),
    el('div',{class:'kpi'},el('span',{text:'Ложные тревоги'}),el('b',{text:pct(r.fp)}),el('span',{text:'обычные сообщения, принятые за обман'})),
    el('div',{class:'kpi'},el('span',{text:'Время решения'}),el('b',{text:fmtSec(r.med)}),el('span',{text:'медиана на задание'}))));
  if(!pre){const p=Assess.last('pre');const cb=p&&compareBlock(p,t);if(cb)box.append(cb);}
  const sk=el('div',{class:'stack',style:'gap:6px'},CAT_KEYS.map(c=>{const x=r.sk[c];return el('div',{class:'cmp sk3'},el('span',{text:CATS[c]}),el('b',{class:'mono',text:x.ok+' из '+x.n}),el('span',{class:'tag '+(x.ok===x.n?'ok':x.ok?'warn':'bad'),text:x.ok===x.n?'верно':x.ok?'частично':'ошибки'}));}));
  if(pre)box.append(el('div',{class:'card'},el('h2',{text:'По темам'}),sk,el('p',{class:'tiny faint',text:'По два задания на тему — это стартовая оценка. Тренировки уточнят её: следите за «±» в индексе.'})));
  if(r.wrong.length){const list=el('div',{class:'stack',style:'gap:10px'});
    r.wrong.forEach(({it,a})=>list.append(el('div',{class:'flag'},el('b',{text:CATS[it.sk]+' · '+it.from}),el('span',{class:'small',text:it.text}),
      el('span',{class:'small'},el('b',{text:'Ваш ответ: '}),it.type==='judge'?(a===0?'опасно':'безопасно'):(it.opts[a]||'—')),
      el('span',{class:'small'},el('b',{text:'Правильно: '}),it.type==='judge'?(it.scam?'опасно — это мошенничество':'безопасно — это обычное сообщение'):it.opts[it.ans]),
      el('span',{class:'small muted',text:it.why}))));
    box.append(el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Разбор ошибок'}),el('button',{class:'btn sm',onclick:()=>{showTab('mentor');setMentorTab('mist');}},'Разобрать с наставником')),list));}
  else box.append(el('div',{class:'verdict ok'},el('b',{text:'Ни одной ошибки'}),el('span',{text:'Отличный результат. Тренировки повышенной сложности помогут не расслабляться.'})));
  const nx=Rec.next(3);
  box.append(el('div',{class:'card'},el('h2',{text:'Ваш план'}),el('p',{class:'small muted',text:'Подобрано по результатам: сначала слабые темы и ошибки, потом — новое и сложное.'}),el('div',{class:'scens'},nx.map(recCard))));
  if(!pre)box.append(el('div',{class:'row'},el('button',{class:'btn',onclick:()=>downloadReport()},'Скачать отчёт')));
  window.scrollTo({top:0});}

/* --- Прогресс --- */
function renderProgress(){const box=$('#progBody');if(!box)return;box.innerHTML='';
  const sk=Evidence.skills(),ov=Evidence.overall(sk),m=Evidence.metrics(),pre=Assess.last('pre'),post=Assess.last('post'),since=Assess.since();
  box.append(el('div',{class:'ph'},el('div',{class:'stack',style:'gap:4px'},el('h2',{text:'Мой прогресс'}),el('p',{class:'small muted',text:'Главная мера — качество решений: доля верных ответов, ложные тревоги и время. Не количество пройденных заданий.'})),
    el('div',{class:'idxbig'},el('b',{text:ov?String(ov.v):'—'}),el('span',{text:ov?'± '+ov.pm+' · по '+ov.cov+' из 6 тем':'индекс появится после диагностики'}))));
  const preRow=el('div',{class:'trow'},el('div',{},el('b',{text:'Входная диагностика'}),el('span',{class:'small muted',text:pre?new Date(pre.ts).toLocaleDateString('ru-RU')+' · '+Assess.summary(pre).ok+' из 12 верно':'12 заданий, около 5 минут'})),
    pre?el('div',{class:'row'},el('button',{class:'btn sm',onclick:()=>renderReport(pre)},'Результат'),el('button',{class:'btn sm ghost',onclick:()=>startTest('pre')},'Перепройти')):el('button',{class:'btn sm primary',onclick:()=>startTest('pre')},'Пройти'));
  const ready=Assess.postReady();
  const postRow=el('div',{class:'trow'},el('div',{},el('b',{text:'Итоговая проверка'}),el('span',{class:'small muted',text:post?new Date(post.ts).toLocaleDateString('ru-RU')+' · '+Assess.summary(post).ok+' из 12 верно':!pre?'Сначала пройдите диагностику':ready?'Готово к сравнению: новые задания, которых вы не видели':'Лучше после тренировок: '+Math.min(since.n,6)+' из 6, тем '+Math.min(since.sk,3)+' из 3'})),
    pre?el('div',{class:'row'},post?el('button',{class:'btn sm',onclick:()=>renderReport(post)},'Сравнение'):null,el('button',{class:post?'btn sm ghost':ready?'btn sm primary':'btn sm',onclick:()=>startTest('post')},post?'Перепройти':ready?'Пройти':'Пройти сейчас')):null);
  box.append(el('div',{class:'card'},el('h2',{text:'Проверки'}),el('p',{class:'small muted',text:'Диагностика и итоговая проверка состоят из разных заданий одинаковой сложности, порядок форм выбирается случайно. Так видно, растёт ли умение, а не память на конкретные задания.'}),preRow,postRow));
  if(pre&&post){const cb=compareBlock(pre,post);if(cb)box.append(cb);}
  const order=CAT_KEYS.slice().sort((a,b)=>(sk[a].n>=.5?sk[a].m:2)-(sk[b].n>=.5?sk[b].m:2));
  box.append(el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Карта навыков'}),el('span',{class:'legend'},el('span',{},el('b',{class:'pt-l'}),'оценка'),el('span',{},el('i',{class:'band-l'}),'неопределённость'))),
    el('div',{class:'stack',style:'gap:4px'},order.map(c=>{const x=sk[c],st=Evidence.status(x);return el('div',{class:'maprow'},skillBar(c,x),el('span',{class:'tag '+st.k,text:st.t}),el('span',{class:'tiny faint',text:plural(x.cnt,'решение','решения','решений')}));})),
    el('p',{class:'tiny faint',text:'Слабые темы сверху. Оценка уточняется с каждым решением; повторы одного сценария почти не добавляют уверенности.'})));
  box.append(el('div',{class:'kpis'},
    el('div',{class:'kpi'},el('span',{text:'Верные решения'}),el('b',{text:pct(m.acc)}),el('span',{text:'по всем тренировкам и проверкам'})),
    el('div',{class:'kpi'},el('span',{text:'Ложные тревоги'}),el('b',{text:pct(m.fp)}),el('span',{text:m.legitN?'из '+plural(m.legitN,'честного','честных','честных')+' сообщения и звонка':'ещё не было честных сценариев'})),
    el('div',{class:'kpi'},el('span',{text:'Время решения'}),el('b',{text:fmtSec(m.med)}),el('span',{text:'медиана: от первого тревожного признака'})),
    el('div',{class:'kpi'},el('span',{text:'Разнообразие'}),el('b',{text:String(m.uniq)}),el('span',{text:'разных сценариев из '+m.practice+' тренировок'}))));
  const rep=Evidence.repeated();
  box.append(el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Повторяющиеся ошибки'}),rep.length?el('button',{class:'btn sm',onclick:()=>{showTab('mentor');setMentorTab('mist');}},'Разобрать'):null),
    rep.length?el('ul',{class:'clean'},rep.slice(0,5).map(([k,n])=>el('li',{text:MARKERS[k]+' — '+plural(n,'раз','раза','раз')}))):el('p',{class:'small muted',text:'Пока нет: ошибка считается повторяющейся, если случилась хотя бы дважды.'})));
  box.append(el('div',{class:'card'},el('h2',{text:'Следующие шаги'}),el('div',{class:'scens'},Rec.next(4).map(recCard))));
  box.append(el('div',{class:'card flat'},el('h3',{text:'Как считается индекс'}),el('p',{class:'small',text:IDX_HELP}),el('p',{class:'small muted',text:'Подробно: по каждой теме ведётся оценка с нейтральной стартовой точкой. Каждое решение добавляет к ней вес: задание проверки — 1, тренировка — 1, карточка «Верю — не верю» — 0,35. Вес умножается на сложность (0,8 / 1 / 1,25) и уменьшается для повторов того же сценария (1 → 0,5 → 0,25 → 0,15 → 0,1) и для старых результатов (вдвое за 90 дней).'})));
  const exp=el('button',{class:'btn sm',onclick:exportProgress},'Экспорт'),imp=el('button',{class:'btn sm',onclick:importProgress},'Импорт');
  box.append(el('div',{class:'card'},el('h2',{text:'Мои данные'}),el('p',{class:'small muted',text:'Прогресс хранится только в этом браузере: без имени, телефона и других личных данных. Перенести его на другое устройство можно через экспорт и импорт.'+(S.migrated?' Результаты прошлой версии тренажёра перенесены.':'')}),
    el('div',{class:'row'},exp,imp,el('button',{class:'btn sm ghost',onclick:()=>{if(confirmReset())resetProgress();}},'Сбросить всё'))));}
let resetArm=0;
function confirmReset(){const now=Date.now();if(now-resetArm<4000)return true;resetArm=now;toast('Нажмите «Сбросить всё» ещё раз, чтобы стереть прогресс');return false;}
function resetProgress(){const keep={aud:S.aud,large:S.large,coach:S.coach,voice:S.voice,vMale:S.vMale,vFemale:S.vFemale,vRate:S.vRate,handsFree:S.handsFree,tab:'progress'};S=Object.assign(Store.blank(),keep);save();refreshAll();toast('Прогресс сброшен');}
function refreshAll(){applyLarge();renderAuds();renderIndex();renderNext();renderPick();renderProt();if(!$('#tab-progress').hidden)renderProgress();}
async function exportProgress(){const txt=Store.exportText(),r=await DL.save('immunitet-progress-'+new Date().toISOString().slice(0,10)+'.json',txt);
  if(r.ok){toast('Файл сохранён');return;}if(r.code==='declined')return;
  const ta=el('textarea',{rows:'8',readonly:true,'aria-label':'Данные прогресса'});ta.value=txt;
  modal('Экспорт прогресса',el('div',{class:'stack',style:'gap:10px'},el('p',{class:'small',text:'Скачивание недоступно в этом окне. Скопируйте текст и сохраните его в файл — потом его можно импортировать.'}),ta,el('button',{class:'btn primary',onclick:()=>{try{navigator.clipboard.writeText(txt).then(()=>toast('Скопировано'),()=>{ta.select();toast('Выделено — нажмите Ctrl+C');});}catch(e){ta.select();}}},'Скопировать')));}
function importProgress(){const ta=el('textarea',{rows:'6',placeholder:'Вставьте сюда содержимое файла экспорта','aria-label':'Данные для импорта'});const file=el('input',{type:'file',accept:'application/json,.json','aria-label':'Файл экспорта'});const msg=el('p',{class:'small'});
  file.onchange=()=>{const f=file.files&&file.files[0];if(!f)return;if(f.size>2e6){msg.textContent='Файл слишком большой.';return;}const rd=new FileReader();rd.onload=()=>{ta.value=String(rd.result||'');};rd.readAsText(f);};
  let close;const go=el('button',{class:'btn primary',onclick:()=>{const r=Store.parseImport(ta.value);if(r.err){msg.textContent=r.err;msg.style.color='var(--bad)';return;}
    S=r.data;S.tab='progress';save();close();refreshAll();renderProgress();toast('Импортировано решений: '+S.attempts.length);}},'Заменить мой прогресс');
  close=modal('Импорт прогресса',el('div',{class:'stack',style:'gap:10px'},el('p',{class:'small',text:'Текущий прогресс в этом браузере будет заменён данными из файла.'}),file,ta,msg,go));}
async function downloadReport(){const pre=Assess.last('pre'),post=Assess.last('post');if(!pre||!post){toast('Нужны обе проверки');return;}
  const a=Assess.summary(pre),b=Assess.summary(post),row=(l,x,y)=>'<tr><td>'+l+'</td><td>'+x+'</td><td>'+y+'</td></tr>',esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);
  const html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт «Иммунитет»</title><style>body{font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px;color:#111}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}small{color:#666}</style></head><body><h1>Отчёт об изменении уровня подготовки</h1><p><small>Тренажёр «Иммунитет» · '+new Date().toLocaleDateString('ru-RU')+'. Учебный показатель, не гарантия защиты. Диагностика и итоговая проверка — разные задания одинаковой сложности, по 12 в каждой.</small></p><table><tr><th>Показатель</th><th>Диагностика</th><th>Итоговая</th></tr>'+
    row('Доля верных решений',pct(a.acc),pct(b.acc))+row('Распознано мошенничество',pct(a.tpr),pct(b.tpr))+row('Ложные тревоги',pct(a.fp),pct(b.fp))+row('Время решения (медиана)',fmtSec(a.med),fmtSec(b.med))+CAT_KEYS.map(c=>row(esc(CATS[c]),a.sk[c].ok+'/'+a.sk[c].n,b.sk[c].ok+'/'+b.sk[c].n)).join('')+'</table></body></html>';
  const r=await DL.save('immunitet-otchet.html',html);if(r.ok)toast('Отчёт сохранён');else if(r.code!=='declined')toast('Скачивание недоступно в этом окне');}

/* --- Тренажёр фишинговых страниц --- */
function openSite(id){const s=SITE_BY[id];if(!s)return;showTab('train');stopSim();
  TR.mode='site';$$('#trSeg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m==='site')));
  $('#swipeBox').hidden=true;$('#simPick').hidden=true;$('#simStage').hidden=false;$('#aiStatus').hidden=true;$('#voiceBtn').hidden=true;$('#voiceSet').hidden=true;$('#coachBtn').hidden=false;
  const tl={};s.blocks.forEach((b,i)=>{if(b.timer)tl[i]=b.timer;});
  SIM={mode:'site',sc:s,state:'browse',marked:new Set(),t0:Date.now(),ended:false,tl,timer:null};
  renderSitePhone();renderSiteSide();SIM.timer=setInterval(tickSite,1000);window.scrollTo({top:0});}
function tickSite(){if(!SIM||SIM.mode!=='site'||SIM.ended)return;Object.keys(SIM.tl).forEach(i=>{if(SIM.tl[i]>0)SIM.tl[i]--;const n=$('#pgt'+i);if(n)n.textContent=mmss(SIM.tl[i]);});}
function spotsOf(s){const sp=[];if(s.urlSp)sp.push(Object.assign({id:'url'},s.urlSp));s.blocks.forEach((b,i)=>{if(b.sp)sp.push(Object.assign({id:'b'+i},b.sp));});return sp;}
function okOf(s,id){if(id==='url')return s.urlOk||'Адресная строка';const b=s.blocks[+id.slice(1)];return b&&b.ok||'Обычный элемент страницы.';}
function markable(id,node,s){const on=SIM.marked.has(id),res=SIM.result;node.dataset.spot=id;
  if(res){const isSp=res.spots.some(x=>x.id===id),cls=isSp?(on?'f-ok':'f-miss'):(on?'f-false':'');if(cls)node.classList.add(cls);
    if(isSp||on){const n=res.order.indexOf(id)+1;if(n)node.prepend(el('span',{class:'pbadge',text:isSp?(on?'✓':'!'):'?','aria-label':isSp?(on?'найдено':'пропущено'):'нормальный элемент'}));}
    return node;}
  node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-pressed',String(on));if(on)node.classList.add('marked');
  const tog=()=>{if(SIM.ended)return;if(SIM.marked.has(id))SIM.marked.delete(id);else SIM.marked.add(id);renderSitePhone(true);renderSiteSide();};
  node.addEventListener('click',e=>{e.preventDefault();tog();});node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog();}});return node;}
function renderSitePhone(keepScroll){const s=SIM.sc,ph=$('#phone'),prev=$('#pgScroll'),st=keepScroll&&prev?prev.scrollTop:0;ph.innerHTML='';
  const scr=el('div',{class:'ph-screen browser'});ph.append(statusBar(),scr);
  scr.append(markable('url',el('div',{class:'addr'},el('span',{class:'lockic',html:IC.lock}),el('span',{class:'u',text:s.url})),s));
  scr.append(el('div',{class:'trainmark',text:'Учебная симуляция · ничего не вводится и не отправляется'}));
  const pg=el('div',{class:'pgwrap',id:'pgScroll'});
  s.blocks.forEach((b,i)=>{const id='b'+i;let node;
    const txt=()=>{if(!b.timer)return b.x;const [a,z]=b.x.split('{timer}');return el('span',{},a,el('span',{class:'mono',id:'pgt'+i,text:mmss(SIM.tl[i])}),z);};
    if(b.t==='header')node=el('div',{class:'pg-head',style:'background:'+s.col},el('span',{class:'pg-logo',text:s.brand.slice(0,1)}),el('span',{text:b.x}));
    else if(b.t==='banner')node=el('div',{class:'pg-banner'},txt());
    else if(b.t==='h')node=el('h3',{class:'pg-h',text:b.x});
    else if(b.t==='hero')node=el('div',{class:'pg-hero',text:b.x});
    else if(b.t==='price')node=el('div',{class:'pg-price',text:b.x});
    else if(b.t==='video')node=el('div',{class:'pg-video'},el('span',{text:'▶'}),el('span',{text:b.x.replace(/^▶\s*/,'')}));
    else if(b.t==='field')node=el('div',{class:'pg-field'},el('span',{text:b.x}),el('span',{class:'pg-input',text:'учебные данные'}));
    else if(b.t==='note')node=el('div',{class:'pg-note',text:b.x});
    else if(b.t==='cta'){pg.append(el('button',{class:'pg-cta',style:'background:'+s.col,onclick:()=>confirmEnter()},b.x));return;}
    else node=el('div',{class:'pg-foot',text:b.x});
    pg.append(markable(id,node,s));});
  scr.append(pg);
  if(!SIM.ended)scr.append(el('div',{class:'tray'},el('button',{class:'btn sm',onclick:()=>siteDecide(true)},'Ввести данные'),el('button',{class:'btn sm',onclick:()=>siteDecide(false)},'Закрыть страницу')));
  else scr.append(el('div',{class:'tray done'},el('span',{class:'small',text:SIM.enter?'Вы ввели данные':'Вы закрыли страницу'}),el('button',{class:'btn sm',onclick:()=>openSite(s.id)},'Ещё раз')));
  if(st)pg.scrollTop=st;}
function confirmEnter(){if(SIM.ended)return;const scr=$('#phone .ph-screen');const ov=el('div',{class:'vfy'},el('b',{text:'Отправить данные на этой странице?'}),el('p',{class:'small',text:'Это решение: дальше будет разбор.'}),el('button',{class:'vopt',onclick:()=>{ov.remove();siteDecide(true);}},'Да, отправить'),el('button',{class:'vopt',onclick:()=>ov.remove()},'Нет, вернуться к странице'));scr.append(ov);}
function siteDecide(enter){if(!SIM||SIM.ended)return;SIM.ended=true;SIM.enter=enter;clearInterval(SIM.timer);const s=SIM.sc,spots=spotsOf(s);
  const found=spots.filter(x=>SIM.marked.has(x.id)),missed=spots.filter(x=>!SIM.marked.has(x.id)),falseM=[...SIM.marked].filter(id=>!spots.some(x=>x.id===id));
  let res,sc,h,p;
  if(!s.legit){if(enter){res='bad';sc=0;h='Вы ввели данные на поддельной странице';p='В жизни данные ушли бы мошенникам. '+s.right;}
    else{const r=spots.length?found.length/spots.length:1;sc=Math.max(.5,Math.min(1,.6+.4*r-.08*falseM.length));res=r>=.5?'ok':'warn';h=r>=.5?'Верно: это подделка':'Решение верное, но признаков найдено мало';p='Вы нашли '+found.length+' из '+spots.length+' признаков'+(falseM.length?' и ещё '+plural(falseM.length,'нормальный элемент','нормальных элемента','нормальных элементов')+' отметили как подозрительные':'')+'.';}}
  else{if(enter){sc=Math.max(.6,1-.1*falseM.length);res='ok';h='Всё верно: страница честная';p='Вы пришли сюда сами, адрес совпадает с официальным, лишнего не просят.'+(falseM.length?' Отмеченные вами элементы на самом деле нормальные — посмотрите пояснения.':'');}
    else{sc=.5;res='warn';h='Лишняя тревога';p='Эта страница честная. Осторожность — это хорошо, но важно отличать настоящие сайты от поддельных.';}}
  const mk=res==='ok'?[]:s.legit?['legit']:[...new Set((enter?spots:missed).map(x=>x.mk))];
  const before=Evidence.skills()[s.sk];
  Evidence.record({k:'site',id:s.id,sk:s.sk,lvl:s.lvl,res,s:sc,legit:!!s.legit||undefined,fp:(s.legit&&!enter)||undefined,ms:Date.now()-SIM.t0,mk});
  const after=Evidence.skills()[s.sk];
  SIM.result={res,h,p,spots,found,missed,falseM,order:spots.map(x=>x.id).concat(falseM),delta:{before:Math.round(before.m*100),after:Math.round(after.m*100)}};
  renderSitePhone();renderSiteSide();}
function renderSiteSide(){const side=$('#simSide');if(!side||!SIM||SIM.mode!=='site')return;side.innerHTML='';const s=SIM.sc;
  if(!SIM.ended){
    const c=el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:s.t}),el('span',{class:'tag',text:LVL[s.lvl]})),
      el('p',{class:'small'},el('b',{text:'Как вы сюда попали. '}),s.ctx),
      el('p',{class:'small',text:'Задание: нажимайте на всё, что кажется подозрительным, — адресную строку, тексты, поля. Повторное нажатие снимает отметку. Потом примите решение кнопками внизу экрана.'}),
      el('div',{class:'row',style:'justify-content:space-between'},el('span',{class:'small muted',text:'Отмечено: '+SIM.marked.size}),SIM.marked.size?el('button',{class:'btn sm ghost',onclick:()=>{SIM.marked.clear();renderSitePhone(true);renderSiteSide();}},'Снять отметки'):null));
    if(S.coach)c.append(el('p',{class:'small faint',text:'Подсказка: начните с адреса страницы и с того, как вы на неё попали. Поля ввода сами по себе нормальны — важно, что и зачем просят.'}));
    side.append(c,el('p',{class:'small faint',text:'Страница учебная: бренды и адреса вымышлены, поля заполнены учебными данными и ничего не отправляют.'}));return;}
  const r=SIM.result;
  side.append(el('div',{class:'verdict '+r.res},el('b',{text:r.h}),el('span',{text:r.p}),el('span',{class:'small muted',text:'Тема «'+CATS[s.sk]+'»: '+r.delta.before+' → '+r.delta.after})));
  if(r.spots.length){const lst=el('div',{class:'stack',style:'gap:8px'});
    r.spots.forEach(x=>{const f=SIM.marked.has(x.id);lst.append(el('div',{class:'spotrow '+(f?'ok':'miss')},el('span',{class:'pb',text:f?'✓':'!'}),el('div',{},el('b',{text:x.t+(f?'':' — пропущено')}),el('span',{class:'small muted',text:x.w}))));});
    side.append(el('div',{class:'card'},el('h3',{text:'Признаки подделки'}),lst));}
  if(r.falseM.length)side.append(el('div',{class:'card'},el('h3',{text:'Это было нормально'}),el('div',{class:'stack',style:'gap:8px'},r.falseM.map(id=>el('div',{class:'spotrow'},el('span',{class:'pb',text:'?'}),el('span',{class:'small',text:okOf(s,id)}))))));
  if(s.legit)side.append(el('div',{class:'card'},el('h3',{text:'Почему страница честная'}),el('ul',{class:'clean small'},[s.urlOk].concat(s.blocks.filter(b=>b.ok).slice(0,3).map(b=>b.ok)).map(x=>el('li',{text:x})))));
  side.append(el('div',{class:'card'},el('h3',{text:'Правильный ход'}),el('p',{text:s.right})));
  const nx=Rec.next(1,c=>!(c.k==='site'&&c.id===s.id))[0];
  side.append(el('div',{class:'row'},nx?el('button',{class:'btn primary',onclick:()=>startEx(nx.c)},'Дальше: '+nx.c.t):null,el('button',{class:'btn',onclick:()=>openSite(s.id)},'Ещё раз'),el('button',{class:'btn ghost',onclick:()=>$('#backPick').click()},'Другие сайты')));}

/* --- Наставник --- */
const MENTOR={tab:'check',chat:[],busy:false};
function setMentorTab(t){MENTOR.tab=t;$$('#mSeg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.t===t)));['check','ask','mist','gloss'].forEach(k=>$('#m-'+k).hidden=k!==t);
  if(t==='mist')renderMistakes();if(t==='gloss')renderGloss();if(t==='ask')renderAsk();}
$$('#mSeg button').forEach(b=>b.onclick=()=>setMentorTab(b.dataset.t));
function renderMentor(){setMentorTab(MENTOR.tab);renderMentorStatus();}
function renderMentorStatus(){const n=$('#mStatus');if(n)n.textContent=AI.ready&&!AI.limited()?'ИИ-наставник подключён: ответы — мнение модели, а не установленный факт':AI.ready?AI.label():(AI.reason||'ИИ недоступен')+': работают проверка шаблонами, словарь и подбор упражнений';}
AI.on(renderMentorStatus);
/* проверка сообщения */
function highlight(text,hits){const rs=[];hits.forEach(h=>h.ms.forEach(m=>rs.push([m.index,m.end])));rs.sort((a,b)=>a[0]-b[0]);
  const merged=[];rs.forEach(r=>{const l=merged[merged.length-1];if(l&&r[0]<=l[1])l[1]=Math.max(l[1],r[1]);else merged.push([...r]);});
  const box=el('div',{class:'hl'});let p=0;merged.forEach(([a,b])=>{if(a>p)box.append(text.slice(p,a));box.append(el('mark',{text:text.slice(a,b)}));p=b;});if(p<text.length)box.append(text.slice(p));return box;}
function trainBtn(tr){if(!tr)return null;const x=scenarioById(tr[0],tr[1]);return x?el('button',{class:'btn sm',onclick:()=>tr[0]==='site'?openSite(tr[1]):openSim(tr[0],tr[1])},'Потренироваться: '+x.t):null;}
let imgs=[];
async function prepImage(file){const bmp=await createImageBitmap(file),s=Math.min(1,1400/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));return{blob,b64:c.toDataURL('image/jpeg',.85).split(',')[1],type:'image/jpeg',url:URL.createObjectURL(blob)};}
async function addFiles(files){for(const f of files){if(!f.type.startsWith('image/'))continue;if(f.size>CK.IMG_MB*1048576){toast('Файл больше '+CK.IMG_MB+' МБ');continue;}if(imgs.length>=2){toast('Не больше двух скриншотов');break;}try{imgs.push(await prepImage(f));}catch(e){toast('Не удалось прочитать картинку');}}renderThumbs();}
function renderThumbs(){const t=$('#ckThumbs');t.innerHTML='';imgs.forEach((im,i)=>t.append(el('div',{},el('img',{src:im.url,alt:'Скриншот '+(i+1)}),el('button',{'aria-label':'Убрать скриншот',onclick:()=>{URL.revokeObjectURL(im.url);imgs.splice(i,1);renderThumbs();}},'✕'))));}
$('#ckAddImg').onclick=()=>$('#ckFile').click();$('#ckFile').onchange=e=>{addFiles([...e.target.files]);e.target.value='';};
$('#ckText').addEventListener('paste',e=>{const fs=[...(e.clipboardData&&e.clipboardData.files||[])].filter(f=>f.type.startsWith('image/'));if(fs.length){e.preventDefault();addFiles(fs);}});
$('#toEmergency').onclick=()=>{showTab('protect');setTimeout(()=>$('#emergency').scrollIntoView({behavior:'smooth'}),60);};
/* вопрос наставнику */
const ASK_SUG=['Что мне потренировать?','Что такое дроппер и чем это грозит?','Как защитить пожилых родителей?','Как понять, что голос подделан?'];
function recButtons(ids){return el('div',{class:'row'},ids.map(id=>{const [k,i]=id.split(':'),x=scenarioById(k,i);return x?el('button',{class:'btn sm',onclick:()=>startEx({k,id:i})},KIND_T[k]+': '+x.t):null;}));}
function renderAsk(){const log=$('#askLog');log.innerHTML='';
  if(!MENTOR.chat.length)log.append(el('div',{class:'mmsg bot'},el('p',{text:'Я наставник тренажёра. Спросите про термин, схему или ситуацию — объясню простыми словами и подскажу, что потренировать.'}),el('div',{class:'row'},ASK_SUG.map(q=>el('button',{class:'fchip',onclick:()=>askSend(q)},q)))));
  MENTOR.chat.forEach(m=>{if(m.role==='user'){log.append(el('div',{class:'mmsg me',text:m.text}));return;}
    const d=m.data||{};log.append(el('div',{class:'mmsg bot'},el('p',{text:d.answer||''}),d.recs&&d.recs.length?el('div',{class:'stack',style:'gap:6px'},el('span',{class:'small muted',text:'Упражнения:'}),recButtons(d.recs)):null,
      d.terms&&d.terms.length?el('div',{class:'row'},d.terms.map(t=>el('button',{class:'fchip',onclick:()=>{setMentorTab('gloss');GL.q=t;renderGloss();}},'Словарь: '+t))):null,
      el('span',{class:'tiny faint',text:m.local?'Ответ тренажёра без ИИ: словарь и подбор упражнений.':'Мнение ИИ-наставника, уверенность: '+({high:'высокая',medium:'средняя',low:'низкая'}[d.confidence]||'средняя')+'. Важное проверяйте в официальных источниках.'})));});
  if(MENTOR.busy)log.append(el('div',{class:'mmsg bot typing',text:'Наставник думает…'}));
  log.scrollTop=log.scrollHeight;$('#askGo').disabled=MENTOR.busy;}
async function askSend(q){q=String(q||'').trim();if(!q||MENTOR.busy)return;$('#askIn').value='';
  let text=q;if(AI.ready&&!AI.limited()){const c=await Privacy.confirm({text:q,purpose:'ответ наставника'});if(!c.ok)return;text=c.text||q;}
  MENTOR.chat.push({role:'user',text});MENTOR.busy=true;renderAsk();
  const hist=MENTOR.chat.slice(-7,-1).map(m=>(m.role==='user'?'Пользователь: '+m.text:'Наставник: '+(m.data&&m.data.answer||''))).join('\n');
  const r=await Mentor.ask(text,hist);MENTOR.busy=false;MENTOR.chat.push({role:'bot',data:r.data,local:!!r.local});MENTOR.chat=MENTOR.chat.slice(-20);renderAsk();
  if(r.err&&r.local)toast(AI.msg(r.err)+' Ответил без ИИ.');}
$('#askForm').addEventListener('submit',e=>{e.preventDefault();askSend($('#askIn').value);});
/* мои ошибки */
function exerciseFor(mk){const cand=Rec.catalog().filter(c=>{const x=scenarioById(c.k,c.id);if(!x)return false;if(mk==='verify')return(c.k==='call'||c.k==='chat')&&!!x.verify&&!x.honest;if(mk==='legit'&&(x.honest||x.legit))return true;if(c.k==='site')return spotsOf(x).some(s=>s.mk===mk);return(x.mk||[]).includes(mk);});
  const tries={};S.attempts.forEach(a=>{const k=a.k+':'+a.id;tries[k]=(tries[k]||0)+1;});cand.sort((a,b)=>(tries[a.k+':'+a.id]||0)-(tries[b.k+':'+b.id]||0));return cand[0];}
function renderMistakes(){const box=$('#m-mist');box.innerHTML='';const rep=Evidence.repeated(),list=Evidence.mistakes(8),sk=Evidence.skills();
  if(!S.attempts.length){box.append(el('div',{class:'card'},el('h2',{text:'Ошибок пока нет'}),el('p',{class:'muted',text:'Пройдите диагностику или пару тренировок — здесь появится разбор того, на что вас ловят чаще всего.'}),el('div',{class:'row'},el('button',{class:'btn primary',onclick:()=>startTest('pre')},'Пройти диагностику'))));return;}
  box.append(el('div',{class:'card'},el('h2',{text:'Повторяющиеся ошибки'}),rep.length?el('div',{class:'stack',style:'gap:8px'},rep.slice(0,5).map(([k,n])=>{const ex=exerciseFor(k);return el('div',{class:'trow'},el('div',{},el('b',{text:MARKERS[k]}),el('span',{class:'small muted',text:plural(n,'ошибка','ошибки','ошибок')+' за последние 4 месяца'})),ex?el('button',{class:'btn sm',onclick:()=>startEx(ex)},'Потренировать'):null);})):el('p',{class:'small muted',text:'Повторяющихся ошибок нет. Ошибка считается повторяющейся, если случилась хотя бы дважды.'})));
  const weak=CAT_KEYS.filter(c=>sk[c].n>=1&&sk[c].m<.55);
  if(weak.length)box.append(el('div',{class:'card'},el('h2',{text:'Слабые темы'}),el('div',{class:'stack',style:'gap:4px'},weak.map(c=>skillBar(c,sk[c])))));
  if(list.length)box.append(el('div',{class:'card'},el('h2',{text:'Последние ошибки'}),el('div',{class:'stack',style:'gap:8px'},list.map(a=>{const x=scenarioById(a.k,a.id),t=x?(x.t||x.text||x.x):a.id;
    return el('div',{class:'trow'},el('div',{style:'min-width:0'},el('b',{class:'small',text:KIND_T[a.k]+' · '+String(t).slice(0,80)}),el('span',{class:'small muted',text:(a.fp?'лишняя тревога на честном сообщении':RES_T[a.res])+(a.mk&&a.mk.length?' · '+a.mk.map(m=>MARKERS[m]).join(', '):'')})),(a.k==='call'||a.k==='chat'||a.k==='site')?el('button',{class:'btn sm ghost',onclick:()=>startEx({k:a.k,id:a.id})},'Повторить'):null);}))));
  const out=el('div',{class:'stack'});
  box.append(el('div',{class:'card flat'},el('div',{class:'ph'},el('h2',{text:'Разбор с наставником'}),el('button',{class:'btn sm primary',disabled:!AI.ready||AI.limited()||!list.length,onclick:async e=>{const b=e.currentTarget;b.disabled=true;out.innerHTML='';out.append(el('p',{class:'small muted',text:'Наставник ищет закономерности… обычно до минуты'}));
      const r=await Mentor.explainMistakes();b.disabled=false;out.innerHTML='';
      if(!r.ok){out.append(el('p',{class:'small muted',text:AI.msg(r.err)}));return;}
      const d=r.data;out.append(d.summary?el('p',{text:d.summary}):null,el('div',{class:'stack',style:'gap:8px'},d.patterns.map(p=>el('div',{class:'flag'},el('b',{text:p.title}),el('span',{class:'small',text:p.why}),el('span',{class:'small'},el('b',{text:'Совет: '}),p.tip)))),d.recs.length?recButtons(d.recs):null,el('p',{class:'tiny faint',text:'Мнение ИИ на основе ваших ошибок в тренажёре. Может ошибаться.'}));}},'Найти закономерности')),
    el('p',{class:'small muted',text:AI.ready?'ИИ получит только список ваших ошибок в тренажёре — без личных данных.':'ИИ сейчас недоступен — выше разбор по данным тренажёра.'}),out));}
/* словарь */
const GL={q:''};
function renderGloss(){const box=$('#glList');box.innerHTML='';const inp=$('#glQ');if(inp.value.trim()!==GL.q)inp.value=GL.q;const q=GL.q.toLowerCase();
  const list=GLOSSARY.filter(g=>!q||(g.t+' '+g.d).toLowerCase().includes(q));
  if(!list.length){box.append(el('p',{class:'muted',text:'Такого термина нет. Спросите наставника — он объяснит.'}),el('button',{class:'btn sm',onclick:()=>{setMentorTab('ask');$('#askIn').value='Что такое '+GL.q+'?';}},'Спросить наставника'));return;}
  list.forEach(g=>box.append(el('details',{class:'gl',open:q&&list.length<=3?true:null},el('summary',{},g.t),el('p',{text:g.d}),g.s?srcLink(g.s):null,el('button',{class:'btn sm ghost',onclick:()=>{setMentorTab('ask');askSend('Объясните на примере: '+g.t);}},'Пример от наставника'))));}
$('#glQ').addEventListener('input',e=>{GL.q=e.target.value.trim();renderGloss();});
