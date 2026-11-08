import type { ThreatCheckOut } from '@/shared/api/client';
import { RISK, TIER } from '@/shared/labels';
import { Tag, cx } from '@/shared/ui';

/** Результат проверки правилами. Процент уверенности не показывается: эвристика не откалибрована. */
export function Verdict({ r }: { r: ThreatCheckOut }) {
  const lv = RISK[r.risk_level] ?? RISK.unknown!;
  return (
    <div className="grid gap-5" aria-live="polite">
      <div className={cx('grid gap-2 rounded-xl border-l-4 px-5 py-4',
        lv.tone === 'bad' && 'border-bad bg-bad-soft', lv.tone === 'warn' && 'border-warn bg-warn-soft', lv.tone === 'ok' && 'border-ok bg-ok-soft', lv.tone === 'plain' && 'border-line-2 bg-surface-2')}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <b className="text-xl">{lv.t}</b>
          <span className="flex gap-1" aria-hidden>{[1, 2, 3, 4].map((n) => <i key={n} className={cx('block h-2 w-6 rounded-full', n <= lv.n ? (lv.tone === 'ok' ? 'bg-ok' : lv.tone === 'warn' ? 'bg-warn' : 'bg-bad') : 'bg-line-2')} />)}</span>
        </div>
        <p className="text-sm text-muted">Сила признаков: {r.strength}. Проверка правилами на сервере тренажёра, без ИИ.</p>
        <p>{r.explanation}</p>
      </div>

      {r.detected_indicators.length > 0 && (
        <section className="grid gap-2">
          <h3>Что насторожило</h3>
          <ul className="grid gap-2">
            {r.detected_indicators.map((h, k) => (
              <li key={h.id + k} className="grid gap-1 rounded-lg border border-line px-4 py-3">
                <span className="flex flex-wrap items-center gap-2"><b className="font-medium">{h.title}</b><Tag tone={TIER[h.tier]?.tone}>{TIER[h.tier]?.t}</Tag></span>
                {h.quote && <q className="text-sm text-muted">{h.quote}</q>}
                <span className="text-sm">{h.explanation}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="grid content-start gap-2"><h3>Что сделать</h3><ul className="grid list-disc gap-1 pl-5">{r.recommended_actions.map((a) => <li key={a}>{a}</li>)}</ul></section>
        <section className="grid content-start gap-2"><h3>Чего не делать</h3><ul className="grid list-disc gap-1 pl-5">{r.avoid_actions.map((a) => <li key={a}>{a}</li>)}</ul></section>
      </div>

      <section className="grid gap-1.5 text-sm text-muted">
        <h3 className="text-sm text-ink">Ограничения проверки</h3>
        <ul className="grid list-disc gap-1 pl-5">{r.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        <p>{r.stored ? 'В вашу историю записаны только уровень риска и коды признаков. Сам текст не сохраняется.' : 'Без входа результат нигде не сохраняется.'}</p>
      </section>
    </div>
  );
}
