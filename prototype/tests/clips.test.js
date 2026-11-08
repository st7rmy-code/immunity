const {launch,args}=require('./browser.js');const fs=require('fs');
const path=require('path');const SP=path.resolve(__dirname,'..'),out=SP+'/tests/out/';
const page0=fs.readFileSync(SP+'/dist/artifact.html','utf8');
const SPY=`<script>(function(){window.__played=[];const P=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__played.push(this.src.split('/').pop());return P.call(this);};
window.__spoken=[];const q=[];Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Google русский',lang:'ru-RU',localService:false}],speaking:false,addEventListener(){},cancel(){q.length=0;},speak(u){window.__spoken.push(u.text);setTimeout(()=>u.onend&&u.onend({}),30);}},configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t;};})();</script>`;
fs.writeFileSync(out+'clips.html','<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+SPY+'</head><body>'+page0+'</body></html>');
(async()=>{const b=await launch(args(['--autoplay-policy=no-user-gesture-required']));const errs=[],need=(c,m)=>{if(!c)errs.push(m);};
 const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+out+'clips.html');await p.waitForTimeout(400);
 need(await p.evaluate(()=>hasClips()&&useRecorded({mode:'call'})),'clips not detected');
 await p.evaluate(()=>openSim('call','bank_safe'));await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(1500);
 const pl=await p.evaluate(()=>({played:window.__played,spoken:window.__spoken,status:$('#aiStatus').textContent}));console.log('open:',JSON.stringify(pl));
 need(pl.played.length===1&&pl.spoken.length===0,'opening line should be one clip, no browser TTS');
 await p.click('.qr:has-text("Назовите ФИО")');await p.waitForTimeout(2200);
 const pl2=await p.evaluate(()=>({played:window.__played.length,spoken:window.__spoken,last:SIM.lines.filter(l=>!l.me&&!l.sys).pop().text}));console.log('after id:',JSON.stringify(pl2));
 need(pl2.played===2&&/Виктория Андреевна/.test(pl2.last),'id answer should be clip with female persona');
 // fallback: unknown text -> browser TTS
 await p.evaluate(()=>themSay('Совершенно новая реплика, которой нет в записи.'));await p.waitForTimeout(300);
 need(await p.evaluate(()=>window.__spoken.length===1),'fallback to browser TTS');
 // AI mode setting switches off clips
 await p.click('#voiceSet');await p.waitForTimeout(150);need(await p.$('.modal input[value="ai"]'),'voice mode radio');
 await p.screenshot({path:out+'c_settings.png'});
 await p.click('.modal .btn:has-text("Бая")');await p.waitForTimeout(300);need(await p.evaluate(()=>window.__played.slice(-1)[0]===vKey('baya',VOICE_SAMPLE.baya)+'.mp3'),'sample play');
 await p.check('.modal input[value="ai"]');need(await p.evaluate(()=>S.callVoice==='ai'&&!useRecorded(SIM)),'ai mode');
 await p.keyboard.press('Escape');
 // missing file -> broken -> TTS fallback
 await p.evaluate(()=>{S.callVoice='voice';VOICE_FILES['zzz']=1;window.__spoken=[];CLIP.q.push({k:'zzz',text:'тест сломанного файла',o:{g:'f'}});TTS.pending++;clipNext();});await p.waitForTimeout(600);
 need(await p.evaluate(()=>CLIP.broken&&window.__spoken.includes('тест сломанного файла')),'broken clip fallback');
 // chat voice message
 await p.evaluate(()=>{CLIP.broken=false;window.__played=[];openSim('chat','daughter_voice');});await p.waitForTimeout(2600);await p.click('.vplay');await p.waitForTimeout(300);
 need(await p.evaluate(()=>window.__played.length===1),'voice message clip');
 // выбор женского голоса
 await p.evaluate(()=>{window.__played=[];S.femVoice='kseniya';openSim('call','operator');});await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(600);
 need(await p.evaluate(()=>window.__played[0]===vKey('kseniya',SIM.sc.open)+'.mp3'),'femVoice override');
 // все ключи манифеста существуют на диске
 const keys=await p.evaluate(()=>Object.keys(VOICE_FILES));const miss=keys.filter(k=>k!=='zzz'&&!fs.existsSync(out+'v/'+k+'.mp3'));need(!miss.length,'missing files: '+miss.length);
 // каждая роль имеет записи для всех реплик сценария
 const gaps=await p.evaluate(()=>{const g=[];CALLS.forEach(sc=>{const ls=[sc.open,...(sc.script||[]).map(x=>typeof x==='string'?x:x.say),...(sc.push||[]),sc.idAns,sc.giveup].filter(Boolean);ls.forEach(t=>{if(!VOICE_FILES[vKey(spkOf(sc),t)])g.push(sc.id+': '+t.slice(0,40));});});return g;});need(!gaps.length,'unvoiced lines: '+gaps.join(' | '));
 // реальное воспроизведение: событие ended приходит
 const ended=await p.evaluate(()=>new Promise(r=>{const a=new Audio('v/'+vKey('xenia',VOICE_SAMPLE.xenia)+'.mp3');a.onended=()=>r('ended '+a.duration.toFixed(2));a.onerror=()=>r('error');a.play().catch(e=>r('play-fail '+e.message));setTimeout(()=>r('timeout'),9000);}));console.log('real playback:',ended);need(/ended/.test(ended),'real mp3 playback');

 await b.close();console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS clips');})();
