// Сквозные маршруты (ТЗ разд. 7): главная → диагностика → тренировка → разбор → прогресс,
// без ИИ, без интернета, клавиатура, восстановление после перезагрузки, честные пометки демо.
const { launch } = require('./browser.js');
const fs = require('fs');
const path = require('path');
const SP = path.resolve(__dirname, '..'), out = SP + '/tests/out/';
const page0 = fs.readFileSync(SP + '/dist/artifact.html', 'utf8');
fs.writeFileSync(out + 'e2e.html', '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + page0 + '</body></html>');

(async () => {
  const b = await launch();
  const errs = [], need = (c, m) => { if (!c) errs.push(m); }, log = (...a) => console.log(...a);
  const mk = async (opts = {}, offline = false) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts));
    if (offline) await ctx.route(/^https?:/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.goto('file://' + out + 'e2e.html'); await p.waitForTimeout(400);
    return p;
  };

  /* 1. Основной маршрут без интернета и без ИИ */
  let p = await mk({}, true);
  need(/недоступен/i.test(await p.evaluate(() => AI.label())), 'без ИИ нет честного статуса');
  // главная
  need(await p.$('#emergencyGrid .embtn'), 'нет экстренного режима на главной');
  // диагностика
  await p.click('#idxCard .btn.primary:has-text("Пройти диагностику")'); await p.waitForTimeout(200);
  for (let i = 0; i < 12; i++) {
    const it = await p.evaluate(() => ({ t: TEST.items[TEST.i].type, scam: TEST.items[TEST.i].scam, ans: TEST.items[TEST.i].ans }));
    if (it.t === 'judge') await p.click(it.scam ? '.swbtns .btn.danger' : '.swbtns .btn.primary'); else await p.click('.btn.opt >> nth=' + it.ans);
    await p.waitForTimeout(50);
  }
  await p.waitForTimeout(250);
  need(/\d/.test(await p.textContent('#idxChipV')), 'индекс не посчитан после диагностики');
  // тренировка: звонок до конца
  await p.click('nav.tabs button[data-tab="train"]'); await p.waitForTimeout(150);
  await p.evaluate(() => openSim('call', 'bank_safe')); await p.click('button[aria-label="Ответить"]'); await p.waitForTimeout(1100);
  await p.fill('#phIn', 'Я перезвоню в банк сам по номеру на карте'); await p.press('#phIn', 'Enter'); await p.waitForTimeout(1400);
  await p.click('.minibtn.danger'); await p.waitForTimeout(400);
  need(await p.$('#simSide .verdict'), 'нет разбора после звонка');
  const att = await p.evaluate(() => S.attempts.length);
  // прогресс
  await p.click('nav.tabs button[data-tab="progress"]'); await p.waitForTimeout(200);
  need((await p.$$('.maprow')).length === 6, 'карта навыков не построена');
  // правовой блок: дата проверки видна
  await p.click('nav.tabs button[data-tab="protect"]'); await p.waitForTimeout(200);
  const law = await p.textContent('#lawList');
  need(/проверено 08\.11\.2026/.test(law), 'нет даты проверки у правовых утверждений');
  need(!/10 рабочих дней/.test(law), 'устаревшее утверждение про 10 рабочих дней осталось');
  // экстренный режим «уже перевёл»
  await p.click('nav.tabs button[data-tab="home"]'); await p.waitForTimeout(100);
  await p.click('#emergencyGrid .embtn >> nth=0'); await p.waitForTimeout(150); await p.click('.modal .btn:has-text("Уже перевёл")'); await p.waitForTimeout(150);
  const em = await p.textContent('.modal');
  need(/30 дней/.test(em) && !/10 рабочих дней/.test(em), 'экстренный режим: устаревшие сроки');
  await p.keyboard.press('Escape');
  // B2B: честные пометки
  await p.click('nav.tabs button[data-tab="org"]'); await p.waitForTimeout(200);
  await p.click('#orgSeg button[data-o="score"]'); await p.waitForTimeout(300);
  const sc = await p.textContent('#tab-org');
  need(/демонстрационный балл риска/i.test(sc), 'B2B: нет «демонстрационный балл риска»');
  need(/для финансовых решений/i.test(sc), 'B2B: нет предупреждения о финансовых решениях');
  need(/синтети/i.test(sc), 'B2B: не обозначена синтетическая выборка');
  need(!/вероятност/i.test(sc.replace(/не вероятность/gi, '')), 'B2B: балл называется вероятностью');
  // восстановление после перезагрузки
  await p.reload(); await p.waitForTimeout(400);
  need((await p.evaluate(() => S.attempts.length)) === att, 'прогресс не восстановлен после перезагрузки');
  log('маршрут: попыток', att);
  await p.context().close();

  /* 2. Клавиатура: вкладки, модальные окна, экстренная кнопка */
  p = await mk();
  await p.focus('nav.tabs button[data-tab="home"]');
  await p.keyboard.press('ArrowRight'); const f1 = await p.evaluate(() => document.activeElement && document.activeElement.dataset.tab);
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  const shown = await p.evaluate(() => [...document.querySelectorAll('section.tab')].filter(s => !s.hidden).map(s => s.id));
  need(f1 === 'train' && shown.join() === 'tab-train', 'вкладки не управляются с клавиатуры: ' + f1 + ' ' + shown);
  await p.click('nav.tabs button[data-tab="home"]'); await p.waitForTimeout(150);
  await p.focus('#emergencyGrid .embtn'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  need(await p.$('.modal'), 'экстренная кнопка не открывается с клавиатуры');
  const inModal = await p.evaluate(() => !!document.activeElement.closest('.modal'));
  need(inModal, 'фокус не переходит в модальное окно');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  need(!(await p.$('.modal')), 'Escape не закрывает окно');
  // видимый фокус
  await p.keyboard.press('Tab');
  const ring = await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none'; });
  need(ring, 'у элемента в фокусе нет видимой рамки');
  // звонок с клавиатуры
  await p.evaluate(() => openSim('call', 'bank_safe')); await p.focus('button[aria-label="Ответить"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(1100);
  await p.focus('#phIn'); await p.keyboard.type('Назовите ФИО'); await p.keyboard.press('Enter'); await p.waitForTimeout(2200);
  need((await p.evaluate(() => SIM.lines.filter(l => !l.me && !l.sys).length)) >= 2, 'звонок не проходится с клавиатуры');
  await p.context().close();

  /* 3. Ошибки аудио: все клипы недоступны — звонок проходит на голосе браузера/тексте */
  p = await mk({}, false);
  await p.route('**/v/*.mp3', r => r.abort());
  await p.evaluate(() => { CLIP.broken = false; openSim('call', 'bank_safe'); }); await p.click('button[aria-label="Ответить"]'); await p.waitForTimeout(1300);
  await p.fill('#phIn', 'Назовите ФИО'); await p.press('#phIn', 'Enter'); await p.waitForTimeout(2200);
  const ae = await p.evaluate(() => ({ them: SIM.lines.filter(l => !l.me && !l.sys).length, pending: TTS.pending, busy: SIM.busy }));
  need(ae.them >= 2 && !ae.busy, 'звонок завис после ошибки аудио: ' + JSON.stringify(ae));
  await p.context().close();

  /* 4. Мобильная ширина 360 и 390: маршрут без горизонтальной прокрутки */
  for (const w of [360, 390]) {
    p = await mk({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true });
    const ov = async t => { const o = await p.evaluate(() => document.documentElement.scrollWidth); if (o > w + 1) errs.push('горизонтальная прокрутка ' + w + ' ' + t + ': ' + o); };
    for (const t of ['home', 'train', 'progress', 'mentor', 'schemes', 'protect', 'org']) { await p.click('nav.tabs button[data-tab="' + t + '"]'); await p.waitForTimeout(150); await ov(t); }
    await p.context().close();
  }

  await b.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS e2e');
})();
