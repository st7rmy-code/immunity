import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useScenarios, useSkillRefs } from '@/shared/api/hooks';
import { KIND, plural } from '@/shared/labels';
import { ErrorState, Loading, Notice, PageTitle, Panel, Tag, cx } from '@/shared/ui';

const LEVEL = ['', 'базовый', 'средний', 'сложный'];
const SIM_KINDS = ['call', 'chat', 'site'] as const;

export function Learning() {
  const all = useScenarios();
  const refs = useSkillRefs();
  const [kind, setKind] = useState<(typeof SIM_KINDS)[number]>('call');
  const skillTitle = useMemo(() => Object.fromEntries((refs.data ?? []).map((s) => [s.slug, s.title])), [refs.data]);
  const count = (k: string) => all.data?.filter((s) => s.kind === k).length ?? 0;
  const list = all.data?.filter((s) => s.kind === kind) ?? [];

  return (
    <div className="grid gap-8">
      <PageTitle title="Обучение" lead="Тренировки на ситуациях, которые мошенники используют в 2026 году. Все банки, номера и сайты в сценариях вымышлены." />

      <Panel>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="grid gap-1.5">
            <h2 className="text-lg">Верю — не верю</h2>
            <p className="max-w-[60ch] text-muted">Сообщения, уведомления и звонки в пересказе. Решите, мошенники это или нет, и сразу посмотрите разбор. {all.isSuccess && plural(count('card'), 'ситуация', 'ситуации', 'ситуаций')} в наборе, за раз — 10.</p>
            <p className="text-sm text-muted">Результаты сохраняются в аккаунте и обновляют оценку навыков.</p>
          </div>
          <Link to="/learning/cards" className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-5 font-medium text-accent-ink no-underline hover:bg-accent-hi">Начать</Link>
        </div>
      </Panel>

      <section className="grid gap-4" aria-labelledby="sims">
        <h2 id="sims" className="text-lg">Симуляторы звонков, переписок и сайтов</h2>
        <Notice tone="warn" title="Эти тренажёры пока работают в прототипе">
          Движок симуляторов переносится в новую версию. Сейчас они открываются в прототипе: там прогресс хранится только в этом браузере.
          Чтобы перенести его в аккаунт, в прототипе нажмите «Прогресс → Экспорт», затем загрузите файл в <Link to="/profile#import">профиле</Link>.
        </Notice>
        <div role="tablist" aria-label="Тип тренажёра" className="flex flex-wrap gap-2">
          {SIM_KINDS.map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
              className={cx('h-9 rounded-lg border px-3 text-sm font-medium', kind === k ? 'border-ink bg-ink text-surface' : 'border-line-2 bg-surface text-ink')}>
              {KIND[k]}{all.isSuccess && <span className="num ml-1.5 opacity-70">{count(k)}</span>}
            </button>
          ))}
        </div>
        {all.isPending ? <Loading rows={4} /> : all.isError ? <ErrorState error={all.error} retry={() => all.refetch()} /> : (
          <ul className="grid gap-x-6 sm:grid-cols-2" role="tabpanel">
            {list.map((s) => (
              <li key={s.slug} className="flex items-start justify-between gap-3 border-b border-line py-3">
                <span className="min-w-0">
                  <span className="block">{s.title}</span>
                  <span className="text-sm text-muted">{skillTitle[s.skill] ?? s.skill}</span>
                </span>
                <span className="flex shrink-0 gap-1.5">{s.has_audio && <Tag tone="accent">озвучен</Tag>}<Tag>{LEVEL[s.level]}</Tag></span>
              </li>
            ))}
          </ul>
        )}
        <a href="/prototype/" className="w-fit font-medium">Открыть тренажёры в прототипе</a>
      </section>
    </div>
  );
}
