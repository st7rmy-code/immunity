import { useState } from 'react';
import { Link } from 'react-router';
import { useAttempts, useMe, useOrgSummary, useSkillsMe } from '@/shared/api/hooks';
import { KIND, RESULT, STATUS, fmtDate, pct, plural } from '@/shared/labels';
import { Button, EmptyState, ErrorState, Loading, PageTitle, Panel, Tag, cx } from '@/shared/ui';

const PAGE = 20;
const FILTERS = [['', 'Все'], ['card', 'Верю — не верю'], ['call', 'Звонки'], ['chat', 'Переписки'], ['site', 'Сайты'], ['item', 'Вопросы']] as const;

export function Analytics() {
  const me = useMe().data;
  const skills = useSkillsMe();
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(0);
  const hist = useAttempts(PAGE, page * PAGE, kind || undefined);
  const canOrg = !!me?.organization_id && (me.role === 'teacher' || me.role === 'org_admin');
  const org = useOrgSummary(me?.organization_id, canOrg);
  const pages = hist.data ? Math.max(1, Math.ceil(hist.data.total / PAGE)) : 1;

  return (
    <div className="grid gap-8">
      <PageTitle title="Аналитика" lead="Ваши результаты по темам и вся история тренировок. Другие люди их не видят." />

      <Panel title="Навыки">
        {skills.isPending ? <Loading rows={6} /> : skills.isError ? <ErrorState error={skills.error} retry={() => skills.refetch()} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-muted"><tr><th className="py-2 pr-3 font-medium">Тема</th><th className="py-2 pr-3 font-medium">Оценка</th><th className="py-2 pr-3 font-medium">Попыток</th><th className="py-2 font-medium">Статус</th></tr></thead>
              <tbody className="divide-y divide-line">
                {skills.data.skills.map((s) => (
                  <tr key={s.skill}>
                    <td className="py-2.5 pr-3">{s.title}</td>
                    <td className="num py-2.5 pr-3">{s.status === 'little_data' ? '—' : `${pct(s.mean)} ± ${Math.max(1, pct(s.sd))}`}</td>
                    <td className="num py-2.5 pr-3">{s.attempts}</td>
                    <td className="py-2.5"><Tag tone={STATUS[s.status]?.tone}>{STATUS[s.status]?.t}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="История" action={hist.data && <span className="text-sm text-muted">{plural(hist.data.total, 'попытка', 'попытки', 'попыток')}</span>}>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Фильтр по типу">
          {FILTERS.map(([k, t]) => (
            <button key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setPage(0); }}
              className={cx('h-8 rounded-lg border px-3 text-sm', kind === k ? 'border-ink bg-ink text-surface' : 'border-line-2 bg-surface')}>{t}</button>
          ))}
        </div>
        {hist.isPending ? <Loading rows={5} /> : hist.isError ? <ErrorState error={hist.error} retry={() => hist.refetch()} />
          : hist.data.items.length === 0 ? <EmptyState title="Здесь пока пусто" action={<Link to="/learning">К тренировкам</Link>}>Пройдите тренировку — каждая попытка появится здесь.</EmptyState> : (
            <>
              <ul className="divide-y divide-line" aria-busy={hist.isFetching}>
                {hist.data.items.map((a) => (
                  <li key={a.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3">
                    <span className="min-w-0"><span className="block truncate">{a.title}</span>
                      <span className="text-xs text-muted">{KIND[a.kind]}, {fmtDate(a.created_at)}{a.source === 'import' ? ', перенесено из прототипа' : ''}{a.false_positive ? ', лишняя тревога' : ''}</span></span>
                    <Tag tone={RESULT[a.result]?.tone}>{RESULT[a.result]?.t}</Tag>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <div className="mt-4 flex items-center gap-3">
                  <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Назад</Button>
                  <span className="num text-sm text-muted">{page + 1} / {pages}</span>
                  <Button size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Дальше</Button>
                </div>
              )}
            </>
          )}
      </Panel>

      {canOrg && (
        <Panel title="Ваша организация">
          {org.isPending ? <Loading rows={3} /> : org.isError ? <ErrorState error={org.error} retry={() => org.refetch()} /> : (
            <div className="grid gap-3">
              <p className="text-sm text-muted">{org.data.organization.name}: участников {org.data.members_total}, дали согласие на сводку {org.data.members_sharing}.</p>
              {!org.data.enough_data ? <EmptyState title="Сводки пока нет">{org.data.note}</EmptyState> : (
                <>
                  <ul className="grid gap-2">{org.data.skills.map((s) => (
                    <li key={s.skill} className="flex justify-between gap-3 border-b border-line py-2"><span>{s.title}</span><span className="num text-sm">{pct(s.mean)} <span className="text-muted">· {s.learners} чел.</span></span></li>
                  ))}</ul>
                  <p className="text-sm text-muted">{org.data.note}</p>
                </>
              )}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
