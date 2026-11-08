# «Иммунитет к мошенникам» — анализ и архитектура MVP

Версия 1 · 8 ноября 2026 · основа: прототип `prototype/` (≈520 КБ кода, 329 MP3).
Документ отвечает на этап 1 ТЗ «MVP Architecture & Foundation» и задаёт порядок работ по ТЗ «Техническая стабилизация».

---

## 1. Полный список функций прототипа

| # | Модуль | Функции | Где сейчас |
|---|---|---|---|
| 1 | Главная | Индекс иммунитета по 6 навыкам с погрешностью, «Следующий шаг» (рекомендации с причинами), экстренный режим (6 ситуаций), факты с источниками, выбор аудитории | `04-app.js`, `04d-detective.js` |
| 2 | Диагностика | Тест до и после обучения, формы A/B по 12 заданий, отчёт, сравнение, скачивание отчёта | `04c-ui2.js` (`TEST`), `03b-content2.js` (`ITEMS`) |
| 3 | Тренировки: звонки | 13 сценариев, сценарный собеседник с ветвлением по намерению, ИИ-собеседник, таймер, СМС с кодом, «Проверить» через другой канал, подсказки тренера, разбор и разбор ИИ | `04-app.js` (`SIM`, `scriptTurn`, `verifyFlow`, `end`) |
| 4 | Тренировки: переписки | 14 сценариев, голосовые сообщения, учебная фишинговая страница | `04-app.js` |
| 5 | Тренировки: сайты | 7 страниц (2 честные), отметка подозрительных мест, разбор | `04c-ui2.js` (`openSite`) |
| 6 | «Верю — не верю» | 26 карточек, адаптивная колода | `04-app.js` |
| 7 | Голос | 329 озвученных реплик (Silero), выбор голоса, синтез браузера, ответ голосом и режим «Голосом» | `04e-voice.js`, `04a-core.js` (`TTS`, `STT`) |
| 8 | Прогресс | Карта навыков, KPI, повторяющиеся ошибки, экспорт, импорт, сброс | `04c-ui2.js` |
| 9 | Наставник | AI-детектив (сообщение, ссылка, письмо, скриншоты), вопросы, разбор ошибок, словарь | `04c-ui2.js`, `04d-detective.js`, `04b-mentor.js` |
| 10 | Схемы 2026 | 20 схем, поиск, фильтры, источники | `04-app.js`, `03-data.js` |
| 11 | Защита | 8 мер (самоотчёт), законы, шаги «если уже попались» | `04-app.js`, `03-data.js` |
| 12 | Организациям | Демо: ценность, дашборд, скоринг заявки, API-песочница, виджет | `05-org.js` |
| 13 | Приватность и ИИ | Маскирование PII, согласие, адаптер ИИ (артефакт или `/api/chat`) | `04a-core.js` |
| 14 | Хранилище | localStorage `immunitet.v2`, миграция с v1, проверка ввода | `04a-core.js` (`Store`) |

## 2. Карта зависимостей

```
03-data / 03b-content2 / 03c-voices   (контент, без зависимостей)
          │
00-util ──┼──► 04a-core: Store ─► Evidence ─► Assess, Rec
          │              Privacy ─► AI ─► 04b-mentor (Prompts, Mentor)
          │              TTS/STT
          ▼
04-app (SIM, вкладки) ◄──► 04c-ui2 (TEST, прогресс, сайты, наставник)
   ▲  ▲                         │
   │  └── 04e-voice (say, клипы, микрофон) ◄── TTS/STT
   └──── 04d-detective (правила, схема ответа, экстренный режим)
05-org (демо B2B) ─► localCheck/rulesSchema, AI, Privacy
06-start (инициализация)
```

Главные связи: все модули пишут состояние в глобальный `S` и вызывают `save()`. Симулятор связан с голосом (`say`, `maybeAutoListen`), оценкой (`Evidence.record`) и рекомендациями (`Rec`). Детектив и B2B-песочница используют одни правила.

## 3. Что переносим и куда

| Логика | Новое место | Почему |
|---|---|---|
| `Evidence`, `Assess`, `Rec`, расписание повторений | **backend** `app/domain/skills.py` + вызов через API | Индекс и рекомендации — бизнес-логика. По ТЗ она не дублируется на клиенте |
| Правила детектива (`localCheck`, `urlRules`, `mailRules`, `rulesSchema`), `normSchema` | **backend** `app/domain/detective/` (`POST /api/v1/threat-checks`) | Единые правила для сайта, B2B API и бота |
| PII-маскирование | **backend** (до отправки модели) + **frontend** (превью в окне согласия) | Сервер — последний рубеж. Клиент показывает, что уйдёт |
| ИИ-вызовы | **backend** AI Gateway (`/api/v1/ai/*`), ключи только на сервере | Реальные ИИ-запросы включаются только после готовности шлюза (огр. 10) |
| Сценарный движок звонков (`scriptTurn`, намерения) | **frontend** `features/simulator/engine` (чистый TS) + результат попытки сохраняется на сервере | Нужна мгновенная реакция в разговоре; итог проверяет сервер |
| Контент: схемы, сценарии, тесты, сайты, словарь, источники | **БД** (таблицы `scenarios`, `schemes`, `sources`, `assessment_items`) + сид из `content/*.json` | Редактирование без программиста, версии |
| Аудио | **object storage**, пути в `scenario_lines.audio_key` | Без изменений файлов |
| UI-настройки (тема, крупный шрифт, голос) | localStorage | ТЗ разрешает |
| Демо B2B | **frontend** с пометкой «демо», скоринг — `POST /api/v1/demo/score` | Валидация на сервере |

## 4. Технический долг (по приоритету)

1. **Импорт прогресса уязвим к загрязнению прототипов**: проверки `CATS[x]`, `x in RES_S`, `MARKERS[m]`, `ITEM_BY[id]` пропускают `__proto__` и `constructor`. Через `Evidence` это может изменить `Object.prototype`. (P0)
2. **Согласие на передачу ИИ неполное**: наставник отправляет профиль навыков и историю, а в окне показан только вопрос. Разбор звонка, разбор ошибок и ИИ-собеседник идут без согласия. (P0)
3. **Демо-скоринг выглядит как реальная модель**: «вероятность», AUC на данных, сгенерированных по предположениям той же модели. (P0)
4. Детектив: сумма весов вместо уровней. Критические просьбы (код, «безопасный счёт», удалённый доступ, наличные курьеру) могут получить средний риск, а обычная ссылка — ненулевой. Процент «уверенности правил» не откалиброван. (P1)
5. URL-проверка на регулярках: нет IPv6, логина и пароля в URL, перенаправлений, IDN проверяется частично. (P1)
6. B2B API: нет проверки типов и диапазонов, неверный индекс категории даёт `TypeError`. (P1)
7. Асинхронность симулятора: таймеры прошлого сценария (`danger`, `verifyFlow`, `playOpen`, отложенный `end`, `hush`) срабатывают в новом. (P1)
8. PII: нет иностранных телефонов, IBAN, реквизитов, ФИО, адресов и дат рождения. 20-значный счёт с пробелами маскируется частично. Изображения декодируются без проверки размеров. (P1)
9. Голос: при ошибке MP3 обработчик вызывается дважды, счётчик `TTS.pending` может «зависнуть» и выключить режим «Голосом». (P1)
10. `Evidence.recordMany` не соблюдает лимит истории. (P2)
11. Промпты без явной изоляции недоверенных данных (prompt injection). (P2)
12. Лицензия голосов: файл LICENSE Silero — **CC BY-NC-SA 4.0**, а в README указана CC BY-NC 4.0. Для коммерции нужна лицензия или MIT-модели `v5_cis_base`. (P2)
13. Архитектура: один глобальный скрипт ≈520 КБ, состояние в глобальном `S`, нет типов, нет сервера, данные только в браузере.

## 5. Структура репозитория

```
/prototype        рабочий HTML-прототип (остаётся работать до готовности новой версии)
/frontend         React + TS + Vite + Tailwind + React Router + TanStack Query (+ Zustand)
/backend          FastAPI + Pydantic + SQLAlchemy 2 + Alembic
/infrastructure   docker-compose.yml, Dockerfile'ы, .env.example
/docs             ARCHITECTURE.md, STABILIZATION.md, THIRD_PARTY.md, API.md
/tests            сквозные Playwright-тесты (frontend + backend)
.github/workflows CI: lint, pytest, vitest, playwright
```

### 5.1 Frontend
```
frontend/src/
  app/            роутер, провайдеры (QueryClient, тема), layout (боковая навигация / нижняя мобильная)
  pages/          Dashboard, Learning, Protection, Analytics, Profile, Auth
  features/
    auth/         формы входа и регистрации, хук useSession
    simulator/    engine/ (чистый TS: намерения, ветвление), ui/ (Phone, Transcript, Callbar)
    detective/    форма проверки, отображение схемы ответа
    assessment/   диагностика A/B
    voice/        клипы, синтез, распознавание
  shared/
    ui/           дизайн-система: Button, Card, Badge, Modal, Toast, SkillBar, EmptyState, ErrorState, Skeleton
    api/          клиент OpenAPI (типы генерируются из /api/v1/openapi.json)
    lib/          pii-preview, format
  styles/         токены (из prototype/src/01-head.html) → Tailwind theme
```

### 5.2 Backend (модульный монолит)
```
backend/app/
  main.py         FastAPI, /api/v1, CORS, обработчики ошибок
  core/           config (env), security (хеш паролей, JWT), db (engine, session), deps (current_user, require_role)
  models/         SQLAlchemy: user, organization, scenario, attempt, threat_check, skill
  schemas/        Pydantic: вход и выход API
  api/v1/         auth, users, scenarios, attempts, skills, threat_checks, organizations
  domain/         skills (Evidence и индекс), detective (правила), pii
  seed/           импорт сценариев из prototype (content/*.json)
backend/alembic/  миграции
backend/tests/    pytest: unit (domain), API (httpx), интеграция с PostgreSQL
```

## 6. Схема базы данных (PostgreSQL)

| Таблица | Поля (ключевые) | Заметки |
|---|---|---|
| `organizations` | id, name, kind (school, university, bank, employer, other), created_at | |
| `users` | id (uuid), email (unique, citext), password_hash, display_name, role (`learner`, `teacher`, `org_admin`, `admin`), audience (school, student, adult, senior), organization_id → organizations, is_active, created_at | Минимум PII: e-mail и имя по желанию |
| `skills` | code (pk: calls, codes, phishing, social, money, invest), title, description | Справочник |
| `scenarios` | id (pk, slug как в прототипе: `bank_safe`), kind (call, chat, site, card, item), title, skill_code → skills, level 1–3, audience[], is_legit, content (jsonb: реплики, ветвления, verify), version, is_published | Контент из прототипа |
| `scenario_lines` | id, scenario_id, line_key (vKey), speaker, text, audio_path | Связь с MP3 |
| `training_attempts` | id, user_id → users, scenario_id → scenarios, kind, result (ok, warn, bad), score 0..1, markers text[], duration_ms, phase (practice, pre, post), form (A, B), legit, false_positive, created_at | Основа индекса |
| `threat_checks` | id, user_id (nullable для анонимной проверки не храним — только для вошедших), input_kind (msg, url, mail), risk_level, engine (rules, rules+ai), indicators jsonb, created_at | Сам текст **не храним** |
| `skill_states` | user_id, skill_code, alpha, beta, n_eff, updated_at (pk: user_id + skill_code) | Кэш оценки, пересчитывается из попыток |
| `audit_log` | id, actor_id, action, target, created_at, ip_hash | Этап 4 |

Модель доступа: `learner` видит только свои попытки и проверки. `teacher` и `org_admin` — агрегаты своей организации, без текстов. `admin` — всё. Проверка выполняется в зависимостях FastAPI (`require_role`, фильтр по `user_id` или `organization_id`).

## 7. API-контракты (`/api/v1`)

| Метод | Путь | Доступ | Вход → выход |
|---|---|---|---|
| POST | `/auth/register` | все | `{email, password, display_name?, audience?}` → `201 {access_token, token_type, user}` |
| POST | `/auth/login` | все | `{email, password}` → `{access_token, token_type, user}`; `401` при ошибке |
| GET | `/users/me` | вошедший | → `UserOut` |
| PATCH | `/users/me` | вошедший | `{display_name?, audience?}` → `UserOut` |
| GET | `/scenarios?kind=&skill=&audience=` | все | → `[ScenarioSummary]` (без ответов) |
| GET | `/scenarios/{id}` | все | → `ScenarioDetail` |
| POST | `/attempts` | вошедший | `{scenario_id, result, score, markers[], duration_ms?, phase?, form?, legit?, false_positive?}` → `201 AttemptOut` |
| GET | `/attempts?limit=&before=` | вошедший | → `[AttemptOut]` — только свои |
| GET | `/skills/me` | вошедший | → `{index, sd, skills: [{code, mean, sd, n, status}]}` — расчёт на сервере |
| POST | `/threat-checks` | все (лимит частоты) | `{kind, text?, url?, from?, subject?}` → схема детектива (правила); текст не сохраняется |
| GET | `/organizations/{id}/summary` | teacher, org_admin своей орг. | → агрегаты без PII |
| GET | `/health` | все | → `{ok, db}` |

Ошибки — единый формат: `{"error": {"code": "...", "message": "...", "fields": {...}}}`. OpenAPI — `/api/v1/openapi.json`, документация — `/api/v1/docs`.

## 8. План миграции

| Шаг | Что | Критерий готовности |
|---|---|---|
| 0 | Стабилизация прототипа (P0–P2) | Все тесты зелёные, отчёт `docs/STABILIZATION.md` |
| 1 | Backend foundation: модели, миграции, auth, сценарии (сид из прототипа), попытки, история, OpenAPI | pytest на PostgreSQL зелёный |
| 2 | Frontend foundation: layout, дизайн-система, 5 разделов, ошибки, загрузка, пустые состояния, уведомления | Vitest и Playwright зелёные, без фиктивных кнопок |
| 3 | Интеграция: регистрация, вход, профиль, сценарии, сохранение попыток, история | Данные в PostgreSQL, e2e-тест «регистрация → тренировка → история» |
| 4 | Перенос симулятора, детектива и индекса в новый фронтенд (логика индекса и правил — на сервере) | Паритет функций с прототипом по таблице раздела 1 |
| 5 | AI Gateway: серверный прокси, PII-фильтр, лимиты, журнал без текстов, согласие | Реальные ИИ-запросы включаются только здесь |
| 6 | Организации, роли учителя и админа, аудит, CI/CD, Docker в прод | — |

Прототип остаётся рабочим на всех шагах. Функции из раздела 1 не удаляются без согласования.
