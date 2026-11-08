// Сборка «Иммунитета» из src/ в dist/.
//   node build.mjs            → dist/index.html  (отдельный сайт: ИИ через свой сервер /api/chat)
//   node build.mjs artifact   → dist/artifact.html (страница-артефакт claude.ai: ИИ через window.claude)
// Обе сборки получают public/ (голоса v/*.mp3) рядом с собой.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

// Порядок важен: всё живёт в одной области видимости <script>.
export const ORDER = [
  '00-util.js',       // хелперы DOM, хранилище, модальные окна, иконки
  '03-data.js',       // контент v1: аудитории, схемы, звонки, переписки, факты, источники
  '03b-content2.js',  // контент v2: навыки, маркеры, тесты A/B, сайты, словарь
  '03c-voices.js',    // манифест озвученных реплик (генерирует tools/voicegen)
  '04a-core.js',      // Store, Privacy, AI-адаптер, Evidence/Assess/Rec, правила, звук/голос
  '04b-mentor.js',    // промпты и ИИ-наставник
  '04-app.js',        // вкладки, индекс, симулятор звонков/переписок, «Верю — не верю», схемы, защита
  '04c-ui2.js',       // диагностика, прогресс, тренажёр сайтов, наставник
  '04d-detective.js', // AI-детектив (единая схема ответа) и экстренный режим
  '04e-voice.js',     // голоса ролей, озвученные клипы, ответ голосом
  '05-org.js',        // кабинет организаций (демо)
  '06-start.js',      // инициализация
];

const target = process.argv[2] === 'artifact' ? 'artifact' : 'web';
const head = readFileSync(join(SRC, '01-head.html'), 'utf8');
const body = readFileSync(join(SRC, '02-body.html'), 'utf8');
let js = ORDER.map(f => `/* ===== ${f} ===== */\n` + readFileSync(join(SRC, f), 'utf8')).join('\n');

const modeLine = "const MODE='artifact';";
if (!js.includes(modeLine)) throw new Error('В 00-util.js не найдена строка ' + modeLine);
if (target === 'web') js = js.replace(modeLine, "const MODE='server';");

mkdirSync(DIST, { recursive: true });
const page = target === 'artifact'
  // артефакт: claude.ai сам оборачивает страницу в <html>, поэтому без doctype
  ? `${head}\n${body}\n<script>\n${js}\n</script>\n`
  : `<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${head}\n</head>\n<body>\n${body}\n<script>\n${js}\n</script>\n</body>\n</html>\n`;
const out = join(DIST, target === 'artifact' ? 'artifact.html' : 'index.html');
writeFileSync(out, page);
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });
console.log(`${target}: ${out} (${(Buffer.byteLength(page) / 1024).toFixed(0)} КБ)`);
