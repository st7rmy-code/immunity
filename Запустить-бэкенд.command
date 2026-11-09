#!/bin/bash
# Двойной щелчок по этому файлу ставит всё нужное и запускает бэкенд «Иммунитета».
# Первый запуск — несколько минут и один раз попросит пароль Mac (для установки). Дальше — быстро.
cd "$(dirname "$0")" || exit 1
set -e

echo "=============================================="
echo "  Иммунитет — запуск серверной части"
echo "=============================================="
echo ""

# 1. Homebrew (менеджер программ для Mac)
if ! command -v brew >/dev/null 2>&1; then
  echo "[1/5] Ставлю Homebrew — попросит пароль Mac..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
[ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
[ -x /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)"

# 2. Python, PostgreSQL
echo "[2/5] Проверяю Python и базу данных..."
brew list python@3.13 >/dev/null 2>&1 || brew install python@3.13
brew list postgresql@16 >/dev/null 2>&1 || brew install postgresql@16
brew services start postgresql@16 >/dev/null 2>&1 || true
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
for i in $(seq 1 30); do pg_isready -q >/dev/null 2>&1 && break; sleep 1; done

# 3. База данных
echo "[3/5] Готовлю базу данных..."
createdb immunity 2>/dev/null || true

# 4. Зависимости бэкенда
echo "[4/5] Ставлю зависимости (может занять пару минут)..."
cd backend
PY="$(brew --prefix python@3.13)/bin/python3.13"; [ -x "$PY" ] || PY=python3
[ -d .venv ] || "$PY" -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -e ".[dev]"
if [ ! -f .env ]; then
  cat > .env <<EOF
IMMUNITY_DATABASE_URL=postgresql+psycopg://$USER@localhost:5432/immunity
IMMUNITY_JWT_SECRET=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
IMMUNITY_COOKIE_SECURE=false
EOF
fi

# 5. Схема и контент
echo "[5/5] Создаю таблицы и загружаю сценарии..."
alembic upgrade head
python -m app.seed.load

echo ""
echo "=============================================="
echo "  Готово! Сервер запускается."
echo ""
echo "  Открой в браузере страницу, где можно"
echo "  нажимать и проверять регистрацию:"
echo ""
echo "      http://127.0.0.1:8000/api/v1/docs"
echo ""
echo "  Чтобы остановить — закрой это окно."
echo "=============================================="
echo ""
exec uvicorn app.main:app --port 8000
