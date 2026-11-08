/* ===== СТАРТ ===== */
(function start(){
  const safe=(name,f)=>{try{f();}catch(e){console.error('[init] '+name,e);}};
  safe('large',applyLarge);safe('auds',renderAuds);safe('index',renderIndex);safe('next',renderNext);safe('pick',renderPick);
  safe('schemes',renderSchemes);safe('local',renderLocal);safe('emgrid',renderEmergencyGrid);safe('prot',renderProt);safe('laws',renderLaws);safe('emerg',renderEmerg);
  safe('facts',()=>FACTS.forEach(f=>$('#facts').append(el('div',{class:'fact'},el('b',{text:f.v}),el('span',{class:'small',text:f.t}),srcLink(f.s)))));
  safe('chips',syncChips);
  Evidence.on(()=>{const ov=Evidence.overall(Evidence.skills());$('#idxChipV').textContent=ov?ov.v:'—';});
  showTab(TABS.includes(S.tab)?S.tab:'home');
  if(S.migrated&&!S.migratedSeen){S.migratedSeen=true;save();toast('Результаты прошлой версии перенесены');}
  AI.init().then(()=>{renderAIStatus();renderMentorStatus();}).catch(()=>{renderAIStatus();renderMentorStatus();});
})();
window.addEventListener('error',e=>{console.error('[runtime]',e.message);});
window.addEventListener('unhandledrejection',e=>{console.error('[promise]',e.reason&&(e.reason.message||e.reason.code)||e.reason);});
