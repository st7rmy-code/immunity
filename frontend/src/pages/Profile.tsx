import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAudiences, useChangePassword, useDeleteMe, useImportProgress, useLogout, useMe, usePatchMe } from '@/shared/api/hooks';
import { ROLE } from '@/shared/labels';
import { toast, usePrefs, type Theme } from '@/shared/stores';
import { Button, Field, Notice, PageTitle, Panel, Select, fieldErrors } from '@/shared/ui';

const MAX_FILE = 3_000_000;

export function Profile() {
  const me = useMe().data!;
  const nav = useNavigate();
  const aud = useAudiences();
  const patch = usePatchMe();
  const pw = useChangePassword();
  const imp = useImportProgress();
  const logout = useLogout();
  const del = useDeleteMe();
  const prefs = usePrefs();
  const [name, setName] = useState(me.display_name ?? ''), [audience, setAudience] = useState(me.audience ?? '');
  const [cur, setCur] = useState(''), [nw, setNw] = useState('');
  const [confirm, setConfirm] = useState('');
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { if (window.location.hash === '#import') document.getElementById('import')?.scrollIntoView(); }, []);

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    patch.mutate({ display_name: name.trim() || null, audience: audience || null }, { onSuccess: () => toast('Профиль сохранён', 'ok') });
  };
  const savePw = (e: FormEvent) => {
    e.preventDefault();
    pw.mutate({ current_password: cur, new_password: nw }, {
      onSuccess: () => { toast('Пароль изменён. Войдите с новым паролем.', 'ok'); setCur(''); setNw(''); logout.mutate({}, { onSettled: () => nav('/login') }); },
    });
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE) { toast('Файл больше 3 МБ — это не похоже на экспорт прогресса', 'bad'); return; }
    let data: unknown;
    try { data = JSON.parse(await f.text()); } catch { toast('Это не файл экспорта: внутри не JSON', 'bad'); return; }
    imp.mutate(data, {
      onSuccess: (r) => toast(`Перенесено попыток: ${r.imported}${r.skipped ? `, пропущено: ${r.skipped}` : ''}`, 'ok'),
      onError: (e) => toast(e.code === 'already_imported' ? e.message : e.code === 'validation_error' ? 'Файл не похож на экспорт прогресса «Иммунитета»' : e.message, 'bad'),
    });
    if (file.current) file.current.value = '';
  };

  const pf = fieldErrors(patch.error), wf = fieldErrors(pw.error);
  return (
    <div className="grid gap-8">
      <PageTitle title="Профиль" lead={<>{me.email}, роль: {ROLE[me.role] ?? me.role}</>} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="О вас">
          <form onSubmit={saveProfile} className="grid gap-4">
            <Field label="Как к вам обращаться" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} error={pf.display_name} />
            <Select label="Кто вы" value={audience} onChange={(e) => setAudience(e.target.value)} error={pf.audience}>
              <option value="">Не указывать</option>
              {(aud.data ?? []).map((a) => <option key={a.slug} value={a.slug}>{a.title}</option>)}
            </Select>
            {me.organization_id && (
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={me.share_with_org}
                  onChange={(e) => patch.mutate({ share_with_org: e.target.checked }, { onSuccess: (u) => toast(u.share_with_org ? 'Согласие дано' : 'Согласие отозвано', 'ok') })} />
                <span>Учитывать мои результаты в обезличенной сводке организации. Организация видит только средние по темам и только если согласились не меньше 5 человек.</span>
              </label>
            )}
            <Button tone="primary" type="submit" busy={patch.isPending} className="justify-self-start">Сохранить</Button>
          </form>
        </Panel>

        <Panel title="Отображение">
          <div className="grid gap-4">
            <Select label="Тема" value={prefs.theme} onChange={(e) => prefs.setTheme(e.target.value as Theme)} hint="Хранится только в этом браузере">
              <option value="system">Как в системе</option><option value="light">Светлая</option><option value="dark">Тёмная</option>
            </Select>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={prefs.large} onChange={(e) => prefs.setLarge(e.target.checked)} />Крупный текст</label>
          </div>
        </Panel>

        <Panel title="Перенести прогресс из прототипа" id="import">
          <div className="grid gap-3">
            <p className="text-sm text-muted">В прототипе: «Прогресс» → «Экспорт». Загрузите получившийся файл .json. Перенести можно один раз; неизвестные и повреждённые записи пропускаются.</p>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" id="importFile" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button onClick={() => file.current?.click()} busy={imp.isPending} className="justify-self-start">Выбрать файл</Button>
            {imp.data && <Notice tone="ok">Перенесено: {imp.data.imported}. Пропущено: {imp.data.skipped}.</Notice>}
          </div>
        </Panel>

        <Panel title="Пароль">
          <form onSubmit={savePw} className="grid gap-4">
            <Field label="Текущий пароль" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} error={wf.current_password} />
            <Field label="Новый пароль" type="password" autoComplete="new-password" value={nw} onChange={(e) => setNw(e.target.value)} error={wf.new_password} hint="После смены вы выйдете на всех устройствах" />
            {pw.isError && !Object.keys(wf).length && <Notice tone="bad">{pw.error.message}</Notice>}
            <Button type="submit" busy={pw.isPending} className="justify-self-start">Сменить пароль</Button>
          </form>
        </Panel>
      </div>

      <Panel title="Сеанс и данные">
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => logout.mutate({}, { onSettled: () => nav('/login') })} busy={logout.isPending}>Выйти</Button>
            <Button tone="ghost" onClick={() => logout.mutate({ everywhere: true }, { onSettled: () => nav('/login') })}>Выйти на всех устройствах</Button>
          </div>
          <div className="grid gap-3 border-t border-line pt-5">
            <h3>Удалить аккаунт</h3>
            <p className="text-sm text-muted">Удалятся профиль, все попытки и история проверок. Восстановить их будет нельзя. Для подтверждения введите свой email.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full max-w-xs"><Field label="Email" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></div>
              <Button tone="danger" disabled={confirm.trim().toLowerCase() !== me.email} busy={del.isPending}
                onClick={() => del.mutate(undefined, { onSuccess: () => { toast('Аккаунт удалён'); nav('/register'); } })}>Удалить навсегда</Button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
