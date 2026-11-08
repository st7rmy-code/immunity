import { Component, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider, useLocation, useRouteError } from 'react-router';
import { ApiError } from '@/shared/api/client';
import { useMe } from '@/shared/api/hooks';
import { applyPrefs, usePrefs } from '@/shared/stores';
import { Button, ErrorState, Loading, Logo } from '@/shared/ui';
import { Layout } from './Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Learning } from '@/pages/Learning';
import { CardsTrainer } from '@/pages/CardsTrainer';
import { Protection } from '@/pages/Protection';
import { Analytics } from '@/pages/Analytics';
import { Profile } from '@/pages/Profile';
import { Login, Register } from '@/pages/Auth';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2, refetchOnWindowFocus: false },
  },
});

/** Страницы с личными данными: без входа — на форму входа и обратно. */
function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const loc = useLocation();
  if (me.isPending) return <Loading rows={4} />;
  if (me.isError) return <ErrorState error={me.error} retry={() => me.refetch()} />;
  if (!me.data) return <Navigate to={'/login?next=' + encodeURIComponent(loc.pathname + loc.search)} replace />;
  return <>{children}</>;
}

function RouteError() {
  const e = useRouteError() as { status?: number } | undefined;
  return <Crash notFound={e?.status === 404} />;
}

/** Экран сбоя без хуков роутера: работает и внутри, и снаружи RouterProvider. */
function Crash({ notFound }: { notFound?: boolean }) {
  const e = { status: notFound ? 404 : 500 };
  return (
    <div className="mx-auto grid max-w-md gap-4 px-4 py-16">
      <Logo />
      <h1 className="text-2xl">{e?.status === 404 ? 'Такой страницы нет' : 'Страница сломалась'}</h1>
      <p className="text-muted">{e?.status === 404 ? 'Проверьте адрес или вернитесь на главную.' : 'Обновите страницу. Если ошибка повторится, вернитесь на главную.'}</p>
      <div><Button tone="primary" onClick={() => (window.location.href = '/')}>На главную</Button></div>
    </div>
  );
}

const auth = (el: ReactNode) => <RequireAuth>{el}</RequireAuth>;
export const routes = [{
  path: '/', element: <Layout />, errorElement: <RouteError />,
  children: [
    { index: true, element: auth(<Dashboard />) },
    { path: 'learning', element: auth(<Learning />) },
    { path: 'learning/cards', element: auth(<CardsTrainer />) },
    { path: 'protection', element: <Protection /> },
    { path: 'analytics', element: auth(<Analytics />) },
    { path: 'profile', element: auth(<Profile />) },
    { path: 'login', element: <Login /> },
    { path: 'register', element: <Register /> },
    { path: '*', element: <Crash notFound /> },
  ],
}];

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Crash /> : this.props.children; }
}

export function App() {
  const theme = usePrefs((s) => s.theme), large = usePrefs((s) => s.large);
  useEffect(() => applyPrefs({ theme, large }), [theme, large]);
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <Boundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Boundary>
  );
}
