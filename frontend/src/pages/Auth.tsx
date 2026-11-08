import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '@/shared/api/client';
import { useAudiences, useLogin, useMe, useRegister } from '@/shared/api/hooks';
import { toast } from '@/shared/stores';
import { Button, Field, Logo, Notice, Select, fieldErrors } from '@/shared/ui';

/** Только относительные пути внутри приложения: ?next=https://evil — не уводит со страницы. */
export function safeNext(v: string | null) {
  return v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/';
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-sm gap-6 py-6">
      <div className="lg:hidden"><Logo /></div>
      <h1 className="text-2xl">{title}</h1>
      {children}
    </div>
  );
}

export function Login() {
  const me = useMe();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const nav = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  if (me.data) return <Navigate to={next} replace />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email: email.trim(), password }, { onSuccess: () => nav(next, { replace: true }) });
  };
  const err = login.error, f = fieldErrors(err);
  return (
    <Shell title="Вход">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={f.email} />
        <Field label="Пароль" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={f.password} />
        {err && !Object.keys(f).length && <Notice tone="bad">{err.message}</Notice>}
        <Button tone="primary" type="submit" busy={login.isPending}>Войти</Button>
      </form>
      <p className="text-sm text-muted">Нет аккаунта? <Link to={'/register' + (next !== '/' ? '?next=' + encodeURIComponent(next) : '')}>Зарегистрироваться</Link></p>
      <p className="text-sm text-muted">Проверить сообщение или ссылку можно и без аккаунта — <Link to="/protection">в разделе «Защита»</Link>.</p>
    </Shell>
  );
}

export function Register() {
  const me = useMe();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const nav = useNavigate();
  const reg = useRegister(), login = useLogin();
  const aud = useAudiences();
  const [v, setV] = useState({ email: '', password: '', display_name: '', audience: '' });
  // после регистрации — сразу к тренировкам; тот же адрес и для <Navigate>, иначе два перехода спорят
  const after = next === '/' ? '/learning' : next;
  if (me.data) return <Navigate to={after} replace />;
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = { email: v.email.trim(), password: v.password, ...(v.display_name.trim() ? { display_name: v.display_name.trim() } : {}), ...(v.audience ? { audience: v.audience } : {}) };
    reg.mutate(body, {
      onSuccess: () => login.mutate({ email: body.email, password: body.password }, {
        onSuccess: () => { toast('Аккаунт создан', 'ok'); nav(after, { replace: true }); },
      }),
    });
  };
  const err = reg.error ?? login.error, f = fieldErrors(err);
  return (
    <Shell title="Регистрация">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" required value={v.email} onChange={set('email')} error={f.email} />
        <Field label="Пароль" type="password" autoComplete="new-password" required value={v.password} onChange={set('password')} error={f.password}
          hint="Не короче 10 символов. Удобно взять три слова: «ласточка-весна-2026»." />
        <Field label="Как к вам обращаться" autoComplete="nickname" value={v.display_name} onChange={set('display_name')} error={f.display_name} hint="Необязательно" />
        <Select label="Кто вы" value={v.audience} onChange={set('audience')} error={f.audience} hint="Подберём сценарии под вашу ситуацию. Можно изменить позже.">
          <option value="">Не указывать</option>
          {(aud.data ?? []).map((a) => <option key={a.slug} value={a.slug}>{a.title}</option>)}
        </Select>
        {err instanceof ApiError && !Object.keys(f).length && <Notice tone="bad">{err.message}</Notice>}
        <Button tone="primary" type="submit" busy={reg.isPending || login.isPending}>Создать аккаунт</Button>
      </form>
      <p className="text-sm text-muted">Ваши результаты хранятся на сервере тренажёра и видны только вам. Аккаунт можно удалить вместе со всеми данными в профиле.</p>
      <p className="text-sm text-muted">Уже есть аккаунт? <Link to={'/login' + (next !== '/' ? '?next=' + encodeURIComponent(next) : '')}>Войти</Link></p>
    </Shell>
  );
}
