// Проверка, что интерфейс работает под той же CSP, что выдаёт nginx (frontend/nginx.conf).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const conf = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8');
const csp = conf.match(/location \/ \{[\s\S]*?Content-Security-Policy "([^"]+)"/)[1];
const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:4173';
const b = await chromium.launch(); const p = await b.newPage(); const bad = [];
p.on('console', (m) => { if (/Content.Security.Policy|Refused/i.test(m.text())) bad.push(m.text()); });
await p.route('**/*', async (r) => {
  if (r.request().resourceType() !== 'document') return r.continue();
  const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } });
});
for (const path of ['/protection', '/login', '/register']) { await p.goto(BASE + path); await p.waitForLoadState('networkidle'); }
await p.getByRole('link', { name: 'Защита' }).first().click();
await p.getByLabel(/Текст сообщения/).fill('Установите AnyDesk'); await p.getByRole('button', { name: 'Проверить', exact: true }).click();
await p.getByText('Критический риск').waitFor();
await b.close();
console.log(bad.length ? 'CSP НАРУШЕНИЯ:\n' + bad.join('\n') : 'CSP: нарушений нет');
process.exit(bad.length ? 1 : 0);
