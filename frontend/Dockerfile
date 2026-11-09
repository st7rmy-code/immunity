# Контекст сборки — корень репозитория (нужны prototype/ и озвучка).
FROM node:26-alpine AS prototype
WORKDIR /p
COPY prototype/build.mjs ./
COPY prototype/src ./src
COPY prototype/public ./public
RUN node build.mjs

FROM node:26-alpine AS web
WORKDIR /f
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web /f/dist /usr/share/nginx/html
COPY --from=prototype /p/dist /usr/share/nginx/prototype
COPY prototype/public/v /usr/share/nginx/audio
EXPOSE 80
