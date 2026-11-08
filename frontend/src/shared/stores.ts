// Состояние интерфейса. В localStorage — только безопасные настройки отображения (тема, крупный текст),
// никаких данных о прогрессе и сессии: они живут на сервере.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'system' | 'light' | 'dark';

type Prefs = { theme: Theme; large: boolean; setTheme: (t: Theme) => void; setLarge: (v: boolean) => void };

const safeStorage = createJSONStorage(() => {
  try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; } catch { return sessionStorageOrMemory(); }
});
function sessionStorageOrMemory(): Storage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage;
}

export const usePrefs = create<Prefs>()(persist((set) => ({
  theme: 'system', large: false,
  setTheme: (theme) => set({ theme }), setLarge: (large) => set({ large }),
}), { name: 'immunity.ui', storage: safeStorage, partialize: (s) => ({ theme: s.theme, large: s.large }) }));

export function applyPrefs(p: { theme: Theme; large: boolean }) {
  const r = document.documentElement;
  if (p.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', p.theme);
  r.classList.toggle('large', p.large);
}

export type Toast = { id: number; text: string; tone: 'ok' | 'bad' | 'info' };
type Toasts = { items: Toast[]; push: (text: string, tone?: Toast['tone']) => void; drop: (id: number) => void };
let seq = 0;
export const useToasts = create<Toasts>((set, get) => ({
  items: [],
  push: (text, tone = 'info') => {
    const id = ++seq;
    set({ items: [...get().items.slice(-2), { id, text, tone }] });
    setTimeout(() => get().drop(id), tone === 'bad' ? 7000 : 4500);
  },
  drop: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));
export const toast = (text: string, tone?: Toast['tone']) => useToasts.getState().push(text, tone);
