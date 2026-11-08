/* ===== Голоса собеседников и ответ голосом в звонке ===== */
const VOICE_P={bank_safe:{g:'f',rate:1.02},fsb_declare:{g:'m',rate:.97},rosfin_fake:{g:'f'},gos_hack:{g:'f',rate:1.04},operator:{g:'f',rate:1.05},socfond:{g:'f'},exam:{g:'f',rate:1.06},grandson:{g:'m',rate:1.1},intercom:{g:'m'},courier:{g:'f',rate:1.04},boss:{g:'m'},honest_bank:{g:'f'},honest_delivery:{g:'m',rate:1.04},boss_voice:{g:'m',rate:1.07},daughter_voice:{g:'f',rate:1.05}};
function guessG(who){who=String(who||'');const w=who.trim().split(/\s+/)[0]||'';return /(овна|евна|ична)\b/i.test(who)||/^(мама|мам|бабушка|дочь|сестра|катя|аня|лена|оля|маша|таня|наташа|алина|елена|татьяна|подруга)/i.test(w)?'f':'m';}
function voiceOf(sc){const p=VOICE_P[sc&&sc.id]||{};return{g:p.g||guessG(sc&&sc.who),rate:p.rate||1,pitch:1};}
const DIGIT_W={'ноль':0,'нуль':0,'один':1,'одна':1,'раз':1,'два':2,'две':2,'три':3,'четыре':4,'пять':5,'шесть':6,'семь':7,'восемь':8,'девять':9};
function digitsOf(t){return String(t||'').toLowerCase().split(/[^0-9а-яё]+/).map(w=>/^\d+$/.test(w)?w:w in DIGIT_W?String(DIGIT_W[w]):'').join('');}

const VC={listening:false};
const hfOn=()=>!!(S.handsFree&&STT.agreed&&STT.ok());
function markMic(){const b=$('#micBtn');if(b){b.classList.toggle('on',VC.listening);b.setAttribute('aria-pressed',String(VC.listening));b.setAttribute('aria-label',VC.listening?'Закончить ответ':'Ответить голосом');b.disabled=!!(SIM&&SIM.busy&&!VC.listening);}
  const i=$('#phIn');if(i)i.placeholder=VC.listening?'Говорите — я слушаю…':'Ответьте своими словами…';}
const HANG_RE=/(кладу трубку|положу трубку|сбрасываю|отключаюсь|до свидания|прощайте|всего доброго)/i;
function onVoiceAnswer(t){if(!SIM||SIM.ended||SIM.busy)return;
  if(HANG_RE.test(t)&&!(SIM.sms&&digitsOf(t).includes(SIM.code))){meSay(t);SIM.ev.hangup=true;SIM.decAt=Date.now();sysSay('Вы положили трубку');end();return;}
  userSend(t);}
async function micStart(auto){if(!SIM||SIM.ended||SIM.dead||SIM.mode!=='call'||SIM.state!=='talk'||STT.on)return;if(SIM.busy)return;
  if(!STT.ok()){toast('Этот браузер не распознаёт речь. Голосом можно отвечать в Chrome, Edge и Safari.');return;}
  if(!STT.agreed){if(auto)return;if(!(await STT.consent()))return;if(!SIM||SIM.ended)return;}
  hush();
  const ok=STT.start({interim:t=>{const i=$('#phIn');if(i)i.value=t;},
    end:(t,err)=>{VC.listening=false;markMic();const i=$('#phIn');if(i)i.value='';
      if(!SIM||SIM.ended||SIM.dead)return;
      if(t){onVoiceAnswer(t);return;}
      if(err==='aborted')return;
      if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(err)){S.handsFree=false;save();renderCtl();toast(STT.msg(err));return;}
      if(err==='no-speech'&&auto){toast('Не расслышал. Нажмите на микрофон, когда будете готовы ответить');return;}
      toast(STT.msg(err));}});
  if(!ok){toast(STT.msg(''));return;}
  VC.listening=true;markMic();}
function maybeAutoListen(){if(!hfOn()||!SIM||SIM.mode!=='call'||SIM.state!=='talk'||SIM.ended||SIM.dead||SIM.busy||STT.on||TTS.speaking())return;
  const ls=SIM.lines.filter(l=>!l.sys),last=ls[ls.length-1];if(!last||last.me||SIM.autoFor===SIM.lines.length)return;
  SIM.autoFor=SIM.lines.length;setTimeout(()=>{if(!SIM||SIM.ended||SIM.busy||TTS.speaking()){if(SIM)SIM.autoFor=-1;return;}micStart(true);},350);}
TTS.onIdle(()=>setTimeout(maybeAutoListen,250));
async function toggleHandsFree(){
  if(!STT.ok()){toast('Этот браузер не распознаёт речь. Голосом можно отвечать в Chrome, Edge и Safari.');return;}
  if(hfOn()){S.handsFree=false;save();STT.stop(true);VC.listening=false;renderCtl();return;}
  if(!(await STT.consent()))return;S.handsFree=true;save();if(SIM&&!SIM.ended){SIM.autoFor=-1;renderCtl();}
  toast('После каждой реплики собеседника микрофон включится сам');}

/* --- настройки голосов --- */
const VOICE_HINT='Лучше всего звучат: в Edge — Svetlana и Dmitry (Online, Natural), в Chrome — «Google русский», на iPhone и Mac — Milena и Yuri в улучшенном качестве (их можно скачать в настройках системы: Универсальный доступ → Устная речь).';
function voiceLabel(x){return x.name.replace(/^Microsoft\s+/,'').replace(/\s*-\s*Russian.*$/i,'')+(x.q>=5?' — естественный':x.q<=0?' — простой':'');}
function playKey(k){clipStop();const a=new Audio('v/'+k+'.mp3');CLIP.cur=a;a.onended=()=>{if(CLIP.cur===a)CLIP.cur=null;};a.play().catch(()=>toast('Не удалось воспроизвести запись в этом окне'));}
function openVoiceSettings(){TTS.load();const L=TTS.list,body=el('div',{class:'stack',style:'gap:14px'});
  if(hasClips()){const r1=el('input',{type:'radio',name:'cv',value:'voice'}),r2=el('input',{type:'radio',name:'cv',value:'ai'});(S.callVoice==='ai'?r2:r1).checked=true;
    [r1,r2].forEach(r=>r.onchange=()=>{S.callVoice=r.value;save();renderAIStatus();});
    body.append(el('div',{class:'stack',style:'gap:8px'},el('b',{text:'Собеседник в звонках'}),
      el('label',{class:'row ropt'},r1,el('span',{},el('b',{text:'Нейросетевые голоса'}),el('span',{class:'small muted',text:' — живая речь; собеседник говорит по сценарию и реагирует на ваши ответы'}))),
      el('label',{class:'row ropt'},r2,el('span',{},el('b',{text:'ИИ импровизирует'}),el('span',{class:'small muted',text:' — отвечает на любые слова, но говорит голосом браузера'})))));
    const femBox=el('div',{class:'stack',style:'gap:6px'});
    const drawFem=()=>{femBox.innerHTML='';femBox.append(el('b',{text:'Голос женских ролей'}),el('div',{class:'fem'},[['','Разные по ролям']].concat(FEM.map(f=>[f,SPK_T[f]])).map(([v,t])=>el('div',{class:'femopt'+((S.femVoice||'')===v?' on':'')},
      el('button',{class:'btn sm'+((S.femVoice||'')===v?' primary':''),'aria-pressed':String((S.femVoice||'')===v),onclick:()=>{S.femVoice=v;save();drawFem();if(v)playKey(vKey(v,VOICE_SAMPLE[v]));}},t),
      v?el('button',{class:'btn sm ghost','aria-label':'Прослушать: '+t,onclick:()=>playKey(vKey(v,VOICE_SAMPLE[v]))},'▶'):null))),
      el('span',{class:'small muted',text:'Сотрудницы «банка», «Госуслуг», «оператора», «соцфонда» и курьер. По умолчанию у каждой роли свой голос.'}));};
    drawFem();body.append(femBox);
    body.append(el('div',{class:'row'},el('span',{class:'small muted',text:'Мужские роли:'}),['aidar','eugene'].map(s=>el('button',{class:'btn sm ghost',onclick:()=>playKey(vKey(s,VOICE_SAMPLE[s]))},'▶ '+SPK_T[s]))));
    body.append(el('h3',{text:'Голос браузера — для режима ИИ'}));}
  if(!TTS.ok||!L.length)body.append(el('p',{class:'small',text:'В этом браузере нет русских голосов, поэтому собеседник «говорит» только текстом. '+VOICE_HINT}));
  else{
    const mk=(g,title,sample)=>{const cur=TTS.best(g);const sel=el('select',{'aria-label':title},L.map(x=>{const o=el('option',{value:x.name},voiceLabel(x));if(cur&&x.name===cur.name)o.selected=true;return o;}));
      sel.onchange=()=>{S[g==='f'?'vFemale':'vMale']=sel.value;save();hush();speak(sample,{g});};
      return el('div',{class:'stack',style:'gap:6px'},el('label',{},title,sel),el('button',{class:'btn sm',onclick:()=>{hush();if(!speak(sample,{g}))toast('Звук выключен — включите «Звук и голос»');}},'▶ Прослушать'));};
    body.append(el('div',{class:'g2'},mk('m','Мужские роли','Здравствуйте! Служба безопасности банка. С вашей карты пытаются перевести деньги, нужно срочно отменить операцию.'),mk('f','Женские роли','Добрый день! Социальный фонд, отдел перерасчётов. Вам положена доплата к пенсии.')));
    const rate=el('input',{type:'range',min:'0.8',max:'1.3',step:'0.05','aria-label':'Скорость речи'});rate.value=String(S.vRate||1);
    const rv=el('span',{class:'mono small',text:'×'+(+rate.value).toFixed(2)});rate.oninput=()=>{S.vRate=+rate.value;rv.textContent='×'+S.vRate.toFixed(2);};rate.onchange=()=>save();
    body.append(el('label',{},el('span',{class:'row',style:'justify-content:space-between'},'Скорость речи',rv),rate));
    body.append(el('p',{class:'small muted',text:(TTS.good()?'Голоса с пометкой «естественный» звучат ближе всего к живой речи. ':'Естественных голосов в этом браузере нет — доступны только упрощённые. ')+VOICE_HINT}));}
  body.append(el('div',{class:'lim'},el('b',{class:'small',text:'Ответ голосом'}),el('span',{class:'small',text:STT.ok()?'В звонке нажмите микрофон рядом с полем ответа. Или включите «Голосом» внизу экрана — тогда микрофон будет включаться сам после каждой реплики собеседника, как в настоящем разговоре.':'Этот браузер не распознаёт речь. Голосом можно отвечать в Chrome, Edge и Safari.'})));
  body.append(el('p',{class:'tiny faint',text:(hasClips()?'Нейросетевые голоса: Silero TTS (silero.ai), лицензия CC BY-NC 4.0 — для учебного некоммерческого использования. ':'')+'Голос браузера зависит от устройства. Настройки сохраняются только в этом браузере.'}));
  modal('Голоса и микрофон',body,{onClose:()=>hush()});}

/* --- Нейросетевые голоса Silero: реплики сценариев озвучены заранее и лежат рядом со страницей --- */
const SILERO={bank_safe:'baya',rosfin_fake:'kseniya',gos_hack:'xenia',operator:'xenia',socfond:'kseniya',exam:'xenia',courier:'baya',honest_bank:'kseniya',fsb_declare:'aidar',grandson:'eugene',intercom:'eugene',honest_delivery:'eugene',boss_voice:'aidar',boss:'aidar',daughter_voice:'xenia'};
const SPK_T={baya:'Бая',kseniya:'Ксения',xenia:'Ксюша',aidar:'Айдар',eugene:'Евгений'};
const FEM=['baya','kseniya','xenia'];
function spkOf(sc){const g=voiceOf(sc).g;if(g==='f'&&FEM.includes(S.femVoice))return S.femVoice;return SILERO[sc&&sc.id]||(g==='f'?'xenia':'aidar');}
function vKey(spk,text){const s=spk+'|'+speechParts(text).join(' ');let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36);}
const hasClips=()=>typeof VOICE_FILES==='object'&&Object.keys(VOICE_FILES).length>0;
function useRecorded(sim){return !!(sim&&sim.mode==='call'&&hasClips()&&S.voice&&S.callVoice!=='ai');}
const CLIP={q:[],cur:null,gen:0,broken:false};
function clipStop(){CLIP.gen++;CLIP.q=[];if(CLIP.cur){try{CLIP.cur.pause();}catch(e){}CLIP.cur=null;}}
function clipNext(){if(CLIP.cur||!CLIP.q.length)return;const it=CLIP.q.shift(),gen=CLIP.gen,a=new Audio('v/'+it.k+'.mp3');CLIP.cur=a;a.preload='auto';
  const done=ok=>{if(gen!==CLIP.gen)return;CLIP.cur=null;if(!ok){CLIP.broken=true;speak(it.text,it.o);}TTS.pending=Math.max(0,TTS.pending-1);if(!TTS.pending)TTS.idle();clipNext();};
  a.onended=()=>done(true);a.onerror=()=>done(false);a.play().catch(()=>done(false));}
/* единая точка: заранее озвученный клип, а если его нет — голос браузера */
function say(text,sc){const o=voiceOf(sc);if(!S.voice)return false;const k=vKey(spkOf(sc),text);
  const want=SIM&&SIM.mode==='chat'?true:useRecorded(SIM);
  if(want&&hasClips()&&VOICE_FILES[k]&&!CLIP.broken){TTS.pending++;CLIP.q.push({k,text,o});clipNext();return true;}
  return speak(text,o);}
const VOICE_SAMPLE={baya:'Здравствуйте! Меня зовут Бая. Не волнуйтесь, я помогу вам во всём разобраться.',kseniya:'Добрый день! Меня зовут Ксения. Уделите мне, пожалуйста, одну минуту.',xenia:'Привет! Я Ксюша. Это займёт буквально пару секунд, честное слово.',aidar:'Добрый день. Меня зовут Айдар. Слушайте внимательно, времени у нас мало.',eugene:'Здравствуйте! Меня зовут Евгений. Я вас долго не задержу.'};
