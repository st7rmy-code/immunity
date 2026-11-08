import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api, qs, type AttemptIn, type AttemptOut, type AttemptPage, type ImportOut, type OrgSummary, type ScenarioBrief, type ScenarioDetail, type SkillRef, type SkillsOut, type ThreatCheckIn, type ThreatCheckOut, type User } from './client';

export type Guides = {
  emergency: { title: string; text: string }[];
  laws: { title: string; text: string; sources: string[] }[];
  protection: { id: string; title: string; time: string; where: string; text: string; how: string[]; source?: string }[];
  sources: Record<string, { name: string; date: string; url: string; checked: string | null }>;
};
export type Audience = { slug: string; title: string; hint: string };

export const keys = {
  me: ['me'] as const,
  skills: ['skills', 'me'] as const,
  attempts: (limit: number, offset: number, kind?: string) => ['attempts', limit, offset, kind ?? ''] as const,
  scenarios: (kind?: string) => ['scenarios', kind ?? ''] as const,
};

/** Текущий пользователь: null — не вошёл (401), ошибка — сервер недоступен. */
export function useMe() {
  return useQuery<User | null, ApiError>({
    queryKey: keys.me,
    queryFn: async ({ signal }) => (await api.get<{ user: User | null }>('/auth/session', signal)).user,
    staleTime: 60_000,
  });
}

export const useSkillsMe = () => useQuery<SkillsOut, ApiError>({ queryKey: keys.skills, queryFn: ({ signal }) => api.get('/skills/me', signal) });
export const useSkillRefs = () => useQuery<SkillRef[], ApiError>({ queryKey: ['skills'], queryFn: ({ signal }) => api.get('/skills', signal), staleTime: Infinity });
export const useAudiences = () => useQuery<Audience[], ApiError>({ queryKey: ['audiences'], queryFn: ({ signal }) => api.get('/audiences', signal), staleTime: Infinity });
export const useGuides = () => useQuery<Guides, ApiError>({ queryKey: ['guides'], queryFn: ({ signal }) => api.get('/guides', signal), staleTime: Infinity });
export const useScenarios = (kind?: string) =>
  useQuery<ScenarioBrief[], ApiError>({ queryKey: keys.scenarios(kind), queryFn: ({ signal }) => api.get('/scenarios' + qs({ kind }), signal), staleTime: 300_000 });
export const fetchScenario = (kind: string, slug: string) => api.get<ScenarioDetail>(`/scenarios/${kind}/${encodeURIComponent(slug)}`);
export const useAttempts = (limit: number, offset: number, kind?: string) =>
  useQuery<AttemptPage, ApiError>({ queryKey: keys.attempts(limit, offset, kind), queryFn: ({ signal }) => api.get('/attempts' + qs({ limit, offset, kind }), signal), placeholderData: (p) => p });
export const useOrgSummary = (orgId: number | null | undefined, enabled: boolean) =>
  useQuery<OrgSummary, ApiError>({ queryKey: ['org', orgId], queryFn: ({ signal }) => api.get(`/organizations/${orgId}/summary`, signal), enabled: enabled && !!orgId });

export function useSaveAttempt() {
  const qc = useQueryClient();
  return useMutation<AttemptOut, ApiError, AttemptIn>({
    mutationFn: (b) => api.post('/attempts', b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attempts'] }); qc.invalidateQueries({ queryKey: keys.skills }); },
  });
}

export const useThreatCheck = () => useMutation<ThreatCheckOut, ApiError, ThreatCheckIn>({ mutationFn: (b) => api.post('/threat-checks', b) });

export function useLogin() {
  const qc = useQueryClient();
  return useMutation<User, ApiError, { email: string; password: string }>({
    mutationFn: (b) => api.post('/auth/session', b),
    onSuccess: (u) => { qc.clear(); qc.setQueryData(keys.me, u); },
  });
}

export function useRegister() {
  return useMutation<User, ApiError, { email: string; password: string; display_name?: string; audience?: string }>({ mutationFn: (b) => api.post('/auth/register', b) });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, { everywhere?: boolean }>({
    mutationFn: async ({ everywhere }) => { if (everywhere) await api.post('/auth/logout-all'); await api.del('/auth/session'); },
    onSettled: () => { qc.clear(); qc.setQueryData(keys.me, null); },
  });
}

export function usePatchMe() {
  const qc = useQueryClient();
  return useMutation<User, ApiError, Partial<Pick<User, 'display_name' | 'audience' | 'share_with_org'>>>({
    mutationFn: (b) => api.patch('/users/me', b),
    onSuccess: (u) => qc.setQueryData(keys.me, u),
  });
}

export const useChangePassword = () => useMutation<void, ApiError, { current_password: string; new_password: string }>({ mutationFn: (b) => api.post('/auth/password', b) });

export function useImportProgress() {
  const qc = useQueryClient();
  return useMutation<ImportOut, ApiError, unknown>({
    mutationFn: (b) => api.post('/users/me/import', b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attempts'] }); qc.invalidateQueries({ queryKey: keys.skills }); },
  });
}

export function useDeleteMe() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({ mutationFn: () => api.del('/users/me'), onSuccess: () => { qc.clear(); qc.setQueryData(keys.me, null); } });
}
