// Сборка артефакт-версии и прогон всех браузерных тестов (Playwright + Chromium).
// npm test  →  unit, ui, voice, clips, mobile360, e2e. Скриншоты и отчёты — в tests/out/.
// PW_BROWSER=chrome|msedge|webkit|firefox npm test — другой браузер (см. tests/browser.js).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const T = dirname(fileURLToPath(import.meta.url)), ROOT = join(T, '..');
execFileSync(process.execPath, [join(ROOT, 'build.mjs'), 'artifact'], { stdio: 'inherit' });
rmSync(join(T, 'out'), { recursive: true, force: true });
mkdirSync(join(T, 'out'), { recursive: true });
cpSync(join(ROOT, 'public', 'v'), join(T, 'out', 'v'), { recursive: true });
const only = process.argv.slice(2);
let failed = 0;
for (const f of ['unit.test.js', 'ui.test.js', 'voice.test.js', 'clips.test.js', 'mobile360.test.js', 'e2e.test.js']) {
  if (only.length && !only.some(o => f.startsWith(o))) continue;
  const r = spawnSync(process.execPath, [join(T, f)], { encoding: 'utf8', timeout: 600000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0 && /NO ERRORS/.test(out) && !/ERRORS:/.test(out);
  console.log((ok ? '✓ ' : '✗ ') + f + (process.env.PW_BROWSER ? ' [' + process.env.PW_BROWSER + ']' : ''));
  if (!ok) { failed++; console.log(out.split('\n').filter(l => l && !/^\s+'/.test(l)).slice(-25).join('\n')); }
}
process.exit(failed ? 1 : 0);
