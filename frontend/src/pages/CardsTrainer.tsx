// «Верю — не верю»: первый тренажёр, перенесённый из прототипа. Каждая карточка сохраняется на сервере
// (POST /attempts), навык и сложность сервер берёт из сценария.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttemptIn } from '@/shared/api/client';
import { fetchScenario, useSaveAttempt, useScenarios } from '@/shared/api/hooks';
import { Button, ErrorState, Loading, Notice, PageTitle, Panel, Tag } from '@/shared/ui';

export const DECK_SIZE = 10;
type Card = { id: string; f: string; k: string; ctx?: string; x: string; s: 0 | 1; m?: string[]; w: string; mk?: string[] };
type Answer = { slug: string; scam: boolean; said: boolean; ok: boolean; saved: 'pending' | 'ok' | 'error'; body: AttemptIn };

function shuffle<T>(a: T[]): T[] { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j]!, b[i]!]; } return b; }

/** Подсветка фраз-приёмов из разбора — показывается только после ответа. */
export function highlight(text: string, marks: string[] = []): ReactNode[] {
  const ms = marks.filter(Boolean).map((m) => m.toLowerCase());
  if (!ms.length) return [text];
  const out: ReactNode[] = [];
  let i = 0;
  const low = text.toLowerCase();
  while (i < text.length) {
    let best = -1, len = 0;
    for (const m of ms) { const j = low.indexOf(m, i); if (j >= 0 && (best < 0 || j < best)) { best = j; len = m.length; } }
    if (best < 0) { out.push(text.slice(i)); break; }
    if (best > i) out.push(text.slice(i, best));
    out.push(<mark key={best} className="flag">{text.slice(best, best + len)}</mark>);
    i = best + len;
  }
  return out;
}

export function CardsTrainer() {
  const list = useScenarios('card');
  const qc = useQueryClient();
  const save = useSaveAttempt();
  const [round, setRound] = useState(0);
  // round: новый набор при «Ещё 10 карточек»
  const deck = useMemo(() => (list.data ? shuffle(list.data.map((c) => c.slug)).slice(0, DECK_SIZE) : []), [list.data, round]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const shownAt = useRef(performance.now());
  const slug = deck[i];
  const card = useQuery({ queryKey: ['scenario', 'card', slug], queryFn: () => fetchScenario('card', slug!), enabled: !!slug, staleTime: Infinity });
  const content = card.data?.content as Card | undefined;
  const answer = answers[i];

  useEffect(() => { // заранее загружаем следующую карточку
    const n = deck[i + 1];
    if (n) qc.prefetchQuery({ queryKey: ['scenario', 'card', n], queryFn: () => fetchScenario('card', n), staleTime: Infinity });
    shownAt.current = performance.now();
  }, [deck, i, qc]);

  const persist = useCallback((idx: number, body: AttemptIn) => {
    setAnswers((a) => a.map((x, j) => (j === idx ? { ...x, saved: 'pending' } : x)));
    save.mutate(body, {
      onSuccess: () => setAnswers((a) => a.map((x, j) => (j === idx ? { ...x, saved: 'ok' } : x))),
      onError: () => setAnswers((a) => a.map((x, j) => (j === idx ? { ...x, saved: 'error' } : x))),
    });
  }, [save]);

  const decide = useCallback((saidScam: boolean) => {
    if (!content || answer || !slug) return;
    const scam = content.s === 1, ok = saidScam === scam;
    const ms = Math.round(performance.now() - shownAt.current);
    const body: AttemptIn = { kind: 'card', scenario: slug, result: ok ? 'ok' : 'bad', score: ok ? 1 : 0,
      markers: !ok && scam ? (content.mk ?? []).slice(0, 6) : [], false_positive: !scam && saidScam, ...(ms > 0 && ms < 3_600_000 ? { duration_ms: ms } : {}) };
    const idx = i;
    setAnswers((a) => { const b = a.slice(); b[idx] = { slug, scam, said: saidScam, ok, saved: 'pending', body }; return b; });
    persist(idx, body);
  }, [content, answer, slug, i, persist]);

  const next = useCallback(() => setI((x) => x + 1), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select')) return;
      if (!answer && e.key === 'ArrowLeft') { e.preventDefault(); decide(true); }
      else if (!answer && e.key === 'ArrowRight') { e.preventDefault(); decide(false); }
      else if (answer && (e.key === 'Enter' || e.key === 'ArrowRight') && !(e.target as HTMLElement)?.closest('button,a')) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, decide, next]);

  const restart = () => { setRound((r) => r + 1); setI(0); setAnswers([]); };

  if (list.isPending) return <Loading rows={3} />;
  if (list.isError) return <ErrorState error={list.error} retry={() => list.refetch()} />;

  if (i >= deck.length && deck.length) {
    const right = answers.filter((a) => a.ok).length;
    const failed = answers.filter((a) => a.saved === 'error');
    return (
      <div className="grid gap-6">
        <PageTitle title="Итог набора" />
        <Panel>
          <div className="grid gap-4">
            <p className="text-lg"><span className="num text-4xl font-medium">{right}</span> <span className="text-muted">из {deck.length} верно</span></p>
            <p className="text-muted">{right === deck.length ? 'Без ошибок. Попробуйте ещё набор — карточки перемешиваются.' : 'Ошибки — это тоже данные: оценка навыков уже учла их, а темы со слабым результатом появятся в рекомендациях.'}</p>
            {failed.length > 0 && (
              <Notice tone="bad" title={`Не сохранились результаты: ${failed.length}`}>
                <Button size="sm" onClick={() => answers.forEach((a, j) => a.saved === 'error' && persist(j, a.body))}>Сохранить ещё раз</Button>
              </Notice>
            )}
            <div className="flex flex-wrap gap-3"><Button tone="primary" onClick={restart}>Ещё 10 карточек</Button><Link to="/" className="inline-flex h-11 items-center px-2 font-medium">Мой профиль</Link></div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title="Верю — не верю" />
        <span className="num text-sm text-muted" aria-live="polite">{Math.min(i + 1, deck.length)} / {deck.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sunk" aria-hidden><div className="h-full bg-accent transition-[width]" style={{ width: (i / Math.max(1, deck.length)) * 100 + '%' }} /></div>

      {card.isPending ? <Loading rows={2} /> : card.isError ? <ErrorState error={card.error} retry={() => card.refetch()} /> : content && (
        <article className="mx-auto grid w-full max-w-xl gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7" aria-label="Ситуация">
          <header className="flex items-center justify-between gap-3">
            <b className="truncate">{content.f}</b><Tag>{content.k}</Tag>
          </header>
          {content.ctx && <p className="text-sm text-muted">{content.ctx}</p>}
          <p className="text-[1.08rem] leading-relaxed">{answer ? highlight(content.x, answer.scam ? content.m : []) : content.x}</p>

          {!answer ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button tone="danger" onClick={() => decide(true)} aria-keyshortcuts="ArrowLeft">Не верю — мошенники</Button>
              <Button tone="primary" onClick={() => decide(false)} aria-keyshortcuts="ArrowRight">Верю — всё в порядке</Button>
            </div>
          ) : (
            <div className="grid gap-3 border-t border-line pt-4" aria-live="polite">
              <p className={answer.ok ? 'font-semibold text-ok' : 'font-semibold text-bad'}>
                {answer.ok ? 'Верно' : answer.scam ? 'Это мошенники' : 'Это честное сообщение'}
                <span className="font-normal text-muted"> — {answer.scam ? 'схема обмана' : 'ничего опасного'}</span>
              </p>
              <p>{content.w}</p>
              {answer.saved === 'error' && <Notice tone="bad">Результат не сохранился. <Button size="sm" tone="ghost" onClick={() => persist(i, answer.body)}>Сохранить ещё раз</Button></Notice>}
              <Button tone="primary" autoFocus onClick={next} className="justify-self-start">{i + 1 < deck.length ? 'Следующая' : 'Итог'}</Button>
            </div>
          )}
        </article>
      )}
      <p className="text-center text-sm text-muted">Клавиши: ← не верю, → верю, Enter — дальше.</p>
    </div>
  );
}
