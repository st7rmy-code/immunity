/* ===== ИНТЕРФЕЙС: навигация, главная, звонки и переписки, «Верю — не верю», схемы, защита ===== */
$$('.mark').forEach(m=>m.innerHTML=markSVG(30));

/* --- Навигация --- */
const TABS=['home','train','progress','mentor','schemes','protect','org'];
function showTab(t){if(!TABS.includes(t))t='home';S.tab=t;save();
  $$('nav.tabs button').forEach(b=>{const on=b.dataset.tab===t;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  $$('section.tab').forEach(s=>s.hidden=s.id!=='tab-'+t);
  if(t!=='train'){hush();ring(false);}
  window.scrollTo({top:0});
  if(t==='home'){renderIndex();renderNext();}
  if(t==='progress'&&!TEST.on)renderProgress();
  if(t==='mentor')renderMentor();
  if(t==='org'&&typeof ORG!=='undefined')ORG.render();
}
$$('nav.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('nav.tabs').addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;const bs=$$('nav.tabs button'),i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length;bs[j].focus();});
$('#logoBtn').onclick=()=>showTab('home');
function applyLarge(){document.documentElement.classList.toggle('large',!!S.large);$('#largeBtn').setAttribute('aria-pressed',String(!!S.large));}
$('#largeBtn').onclick=()=>{S.large=!S.large;save();applyLarge();toast(S.large?'Крупный шрифт включён':'Обычный шрифт');};
function renderAuds(){const box=$('#auds');box.innerHTML='';Object.entries(AUDS).forEach(([k,a])=>box.append(el('button',{class:'aud','aria-pressed':String(S.aud===k),onclick:()=>setAud(k)},el('b',{text:a.t}),el('span',{text:a.s}))));}
function setAud(k){S.aud=k;FILTER.aud=k;if(k==='senior'&&!S.large){S.large=true;applyLarge();toast('Включили крупный шрифт. Выключить — кнопка «Aa» вверху');}save();renderAuds();renderNext();renderPick();renderSchemes();}
$('#idxChip').onclick=()=>showTab('progress');
function renderAIStatus(){const t=$('#aiStatus');if(t)t.textContent=SIM&&SIM.mode==='call'&&!SIM.ended&&useRecorded(SIM)?'Нейросетевой голос: собеседник говорит по сценарию и реагирует на ваши ответы':AI.ready&&!AI.limited()?'Собеседник: ИИ, отвечает на ваши слова':AI.ready?AI.label():(AI.reason||'ИИ недоступен')+': собеседник говорит по сценарию';}
AI.on(renderAIStatus);

/* --- Индекс иммунитета и следующий шаг --- */
const IDX_HELP='Индекс — учебный показатель: оценка доли верных решений в проверках и тренировках по шести темам. Повторы одного и того же сценария весят всё меньше, сложные сценарии — больше, старые результаты постепенно теряют вес. Число «±» — неопределённость: чем меньше данных, тем она больше. Отметки в разделе «Защита» — ваш самоотчёт, в индекс навыков они не входят. Индекс не гарантирует защиту от мошенников.';
function ringSVG(v){const r=56,c=2*Math.PI*r,col=v==null?'var(--line-2)':'var(--'+(v>=75?'ok':v>=55?'warn':'bad')+')';return '<svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="'+r+'" style="fill:none;stroke:var(--sunk);stroke-width:10"/>'+(v?'<circle cx="66" cy="66" r="'+r+'" style="fill:none;stroke:'+col+';stroke-width:10;stroke-linecap:round" stroke-dasharray="'+(c*v/100).toFixed(1)+' '+c.toFixed(1)+'"/>':'')+'</svg>';}
function skillBar(c,x){const has=x.n>=.5,m=Math.round(x.m*100),sd=Math.round(x.sd*100),st=Evidence.status(x),lo=Math.max(0,m-sd),hi=Math.min(100,m+sd);
  return el('div',{class:'sbar',title:has?CATS[c]+': '+m+' ± '+sd:CATS[c]+': мало данных'},
    el('span',{class:'sl',text:CATS[c]}),el('span',{class:has?'sv mono':'sv',text:has?m+' ± '+sd:'нет данных'}),
    el('div',{class:'strk'},has?el('i',{class:'band',style:'left:'+lo+'%;width:'+(hi-lo)+'%'}):null,has?el('b',{class:'pt '+st.k,style:'left:'+m+'%'}):null));}
function renderIndex(){
  const sk=Evidence.skills(),ov=Evidence.overall(sk);$('#idxChipV').textContent=ov?ov.v:'—';
  const card=$('#idxCard');if(!card)return;card.innerHTML='';
  card.append(el('div',{class:'ph'},el('h2',{text:'Индекс иммунитета'}),el('button',{class:'q','aria-label':'Как считается индекс',onclick:()=>tip('Как считается индекс',IDX_HELP)},'?')));
  const ring=el('div',{class:'ring',html:ringSVG(ov?ov.v:null)});ring.append(el('div',{class:'val'},el('div',{},el('b',{text:ov?String(ov.v):'—'}),el('span',{text:ov?'± '+ov.pm:'нет данных'}))));
  card.append(el('div',{class:'idx'},ring,el('div',{class:'bars'},CAT_KEYS.map(c=>skillBar(c,sk[c])))));
  card.append(el('p',{class:'small muted',text:ov?'Оценка по '+ov.cov+' из 6 тем. Учебный показатель, а не гарантия защиты.':'Пройдите входную диагностику: 12 заданий, около 5 минут. Индекс и личный план появятся сразу.'}));
  card.append(el('div',{class:'row'},!Assess.last('pre')?el('button',{class:'btn sm primary',onclick:()=>startTest('pre')},'Пройти диагностику'):null,el('button',{class:'btn sm',onclick:()=>showTab('progress')},'Мой прогресс')));}
function testCard(phase){const pre=phase==='pre';return el('button',{class:'scen rec',onclick:()=>startTest(phase)},
  el('div',{class:'row',style:'justify-content:space-between'},el('span',{class:'tag acc',text:'Проверка'}),el('span',{class:'tag',text:'12 заданий'})),
  el('b',{text:pre?'Входная диагностика':'Итоговая проверка'}),
  el('span',{class:'who',text:pre?'Покажет сильные и слабые стороны по шести темам и соберёт личный план тренировок. Около 5 минут, без подсказок.':'Новые задания, которых вы ещё не видели. Сравним с диагностикой: доля верных решений, ложные тревоги, время.'}),
  el('ul',{class:'why'},el('li',{text:pre?'Начните с неё: без диагностики индекс считается только по тренировкам':'Тренировок уже достаточно, чтобы сравнение имело смысл'})));}
function recCard(r){const c=r.c,sc=scenarioById(c.k,c.id)||{};return el('button',{class:'scen rec',onclick:()=>startEx(c)},
  el('div',{class:'row',style:'justify-content:space-between'},el('span',{class:'tag',text:KIND_T[c.k]}),sc.n?el('span',{class:'tag warn',text:'Новое в 2026'}):el('span',{class:'tag',text:LVL[c.lvl]})),
  el('b',{text:c.t}),el('ul',{class:'why'},r.why.map(w=>el('li',{text:w}))));}
function startEx(c){if(c.k==='call'||c.k==='chat')openSim(c.k,c.id);else if(c.k==='site')openSite(c.id);else if(c.k==='swipe'){showTab('train');setTrMode('swipe');}}
function renderNext(){const box=$('#nextList');if(!box)return;box.innerHTML='';const pre=Assess.last('pre');
  if(!pre)box.append(testCard('pre'));else if(Assess.postReady()&&!Assess.last('post'))box.append(testCard('post'));
  Rec.next(pre?3:2).forEach(r=>box.append(recCard(r)));
  $('#nextFor').textContent=pre?'подобрано по вашим результатам':'сначала — диагностика';}

/* --- Тренировки: выбор --- */
const TR={mode:'call'};
const FILTER={aud:S.aud||'all'};
function scenCard(mode,sc,recIds){const k=mode+':'+sc.id,last=[...S.attempts].reverse().find(a=>a.k===mode&&a.id===sc.id),due=S.review[k]&&S.review[k].due<=Date.now(),rec=recIds&&recIds.has(k);
  return el('button',{class:'scen'+(rec?' rec':''),onclick:()=>mode==='site'?openSite(sc.id):openSim(mode,sc.id)},
    el('div',{class:'row',style:'justify-content:space-between'},el('span',{class:'tag',text:KIND_T[mode]}),rec?el('span',{class:'tag acc',text:'Рекомендуем'}):sc.n?el('span',{class:'tag warn',text:'Новое в 2026'}):null),
    el('b',{text:sc.t}),el('span',{class:'who',text:sc.brief||sc.ctx}),
    el('div',{class:'meta'},el('span',{class:'tag',text:LVL[sc.lvl]}),el('span',{class:'tag',text:CATS[sc.cat||sc.sk]}),due?el('span',{class:'tag warn',text:'Пора повторить'}):last?el('span',{class:'tag '+last.res,text:'Последний раз: '+(last.fp?'лишняя тревога':RES_T[last.res])}):null));}
function renderPick(){
  if(TR.mode==='swipe')return;
  const af=$('#audFilter');af.innerHTML='';
  if(TR.mode!=='site')[['all','Все']].concat(Object.entries(AUDS).map(([k,v])=>[k,v.t])).forEach(([k,t])=>af.append(el('button',{class:'fchip','aria-pressed':String(FILTER.aud===k),onclick:()=>{FILTER.aud=k;renderPick();}},t)));
  else af.append(el('span',{class:'small muted',text:'Найдите на странице подозрительные места, затем решите: вводить данные или закрыть.'}));
  const src=TR.mode==='call'?CALLS:TR.mode==='chat'?CHATS:SITES;
  const list=src.filter(sc=>TR.mode==='site'||FILTER.aud==='all'||sc.aud.includes(FILTER.aud));
  const recIds=new Set(Rec.next(2,c=>c.k===TR.mode).map(r=>r.c.k+':'+r.c.id));
  const box=$('#scenList');box.innerHTML='';list.forEach(sc=>box.append(scenCard(TR.mode,sc,recIds)));
  const hon=list.filter(s=>s.honest||s.legit).length;
  $('#pickNote').textContent=plural(list.length,'сценарий','сценария','сценариев')+(hon?' · '+hon+' честных для сравнения':'');}
function setTrMode(m){
  TR.mode=m;$$('#trSeg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===m)));
  stopSim();
  $('#swipeBox').hidden=m!=='swipe';$('#simStage').hidden=true;$('#simPick').hidden=m==='swipe';$('#aiStatus').hidden=m==='swipe'||m==='site';
  if(m==='swipe')startSwipe();else renderPick();}
$$('#trSeg button').forEach(b=>b.onclick=()=>setTrMode(b.dataset.m));
$('#backPick').onclick=()=>{stopSim();$('#simStage').hidden=true;$('#simPick').hidden=false;renderPick();window.scrollTo({top:0});};
$('#heroCall').onclick=()=>{const r=Rec.next(1,c=>c.k==='call')[0];openSim('call',r?r.c.id:'bank_safe');};
$('#heroCheck').onclick=()=>{showTab('mentor');setMentorTab('check');};
$('#toOrg').onclick=()=>showTab('org');
function syncChips(){$('#coachBtn').setAttribute('aria-pressed',String(!!S.coach));$('#voiceBtn').setAttribute('aria-pressed',String(!!S.voice));}
$('#coachBtn').onclick=()=>{S.coach=!S.coach;save();syncChips();if(SIM&&!SIM.ended){if(SIM.mode==='site')renderSiteSide();else{renderSide();renderCtl();}}};
$('#voiceBtn').onclick=()=>{S.voice=!S.voice;save();syncChips();if(!S.voice){hush();ring(false);}else if(SIM&&SIM.state==='ring')ring(true);if(SIM&&SIM.state==='talk')renderCallbar();if(S.voice&&!TTS.best('m'))toast('В этом браузере нет русского голоса — реплики будут только текстом');};
$('#voiceSet').onclick=()=>openVoiceSettings();

/* --- Симулятор звонков и переписок --- */
let SIM=null;
const MAX_TURNS=8;
const COACH=[
 {id:'code',re:/(код|смс|sms)/i,t:'Просят код',w:'Код из СМС — ваша подпись. Его не просит никто: ни банк, ни Госуслуги, ни полиция.'},
 {id:'safe',re:/(безопасн\S* сч|резервн\S* сч|защищ\S* сч|контролиру\S* сч|нов\S* сч[её]т|задеклар|декларир|замен\S* (основн\S* )?сч)/i,t:'«Безопасный» или «новый» счёт',w:'Таких счетов не бывает. Любой перевод «для сохранности» уходит мошенникам.'},
 {id:'auth',re:/(фсб|мвд|следовател|следстви|полици|прокурат|центробанк|центральн\S* банк|росфинмониторинг|финансов\S* разведк|служб\S* безопасност|казначейств|майор|капитан|оперативн|аналитическ\S* центр)/i,t:'Ссылаются на власть',w:'Ведомства не звонят гражданам с просьбами о деньгах и кодах, а через мессенджеры — тем более.'},
 {id:'secret',re:/(никому не|не говори|конфиденциальн|неразглашени|ни слова|сообщник|не звоните никому|не обсуждайте)/i,t:'Требуют секретности',w:'Изолировать вас от близких и коллег — главный приём. Честным людям секретность не нужна.'},
 {id:'rush',re:/(срочно|немедленно|прямо сейчас|через (\d+|три|пару|пять|двадцать) минут|сегодня|до конца|истекает|последн|время идёт|быстрее|осталось|успеть|времени мало)/i,t:'Торопят',w:'Спешка нужна, чтобы вы не успели подумать и посоветоваться.'},
 {id:'fear',re:/(уголовн|статья|террор|экстремизм|задерж|взлом|доверенност|кредит|заблокир|отключ|штраф|аннулир|сгорит|пристав|ответственност|скомпрометир|сорвётся)/i,t:'Пугают',w:'Страх выключает критическое мышление. Прервите разговор и проверьте всё сами.'},
 {id:'money',re:/(перевед|перевод|курьер|наличн|сним|компенсир|компенсац|оплат|пополн|внес|сбережени|реквизит|на карту|скинь)/i,t:'Разговор ведёт к деньгам',w:'Если разговор заканчивается переводом или передачей денег, его пора заканчивать.'},
 {id:'gift',re:/(положена|доплат|выиграл|бесплатн|приз|подар|бонус|доход|заработ|сюрприз)/i,t:'Обещают выгоду',w:'Выплаты и призы не приходят «по коду» и не требуют предоплаты.'},
 {id:'data',re:/(паспорт|снилс|номер карты|cvv|три цифры|срок действия|данные карты|какие у вас счета|номер телефона мамы)/i,t:'Просят данные',w:'Паспорт, СНИЛС, данные карты и список счетов нужны мошенникам для следующего шага.'},
 {id:'link',re:/(ссылк|\[\[link|перейди|зайди на|через бот|приложени|установ|скача)/i,t:'Ссылка или приложение',w:'Ссылки и «приложения» из разговора ведут на фишинг или дают удалённый доступ к телефону.'},
 {id:'kin',re:/(бабул|сынок|мам[ау]? |мамочк|внук|это я|новый номер|с номера друга|аккаунт, старый|не звони)/i,t:'Притворяются своими',w:'Голос и аккаунт родственника или начальника подделывают. Перезвоните по знакомому номеру.'},
 {id:'evade',re:/(какое (ещё )?(кодовое )?слово|какая собака|не время для проверок|не нужно меня проверять|мне сейчас не до)/i,t:'Уходит от проверки',w:'Настоящий человек легко ответит на семейный вопрос. Уход от ответа — сильный признак обмана.'}
];
const HONEST=[
 {id:'nothing',re:/(ничего (делать )?не (нужно|спрашиваю|прошу|требуется)|по телефону ничего)/i,t:'Ничего не просят',w:'Честный собеседник не просит коды, пароли и данные карты.'},
 {id:'callback',re:/(перезвоните|по номеру на|номеру с карты|номеру на обратной)/i,t:'Предлагают перезвонить самому',w:'Так поступают настоящие банки: вы сами набираете номер с карты.'},
 {id:'app',re:/(в приложени)/i,t:'Отправляют в официальное приложение',w:'Проверка в приложении, куда вы входите сами, безопасна.'},
 {id:'meet',re:/(при встрече|на месте|людно|посмотреть)/i,t:'Расчёт при встрече',w:'Встреча в людном месте и оплата при передаче — безопасный вариант.'},
 {id:'calm',re:/(удобно|удобнее|хорошего дня|до встречи|до завтра)/i,t:'Не торопят',w:'Вам дают время и не давят.'}
];
const BAD_T={code:'Вы назвали код из СМС. В жизни это вход в ваш банк или Госуслуги: на вас оформят кредит или выведут деньги.',card:'Вы назвали данные карты. С неё можно списать деньги без вашего участия.',transfer:'Вы согласились перевести деньги. Вернуть такие переводы очень сложно.',cash:'Вы согласились отдать наличные курьеру. Такие деньги почти никогда не возвращаются.',data:'Вы согласились передать данные или выполнять указания «куратора». Это открывает следующий этап обмана.',phish:'Вы ввели данные на фальшивой странице. Мошенники получили доступ к карте или аккаунту.'};
const CONSEQ={code:'Выполнен вход в ваш аккаунт с нового устройства',card:'Списание {sum} ₽ — оплата в интернет-магазине',transfer:'Перевод выполнен: −{sum} ₽',cash:'Курьер выехал за деньгами',data:'На ваше имя подана заявка на кредит',phish:'Данные с фальшивой страницы ушли мошенникам'};
const ME_T={code:c=>'Код: '+c,card:()=>'2202 20•• •••• 5512, срок 09/29, CVV •••',transfer:()=>'Хорошо, перевожу.',cash:()=>'Хорошо, сейчас соберу деньги.',data:()=>'Хорошо, сделаю, как вы говорите.'};
const LAST_T={code:'Спасибо, всё, операция отменена. Ожидайте.',card:'Отлично, проверяю… Всё прошло.',transfer:'Спасибо, ваши деньги в безопасности. Ожидайте подтверждения.',cash:'Курьер уже выехал. Никому не звоните.',data:'Отлично. Ждите дальнейших указаний.',phish:'Данные получены, спасибо!'};
const DANGER_MK={code:'code',card:'data',transfer:'safe',cash:'kin',data:'data',phish:'link'};

/* таймер, привязанный к конкретной тренировке: после переключения сценария он не сработает */
function later(fn,ms){const me=SIM;if(!me)return 0;if(!me.timers)me.timers=new Set();const id=setTimeout(()=>{me.timers.delete(id);if(SIM!==me||me.dead)return;fn();},ms);me.timers.add(id);return id;}
function stopSim(){if(!SIM)return;clearInterval(SIM.timer);clearTimeout(SIM.smsT);if(SIM.timers){SIM.timers.forEach(clearTimeout);SIM.timers.clear();}SIM.dead=true;ring(false);hush();STT.stop(true);VC.listening=false;}
function openSim(mode,id){
  const sc=(mode==='call'?CALLS:CHATS).find(x=>x.id===id);if(!sc)return;
  showTab('train');stopSim();
  TR.mode=mode;$$('#trSeg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===mode)));
  $('#swipeBox').hidden=true;$('#simPick').hidden=true;$('#simStage').hidden=false;$('#aiStatus').hidden=false;$('#voiceBtn').hidden=mode!=='call';$('#voiceSet').hidden=false;$('#coachBtn').hidden=false;
  SIM={mode,sc,state:mode==='call'?'ring':'talk',lines:[],code:String(1000+Math.floor(Math.random()*9000)),sms:false,ev:{comply:0,resist:0,askid:0},used:new Set(),t0:0,timer:null,busy:false,press:mode==='call'?20:10,flags:[],seen:new Set(),si:0,pushI:0,uTurns:0,ended:false,last:'',diff:Evidence.difficulty(sc.cat),tLeft:sc.timer?sc.timer.s:0};
  syncChips();renderPhone();renderSide();renderAIStatus();
  if(mode==='call'){ring(true);buzz([300,200,300]);}else{SIM.t0=Date.now();playOpen();}
  window.scrollTo({top:0});}
function statusBar(){return el('div',{class:'ph-status'},el('span',{text:clock()}),el('span',{text:'5G · 82%'}));}
function renderPhone(){
  const ph=$('#phone');ph.innerHTML='';const sc=SIM.sc;
  const scr=el('div',{class:'ph-screen'});ph.append(statusBar(),scr);
  if(SIM.mode==='call'&&SIM.state==='ring'){
    const label=sc.label?el('span',{class:'calllabel okl',text:'✓ '+sc.label.t}):sc.via==='messenger'?el('span',{class:'calllabel',text:'Звонок через интернет, номер скрыт'}):el('span',{class:'calllabel',text:'Без маркировки организации'});
    const hint=S.coach?(sc.label?'Маркировка есть, но всё равно слушайте, что у вас просят.':sc.via==='messenger'?'Банки и ведомства не звонят через мессенджеры.':'Звонки организаций сейчас маркируются. Здесь маркировки нет.'):null;
    scr.append(el('div',{class:'incoming'},
      el('div',{},el('div',{class:'small',style:'color:var(--phone-muted)',text:sc.via==='messenger'?'Аудиозвонок в мессенджере':'Входящий вызов'}),el('div',{class:'avatar',text:initials(sc.who)}),el('div',{class:'callname',text:sc.who}),el('div',{class:'callnum',text:sc.num}),label,hint?el('p',{class:'coachline',text:'Тренер: '+hint}):null),
      el('div'),
      el('div',{class:'callbtns'},
        el('div',{},el('button',{class:'round red','aria-label':'Отклонить',html:IC.hang,onclick:()=>{SIM.ev.declined=true;end();}}),el('div',{class:'rlbl',text:'Отклонить'})),
        el('div',{},el('button',{class:'round green','aria-label':'Ответить',html:IC.phone,onclick:accept}),el('div',{class:'rlbl',text:'Ответить'})))));
    return;}
  if(SIM.mode==='call')scr.append(el('div',{class:'talkhead'},el('div',{class:'callname',text:sc.who}),el('div',{class:'callnum',id:'ctimer',text:SIM.t0?mmss((Date.now()-SIM.t0)/1000):'00:00'})));
  else scr.append(el('div',{class:'chathead'},el('div',{class:'avatar',text:initials(sc.who)}),el('div',{style:'min-width:0'},el('b',{text:sc.who}),el('span',{text:sc.sub||'в сети'}))));
  if(sc.timer&&SIM.mode==='call')scr.append(el('div',{class:'tbanner',id:'tban'}));
  scr.append(el('div',{class:'trn',id:'tr','aria-live':'polite'}),el('div',{class:'smsbox',id:'smsbox'}),el('div',{id:'phCtl'}));
  SIM.lines.forEach(l=>drawLine(l));updTimer();renderCtl();}
function updTimer(){const b=$('#tban');if(!b||!SIM||!SIM.sc.timer)return;if(SIM.tLeft>0)b.textContent='⏳ «'+SIM.sc.timer.t+' '+mmss(SIM.tLeft)+'»';else{b.textContent='⌛ Срок вышел — и ничего не случилось. Таймер был выдумкой.';b.classList.add('over');}}
function accept(){ring(false);buzz(0);SIM.state='talk';SIM.t0=Date.now();renderPhone();
  if(SIM.sc.timer){SIM.seen.add('timer');SIM.flags.push({id:'timer',t:'Выдуманный срок',w:'Срок придумали, чтобы вы не успели подумать. Если прервать разговор, ничего не случится.'});}
  SIM.timer=setInterval(()=>{if(!SIM||SIM.ended)return;const t=$('#ctimer');if(t)t.textContent=mmss((Date.now()-SIM.t0)/1000);if(SIM.sc.timer&&SIM.tLeft>0){SIM.tLeft--;updTimer();}},1000);
  playOpen();}
function playOpen(){const sc=SIM.sc,open=SIM.mode==='call'?[{say:sc.open}]:sc.open;SIM.busy=true;renderCtl();
  let i=0;const next=()=>{if(!SIM||SIM.dead||SIM.ended)return;if(i>=open.length){SIM.busy=false;renderCtl();if(sc.sms&&!SIM.sms&&open.some(m=>/код/i.test(m.say)))SIM.smsT=later(showSMS,1400);return;}
    const m=open[i++];themSay(m.say,m.who);later(next,SIM.mode==='call'?300:900);};
  later(next,SIM.mode==='call'?500:400);}
const VOICE_RE=/^🎤\s*(?:Голосовое\s*)?(\d+:\d+)?\s*[—-]?\s*«?([\s\S]*?)»?\s*$/;
function drawLine(l){const tr=$('#tr');if(!tr)return;
  if(l.sys){tr.append(el('div',{class:'bub sys',text:l.text}));tr.scrollTop=tr.scrollHeight;return;}
  const b=el('div',{class:'bub '+(l.me?'me':'them')});
  if(!l.me&&l.who&&SIM.sc.group)b.append(el('span',{class:'who',text:l.who}));
  const v=!l.me&&String(l.text).startsWith('🎤')&&String(l.text).match(VOICE_RE);
  if(v){const quote=v[2]||'';b.classList.add('voice');
    b.append(el('div',{class:'vrow'},el('button',{class:'vplay','aria-label':'Прослушать голосовое',html:IC.play,onclick:()=>{hush();if(!say(quote,SIM.sc))toast('В этом браузере нет русского голоса — читайте расшифровку');}}),el('span',{class:'wave','aria-hidden':'true'},Array.from({length:22},(_,i)=>el('i',{style:'height:'+(4+Math.round(Math.abs(Math.sin(i*1.7+quote.length))*14))+'px'}))),el('span',{class:'vdur',text:v[1]||'0:10'})),el('span',{class:'vtxt',text:'Расшифровка: «'+quote+'»'}));}
  else b.append(fmtMsg(l.text));
  tr.append(b);tr.scrollTop=tr.scrollHeight;}
function fmtMsg(text){const frag=document.createDocumentFragment();
  const re=/\[\[link:([^\]]+)\]\]|((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:top|click|site|online|info|xyz|pro|app|link|shop|ru|com|net)(?:\/[^\s,;!?)]*)?|@[a-z0-9_]{4,}bot)/gi;let p=0,m;
  while((m=re.exec(text))){if(m.index>p)frag.append(text.slice(p,m.index));const url=m[1]||m[2];frag.append(el('a',{href:'#',class:'lnk',onclick:e=>{e.preventDefault();openPhish(url);}},url));p=m.index+m[0].length;}
  if(p<text.length)frag.append(text.slice(p));return frag;}
function themSay(text,who){if(!SIM||SIM.dead)return;
  const l={me:false,text,who:who||SIM.sc.who};SIM.lines.push(l);drawLine(l);
  if(SIM.mode==='call')say(text,SIM.sc);
  const n=coachScan(text);if(n&&!SIM.flagAt&&!SIM.sc.honest)SIM.flagAt=Date.now();
  if(!SIM.sc.honest)SIM.press=Math.max(5,Math.min(100,Math.round(SIM.press*.55+18+14*n)));
  renderSide();}
function meSay(text){const l={me:true,text};SIM.lines.push(l);drawLine(l);}
function sysSay(text){const l={sys:true,text};SIM.lines.push(l);drawLine(l);}
function coachScan(text){let n=0;(SIM.sc.honest?HONEST:COACH).forEach(c=>{if(c.re.test(text)&&!SIM.seen.has(c.id)){SIM.seen.add(c.id);SIM.flags.push(c);n++;}});return n;}
function renderCtl(){const box=$('#phCtl');if(!box||!SIM)return;box.innerHTML='';const sc=SIM.sc;
  if(SIM.ended){box.append(el('div',{class:'endbar'},el('b',{text:SIM.mode==='call'?'Звонок завершён':'Переписка завершена'}),el('span',{class:'mono',text:SIM.t0?mmss(((SIM.endAt||Date.now())-SIM.t0)/1000):'00:00'}),el('button',{class:'btn sm',onclick:()=>openSim(SIM.mode,sc.id)},'Ещё раз')));return;}
  const qrs=el('div',{class:'qrs',role:'group','aria-label':'Быстрые ответы'});
  if(SIM.mode==='chat'){
    qrs.append(el('button',{class:'qr',disabled:SIM.busy,onclick:()=>{SIM.ev.block=true;SIM.decAt=Date.now();sysSay('Вы заблокировали собеседника и пожаловались');end();}},'⛔ Заблокировать'));
    if(sc.verify)qrs.append(el('button',{class:'qr',disabled:SIM.busy,onclick:verifyFlow},'📞 Проверить звонком'));}
  sc.quick.filter(q=>q.d||!SIM.used.has(q.t)).forEach(q=>qrs.append(el('button',{class:'qr'+(q.d&&S.coach?' danger':''),disabled:SIM.busy,onclick:()=>quick(q)},q.t)));
  const form=el('form',{class:'ph-form',onsubmit:e=>{e.preventDefault();const i=$('#phIn');const v=i.value;if(!v.trim())return;if(!SIM||SIM.ended||SIM.busy){if(SIM&&SIM.busy&&!SIM.ended)toast('Собеседник ещё говорит — ответ сохранён в поле, отправьте через секунду');return;}i.value='';userSend(v);}},
    el('input',{id:'phIn',placeholder:VC.listening?'Говорите — я слушаю…':SIM.mode==='call'?'Ответьте своими словами…':'Сообщение…',autocomplete:'off','aria-label':'Ваш ответ',maxlength:'300'}),
    SIM.mode==='call'&&STT.ok()?el('button',{type:'button',id:'micBtn',class:'mic'+(VC.listening?' on':''),'aria-pressed':String(VC.listening),'aria-label':VC.listening?'Закончить ответ':'Ответить голосом',disabled:SIM.busy&&!VC.listening,html:IC.mic,onclick:()=>VC.listening?STT.stop(false):micStart(false)}):null,
    el('button',{type:'submit','aria-label':'Отправить',disabled:SIM.busy},'↑'));
  box.append(qrs,form);
  if(SIM.mode==='call'){box.append(el('div',{class:'callbar',id:'callbar'}));renderCallbar();setTimeout(maybeAutoListen,0);}}
function renderCallbar(){const cb=$('#callbar');if(!cb)return;cb.innerHTML='';
  cb.append(el('button',{class:'minibtn','aria-pressed':String(!!S.voice),onclick:()=>$('#voiceBtn').click()},ico(S.voice?'vol':'mute'),S.voice?'Звук':'Без звука'));
  cb.append(el('button',{class:'minibtn'+(hfOn()?' on':''),'aria-pressed':String(hfOn()),onclick:toggleHandsFree},ico('mic'),hfOn()?'Голосом: вкл':'Голосом'));
  cb.append(el('button',{class:'minibtn',onclick:verifyFlow},ico('check'),'Проверить'));
  cb.append(el('button',{class:'minibtn danger',onclick:()=>{SIM.ev.hangup=true;SIM.decAt=Date.now();sysSay('Вы положили трубку');end();}},el('span',{class:'c',style:'background:#E5484D;color:#fff',html:IC.hang}),'Положить трубку'));}
function quick(q){if(!SIM||SIM.ended||SIM.busy)return;hush();if(q.d)return danger(q.k);
  SIM.ev[q.k]=(SIM.ev[q.k]||0)+1;SIM.last=q.k;SIM.used.add(q.t);meSay(q.t);nextTurn();}
function userSend(text){text=String(text||'').trim();if(!text||!SIM||SIM.ended||SIM.busy)return;hush();
  if(SIM.sms&&digitsOf(text).includes(SIM.code))return danger('code');
  if(/(?:\d[ -]?){15,18}\d/.test(text))return danger('card');
  const t=maskPII(text);meSay(t);let k='other';
  if(/(перезвон|положу|кладу|не буду|не стану|мошенни|развод|аферист|проверю|сам\S* позвон|по номеру (на|с) карт|не скажу|не назову|никаких код|до свидания|полици|102|не верю|не интересно|не надо|заблокир|пожалуюсь|посоветуюсь|нет,? спасибо|отказываюсь)/i.test(t))k='resist';
  else if(/(кто вы|как вас зовут|фио|должност|какой отдел|удостоверени|откуда (вы|у вас)|как(ая|ой) (компания|банк|отдел|организация)|номер договора|официальн|докажите|кодов\S* слов|назови|как зовут)/i.test(t))k='askid';
  else if(/(хорошо|ладно|давайте|конечно|готов|согласн|что (нужно|надо)|как (отменить|быть|получить|начать)|диктую|сейчас (переведу|сниму|скажу|продиктую|отправлю)|переведу|сниму|установлю|скачаю|отправлю|записывайте|да(?![а-яё]))/i.test(t))k='comply';
  if(k!=='other')SIM.ev[k]++;SIM.last=k;nextTurn();}
function danger(kind){const sc=SIM.sc;SIM.ev[kind]=true;SIM.decAt=Date.now();
  if(kind!=='phish')meSay(ME_T[kind](SIM.code));SIM.busy=true;renderCtl();
  later(()=>{
    if(sc.honest){themSay(SIM.mode==='call'?'Стоп! Никогда не называйте коды и данные карты — даже сотрудникам банка. Я у вас ничего не спрашиваю.':'Ой, не надо! Никому не сообщайте такие данные, мне они не нужны.');SIM.busy=false;later(end,1400);return;}
    themSay(LAST_T[kind]);
    later(()=>{notify(CONSEQ[kind].replace('{sum}',sc.sum||'48 700'),true);buzz([200,80,200]);later(end,1700);},900);},700);}
function notify(text,bad){const box=$('#smsbox');if(!box)return;box.innerHTML='';box.append(el('div',{class:'sms'+(bad?' bad':''),role:'alert'},el('b',{text:bad?'Уведомление · сейчас':'Сообщение'}),el('span',{text})));}
function showSMS(){if(!SIM||SIM.dead||SIM.sms||!SIM.sc.sms||SIM.ended)return;SIM.sms=true;
  const t=SIM.sc.sms.text.replace('{code}',SIM.code),box=$('#smsbox');if(!box)return;box.innerHTML='';
  const n=el('div',{class:'sms',role:'status',title:'Нажмите, чтобы скрыть',onclick:()=>n.remove()},el('b',{text:SIM.sc.sms.from+' · сейчас'}),el('span',{text:t}));
  box.append(n);buzz([120]);sysSay('Пришло СМС от «'+SIM.sc.sms.from+'»');
  if(!SIM.seen.has('sms')){SIM.seen.add('sms');SIM.flags.push({id:'sms',t:'Пришло СМС с кодом',w:'Прочитайте, кто его отправил и зачем: «вход в приложение» или «вход на Госуслуги» — это не отмена операции и не домофон.'});renderSide();}
  SIM.smsT=setTimeout(()=>{if(n.isConnected)n.classList.add('mini');},9000);}
async function nextTurn(){const sc=SIM.sc;SIM.uTurns++;SIM.busy=true;renderCtl();
  const tr=$('#tr'),typing=el('div',{class:'bub them typing',text:SIM.mode==='call'?'говорит…':'печатает…'});if(tr){tr.append(typing);tr.scrollTop=tr.scrollHeight;}
  let out=null;const sim=SIM;
  if(AI.ready&&!AI.limited()&&!useRecorded(sim)&&!sim.aiOff){
    if(!sim.aiOk){const c=await Privacy.confirm({purpose:'тренировка с ИИ-собеседником',key:'sim',parts:[{label:'Что уходит модели на каждом ходу',text:'Описание роли собеседника из тренажёра и весь текущий разговор, включая ваши реплики. Номера, карты, коды и другие личные данные в ваших репликах скрываются автоматически.'},{label:'Разговор сейчас',text:Mentor.transcript(sim),user:true}]});
      if(sim!==SIM||sim.dead){typing.remove();return;}if(c.ok)sim.aiOk=true;else{sim.aiOff=true;sysSay('Собеседник продолжит по сценарию, без ИИ');}}
    if(sim.aiOk){try{out=await Mentor.scamTurn(sim);}catch(e){out=null;}renderAIStatus();}}
  if(!out){await new Promise(r=>setTimeout(r,650+Math.random()*500));out=scriptTurn();}
  typing.remove();if(sim!==SIM||SIM.dead||SIM.ended)return;SIM.busy=false;
  for(const m of out.msgs)themSay(m.say,m.who);
  if(out.pressure!=null&&!sc.honest){SIM.press=out.pressure;renderSide();}
  if(sc.sms&&!SIM.sms&&(out.sms||out.msgs.some(m=>/код/i.test(m.say)&&!/не (называйте|сообщайте)/i.test(m.say))))showSMS();
  if(out.end||SIM.uTurns>=MAX_TURNS){if(!out.end)themSay(sc.honest?'Всего доброго!':(sc.giveup||GEN[SIM.mode].giveup));
    SIM.ev.themEnd=true;sysSay(SIM.mode==='call'?'Собеседник завершил звонок':'Собеседник перестал отвечать');later(end,1200);}
  renderCtl();}
/* без ИИ: реплика выбирается по смыслу ответа — сопротивление, вопрос о личности, согласие */
function scriptTurn(){const sc=SIM.sc,L=sc.script,g=GEN[SIM.mode];
  if(sc.honest){if(SIM.last==='askid'&&sc.idAns&&!SIM.idDone){SIM.idDone=1;return{msgs:[{say:sc.idAns}]};}
    if(SIM.last==='resist')return{msgs:[{say:GEN.honest[0]}],end:true};}
  else{if(SIM.last==='askid'&&!SIM.idDone){SIM.idDone=1;return{msgs:[{say:sc.idAns||(voiceOf(sc).g==='f'&&g.idF)||g.id}]};}
    if(SIM.last==='resist'){const pool=(sc.push||[]).concat(g.push);if(SIM.ev.resist>=3||SIM.pushI>=pool.length)return{msgs:[{say:sc.giveup||g.giveup}],end:true};return{msgs:[{say:pool[SIM.pushI++]}]};}}
  if(SIM.si>=L.length)return{msgs:[{say:sc.honest?'Если останутся вопросы — звоните по официальному номеру. Всего доброго!':(sc.giveup||g.giveup)}],end:true};
  const line=L[SIM.si++],msg=typeof line==='string'?{say:line}:line;
  const last=SIM.si>=L.length&&/(отмечу отказ|заявку|разбираться|проехали|потом обсудим|отменена|другому игроку|найду другой|сам разберусь|до встречи|хорошего дня|до завтра|сгорят|вернётся отправителю|отключится|кого-нибудь другого)/i.test(msg.say);
  return{msgs:[msg],end:last};}
/* фальшивая страница по ссылке из переписки */
const PHISH={card:{t:'Получение оплаты',s:'Безопасная сделка · защищено',f:['Номер карты','Срок действия','CVV-код'],b:'Получить 12 500 ₽'},login:{t:'Вход через аккаунт',s:'Подтвердите вход, чтобы продолжить',f:['Номер телефона','Пароль','Код из СМС'],b:'Войти и получить'},invest:{t:'Инвест-платформа',s:'Доход от 3% в день · регистрация',f:['Телефон','Сумма депозита','Номер карты'],b:'Внести депозит'},data:{t:'Реестр: актуализация данных',s:'Обязательно для сотрудников до 18:00',f:['ФИО','Серия и номер паспорта','СНИЛС','Код из СМС'],b:'Отправить данные'}};
function openPhish(url){if(!SIM||SIM.ended||SIM.mode!=='chat'){toast('В тренажёре ссылки не открываются');return;}
  hush();SIM.ev.linkOpened=true;
  if(!SIM.seen.has('opened')){SIM.seen.add('opened');SIM.flags.push({id:'opened',t:'Вы открыли ссылку',w:'В жизни даже открытие такой страницы бывает опасно: она может предложить «обновить приложение» и установить вирус.'});renderSide();}
  const P=PHISH[SIM.sc.phish||'card'],scr=$('#phone .ph-screen');
  const ov=el('div',{class:'phish',role:'dialog','aria-label':'Фальшивая страница'},el('div',{class:'pbar'},el('span',{text:'⚠ '+url.replace(/^https?:\/\//,'')})),
    el('div',{class:'pg'},el('div',{class:'trainmark',text:'Учебная копия'}),el('h3',{text:P.t}),el('p',{class:'small',text:P.s}),P.f.map(f=>el('label',{},f,el('input',{readonly:true,value:'учебные данные','aria-label':f}))),
      el('button',{class:'btn primary',onclick:()=>{ov.remove();sysSay('Вы ввели данные на странице по ссылке');danger('phish');}},P.b),
      el('button',{class:'btn',onclick:()=>{ov.remove();sysSay('Вы закрыли страницу, ничего не введя');}},'Закрыть страницу'),
      el('p',{class:'tiny',style:'color:#5c6662',text:'Поля заполнены учебными данными и ничего не отправляют.'})));
  scr.append(ov);}
/* проверка через независимый канал */
function verifyFlow(){if(!SIM||SIM.ended)return;hush();ring(false);const sc=SIM.sc;SIM.decAt=SIM.decAt||Date.now();
  const v=sc.verify||{c:'Организация — номер с официального сайта или из договора',a:sc.honest?'«Да, это были мы. Всё в порядке».':'«Мы вам не звонили и ничего не просим. Это были мошенники».'};
  const trapA=SIM.mode==='call'?(sc.via==='messenger'?'Перезвонить в мессенджере на этот же аккаунт':'Перезвонить на номер, с которого звонили'):'Спросить в этом же чате: «Это точно ты?»';
  const opts=shuffle([{t:v.c,good:1},{t:trapA},{t:'Номер, который назовёт или пришлёт собеседник'}]);
  const scr=$('#phone .ph-screen'),ov=el('div',{class:'vfy',role:'dialog','aria-label':'Проверка через другой канал'});
  const pick=o=>{ov.innerHTML='';ov.append(el('div',{class:'small',style:'color:var(--phone-muted)',text:'Связываемся: '+o.t}),el('div',{class:'typing',text:'…'}));
    later(()=>{if(SIM.ended)return;ov.innerHTML='';
      if(o.good){SIM.ev.callback=true;ov.append(el('b',{text:'Ответ по проверенному каналу'}),el('div',{class:'bub them',text:v.a}));sysSay('Проверка: '+v.c);}
      else{SIM.ev.badVerify=true;ov.append(el('b',{text:'Ответил тот же собеседник'}),el('div',{class:'bub them',text:sc.honest?'«Да, это мы». Сходится, но надёжнее связываться по номеру, который вы знаете сами: номер звонящего и ссылку из чата можно подделать.':SIM.mode==='call'?'«Да-да, это мы. Давайте продолжим, время идёт».':'«Да, это я, конечно! Давай быстрее».'}));sysSay('Проверка не через тот канал: '+o.t);}
      ov.append(el('button',{class:'btn sm',onclick:()=>{ov.remove();end();}},'Завершить и посмотреть разбор'));},900);};
  ov.append(el('b',{text:'Как проверите?'}),el('p',{class:'small',text:'Выберите канал, которому можно доверять.'}),...opts.map(o=>el('button',{class:'vopt',onclick:()=>pick(o)},o.t)),el('button',{class:'btn sm',onclick:()=>{ov.remove();SIM.decAt=null;}},'Вернуться'));
  scr.append(ov);}
function end(){
  if(!SIM||SIM.ended)return;SIM.ended=true;SIM.endAt=Date.now();clearInterval(SIM.timer);ring(false);STT.stop(true);VC.listening=false;later(hush,SIM.ev.hangup||SIM.ev.callback?0:2500);
  if(SIM.state==='ring'){SIM.state='talk';SIM.lines.push({sys:true,text:'Вы отклонили вызов'});renderPhone();}
  const sc=SIM.sc,e=SIM.ev,v=verdictOf();SIM.v=v;
  const fp=!!(sc.honest&&(e.declined||e.block)),bad=['code','card','transfer','cash','data','phish'].find(k=>e[k]);
  const mk=v.k==='ok'?[]:sc.honest?(fp?['legit']:bad?[DANGER_MK[bad]]:[]):e.badVerify&&!bad?['verify']:(sc.mk||[]);
  const ms=SIM.decAt&&(SIM.flagAt||SIM.t0)?Math.max(0,SIM.decAt-(SIM.flagAt||SIM.t0)):undefined;
  const before=Evidence.skills()[sc.cat];
  Evidence.record({k:SIM.mode,id:sc.id,sk:sc.cat,lvl:sc.lvl,res:v.k,s:RES_S[v.k],legit:!!sc.honest||undefined,fp:fp||undefined,ms,mk});
  const after=Evidence.skills()[sc.cat];SIM.delta={before:Math.round(before.m*100),after:Math.round(after.m*100),rep:S.attempts.filter(a=>a.k===SIM.mode&&a.id===sc.id).length};
  renderCtl();renderSide();}
function verdictOf(){const sc=SIM.sc,e=SIM.ev,dur=SIM.t0?Math.round((SIM.endAt-SIM.t0)/1000):0,u=SIM.uTurns;
  const bad=['code','card','transfer','cash','data','phish'].find(k=>e[k]);
  if(bad)return{k:'bad',h:sc.honest?'Опасная привычка':'Вы попались',p:BAD_T[bad]+(sc.honest?' В этот раз собеседник был честным, но в следующий раз на его месте может оказаться мошенник.':'')};
  if(sc.honest){
    if(e.declined)return{k:'warn',h:'Вы не ответили',p:'Это был честный звонок. Пропустить его не страшно, но полезно знать признаки настоящего: маркировка, вас не торопят и ничего не просят.'};
    if(e.block)return{k:'warn',h:'Лишняя тревога',p:'Вы заблокировали честного собеседника. Осторожность — это хорошо, но здесь признаков обмана не было: ни ссылок, ни просьб о кодах и картах.'};
    if(e.badVerify)return{k:'warn',h:'Проверили не там',p:'Звонок был честным, но перезванивать стоит по номеру, который вы знаете сами, — с карты или из договора.'};
    if(e.hangup&&!u)return{k:'ok',h:'Можно и так',p:'Вы положили трубку. С честным звонком так тоже можно: если что-то важное — перезвоните сами по официальному номеру.'};
    return{k:'ok',h:'Всё верно',p:e.callback?'Вы перепроверили по известному номеру — это правильно всегда, даже когда собеседник настоящий.':'Вы спокойно поговорили и ничего не сообщили. Честный собеседник ничего и не просил.'};}
  if(e.declined)return{k:'ok',h:'Не ответили — тоже защита',p:'Незнакомый номер без маркировки можно не брать. Но потренироваться полезно: ответьте в следующий раз и попробуйте распознать обман.'};
  if(e.badVerify)return{k:'warn',h:'Проверили не там',p:'Вы ничего не отдали, но проверяли у тех же людей. Перезвон на номер звонящего или вопрос в том же чате попадает к мошенникам. Связывайтесь по номеру, который знаете заранее.'};
  if(e.comply>0&&e.resist===0&&!e.callback&&!e.block)return{k:'warn',h:'Обошлось, но было опасно',p:'Вы ничего не отдали, но поддерживали разговор и соглашались. Мошенникам нужно время — не давайте его: заканчивайте разговор на первом же требовании.'};
  if(e.linkOpened)return{k:'warn',h:'Почти без ошибок',p:'Вы ничего не ввели, но открыли фишинговую ссылку. В жизни лучше не открывать такие ссылки вовсе.'};
  return{k:'ok',h:e.callback?'Идеально: вы проверили через независимый канал':u<=2?'Отлично: вы быстро вышли из разговора':'Хорошо: вы не поддались',p:(e.callback?'Перепроверка по известному номеру — лучший ответ на любой подозрительный звонок или сообщение. ':'')+(u?'Разговор закончен за '+plural(u,'реплику','реплики','реплик'):'Разговор закончен сразу')+(dur?', за '+fmtDur(dur):'')+'.'};}
function flagList(fl){return el('div',{class:'flagsl'},fl.map(f=>el('div',{},el('span',{},el('b',{text:f.t}),' — ',f.w))));}
const DEEPFAKE_T='Голос можно подделать нейросетью по нескольким секундам записи. Иногда подделку выдают ровная интонация, странные паузы или «плохая связь» как оправдание, но и настоящий голос может звучать так же. Надёжно определить подделку на слух нельзя — поэтому проверяйте не голос, а человека: перезвоните на знакомый номер, задайте вопрос, ответ на который знает только он, или спросите кодовое слово семьи.';
function renderSide(){const side=$('#simSide');if(!side||!SIM||SIM.mode==='site')return;side.innerHTML='';const sc=SIM.sc;
  if(!SIM.ended){
    const c=el('div',{class:'card'},el('div',{class:'ph'},el('h2',{text:sc.t}),el('span',{class:'tag',text:LVL[sc.lvl]})));
    c.append(el('p',{class:'muted small',text:sc.brief}));
    c.append(el('p',{class:'small',text:sc.honest?'Ваша цель: понять, честный ли собеседник, и ничего не испортить.':'Ваша цель: распознать обман и выйти из разговора без потерь. Можно '+(SIM.mode==='call'?'положить трубку или нажать «Проверить», чтобы связаться по надёжному каналу.':'заблокировать собеседника или проверить звонком.')}));
    if(S.coach){
      if(!sc.honest&&SIM.state==='talk')c.append(el('div',{class:'stack',style:'gap:6px'},el('div',{class:'row',style:'justify-content:space-between'},el('span',{class:'small',text:'Давление собеседника'}),el('span',{class:'mono small muted',text:SIM.press+'%'})),el('div',{class:'pressure'},el('i',{style:'width:'+SIM.press+'%'}))));
      if(!sc.honest&&SIM.ev.resist>0&&SIM.state==='talk')c.append(el('p',{class:'small',style:'color:var(--ok);font-weight:600',text:'Хороший ответ. Теперь завершите разговор или проверьте собеседника — не давайте ему времени.'}));
      c.append(el('span',{class:'eyebrow',text:sc.honest?'Что вы заметили':'Красные флаги'}));
      c.append(SIM.flags.length?flagList(SIM.flags):el('p',{class:'small faint',text:'Тренер подсветит приёмы собеседника, как только они появятся.'}));
    }else c.append(el('p',{class:'small faint',text:'Подсказки выключены: проверьте себя. Разбор будет в конце.'}));
    side.append(c);
    side.append(el('p',{class:'small faint',text:AI.ready?'Собеседник — ИИ, сложность '+DIFF_L[SIM.diff]+' под ваш уровень. Ваши ответы уходят ИИ, чтобы он реагировал: номера карт, телефоны, почта и паспорт скрываются автоматически. Не пишите настоящие данные.':'ИИ сейчас недоступен: собеседник говорит по заготовленному сценарию, но реагирует на отказ, вопросы и согласие.'}));
    return;}
  const v=SIM.v,d=SIM.delta;
  side.append(el('div',{class:'verdict '+v.k},el('b',{text:v.h}),el('span',{text:v.p}),el('span',{class:'small muted',text:'Тема «'+CATS[sc.cat]+'»: '+d.before+' → '+d.after+(d.rep>1?' · повтор №'+d.rep+': повторы весят меньше, индекс растёт за разнообразие и сложные сценарии':'')})));
  if(sc.deepfake)side.append(el('div',{class:'card flat'},el('h3',{text:'Про подделку голоса'}),el('p',{class:'small',text:DEEPFAKE_T})));
  const fl=SIM.flags;
  side.append(el('div',{class:'card'},el('h3',{text:sc.honest?'Признаки честного собеседника':'Приёмы, которые использовал собеседник'}),fl.length?flagList(fl):el('p',{class:'small muted',text:'Разговор закончился раньше, чем собеседник успел применить приёмы.'})));
  side.append(el('div',{class:'card'},el('h3',{text:'Правильный ход'}),el('p',{text:sc.right}),sc.verify?el('p',{class:'small muted',text:'Надёжный канал проверки здесь: '+sc.verify.c+'.'}):null));
  side.append(el('div',{class:'card flat'},el('h3',{text:'Важно знать'}),el('ul',{class:'clean'},sc.facts.concat(SIM.mode==='call'&&!sc.honest?['Приятный, спокойный и уверенный голос — не признак честности. Ему учат на тренингах, а нейросеть синтезирует его за секунды, как в этом тренажёре.']:[]).map(f=>el('li',{text:f}))),srcLink(sc.src)));
  const nx=Rec.next(1,c=>!(c.k===SIM.mode&&c.id===sc.id))[0];
  const row=el('div',{class:'row'},nx?el('button',{class:'btn primary',onclick:()=>startEx(nx.c)},'Дальше: '+nx.c.t):null,el('button',{class:'btn',onclick:()=>openSim(SIM.mode,sc.id)},'Ещё раз'));
  if(AI.ready&&SIM.lines.some(l=>l.me))row.append(el('button',{class:'btn',id:'aiDeb',onclick:aiDebrief},'Разбор наставника'));
  if(v.k==='bad'&&!sc.honest)row.append(el('button',{class:'btn ghost',onclick:()=>{showTab('protect');setTimeout(()=>$('#emergency').scrollIntoView({behavior:'smooth'}),60);}},'Если это случилось в жизни'));
  side.append(row);if(nx)side.append(el('p',{class:'tiny faint',text:'Почему дальше это: '+nx.why.join('; ').toLowerCase()}));
  side.append(el('div',{id:'aiDebBox',class:'stack'}));}
async function aiDebrief(){const me=SIM;const c=await Privacy.confirm({purpose:'разбор тренировки',key:'debrief',parts:[{label:'Расшифровка тренировочного разговора',text:Mentor.transcript(me),user:true}]});if(!c.ok||SIM!==me)return;const b=$('#aiDeb');if(b)b.disabled=true;const box=$('#aiDebBox');box.innerHTML='';box.append(el('p',{class:'small muted',text:'Наставник разбирает разговор… обычно до минуты'}));
  const r=await Mentor.debrief(SIM);box.innerHTML='';if(b)b.disabled=false;
  if(!r.ok){box.append(el('p',{class:'small muted',text:AI.msg(r.err)}));return;}
  const j=r.data,sc2=Math.max(0,Math.min(100,+j.score||0)),L=(h,a)=>Array.isArray(a)&&a.length?el('div',{class:'stack',style:'gap:4px'},el('b',{class:'small',text:h}),el('ul',{class:'clean small'},a.slice(0,3).map(x=>el('li',{text:String(x)})))):null;
  box.append(el('div',{class:'card'},el('div',{class:'ph'},el('h3',{text:'Разбор наставника'}),el('span',{class:'tag '+(sc2>=70?'ok':sc2>=40?'warn':'bad'),text:sc2+' / 100'})),j.summary?el('p',{text:String(j.summary)}):null,L('Получилось',j.good),L('Что улучшить',j.improve),j.phrase?el('p',{class:'small'},el('b',{text:'Фраза на будущее: '}),'«'+String(j.phrase).replace(/^[«"]|[»"]$/g,'')+'»'):null,el('p',{class:'tiny faint',text:'Это мнение ИИ: оно может ошибаться. На индекс не влияет.'})));}

/* --- «Верю — не верю»: колода собирается из слабых тем --- */
const SW={deck:[],i:0,ans:[],rev:false,t0:0};
function buildDeck(){const sk=Evidence.skills(),seen={},met=Evidence.metrics();S.attempts.filter(a=>a.k==='card').forEach(a=>seen[a.id]=(seen[a.id]||0)+1);
  const w=c=>{const x=sk[c.c];return(x.n>=.5?1-x.m:.5)+(seen[c.id]?-.18*seen[c.id]:.5)+Math.random()*.35;};
  const nL=met.legitN>=3&&met.fp>.3?4:3,scam=CARDS.filter(c=>c.s).sort((a,b)=>w(b)-w(a)),legit=CARDS.filter(c=>!c.s).sort((a,b)=>w(b)-w(a));
  return shuffle(scam.slice(0,10-nL).concat(legit.slice(0,nL)));}
function startSwipe(){SW.deck=buildDeck();SW.i=0;SW.ans=[];SW.rev=false;renderSwipe();}
function markText(text,marks){const frag=document.createDocumentFragment();if(!marks||!marks.length){frag.append(text);return frag;}
  const low=text.toLowerCase(),rs=[];marks.forEach(m=>{const i=low.indexOf(m.toLowerCase());if(i>=0)rs.push([i,i+m.length]);});rs.sort((a,b)=>a[0]-b[0]);let p=0;rs.forEach(([a,b])=>{if(a<p)return;if(a>p)frag.append(text.slice(p,a));frag.append(el('mark',{text:text.slice(a,b)}));p=b;});if(p<text.length)frag.append(text.slice(p));return frag;}
function renderSwipe(){const box=$('#swipeBox');box.innerHTML='';
  if(SW.i>=SW.deck.length)return swipeSummary();
  const c=SW.deck[SW.i];
  box.append(el('div',{class:'ph'},el('h2',{text:'Верю — не верю'}),el('span',{class:'small muted mono',text:(SW.i+1)+' / '+SW.deck.length})),el('div',{class:'dots','aria-hidden':'true'},SW.deck.map((_,i)=>el('i',{class:i<SW.ans.length?(SW.ans[i].ok?'ok':'bad'):i===SW.i?'cur':''}))));
  if(!SW.i&&!SW.rev)box.append(el('p',{class:'small faint',text:'Колода собрана под вас: больше карточек из слабых тем и тех, что вы ещё не видели.'}));
  const body=el('div',{class:'swbody'});body.append(SW.rev?markText(c.x,c.m):document.createTextNode(c.x));
  const card=el('div',{class:'swcard',id:'swCard'},el('div',{class:'swhead'},el('div',{class:'avatar',text:initials(c.f)}),el('div',{},el('b',{text:c.f}),el('span',{text:c.k+' · '+CATS[c.c]}))),c.ctx?el('div',{class:'small muted',style:'padding:10px 18px 0;font-style:italic',text:'Ситуация: '+c.ctx}):null,body);
  box.append(card);
  if(!SW.rev){SW.t0=Date.now();
    box.append(el('div',{class:'swbtns'},el('button',{class:'btn danger',onclick:()=>swAnswer(false)},'Не верю'),el('button',{class:'btn primary',onclick:()=>swAnswer(true)},'Верю')));
    box.append(el('p',{class:'small faint',style:'text-align:center',text:'Можно смахнуть карточку: влево — не верю, вправо — верю. Или клавиши ← и →'}));dragify(card);}
  else{const a=SW.ans[SW.ans.length-1];
    box.append(el('div',{class:'verdict '+(a.ok?'ok':'bad')},el('b',{text:(a.ok?'Верно. ':'Ошибка. ')+(c.s?'Это мошенничество':'Это обычное сообщение')}),el('span',{text:c.w})));
    box.append(el('button',{class:'btn ink',id:'swNext',onclick:()=>{SW.i++;SW.rev=false;renderSwipe();}},SW.i+1<SW.deck.length?'Дальше':'Итоги'));
    setTimeout(()=>{const n=$('#swNext');n&&n.focus({preventScroll:true});},50);}}
function swAnswer(believe){if(SW.rev)return;const c=SW.deck[SW.i],ok=believe===!c.s,ms=Date.now()-SW.t0;SW.ans.push({c,ok});SW.rev=true;
  Evidence.record({k:'card',id:c.id,sk:c.c,lvl:c.d||1,res:ok?'ok':'bad',s:ok?1:0,legit:!c.s||undefined,fp:(!c.s&&!believe)||undefined,ms,mk:ok?[]:c.s?(c.mk||[]):['legit']});renderSwipe();}
function dragify(card){let x0=null,dx=0;card.style.touchAction='pan-y';
  card.addEventListener('pointerdown',e=>{x0=e.clientX;dx=0;card.setPointerCapture(e.pointerId);card.style.transition='none';});
  card.addEventListener('pointermove',e=>{if(x0==null)return;dx=e.clientX-x0;card.style.transform='translateX('+dx+'px) rotate('+(dx/22)+'deg)';card.style.boxShadow=dx>40?'0 0 0 3px var(--ok)':dx<-40?'0 0 0 3px var(--bad)':'';});
  const up=()=>{if(x0==null)return;x0=null;card.style.transition='transform .2s';if(Math.abs(dx)>90)swAnswer(dx>0);else{card.style.transform='';card.style.boxShadow='';}};
  card.addEventListener('pointerup',up);card.addEventListener('pointercancel',up);}
function swipeSummary(){const box=$('#swipeBox'),ok=SW.ans.filter(a=>a.ok).length,n=SW.ans.length,fp=SW.ans.filter(a=>!a.c.s&&!a.ok).length,fn=SW.ans.filter(a=>a.c.s&&!a.ok).length;
  box.append(el('div',{class:'card',style:'text-align:center'},el('span',{class:'eyebrow',text:'Итог раунда'}),el('b',{style:'font:600 3.2rem var(--f)',text:ok+' / '+n}),
    el('p',{class:'muted',text:ok===n?'Безупречно: вас не обмануть уведомлением.':ok>=7?'Хорошо. Посмотрите на ошибки ниже: на них ловят чаще всего.':'Мошенникам пока легко. Пройдите ещё раунд и потренируйтесь на звонках.'}),
    el('p',{class:'small',text:'Поверили обману: '+fn+' · лишняя тревога на обычном сообщении: '+fp})));
  const wrong=SW.ans.filter(a=>!a.ok);
  if(wrong.length)box.append(el('div',{class:'card'},el('h3',{text:'Где была ошибка'}),wrong.map(a=>el('div',{class:'flag'},el('b',{text:a.c.f+' · '+(a.c.s?'мошенничество':'обычное сообщение')}),el('span',{class:'small',text:a.c.x}),el('span',{class:'small muted',text:a.c.w})))));
  box.append(el('div',{class:'row',style:'justify-content:center'},el('button',{class:'btn primary',onclick:startSwipe},'Ещё раунд'),el('button',{class:'btn',onclick:()=>setTrMode('call')},'К тренировочным звонкам')));}
document.addEventListener('keydown',e=>{if($('#tab-train').hidden||$('#swipeBox').hidden)return;if(/input|textarea|select/i.test(document.activeElement&&document.activeElement.tagName))return;
  if(!SW.rev&&SW.i<SW.deck.length){if(e.key==='ArrowLeft'){e.preventDefault();swAnswer(false);}if(e.key==='ArrowRight'){e.preventDefault();swAnswer(true);}}});

/* --- Схемы --- */
const SCH={cat:'all',q:''};
function renderSchemes(){
  const cats=$('#schCats');cats.innerHTML='';
  [['all','Все'],['new','Новое в 2026']].concat(Object.entries(CATS)).forEach(([k,t])=>cats.append(el('button',{class:'fchip','aria-pressed':String(SCH.cat===k),onclick:()=>{SCH.cat=k;renderSchemes();}},t)));
  const q=SCH.q.toLowerCase();
  let list=SCHEMES.filter(s=>(SCH.cat==='all'||(SCH.cat==='new'?s.n:s.c===SCH.cat))&&(!q||(s.t+' '+s.how+' '+s.p+' '+s.f.join(' ')).toLowerCase().includes(q)));
  if(S.aud)list=list.slice().sort((a,b)=>(b.a.includes(S.aud)?1:0)-(a.a.includes(S.aud)?1:0));
  const box=$('#schList');box.innerHTML='';
  if(!list.length){box.append(el('p',{class:'muted',text:'Ничего не нашлось. Попробуйте другое слово.'}));return;}
  list.forEach(s=>{const tr=s.tr;
    box.append(el('article',{class:'scheme'},
      el('div',{class:'row'},s.n?el('span',{class:'tag warn',text:'Новое в 2026'}):null,el('span',{class:'tag',text:CATS[s.c]}),S.aud&&s.a.includes(S.aud)?el('span',{class:'tag acc',text:'Для вас'}):null),
      el('h3',{text:s.t}),el('p',{class:'small',text:s.how}),el('div',{class:'phrase',text:'«'+s.p+'»'}),
      el('details',{},el('summary',{},'Признаки и что делать'),el('div',{class:'g2',style:'gap:10px'},el('div',{class:'stack',style:'gap:4px'},el('b',{class:'small',text:'Признаки'}),el('ul',{class:'clean small'},s.f.map(x=>el('li',{text:x})))),el('div',{class:'stack',style:'gap:4px'},el('b',{class:'small',text:'Что делать'}),el('ul',{class:'clean small'},s.d.map(x=>el('li',{text:x})))))),
      el('div',{class:'row foot-row',style:'justify-content:space-between;align-items:end'},srcLink(s.src),tr?el('button',{class:'btn sm',onclick:()=>tr[0]==='swipe'?(showTab('train'),setTrMode('swipe')):openSim(tr[0],tr[1])},'Потренироваться'):null)));});}
$('#schQ').addEventListener('input',e=>{SCH.q=e.target.value.trim();renderSchemes();});

/* --- Защита (самоотчёт, в индекс не входит) --- */
function renderProt(){const box=$('#protList');box.innerHTML='';
  PROT.forEach(p=>{const on=!!S.prot[p.id];
    box.append(el('div',{class:'prot'+(on?' done':'')},
      el('div',{class:'stack',style:'gap:6px'},el('h3',{text:p.t}),el('span',{class:'small muted',text:p.where+' · '+p.time}),el('p',{text:p.d}),
        el('details',{},el('summary',{class:'small',style:'cursor:pointer;color:var(--accent);font-weight:600'},'Как сделать'),el('ol',{class:'small',style:'margin:6px 0 0;padding-left:18px;display:grid;gap:4px'},p.how.map(h=>el('li',{text:h})))),srcLink(p.src)),
      el('div',{class:'stack',style:'justify-items:center;gap:4px'},el('button',{class:'sw',role:'switch','aria-checked':String(on),'aria-label':'Сделано: '+p.t,onclick:()=>{S.prot[p.id]=!on;save();renderProt();}}),el('span',{class:'tiny muted',text:on?'сделано':'не сделано'}))));});
  $('#protScore').textContent='Сделано: '+PROT.filter(p=>S.prot[p.id]).length+' из '+PROT.length;}
function renderLaws(){const box=$('#lawList');box.innerHTML='';LAWS.forEach(l=>box.append(el('div',{class:'stack',style:'gap:6px;border-top:3px solid var(--accent);padding-top:10px'},el('h3',{text:l.t}),el('p',{class:'small',text:l.d}),srcLink(l.s))));}
function renderEmerg(){const ol=$('#emSteps');ol.innerHTML='';EMERG.forEach(([t,d])=>ol.append(el('li',{},el('div',{},el('b',{text:t}),el('span',{class:'small muted',text:d})))));$('#emNote').innerHTML='';$('#emNote').append('Не стыдитесь: мошенники работают командами по отработанным сценариям, попасться может каждый. Это памятка, а не юридическая консультация: правила меняются, уточняйте в банке и на сайте Банка России. ',srcLink(['refund30','bankiros']));}
