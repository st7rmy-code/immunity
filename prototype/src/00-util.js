/* ===== ОБЩИЕ УТИЛИТЫ (без бизнес-логики) ===== */
const MODE='artifact'; // build.mjs меняет на 'server' для отдельного сайта: ИИ через /api/chat
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const el=(t,a={},...kids)=>{const e=document.createElement(t);for(const k in a){const v=a[k];if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='html')e.innerHTML=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v);}kids.flat().forEach(c=>{if(c!=null&&c!==false)e.append(c.nodeType?c:document.createTextNode(c));});return e;};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
function toast(t){$$('.toast').forEach(x=>x.remove());const d=el('div',{class:'toast',role:'status',text:t});document.body.append(d);setTimeout(()=>d.remove(),2800);}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function plural(n,a,b,c){const m10=n%10,m100=n%100;return n+' '+(m10===1&&m100!==11?a:m10>=2&&m10<=4&&(m100<12||m100>14)?b:c);}
function fmtDur(s){return s<60?plural(s,'секунду','секунды','секунд'):Math.floor(s/60)+' мин '+(s%60)+' с';}
function fmtSec(ms){return ms==null?'—':(ms/1000).toFixed(ms<10000?1:0).replace('.',',')+' с';}
function mmss(s){s=Math.max(0,Math.round(s));const h=Math.floor(s/3600);const m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+String(x).padStart(2,'0');}
function clock(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function pct(v,d=0){return v==null?'—':(v*100).toFixed(d).replace('.',',')+'%';}
function srcLink(k){if(Array.isArray(k)){const l=k.map(srcLink).filter(Boolean);return l.length?el('span',{class:'stack',style:'gap:2px'},...l):null;}const s=own(SRC,k)?SRC[k]:null;return s?el('span',{class:'src'},'Источник: ',el('a',{href:s.u,target:'_blank',rel:'noopener'},s.n),', '+s.d+(s.chk?' · проверено '+s.chk:'')):null;}
function parseJSON(t){const m=String(t).match(/\{[\s\S]*\}/);if(!m)throw{code:'parse'};try{return JSON.parse(m[0]);}catch(e){throw{code:'parse'};}}
function initials(n){if(/^[+\d]/.test(n))return '#';const em=n.match(/\p{Extended_Pictographic}/u);if(em&&n.indexOf(em[0])===0)return em[0];const w=n.replace(/[«»"().,·|]/g,' ').split(/\s+/).filter(x=>/^[А-ЯЁA-Z]/i.test(x));return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase();}
/* Безопасные справочники: собственные свойства и запрет служебных ключей (защита от загрязнения прототипов) */
const own=(o,k)=>o!=null&&(typeof k==='string'||typeof k==='number')&&Object.prototype.hasOwnProperty.call(o,k);
const BAD_KEYS=new Set(['__proto__','constructor','prototype']);
const safeKey=k=>typeof k==='string'&&k.length>0&&k.length<=80&&!BAD_KEYS.has(k);
const dict=o=>Object.setPrototypeOf(o,null); // справочник без прототипа: CATS['__proto__'] → undefined
const LVL={1:'Базовый',2:'Средний',3:'Сложный'};
const RES_T={ok:'без потерь',warn:'с ошибками',bad:'попались'};
const KIND_T={call:'Звонок',chat:'Переписка',site:'Сайт',card:'Верю — не верю',item:'Проверка'};
const IC={
 phone:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.13.37 2.33.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
 hang:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85a1 1 0 0 1-1.41-.02L.29 13.08a1 1 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67a1 1 0 0 1 0 1.41l-2.48 2.47a1 1 0 0 1-1.41.02 11.3 11.3 0 0 0-2.67-1.85 1 1 0 0 1-.56-.9v-3.1A14.9 14.9 0 0 0 12 9z"/></svg>',
 vol:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.06a7 7 0 0 1 0 13.48v2.06a9 9 0 0 0 0-17.6z"/></svg>',
 mute:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.8v2.06A7 7 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
 mic:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>',
 play:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zm-8 0V7a3 3 0 0 1 6 0v2H9z"/></svg>'
};
const ico=n=>el('span',{class:'c',html:IC[n]});
/* логотип: щит и антитело */
function markSVG(size){return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path class="mk-s" d="M16 2.6 26.6 6.4V14.6C26.6 21.6 22.2 26.9 16 29.4 9.8 26.9 5.4 21.6 5.4 14.6V6.4Z" stroke-width="1.9" stroke-linejoin="round"/><path class="mk-y" d="M16 23.2V16.6M16 16.6 11.6 12.2M16 16.6 20.4 12.2M9.4 12.6 11.2 10.8M20.8 10.8 22.6 12.6" stroke-width="2.6" stroke-linecap="round"/></svg>';}
/* нижний лист-подсказка и модальное окно */
function tip(t,body){const L=$('#tipLayer');L.innerHTML='';const close=()=>{L.innerHTML='';document.removeEventListener('keydown',esc);};const esc=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',esc);L.append(el('div',{class:'tip',role:'dialog','aria-label':t},el('div',{class:'in'},el('div',{class:'ph'},el('h3',{text:t}),el('button',{class:'btn sm ghost',onclick:close},'Закрыть')),typeof body==='string'?el('p',{class:'muted',text:body}):body)));}
function modal(title,content,{onClose}={}){const L=$('#tipLayer');L.innerHTML='';const prev=document.activeElement;const close=()=>{L.innerHTML='';document.removeEventListener('keydown',key);if(prev&&prev.focus)try{prev.focus();}catch(e){}onClose&&onClose();};
  const box=el('div',{class:'modal',role:'dialog','aria-modal':'true','aria-label':title},el('div',{class:'ph'},el('h2',{text:title}),el('button',{class:'btn sm ghost',onclick:close,'aria-label':'Закрыть'},'✕')),content);
  const key=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const f=[...box.querySelectorAll('button,textarea,input,select,a[href]')].filter(x=>!x.disabled);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}};
  document.addEventListener('keydown',key);L.append(el('div',{class:'scrim',onclick:e=>{if(e.target.classList.contains('scrim'))close();}},box));setTimeout(()=>{const f=box.querySelector('textarea,input,button.primary');f&&f.focus();},30);return close;}
