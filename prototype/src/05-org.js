/* ===== ОРГАНИЗАЦИЯМ ===== */
const ORG={tab:'value',inited:{}};
ORG.render=function(){['value','dash','score','api','widget'].forEach(k=>$('#org-'+k).hidden=k!==ORG.tab);$$('#orgSeg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.o===ORG.tab)));if(!ORG.inited[ORG.tab]){ORG.inited[ORG.tab]=true;ORG['init_'+ORG.tab]();}else if(ORG['show_'+ORG.tab])ORG['show_'+ORG.tab]();};
$$('#orgSeg button').forEach(b=>b.onclick=()=>{ORG.tab=b.dataset.o;ORG.render();});
const fmtN=n=>Number(n).toLocaleString('ru-RU');
const vizTip=(()=>{let t=null;return{show(host,x,y,nodes){if(!t){t=el('div',{class:'viz-tip',role:'status'});}t.innerHTML='';nodes.forEach(n=>t.append(n));host.append(t);const hb=host.getBoundingClientRect(),tw=t.offsetWidth;let l=x+12;if(l+tw>hb.width-4)l=x-tw-12;t.style.left=Math.max(4,l)+'px';t.style.top=Math.max(4,y-10)+'px';},hide(){if(t&&t.isConnected)t.remove();}};})();
function tipRow(val,label,color){return el('div',{class:'tt-row'},color?el('i',{style:'background:'+color}):null,el('b',{text:val}),el('span',{text:label}));}

/* --- Ценность --- */
ORG.init_value=function(){
  const box=$('#org-value');
  box.append(el('div',{class:'g2'},
    el('div',{class:'card'},el('span',{class:'eyebrow',text:'Проблема'}),el('h2',{text:'Люди знают правила, но в момент звонка не справляются со стрессом'}),
      el('ul',{class:'clean'},
        el('li',{text:'Схемы меняются каждые несколько месяцев: осенью 2026 года — «замена счёта через финразведку» после звонка про домофон.'}),
        el('li',{text:'Мошенники работают сценариями и командами: «банк», «ЦБ», «силовик», рабочие чаты на десятки участников.'}),
        el('li',{text:'Молодёжь втягивают в дропперство: 52% заявлений об исключении из базы ЦБ подают люди до 25 лет.'})),srcLink('comnews_oct')),
    el('div',{class:'card'},el('span',{class:'eyebrow',text:'Решение'}),el('h2',{text:'Тренажёр реакции, а не ещё одна памятка'}),
      el('ul',{class:'clean'},
        el('li',{text:'Люди проходят тренировочные звонки и переписки с ИИ по свежим схемам и получают разбор.'}),
        el('li',{text:'Индекс иммунитета показывает прогресс человека и группы до и после обучения.'}),
        el('li',{text:'Организации получают обезличенную аналитику, объяснимые антифрод-модели, API и виджет.'})))));
  const A=[
    ['Банки и МФО',['Виджет «Проверить сообщение» и тренировочные звонки в приложении','Индекс клиента как признак в антифрод-модели «кредит под диктовку»','Сценарии для клиентов 60+ и «вторая рука» для их родных'],'Меньше операций под влиянием мошенников и возвратов по 161-ФЗ'],
    ['Школы, колледжи, вузы',['Курс по сценариям для 12–17 лет и студентов','Отчёт для учителя или куратора по группе','Профилактика дропперства и подготовка к олимпиадам по финансовой безопасности'],'Рост индекса группы и доля верных решений в тренировках'],
    ['Работодатели',['Тренировки «фальшивый руководитель» и «рабочий чат»','Правило двойного подтверждения платежей','Отчёт по подразделениям без персональных данных'],'Нет платежей по поддельным поручениям'],
    ['Регионы и ведомства',['Обезличенная карта уязвимостей по сценариям и аудиториям','Ранний сигнал: на какие новые схемы попадаются в первую неделю','Готовые материалы для информационных кампаний'],'Охват жителей и снижение доли «попавшихся» в тренировках']
  ];
  box.append(el('div',{class:'g2'},A.map(([t,li,m])=>el('div',{class:'card'},el('h3',{text:t}),el('ul',{class:'clean small'},li.map(x=>el('li',{text:x}))),el('p',{class:'small'},el('b',{text:'Метрика: '}),m)))));
  box.append(el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Пилот за 6 недель'}),el('span',{class:'tag acc',text:'например, Пермский край'})),
    el('ol',{class:'steps'},
      el('li',{},el('div',{},el('b',{text:'Недели 1–2. Сценарии под аудиторию и регион'}),el('span',{class:'small muted',text:'Подбираем схемы, на которые сейчас попадаются жители, и адаптируем тексты.'}))),
      el('li',{},el('div',{},el('b',{text:'Неделя 3. Запуск'}),el('span',{class:'small muted',text:'Виджет в приложении банка, ссылка для школ и вузов, QR-коды для МФЦ и поликлиник.'}))),
      el('li',{},el('div',{},el('b',{text:'Недели 3–6. Тренировки и замер'}),el('span',{class:'small muted',text:'Индекс до и после, доля верных решений, время до «положить трубку».'}))),
      el('li',{},el('div',{},el('b',{text:'Неделя 6. Отчёт'}),el('span',{class:'small muted',text:'Обезличенная карта уязвимостей и рекомендации для информационных кампаний.'}))))));
  box.append(el('div',{class:'card flat'},el('h3',{text:'Принципы'}),el('ul',{class:'clean small'},
    el('li',{text:'Тренажёр не запрашивает настоящие коды, номера карт и паспортные данные: всё в сценариях вымышлено.'}),
    el('li',{text:'Аналитика — только обезличенная и агрегированная, в соответствии со 152-ФЗ.'}),
    el('li',{text:'Модели скоринга не используют пол, возраст и национальность — только поведение и признаки операции.'}),
    el('li',{text:'Каждое решение модели объяснимо: видно, какой признак сколько добавил к риску. Решение по «красной» зоне принимает человек.'}))));
};

/* --- Аналитика (демо) --- */
const DEMO={
 perm:{n:'Пермский край, пилот',kpi:{users:12480,sessions:41960,idx:[41,68],hang:[23,61]},aud:{school:[38,71],student:[35,66],adult:[44,69],senior:[33,62]},
  sc:[['call','grandson','Пенсионеры',46,14],['chat','roblox','Школьники',52,12],['call','intercom','Все',44,11],['chat','gov_chat','Работающие',41,16],['call','bank_safe','Все',38,9],['chat','job_drop','Студенты',31,7]]},
 all:{n:'Все регионы',kpi:{users:86300,sessions:297400,idx:[43,67],hang:[25,58]},aud:{school:[40,70],student:[37,64],adult:[46,68],senior:[35,60]},
  sc:[['chat','roblox','Школьники',49,13],['call','grandson','Пенсионеры',43,15],['call','rosfin_fake','Все',40,12],['chat','gov_chat','Работающие',39,15],['call','bank_safe','Все',36,10],['chat','job_drop','Студенты',33,8]]}
};
const DASH={reg:'perm',table:false};
ORG.init_dash=function(){
  const box=$('#org-dash');
  const sel=el('select',{id:'dReg','aria-label':'Регион',style:'max-width:280px'},el('option',{value:'perm'},'Пермский край, пилот'),el('option',{value:'all'},'Все регионы'));
  sel.onchange=()=>{DASH.reg=sel.value;renderDash();};
  box.append(el('div',{class:'row'},sel,el('span',{class:'tag warn',text:'Демонстрационные данные'})));
  box.append(el('div',{id:'dBody',class:'stack',style:'gap:18px'}));
  renderDash();
};
ORG.show_dash=()=>drawDumbbell();
function renderDash(){
  const d=DEMO[DASH.reg],b=$('#dBody');b.innerHTML='';
  const k=d.kpi;
  b.append(el('div',{class:'kpis'},
    el('div',{class:'kpi'},el('span',{text:'Участники'}),el('b',{text:fmtN(k.users)}),el('span',{text:'прошли хотя бы одну тренировку'})),
    el('div',{class:'kpi'},el('span',{text:'Тренировки'}),el('b',{text:fmtN(k.sessions)}),el('span',{text:'звонки, переписки, игры'})),
    el('div',{class:'kpi'},el('span',{text:'Индекс иммунитета'}),el('b',{text:k.idx[0]+' → '+k.idx[1]}),el('span',{text:'до курса → после 3 тренировок'})),
    el('div',{class:'kpi'},el('span',{text:'Завершили разговор вовремя'}),el('b',{text:k.hang[0]+'% → '+k.hang[1]+'%'}),el('span',{text:'вышли до первой просьбы о коде'}))));
  const chart=el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Индекс по аудиториям: до и после курса'}),el('button',{class:'btn sm ghost',onclick:()=>{DASH.table=!DASH.table;renderDash();}},DASH.table?'Скрыть таблицу':'Таблица')),
    el('div',{class:'legend'},el('span',{},el('i',{style:'background:var(--viz-before)'}),'До курса'),el('span',{},el('i',{style:'background:var(--viz-after)'}),'После 3 тренировок')),
    el('div',{class:'viz',id:'dumb'}));
  if(DASH.table)chart.append(el('div',{class:'tbl'},el('table',{},el('thead',{},el('tr',{},el('th',{text:'Аудитория'}),el('th',{class:'num',text:'До'}),el('th',{class:'num',text:'После'}),el('th',{class:'num',text:'Рост'}))),el('tbody',{},Object.entries(d.aud).map(([a,[x,y]])=>el('tr',{},el('td',{text:AUDS[a].t}),el('td',{class:'num',text:String(x)}),el('td',{class:'num',text:String(y)}),el('td',{class:'num',text:'+'+(y-x)})))))));
  b.append(chart);
  const tb=el('tbody');
  d.sc.forEach(([m,id,who,x,y])=>{const sc=(m==='call'?CALLS:CHATS).find(s=>s.id===id);
    const bar=(v,c)=>el('div',{class:'mbar'},el('div',{class:'trk'},el('i',{style:'width:'+v+'%;background:'+c})),el('span',{class:'mono',text:v+'%'}));
    tb.append(el('tr',{},el('td',{},el('b',{class:'small',text:sc?sc.t:id}),el('div',{class:'tiny muted',text:m==='call'?'звонок':'переписка'})),el('td',{class:'small',text:who}),el('td',{},bar(x,'var(--viz-before)')),el('td',{},bar(y,'var(--viz-after)')),el('td',{class:'num',text:'−'+(x-y)+' п. п.'})));});
  b.append(el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Где попадаются чаще всего'}),el('span',{class:'small muted',text:'доля тренировок, где человек отдал код, деньги или данные'})),
    el('div',{class:'tbl'},el('table',{},el('thead',{},el('tr',{},el('th',{text:'Сценарий'}),el('th',{text:'Кто чаще'}),el('th',{text:'До курса'}),el('th',{text:'После'}),el('th',{class:'num',text:'Изменение'}))),tb))));
  const top=d.sc.slice().sort((a,b)=>b[3]-a[3]);
  const sn=id=>{const s=CALLS.concat(CHATS).find(x=>x.id===id);return s?s.t:id;};
  b.append(el('div',{class:'card flat'},el('h3',{text:'Что видно в данных'}),el('ul',{class:'clean small'},
    el('li',{text:'Больше всего ошибок до курса — в сценарии '+sn(top[0][1])+': '+top[0][3]+'%. Чаще всего попадаются: '+top[0][2].toLowerCase()+'.'}),
    el('li',{text:'Сильнее всех вырос индекс у аудитории «'+AUDS[Object.entries(d.aud).sort((a,b)=>(b[1][1]-b[1][0])-(a[1][1]-a[1][0]))[0][0]].t+'».'}),
    el('li',{text:'Новые схемы осени 2026 («домофон» → «финразведка») распознают хуже знакомых: им стоит посвятить отдельную кампанию.'})),
    el('p',{class:'tiny faint',text:'Демонстрационные данные для презентации. В пилоте — только обезличенная агрегированная статистика.'})));
  requestAnimationFrame(drawDumbbell);
}
function drawDumbbell(){
  const host=$('#dumb');if(!host||!host.isConnected||host.offsetParent===null)return;
  const d=DEMO[DASH.reg].aud,W=Math.max(280,host.clientWidth),rowH=46,top=8,L=W<480?96:140,R=40,H=top+rowH*4+28,x=v=>L+(W-L-R)*v/100;
  const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Индекс иммунитета до и после курса: '+Object.entries(d).map(([a,[p,q]])=>AUDS[a].t+' '+p+' → '+q).join(', '));
  const mk=(t,at,txt)=>{const e=document.createElementNS(NS,t);for(const k in at)e.setAttribute(k,at[k]);if(txt!=null)e.textContent=txt;svg.append(e);return e;};
  [0,25,50,75,100].forEach(v=>{mk('line',{x1:x(v),x2:x(v),y1:top,y2:top+rowH*4,style:'stroke:var(--line);stroke-width:1'});mk('text',{x:x(v),y:H-8,'text-anchor':'middle',style:'fill:var(--faint);font:400 11px var(--m)'},String(v));});
  Object.entries(d).forEach(([a,[p,q]],i)=>{
    const cy=top+rowH*i+rowH/2;
    mk('text',{x:0,y:cy+4,style:'fill:var(--ink);font:500 13px var(--f)'},AUDS[a].t);
    mk('line',{x1:x(p),x2:x(q),y1:cy,y2:cy,style:'stroke:var(--line-2);stroke-width:2;stroke-linecap:round'});
    mk('circle',{cx:x(p),cy,r:5,style:'fill:var(--viz-before);stroke:var(--surface);stroke-width:2'});
    mk('circle',{cx:x(q),cy,r:6,style:'fill:var(--viz-after);stroke:var(--surface);stroke-width:2'});
    mk('text',{x:x(p)-10,y:cy+4,'text-anchor':'end',style:'fill:var(--muted);font:400 12px var(--m)'},String(p));
    mk('text',{x:x(q)+11,y:cy+4,style:'fill:var(--ink);font:600 12px var(--m)'},String(q));
    const hit=mk('rect',{x:0,y:cy-rowH/2,width:W,height:rowH,style:'fill:transparent;cursor:default',tabindex:'0','aria-label':AUDS[a].t+': '+p+' до курса, '+q+' после'});
    const show=ev=>{const r=host.getBoundingClientRect(),px=ev&&ev.clientX?ev.clientX-r.left:x(q),py=cy;vizTip.show(host,px,py,[el('div',{class:'tt-h',text:AUDS[a].t}),tipRow(String(q),'после 3 тренировок','var(--viz-after)'),tipRow(String(p),'до курса','var(--viz-before)'),el('div',{class:'tt-f',text:'Рост: +'+(q-p)})]);};
    hit.addEventListener('pointermove',show);hit.addEventListener('focus',()=>show());hit.addEventListener('pointerleave',vizTip.hide);hit.addEventListener('blur',vizTip.hide);
  });
  host.innerHTML='';host.append(svg);
}

/* --- Скоринг --- */
const MODELS={
 loan:{t:'Кредит под диктовку',s:'Банки и МФО: заявка на кредит, которую клиент оформляет по указке мошенников',bias:-3.4,prev:.06,
  feats:[
   {id:'call',l:'Во время заявки клиент говорит по телефону',t:'bool',w:1.6,p:[.12,.6]},
   {id:'remote',l:'Активно приложение удалённого доступа',t:'bool',w:1.8,p:[.02,.25]},
   {id:'newdev',l:'Вход с нового устройства меньше суток назад',t:'bool',w:.9,p:[.1,.45]},
   {id:'creds',l:'Недавно сменены пароль или номер телефона',t:'bool',w:1.2,p:[.05,.3]},
   {id:'selfban',l:'Самозапрет на кредиты снят меньше 7 дней назад',t:'bool',w:1.5,p:[.01,.12]},
   {id:'amount',l:'Сумма кредита к месячному доходу',t:'range',min:.2,max:8,step:.1,w:.3,base:1,mode:'over',u:'×',m:[1.4,3.2],sd:[1,1.8]},
   {id:'night',l:'Заявка ночью, с 00:00 до 06:00',t:'bool',w:.5,p:[.08,.25]},
   {id:'payout',l:'Деньги сразу уходят на чужую карту или в криптовалюту',t:'bool',w:1.4,p:[.06,.45]},
   {id:'recipdb',l:'Получатель есть в базе ЦБ о мошеннических операциях',t:'bool',w:2.2,p:[.005,.15]},
   {id:'imm',l:'Индекс «Иммунитета» клиента',t:'range',min:0,max:100,step:1,w:-.025,base:50,mode:'lin',u:'',m:[55,40],sd:[20,18]}],
  presets:{'Типичная социнженерия':{call:1,remote:1,newdev:1,creds:0,selfban:1,amount:4.5,night:0,payout:1,recipdb:0,imm:30},'Обычная заявка':{call:0,remote:0,newdev:0,creds:0,selfban:0,amount:1.2,night:0,payout:0,recipdb:0,imm:65}},
  acts:{green:'Выдать в обычном порядке.',yellow:'Выдержать период охлаждения, позвонить клиенту с контрольными вопросами, предложить подключить «вторую руку».',red:'Приостановить выдачу, связаться с клиентом и доверенным лицом, проверить признаки социальной инженерии.'}},
 drop:{t:'Дроп-счёт',s:'Банки: карта или счёт, через которые прогоняют украденные деньги',bias:-4.6,prev:.04,
  feats:[
   {id:'incount',l:'Входящих переводов от разных людей за сутки',t:'range',min:0,max:60,step:1,w:.07,base:0,mode:'over',u:'',m:[2,18],sd:[2.5,11]},
   {id:'outfast',l:'Доля денег, ушедших дальше в течение часа',t:'range',min:0,max:100,step:1,w:.03,base:0,mode:'over',u:'%',m:[14,70],sd:[14,22]},
   {id:'cardage',l:'Возраст карты',t:'sel',opts:[['Меньше 30 дней',1.4],['30–90 дней',.7],['Больше 90 дней',0]],pr:[[.06,.12,.82],[.4,.3,.3]]},
   {id:'crypto',l:'Покупка криптовалюты на P2P сразу после поступлений',t:'bool',w:.9,p:[.04,.4]},
   {id:'cash',l:'Снятие наличных сразу после поступлений',t:'bool',w:.8,p:[.07,.42]},
   {id:'multidev',l:'Вход в банк с трёх и более устройств',t:'bool',w:1,p:[.05,.42]},
   {id:'purpose',l:'Однотипные назначения платежей: «долг», «подарок»',t:'bool',w:.7,p:[.07,.45]},
   {id:'indb',l:'Счёт уже есть в базе ЦБ',t:'bool',w:2.5,p:[.003,.14]}],
  presets:{'Похоже на дроп':{incount:28,outfast:90,cardage:0,crypto:1,cash:0,multidev:1,purpose:1,indb:0},'Обычный клиент':{incount:1,outfast:5,cardage:2,crypto:0,cash:0,multidev:0,purpose:0,indb:0}},
  acts:{green:'Без ограничений.',yellow:'Запросить пояснения об источнике поступлений, ограничить дистанционное обслуживание до выяснения.',red:'Приостановить операции, запросить документы по 115-ФЗ, направить сведения в Росфинмониторинг.'}},
 sme:{t:'МСП-контрагент',s:'Лизинг, МФО, поставщики: проверка компании-заёмщика или контрагента',bias:-3.8,prev:.08,
  feats:[
   {id:'age',l:'Возраст компании, месяцев',t:'range',min:0,max:120,step:1,mode:'step',steps:[[6,1.3],[12,.6]],u:'',m:[60,9],sd:[32,7]},
   {id:'massaddr',l:'Адрес массовой регистрации',t:'bool',w:.9,p:[.05,.38]},
   {id:'dirmany',l:'Директор руководит пятью и более компаниями',t:'bool',w:1,p:[.04,.35]},
   {id:'taxlow',l:'Налоговая нагрузка ниже среднеотраслевой',t:'bool',w:.8,p:[.22,.65]},
   {id:'jump',l:'Рост оборотов за квартал',t:'range',min:1,max:10,step:.1,w:.12,base:1,mode:'over',u:'×',m:[1.3,4],sd:[.5,2.2]},
   {id:'transit',l:'Транзитные операции, доля оборота',t:'range',min:0,max:100,step:1,w:.025,base:0,mode:'over',u:'%',m:[10,55],sd:[10,22]},
   {id:'zsk',l:'Уровень риска на платформе «Знай своего клиента»',t:'sel',opts:[['Низкий',0],['Средний',1.2],['Высокий',3]],pr:[[.9,.09,.01],[.4,.38,.22]]},
   {id:'shared',l:'Общие IP-адреса или телефоны с другими заявителями',t:'bool',w:1.1,p:[.04,.4]}],
  presets:{'Похоже на однодневку':{age:4,massaddr:1,dirmany:1,taxlow:1,jump:6,transit:70,zsk:1,shared:1},'Устойчивый бизнес':{age:64,massaddr:0,dirmany:0,taxlow:0,jump:1.2,transit:8,zsk:0,shared:0}},
  acts:{green:'Стандартная проверка.',yellow:'Углублённая проверка: документы, бенефициары, выезд на место.',red:'Отказ или стоп-фактор, проверка связанных заявок, сообщение по 115-ФЗ.'}}
};
const SC={m:'loan',vals:{},th:{y:30,r:70},data:{}};
function contrib(f,v){if(f.t==='bool')return v?f.w:0;if(f.t==='sel')return f.opts[v][1];if(f.mode==='over')return f.w*Math.max(0,v-f.base);if(f.mode==='lin')return f.w*(v-f.base);if(f.mode==='step'){for(const[lim,w]of f.steps)if(v<lim)return w;return 0;}return 0;}
function scoreOf(M,vals){let z=M.bias;const cs=M.feats.map(f=>{const c=contrib(f,vals[f.id]);z+=c;return{f,c};});const p=1/(1+Math.exp(-z));return{z,p,s:Math.round(p*100),cs};}
const bandOf=s=>s>=SC.th.r?'red':s>=SC.th.y?'yellow':'green';
const BAND={green:{t:'Зелёная зона',k:'ok',i:'✓'},yellow:{t:'Жёлтая зона',k:'warn',i:'!'},red:{t:'Красная зона',k:'bad',i:'✕'}};
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function synth(key){
  if(SC.data[key])return SC.data[key];
  const M=MODELS[key],r=rng(1000+key.length*97),rows=[];
  for(let i=0;i<3000;i++){const y=r()<M.prev?1:0,vals={};
    // часть мошенничества выглядит как обычные заявки, часть честных — подозрительно: так метрики ближе к реальности
    const L=y?(r()<.22?0:1):(r()<.03?1:0);
    M.feats.forEach(f=>{if(f.t==='bool')vals[f.id]=r()<f.p[L]?1:0;else if(f.t==='sel'){const pr=f.pr[L];let u=r(),k=0;while(k<pr.length-1&&u>pr[k]){u-=pr[k];k++;}vals[f.id]=k;}else{let v=f.m[L]+gauss(r)*f.sd[L];v=Math.max(f.min,Math.min(f.max,v));vals[f.id]=f.step>=1?Math.round(v):Math.round(v*10)/10;}});
    rows.push({y,s:scoreOf(M,vals).s});}
  const P=rows.filter(x=>x.y).length,N=rows.length-P,pts=[];
  for(let t=101;t>=0;t--){let tp=0,fp=0;rows.forEach(x=>{if(x.s>=t){if(x.y)tp++;else fp++;}});pts.push({t,tp,fp,tpr:tp/P,fpr:fp/N});}
  let auc=0;for(let i=1;i<pts.length;i++)auc+=(pts[i].fpr-pts[i-1].fpr)*(pts[i].tpr+pts[i-1].tpr)/2;
  return SC.data[key]={rows,P,N,pts,auc};
}
function setModel(k){SC.m=k;const M=MODELS[k];SC.vals={};M.feats.forEach(f=>SC.vals[f.id]=Object.values(M.presets)[0][f.id]);renderScore();}
ORG.init_score=function(){
  const box=$('#org-score');
  box.append(el('div',{class:'card flat'},el('p',{class:'small'},el('b',{text:'Объяснимые антифрод-модели. '}),'Логистическая модель: каждый признак добавляет понятный вклад в риск, итог переводится в шкалу 0–100 и зоны, как на платформе ЦБ «Знай своего клиента». Веса и выборка — демонстрационные; в пилоте модель обучается на данных организации. Модель «МСП-контрагент» — основа отдельного продукта для региональных МФО и лизинга (пилот: Пермский край).')));
  box.append(el('div',{class:'models',id:'mPick'}),el('div',{class:'split',id:'mMain'}),el('div',{class:'card',id:'mCal'}),el('div',{class:'card',id:'mExp'}));
  setModel('loan');
};
ORG.show_score=()=>drawROC();
function renderScore(){
  const M=MODELS[SC.m],pick=$('#mPick');pick.innerHTML='';
  Object.entries(MODELS).forEach(([k,m])=>pick.append(el('button',{class:'model','aria-pressed':String(SC.m===k),onclick:()=>setModel(k)},el('b',{text:m.t}),el('span',{text:m.s}))));
  const main=$('#mMain');main.innerHTML='';
  const fc=el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Признаки заявки'}),el('div',{class:'row'},Object.entries(M.presets).map(([n,v])=>el('button',{class:'btn sm',onclick:()=>{SC.vals=Object.assign({},v);renderScore();}},n)))));
  const list=el('div');
  M.feats.forEach(f=>{
    const val=SC.vals[f.id],out=el('span',{class:'fv',text:fmtF(f,val)});
    let ctl;
    if(f.t==='bool'){ctl=el('button',{class:'sw',role:'switch','aria-checked':String(!!val),'aria-label':f.l,onclick:()=>{SC.vals[f.id]=val?0:1;renderScore();}});list.append(el('div',{class:'feat'},el('span',{class:'fl',text:f.l}),ctl));return;}
    if(f.t==='sel'){ctl=el('select',{'aria-label':f.l,onchange:e=>{SC.vals[f.id]=+e.target.value;updScore();}},f.opts.map((o,i)=>el('option',{value:i,selected:i===val},o[0])));list.append(el('div',{class:'feat'},el('span',{class:'fl',text:f.l}),el('span'),ctl));return;}
    ctl=el('input',{type:'range',min:f.min,max:f.max,step:f.step,value:val,'aria-label':f.l,oninput:e=>{SC.vals[f.id]=+e.target.value;out.textContent=fmtF(f,+e.target.value);updScore();}});
    list.append(el('div',{class:'feat'},el('span',{class:'fl',text:f.l}),out,ctl));
  });
  fc.append(list);
  main.append(fc,el('div',{class:'stack',id:'mRes',style:'gap:16px'}));
  updScore();renderCal();renderExport();
}
function fmtF(f,v){if(f.t==='bool')return v?'да':'нет';if(f.t==='sel')return f.opts[v][0];return(f.step<1?(+v).toFixed(1):String(v))+(f.u||'');}
function updScore(){
  const M=MODELS[SC.m],r=scoreOf(M,SC.vals),b=bandOf(r.s),B=BAND[b],box=$('#mRes');box.innerHTML='';
  const track=el('div',{class:'gwrap','aria-hidden':'true'},el('div',{class:'gtrack'},el('span',{style:'flex:'+SC.th.y+' 0 0;background:var(--ok)'}),el('span',{style:'flex:'+(SC.th.r-SC.th.y)+' 0 0;background:var(--warn)'}),el('span',{style:'flex:'+(100-SC.th.r)+' 0 0;background:var(--bad)'})),el('div',{class:'gpin',style:'left:'+r.s+'%'}));
  box.append(el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Оценка риска'}),el('span',{class:'tag '+B.k,text:B.i+' '+B.t})),
    el('div',{class:'gauge'},el('div',{class:'big'},el('b',{text:String(r.s)}),el('span',{class:'muted',text:'из 100 · вероятность '+(r.p*100).toFixed(1).replace('.',',')+'%'})),track,
      el('div',{class:'row tiny muted',style:'justify-content:space-between'},el('span',{text:'0'}),el('span',{text:'жёлтая от '+SC.th.y}),el('span',{text:'красная от '+SC.th.r}),el('span',{text:'100'}))),
    el('div',{class:'verdict '+B.k},el('b',{text:'Рекомендуемое действие'}),el('span',{text:M.acts[b]}))));
  const cs=r.cs.filter(x=>Math.abs(x.c)>1e-9).sort((a,b)=>Math.abs(b.c)-Math.abs(a.c)),mx=Math.max(.5,...cs.map(x=>Math.abs(x.c)));
  const cc=el('div',{class:'card'},el('div',{class:'ph'},el('h3',{text:'Почему такая оценка'}),el('button',{class:'q','aria-label':'Как читать вклад признаков',onclick:()=>tip('Вклад признаков','Модель складывает вклады признаков со смещением '+String(M.bias).replace('.',',')+' и переводит сумму в вероятность. Красные полосы повышают риск, синие снижают. Длина полосы — сила влияния. Так сотрудник видит, на что смотреть при проверке.')},'?')),
    el('div',{class:'legend'},el('span',{},el('i',{class:'rect',style:'background:var(--viz-up)'}),'Повышает риск'),el('span',{},el('i',{class:'rect',style:'background:var(--viz-down)'}),'Снижает риск')));
  const list=el('div',{class:'contrib'});
  if(!cs.length)list.append(el('p',{class:'small muted',text:'Ни один признак не повышает риск.'}));
  cs.forEach(x=>{const w=Math.abs(x.c)/mx*50,pos=x.c>0;list.append(el('div',{class:'cb',title:x.f.l+': '+(pos?'+':'−')+Math.abs(x.c).toFixed(2)},el('span',{text:x.f.l}),el('div',{class:'trk'},el('b',{class:'mid'}),el('i',{style:(pos?'left:50%;border-radius:0 4px 4px 0;':'left:'+(50-w)+'%;border-radius:4px 0 0 4px;')+'width:'+w+'%;background:var(--viz-'+(pos?'up':'down')+')'})),el('span',{class:'n',text:(pos?'+':'−')+Math.abs(x.c).toFixed(2).replace('.',',')})));});
  cc.append(list,el('p',{class:'tiny faint',text:'Пол, возраст и национальность в модели не используются.'}));
  box.append(cc);
}
function renderCal(){
  const c=$('#mCal'),D=synth(SC.m);c.innerHTML='';
  const yS=el('input',{type:'range',min:5,max:90,step:1,value:SC.th.y,'aria-label':'Порог жёлтой зоны'}),rS=el('input',{type:'range',min:10,max:99,step:1,value:SC.th.r,'aria-label':'Порог красной зоны'});
  const yV=el('span',{class:'mono',text:String(SC.th.y)}),rV=el('span',{class:'mono',text:String(SC.th.r)});
  const onT=()=>{let y=+yS.value,r=+rS.value;if(y>=r){if(document.activeElement===yS)r=Math.min(99,y+1);else y=Math.max(5,r-1);}SC.th={y,r};yS.value=y;rS.value=r;yV.textContent=y;rV.textContent=r;updScore();drawROC();renderMetrics();renderExport();};
  yS.oninput=onT;rS.oninput=onT;
  c.append(el('div',{class:'ph'},el('h2',{text:'Калибровка порогов'}),el('span',{class:'small muted',text:'синтетическая выборка: '+fmtN(D.rows.length)+' заявок, мошеннических '+(D.P/D.rows.length*100).toFixed(1).replace('.',',')+'%'})));
  c.append(el('div',{class:'g2'},
    el('div',{class:'stack'},
      el('label',{},el('span',{class:'row',style:'justify-content:space-between'},'Жёлтая зона — с балла',yV),yS),
      el('label',{},el('span',{class:'row',style:'justify-content:space-between'},'Красная зона — с балла',rV),rS),
      el('div',{id:'mMet',class:'stack'})),
    el('div',{class:'stack'},el('div',{class:'ph'},el('h3',{text:'ROC-кривая'}),el('span',{class:'mono small',id:'aucV'})),el('div',{class:'viz',id:'roc'}),el('p',{class:'tiny faint',text:'По горизонтали — доля честных заявок, попавших в красную зону, по вертикали — доля пойманных мошеннических. Точка — текущий порог.'}))));
  renderMetrics();requestAnimationFrame(drawROC);
}
function renderMetrics(){
  const D=synth(SC.m),T=SC.th.r,box=$('#mMet');if(!box)return;
  let tp=0,fp=0,rev=0;D.rows.forEach(x=>{if(x.s>=T){x.y?tp++:fp++;}if(x.s>=SC.th.y)rev++;});
  const fn=D.P-tp,tn=D.N-fp,prec=tp+fp?tp/(tp+fp):0,rec=tp/D.P,pct=v=>(v*100).toFixed(1).replace('.',',')+'%';
  box.innerHTML='';
  box.append(el('div',{class:'kpis',style:'grid-template-columns:repeat(2,minmax(0,1fr))'},
    el('div',{class:'kpi'},el('span',{text:'Поймано мошеннических'}),el('b',{text:pct(rec)}),el('span',{text:tp+' из '+D.P})),
    el('div',{class:'kpi'},el('span',{text:'Точность красной зоны'}),el('b',{text:pct(prec)}),el('span',{text:'доля реального мошенничества'})),
    el('div',{class:'kpi'},el('span',{text:'Ложные тревоги'}),el('b',{text:pct(fp/D.N)}),el('span',{text:fp+' честных заявок'})),
    el('div',{class:'kpi'},el('span',{text:'На ручную проверку'}),el('b',{text:pct(rev/D.rows.length)}),el('span',{text:'жёлтая и красная зоны'}))));
  box.append(el('div',{class:'tbl'},el('table',{style:'min-width:0'},el('thead',{},el('tr',{},el('th',{text:'Матрица ошибок'}),el('th',{class:'num',text:'Мошенничество'}),el('th',{class:'num',text:'Честные'}))),el('tbody',{},el('tr',{},el('td',{text:'Красная зона'}),el('td',{class:'num',text:fmtN(tp)}),el('td',{class:'num',text:fmtN(fp)})),el('tr',{},el('td',{text:'Ниже порога'}),el('td',{class:'num',text:fmtN(fn)}),el('td',{class:'num',text:fmtN(tn)}))))));
}
function drawROC(){
  const host=$('#roc');if(!host||!host.isConnected||host.offsetParent===null)return;
  const D=synth(SC.m),W=Math.min(360,Math.max(240,host.clientWidth)),H=W,p=34,iw=W-p-10,ih=H-p-10,X=v=>p+iw*v,Y=v=>10+ih*(1-v);
  $('#aucV').textContent='AUC '+D.auc.toFixed(3).replace('.',',');
  const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('role','img');svg.setAttribute('aria-label','ROC-кривая модели, AUC '+D.auc.toFixed(2));
  const mk=(t,at,txt)=>{const e=document.createElementNS(NS,t);for(const k in at)e.setAttribute(k,at[k]);if(txt!=null)e.textContent=txt;svg.append(e);return e;};
  [0,.5,1].forEach(v=>{mk('line',{x1:X(0),x2:X(1),y1:Y(v),y2:Y(v),style:'stroke:var(--line);stroke-width:1'});mk('line',{x1:X(v),x2:X(v),y1:Y(0),y2:Y(1),style:'stroke:var(--line);stroke-width:1'});mk('text',{x:X(v),y:H-14+12,'text-anchor':'middle',style:'fill:var(--faint);font:400 10px var(--m)'},v*100+'%');mk('text',{x:p-6,y:Y(v)+3,'text-anchor':'end',style:'fill:var(--faint);font:400 10px var(--m)'},v*100+'%');});
  mk('line',{x1:X(0),y1:Y(0),x2:X(1),y2:Y(1),style:'stroke:var(--line-2);stroke-width:1'});
  const d=D.pts.map((q,i)=>(i?'L':'M')+X(q.fpr).toFixed(1)+' '+Y(q.tpr).toFixed(1)).join(' ');
  mk('path',{d,style:'fill:none;stroke:var(--viz-roc);stroke-width:2;stroke-linejoin:round;stroke-linecap:round'});
  const cur=D.pts.find(q=>q.t===SC.th.r);
  if(cur)mk('circle',{cx:X(cur.fpr),cy:Y(cur.tpr),r:5,style:'fill:var(--viz-roc);stroke:var(--surface);stroke-width:2'});
  const cross=mk('line',{x1:0,x2:0,y1:Y(0),y2:Y(1),style:'stroke:var(--muted);stroke-width:1;opacity:0'});
  const hit=mk('rect',{x:X(0),y:Y(1),width:iw,height:ih,style:'fill:transparent'});
  hit.addEventListener('pointermove',ev=>{const r=svg.getBoundingClientRect(),fx=(ev.clientX-r.left)*(W/r.width),v=Math.max(0,Math.min(1,(fx-p)/iw));let best=D.pts[0];D.pts.forEach(q=>{if(Math.abs(q.fpr-v)<Math.abs(best.fpr-v))best=q;});cross.setAttribute('x1',X(best.fpr));cross.setAttribute('x2',X(best.fpr));cross.style.opacity=1;
    vizTip.show(host,X(best.fpr)*(r.width/W),Y(best.tpr)*(r.height/H),[el('div',{class:'tt-h',text:'Порог '+Math.min(100,best.t)}),tipRow((best.tpr*100).toFixed(0)+'%','поймано мошеннических','var(--viz-roc)'),tipRow((best.fpr*100).toFixed(1).replace('.',',')+'%','ложных тревог')]);});
  hit.addEventListener('pointerleave',()=>{cross.style.opacity=0;vizTip.hide();});
  host.innerHTML='';host.append(svg);
}
function cfgJSON(){
  const M=MODELS[SC.m],D=synth(SC.m),T=SC.th.r;let tp=0,fp=0;D.rows.forEach(x=>{if(x.s>=T){x.y?tp++:fp++;}});
  return {model:{loan:'loan_social_engineering',drop:'drop_account',sme:'sme_counterparty'}[SC.m],title:M.t,version:'0.1-demo',type:'logistic',bias:M.bias,
    features:M.feats.map(f=>f.t==='bool'?{id:f.id,label:f.l,type:'bool',weight:f.w}:f.t==='sel'?{id:f.id,label:f.l,type:'select',options:f.opts.map(o=>({label:o[0],weight:o[1]}))}:f.mode==='step'?{id:f.id,label:f.l,type:'range',mode:'step',steps:f.steps.map(s=>({below:s[0],weight:s[1]}))}:{id:f.id,label:f.l,type:'range',mode:f.mode,base:f.base,weight:f.w}),
    bands:{green:[0,SC.th.y],yellow:[SC.th.y,SC.th.r],red:[SC.th.r,100]},actions:M.acts,
    calibration:{sample:'synthetic',n:D.rows.length,auc:+D.auc.toFixed(3),red_threshold:T,recall:+(tp/D.P).toFixed(3),precision:+(tp+fp?tp/(tp+fp):0).toFixed(3)},
    excluded_attributes:['пол','возраст','национальность']};
}
function renderExport(){
  const c=$('#mExp');if(!c)return;c.innerHTML='';const txt=JSON.stringify(cfgJSON(),null,2),pre=el('pre',{class:'code',text:txt});
  c.append(el('div',{class:'ph'},el('h2',{text:'Конфигурация для вашей системы'}),el('button',{class:'btn sm',onclick:()=>copyText(txt,pre)},'Скопировать JSON')),el('p',{class:'small muted',text:'Модель, пороги и действия по зонам в одном файле: его можно загрузить в антифрод-систему или передать разработчикам.'}),pre);
}
function copyText(txt,pre){const done=()=>toast('Скопировано');const manual=()=>{try{const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}toast('Выделено — нажмите Ctrl+C или «Копировать»');};try{navigator.clipboard.writeText(txt).then(done,manual);}catch(e){manual();}}

/* --- API --- */
const API={kind:'check',ai:false};
const API_EX={
 check:{path:'/v1/check',body:{text:'Здравствуйте! Служба безопасности банка. С вашей карты пытаются перевести 48 700 ₽. Продиктуйте код из СМС для отмены и никому не сообщайте о звонке.',channel:'call',audience:'senior'}},
 score:{path:'/v1/score',body:{model:'loan',features:{call:1,remote:1,newdev:1,creds:0,selfban:1,amount:4.5,night:0,payout:1,recipdb:0,imm:30}}}
};
ORG.init_api=function(){
  const box=$('#org-api');
  const ta=el('textarea',{id:'apiBody',rows:'11',class:'mono',style:'font-size:.82rem','aria-label':'Тело запроса'});
  const ep=el('div',{class:'mono small',id:'apiEp'});
  const aiSw=el('button',{class:'sw',role:'switch','aria-checked':'false','aria-label':'Добавить разбор ИИ',onclick:()=>{API.ai=!API.ai;aiSw.setAttribute('aria-checked',String(API.ai));}});
  const out=el('pre',{class:'code',id:'apiOut',text:'// Нажмите «Отправить запрос»'});
  const setKind=k=>{API.kind=k;ta.value=JSON.stringify(API_EX[k].body,null,2);ep.textContent='POST https://api.immunitet.example'+API_EX[k].path;$$('#apiKinds button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));};
  box.append(el('div',{class:'split'},
    el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Запрос'}),el('div',{class:'seg',id:'apiKinds'},el('button',{'data-k':'check','aria-pressed':'true',onclick:()=>setKind('check')},'Проверка сообщения'),el('button',{'data-k':'score','aria-pressed':'false',onclick:()=>setKind('score')},'Скоринг заявки'))),
      ep,ta,el('div',{class:'row',style:'justify-content:space-between'},el('button',{class:'btn primary',onclick:sendApi},'Отправить запрос'),el('span',{class:'row small muted'},aiSw,'Добавить разбор ИИ'))),
    el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:'Ответ'}),el('span',{class:'mono small muted',id:'apiMs'})),out)));
  box.append(el('div',{class:'card'},el('h2',{text:'Методы'}),el('div',{class:'tbl'},el('table',{},el('thead',{},el('tr',{},el('th',{text:'Метод'}),el('th',{text:'Что делает'}))),el('tbody',{},
    [['POST /v1/check','Оценивает сообщение, переписку или расшифровку звонка: риск 0–100, признаки, советы и подходящая тренировка'],['POST /v1/score','Считает антифрод-модель по признакам заявки и объясняет вклад каждого признака'],['GET /v1/schemes','Актуальные схемы с источниками — для рассылок и обучения'],['POST /v1/training/session','Ссылка на тренировку под аудиторию и сценарий — для клиента или сотрудника'],['GET /v1/stats','Обезличенная статистика по вашей аудитории: индекс, доля ошибок по сценариям']].map(([m,d])=>el('tr',{},el('td',{class:'mono small',text:m}),el('td',{class:'small',text:d})))))),
    el('pre',{class:'code',text:"curl -X POST https://api.immunitet.example/v1/check \\\n  -H 'Authorization: Bearer <ключ>' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"text\":\"Продиктуйте код из СМС\",\"channel\":\"call\"}'"}),
    el('p',{class:'tiny faint',text:'Макет интерфейса. Домен immunitet.example зарезервирован для примеров и не работает; ответы считает эта страница.'})));
  setKind('check');
};
async function sendApi(){
  const out=$('#apiOut'),t0=performance.now();let body;
  try{body=JSON.parse($('#apiBody').value);}catch(e){out.textContent=JSON.stringify({error:'bad_json',message:'Тело запроса — некорректный JSON'},null,2);return;}
  let res;
  if(API.kind==='score'){
    const key=body.model,M=MODELS[key];
    if(!M){res={error:'unknown_model',models:Object.keys(MODELS)};}
    else{const vals={};M.feats.forEach(f=>{const v=body.features&&body.features[f.id];vals[f.id]=v==null?(f.t==='range'?(f.base!=null?f.base:f.min):f.t==='sel'?Math.max(0,f.opts.findIndex(o=>o[1]===0)):0):+v;});
      const r=scoreOf(M,vals),b=bandOf(r.s);
      res={model:key,score:r.s,probability:+r.p.toFixed(4),band:b,action:M.acts[b],top_factors:r.cs.filter(x=>x.c).sort((a,b)=>Math.abs(b.c)-Math.abs(a.c)).slice(0,3).map(x=>({id:x.f.id,label:x.f.l,contribution:+x.c.toFixed(2)})),engine:'logistic-0.1-demo'};}
  }else{
    const text=String(body.text||'');
    if(!text.trim()){res={error:'empty_text'};}
    else{const r=localCheck(text),[k]=levelOf(r.score),top=r.hits.slice().sort((a,b)=>b.f.w-a.f.w),tr=(top.find(h=>h.f.tr)||{f:{}}).f.tr;
      res={risk:r.score,level:{bad:'high',warn:'medium',ok:'low'}[k],flags:r.hits.map(h=>({id:h.f.id,title:h.f.t,match:h.ms[0][0]})),advice:top.slice(0,3).map(h=>h.f.why),training:tr?{scenario:tr[1],url:'https://immunitet.example/t/'+tr[1]}:null,engine:'rules-v1'};
      if(API.ai&&AI.ready&&!AI.limited()){const c=await Privacy.confirm({text,purpose:'разбор в демо API'});
        if(!c.ok)res.ai={error:'consent_declined'};else{out.textContent='// Считаю правила и спрашиваю ИИ…';
        try{const j=parseJSON(await AI.call('Оцени риск мошенничества в сообщении (Россия, 2026). Ответь строго JSON: {"risk":0-100,"verdict":"low"|"medium"|"high","scheme":"название схемы","summary":"одно предложение"}. Сообщение:\n<<<\n'+c.text+'\n>>>',{tier:'quick'}));res.ai={risk:+j.risk||0,verdict:j.verdict,scheme:j.scheme,summary:j.summary};res.engine='rules-v1+llm';}catch(e){res.ai={error:e&&e.code||'unavailable'};}}}
    }
  }
  out.textContent=JSON.stringify(res,null,2);$('#apiMs').textContent=Math.round(performance.now()-t0)+' мс';
}

/* --- Виджет --- */
const WG={name:'Банк «Пример»',color:'#0E6B4C',aud:'senior',mods:{check:true,call:true,help:true}};
function lum(hex){const n=parseInt(hex.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
ORG.init_widget=function(){
  const box=$('#org-widget');
  const name=el('input',{value:WG.name,maxlength:'40','aria-label':'Название организации',oninput:e=>{WG.name=e.target.value||'Ваша организация';renderWidget();}});
  const color=el('input',{type:'color',value:WG.color,'aria-label':'Фирменный цвет',oninput:e=>{WG.color=e.target.value;renderWidget();}});
  const sw=['#0E6B4C','#1F4FD1','#22272B','#8E1F3A','#C2410C'].map(c=>el('button',{class:'swatch',style:'background:'+c,'aria-label':'Цвет '+c,onclick:()=>{WG.color=c;color.value=c;renderWidget();}}));
  const aud=el('select',{'aria-label':'Аудитория',onchange:e=>{WG.aud=e.target.value;renderWidget();}},Object.entries(AUDS).map(([k,a])=>el('option',{value:k,selected:k===WG.aud},a.t)));
  const mods=[['check','Проверка сообщения'],['call','Тренировочный звонок'],['help','Памятка «Если уже попались»']].map(([k,t])=>el('label',{class:'row',style:'gap:10px;color:var(--ink);font-size:.95rem'},el('button',{class:'sw',role:'switch','aria-checked':String(WG.mods[k]),'aria-label':t,onclick:e=>{WG.mods[k]=!WG.mods[k];e.currentTarget.setAttribute('aria-checked',String(WG.mods[k]));renderWidget();}}),t));
  box.append(el('div',{class:'split'},
    el('div',{class:'card'},el('h2',{text:'Настройка'}),el('label',{},'Название организации',name),el('div',{class:'stack',style:'gap:6px'},el('span',{class:'small muted',text:'Фирменный цвет'}),el('div',{class:'row'},sw,color)),el('label',{},'Для кого',aud),el('div',{class:'stack',style:'gap:8px'},el('span',{class:'small muted',text:'Модули'}),mods),
      el('div',{class:'stack',style:'gap:6px'},el('div',{class:'ph'},el('span',{class:'small muted',text:'Код для сайта или приложения'}),el('button',{class:'btn sm',id:'wgCopy'},'Скопировать')),el('pre',{class:'code',id:'wgCode'}))),
    el('div',{class:'stack'},el('span',{class:'eyebrow',text:'Предпросмотр'}),el('div',{id:'wgPrev'}),el('p',{class:'tiny faint',text:'Макет встраиваемого виджета. В предпросмотре проверка и тренировка работают по-настоящему — на движке этой страницы.'}))));
  renderWidget();
};
function renderWidget(){
  const p=$('#wgPrev');if(!p)return;p.innerHTML='';
  const ink=lum(WG.color)>.45?'#111715':'#FFFFFF',big=WG.aud==='senior';
  const w=el('div',{class:'widget',style:big?'font-size:1.08rem':''},el('div',{class:'wh',style:'background:'+WG.color+';color:'+ink},el('div',{class:'row',style:'gap:8px'},el('span',{html:markSVG(20).replace(/class="mk-s"/,'style="stroke:'+ink+'"').replace(/class="mk-y"/,'style="stroke:'+ink+'"')}),el('span',{text:WG.name})),el('div',{class:'tiny',style:'opacity:.85;font-weight:400',text:'Проверка на мошенничество'})));
  const b=el('div',{class:'wb'});
  if(WG.mods.check){const ta=el('textarea',{rows:'3',placeholder:'Вставьте подозрительное сообщение','aria-label':'Сообщение для проверки'}),res=el('div');
    b.append(el('b',{text:'Это мошенники?'}),ta,el('button',{class:'btn sm',style:'background:'+WG.color+';border-color:'+WG.color+';color:'+ink,onclick:()=>{const t=ta.value.trim();res.innerHTML='';if(!t){res.append(el('span',{class:'small muted',text:'Вставьте текст'}));return;}const r=localCheck(t),[k,l]=levelOf(r.score);res.append(el('span',{class:'tag '+k,text:l}),r.hits[0]?el('p',{class:'small',style:'margin-top:6px',text:r.hits[0].f.why}):null);}},'Проверить'),res);}
  if(WG.mods.call){const pick={school:'exam',student:'bank_safe',adult:'bank_safe',senior:'grandson'}[WG.aud],sc=CALLS.find(c=>c.id===pick);b.append(el('div',{class:'flag'},el('b',{text:'Потренируйтесь'}),el('span',{class:'small',text:'Звонок «'+sc.t.replace(/[«»]/g,'')+'» — 3 минуты, без риска'}),el('button',{class:'btn sm',onclick:()=>openSim('call',pick)},'Принять звонок')));}
  if(WG.mods.help)b.append(el('button',{class:'btn sm ghost',style:'justify-content:flex-start',onclick:()=>{showTab('protect');setTimeout(()=>$('#emergency').scrollIntoView({behavior:'smooth'}),60);}},'Уже сообщили код? Что делать →'));
  if(!b.childNodes.length)b.append(el('span',{class:'small muted',text:'Включите хотя бы один модуль'}));
  w.append(b);p.append(w);
  const mods=Object.keys(WG.mods).filter(k=>WG.mods[k]).join(',');
  const TL={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
  const slug=(WG.name.toLowerCase().split('').map(ch=>TL[ch]!=null?TL[ch]:ch).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'org');
  const code='<script src="https://cdn.immunitet.example/widget.js"\n  data-org="'+slug+'"\n  data-color="'+WG.color+'"\n  data-audience="'+WG.aud+'"\n  data-modules="'+mods+'" async></'+'script>';
  $('#wgCode').textContent=code;$('#wgCopy').onclick=()=>copyText(code,$('#wgCode'));
}
let rsT;window.addEventListener('resize',()=>{clearTimeout(rsT);rsT=setTimeout(()=>{drawDumbbell();drawROC();},150);});
