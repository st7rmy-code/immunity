import { Link } from 'react-router';
import { useAttempts, useMe, useSkillsMe } from '@/shared/api/hooks';
import { KIND, RESULT, fmtDate } from '@/shared/labels';
import { EmptyState, ErrorState, Loading, Panel, Tag } from '@/shared/ui';
import { SkillMap } from '@/features/SkillMap';

export function Dashboard() {
  const me = useMe().data;
  const skills = useSkillsMe();
  const recent = useAttempts(5, 0);
  const idx = skills.data?.index;
  const weakest = skills.data?.skills.filter((s) => s.status !== 'little_data').sort((a, b) => a.mean - b.mean)[0];
  const untested = skills.data?.skills.filter((s) => s.status === 'little_data') ?? [];

  return (
    <div className="grid gap-8">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-2">
          <h1 className="text-[1.75rem] sm:text-[2rem]">{me?.display_name ? `${me.display_name}, ваш иммунный профиль` : 'Ваш иммунный профиль'}</h1>
          <p className="max-w-[60ch] text-muted">Оценка того, как вы распознаёте приёмы мошенников по шести темам. Чем больше тренировок, тем уже коридор погрешности.</p>
        </div>
        {skills.isSuccess && (
          <div className="flex items-baseline gap-3" aria-label="Индекс защищённости">
            {idx ? <>
              <span className="num text-5xl font-medium leading-none">{idx.value}</span>
              <span className="text-sm text-muted">из 100, погрешность ± {idx.pm}<br />данные по {idx.coverage} из 6 тем</span>
            </> : <span className="text-muted">Индекса пока нет</span>}
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="По темам">
          {skills.isPending ? <Loading rows={6} /> : skills.isError ? <ErrorState error={skills.error} retry={() => skills.refetch()} /> : (
            <div className="grid gap-5">
              <SkillMap skills={skills.data.skills} />
              <p className="text-sm text-muted">{skills.data.note}</p>
            </div>
          )}
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title="Что потренировать">
            {skills.isSuccess && (
              <div className="grid gap-3">
                {!idx ? <p>Начните с карточек «Верю — не верю»: 10 коротких ситуаций, около пяти минут. После них появится индекс.</p>
                  : weakest && weakest.mean < 0.75 ? <p>Слабее всего тема <b>«{weakest.title}»</b>. Потренируйте её — это быстрее всего поднимет защищённость.</p>
                  : untested.length ? <p>Пока мало данных по темам: {untested.map((s) => s.title).join('; ')}.</p>
                  : <p>Все темы на хорошем уровне. Повторяйте раз в пару недель: мошенники меняют сценарии.</p>}
                <Link to="/learning/cards" className="inline-flex h-11 w-fit items-center rounded-lg bg-accent px-4 font-medium text-accent-ink no-underline hover:bg-accent-hi">Тренироваться</Link>
              </div>
            )}
          </Panel>

          <Panel title="Последние тренировки" action={<Link to="/analytics" className="text-sm">Вся история</Link>}>
            {recent.isPending ? <Loading rows={3} /> : recent.isError ? <ErrorState error={recent.error} retry={() => recent.refetch()} />
              : recent.data.items.length === 0 ? <EmptyState title="Тренировок пока нет">Пройдите первую — результат сохранится в вашем аккаунте.</EmptyState> : (
                <ul className="divide-y divide-line">
                  {recent.data.items.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0"><span className="block truncate">{a.title}</span><span className="text-xs text-muted">{KIND[a.kind]}, {fmtDate(a.created_at)}</span></span>
                      <Tag tone={RESULT[a.result]?.tone}>{RESULT[a.result]?.t}</Tag>
                    </li>
                  ))}
                </ul>
              )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
