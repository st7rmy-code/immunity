# Backend — FastAPI + PostgreSQL

Модульный монолит: `app/api/v1` (HTTP), `app/domain` (логика без HTTP и БД: оценка навыков, правила детектива, импорт прогресса), `app/models` (SQLAlchemy), `app/schemas` (Pydantic), `alembic` (миграции), `app/seed` (контент из прототипа).

## Запуск локально

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env            # задайте IMMUNITY_JWT_SECRET и адрес PostgreSQL
alembic upgrade head            # схема БД
python -m app.seed.load         # сценарии, навыки, маркеры (идемпотентно)
uvicorn app.main:app --reload   # http://127.0.0.1:8000/api/v1/docs
```

Администратор: `python -m app.cli create-admin you@example.org` (пароль спрашивается в терминале).

## Тесты

Нужна PostgreSQL. Тесты **полностью очищают** базу из `IMMUNITY_TEST_DATABASE_URL` (по умолчанию `immunity_test` на 127.0.0.1:55432).

```bash
IMMUNITY_TEST_DATABASE_URL=postgresql+psycopg://immunity:pass@localhost:5432/immunity_test pytest
```

## Контент

`app/seed/content.json` и `app/seed/rules.json` не редактируются руками: их выгружает `node prototype/tools/export-content.cjs` из исходников прототипа. Тот же скрипт обновляет `tests/fixtures/rules_parity.json` — эталон, с которым тест сверяет правила детектива на Python.

## Доступ к данным

| Роль | Что видит |
|---|---|
| learner | только свои попытки, проверки, профиль |
| teacher, org_admin | свои данные + обезличенную сводку своей организации (только по согласившимся, не меньше 5 человек) |
| admin | создаёт организации, назначает org_admin; сводки — на тех же условиях обезличивания |

Индивидуальные результаты других людей API не отдаёт никому. Роль нельзя задать при регистрации.

## Аутентификация

- Браузер: `POST /api/v1/auth/session` → httpOnly-cookie (`SameSite=Strict`, `Path=/api`). Изменяющие запросы требуют заголовок `X-Immunity-CSRF: 1`.
- API-клиенты: `POST /api/v1/auth/login` → `Authorization: Bearer …`.
- 5 неудачных входов подряд → блокировка на 15 минут. Смена пароля и «выйти везде» отзывают все токены.

## Что не сделано

- ИИ на сервере не подключён: нет AI Gateway (маскирование, лимиты, журнал, провайдер по требованиям заказчика). `/health` честно отвечает `"ai": false`.
- Нет восстановления пароля по почте (нужен почтовый сервис) и подтверждения email.
- Ограничение частоты запросов — только блокировка входа; общий rate limit появится вместе с Redis, когда он понадобится.
