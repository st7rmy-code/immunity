import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, qs } from '@/shared/api/client';
import { safeNext } from '@/pages/Auth';

const reply = (status: number, body?: unknown) => vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
afterEach(() => vi.unstubAllGlobals());

describe('API-клиент', () => {
  it('разбирает единый формат ошибок с полями', async () => {
    vi.stubGlobal('fetch', reply(422, { error: { code: 'validation_error', message: 'Проверьте поля', fields: { password: 'Короткий' } } }));
    const e = (await api.post('/auth/register', {}).catch((x) => x)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 422, code: 'validation_error', fields: { password: 'Короткий' } });
  });
  it('нет сети → понятная ошибка offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const e = (await api.get('/skills').catch((x) => x)) as ApiError;
    expect(e.offline).toBe(true);
    expect(e.message).toMatch(/Сервер недоступен/);
  });
  it('ответ не JSON → ошибка со статусом, без падения', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })));
    const e = (await api.get('/skills').catch((x) => x)) as ApiError;
    expect(e).toMatchObject({ status: 502, code: 'http_502' });
  });
  it('изменяющие запросы несут CSRF-заголовок и cookie того же сайта', async () => {
    const f = reply(204);
    vi.stubGlobal('fetch', f);
    await api.del('/auth/session');
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe('/api/v1/auth/session');
    expect(init.headers['X-Immunity-CSRF']).toBe('1');
    expect(init.credentials).toBe('same-origin');
  });
  it('GET без CSRF-заголовка', async () => {
    const f = reply(200, []);
    vi.stubGlobal('fetch', f);
    await api.get('/skills');
    expect(f.mock.calls[0]![1].headers['X-Immunity-CSRF']).toBeUndefined();
  });
  it('qs пропускает пустые значения', () => {
    expect(qs({ kind: undefined, limit: 20, offset: 0, q: '' })).toBe('?limit=20&offset=0');
  });
});

describe('переход после входа', () => {
  it('только внутренние пути', () => {
    expect(safeNext('/analytics')).toBe('/analytics');
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', null, '', 'javascript:alert(1)']) expect(safeNext(bad)).toBe('/');
  });
});
