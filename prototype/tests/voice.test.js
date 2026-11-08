const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');const SP=path.resolve(__dirname,'..');
const out=SP+'/tests/out/';
const page0=fs.readFileSync(SP+'/dist/artifact.html','utf8');
const FAKE=`<script>(function(){
window.__spoken=[];window.__recStarts=0;window.__nextSpeech='';window.__recErr='';
const VOICES=[{name:'Microsoft Irina - Russian (Russia)',lang:'ru-RU',localService:true},{name:'Microsoft Pavel - Russian (Russia)',lang:'ru-RU',localService:true},{name:'Microsoft Svetlana Online (Natural) - Russian (Russia)',lang:'ru-RU',localService:false},{name:'Microsoft Dmitry Online (Natural) - Russian (Russia)',lang:'ru-RU',localService:false},{name:'Google русский',lang:'ru-RU',localService:false},{name:'Samantha',lang:'en-US',localService:true}];
let q=[];const synth={getVoices:()=>VOICES,speaking:false,addEventListener(){},cancel(){q.forEach(u=>u.onerror&&u.onerror({error:'interrupted'}));q=[];},speak(u){q.push(u);window.__spoken.push({text:u.text,voice:u.voice&&u.voice.name,rate:u.rate});setTimeout(()=>{const i=q.indexOf(u);if(i<0)return;q.splice(i,1);u.onend&&u.onend({});},40);}};
Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true});
window.SpeechSynthesisUtterance=function(t){this.text=t;};
class FakeRec{start(){window.__recStarts++;const self=this;setTimeout(()=>{if(self._ab)return;if(window.__recErr){self.onerror&&self.onerror({error:window.__recErr});self.onend&&self.onend();return;}const t=window.__nextSpeech;if(t){self.onresult&&self.onresult({resultIndex:0,results:[Object.assign([{transcript:t.slice(0,5)}],{isFinal:false})]});self.onresult&&self.onresult({resultIndex:0,results:[Object.assign([{transcript:t}],{isFinal:true})]});}else self.onerror&&self.onerror({error:'no-speech'});self.onend&&self.onend();},150);}stop(){}abort(){this._ab=true;}}
window.webkitSpeechRecognition=FakeRec;window.SpeechRecognition=FakeRec;
})();</script>`;
const wrap=h=>'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+h+'</head><body>'+page0+'</body></html>';
fs.writeFileSync(out+'voice.html',wrap(FAKE));
fs.writeFileSync(out+'nostt.html',wrap(FAKE.replace('window.webkitSpeechRecognition=FakeRec;window.SpeechRecognition=FakeRec;','delete window.webkitSpeechRecognition;delete window.SpeechRecognition;window.webkitSpeechRecognition=undefined;window.SpeechRecognition=undefined;')));
(async()=>{const b=await chromium.launch();const errs=[],log=(...a)=>console.log(...a),need=(c,m)=>{if(!c)errs.push(m);};
  const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await p.goto('file://'+out+'voice.html');await p.waitForTimeout(400);
  await p.evaluate(()=>{S.callVoice='ai';});
  const best=await p.evaluate(()=>({m:TTS.best('m').name,f:TTS.best('f').name,n:TTS.list.length,good:TTS.good()}));log('best voices:',JSON.stringify(best));
  need(/Dmitry Online/.test(best.m)&&/Svetlana Online/.test(best.f)&&best.n===5,'voice ranking');
  // звонок: мужской голос, речь по фразам
  await p.evaluate(()=>openSim('call','bank_safe'));await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(1500);
  const sp=await p.evaluate(()=>window.__spoken);log('spoken:',sp.length,sp[0]&&sp[0].voice,'|',sp.map(x=>x.text).slice(0,3).join(' | '));
  need(sp.length>=2&&sp.every(x=>/Svetlana/.test(x.voice)),'bank_safe (female persona) uses female natural voice in sentence chunks');
  need(!sp.some(x=>/[«»()]/.test(x.text)),'quotes/parentheses not stripped');
  // ответ голосом кнопкой
  await p.evaluate(()=>{window.__nextSpeech='А кто вы такой? Назовите ваше ФИО';});
  await p.click('#micBtn');await p.waitForTimeout(150);need(await p.$('.modal'),'mic consent modal');
  await p.screenshot({path:out+'v_consent.png'});
  await p.click('.modal .btn.primary');await p.waitForTimeout(150);
  need(await p.evaluate(()=>VC.listening||STT.on||window.__recStarts>0),'recognition did not start');
  await p.waitForTimeout(1800);
  const me=await p.$$eval('#tr .bub.me',x=>x.map(e=>e.textContent));log('my bubbles:',me);need(me.some(t=>/кто вы такой/.test(t)),'voice answer not sent');
  // режим «Голосом»: микрофон включается сам после реплики
  const before=await p.evaluate(()=>window.__recStarts);
  await p.evaluate(()=>{window.__nextSpeech='';});
  await p.click('.minibtn:has-text("Голосом")');await p.waitForTimeout(200);
  await p.evaluate(()=>{window.__nextSpeech='Хорошо, что нужно делать?';});
  await p.waitForTimeout(2500);
  const after=await p.evaluate(()=>window.__recStarts);log('auto listen starts:',before,'->',after);need(after>before,'hands-free did not auto-listen');
  await p.screenshot({path:out+'v_handsfree.png'});
  // код словами в режиме «Голосом» -> опасное действие
  await p.waitForTimeout(2500);
  const st=await p.evaluate(()=>({sms:SIM.sms,code:SIM.code,ended:SIM.ended}));log('state:',JSON.stringify(st));
  if(st.sms&&!st.ended){const W=['ноль','один','два','три','четыре','пять','шесть','семь','восемь','девять'];await p.evaluate(t=>{window.__nextSpeech='код '+t;},st.code.split('').map(d=>W[+d]).join(' '));
    await p.waitForTimeout(4500);const v=await p.textContent('#simSide .verdict b').catch(()=>'');log('spoken code verdict:',v);need(/попались/.test(v),'spoken digits not detected as code');}
  else errs.push('no SMS in hands-free flow to test spoken code');
  // фраза «кладу трубку» завершает звонок
  await p.evaluate(()=>{window.__nextSpeech='';openSim('call','fsb_declare');});await p.click('button[aria-label="Ответить"]');
  await p.evaluate(()=>{window.__nextSpeech='Я вам не верю, кладу трубку';});await p.waitForTimeout(3500);
  const v2=await p.evaluate(()=>({ended:SIM.ended,hang:!!SIM.ev.hangup}));log('hangup by voice:',JSON.stringify(v2));need(v2.ended&&v2.hang,'voice hangup');
  await p.evaluate(()=>{window.__spoken=[];openSim('call','intercom');});await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(800);
  need(await p.evaluate(()=>window.__spoken.length&&window.__spoken.every(x=>/Dmitry/.test(x.voice))),'male role voice');
  // женский голос у оператора
  await p.evaluate(()=>{S.handsFree=false;window.__spoken=[];openSim('call','operator');});await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(800);
  {const fv=await p.evaluate(()=>({sp:window.__spoken.map(x=>x.voice),cv:S.callVoice,ur:useRecorded(SIM),pl:CLIP.broken}));need(fv.sp.length&&fv.sp.every(x=>/Svetlana/.test(x)),'female role voice '+JSON.stringify(fv));}
  // настройки голосов
  await p.click('#voiceSet');await p.waitForTimeout(150);const opts=await p.$$eval('.modal select >> nth=0',s=>s[0].options.length).catch(()=>0);
  const n=await p.evaluate(()=>document.querySelectorAll('.modal select')[0].options.length);log('voice options:',n);need(n===5,'voice options');
  await p.screenshot({path:out+'v_settings.png'});
  await p.selectOption('.modal select >> nth=0',{value:'Microsoft Pavel - Russian (Russia)'});await p.waitForTimeout(100);
  need(await p.evaluate(()=>S.vMale==='Microsoft Pavel - Russian (Russia)'&&TTS.best('m').name===S.vMale),'male voice override');
  await p.keyboard.press('Escape');
  // ошибка доступа к микрофону
  await p.evaluate(()=>{S.vMale='';window.__recErr='not-allowed';openSim('call','courier');});await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(900);
  await p.click('#micBtn');await p.waitForTimeout(600);const toast=await p.textContent('.toast').catch(()=>'');log('not-allowed toast:',toast);need(/микрофон/i.test(toast),'not-allowed message');
  await ctx.close();
  // браузер без распознавания речи
  const c2=await b.newContext({viewport:{width:400,height:860},isMobile:true,hasTouch:true});const p2=await c2.newPage();p2.on('pageerror',e=>errs.push('nostt: '+e.message));
  await p2.goto('file://'+out+'nostt.html');await p2.waitForTimeout(300);
  await p2.evaluate(()=>openSim('call','bank_safe'));await p2.click('button[aria-label="Ответить"]');await p2.waitForTimeout(800);
  need(!(await p2.$('#micBtn')),'mic button shown without STT');
  await p2.click('.minibtn:has-text("Голосом")');await p2.waitForTimeout(150);need(/Chrome, Edge и Safari/.test(await p2.textContent('.toast')),'no-STT toast');
  const o=await p2.evaluate(()=>document.documentElement.scrollWidth);need(o<=401,'mobile overflow '+o);
  await p2.screenshot({path:out+'v_mobile.png'});
  await c2.close();await b.close();
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS voice');})();
