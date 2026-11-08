// Сквозные тесты нового интерфейса против живого API и PostgreSQL.
// Нужны запущенные backend (uvicorn, :8000) и `npm run preview` (:4173, проксирует /api).
//   E2E_URL=http://127.0.0.1:4173 PW_BROWSER=chromium|webkit|firefox node e2e/run.mjs
import { chromium, firefox, webkit } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.env.E2E_URL ?? 'http://127.0.0.1:4173';
const ENGINE = { chromium, firefox, webkit }[process.env.PW_BROWSER ?? 'chromium'];
const PASSWORD = 'Ласточка-весна-2026';
const OUT = join(tmpdir(), 'immunity-e2e'); mkdirSync(OUT, { recursive: true });
const results = [];
let failed = 0;

async function step(name, fn) {
  try { await fn(); results.push(['✓', name]); }
  catch (e) { failed++; results.push(['✗', name + ' — ' + String(e?.message ?? e).split('\n')[0]]); }
}
const expect = (c, m) => { if (!c) throw new Error(m); };

try { const r = await fetch(URL + '/api/v1/health'); const j = await r.json(); expect(j.db, 'БД недоступна'); }
catch (e) { console.error('Нет связи с ' + URL + ': запустите backend и `npm run preview`.', e.message); process.exit(2); }

const browser = await ENGINE.launch();
const jsErrors = [];
async function page(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => jsErrors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR_|Failed to load resource/.test(m.text())) jsErrors.push(m.text()); });
  return p;
}
const email = `e2e${Date.now()}@example.org`;

// 1. Без входа
let p = await page();
await step('без входа личные разделы ведут на вход с возвратом', async () => {
  await p.goto(URL + '/analytics');
  await p.waitForURL(/\/login\?next=%2Fanalytics/);
});
await step('проверка ссылки без аккаунта: подделка IDN → высокий риск, результат не сохраняется', async () => {
  await p.goto(URL + '/protection');
  await p.getByRole('radio', { name: 'Ссылка' }).click();
  await p.getByLabel('Адрес ссылки').fill('https://gоsuslugi.ru/login');
  await p.getByRole('button', { name: 'Проверить', exact: true }).click();
  await p.getByText('Высокий риск').waitFor();
  expect(await p.getByText('Буквы разных алфавитов').count() > 0, 'нет признака смешанных алфавитов');
  expect(await p.getByText('Без входа результат нигде не сохраняется').count() === 1, 'нет пометки о сохранении');
});
await step('экстренная памятка с датой проверки и без устаревших сроков', async () => {
  const t = await p.locator('#emergency').innerText();
  expect(/30 дней/.test(t) && !/10 рабочих дней/.test(t), 'сроки в памятке');
  expect(/проверено 08\.11\.2026/.test(await p.locator('main').innerText()), 'нет даты проверки');
});
await step('?next с чужим сайтом не уводит со страницы', async () => {
  await p.goto(URL + '/login?next=https://evil.example');
  expect(new globalThis.URL(p.url()).host === new globalThis.URL(URL).host, 'ушли с сайта');
});
await p.context().close();

// 2. Регистрация → тренировка → профиль → аналитика
p = await page();
await step('регистрация с ошибкой пароля показывает подсказку у поля', async () => {
  await p.goto(URL + '/register');
  await p.getByLabel('Email').fill(email);
  await p.getByLabel('Пароль').fill('123');
  await p.getByRole('button', { name: 'Создать аккаунт' }).click();
  await p.getByText('Пароль — не короче 10 символов').waitFor();
});
await step('регистрация и автоматический вход', async () => {
  await p.getByLabel('Пароль').fill(PASSWORD);
  await p.getByLabel('Как к вам обращаться').fill('Тест');
  await p.getByRole('button', { name: 'Создать аккаунт' }).click();
  await p.waitForURL(/\/learning$/);
});
await step('сессия в httpOnly-cookie: токен недоступен JavaScript', async () => {
  const c = (await p.context().cookies()).find((x) => x.name === 'immunity_session');
  expect(c && c.httpOnly && c.sameSite === 'Strict' && c.path === '/api', 'cookie без нужных флагов');
  expect(!(await p.evaluate(() => document.cookie)).includes('immunity_session'), 'cookie видна из JS');
  expect(!(await p.evaluate(() => JSON.stringify(localStorage))).includes('eyJ'), 'токен в localStorage');
});
await step('10 карточек «Верю — не верю» с клавиатуры и мышью, итог', async () => {
  await p.getByRole('link', { name: 'Начать' }).click();
  for (let i = 0; i < 10; i++) {
    await p.getByRole('button', { name: /Не верю/ }).waitFor();
    if (i % 2) await p.keyboard.press('ArrowLeft'); else await p.getByRole('button', { name: /Верю — всё/ }).click();
    await p.getByRole('button', { name: i < 9 ? 'Следующая' : 'Итог' }).click();
  }
  await p.getByText(/из 10 верно/).waitFor();
});
await step('главная: индекс и карта навыков из API', async () => {
  await p.getByRole('link', { name: 'Мой профиль' }).click();
  await p.getByLabel('Индекс защищённости').waitFor();
  expect(/из 100/.test(await p.getByLabel('Индекс защищённости').innerText()), 'нет индекса');
  expect(await p.getByRole('img', { name: /из 100|мало данных/ }).count() === 6, 'карта навыков не из 6 тем');
});
await step('аналитика: 10 попыток, фильтр, переживает перезагрузку', async () => {
  await p.goto(URL + '/analytics');
  await p.getByText('10 попыток').waitFor();
  await p.getByRole('button', { name: 'Звонки' }).click();
  await p.getByText('Здесь пока пусто').waitFor();
  await p.reload();
  await p.getByText('10 попыток').waitFor();
});
await step('профиль: изменение имени сохраняется на сервере', async () => {
  await p.goto(URL + '/profile');
  await p.getByLabel('Как к вам обращаться').fill('Тестовый');
  await p.getByRole('button', { name: 'Сохранить' }).click();
  await p.getByText('Профиль сохранён').waitFor();
  await p.reload();
  expect(await p.getByLabel('Как к вам обращаться').inputValue() === 'Тестовый', 'имя не сохранилось');
});
await step('перенос прогресса из файла экспорта прототипа', async () => {
  const f = join(OUT, 'export.json');
  writeFileSync(f, JSON.stringify({ app: 'immunitet', v: 2, data: { attempts: [
    { k: 'call', id: 'bank_safe', sk: 'codes', s: 0, res: 'bad', ts: Date.now() - 60000, mk: ['code'] },
    { k: 'chat', id: 'job_drop', s: 1, res: 'ok', ts: Date.now() - 50000 },
    { k: 'call', id: '__proto__', s: 1 }] } }));
  await p.locator('#importFile').setInputFiles(f);
  await p.getByText('Перенесено: 2. Пропущено: 1.').waitFor();
  await p.goto(URL + '/analytics');
  await p.getByText('12 попыток').waitFor();
  expect(await p.getByText(/перенесено из прототипа/).count() >= 2, 'нет пометки импорта');
});
await step('сбой API показывает ошибку с кнопкой «Повторить»', async () => {
  await p.route('**/api/v1/skills/me', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'x', message: 'Сервис временно недоступен' } }) }));
  await p.goto(URL + '/');
  await p.getByText('Сервис временно недоступен').waitFor();
  await p.unroute('**/api/v1/skills/me');
  await p.getByRole('button', { name: 'Повторить' }).first().click();
  await p.getByLabel('Индекс защищённости').waitFor();
});
await step('выход: личные разделы снова закрыты', async () => {
  await p.goto(URL + '/profile');
  await p.getByRole('button', { name: 'Выйти', exact: true }).click();
  await p.waitForURL(/\/login/);
  await p.goto(URL + '/analytics');
  await p.waitForURL(/\/login/);
});
await p.context().close();

// 3. Изоляция данных и мобильный вид
p = await page({ viewport: { width: 390, height: 844 }, isMobile: process.env.PW_BROWSER !== 'firefox', hasTouch: true, colorScheme: 'dark' });
await step('второй пользователь не видит чужую историю', async () => {
  await p.goto(URL + '/register');
  await p.getByLabel('Email').fill('other' + email);
  await p.getByLabel('Пароль').fill(PASSWORD);
  await p.getByRole('button', { name: 'Создать аккаунт' }).click();
  await p.waitForURL(/\/learning$/);
  await p.goto(URL + '/analytics');
  await p.getByText('Здесь пока пусто').waitFor();
});
await step('мобильный 390: нижняя навигация, без горизонтальной прокрутки', async () => {
  for (const path of ['/', '/learning', '/protection', '/analytics', '/profile', '/learning/cards']) {
    await p.goto(URL + path);
    await p.waitForLoadState('networkidle');
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    expect(w <= 390, path + ': ширина ' + w);
  }
  expect(await p.getByRole('navigation', { name: 'Разделы' }).isVisible(), 'нет нижней навигации');
});
await p.context().close();
await browser.close();

if (jsErrors.length) { failed++; results.push(['✗', 'ошибки JavaScript: ' + [...new Set(jsErrors)].slice(0, 5).join(' | ')]); }
else results.push(['✓', 'нет ошибок JavaScript в консоли']);
for (const [s, n] of results) console.log(s + ' ' + n);
console.log(`Итого: ${results.length - failed}/${results.length} (${process.env.PW_BROWSER ?? 'chromium'})`);
process.exit(failed ? 1 : 0);
