/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));

const API = process.env.IMMUNITY_API ?? 'http://127.0.0.1:8000';
const PROTO = resolve(HERE, '../prototype');

// В разработке: /audio/* — озвучка из prototype/public/v, /prototype/ — собранный прототип (симуляторы звонков,
// переписок и сайтов, которые ещё не перенесены). В продакшене то же раздаёт nginx (frontend/nginx.conf).
function staticFrom(prefix: string, dir: string, index?: string): Plugin {
  const serve: Plugin['configureServer'] = (server) => {
    server.middlewares.use(prefix, (req, res, next) => {
      const rel = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
      let file = normalize(join(dir, rel));
      if (!file.startsWith(dir)) return next();
      if (index && (rel === '/' || rel === '')) file = join(dir, index);
      if (!existsSync(file) || !statSync(file).isFile()) return next();
      res.setHeader('Content-Type', file.endsWith('.mp3') ? 'audio/mpeg' : file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream');
      createReadStream(file).pipe(res);
    });
  };
  return { name: 'static-' + prefix, configureServer: serve, configurePreviewServer: serve as never };
}

export default defineConfig({
  plugins: [react(), tailwind(), staticFrom('/audio', join(PROTO, 'public', 'v')), staticFrom('/prototype', join(PROTO, 'dist'), 'index.html')],
  resolve: { alias: { '@': resolve(HERE, 'src') } },
  server: { port: 5173, proxy: { '/api': { target: API, changeOrigin: false } } },
  // 127.0.0.1, а не localhost: на Linux и macOS localhost может слушать только IPv6, а e2e ходят по IPv4
  preview: { host: '127.0.0.1', port: 4173, proxy: { '/api': { target: API, changeOrigin: false } } },
  build: {
    sourcemap: 'hidden', target: 'es2022', // карты кода для отладки, но браузер их не запрашивает
    // Библиотеки — отдельными файлами: они меняются редко и остаются в кэше браузера между выпусками.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (id.includes('node_modules/react-router')) return 'router';
          if (/node_modules\/(@tanstack|zustand)\//.test(id)) return 'query';
        },
      },
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'], css: false, include: ['src/**/*.test.{ts,tsx}'] },
});
