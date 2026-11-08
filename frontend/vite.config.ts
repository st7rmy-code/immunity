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
  preview: { port: 4173, proxy: { '/api': { target: API, changeOrigin: false } } },
  build: { sourcemap: true, target: 'es2022' },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'], css: false, include: ['src/**/*.test.{ts,tsx}'] },
});
