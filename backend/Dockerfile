FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv
# Сначала зависимости по lock-файлу — этот слой кэшируется и не пересобирается при правке кода
COPY requirements.lock ./
RUN pip install -r requirements.lock
COPY pyproject.toml alembic.ini ./
COPY app ./app
COPY alembic ./alembic
RUN pip install --no-deps . && useradd --system --uid 10001 app && chown -R app /srv
USER app
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD python -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health').status==200 else 1)"
# миграции и загрузка контента идемпотентны: безопасно выполнять при каждом старте
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed.load && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips='*'"]
