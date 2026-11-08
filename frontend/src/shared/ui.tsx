// Дизайн-система: немного компонентов, все — на токенах прототипа (index.css).
import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ApiError } from './api/client';
import { useToasts } from './stores';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'plain' | 'ghost' | 'danger'; size?: 'sm' | 'md'; busy?: boolean };
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ tone = 'plain', size = 'md', busy, className, children, disabled, ...p }, ref) {
  return (
    <button ref={ref} {...p} disabled={disabled || busy} aria-busy={busy || undefined}
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4',
        tone === 'primary' && 'bg-accent text-accent-ink hover:bg-accent-hi',
        tone === 'plain' && 'border border-line-2 bg-surface text-ink hover:border-ink',
        tone === 'ghost' && 'text-accent hover:bg-accent-soft',
        tone === 'danger' && 'border border-bad text-bad hover:bg-bad-soft', className)}>
      {busy && <Spinner small />}{children}
    </button>
  );
});

export function Spinner({ small, label = 'Загрузка' }: { small?: boolean; label?: string }) {
  return <span role="status" aria-label={label} className={cx('inline-block animate-spin rounded-full border-2 border-current border-r-transparent', small ? 'size-4' : 'size-6')} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-md bg-sunk', className)} />;
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return <div className="grid gap-3" role="status" aria-label="Загрузка">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>;
}

type FieldBase = { label: string; hint?: ReactNode; error?: string };
export function Field({ label, hint, error, ...p }: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm font-medium">
      {label}
      <input id={id} {...p} aria-invalid={!!error || undefined} aria-describedby={error || hint ? id + '-d' : undefined}
        className={cx('h-11 rounded-lg border bg-surface px-3 text-base font-normal text-ink outline-none focus:border-accent', error ? 'border-bad' : 'border-line-2')} />
      {(error || hint) && <span id={id + '-d'} className={cx('text-sm font-normal', error ? 'text-bad' : 'text-muted')}>{error || hint}</span>}
    </label>
  );
}

export function TextArea({ label, hint, error, ...p }: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm font-medium">
      {label}
      <textarea id={id} {...p} aria-invalid={!!error || undefined} aria-describedby={id + '-d'}
        className={cx('min-h-36 rounded-lg border bg-surface p-3 text-base font-normal leading-relaxed text-ink outline-none focus:border-accent', error ? 'border-bad' : 'border-line-2')} />
      <span id={id + '-d'} className={cx('text-sm font-normal', error ? 'text-bad' : 'text-muted')}>{error || hint}</span>
    </label>
  );
}

export function Select({ label, hint, error, children, ...p }: FieldBase & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm font-medium">
      {label}
      <select id={id} {...p} className="h-11 rounded-lg border border-line-2 bg-surface px-3 text-base font-normal text-ink outline-none focus:border-accent">{children}</select>
      {(error || hint) && <span className={cx('text-sm font-normal', error ? 'text-bad' : 'text-muted')}>{error || hint}</span>}
    </label>
  );
}

export function Panel({ title, action, children, className, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx('min-w-0 rounded-xl border border-line bg-surface p-5 sm:p-6', className)}>
      {(title || action) && <div className="mb-4 flex flex-wrap items-center justify-between gap-3">{title && <h2 className="text-lg">{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'ok' | 'warn' | 'bad'; title?: ReactNode; children: ReactNode }) {
  return (
    <div role={tone === 'bad' ? 'alert' : 'note'} className={cx('grid gap-1 rounded-lg border-l-4 px-4 py-3 text-sm',
      tone === 'info' && 'border-line-2 bg-surface-2', tone === 'ok' && 'border-ok bg-ok-soft', tone === 'warn' && 'border-warn bg-warn-soft', tone === 'bad' && 'border-bad bg-bad-soft')}>
      {title && <b className="font-semibold">{title}</b>}<div className="text-ink">{children}</div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-2 rounded-xl border border-dashed border-line-2 px-5 py-6">
      <h3 className="text-base">{title}</h3>{children && <p className="max-w-prose text-sm text-muted">{children}</p>}{action}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const e = error instanceof ApiError ? error : null;
  return (
    <Notice tone="bad" title={e?.offline ? 'Нет связи с сервером' : 'Не удалось загрузить'}>
      <div className="grid justify-items-start gap-2">
        <span>{e?.message ?? 'Неожиданная ошибка. Обновите страницу.'}</span>
        {retry && <Button size="sm" onClick={retry}>Повторить</Button>}
      </div>
    </Notice>
  );
}

export function Tag({ tone = 'plain', children }: { tone?: 'plain' | 'ok' | 'warn' | 'bad' | 'accent'; children: ReactNode }) {
  return <span className={cx('inline-flex h-6 items-center rounded-md px-2 text-xs font-medium whitespace-nowrap',
    tone === 'plain' && 'bg-sunk text-muted', tone === 'ok' && 'bg-ok-soft text-ok', tone === 'warn' && 'bg-warn-soft text-warn',
    tone === 'bad' && 'bg-bad-soft text-bad', tone === 'accent' && 'bg-accent-soft text-accent')}>{children}</span>;
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 text-ink">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden className="shrink-0">
        <path d="M16 2.6 26.6 6.4V14.6C26.6 21.6 22.2 26.9 16 29.4 9.8 26.9 5.4 21.6 5.4 14.6V6.4Z" stroke="var(--accent)" strokeWidth="1.9" strokeLinejoin="round" fill="var(--accent-soft)" />
        <path d="M16 23.2V16.6M16 16.6 11.6 12.2M16 16.6 20.4 12.2M9.4 12.6 11.2 10.8M20.8 10.8 22.6 12.6" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="leading-tight">
        <span className="block text-[.95rem] font-bold tracking-[.2em]">ИММУНИТЕТ</span>
        {!compact && <span className="block text-xs text-muted">к мошенникам</span>}
      </span>
    </span>
  );
}

export function Toasts() {
  const { items, drop } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 grid justify-items-center gap-2 px-4 lg:bottom-6">
      {items.map((t) => (
        <button key={t.id} onClick={() => drop(t.id)} className={cx('pointer-events-auto max-w-md rounded-lg px-4 py-3 text-left text-sm shadow-card',
          t.tone === 'bad' ? 'bg-bad text-white' : t.tone === 'ok' ? 'bg-ink text-surface' : 'bg-ink text-surface')}>{t.text}</button>
      ))}
    </div>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return <header className="grid gap-2"><h1 className="text-[1.75rem] sm:text-[2rem]">{title}</h1>{lead && <p className="max-w-[62ch] text-muted">{lead}</p>}</header>;
}

/** Ошибки полей формы из ответа API. */
export const fieldErrors = (e: unknown): Record<string, string> => (e instanceof ApiError ? e.fields : {});
