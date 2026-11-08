const {launch,args}=require('./browser.js');
const fs=require('fs');
const path=require('path');const SP=path.resolve(__dirname,'..');
const out=SP+'/tests/out/';fs.mkdirSync(out,{recursive:true});
const page0=fs.readFileSync(SP+'/dist/artifact.html','utf8');
const MOCK=`<script>window.__calls=[];window.claude={use:async(n)=>{if(n==='downloads')return {save:async(o)=>{window.__dl=(window.__dl||[]).concat([o.filename]);}};return async(input,opts)=>{window.__calls.push({input,opts});await new Promise(r=>setTimeout(r,120));
 const s=Array.isArray(input)?'':String(input);
 if(Array.isArray(input))return {text:JSON.stringify({msgs:[{say:"Тестовая реплика ИИ: продиктуйте код из СМС, это срочно"}],sms:true,pressure:72,end:false})};
 if(/"score"/.test(s))return {text:JSON.stringify({score:64,summary:"Тестовый разбор.",good:["Не назвали код"],improve:["Кладите трубку раньше"],phrase:"Я перезвоню в банк сам"})};
 if(/"answer"/.test(s))return {text:JSON.stringify({answer:"Тестовый ответ наставника про дропперов.",recs:["chat:job_drop","call:nope"],terms:["Дроппер"],confidence:"medium"})};
 if(/"patterns"/.test(s))return {text:JSON.stringify({summary:"Тест закономерностей.",patterns:[{title:"Код",why:"вход",tip:"не называть"}],recs:["call:bank_safe"]})};
 if(/"risk_level"/.test(s)){if(/НЕВАЛИДНО/.test(s))return {text:JSON.stringify({risk_level:"maybe",confidence:"очень"})};if(/НЕJSON/.test(s))return {text:"Не знаю, что сказать"};return {text:String.fromCharCode(96,96,96)+"json"+String.fromCharCode(10)+JSON.stringify({risk_level:"critical",confidence:0.86,detected_indicators:[{id:"code",title:"Просят код",quote:"просит код",explanation:"Это вход"},{id:"fake",title:"Выдуманная цитата",quote:"этой фразы нет в тексте",explanation:"проверка"}],explanation:"Похоже на схему «служба безопасности».",limitations:[],recommended_actions:["Положить трубку"],avoid_actions:["Не называть код"],source_ids:["hitech","nope"]})+String.fromCharCode(10,96,96,96)};}
 return {text:"{}"};};}};</script>`;
const wrap=(head)=>'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+(head||'')+'</head><body>'+page0+'</body></html>';
fs.writeFileSync(out+'plain.html',wrap(''));
fs.writeFileSync(out+'mock.html',wrap(MOCK));
const V1={aud:'student',large:false,coach:true,voice:true,tab:'check',prot:{selfban:true},hist:[{m:'call',id:'bank_safe',res:'bad',ts:Date.now()-86400000*3},{m:'chat',id:'job_drop',res:'ok',ts:Date.now()-86400000*2},{m:'swipe',id:'swipe',res:'ok',ts:Date.now()}]};
fs.writeFileSync(out+'v1.html',wrap('<script>try{localStorage.setItem("immunitet.v1",'+JSON.stringify(JSON.stringify(V1))+')}catch(e){}</script>'));
(async()=>{
  const b=await launch();const errs=[],log=(...a)=>console.log(...a);
  async function mkPage(opts,file){const ctx=await b.newContext(opts);const p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(file+': '+e.message));
    p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_|net::/.test(m.text()))errs.push(file+' console: '+m.text());});
    await p.goto('file://'+out+file);await p.waitForTimeout(400);return p;}
  const objc=async(p,tag)=>{const bad=await p.evaluate(()=>/\[object |undefined|NaN/.test(document.body.innerText)?(document.body.innerText.match(/.{0,40}(\[object |undefined|NaN).{0,40}/)||[''])[0]:'');if(bad)errs.push('BADTEXT '+tag+': '+bad);};
  const overflow=async(p,tag)=>{await objc(p,tag);const o=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,w:innerWidth,vw:visualViewport.width}));const W=p.viewportSize().width;if(o.sw>W+1||o.w>W+1)errs.push('OVERFLOW '+tag+': '+o.sw+'/'+o.w+'>'+W+' '+(await p.evaluate(()=>{const W=400;const bad=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&!e.closest('.seg,nav.tabs,.tbl,pre,.scrollx')}).slice(0,4).map(e=>e.tagName+'#'+e.id+'.'+String(e.className).slice(0,30)+':'+Math.round(e.getBoundingClientRect().right));return bad.join(' | ');})));};
  const need=(c,m)=>{if(!c)errs.push(m);};
  const tab=async(p,t)=>{await p.click('nav.tabs button[data-tab="'+t+'"]');await p.waitForTimeout(200);};

  /* ===== DESKTOP plain (без ИИ) ===== */
  let p=await mkPage({viewport:{width:1440,height:950}},'plain.html');
  need((await p.textContent('#idxChipV')).trim()==='—','index chip should be — at start');
  need(await p.$('#nextList .scen'),'no next-step cards');
  need((await p.$$('#emergencyGrid .embtn')).length===6,'emergency grid');
  await p.click('#emergencyGrid .embtn >> nth=0');await p.waitForTimeout(150);need(/Положите трубку/.test(await p.textContent('.modal')),'emergency modal');
  await p.screenshot({path:out+'d_em.png'});
  await p.click('.modal .btn:has-text("Уже перевёл")');await p.waitForTimeout(150);need(/Позвоните в банк/.test(await p.textContent('.modal')),'emergency money modal');
  await p.keyboard.press('Escape');await p.click('#emergencyGrid .embtn >> nth=3');await p.click('.modal .btn.primary');await p.waitForTimeout(200);
  need(await p.evaluate(()=>!document.querySelector('#tab-mentor').hidden&&CK.kind==='url'),'emergency link -> url check');
  await p.click('nav.tabs button[data-tab="home"]');await p.waitForTimeout(100);
  await objc(p,'shot');await p.screenshot({path:out+'d_home.png',fullPage:true});
  // диагностика
  await p.click('#idxCard .btn.primary:has-text("Пройти диагностику")');await p.waitForTimeout(200);
  await objc(p,'shot');await p.screenshot({path:out+'d_test.png'});
  for(let i=0;i<12;i++){const t=await p.evaluate(()=>TEST.items[TEST.i].type);
    if(t==='judge')await p.click(i%3?'.swbtns .btn.danger':'.swbtns .btn.primary');else await p.click('.btn.opt >> nth='+(i%2));await p.waitForTimeout(60);}
  await p.waitForTimeout(200);
  const st=await p.evaluate(()=>({tests:S.tests.length,att:S.attempts.length,idx:$('#idxChipV').textContent}));
  log('after pre:',JSON.stringify(st));need(st.tests===1&&st.att===12,'pre test not recorded');need(/\d/.test(st.idx),'index not computed after pre');
  await objc(p,'shot');await p.screenshot({path:out+'d_report.png',fullPage:true});
  // звонок со скриптом: сопротивление и проверка
  await p.evaluate(()=>openSim('call','bank_safe'));await p.waitForTimeout(250);
  await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(1300);
  await p.fill('#phIn','А кто вы такой? Назовите ФИО и отдел');await p.press('#phIn','Enter');await p.waitForTimeout(1600);
  const lines=await p.$$eval('#tr .bub.them',x=>x.length);need(lines>=2,'script did not answer id question');
  await p.click('.minibtn:has-text("Проверить")');await p.waitForTimeout(200);
  need(await p.$('.vfy .vopt'),'verify overlay missing');await objc(p,'shot');await p.screenshot({path:out+'d_verify.png'});
  await p.click('.vfy .vopt:has-text("обратной стороны карты")');await p.waitForTimeout(1100);
  await p.click('.vfy .btn:has-text("Завершить")');await p.waitForTimeout(400);
  const v1=await p.textContent('#simSide .verdict b').catch(()=>null);log('bank_safe verify verdict:',v1);need(v1&&!/не там|попались/.test(v1),'bad verdict after good verify: '+v1);
  await objc(p,'shot');await p.screenshot({path:out+'d_verify_end.png'});
  // дипфейк-звонок с таймером
  await p.evaluate(()=>openSim('call','boss_voice'));await p.waitForTimeout(250);
  await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(1800);
  const tb=await p.textContent('#tban').catch(()=>null);log('timer banner:',tb);need(tb&&/⏳/.test(tb),'timer banner missing');
  await objc(p,'shot');await p.screenshot({path:out+'d_deepfake.png'});
  await p.click('.minibtn.danger');await p.waitForTimeout(400);
  need(await p.$('#simSide :text("голос")'),'deepfake card missing');
  // голосовое в чате
  await p.evaluate(()=>openSim('chat','daughter_voice'));await p.waitForTimeout(2600);
  need(await p.$('.bub.voice .vplay'),'voice bubble missing');await objc(p,'shot');await p.screenshot({path:out+'d_voice.png'});
  await p.click('.qr:has-text("Заблокировать")');await p.waitForTimeout(300);
  // сайт
  await p.click('#backPick');await p.click('#trSeg button[data-m="site"]');await p.waitForTimeout(200);
  const nSites=await p.$$eval('#scenList .scen',x=>x.length);log('site cards:',nSites);need(nSites===7,'site list count '+nSites);
  await p.click('#scenList .scen:has-text("'+(await p.evaluate(()=>SITE_BY.site_gov.t))+'")');await p.waitForTimeout(300);
  await objc(p,'shot');await p.screenshot({path:out+'d_site.png'});
  await p.click('.addr');await p.click('.pgwrap [data-spot] >> nth=1');await p.waitForTimeout(100);
  need((await p.evaluate(()=>SIM.marked.size))===2,'site marks not toggled');
  await p.click('.tray .btn:has-text("Закрыть")');await p.waitForTimeout(300);
  const sv=await p.textContent('#simSide .verdict b');log('site verdict:',sv);need(await p.$('.spotrow'),'no spot rows');
  await objc(p,'shot');await p.screenshot({path:out+'d_site_res.png'});
  await p.evaluate(()=>openSite('site_bank_ok'));await p.waitForTimeout(200);await p.click('.tray .btn:has-text("Ввести")');await p.waitForTimeout(200);
  log('legit site verdict:',await p.textContent('#simSide .verdict b'));
  // верю-не верю
  await p.click('#backPick');await p.click('#trSeg button[data-m="swipe"]');await p.waitForTimeout(200);
  for(let i=0;i<10;i++){await p.click('.swbtns .btn.primary');await p.waitForTimeout(60);await p.click('#swNext');await p.waitForTimeout(60);}
  await objc(p,'shot');await p.screenshot({path:out+'d_swipe_sum.png',fullPage:true});
  // прогресс
  await tab(p,'progress');need((await p.$$('.maprow')).length===6,'skill map rows != 6');
  await objc(p,'shot');await p.screenshot({path:out+'d_progress.png',fullPage:true});
  await p.click('#progBody .btn:has-text("Экспорт")');await p.waitForTimeout(300);
  const exp=await p.$eval('.modal textarea',t=>t.value).catch(()=>null);need(exp&&/"attempts"/.test(exp),'export modal/text missing');
  await p.keyboard.press('Escape');await p.waitForTimeout(100);need(!(await p.$('.modal')),'modal did not close on Escape');
  const nAtt=await p.evaluate(()=>S.attempts.length);
  await p.evaluate(()=>{S.attempts=[];save();});
  await p.click('#progBody .btn:has-text("Импорт")');await p.waitForTimeout(200);
  await p.fill('.modal textarea',exp);await p.click('.modal .btn.primary');await p.waitForTimeout(300);
  need((await p.evaluate(()=>S.attempts.length))===nAtt,'import did not restore attempts');
  await p.click('.modal .btn.primary').catch(()=>{});
  // итоговая
  log('postReady:',await p.evaluate(()=>Assess.postReady()),'form pre',await p.evaluate(()=>Assess.last('pre').form));
  await p.evaluate(()=>startTest('post'));await p.waitForTimeout(150);
  const formPost=await p.evaluate(()=>TEST.form);need(formPost!==(await p.evaluate(()=>Assess.last('pre').form)),'post used same form');
  for(let i=0;i<12;i++){const it=await p.evaluate(()=>({t:TEST.items[TEST.i].type,scam:TEST.items[TEST.i].scam,ans:TEST.items[TEST.i].ans}));
    if(it.t==='judge')await p.click(it.scam?'.swbtns .btn.danger':'.swbtns .btn.primary');else await p.click('.btn.opt >> nth='+it.ans);await p.waitForTimeout(50);}
  await p.waitForTimeout(200);need(await p.$('#progBody .cmp'),'compare block missing');
  await objc(p,'shot');await p.screenshot({path:out+'d_compare.png',fullPage:true});
  // наставник без ИИ
  await tab(p,'mentor');log('mentor status:',await p.textContent('#mStatus'));
  const lc=await p.textContent('#ckLocal');need(/(Высокий|Критический) риск/.test(lc)&&/Ограничения анализа/.test(lc),'local check schema missing: '+lc.slice(0,80));
  // ссылка
  await p.click('#ckKind button[data-k="url"]');await p.fill('#ckUrl','http://gosuslugi-vhod.lk-oplata.top/login');await p.waitForTimeout(400);
  const lu=await p.textContent('#ckLocal');log('url rules:',lu.slice(0,160));need(/Слова-приманки/.test(lu)&&/не открывал/.test(lu),'url rules');
  await objc(p,'url');await p.screenshot({path:out+'d_check_url.png',fullPage:true});
  await p.fill('#ckUrl','госуслуги.рф');await p.waitForTimeout(350);need(!/разных алфавитов/.test(await p.textContent('#ckLocal')),'cyrillic domain flagged as mixed');
  await p.fill('#ckUrl','gоsuslugi.ru');await p.waitForTimeout(350);need(/разных алфавитов/.test(await p.textContent('#ckLocal')),'homoglyph not flagged');
  // письмо
  await p.click('#ckEx button:has-text("Письмо")');await p.waitForTimeout(350);
  const lm=await p.textContent('#ckLocal');log('mail rules:',lm.slice(0,160));need(/бесплатной почты/.test(lm)&&/вложение/i.test(lm),'mail rules');
  need(/Нашли:/.test(lm),'PII note missing in mail');
  await p.screenshot({path:out+'d_check_mail.png',fullPage:true});
  // обычное сообщение -> недостаточно данных
  await p.click('#ckEx button:has-text("Обычное")');await p.waitForTimeout(350);need(/Недостаточно данных/.test(await p.textContent('#ckLocal')),'benign should be unknown');
  // длина
  await p.click('#ckKind button[data-k="msg"]');await p.fill('#ckText','а'.repeat(10050));await p.waitForTimeout(350);
  need(/10\s050/.test(await p.textContent('#ckCount')),'counter');await p.click('#ckGo');await p.waitForTimeout(150);
  need(await p.evaluate(()=>!!document.querySelector('.toast')&&/длиннее/.test(document.querySelector('.toast').textContent)),'length validation toast');
  await p.click('#ckEx button:has-text("Звонок")');await p.waitForTimeout(300);
  await p.click('#ckGo');await p.waitForTimeout(200);need(/недоступен/.test(await p.textContent('#ckAI')),'no AI-unavailable message');
  await objc(p,'shot');await p.screenshot({path:out+'d_mentor_check.png',fullPage:true});
  await p.click('#mSeg button[data-t="ask"]');await p.fill('#askIn','Что такое дроппер?');await p.click('#askGo');await p.waitForTimeout(400);
  const ans=await p.textContent('#askLog');log('local ask:',ans.slice(-160));need((await p.$$('#askLog .mmsg.me')).length===1&&(await p.$$('#askLog .mmsg.bot')).length===1,'local ask no answer');
  await objc(p,'shot');await p.screenshot({path:out+'d_mentor_ask.png',fullPage:true});
  await p.click('#mSeg button[data-t="mist"]');await p.waitForTimeout(200);need(await p.$('#m-mist .card'),'mistakes empty');
  await objc(p,'shot');await p.screenshot({path:out+'d_mentor_mist.png',fullPage:true});
  await p.click('#mSeg button[data-t="gloss"]');await p.fill('#glQ','дроп');await p.waitForTimeout(150);
  const gl=await p.$$('#glList details');need(gl.length>=1,'glossary search empty');
  await p.fill('#glQ','кредитные каникулы');await p.waitForTimeout(100);need((await p.inputValue('#glQ'))==='кредитные каникулы','glossary input mangled');
  await objc(p,'shot');await p.screenshot({path:out+'d_mentor_gloss.png',fullPage:true});
  // защита и организации
  await tab(p,'protect');await p.click('.prot .sw >> nth=0');await p.waitForTimeout(100);log('prot:',await p.textContent('#protScore'));
  await tab(p,'org');for(const k of ['dash','score','api','widget']){await p.click('#orgSeg button[data-o="'+k+'"]');await p.waitForTimeout(300);
    if(k==='api'){await p.click('#org-api .btn.primary');await p.waitForTimeout(200);const r=await p.textContent('#apiOut');need(/"demo_risk_score"|"risk_level"/.test(r)&&!/NaN|Infinity/.test(r),'api out: '+r.slice(0,80));}}
  // персистентность
  await p.reload();await p.waitForTimeout(400);
  const per=await p.evaluate(()=>({tab:S.tab,att:S.attempts.length,tests:S.tests.length}));log('after reload:',JSON.stringify(per));need(per.tests===2,'tests not persisted');
  await p.context().close();

  /* ===== миграция v1 ===== */
  p=await mkPage({viewport:{width:1280,height:900}},'v1.html');
  const mg=await p.evaluate(()=>({tab:S.tab,att:S.attempts.map(a=>a.k+':'+a.id+':'+a.res),prot:S.prot,aud:S.aud,mig:S.migrated,v:S.v,stored:!!localStorage.getItem('immunitet.v2')}));
  log('migration:',JSON.stringify(mg));need(mg.att.length===2&&mg.tab==='mentor'&&mg.mig&&mg.stored,'migration failed');
  await p.context().close();

  /* ===== DESKTOP с ИИ (mock) ===== */
  p=await mkPage({viewport:{width:1280,height:900}},'mock.html');
  await tab(p,'mentor');log('mock mentor status:',await p.textContent('#mStatus'));
  await p.click('#ckGo');await p.waitForTimeout(200);need(await p.$('.modal'),'consent modal missing');
  const masked=await p.$eval('.modal textarea',t=>t.value).catch(()=>'');log('consent text start:',masked.slice(0,60));
  await objc(p,'mshot');await p.screenshot({path:out+'m_consent.png'});
  await p.click('.modal .btn:has-text("Отмена")');await p.waitForTimeout(150);need(await p.evaluate(()=>window.__calls.length)===0,'AI called despite cancel');
  await p.fill('#ckText','Мой номер +7 912 345-67-89, карта 2200 1234 5678 9012. Служба безопасности просит код 4821 из СМС');
  await p.click('#ckGo');await p.waitForTimeout(200);const m2=await p.$eval('.modal textarea',t=>t.value);log('masked:',m2);
  need(!/912 345|5678 9012|4821/.test(m2),'PII not masked in consent');
  await p.click('.modal .btn.primary');await p.waitForTimeout(500);
  const sent=await p.evaluate(()=>String(window.__calls[0].input));need(!/912 345|5678 9012|4821/.test(sent),'PII leaked to model');
  const ai=await p.textContent('#ckAI');need(/Критический риск/.test(ai)&&/как высокую/.test(ai)&&!/86\s?%/.test(ai)&&/не откалибр/.test(ai)&&/Ограничения анализа/.test(ai),'AI check render: '+ai.slice(0,160));
  need(!/этой фразы нет/.test(ai),'fabricated quote not dropped');need(/Hi-Tech Mail/.test(ai),'source not rendered');
  log('AI check text:',ai.slice(0,260));
  // ответ не по схеме -> недостаточно данных
  await p.fill('#ckText','НЕВАЛИДНО: странный текст про код');await p.click('#ckGo');await p.waitForTimeout(200);if(await p.$('.modal'))await p.click('.modal .btn.primary');await p.waitForTimeout(500);
  const inv=await p.textContent('#ckAI');need(/Недостаточно данных/.test(inv)&&/не по схеме/.test(inv)&&/не указала/.test(inv),'invalid AI response not normalized to unknown: '+inv.slice(0,120));
  await p.fill('#ckText','НЕJSON: текст');await p.click('#ckGo');await p.waitForTimeout(200);if(await p.$('.modal'))await p.click('.modal .btn.primary');await p.waitForTimeout(500);need(/не ответил/.test(await p.textContent('#ckAI'))&&/неожиданном формате/.test(await p.textContent('#ckAI')),'non-JSON fallback message');
  await objc(p,'mshot');await p.screenshot({path:out+'m_check.png',fullPage:true});
  // вопрос
  await p.click('#mSeg button[data-t="ask"]');await p.fill('#askIn','Кто такие дропперы?');await p.click('#askGo');await p.waitForTimeout(250);
  if(await p.$('.modal')){await p.click('.modal #pvRem');await p.click('.modal .btn.primary');}
  await p.waitForTimeout(500);const al=await p.textContent('#askLog');need(/Тестовый ответ/.test(al),'AI ask missing');
  need((await p.$$('#askLog .mmsg.bot .btn')).length===1,'recs not validated (expected 1 valid)');
  await p.fill('#askIn','Ещё вопрос');await p.click('#askGo');await p.waitForTimeout(150);need(!(await p.$('.modal')),'consent asked again despite remember');
  await p.waitForTimeout(400);await objc(p,'mshot');await p.screenshot({path:out+'m_ask.png',fullPage:true});
  // звонок с ИИ + разбор
  await p.evaluate(()=>{S.callVoice='ai';openSim('call','gos_hack');});await p.waitForTimeout(250);
  await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(900);
  await p.fill('#phIn','А кто вы такой?');await p.press('#phIn','Enter');await p.waitForTimeout(400);
  need(/тренировка с ИИ-собеседником/.test(await p.textContent('.modal').catch(()=>'')),'AI sim consent missing');
  need(/А кто вы такой/.test(await p.textContent('.modal').catch(()=>'')),'AI sim consent does not show transcript');
  await p.click('.modal .btn.primary');await p.waitForTimeout(900);
  need(await p.$('.sms'),'AI-mode SMS not shown');
  await p.click('.minibtn.danger');await p.waitForTimeout(300);
  await p.click('#aiDeb').catch(()=>errs.push('no AI debrief btn'));await p.waitForTimeout(250);
  need(/разбор тренировки/.test(await p.textContent('.modal').catch(()=>'')),'debrief consent missing');await p.click('.modal .btn.primary').catch(()=>{});await p.waitForTimeout(600);
  need(/Тестовый разбор/.test(await p.textContent('#aiDebBox').catch(()=>'')),'AI debrief missing');
  // ошибки + закономерности
  await p.evaluate(()=>Evidence.record({k:'call',id:'bank_safe',sk:'codes',lvl:1,res:'bad',s:0,mk:['code']}));await tab(p,'mentor');await p.click('#mSeg button[data-t="mist"]');await p.waitForTimeout(150);
  await p.click('#m-mist .btn.primary:has-text("Найти")').catch(()=>errs.push('no patterns btn'));await p.waitForTimeout(250);
  need(/Профиль навыков|навык/i.test(await p.textContent('.modal').catch(()=>'')),'mistakes consent does not list skill profile');await p.click('.modal .btn.primary').catch(()=>{});await p.waitForTimeout(500);
  log('patterns:',(await p.textContent('#m-mist')).includes('Тест закономерностей'));
  // загрузка отчёта/экспорта через downloads
  await tab(p,'progress');await p.click('#progBody .btn:has-text("Экспорт")');await p.waitForTimeout(300);log('downloads:',await p.evaluate(()=>window.__dl));
  // API организаций с ИИ
  await tab(p,'org');await p.click('#orgSeg button[data-o="api"]');await p.waitForTimeout(200);
  await p.click('#org-api .sw');await p.click('#org-api .btn.primary');await p.waitForTimeout(300);if(await p.$('.modal'))await p.click('.modal .btn.primary');await p.waitForTimeout(600);{const ao=await p.textContent('#apiOut');log('api engine:',(ao.match(/"engine":\s*"[^"]*"/)||[])[0]);need(/rules-v2\+llm/.test(ao)&&/"risk_level"/.test(ao),'api with AI: '+ao.slice(0,120));}
  await p.context().close();

  /* ===== MOBILE 400 light/dark ===== */
  for(const scheme of ['light','dark']){
    p=await mkPage({viewport:{width:400,height:860},colorScheme:scheme,hasTouch:true,isMobile:true},'plain.html');
    await overflow(p,scheme+' home');await p.screenshot({path:out+'mob_'+scheme+'_home.png',fullPage:true});
    await p.evaluate(()=>startTest('pre'));await p.waitForTimeout(150);await overflow(p,scheme+' test');await p.screenshot({path:out+'mob_'+scheme+'_test.png'});
    for(let i=0;i<12;i++){const t=await p.evaluate(()=>TEST.items[TEST.i].type);if(t==='judge')await p.click('.swbtns .btn.danger');else await p.click('.btn.opt >> nth=0');await p.waitForTimeout(40);}
    await overflow(p,scheme+' report');await p.screenshot({path:out+'mob_'+scheme+'_report.png',fullPage:true});
    await tab(p,'progress');await overflow(p,scheme+' progress');await p.screenshot({path:out+'mob_'+scheme+'_progress.png',fullPage:true});
    await tab(p,'train');await overflow(p,scheme+' train');
    await p.evaluate(()=>openSim('call','boss_voice'));await p.waitForTimeout(200);await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(1500);
    await overflow(p,scheme+' call');await p.screenshot({path:out+'mob_'+scheme+'_call.png'});
    await p.click('.minibtn:has-text("Проверить")');await p.waitForTimeout(150);await p.screenshot({path:out+'mob_'+scheme+'_verify.png'});
    await p.evaluate(()=>openSite('site_fine'));await p.waitForTimeout(200);await overflow(p,scheme+' site');await p.screenshot({path:out+'mob_'+scheme+'_site.png',fullPage:true});
    await p.click('.tray .btn:has-text("Закрыть")');await p.waitForTimeout(200);await overflow(p,scheme+' site res');await p.screenshot({path:out+'mob_'+scheme+'_site_res.png',fullPage:true});
    await p.evaluate(()=>openSim('chat','daughter_voice'));await p.waitForTimeout(2600);await overflow(p,scheme+' voice');await p.screenshot({path:out+'mob_'+scheme+'_voice.png'});
    await tab(p,'mentor');for(const t of ['check','ask','mist','gloss']){await p.click('#mSeg button[data-t="'+t+'"]');await p.waitForTimeout(150);await overflow(p,scheme+' mentor '+t);}
    await p.screenshot({path:out+'mob_'+scheme+'_gloss.png',fullPage:true});
    await tab(p,'progress');await p.click('#progBody .btn:has-text("Импорт")');await p.waitForTimeout(150);await overflow(p,scheme+' modal');await p.screenshot({path:out+'mob_'+scheme+'_modal.png'});await p.keyboard.press('Escape');
    for(const t of ['schemes','protect','org']){await tab(p,t);await overflow(p,scheme+' '+t);}
    await p.context().close();}
  await b.close();
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
})();
