# Иммунитет к мошенникам

[![CI](https://github.com/st7rmy-code/immunity/actions/workflows/ci.yml/badge.svg)](https://github.com/st7rmy-code/immunity/actions/workflows/ci.yml)

Тренажёр финансовой безопасности: учит узнавать приёмы мошенников на безопасных тренировках — звонках, переписках, поддельных сайтах и карточках «Верю — не верю». Показывает честную оценку навыков с погрешностью, проверяет подозрительные сообщения, ссылки и письма, подсказывает, что делать, если деньги уже ушли.

> Учебный проект. Не является официальным ресурсом госорганов. Все организации, номера и сайты в сценариях вымышлены.

**Демо-сайт:** https://st7rmy-code.github.io/immunity/ — прототип тренажёра, работает в браузере без сервера (без ИИ; прогресс хранится у посетителя). Публикуется автоматически при изменении `prototype/` (`.github/workflows/pages.yml`).

## Что в репозитории

| Часть | Состояние |
|---|---|
| `backend/` — FastAPI, PostgreSQL, Alembic | Работает: регистрация и вход, профиль, сценарии, сохранение тренировок, история, оценка навыков, проверка угроз правилами, организации с обезличенной сводкой, перенос прогресса из прототипа |
| `frontend/` — React, TypeScript, Vite, Tailwind | Работает: главная, обучение, «Верю — не верю» с сохранением в API, защита, аналитика, профиль. Симуляторы звонков, переписок и сайтов пока открываются в прототипе |
| `prototype/` — HTML-прототип | Работает полностью, включая ИИ в артефакте claude.ai. Прогресс хранится в браузере |
| `infrastructure/` — Docker Compose | Полный стек: PostgreSQL + API + nginx. Сборка и запуск проверяются в CI (задача «Docker Compose») |

## Быстрый старт на Mac

```bash
git clone https://github.com/st7rmy-code/immunity.git && cd immunity
```

**Проще всего:** в Finder дважды щёлкните `Запустить-бэкенд.command` (первый раз — правой кнопкой → «Открыть»). Файл сам поставит Homebrew, Python и PostgreSQL, создаст базу и запустит API на http://127.0.0.1:8000/api/v1/docs.

**Вручную** (нужны Python 3.12+, Node.js 22, PostgreSQL 16):

```bash
createdb immunity
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.lock -r requirements-dev.lock && pip install --no-deps -e .
cp .env.example .env    # впишите IMMUNITY_JWT_SECRET и адрес базы
alembic upgrade head && python -m app.seed.load
uvicorn app.main:app --reload            # http://127.0.0.1:8000/api/v1/docs
```

Интерфейс — во втором окне Терминала:

```bash
cd prototype && node build.mjs           # чтобы /prototype/ открывался из нового интерфейса
cd ../frontend && npm ci && npm run dev  # http://localhost:5173
```

## Через Docker

```bash
cp infrastructure/.env.example infrastructure/.env   # задайте пароль БД и секрет
docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env up --build
# http://localhost:8080
```

## Тесты

| Где | Команда | Что проверяет |
|---|---|---|
| backend | `pytest` | 88 тестов на настоящей PostgreSQL: авторизация, права, данные, ошибки, кэширование, паритет правил с прототипом |
| frontend | `npm test` | 16 модульных тестов: API-клиент, вердикт, карта навыков, тренажёр карточек |
| frontend | `npm run e2e` | 17 сквозных сценариев против живого API + проверка CSP |
| prototype | `npm test` | 127 модульных проверок 12 модулей и 5 браузерных наборов |

## Документы
- `docs/ARCHITECTURE.md` — функции, зависимости, схема БД, API, план миграции и отклонения от плана.
- `docs/MVP_REPORT.md` — отчёт по этапам ТЗ «MVP Architecture & Foundation».
- `docs/STABILIZATION.md` — отчёт по ТЗ «Техническая стабилизация».
- `docs/THIRD_PARTY.md` — лицензии (голоса Silero — CC BY-NC-SA 4.0, только некоммерческое использование).
- `docs/LEGAL_CHECK.md` — проверка правовых утверждений с источниками и датой.
- `docs/openapi.json` — контракт API, из него генерируются типы фронтенда.
- `CLAUDE.md`, `ROADMAP.md` — правила и план для работы в Claude Code.
- `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` — как вносить изменения, как сообщать об уязвимостях, права на код.
