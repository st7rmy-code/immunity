/* ===== AI-детектив: сообщения, ссылки и письма в одной схеме ответа =====
   Схема (и у правил, и у ИИ): {risk_level, confidence 0..1|null, detected_indicators[], explanation,
   limitations[], recommended_actions[], avoid_actions[], sources[]} */
const RISK=dict({unknown:{k:'',t:'Недостаточно данных',n:0},low:{k:'ok',t:'Низкий риск',n:1},medium:{k:'warn',t:'Средний риск',n:2},high:{k:'bad',t:'Высокий риск',n:3},critical:{k:'bad',t:'Критический риск',n:4}});
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

/* --- уровни признаков: критические решают сами, остальные складываются по правилам приоритета --- */
const TIER=dict({critical:{t:'критический',n:4,k:'bad'},strong:{t:'сильный',n:3,k:'bad'},medium:{t:'средний',n:2,k:'warn'},weak:{t:'слабый',n:1,k:''}});
const FLAG_TIER=dict({codes:'critical',safe:'critical',app:'critical',cash:'critical',drops:'strong',invest:'strong',kin:'strong',wrong:'strong',inject:'strong',auth:'medium',secret:'medium',prize:'medium',prepay:'medium',rush:'weak',link:'weak'});
const INJECT_RE=/((игнорируй|забудь|не учитывай|ignore|disregard)\s+(все\s+|all\s+)?(предыдущ|прежн|previous|prior|above)\S*\s*(инструкц|указан|правил|instructions|rules)\S*|system\s*prompt|системн\S*\s+(промпт|инструкц)\S*|ты\s+теперь\s+\S+|(ответь|скажи|оцени|верни)\S*,?\s+что\s+(это\s+)?(безопасн|не мошенн)\S*|risk_level)/gi;
/* предупреждение вида «никому не сообщайте код» — это не просьба, а совет */
const NEG_BEFORE=/(^|[^а-яё])(не|никому|никогда|нельзя|ни в коем случае)([^а-яё.!?]+[а-яё]+){0,3}[^а-яё.!?]*$/i;
function negated(text,idx){return NEG_BEFORE.test(text.slice(Math.max(0,idx-40),idx));}

/* --- разбор адреса: WHATWG URL + декодирование IDN (punycode, RFC 3492) --- */
function punyDecode(s){const base=36,tmin=1,tmax=26,skew=38,damp=700;let n=128,i=0,bias=72;const out=[];let b=s.lastIndexOf('-');if(b<0)b=0;
  for(let j=0;j<b;j++){if(s.charCodeAt(j)>=128)return null;out.push(s.charCodeAt(j));}
  for(let idx=b>0?b+1:0;idx<s.length;){const oldi=i;let w=1;for(let k=base;;k+=base){if(idx>=s.length)return null;const c=s.charCodeAt(idx++);const d=c-48<10?c-22:c-65<26?c-65:c-97<26?c-97:base;if(d>=base)return null;i+=d*w;const t=k<=bias?tmin:k>=bias+tmax?tmax:k-bias;if(d<t)break;w*=base-t;if(w>1e9)return null;}
    const len=out.length+1;let delta=i-oldi;delta=Math.floor(oldi===0?delta/damp:delta/2);delta+=Math.floor(delta/len);let k=0;while(delta>((base-tmin)*tmax)>>1){delta=Math.floor(delta/(base-tmin));k+=base;}bias=k+Math.floor((base-tmin+1)*delta/(delta+skew));
    n+=Math.floor(i/len);i%=len;if(n>0x10ffff)return null;out.splice(i++,0,n);}
  return String.fromCodePoint(...out);}
function hostUnicode(host){return host.split('.').map(l=>/^xn--/i.test(l)?(punyDecode(l.slice(4))||l):l).join('.');}
const scriptsOf=t=>({lat:/[a-z]/i.test(t),cyr:/[а-яё]/i.test(t),grk:/[α-ω]/i.test(t)});
const CYR_LOOKALIKE=/^[аеорсухкмтвнi\d-]+$/i;
function parseUrl(raw){let s=String(raw||'').trim();if(!s)return null;
  const scheme=(s.match(/^([a-z][a-z0-9+.-]*):/i)||[])[1];
  if(scheme&&!/^https?$/i.test(scheme)&&!/^\/\//.test(s.slice(scheme.length+1)))return{scheme:scheme.toLowerCase(),raw:s,opaque:true};
  if(!scheme)s='http://'+s.replace(/^\/\//,'');
  let u;try{u=new URL(s);}catch(e){return{bad:true,raw:s};}
  const host=u.hostname.toLowerCase();return{u,scheme:u.protocol.slice(0,-1),host,uhost:hostUnicode(host),explicit:!!scheme,raw:s};}
const SHORTENERS=/^(bit\.ly|tinyurl\.com|clck\.ru|cutt\.ly|goo\.su|t\.co|is\.gd|vk\.cc|u\.to|qps\.ru|rebrand\.ly|shorturl\.at|tiny\.cc|ow\.ly)$/i;
const RISKY_TLD=/\.(top|click|site|online|xyz|icu|live|buzz|cfd|sbs|rest|fun|monster|win|vip|tk|ml|ga|cf|gq|shop|link)$/i;
const LURE_RE=/(gos|uslug|bank|pay|oplat|shtraf|fine|vhod|login|signin|verify|secure|bezopas|bonus|vyplat|kompens|podar|prize|robux|nalog|pensi|socfond|lk-|kabinet|cabinet|refund|vozvrat|dostavk|delivery|parkov|kvitanc|akci)/gi;
const REDIR_KEYS=/^(url|redirect|redirect_uri|redirect_url|next|to|goto|return|returnurl|r|u|target|dest|destination|link|out)$/i;
function urlRules(raw){const hits=[];const P=parseUrl(raw);if(!P)return hits;const add=(id,tier,t,why,q)=>hits.push({id,tier,title:t,explanation:why,quote:q||''});
  if(P.opaque){const dang=/^(javascript|data|vbscript|file|blob|intent|content)$/.test(P.scheme);add('url_scheme',dang?'critical':'medium',dang?'Опасный тип ссылки':'Необычный тип ссылки',dang?'Такие ссылки выполняют код или открывают файлы на устройстве. Не открывайте.':'Это не обычная веб-ссылка. Убедитесь, что понимаете, что она откроет.',P.scheme+':');return hits;}
  if(P.bad||!P.host){add('url_bad','weak','Адрес не разобрать','Проверьте, что ссылка скопирована целиком.',String(raw).slice(0,60));return hits;}
  const {u,host,uhost}=P;
  if(u.username||u.password)add('url_at','critical','В адрес спрятаны логин или «@»','Всё, что стоит до @, браузер не считает адресом сайта: настоящий сайт — после @. Так маскируют поддельные страницы.',(u.username||'')+'@');
  if(P.explicit&&P.scheme==='http')add('url_http','weak','Нет защищённого соединения','Адрес начинается с http://. Но и https не доказывает, что сайт честный.','http://');
  const ip=/^\d{1,3}(\.\d{1,3}){3}$/.test(host)||host.startsWith('[');
  if(ip)add('url_ip','strong','Вместо имени сайта — IP-адрес','Организации не присылают ссылки на набор цифр.',host);
  if(!ip){const labels=uhost.split('.'),tld=labels[labels.length-1];
    const mixed=labels.find(l=>{const sc=scriptsOf(l);return (sc.lat&&sc.cyr)||(sc.grk&&(sc.lat||sc.cyr));});
    if(mixed)add('url_mix','strong','Буквы разных алфавитов в одном слове адреса','Так подделывают известные адреса: русская «о» и латинская «o» выглядят одинаково.',mixed);
    else{const cyrLike=labels.slice(0,-1).find(l=>scriptsOf(l).cyr&&CYR_LOOKALIKE.test(l));
      if(cyrLike&&!/^(рф|рус|москва|дети|сайт|онлайн)$/.test(tld))add('url_confusable','strong','Кириллица, похожая на латиницу','Адрес набран русскими буквами, которые выглядят как латинские, в нелатинской зоне.',cyrLike);}
    if(/(^|\.)xn--/.test(host)&&!mixed&&uhost!==host&&!scriptsOf(uhost).cyr)add('url_puny','medium','Адрес закодирован (xn--)','Под кодом могут быть символы, похожие на обычные буквы. Раскодированный адрес: '+uhost,host);
    if(SHORTENERS.test(host))add('url_short','weak','Короткая ссылка скрывает адрес','Куда она ведёт, не видно, пока не откроете.',host);
    const risky=RISKY_TLD.test(host);if(risky)add('url_tld','weak','Зона, популярная у одноразовых сайтов','Такие домены дёшевы. Сама по себе зона — не доказательство.','.'+tld);
    const lure=[...new Set((host.match(LURE_RE)||[]).map(x=>x.toLowerCase()))];
    if(lure.length)add('url_lure','weak','Слова-приманки в адресе','«'+lure.slice(0,3).join('», «')+'» — так адрес делают похожим на банк, оплату или госуслуги. У настоящих сервисов они тоже бывают.',lure[0]);
    const hy=(uhost.match(/-/g)||[]).length,deep=labels.length>=4;/* дефисы считаем в читаемом адресе: «xn--» у кириллических доменов — не признак */
    if(deep||hy>=2)add('url_long','weak','Длинный составной адрес','Много дефисов и поддоменов — частый приём поддельных сайтов.',host);
    if(lure.length&&(risky||hy>=2||deep))add('url_combo','strong','Приманка в одноразовом адресе','Слова «оплата», «вход», «госуслуги» в дешёвой зоне или в длинном составном адресе — типичный фишинг.',host);}
  if(u.port&&!['80','443'].includes(u.port))add('url_port','medium','Нестандартный порт','Обычные сайты не указывают порт в адресе.',':'+u.port);
  const file=(u.pathname.match(/[^\/]+\.(apk|exe|scr|msi|bat|cmd|js|vbs|jar|zip|rar|7z|iso|dmg)$/i)||[])[0];
  if(file)add('url_file','critical','Ссылка скачивает файл-программу','Так распространяют вредоносные программы, в том числе для удалённого доступа к телефону.',file);
  for(const [k,v] of u.searchParams){if(REDIR_KEYS.test(k)&&/^(https?:)?\/\/|^www\./i.test(v)||/^https?:\/\//i.test(v)){add('url_redirect','medium','Ссылка перенаправляет на другой адрес','Настоящий адрес назначения спрятан в параметре ссылки.',k+'='+v.slice(0,40));break;}}
  return hits;}
/* --- правила для писем --- */
const FREE_MAIL=/^(gmail\.com|mail\.ru|bk\.ru|inbox\.ru|list\.ru|internet\.ru|yandex\.(ru|com)|ya\.ru|rambler\.ru|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i;
const ORG_RE=/(банк|госуслуг|налог|фнс|пенсион|соцфонд|социальн\S* фонд|полици|мвд|фсб|судебн|приставы|фссп|центробанк|банк росси|росфинмониторинг|служба поддержки|служба безопасности|администраци|ведомств)/i;
function mailRules(m){const hits=[];const add=(id,tier,t,why,q)=>hits.push({id,tier,title:t,explanation:why,quote:q||''});
  const addr=(m.from.match(/[\w.+-]+@([\w.-]+\.[a-zа-я]{2,})/i)||[]);const dom=(addr[1]||'').toLowerCase();
  const claimsOrg=ORG_RE.test(m.from+' '+m.subj+' '+m.body);
  if(dom&&FREE_MAIL.test(dom)&&claimsOrg)add('mail_free','strong','«Организация» пишет с бесплатной почты','Банки и ведомства пишут со своих доменов, а не с личных ящиков.',addr[0]);
  if(dom){urlRules(dom).filter(h=>['url_tld','url_lure','url_mix','url_confusable','url_puny','url_long','url_combo'].includes(h.id)).forEach(h=>hits.push(Object.assign({},h,{id:'mail_'+h.id,title:'Адрес отправителя: '+h.title.toLowerCase()})));}
  else if(m.from)add('mail_noaddr','weak','Не видно адреса отправителя','Посмотрите полный адрес, а не только имя: имя можно написать любое.','');
  const mt=m.subj+' '+m.body,att=mt.match(/[^\s«»"']+\.(zip|rar|7z|exe|apk|scr|js|iso|html?|docm|xlsm)\b/i)||mt.match(/вложени\S*|архив\S*/i);
  if(att)add('mail_attach',/\.(exe|apk|scr|js|iso)\b/i.test(att[0])?'critical':'medium','Предлагают открыть вложение','Во вложениях к таким письмам прячут вредоносные программы или поддельные формы входа.',att[0]);
  return hits;}

/* --- результат правил: уровни и семантический приоритет вместо суммы баллов --- */
const ACT={codes:'Никому не называйте код — положите трубку или закройте переписку',safe:'Позвоните в банк сами по номеру с обратной стороны карты',auth:'Перезвоните в организацию по номеру с официального сайта, а не по номеру из сообщения',link:'Нужный сервис откройте сами — через приложение или закладку',url:'Не открывайте ссылку; нужный сервис откройте сами — через приложение или закладку',kin:'Позвоните человеку на номер, который знаете сами',drops:'Откажитесь: приём и пересылка чужих денег — уголовная статья',invest:'Проверьте компанию в справочнике участников финрынка на сайте Банка России',app:'Не устанавливайте программы по просьбе собеседника',cash:'Не передавайте наличные курьерам и не вносите их через банкомат по инструкции',wrong:'Предложите «отправителю» вернуть деньги через его банк',mail:'Не отвечайте на письмо и не открывайте вложения',prize:'Не платите «комиссию» за выигрыш или выплату',inject:'Не доверяйте тексту, который пытается управлять проверкой: это признак манипуляции'};
const STRENGTH_T={critical:'есть критические признаки',strong:'есть сильные признаки',medium:'есть признаки средней силы',weak:'только слабые признаки',none:'признаков не найдено'};
function levelFromTiers(c){if(c.critical)return'critical';if(c.strong)return'high';if(c.medium>=3)return'high';if(c.medium>=2||(c.medium===1&&c.weak>=1))return'medium';if(c.medium===1||c.weak)return'low';return'unknown';}
function rulesSchema(m){
  const bodyText=m.kind==='url'?m.body:m.kind==='mail'?(m.subj?m.subj+'\n':'')+m.body:m.text,lc=localCheck(bodyText);
  let hits=lc.hits.filter(h=>!(m.kind==='url'&&h.f.id==='link')).map(h=>{const idx=h.ms[0].index||0,neg=['codes','app','cash','safe'].includes(h.f.id)&&negated(bodyText,idx);
    return{id:h.f.id,tier:neg?'weak':(FLAG_TIER[h.f.id]||'medium'),title:neg?'Упоминание в предупреждении: '+h.f.t.toLowerCase():h.f.t,quote:h.ms[0][0],explanation:neg?'Фраза похожа на совет «не сообщать», а не на просьбу. Всё равно проверьте отправителя.':h.f.why,tr:h.f.tr};});
  INJECT_RE.lastIndex=0;const inj=INJECT_RE.exec(bodyText||'');if(inj)hits.push({id:'inject',tier:'strong',title:'Текст пытается управлять проверкой',quote:inj[0],explanation:'Честному сообщению незачем давать указания проверяющей программе. Это признак манипуляции.'});
  if(m.kind==='url')hits=urlRules(m.url).concat(hits);
  if(m.kind==='mail')hits=mailRules(m).concat(hits);
  hits.sort((a,b)=>TIER[b.tier].n-TIER[a.tier].n);
  const cnt={critical:0,strong:0,medium:0,weak:0};hits.forEach(h=>cnt[h.tier]++);
  const level=levelFromTiers(cnt),top=cnt.critical?'critical':cnt.strong?'strong':cnt.medium?'medium':cnt.weak?'weak':'none';
  const ids=new Set(hits.filter(h=>h.tier!=='weak'||hits.length===1).map(h=>h.id.startsWith('url_')?'url':h.id.startsWith('mail_')?'mail':h.id));
  const rec=[...ids].map(i=>own(ACT,i)?ACT[i]:null).filter(Boolean).slice(0,3);
  if(!rec.length)rec.push('Если сомневаетесь, свяжитесь с организацией или человеком по известному вам номеру');
  const lim=['Правила ищут типовые фразы и приметы адресов. Контекст, иронию и новые схемы они не понимают.'];
  if(m.kind==='url')lim.push('Страницу никто не открывал: проверен только адрес. Репутацию сайта, DNS и содержимое страницы тренажёр не проверяет. Замок и https не означают, что сайт честный.');
  if(m.kind==='mail')lim.push('Адрес отправителя можно подделать, поэтому проверка по нему не окончательная.');
  if(!hits.length)lim.unshift('Типовых признаков не нашлось, но это не значит, что всё безопасно.');
  if(imgs.length)lim.push('Скриншоты правила не читают — их разберёт только ИИ.');
  const expl=!hits.length?(m.kind==='url'?'В адресе нет типичных признаков подделки. Сам по себе адрес не доказывает, что сайт честный.':'Правила не нашли типовых признаков обмана. Оценить риск без контекста нельзя.'):level==='critical'?'Есть критический признак: так действуют мошенники, когда человек уже на шаг от потери денег или доступа.':level==='high'?'Найдены сильные признаки мошеннической схемы.':level==='medium'?'Есть признаки, характерные для обмана. Проверьте через независимый канал.':'Есть только слабые признаки. Само по себе это не говорит об обмане.';
  return{risk_level:level,confidence:null,strength:STRENGTH_T[top],detected_indicators:hits.slice(0,8),explanation:expl,
    limitations:lim,recommended_actions:rec,avoid_actions:['Не сообщайте коды из СМС, пароли и данные карты','Не переводите деньги и не берите кредиты по чужой просьбе',m.kind==='mail'?'Не открывайте вложения и ссылки из письма':'Не переходите по ссылкам из сообщения и ничего там не вводите'],sources:[],tiers:cnt,hits:lc.hits};}

/* --- нормализация ответа ИИ: только допустимые значения, цитаты — только дословные --- */
const squash=t=>String(t||'').toLowerCase().replace(/[«»"'“”„]/g,'').replace(/\s+/g,' ').trim();
function normSchema(j,material){j=j&&typeof j==='object'?j:{};
  const lv=String(j.risk_level||'').toLowerCase().trim(),level=own(RISK,lv)?lv:'unknown';
  let c=typeof j.confidence==='string'?parseFloat(j.confidence.replace(',','.')):+j.confidence;
  if(!Number.isFinite(c))c=null;else{if(c>1)c=c/100;c=Math.max(0,Math.min(1,c));}
  const arr=(x,n)=>(Array.isArray(x)?x:[]).filter(v=>v!=null&&v!=='').slice(0,n);
  const mat=squash(material);
  const ind=arr(j.detected_indicators,5).filter(i=>i&&typeof i==='object').map(i=>{let q=String(i.quote||'').slice(0,200);if(q&&!mat.includes(squash(q)))q='';return{id:String(i.id||'').slice(0,40),title:String(i.title||'').slice(0,140),quote:q,explanation:String(i.explanation||'').slice(0,400)};}).filter(i=>i.title);
  const strs=x=>arr(x,4).map(v=>String(v).slice(0,300));
  let lim=strs(j.limitations);if(!lim.length)lim=['ИИ видит только присланный материал: он не может проверить номер, сайт или собеседника и иногда ошибается.'];
  if(!own(RISK,lv))lim.unshift('ИИ ответил не по схеме, поэтому уровень риска не определён.');
  return{risk_level:level,confidence:c,detected_indicators:ind,explanation:String(j.explanation||'').slice(0,600),limitations:lim,recommended_actions:strs(j.recommended_actions),avoid_actions:strs(j.avoid_actions),sources:arr(j.source_ids,4).map(String).filter(k=>own(SRC,k))};}

/* --- отображение в одной схеме --- */
function riskScale(level){const n=RISK[level].n,k=RISK[level].k;return el('div',{class:'rscale','aria-hidden':'true'},['low','medium','high','critical'].map(l=>el('i',{class:n&&RISK[l].n<=n?'on '+k:''})));}
function renderVerdict(box,r,meta){box.innerHTML='';const v=RISK[r.risk_level],ai=meta.engine==='ai';
  box.append(el('div',{class:'ph'},el('h2',{text:meta.title}),el('span',{class:'small faint',text:ai?'мнение ИИ, не факт':'правила в браузере, без ИИ'})));
  box.append(el('div',{class:'rl'},riskScale(r.risk_level),el('div',{class:'stack',style:'gap:2px'},el('b',{class:'rl-t '+v.k,text:v.t}),
    el('span',{class:'small muted',text:ai?(r.confidence==null?'Уверенность модель не указала':'Модель оценивает свою уверенность как '+(r.confidence>=.75?'высокую':r.confidence>=.45?'среднюю':'низкую')+' (самооценка, не откалибрована)'):'Сила признаков: '+(r.strength||'признаков не найдено')}))));
  if(r.explanation)box.append(el('p',{text:r.explanation}));
  if(meta.pii)box.append(meta.pii);
  if(r.detected_indicators.length)box.append(el('div',{class:'stack'},r.detected_indicators.map(i=>el('div',{class:'flag'},el('div',{class:'row',style:'gap:8px;flex-wrap:wrap'},el('b',{text:i.title}),i.tier&&own(TIER,i.tier)?el('span',{class:'tag '+TIER[i.tier].k,text:TIER[i.tier].t}):null),i.quote?el('q',{text:i.quote}):null,el('span',{class:'small muted',text:i.explanation})))));
  if(meta.conflict)box.append(meta.conflict);
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
  const c=await Privacy.confirm({purpose:'проверка AI-детективом',key:'detective',parts:[{label:'Материал для проверки',text:m.text,user:true,edit:true}],images:imgs});if(!c.ok){box.hidden=true;return;}
  box.append(el('div',{class:'ph'},el('h2',{text:'Разбор AI-детектива'}),el('span',{class:'small muted',text:'Анализирую… обычно до минуты'})));box.scrollIntoView({behavior:'smooth',block:'start'});$('#ckGo').disabled=true;
  const r=await Mentor.analyze(m.kind,c.text,imgs);$('#ckGo').disabled=false;box.innerHTML='';
  if(!r.ok){box.append(el('div',{class:'verdict warn'},el('b',{text:'AI-детектив не ответил'}),el('span',{text:AI.msg(r.err)+' Пока ориентируйтесь на результат правил — он в той же схеме.'}),el('div',{class:'row'},toLocal)));return;}
  const res=normSchema(r.data,c.text),pf=Privacy.mask(m.text).found,rules=rulesSchema(m);let conflict=null;
  if(RISK[rules.risk_level].n>=3&&RISK[rules.risk_level].n-RISK[res.risk_level].n>=1){conflict=el('div',{class:'verdict warn'},el('b',{text:'Правила нашли более серьёзные признаки'}),el('span',{class:'small',text:'ИИ оценил риск как «'+RISK[res.risk_level].t.toLowerCase()+'», но правила нашли: '+rules.strength+'. Показываем более осторожную оценку.'}));res.risk_level=rules.risk_level;}
  renderVerdict(box,res,{engine:'ai',title:'Разбор AI-детектива',conflict,notes:[Object.keys(pf).length?Privacy.summary(pf).replace(/\.$/,'')+' перед отправкой.':null,r.note,'ИИ может ошибаться. При сомнении положите трубку и свяжитесь с организацией сами по официальному номеру.']});};

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
