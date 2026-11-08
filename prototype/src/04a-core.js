/* ===== ЯДРО: хранилище, приватность, ИИ-сервис, оценка навыков, рекомендации. Без DOM, кроме окна согласия. ===== */

/* --- Хранилище v2: версия схемы, перенос с v1, экспорт/импорт, проверка ввода --- */
const RES_S={ok:1,warn:.5,bad:0};
const Store={
  key:'immunitet.v2',old:'immunitet.v1',max:800,
  blank(){return{v:2,aud:null,large:false,coach:true,voice:true,vMale:'',vFemale:'',vRate:1,handsFree:false,callVoice:'voice',femVoice:'',tab:'home',prot:{},attempts:[],tests:[],review:{},forms:null,created:Date.now()};},
  load(){const d=store.get(this.key,null);if(d&&d.v===2)return this.sanitize(d)||this.blank();return this.sanitize(this.migrate(store.get(this.old,null)))||this.blank();},
  migrate(o){const d=this.blank();if(!o||typeof o!=='object')return d;
    ['aud','large','coach','voice','tab'].forEach(k=>{if(o[k]!=null)d[k]=o[k];});if(o.tab==='check')d.tab='mentor';
    if(o.prot&&typeof o.prot==='object')d.prot=o.prot;
    (Array.isArray(o.hist)?o.hist:[]).slice().reverse().forEach(h=>{if(!h||h.id==='swipe'||!(h.res in RES_S))return;const sc=scenarioById(h.m,h.id);if(!sc)return;
      d.attempts.push({k:h.m,id:h.id,sk:sc.cat,lvl:sc.lvl,res:h.res,s:RES_S[h.res],ts:+h.ts||Date.now(),legit:!!sc.honest,mk:h.res==='ok'?[]:(sc.mk||[]),mig:1});});
    if(o.hist&&o.hist.length)d.migrated=1;return d;},
  sanitize(d){if(!d||typeof d!=='object')return null;const o=this.blank();
    o.aud=AUDS[d.aud]?d.aud:null;o.large=!!d.large;o.coach=d.coach!==false;o.voice=d.voice!==false;o.tab=typeof d.tab==='string'?d.tab.slice(0,12):'home';
    o.vMale=typeof d.vMale==='string'?d.vMale.slice(0,120):'';o.vFemale=typeof d.vFemale==='string'?d.vFemale.slice(0,120):'';o.vRate=+d.vRate>=.7&&+d.vRate<=1.4?+d.vRate:1;o.handsFree=!!d.handsFree;o.callVoice=d.callVoice==='ai'?'ai':'voice';o.femVoice=['baya','kseniya','xenia'].includes(d.femVoice)?d.femVoice:'';
    PROT.forEach(p=>{if(d.prot&&d.prot[p.id]===true)o.prot[p.id]=true;});
    o.attempts=(Array.isArray(d.attempts)?d.attempts:[]).filter(a=>a&&typeof a==='object'&&CATS[a.sk]&&typeof a.s==='number'&&isFinite(a.s)&&['call','chat','site','card','item'].includes(a.k)).slice(-this.max).map(a=>{
      const x={k:a.k,id:String(a.id).slice(0,40),sk:a.sk,lvl:[1,2,3].includes(+a.lvl)?+a.lvl:1,s:Math.max(0,Math.min(1,a.s)),ts:+a.ts>0?+a.ts:Date.now()};
      x.res=a.res in RES_S?a.res:(x.s>=.75?'ok':x.s>=.4?'warn':'bad');if(a.legit)x.legit=true;if(a.fp)x.fp=true;if(+a.ms>0&&+a.ms<36e5)x.ms=Math.round(+a.ms);
      x.mk=Array.isArray(a.mk)?a.mk.filter(m=>MARKERS[m]).slice(0,6):[];if(a.ph==='pre'||a.ph==='post')x.ph=a.ph;if(a.mig)x.mig=1;if(typeof a.ans==='number')x.ans=a.ans;return x;});
    o.tests=(Array.isArray(d.tests)?d.tests:[]).filter(t=>t&&(t.phase==='pre'||t.phase==='post')&&(t.form==='A'||t.form==='B')&&Array.isArray(t.ans)).slice(-12).map(t=>({phase:t.phase,form:t.form,ts:+t.ts||Date.now(),rep:!!t.rep,ans:t.ans.filter(x=>x&&ITEM_BY[x.id]).map(x=>({id:x.id,ok:!!x.ok,ms:Math.max(0,Math.min(36e5,+x.ms||0)),a:typeof x.a==='number'?x.a:null}))}));
    if(d.review&&typeof d.review==='object')Object.entries(d.review).slice(0,300).forEach(([k,v])=>{if(v&&+v.due>0)o.review[String(k).slice(0,50)]={due:+v.due,box:Math.max(1,Math.min(4,+v.box||1))};});
    if(d.forms&&(d.forms.pre==='A'||d.forms.pre==='B'))o.forms={pre:d.forms.pre,post:d.forms.pre==='A'?'B':'A'};
    o.created=+d.created||Date.now();if(d.migrated)o.migrated=1;if(d.migratedSeen)o.migratedSeen=1;return o;},
  save(){if(!store.set(this.key,S))toast('Не удалось сохранить прогресс в этом браузере');},
  exportText(){return JSON.stringify({app:'immunitet',v:2,exported:new Date().toISOString(),data:S},null,1);},
  parseImport(txt){let j;try{j=JSON.parse(String(txt||''));}catch(e){return{err:'Это не похоже на файл экспорта: внутри не JSON.'};}
    if(!j||j.app!=='immunitet'||!j.data)return{err:'В файле нет данных тренажёра «Иммунитет».'};if(j.v!==2)return{err:'Неизвестная версия файла: '+j.v};
    const s=this.sanitize(j.data);return s?{data:s}:{err:'Данные в файле повреждены.'};}
};
let S=Store.load();
function save(){Store.save();}

/* --- Приватность: скрытие персональных данных и согласие на отправку ИИ --- */
const PII=[
 {k:'acct',n:['номер счёта','номера счетов','номеров счетов'],re:/\b\d{20}\b/g,r:'[номер счёта скрыт]'},
 {k:'card',n:['номер карты','номера карт','номеров карт'],re:/(?:\d[ -]?){15,18}\d/g,r:'[номер карты скрыт]'},
 {k:'phone',n:['телефон','телефона','телефонов'],re:/(?:\+7|\b8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/g,r:'[телефон скрыт]'},
 {k:'snils',n:['СНИЛС','СНИЛС','СНИЛС'],re:/\b\d{3}[- ]\d{3}[- ]\d{3}[- ]\d{2}\b/g,r:'[СНИЛС скрыт]'},
 {k:'passport',n:['паспорт','паспорта','паспортов'],re:/\b\d{2}\s?\d{2}\s?(?:№\s?)?\d{6}\b/g,r:'[паспорт скрыт]'},
 {k:'inn',n:['ИНН','ИНН','ИНН'],re:/\b\d{12}\b|\b\d{10}\b/g,r:'[ИНН скрыт]'},
 {k:'email',n:['адрес почты','адреса почты','адресов почты'],re:/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g,r:(m,d)=>'[имя скрыто]@'+d},
 {k:'cvv',n:['CVV','CVV','CVV'],re:/((?:cvv2?|cvc2?)\D{0,3})(\d{3})\b/gi,r:null},
 {k:'code',n:['код','кода','кодов'],re:/((?:код|code|пароль|password)[^\d\n]{0,14})(\d{4,8})/gi,r:null}
];
const Privacy={
  session:{text:false,img:false},
  mask(t){let text=String(t||'');const found={};PII.forEach(p=>{text=text.replace(p.re,(...m)=>{found[p.k]=(found[p.k]||0)+1;return typeof p.r==='function'?p.r(...m):p.r==null?m[1]+'[код скрыт]':p.r;});});return{text,found};},
  summary(found){const parts=PII.filter(p=>found[p.k]).map(p=>{const n=found[p.k];const w=n%10===1&&n%100!==11?p.n[0]:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?p.n[1]:p.n[2];return n+' '+w;});return parts.length?'Скрыли автоматически: '+parts.join(', ')+'.':'Автоматически личных данных не нашли — проверьте текст сами.';},
  /* Показывает, что уйдёт ИИ, и даёт поправить. Разрешает ок только при явном подтверждении. */
  confirm({text='',images=[],purpose='разбор'}){
    const m=this.mask(text);
    if(this.session.text&&(!images.length||this.session.img))return Promise.resolve({ok:true,text:m.text});
    return new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v);}};
      const ta=text?el('textarea',{rows:'6','aria-label':'Текст, который уйдёт ИИ'}):null;if(ta)ta.value=m.text;
      const imgOk=el('input',{type:'checkbox',id:'pvImg'}),remember=el('input',{type:'checkbox',id:'pvRem'});
      const send=el('button',{class:'btn primary',disabled:images.length?true:null},'Отправить');
      imgOk.onchange=()=>{send.disabled=images.length&&!imgOk.checked;};
      const body=el('div',{class:'stack',style:'gap:12px'},
        el('p',{class:'small',text:(images.length?'Текст и скриншоты уйдут':'Текст уйдёт')+' в Claude — модель компании Anthropic — через ваш аккаунт Claude. Тренажёр '+(images.length?'их':'его')+' не сохраняет. Ответ ИИ — это мнение, а не установленный факт.'}),
        text?el('div',{class:'verdict '+(Object.keys(m.found).length?'ok':'warn')},el('span',{class:'small',text:this.summary(m.found)})):null,
        ta?el('label',{},'Что уйдёт ИИ — уберите имена, адреса и всё лишнее',ta):null,
        images.length?el('label',{class:'row',style:'gap:10px;color:var(--ink);align-items:flex-start'},imgOk,el('span',{class:'small',text:'Скриншоты ('+images.length+') уйдут как есть. Я закрыл(а) на них номера карт, паспорт, адреса и лица'})):null,
        el('label',{class:'row',style:'gap:10px;color:var(--ink)'},remember,el('span',{class:'small',text:'Не спрашивать до конца этой сессии'})),
        el('div',{class:'row'},send,el('button',{class:'btn',onclick:()=>close()},'Отмена')));
      const close=modal('Отправить ИИ на '+purpose+'?',body,{onClose:()=>fin({ok:false})});
      send.onclick=()=>{if(remember.checked){this.session.text=true;if(images.length)this.session.img=true;}const out=ta?this.mask(ta.value).text:'';fin({ok:true,text:out});close();};
    });
  }
};
function maskPII(t){return Privacy.mask(t).text;}

/* --- ИИ-сервис: единая точка вызова, ошибки, лимиты. Интерфейс не обращается к модели напрямую. --- */
const AI={ready:false,fn:null,coolUntil:0,reason:'',subs:[],
  async init(){if(MODE==='artifact'){try{this.fn=window.claude?await window.claude.use('sample'):null;}catch(e){this.fn=null;}this.ready=!!this.fn;if(!this.ready)this.reason='ИИ недоступен в этом окне';}else{try{const r=await fetch('/api/health');const j=await r.json();this.ready=!!j.ai;if(!this.ready)this.reason='ИИ не настроен на сервере';}catch(e){this.ready=false;this.reason='Сервер ИИ недоступен';}}this.emit();},
  on(f){this.subs.push(f);},emit(){this.subs.forEach(f=>{try{f();}catch(e){}});},
  limited(){return Date.now()<this.coolUntil;},
  label(){return !this.ready?(this.reason||'ИИ недоступен'):this.limited()?'Лимит запросов к ИИ — минуту поработаем без него':'ИИ подключён';},
  async call(input,o={}){
    if(!this.ready)throw{code:'unavailable'};if(this.limited())throw{code:'rate_limited'};
    try{
      if(MODE==='artifact'){const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),o.timeout||90000);const opts={modelTier:o.tier||'quick',cache:false,signal:ctl.signal};if(o.images&&o.images.length)opts.images=o.images.map(i=>i.blob);
        try{const r=await this.fn(input,opts);return String(r&&r.text||'');}catch(e){if(ctl.signal.aborted)throw{code:'timeout'};throw e;}finally{clearTimeout(to);}}
      const messages=typeof input==='string'?[{role:'user',content:input}]:input,body={messages,tier:o.tier||'quick'};if(o.images&&o.images.length)body.images=o.images.map(i=>({media_type:i.type,data:i.b64}));
      const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),o.timeout||90000);
      try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal});if(r.status===429)throw{code:'rate_limited'};if(!r.ok)throw{code:'upstream_error'};return String((await r.json()).text||'');}catch(e){if(ctl.signal.aborted)throw{code:'timeout'};throw e;}finally{clearTimeout(to);}
    }catch(e){this.fail(e);throw e&&e.code?e:{code:'upstream_error'};}
  },
  async json(input,o){return parseJSON(await this.call(input,o));},
  fail(e){const c=e&&e.code;
    if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed','session_expired'].includes(c)){this.ready=false;this.reason=c==='not_granted'?'Вы не разрешили этой странице обращаться к ИИ':'ИИ недоступен в этом окне';this.emit();}
    else if(c==='rate_limited'){this.coolUntil=Date.now()+60000;this.emit();setTimeout(()=>this.emit(),61000);}},
  msg(e){const c=e&&e.code;return({timeout:'ИИ слишком долго не отвечал. Попробуйте ещё раз.',rate_limited:'Слишком много запросов к ИИ. Попробуйте через минуту.',not_granted:'Вы не разрешили этой странице обращаться к ИИ.',unavailable:'ИИ сейчас недоступен.',refused:'ИИ отказался отвечать на этот запрос.',parse:'ИИ ответил в неожиданном формате. Попробуйте ещё раз.',images_unavailable:'Скриншоты сейчас нельзя передать ИИ.',image_rejected:'Скриншот не подошёл: попробуйте другой файл.',prompt_too_large:'Слишком длинный текст — сократите его.'})[c]||'ИИ не ответил. Попробуйте ещё раз.';}
};

/* --- Оценка навыков: журнал решений → байесовская оценка по темам с погрешностью --- */
const Evidence={
  W:{item:1,call:1,chat:1,site:1,card:.35},L:{1:.8,2:1,3:1.25},NOV:[1,.5,.25,.15,.1],HALF:90,subs:[],
  on(f){this.subs.push(f);},
  record(a){a.ts=Date.now();S.attempts.push(a);if(S.attempts.length>Store.max)S.attempts.splice(0,S.attempts.length-Store.max);this.schedule(a);save();this.subs.forEach(f=>{try{f(a);}catch(e){}});},
  recordMany(list){const t=Date.now();list.forEach((a,i)=>{a.ts=t+i;S.attempts.push(a);});save();this.subs.forEach(f=>{try{f();}catch(e){}});},
  schedule(a){if(a.k==='item'||a.k==='card')return;const key=a.k+':'+a.id,r=S.review[key],D=864e5;
    if(a.res!=='ok')S.review[key]={due:Date.now()+20*36e5,box:1};
    else if(r){const box=r.box+1;if(box>4)delete S.review[key];else S.review[key]={due:Date.now()+[0,1,3,7,21][box]*D,box};}},
  skills(at=S.attempts,now=Date.now()){const seen={},out={};CAT_KEYS.forEach(c=>out[c]={a:2,b:2,n:0,cnt:0});
    at.forEach(a=>{const x=out[a.sk];if(!x)return;const key=a.k+':'+a.id,k=seen[key]=(seen[key]||0)+1;
      const w=(this.W[a.k]||1)*(this.L[a.lvl]||1)*this.NOV[Math.min(k-1,this.NOV.length-1)]*Math.pow(.5,Math.max(0,now-a.ts)/864e5/this.HALF);
      x.a+=w*a.s;x.b+=w*(1-a.s);x.n+=w;x.cnt++;});
    CAT_KEYS.forEach(c=>{const x=out[c],t=x.a+x.b;x.m=x.a/t;x.sd=Math.sqrt(x.m*(1-x.m)/(t+1));});return out;},
  overall(sk=this.skills()){const xs=CAT_KEYS.filter(c=>sk[c].n>=.5);if(!xs.length)return null;const m=xs.reduce((a,c)=>a+sk[c].m,0)/xs.length,sd=Math.sqrt(xs.reduce((a,c)=>a+sk[c].sd*sk[c].sd,0))/xs.length;return{v:Math.round(m*100),pm:Math.max(1,Math.round(sd*100)),cov:xs.length};},
  status(x){return x.n<1?{k:'',t:'мало данных'}:x.m<.55?{k:'bad',t:'слабая зона'}:x.m<.75?{k:'warn',t:'средне'}:{k:'ok',t:'уверенно'};},
  metrics(at=S.attempts){const legit=at.filter(a=>a.legit),fpN=legit.filter(a=>a.fp).length,ms=at.filter(a=>a.ms).map(a=>a.ms).sort((a,b)=>a-b),pr=at.filter(a=>a.k!=='item');
    return{n:at.length,acc:at.length?at.filter(a=>a.s>=.75).length/at.length:null,fp:legit.length?fpN/legit.length:null,legitN:legit.length,med:ms.length?ms[Math.floor(ms.length/2)]:null,uniq:new Set(pr.map(a=>a.k+':'+a.id)).size,practice:pr.length};},
  repeated(){const cnt={},since=Date.now()-120*864e5;S.attempts.filter(a=>a.ts>since&&a.s<.75&&a.mk&&a.mk.length).forEach(a=>a.mk.forEach(m=>cnt[m]=(cnt[m]||0)+1));return Object.entries(cnt).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);},
  mistakes(n=10){return S.attempts.filter(a=>a.s<.75).slice(-n).reverse();},
  difficulty(sk){const x=this.skills()[sk];if(!x||x.n<1)return'medium';return x.m>=.75?'hard':x.m<.55?'easy':'medium';}
};
const DIFF_T={easy:'Играй узнаваемо: типичные фразы мошенников, давление заметное, в легенде допустимы нестыковки.',medium:'Играй правдоподобно и последовательно, подстраивайся под ответы собеседника.',hard:'Играй максимально правдоподобно: вежливо, с деталями, без грубых угроз в начале, подстраивайся под каждый ответ и не выдавай себя сразу — собеседник опытный.'};
const DIFF_L={easy:'попроще',medium:'средняя',hard:'повышенная'};

/* --- Проверки: входная и итоговая на разных, ранее не показанных заданиях --- */
const Assess={
  formFor(phase){if(!S.forms){const pre=Math.random()<.5?'A':'B';S.forms={pre,post:pre==='A'?'B':'A'};save();}return S.forms[phase];},
  list(phase){return S.tests.filter(t=>t.phase===phase);},
  last(phase){const t=this.list(phase);return t.length?t[t.length-1]:null;},
  since(){const pre=this.last('pre');if(!pre)return{n:0,sk:0};const at=S.attempts.filter(a=>a.k!=='item'&&a.ts>pre.ts);return{n:at.length,sk:new Set(at.map(a=>a.sk)).size};},
  postReady(){const s=this.since();return !!this.last('pre')&&s.n>=6&&s.sk>=3;},
  summary(t){const rows=t.ans.map(x=>({x,it:ITEM_BY[x.id]})).filter(r=>r.it);if(!rows.length)return null;
    const legit=rows.filter(r=>r.it.type==='judge'&&!r.it.scam),scam=rows.filter(r=>r.it.type==='judge'&&r.it.scam),act=rows.filter(r=>r.it.type==='action');
    const ms=rows.map(r=>r.x.ms).filter(Boolean).sort((a,b)=>a-b),sk={};
    CAT_KEYS.forEach(c=>{const rs=rows.filter(r=>r.it.sk===c);sk[c]={ok:rs.filter(r=>r.x.ok).length,n:rs.length};});
    const share=a=>a.length?a.filter(r=>r.x.ok).length/a.length:null;
    return{acc:share(rows),fp:legit.length?legit.filter(r=>!r.x.ok).length/legit.length:null,legitN:legit.length,tpr:share(scam),act:share(act),med:ms.length?ms[Math.floor(ms.length/2)]:null,sk,wrong:rows.filter(r=>!r.x.ok).map(r=>({it:r.it,a:r.x.a})),n:rows.length,ok:rows.filter(r=>r.x.ok).length};}
};

/* --- Рекомендации: следующее самое полезное упражнение и почему --- */
const Rec={
  catalog(){const c=[];CALLS.forEach(s=>c.push({k:'call',id:s.id,sk:s.cat,lvl:s.lvl,t:s.t,aud:s.aud,legit:!!s.honest,n:s.n}));CHATS.forEach(s=>c.push({k:'chat',id:s.id,sk:s.cat,lvl:s.lvl,t:s.t,aud:s.aud,legit:!!s.honest,n:s.n}));SITES.forEach(s=>c.push({k:'site',id:s.id,sk:s.sk,lvl:s.lvl,t:s.t,aud:null,legit:!!s.legit}));return c;},
  target(x){if(!x||x.n<1)return S.aud==='senior'||S.aud==='school'?1:2;return x.m<.55?1:x.m<.75?2:3;},
  score(c,sk,ctx,met){const x=sk[c.sk],has=x.n>=.5,key=c.k+':'+c.id,tries=ctx.tries[key]||0,last=ctx.last[key],r=S.review[key],due=!!(r&&r.due<=Date.now()),tl=this.target(x),why=[];
    let s=(has?1-x.m:.5)+.6*Math.min(.5,x.sd*2);
    if(due){s+=.6;why.push('Пора повторить: в прошлый раз здесь была ошибка');}
    if(!tries)s+=.25;else if(!due)s-=.35*Math.min(3,tries);
    if(last&&Date.now()-last<15*6e4)s-=.8;
    s+=.4*(1-Math.min(2,Math.abs(c.lvl-tl))*.5);
    if(c.aud&&S.aud){if(c.aud.includes(S.aud))s+=.2;else s-=.35;}
    if(c.legit){if(met.legitN<2)s+=.05;else if(met.fp>.3){s+=.45;why.push('Вы часто подозреваете обычные сообщения — потренируйтесь отличать честные');}else s-=.25;}
    if(has&&x.m<.6)why.unshift('Тема «'+CATS[c.sk]+'» пока слабее остальных: '+Math.round(x.m*100)+' ± '+Math.round(x.sd*100));
    else if(!has)why.unshift('По теме «'+CATS[c.sk]+'» пока мало данных — упражнение уточнит оценку');
    if(!tries&&!due)why.push('Вы ещё не проходили этот сценарий');
    if(c.lvl===tl)why.push('Сложность подходит под ваш уровень');
    return{c,s,why:why.slice(0,2)};},
  next(n=3,filter){const sk=Evidence.skills(),met=Evidence.metrics(),ctx={tries:{},last:{}};
    S.attempts.forEach(a=>{const k=a.k+':'+a.id;ctx.tries[k]=(ctx.tries[k]||0)+1;ctx.last[k]=a.ts;});
    const list=this.catalog().filter(c=>!filter||filter(c)).map(c=>this.score(c,sk,ctx,met)).sort((a,b)=>b.s-a.s),out=[],used=new Set();
    for(const r of list){if(out.length>=n)break;if(used.has(r.c.sk)&&list.length>n*2)continue;out.push(r);used.add(r.c.sk);}
    return out;},
  ids(){return this.catalog().map(c=>c.k+':'+c.id);}
};

/* --- Быстрая проверка текста шаблонами (используют наставник, API и виджет) --- */
const FLAGS=[
 {id:'codes',re:/(код\S* (из|в) (смс|sms|сообщени)|смс[- ]?код|код подтвержден|код для (входа|отмены|активации)|назови(те)? код|продиктуй(те)? код|сообщи(те)? код|cvv|cvc|пин-?код|пароль|кодов\S* слов)/gi,w:40,t:'Просят код, пароль или CVV',why:'Код из СМС — ваша подпись. Его не просит никто: ни банк, ни Госуслуги, ни полиция.',tr:['call','bank_safe']},
 {id:'safe',re:/(безопасн\S* сч[её]т|резервн\S* сч[её]т|защищ[её]нн\S* сч[её]т|специальн\S* сч[её]т|задеклар\S*|декларирован\S*|замен\S* сч[её]т)/gi,w:50,t:'«Безопасный» счёт или «декларирование»',why:'Таких счетов не бывает. Любой перевод «для сохранности» уходит мошенникам.',tr:['call','bank_safe']},
 {id:'auth',re:/(фсб|мвд|следовател\S*|полици\S*|прокурат\S*|центробанк\S*|центральн\S* банк\S*|банк росси\S*|росфинмониторинг\S*|финразведк\S*|служб\S* безопасност\S*|соцфонд\S*|социальн\S* фонд\S*|казначейств\S*|госуслуг\S*)/gi,need:/(код|переве|сч[её]т|ссылк|звон|позвон|данн|приложени|доверенност|взлом|оплат|сбор|террор)/i,w:25,t:'Представляются ведомством или банком',why:'С 1 июня 2025 года банки и госорганы не общаются с гражданами в иностранных мессенджерах, а Росфинмониторинг вообще не звонит и не пишет гражданам.',tr:['call','rosfin_fake']},
 {id:'link',re:/(https?:\/\/\S+|www\.\S+|[a-z0-9-]+\.(ru|рф|com|net|org|top|click|site|online|info|xyz|pro|app|help|cc|me|link|shop)(\/\S*)?|по ссылке|перейди(те)? по)/gi,w:25,t:'Ссылка в сообщении',why:'Ссылки в неожиданных сообщениях ведут на фишинг. Открывайте сервис сами — через приложение или закладку.',tr:['site','site_gov']},
 {id:'secret',re:/(никому не (говори|сообщай|рассказыв)\S*|не говори(те)? (маме|папе|родным|никому)|конфиденциальн\S*|тайн\S* следствия|о неразглашени\S*)/gi,w:30,t:'Требуют секретности',why:'Изолировать вас от близких — главный приём. Честным людям секретность не нужна.',tr:['call','fsb_declare']},
 {id:'rush',re:/(срочно|немедленно|прямо сейчас|в течение \d+\s*(минут|час)\S*|до \d{1,2}[:.]\d{2}|сегодня до|истекает|последн\S* (шанс|день|предупрежд)\S*|будет (заблокир|отключ|аннулир)\S*)/gi,w:15,t:'Торопят и пугают',why:'Спешка нужна, чтобы вы не успели подумать и посоветоваться.'},
 {id:'kin',re:/(это (мой )?нов\S* номер|пишу с (чужого|другого|номера друга|телефона друга)|телефон (разбил|сломал|потерял|сел)\S*|мам[ау]?,? привет|бабул\S*|попал\S* в (аварию|беду|дтп|полицию))/gi,need:/(переве|деньг|карт|скинь|нужн)/i,w:35,t:'«Родственник» с нового номера просит деньги',why:'Позвоните ему на привычный номер или задайте вопрос, ответ на который знаете только вы. Голос и фото подделывают.',tr:['chat','mom']},
 {id:'drops',re:/(принима\S* (платеж|перевод)\S*|приход\S* переводы|пересыла\S*|переводи\S* (дальше|на сч[её]т компании)|процент\S* с (каждого|перевода|суммы)|за каждый перевод|карт\S* в аренду|аренд\S* карт\S*|оформи(ть|те)? (ещё )?(одну )?карт\S*|передать карт\S*|дроп\S*)/gi,w:50,t:'Вербовка в дропы',why:'Это отмывание денег. Дропперу грозит до 3 лет по ст. 187 УК, а в базе ЦБ — лимит переводов 100 тыс. ₽ в месяц и запрет на новые карты.',tr:['chat','job_drop']},
 {id:'invest',re:/(доход\S* от \d+\s*%|\d+\s*% в (день|неделю|месяц)|гарантированн\S* (доход|прибыл)\S*|без риска|пассивн\S* доход\S*|трейдер\S*|инвестиционн\S* платформ\S*|крипто\S* бот\S*)/gi,w:30,t:'Обещают лёгкий доход',why:'Гарантированного дохода не бывает. Проверьте компанию в справочнике участников финансового рынка на сайте Банка России.',tr:['site','site_invest']},
 {id:'prize',re:/(вы выиграли|ты выиграл\S*|выигрыш\S*|положена (выплата|компенсация|доплата)|компенсаци\S*|бесплатн\S* (робукс|подарок|iphone|айфон)\S*|раздач\S*|оплатите (доставку|комиссию|пошлину|сбор)|сбор за)/gi,w:25,t:'Подарок или выплата с условием',why:'Настоящие выплаты не требуют кодов и предоплаты.',tr:['site','site_payout']},
 {id:'app',re:/(установи(те)? (приложени|программ)\S*|скачай(те)?|удал[её]нн\S* доступ|демонстраци\S* экрана|rustdesk|anydesk|teamviewer|\.apk)/gi,w:40,t:'Просят установить приложение',why:'Через такие приложения мошенники видят ваш экран и управляют телефоном.'},
 {id:'cash',re:/(курьер\S* (забер|приедет|подъедет|выехал)\S*|передать (деньги|наличн)\S*|сним(и|ите) (деньги|наличн)\S*|в банкомат\S*|через банкомат\S*)/gi,w:40,t:'Наличные через курьера или банкомат',why:'Ни один банк и ни одно ведомство не забирает наличные через курьеров.',tr:['call','grandson']},
 {id:'wrong',re:/(ошибочн\S* (перевод|перевела|перевёл)\S*|по ошибке (перевел|перевела|перевёл|отправил)\S*|случайно (перевел|перевела|перевёл|скинул)\S*|верни(те)? (деньги|пожалуйста)? ?на (эту|другую|мою) карт\S*)/gi,w:35,t:'Просят вернуть «ошибочный перевод»',why:'Не возвращайте на другие реквизиты. Обратитесь в банк: он проверит перевод и вернёт его отправителю сам.',tr:['chat','wrong_transfer']},
 {id:'prepay',re:/(предоплат\S*|на карту (менеджера|сотрудника|инспектора|врача)|переводом на личн\S* карт\S*)/gi,w:20,t:'Оплата на личную карту',why:'Организации принимают оплату по договору и счёту, а не переводом на карту сотрудника.',tr:['site','site_shop']}
];
const WCH=/[а-яёa-z0-9]/i;
function widen(text,a,b){while(a>0&&WCH.test(text[a-1])&&WCH.test(text[a]))a--;while(b<text.length&&WCH.test(text[b])&&WCH.test(text[b-1]))b++;return[a,b];}
function localCheck(text){const hits=[];let score=0;
  FLAGS.forEach(f=>{f.re.lastIndex=0;const ms=[...text.matchAll(f.re)].map(m=>{const[a,b]=widen(text,m.index,m.index+m[0].length);return{index:a,end:b,0:text.slice(a,b)};});if(ms.length&&(!f.need||f.need.test(text))){score+=f.w;hits.push({f,ms});}});
  return{score:Math.min(100,score),hits};}
function levelOf(s){return s>=50?['bad','Высокий риск']:s>=20?['warn','Есть признаки обмана']:['ok','Явных признаков не найдено'];}

/* --- Голос: лучший доступный русский голос (синтез) и распознавание ответа --- */
const V_M=/(yuri|pavel|dmitry|dmitri|maxim|aleksandr|alexander|nikolai|ivan|artem|\bmale|мужск)/i,V_F=/(milena|katya|katerina|ekaterina|irina|svetlana|dariya|darya|tatyana|alyona|alena|anna|elena|maria|marina|female|женск|google)/i;
function vQual(v){const n=v.name;let s=1;if(/natural|neural|online|premium|enhanced|wavenet|улучш/i.test(n))s+=4;if(/google/i.test(n))s+=3;if(/milena|yuri|katya|svetlana|dariya|dmitry|yandex|alyona/i.test(n))s+=1;if(/espeak|festival|\birina\b|\bpavel\b|tatyana/i.test(n)&&!/natural|online/i.test(n))s-=2;if(v.localService===false)s+=1;return s;}
function vGender(n){return V_M.test(n)?'m':V_F.test(n)?'f':null;}
const TTS={ok:'speechSynthesis' in window,list:[],pending:0,gen:0,subs:[],
  load(){if(!this.ok)return;try{this.list=speechSynthesis.getVoices().filter(v=>/^ru/i.test(v.lang)).map(v=>({v,name:v.name,q:vQual(v),g:vGender(v.name)})).sort((a,b)=>b.q-a.q);}catch(e){this.list=[];}},
  best(g){if(!this.list.length)this.load();if(!this.list.length)return null;const pref=g==='f'?S.vFemale:S.vMale,p=pref&&this.list.find(x=>x.name===pref);if(p)return p;
    const top=this.list[0].q;return this.list.find(x=>x.g===g&&x.q>=top-1)||this.list.find(x=>x.g===g&&x.q>=top-2)||this.list[0];},
  good(){return this.list.length&&this.list[0].q>=5;},
  speaking(){return this.pending>0;},
  onIdle(f){this.subs.push(f);},idle(){this.subs.forEach(f=>{try{f();}catch(e){}});}};
if(TTS.ok){TTS.load();try{speechSynthesis.addEventListener('voiceschanged',()=>TTS.load());}catch(e){}}
function speechParts(t){t=String(t).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'').replace(/\([^)]*\)|\*[^*]*\*/g,'').replace(/[«»"“”]/g,'').replace(/₽/g,' рублей').replace(/\s+/g,' ').trim();
  const out=[];(t.match(/[^.!?…]+[.!?…]*/g)||[]).forEach(s=>{s=s.trim();if(!s)return;while(s.length>180){const i=s.lastIndexOf(',',180);const k=i>40?i+1:180;out.push(s.slice(0,k).trim());s=s.slice(k).trim();}if(s)out.push(s);});return out;}
function speak(text,o={}){if(!TTS.ok||!S.voice)return false;const pick=TTS.best(o.g||'m');if(!pick)return false;const parts=speechParts(text);if(!parts.length)return false;const gen=TTS.gen;
  try{parts.forEach(p=>{const u=new SpeechSynthesisUtterance(p);u.voice=pick.v;u.lang=pick.v.lang;u.rate=Math.max(.6,Math.min(1.6,(o.rate||1)*(S.vRate||1)));u.pitch=o.pitch||1;
    TTS.pending++;const done=()=>{if(gen!==TTS.gen)return;TTS.pending=Math.max(0,TTS.pending-1);if(!TTS.pending)TTS.idle();};u.onend=done;u.onerror=done;speechSynthesis.speak(u);});return true;}catch(e){return false;}}
function hush(){TTS.gen++;TTS.pending=0;if(typeof clipStop==='function')clipStop();if(TTS.ok)try{speechSynthesis.cancel();}catch(e){}}
const STT={C:window.SpeechRecognition||window.webkitSpeechRecognition||null,rec:null,on:false,agreed:false,
  ok(){return !!this.C;},
  consent(){if(this.agreed)return Promise.resolve(true);return new Promise(res=>{let ok=false,close;
    const go=el('button',{class:'btn primary',onclick:()=>{ok=true;this.agreed=true;close();}},'Понятно, включить');
    close=modal('Отвечать голосом',el('div',{class:'stack',style:'gap:12px'},
      el('p',{class:'small',text:'Речь распознаёт ваш браузер. В Chrome и Edge звук уходит на серверы разработчика браузера (Google или Microsoft) и возвращается текстом. Тренажёр получает только текст и запись не хранит.'}),
      el('p',{class:'small',text:'Браузер спросит разрешение на микрофон. Это тренировка — не произносите настоящие коды, номера карт и паспортные данные.'}),
      el('div',{class:'row'},go,el('button',{class:'btn',onclick:()=>close()},'Отмена'))),{onClose:()=>res(ok)});});},
  start(h){if(!this.C)return false;this.stop(true);let r;try{r=new this.C();}catch(e){return false;}this.rec=r;r.lang='ru-RU';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;let fin='',err='';
    r.onresult=e=>{let int='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)fin+=t+' ';else int+=t;}h.interim&&h.interim((fin+int).trim());};
    r.onerror=e=>{err=e&&e.error||'error';};
    r.onend=()=>{if(this.rec!==r)return;this.rec=null;this.on=false;h.end&&h.end(fin.replace(/\s+/g,' ').trim(),err);};
    try{r.start();this.on=true;return true;}catch(e){this.rec=null;this.on=false;return false;}},
  stop(abort){const r=this.rec;if(!r)return;if(abort){this.rec=null;this.on=false;}try{abort?r.abort():r.stop();}catch(e){}},
  msg(c){return({'not-allowed':'Нет доступа к микрофону. Разрешите его для этой страницы в настройках браузера — или отвечайте текстом.','service-not-allowed':'Браузер не разрешает распознавание речи в этом окне. Отвечайте текстом.','audio-capture':'Микрофон не найден.','network':'Для распознавания речи нужен интернет.','no-speech':'Не расслышал. Нажмите на микрофон и говорите.','language-not-supported':'Браузер не распознаёт русскую речь.'})[c]||'Не удалось распознать речь. Попробуйте ещё раз или ответьте текстом.';}};
let AC=null,ringT=null;
function ring(on){clearInterval(ringT);ringT=null;if(!on||!S.voice)return;
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){return;}
  const beep=()=>{try{const t=AC.currentTime;[0,.42].forEach((dt,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=i?660:880;g.gain.setValueAtTime(.0001,t+dt);g.gain.exponentialRampToValueAtTime(.09,t+dt+.03);g.gain.exponentialRampToValueAtTime(.0001,t+dt+.34);o.connect(g).connect(AC.destination);o.start(t+dt);o.stop(t+dt+.38);});}catch(e){}};
  beep();ringT=setInterval(beep,2100);}
function buzz(p){try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}}

/* --- Скачивание файлов (если среда разрешает) --- */
const DL={fn:undefined,async get(){if(this.fn!==undefined)return this.fn;try{this.fn=window.claude?await window.claude.use('downloads'):null;}catch(e){this.fn=null;}return this.fn;},
  async save(filename,data){const d=await this.get();if(!d)return{ok:false,code:'unavailable'};try{await d.save({filename,data});return{ok:true};}catch(e){return{ok:false,code:e&&e.code||'unavailable'};}}};
