# Иммунитет к мошенникам

Тренажёр финансовой безопасности: учит узнавать приёмы мошенников на безопасных тренировках — звонках, переписках, поддельных сайтах и карточках «Верю — не верю». Показывает честную оценку навыков с погрешностью, проверяет подозрительные сообщения, ссылки и письма, подсказывает, что делать, если деньги уже ушли.

> Учебный проект. Не является официальным ресурсом госорганов. Все организации, номера и сайты в сценариях вымышлены.

## Что в репозитории

| Часть | Состояние |
|---|---|
| `backend/` — FastAPI, PostgreSQL, Alembic | Работает: регистрация и вход, профиль, сценарии, сохранение тренировок, история, оценка навыков, проверка угроз правилами, организации с обезличенной сводкой, перенос прогресса из прототипа |
| `frontend/` — React, TypeScript, Vite, Tailwind | Работает: главная, обучение, «Верю — не верю» с сохранением в API, защита, аналитика, профиль. Симуляторы звонков, переписок и сайтов пока открываются в прототипе |
| `prototype/` — HTML-прототип | Работает полностью, включая ИИ в артефакте claude.ai. Прогресс хранится в браузере |
| `infrastructure/` — Docker Compose | Описан. В среде, где писался код, Docker не запущен — сборка контейнеров не проверена |

## Быстрый старт на Mac (без Docker)

Нужны Python 3.12+, Node.js 22, PostgreSQL 16 (`brew install postgresql@16 && brew services start postgresql@16`).

```bash
createuser -s immunity; createdb -O immunity immunity; createdb -O immunity immunity_test

# API
cd backend
python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
cp .env.example .env    # впишите IMMUNITY_JWT_SECRET и адрес базы
alembic upgrade head && python -m app.seed.load
uvicorn app.main:app --reload            # http://127.0.0.1:8000/api/v1/docs

# Интерфейс (во втором окне)
cd frontend && npm ci && npm run dev     # http://localhost:5173
cd prototype && node build.mjs           # чтобы /prototype/ открывался из нового интерфейса
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
| backend | `pytest` | 86 тестов на настоящей PostgreSQL: авторизация, права, данные, ошибки, паритет правил с прототипом |
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
