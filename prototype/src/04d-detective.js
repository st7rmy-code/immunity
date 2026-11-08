/* ===== AI-детектив: сообщения, ссылки и письма в одной схеме ответа =====
   Схема (и у правил, и у ИИ): {risk_level, confidence 0..1|null, detected_indicators[], explanation,
   limitations[], recommended_actions[], avoid_actions[], sources[]} */
const RISK={unknown:{k:'',t:'Недостаточно данных',n:0},low:{k:'ok',t:'Низкий риск',n:1},medium:{k:'warn',t:'Средний риск',n:2},high:{k:'bad',t:'Высокий риск',n:3},critical:{k:'bad',t:'Критический риск',n:4}};
const CK={kind:'msg',MAX:10000,IMG_MB:10};
const CK_HELP={
  msg:'Вставьте текст СМС, переписки или перескажите звонок. Можно добавить скриншот. Сначала текст проверят правила прямо в браузере; ИИ получит его только после вашего согласия, с замаскированными личными данными.',
  url:'Вставьте адрес из сообщения. Страницу мы не открываем: проверяем только сам адрес. Если ссылка пришла с текстом, добавьте его ниже — так оценка точнее.',
  mail:'Скопируйте адрес отправителя, тему и текст письма. Вложения не открывайте и сюда не загружайте — достаточно их названий.'};

/* --- материал и проверка ввода --- */
function ckMaterial(){const k=CK.kind,body=$('#ckText').value;
  if(k==='url'){const u=$('#ckUrl').value.trim();return{kind:k,url:u,body,text:(u?'Ссылка: '+u:'')+(body.trim()?'\nТекст рядом со ссылкой:\n'+body:'')};}
  if(k==='mail'){const f=$('#ckFrom').value.trim(),sj=$('#ckSubj').value.trim();return{kind:k,from:f,subj:sj,body,text:(f?'От: '+f+'\n':'')+(sj?'Тема: '+sj+'\n':'')+(f||sj?'\n':'')+body};}
  return{kind:k,body,text:body};}
function ckValidate(m){const e=[];
  if(m.kind==='url'&&!m.url)e.push('Вставьте адрес ссылки');
  else if(!m.text.trim()&&!imgs.length)e.push('Вставьте текст или добавьте скриншот');
  if(m.text.length>CK.MAX)e.push('Текст длиннее '+CK.MAX.toLocaleString('ru-RU')+' символов — сократите до главного');
  if(imgs.length>2)e.push('Не больше двух скриншотов');
  return e;}

/* --- правила для ссылок --- */
const SHORTENERS=/^(bit\.ly|tinyurl\.com|clck\.ru|cutt\.ly|goo\.su|t\.co|is\.gd|vk\.cc|u\.to|qps\.ru|rebrand\.ly|shorturl\.at|tiny\.cc|ow\.ly)$/i;
const RISKY_TLD=/\.(top|click|site|online|xyz|icu|live|buzz|cfd|sbs|rest|fun|monster|win|vip|tk|ml|ga|cf|gq|shop|link)$/i;
const LURE_RE=/(gos|uslug|bank|pay|oplat|shtraf|fine|vhod|login|signin|verify|secure|bezopas|bonus|vyplat|kompens|podar|prize|robux|nalog|pensi|socfond|lk-|kabinet|cabinet|refund|vozvrat|dostavk|delivery|parkov|kvitanc|akci)/gi;
function hostOf(raw){let s=String(raw||'').trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i,'');const auth=s.split(/[\/?#]/)[0];const at=auth.lastIndexOf('@');const hp=at>=0?auth.slice(at+1):auth;const host=hp.replace(/:\d+$/,'').toLowerCase();return{host,hasAt:at>=0,port:(hp.match(/:(\d+)$/)||[])[1]||'',path:s.slice(auth.length)};}
function urlRules(raw){const hits=[];const s=String(raw||'').trim();if(!s)return hits;const add=(id,t,why,w,q)=>hits.push({id,title:t,explanation:why,w,quote:q||''});
  const {host,hasAt,port,path}=hostOf(s);
  if(!host||!/[.]/.test(host)){add('url_bad','Это не похоже на обычный адрес сайта','Проверьте, что ссылка скопирована целиком.',10,s.slice(0,60));return hits;}
  if(/^http:\/\//i.test(s))add('url_http','Нет защищённого соединения','Адрес начинается с http://. Настоящие банки и госсервисы так не работают. Но и https не доказывает, что сайт честный.',10,'http://');
  if(hasAt)add('url_at','Адрес замаскирован символом @','Всё, что стоит до @, браузер игнорирует: настоящий сайт — то, что после него.',35,'@');
  if(/^\d{1,3}(\.\d{1,3}){3}$/.test(host))add('url_ip','Вместо имени сайта — набор цифр','Организации не присылают ссылки на IP-адреса.',30,host);
  const cyr=/[а-яё]/i.test(host),lat=/[a-z]/i.test(host.replace(/\.(рф|рус)$/,''));
  if(cyr&&lat)add('url_mix','Русские и латинские буквы вперемешку','Так подделывают известные адреса: «а» и «a» выглядят одинаково.',40,host);
  if(/(^|\.)xn--/.test(host))add('url_puny','Адрес закодирован (xn--)','Под таким кодом могут прятаться буквы, похожие на латинские.',20,host);
  if(SHORTENERS.test(host))add('url_short','Короткая ссылка скрывает настоящий адрес','Куда она ведёт, не видно, пока не откроете. Не открывайте ссылки из неожиданных сообщений.',15,host);
  if(RISKY_TLD.test(host))add('url_tld','Доменная зона одноразовых сайтов','Такие зоны дёшевы и часто используются для фишинга. Само по себе это не доказательство.',20,'.'+host.split('.').pop());
  const lure=[...new Set((host.match(LURE_RE)||[]).map(x=>x.toLowerCase()))];
  if(lure.length)add('url_lure','Слова-приманки в адресе','«'+lure.slice(0,3).join('», «')+'» — так делают адрес похожим на сервис оплаты, госуслуг или банка.',20,lure[0]);
  const labels=host.split('.');if(labels.length>=4||(host.match(/-/g)||[]).length>=2)add('url_long','Длинный составной адрес','Много дефисов и поддоменов — частый признак поддельного сайта.',15,host);
  if(port&&!['80','443'].includes(port))add('url_port','Нестандартный порт','Обычные сайты не указывают порт в адресе.',15,':'+port);
  if(/\.(apk|exe|scr|msi|bat|js|zip|rar|7z)(\?|#|$)/i.test(path))add('url_file','Ссылка скачивает файл','Так распространяют вредоносные программы, в том числе для удалённого доступа к телефону.',40,(path.match(/[^\/?#]+\.(apk|exe|scr|msi|bat|js|zip|rar|7z)/i)||[''])[0]);
  return hits;}
/* --- правила для писем --- */
const FREE_MAIL=/^(gmail\.com|mail\.ru|bk\.ru|inbox\.ru|list\.ru|internet\.ru|yandex\.(ru|com)|ya\.ru|rambler\.ru|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i;
const ORG_RE=/(банк|госуслуг|налог|фнс|пенсион|соцфонд|социальн\S* фонд|полици|мвд|фсб|суд\b|судебн|приставы|фссп|центробанк|банк росси|росфинмониторинг|служба поддержки|служба безопасности|администраци|ведомств)/i;
function mailRules(m){const hits=[];const add=(id,t,why,w,q)=>hits.push({id,title:t,explanation:why,w,quote:q||''});
  const addr=(m.from.match(/[\w.+-]+@([\w.-]+\.[a-zа-я]{2,})/i)||[]);const dom=(addr[1]||'').toLowerCase();
  const claimsOrg=ORG_RE.test(m.from+' '+m.subj+' '+m.body);
  if(dom&&FREE_MAIL.test(dom)&&claimsOrg)add('mail_free','«Организация» пишет с бесплатной почты','Банки и ведомства пишут со своих доменов, а не с личных ящиков.',35,addr[0]);
  if(dom){urlRules(dom).filter(h=>['url_tld','url_lure','url_mix','url_puny','url_long'].includes(h.id)).forEach(h=>hits.push(Object.assign({},h,{id:'mail_'+h.id,title:'Адрес отправителя: '+h.title.toLowerCase(),w:Math.round(h.w*.8)})));}
  else if(m.from)add('mail_noaddr','Не видно адреса отправителя','Посмотрите полный адрес, а не только имя: имя можно написать любое.',5,'');
  const att=(m.subj+' '+m.body).match(/[^\s«»"']+\.(zip|rar|7z|exe|apk|scr|js|iso|html?|docm|xlsm)\b|вложени\S*|архив\S*/i);
  if(att)add('mail_attach','Предлагают открыть вложение','Во вложениях к таким письмам часто прячут вредоносные программы или поддельные формы входа.',30,att[0]);
  return hits;}

/* --- результат правил в общей схеме --- */
const ACT={codes:'Никому не называйте код — положите трубку или закройте переписку',safe:'Позвоните в банк сами по номеру с обратной стороны карты',auth:'Перезвоните в организацию по номеру с официального сайта, а не по номеру из сообщения',link:'Нужный сервис откройте сами — через приложение или закладку',url:'Не открывайте ссылку; нужный сервис откройте сами — через приложение или закладку',kin:'Позвоните человеку на номер, который знаете сами',drops:'Откажитесь: приём и пересылка чужих денег — уголовная статья',invest:'Проверьте компанию в справочнике участников финрынка на сайте Банка России',app:'Не устанавливайте программы по просьбе собеседника',cash:'Не передавайте наличные курьерам и не вносите их через банкомат по инструкции',wrong:'Предложите «отправителю» вернуть деньги через его банк',mail:'Не отвечайте на письмо и не открывайте вложения',prize:'Не платите «комиссию» за выигрыш или выплату'};
function rulesSchema(m){
  const bodyText=m.kind==='url'?m.body:m.kind==='mail'?(m.subj?m.subj+'\n':'')+m.body:m.text,lc=localCheck(bodyText);
  let hits=lc.hits.filter(h=>!(m.kind==='url'&&h.f.id==='link')).map(h=>({id:h.f.id,title:h.f.t,quote:h.ms[0][0],explanation:h.f.why,w:h.f.w,tr:h.f.tr}));
  if(m.kind==='url')hits=urlRules(m.url).concat(hits);
  if(m.kind==='mail')hits=mailRules(m).concat(hits);
  hits.sort((a,b)=>b.w-a.w);
  const score=Math.min(100,hits.reduce((a,h)=>a+h.w,0)),n=hits.length;
  const level=!n?'unknown':score>=75?'critical':score>=45?'high':score>=20?'medium':'low';
  const conf=!n?null:n===1?.45:n===2?.6:n===3?.7:.8;
  const ids=new Set(hits.map(h=>h.id.startsWith('url_')?'url':h.id.startsWith('mail_')?'mail':h.id));
  const rec=[...ids].map(i=>ACT[i]).filter(Boolean).slice(0,3);
  if(!rec.length)rec.push('Если сомневаетесь, свяжитесь с организацией или человеком по известному вам номеру');
  const lim=['Правила ищут типовые фразы и приметы адресов. Контекст, иронию и новые схемы они не понимают.'];
  if(m.kind==='url')lim.push('Страницу никто не открывал: проверен только адрес. Замок и https не означают, что сайт честный.');
  if(m.kind==='mail')lim.push('Адрес отправителя можно подделать, поэтому проверка по нему не окончательная.');
  if(!n)lim.unshift('Типовых признаков не нашлось, но это не значит, что всё безопасно.');
  if(imgs.length)lim.push('Скриншоты правила не читают — их разберёт только ИИ.');
  return{risk_level:level,confidence:conf,detected_indicators:hits.slice(0,6),explanation:!n?'Правила не нашли типовых признаков обмана. Оценить риск без контекста нельзя.':level==='critical'||level==='high'?'Найдены сильные признаки мошеннической схемы.':'Есть отдельные признаки, характерные для обмана. Проверьте через независимый канал.',
    limitations:lim,recommended_actions:rec,avoid_actions:['Не сообщайте коды из СМС, пароли и данные карты','Не переводите деньги и не берите кредиты по чужой просьбе',m.kind==='mail'?'Не открывайте вложения и ссылки из письма':'Не переходите по ссылкам из сообщения и ничего там не вводите'],sources:[],score,hits:lc.hits};}

/* --- нормализация ответа ИИ: только допустимые значения, цитаты — только дословные --- */
const squash=t=>String(t||'').toLowerCase().replace(/[«»"'“”„]/g,'').replace(/\s+/g,' ').trim();
function normSchema(j,material){j=j&&typeof j==='object'?j:{};
  const lv=String(j.risk_level||'').toLowerCase().trim(),level=RISK[lv]?lv:'unknown';
  let c=typeof j.confidence==='string'?parseFloat(j.confidence.replace(',','.')):+j.confidence;
  if(!Number.isFinite(c))c=null;else{if(c>1)c=c/100;c=Math.max(0,Math.min(1,c));}
  const arr=(x,n)=>(Array.isArray(x)?x:[]).filter(v=>v!=null&&v!=='').slice(0,n);
  const mat=squash(material);
  const ind=arr(j.detected_indicators,5).filter(i=>i&&typeof i==='object').map(i=>{let q=String(i.quote||'').slice(0,200);if(q&&!mat.includes(squash(q)))q='';return{id:String(i.id||'').slice(0,40),title:String(i.title||'').slice(0,140),quote:q,explanation:String(i.explanation||'').slice(0,400)};}).filter(i=>i.title);
  const strs=x=>arr(x,4).map(v=>String(v).slice(0,300));
  let lim=strs(j.limitations);if(!lim.length)lim=['ИИ видит только присланный материал: он не может проверить номер, сайт или собеседника и иногда ошибается.'];
  if(!RISK[lv])lim.unshift('ИИ ответил не по схеме, поэтому уровень риска не определён.');
  return{risk_level:level,confidence:c,detected_indicators:ind,explanation:String(j.explanation||'').slice(0,600),limitations:lim,recommended_actions:strs(j.recommended_actions),avoid_actions:strs(j.avoid_actions),sources:arr(j.source_ids,4).map(String).filter(k=>SRC[k])};}

/* --- отображение в одной схеме --- */
function riskScale(level){const n=RISK[level].n,k=RISK[level].k;return el('div',{class:'rscale','aria-hidden':'true'},['low','medium','high','critical'].map(l=>el('i',{class:n&&RISK[l].n<=n?'on '+k:''})));}
function renderVerdict(box,r,meta){box.innerHTML='';const v=RISK[r.risk_level],ai=meta.engine==='ai';
  box.append(el('div',{class:'ph'},el('h2',{text:meta.title}),el('span',{class:'small faint',text:ai?'мнение ИИ, не факт':'правила в браузере, без ИИ'})));
  box.append(el('div',{class:'rl'},riskScale(r.risk_level),el('div',{class:'stack',style:'gap:2px'},el('b',{class:'rl-t '+v.k,text:v.t}),
    el('span',{class:'small muted',text:r.confidence==null?(ai?'Уверенность модель не указала':'Уверенность не оценивается — нет признаков'):'Уверенность '+(ai?'модели':'правил')+': '+Math.round(r.confidence*100)+'%'}))));
  if(r.explanation)box.append(el('p',{text:r.explanation}));
  if(meta.pii)box.append(meta.pii);
  if(r.detected_indicators.length)box.append(el('div',{class:'stack'},r.detected_indicators.map(i=>el('div',{class:'flag'},el('b',{text:i.title}),i.quote?el('q',{text:i.quote}):null,el('span',{class:'small muted',text:i.explanation})))));
  if(meta.after)meta.after.forEach(x=>x&&box.append(x));
  const lst=(h,a)=>a.length?el('div',{class:'stack',style:'gap:6px'},el('h3',{text:h}),el('ul',{class:'clean'},a.map(x=>el('li',{text:x})))):null;
  if(r.recommended_actions.length||r.avoid_actions.length)box.append(el('div',{class:'g2'},lst('Что сделать',r.recommended_actions),lst('Чего не делать',r.avoid_actions)));
  box.append(el('div',{class:'lim'},el('b',{class:'small',text:'Ограничения анализа'}),el('ul',{class:'clean small'},r.limitations.map(x=>el('li',{text:x})))));
  if(r.sources.length)box.append(el('div',{class:'stack',style:'gap:4px'},r.sources.map(srcLink)));
  if(meta.notes)meta.notes.filter(Boolean).forEach(n=>box.append(el('p',{class:'small faint',text:n})));}
function piiNote(m){const f=Privacy.mask(m.text).found;if(!Object.keys(f).length)return null;
  return el('div',{class:'verdict ok pii'},el('b',{class:'small',text:'В тексте есть личные данные'}),el('span',{class:'small',text:Privacy.summary(f).replace('Скрыли автоматически:','Нашли:').replace(/\.$/,'')+'. Правила проверяют их только в браузере, а перед отправкой ИИ они будут скрыты'+(f.email?' (у адреса почты останется только домен — он нужен для проверки)':'')+'.'}));}

/* --- быстрая проверка (правила) --- */
function renderLocal(){const m=ckMaterial(),c=$('#ckLocal');c.innerHTML='';$('#ckCount').textContent=m.text.length.toLocaleString('ru-RU')+' / '+CK.MAX.toLocaleString('ru-RU');$('#ckCount').style.color=m.text.length>CK.MAX?'var(--bad)':'';
  if(!m.text.trim()){c.append(el('div',{class:'ph'},el('h2',{text:'Быстрая проверка'}),el('span',{class:'small faint',text:'правила, без ИИ'})),el('p',{class:'muted small',text:m.kind==='url'?'Вставьте адрес — признаки подделки появятся здесь сразу.':'Вставьте текст — признаки обмана подсветятся здесь сразу.'}));return;}
  const r=rulesSchema(m);
  const top=r.hits.slice().sort((a,b)=>b.f.w-a.f.w).find(h=>h.f.tr);
  renderVerdict(c,r,{engine:'rules',title:'Быстрая проверка',pii:piiNote(m),after:[r.hits.length&&m.kind!=='url'?highlight(m.kind==='mail'?(m.subj?m.subj+'\n':'')+m.body:m.body,r.hits):null,top?trainBtn(top.f.tr):m.kind==='url'&&r.detected_indicators.length?trainBtn(['site','site_gov']):null]});}
let ckTimer;['#ckText','#ckUrl','#ckFrom','#ckSubj'].forEach(s=>$(s).addEventListener('input',()=>{clearTimeout(ckTimer);ckTimer=setTimeout(renderLocal,250);}));
function setCkKind(k){CK.kind=k;$$('#ckKind button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));
  $('#ckHelp').textContent=CK_HELP[k];$('#ckUrlRow').hidden=k!=='url';$('#ckMailRow').hidden=k!=='mail';
  const lbl=$('#ckTextLbl');lbl.textContent=k==='mail'?'Текст письма':k==='url'?'Текст рядом со ссылкой (необязательно)':'Текст для проверки';lbl.className=k==='msg'?'sr-label':'';
  $('#ckText').rows=k==='url'?4:9;$('#ckAI').hidden=true;renderLocal();}
$$('#ckKind button').forEach(b=>b.onclick=()=>setCkKind(b.dataset.k));
const EXAMPLES=[
 {n:'Звонок «из банка»',k:'msg',t:'Звонящий: Здравствуйте, служба безопасности банка. С вашей карты пытаются перевести 48 700 ₽. Чтобы отменить, продиктуйте код из СМС.\nЯ: А кто вы?\nЗвонящий: Старший специалист. Время идёт, операцию нужно срочно отменить. И никому не сообщайте о звонке.'},
 {n:'Подработка',k:'msg',t:'Привет! Есть подработка для студентов: будешь принимать переводы на свою карту и переводить их на счёт компании, 5% с каждого перевода твои. Оформи ещё одну карту — заказов будет больше.'},
 {n:'Мама с нового номера',k:'msg',t:'Мам привет, это мой новый номер, старый разбил. Срочно нужно 8 000, скинь на карту друга, потом объясню'},
 {n:'«Росфинмониторинг»',k:'msg',t:'Уведомление Росфинмониторинга: ваш счёт связан с финансированием терроризма. Для снятия ограничений оплатите сбор 4 900 ₽ в течение 24 часов или позвоните специалисту.'},
 {n:'Ссылка на «штраф»',k:'url',u:'http://shtraf-parkovka-oplata.top/pay',t:'Зафиксирована неоплата парковки. Штраф 5 000 ₽. Оплатите со скидкой 50% до 23:59.'},
 {n:'Письмо «из банка»',k:'mail',f:'Служба безопасности банка <bank.security24@gmail.com>',s:'Срочно: ваш счёт будет заблокирован',t:'Уважаемый клиент! Зафиксирована подозрительная активность. Для сохранения доступа подтвердите данные по ссылке в течение 24 часов или откройте вложение «Акт_проверки.zip».'},
 {n:'Обычное сообщение',k:'msg',t:'Привет! Завтра собираемся у Лены в 19:00, возьми, пожалуйста, гитару 🙂'}];
EXAMPLES.forEach(x=>$('#ckEx').append(el('button',{class:'btn sm ghost',onclick:()=>{$('#ckText').value=x.t;$('#ckUrl').value=x.u||'';$('#ckFrom').value=x.f||'';$('#ckSubj').value=x.s||'';setCkKind(x.k);}},x.n)));
$('#ckText').value=EXAMPLES[0].t;

/* --- разбор ИИ --- */
$('#ckGo').onclick=async()=>{const m=ckMaterial(),errs=ckValidate(m);if(errs.length){toast(errs[0]);return;}
  const box=$('#ckAI');box.hidden=false;box.innerHTML='';
  const toLocal=el('button',{class:'btn sm',onclick:()=>$('#ckLocal').scrollIntoView({behavior:'smooth',block:'start'})},'К результату правил');
  if(!AI.ready||AI.limited()){box.append(el('div',{class:'verdict warn'},el('b',{text:'AI-детектив сейчас недоступен'}),el('span',{text:AI.label()+'. Результат правил в той же схеме — в блоке «Быстрая проверка».'}),el('div',{class:'row'},toLocal)));return;}
  const c=await Privacy.confirm({text:m.text,images:imgs,purpose:'разбор'});if(!c.ok){box.hidden=true;return;}
  box.append(el('div',{class:'ph'},el('h2',{text:'Разбор AI-детектива'}),el('span',{class:'small muted',text:'Анализирую… обычно до минуты'})));box.scrollIntoView({behavior:'smooth',block:'start'});$('#ckGo').disabled=true;
  const r=await Mentor.analyze(m.kind,c.text,imgs);$('#ckGo').disabled=false;box.innerHTML='';
  if(!r.ok){box.append(el('div',{class:'verdict warn'},el('b',{text:'AI-детектив не ответил'}),el('span',{text:AI.msg(r.err)+' Пока ориентируйтесь на результат правил — он в той же схеме.'}),el('div',{class:'row'},toLocal)));return;}
  const res=normSchema(r.data,c.text),pf=Privacy.mask(m.text).found;
  renderVerdict(box,res,{engine:'ai',title:'Разбор AI-детектива',notes:[Object.keys(pf).length?Privacy.summary(pf).replace(/\.$/,'')+' перед отправкой.':null,r.note,'ИИ может ошибаться. При сомнении положите трубку и свяжитесь с организацией сами по официальному номеру.']});};

/* --- экстренный режим на главной --- */
const EM_SIT=[
 {id:'call',t:'Звонят «из банка», полиции или ведомства',s:'требуют код, перевод или «сохранить деньги»',steps:[
   ['Положите трубку','Без объяснений. Вежливость здесь не нужна, а разговор — главный инструмент мошенника.'],
   ['Ничего не называйте и не переводите','Ни кодов, ни данных карты, ни «безопасных счетов», ни установки приложений — что бы ни говорили про «следствие» или «отмену операции».'],
   ['Позвоните в банк сами','По номеру с обратной стороны карты или из приложения банка. Скажите, что вам звонили от его имени.'],
   ['Если пугали делом или проверкой','Следователи и полиция вызывают повесткой и не решают вопросы по телефону, а Банк России и Росфинмониторинг не звонят гражданам.']],tr:['call','bank_safe']},
 {id:'kin',t:'Пишет «родственник» или «начальник»',s:'просит срочно перевести деньги',steps:[
   ['Не переводите, пока не проверите','Срочность — часть сценария. Пара минут на проверку ничего не испортит.'],
   ['Позвоните на номер, который знаете сами','Не отвечайте в этом же чате и не звоните на номер, с которого пишут.'],
   ['Спросите то, что знаете только вы двое','Или кодовое слово семьи, если оно есть.'],
   ['Голосу и видео не верьте на слово','Их можно подделать нейросетью. На слух подделку надёжно не распознать — поможет только проверка через другой канал.']],tr:['chat','daughter_voice']},
 {id:'code',t:'Просят код из СМС или пуш-уведомления',s:'«курьер», «поликлиника», «оператор», «Госуслуги»',steps:[
   ['Никому не называйте код','Код — это ваша подпись: им подтверждают вход в аккаунт, перевод или смену номера.'],
   ['Закончите разговор','Настоящим курьерам, врачам и операторам код из СМС не нужен.'],
   ['Если уже назвали код от Госуслуг','Восстановите доступ и смените пароль, проверьте «Действия в системе» и доверенности, поставьте самозапрет на кредиты.'],
   ['Если назвали банковский код','Сразу звоните в банк и просите заблокировать карту и онлайн-банк.']],tr:['call','gos_hack']},
 {id:'link',t:'Прислали ссылку или QR-код',s:'оплатить штраф, получить выплату, войти в кабинет',steps:[
   ['Не открывайте и ничего не вводите','Особенно данные карты, коды и пароли.'],
   ['Откройте сервис сами','Через официальное приложение или сохранённую закладку, а не по ссылке.'],
   ['Если уже ввели данные карты','Позвоните в банк и заблокируйте карту. Если ввели пароль — смените его везде, где он совпадает.'],
   ['Проверьте адрес здесь','AI-детектив посмотрит ссылку, не открывая страницу.']],tr:['site','site_fine'],check:'url'},
 {id:'invest',t:'Предлагают инвестиции или лёгкий заработок',s:'гарантированный доход, «пополни, чтобы вывести»',steps:[
   ['Ничего не переводите','Ни «на депозит», ни «комиссию», ни «налог за вывод».'],
   ['Проверьте компанию','В справочнике участников финансового рынка на сайте Банка России.'],
   ['Помните главный признак','Гарантированный высокий доход и «вывод только после доплаты» — так работают пирамиды и фальшивые брокеры.'],
   ['Если зовут принимать переводы на карту','Откажитесь: это вербовка в дропы, за это грозит уголовная ответственность.']],tr:['chat','invest']},
 {id:'money',t:'Я уже перевёл деньги или назвал код',s:'действовать в первые минуты',em:true}];
function openSituation(x){
  if(x.em){const ol=el('ol',{class:'steps'},EMERG.map(([t,d])=>el('li',{},el('div',{},el('b',{text:t}),el('span',{class:'small muted',text:d})))));
    let close;close=modal('Если вы уже попались',el('div',{class:'stack',style:'gap:12px'},el('p',{class:'small',text:'Начните с первого шага прямо сейчас — чем раньше банк узнает, тем больше шансов остановить перевод.'}),ol,el('p',{class:'small muted',text:'Не стыдитесь: мошенники работают командами по отработанным сценариям, попасться может каждый.'}),el('div',{class:'row'},el('button',{class:'btn',onclick:()=>{close();showTab('protect');setTimeout(()=>$('#emergency').scrollIntoView({behavior:'smooth'}),60);}},'Открыть в разделе «Защита»'))));return;}
  const ol=el('ol',{class:'steps'},x.steps.map(([t,d])=>el('li',{},el('div',{},el('b',{text:t}),el('span',{class:'small muted',text:d})))));
  let close;const sc=x.tr&&scenarioById(x.tr[0],x.tr[1]);
  close=modal(x.t,el('div',{class:'stack',style:'gap:12px'},ol,
    el('div',{class:'row'},el('button',{class:'btn primary',onclick:()=>{close();showTab('mentor');setMentorTab('check');if(x.check)setCkKind(x.check);setTimeout(()=>(x.check==='url'?$('#ckUrl'):$('#ckText')).focus(),80);}},x.check==='url'?'Проверить ссылку':'Проверить сообщение'),
      el('button',{class:'btn',onclick:()=>{close();openSituation(EM_SIT.find(s=>s.em));}},'Уже перевёл или назвал код')),
    sc?el('p',{class:'tiny faint'},'Когда всё уляжется, потренируйтесь на похожем сценарии: ',el('a',{href:'#',onclick:e=>{e.preventDefault();close();x.tr[0]==='site'?openSite(x.tr[1]):openSim(x.tr[0],x.tr[1]);}},sc.t)):null));}
function renderEmergencyGrid(){const g=$('#emergencyGrid');if(!g)return;g.innerHTML='';
  EM_SIT.forEach(x=>g.append(el('button',{class:'embtn'+(x.em?' urgent':''),onclick:()=>openSituation(x)},el('b',{text:x.t}),el('span',{text:x.s}))));}

$('#heroEm').onclick=()=>{const c=$('#emCard');c.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>{const b=c.querySelector('.embtn');b&&b.focus({preventScroll:true});},400);};
