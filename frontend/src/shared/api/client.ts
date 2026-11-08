// Единственная точка обращения к API. Сессия — httpOnly-cookie (токен JavaScript не видит),
// изменяющие запросы несут заголовок X-Immunity-CSRF. Ответы об ошибках — в формате {"error": {...}}.
import type { components } from './schema';

export type Schemas = components['schemas'];
export type User = Schemas['UserOut'];
export type SkillsOut = Schemas['SkillsOut'];
export type SkillState = Schemas['SkillState'];
export type ScenarioBrief = Schemas['ScenarioBrief'];
export type ScenarioDetail = Schemas['ScenarioDetail'];
export type AttemptIn = Schemas['AttemptIn'];
export type AttemptOut = Schemas['AttemptOut'];
export type AttemptPage = Schemas['Page_AttemptOut_'];
export type ThreatCheckIn = Schemas['ThreatCheckIn'];
export type ThreatCheckOut = Schemas['ThreatCheckOut'];
export type Indicator = Schemas['Indicator'];
export type ImportOut = Schemas['ImportOut'];
export type OrgSummary = Schemas['OrgSummary'];
export type SkillRef = Schemas['SkillRef'];

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get offline() { return this.status === 0; }
}

const BASE = '/api/v1';
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function request<T>(method: Method, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-Immunity-CSRF'] = '1';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin', signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'offline', 'Сервер недоступен. Проверьте интернет и попробуйте ещё раз.');
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try { data = await res.json(); } catch { /* не JSON */ }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'http_' + res.status, err?.message ?? 'Ошибка сервера (' + res.status + ')', err?.fields ?? {});
  }
  return data as T;
}

export const api = {
  get: <T>(p: string, signal?: AbortSignal) => request<T>('GET', p, undefined, signal),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

export function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const q = s.toString();
  return q ? '?' + q : '';
}
