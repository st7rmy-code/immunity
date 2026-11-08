const {launch,args}=require('./browser.js');
const fs0=require('fs');fs0.writeFileSync(require('path').resolve(__dirname,'out/plain360.html'),'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fs0.readFileSync(require('path').resolve(__dirname,'../dist/artifact.html'),'utf8')+'</body></html>');
(async()=>{const b=await launch();const ctx=await b.newContext({viewport:{width:360,height:780},hasTouch:true,isMobile:true});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+require('path').resolve(__dirname,'out/plain360.html'));await p.waitForTimeout(300);
const chk=async t=>{const o=await p.evaluate(()=>{const W=360;return {sw:document.documentElement.scrollWidth,bad:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&!e.closest('.seg,nav.tabs,.tbl,pre')}).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,24)+'#'+e.id+':'+Math.round(e.getBoundingClientRect().right))}});if(o.sw>361)errs.push(t+' '+o.sw+' '+o.bad.join(' | '));};
await chk('home');
await p.evaluate(()=>startTest('pre'));await chk('test');
for(let i=0;i<12;i++){const t=await p.evaluate(()=>TEST.items[TEST.i].type);if(t==='judge')await p.click('.swbtns .btn.danger');else await p.click('.btn.opt >> nth=1');}
await chk('report');
for(const t of ['progress','train','mentor','schemes','protect','org']){await p.click('nav.tabs button[data-tab="'+t+'"]');await p.waitForTimeout(150);await chk(t);}
for(const k of ['dash','score','api','widget']){await p.click('#orgSeg button[data-o="'+k+'"]');await p.waitForTimeout(300);await chk('org '+k);}
await p.click('nav.tabs button[data-tab="mentor"]');for(const t of ['ask','mist','gloss']){await p.click('#mSeg button[data-t="'+t+'"]');await p.waitForTimeout(100);await chk('mentor '+t);}
await p.evaluate(()=>openSim('call','bank_safe'));await p.click('button[aria-label="Ответить"]');await p.waitForTimeout(1200);await chk('call');
await p.evaluate(()=>openSite('site_invest'));await p.waitForTimeout(200);await chk('site');await p.screenshot({path:require('path').resolve(__dirname,'out/w360_site.png'),fullPage:true});
await p.click('.tray .btn >> nth=1');await p.waitForTimeout(200);await chk('site res');
await p.evaluate(()=>{showTab('progress');importProgress();});await p.waitForTimeout(100);await chk('modal');await p.screenshot({path:require('path').resolve(__dirname,'out/w360_modal.png')});
await p.keyboard.press('Escape');
await p.evaluate(()=>{showTab('mentor');setMentorTab('check');Privacy.confirm({text:'тест +7 912 345 67 89',images:[{blob:null}],purpose:'разбор сообщения'});});await p.waitForTimeout(150);await chk('consent');await p.screenshot({path:require('path').resolve(__dirname,'out/w360_consent.png')});
console.log(errs.length?errs.join('\n'):'NO ERRORS 360');await b.close();})();
