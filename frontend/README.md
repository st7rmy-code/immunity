# Frontend — React + TypeScript

Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand. Визуальные токены — из прототипа (`src/index.css`).

```
src/app/        маршруты, макет (боковая панель на десктопе, нижняя навигация на телефоне), защита страниц
src/pages/      Главная, Обучение, «Верю — не верю», Защита, Аналитика, Профиль, Вход/Регистрация
src/features/   Карта навыков, Вердикт проверки
src/shared/     API-клиент и хуки, сгенерированные типы (schema.d.ts), компоненты, подписи, состояние интерфейса
e2e/            сквозные тесты против живого API и проверка CSP
```

## Запуск
```bash
npm ci
npm run dev        # http://localhost:5173, /api проксируется на 127.0.0.1:8000 (IMMUNITY_API — другой адрес)
npm test           # модульные тесты (vitest, jsdom)
npm run build      # проверка типов и сборка в dist/
npm run preview    # собранная версия на :4173
npm run e2e        # нужны backend и preview; PW_BROWSER=webkit|firefox — другой движок
npm run gen:api    # типы из ../docs/openapi.json
```

`/audio/` и `/prototype/` в разработке раздаются из `../prototype` (плагин в `vite.config.ts`), в продакшене — nginx (`nginx.conf`).

## Правила
- Бизнес-логики здесь нет: оценки, правила детектива и права считает сервер. Исключение — движок тренажёра карточек (решение «верно/неверно» по содержимому сценария).
- Данные — только через `src/shared/api`. Сессия — httpOnly-cookie, в JS токена нет. В `localStorage` — только тема и размер текста.
- Каждая страница обрабатывает загрузку, ошибку (с «Повторить») и пустое состояние.
