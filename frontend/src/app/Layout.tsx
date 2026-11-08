import { NavLink, Outlet, useLocation } from 'react-router';
import { useMe } from '@/shared/api/hooks';
import { Logo, Toasts, cx } from '@/shared/ui';

const ICON: Record<string, string> = {
  home: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z',
  learn: 'M4 6.5 12 3l8 3.5-8 3.5zM7 9v5c0 1.7 2.2 3 5 3s5-1.3 5-3V9M20 6.5V12',
  shield: 'M12 3 19 5.6V11c0 4.6-2.9 8.1-7 9.8C7.9 19.1 5 15.6 5 11V5.6Z M9 11.5l2.2 2.2L15.5 9.5',
  chart: 'M5 19V10M10 19V5M15 19v-7M20 19v-4M3 19.5h18',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20c.8-3.6 3.9-6 7.5-6s6.7 2.4 7.5 6',
};
const NAV = [
  { to: '/', label: 'Главная', icon: 'home', end: true },
  { to: '/learning', label: 'Обучение', icon: 'learn' },
  { to: '/protection', label: 'Защита', icon: 'shield' },
  { to: '/analytics', label: 'Аналитика', icon: 'chart' },
  { to: '/profile', label: 'Профиль', icon: 'user' },
];

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

export function Layout() {
  const me = useMe();
  const loc = useLocation();
  const user = me.data;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">К содержанию</a>
      {/* Десктоп: боковая панель */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-surface px-5 py-6 lg:flex">
        <NavLink to="/" aria-label="Иммунитет — на главную"><Logo /></NavLink>
        <nav aria-label="Разделы" className="grid gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cx('flex h-11 items-center gap-3 rounded-lg px-3 font-medium', isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
              <Icon d={ICON[n.icon]!} />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-3 text-sm">
          <NavLink to="/protection#emergency" className="rounded-lg border border-bad px-3 py-2.5 font-medium text-bad hover:bg-bad-soft">Уже перевели деньги?</NavLink>
          {user ? <span className="truncate text-muted" title={user.email}>{user.display_name || user.email}</span>
            : <NavLink to={'/login?next=' + encodeURIComponent(loc.pathname)} className="font-medium">Войти</NavLink>}
        </div>
      </aside>
      {/* Мобильный: верхняя строка */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <NavLink to="/" aria-label="Иммунитет — на главную"><Logo compact /></NavLink>
        <NavLink to="/protection#emergency" className="rounded-lg border border-bad px-3 py-1.5 text-sm font-medium text-bad">Уже перевели?</NavLink>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1080px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
        <Outlet />
      </main>
      {/* Мобильный: нижняя навигация */}
      <nav aria-label="Разделы" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cx('flex h-16 flex-col items-center justify-center gap-0.5 text-[.72rem] font-medium', isActive ? 'text-accent' : 'text-muted')}>
            <Icon d={ICON[n.icon]!} />{n.label}
          </NavLink>
        ))}
      </nav>
      <Toasts />
    </div>
  );
}
