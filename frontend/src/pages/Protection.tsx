import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { useGuides, useThreatCheck, type Guides } from '@/shared/api/hooks';
import { Button, ErrorState, Field, Loading, Notice, PageTitle, Panel, TextArea, cx, fieldErrors } from '@/shared/ui';
import { Verdict } from '@/features/Verdict';

const MAX = 10_000;
type Kind = 'msg' | 'url' | 'mail';
const KINDS: { k: Kind; t: string }[] = [{ k: 'msg', t: 'Сообщение или звонок' }, { k: 'url', t: 'Ссылка' }, { k: 'mail', t: 'Письмо' }];

function Source({ g, keys }: { g: Guides; keys: (string | undefined)[] }) {
  const list = keys.filter((k): k is string => !!k && !!g.sources[k]);
  if (!list.length) return null;
  return (
    <span className="grid gap-0.5 text-xs text-muted">
      {list.map((k) => { const s = g.sources[k]!; return <span key={k}>Источник: <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>, {s.date}{s.checked ? `, проверено ${s.checked}` : ''}</span>; })}
    </span>
  );
}

export function Protection() {
  const loc = useLocation();
  const [kind, setKind] = useState<Kind>('msg');
  const [text, setText] = useState(''), [url, setUrl] = useState(''), [sender, setSender] = useState(''), [subject, setSubject] = useState('');
  const check = useThreatCheck();
  const guides = useGuides();
  const f = fieldErrors(check.error);

  useEffect(() => { if (loc.hash === '#emergency') document.getElementById('emergency')?.scrollIntoView({ block: 'start' }); }, [loc.hash, guides.isSuccess]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    check.mutate(kind === 'url' ? { kind, url: url.trim(), text } : kind === 'mail' ? { kind, sender: sender.trim(), subject: subject.trim(), text } : { kind, text });
  };

  return (
    <div className="grid gap-8">
      <PageTitle title="Защита" lead="Проверьте подозрительное сообщение, ссылку или письмо. Если деньги уже ушли — ниже порядок действий." />

      <Panel title="Проверить">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div role="radiogroup" aria-label="Что проверяем" className="flex flex-wrap gap-2">
            {KINDS.map((x) => (
              <button type="button" role="radio" aria-checked={kind === x.k} key={x.k} onClick={() => { setKind(x.k); check.reset(); }}
                className={cx('h-9 rounded-lg border px-3 text-sm font-medium', kind === x.k ? 'border-ink bg-ink text-surface' : 'border-line-2 bg-surface')}>{x.t}</button>
            ))}
          </div>
          {kind === 'url' && <Field label="Адрес ссылки" inputMode="url" autoComplete="off" spellCheck={false} value={url} onChange={(e) => setUrl(e.target.value)} error={f.url}
            hint="Ссылку не открываем: проверяем только сам адрес." />}
          {kind === 'mail' && <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Отправитель" autoComplete="off" value={sender} onChange={(e) => setSender(e.target.value)} error={f.sender} hint="Полный адрес, а не только имя" />
            <Field label="Тема" autoComplete="off" value={subject} onChange={(e) => setSubject(e.target.value)} error={f.subject} />
          </div>}
          <TextArea label={kind === 'msg' ? 'Текст сообщения или пересказ звонка' : kind === 'url' ? 'Текст рядом со ссылкой (необязательно)' : 'Текст письма'}
            value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} error={f.text}
            hint={<>Номера карт и паспортные данные лучше заменить звёздочками. <span className="num">{text.length.toLocaleString('ru-RU')} / {MAX.toLocaleString('ru-RU')}</span></>} />
          <div className="flex flex-wrap items-center gap-3">
            <Button tone="primary" type="submit" busy={check.isPending}>Проверить</Button>
            <span className="text-sm text-muted">Разбор с ИИ появится после подключения защищённого ИИ-шлюза.</span>
          </div>
        </form>
        {check.isError && !Object.keys(f).length && <div className="mt-4"><ErrorState error={check.error} /></div>}
        {check.data && <div className="mt-6 border-t border-line pt-6"><Verdict r={check.data} /></div>}
      </Panel>

      <section id="emergency" className="grid scroll-mt-20 gap-4" aria-labelledby="em-h">
        <h2 id="em-h" className="text-xl">Если деньги уже перевели или назвали код</h2>
        {guides.isPending ? <Loading rows={4} /> : guides.isError ? <ErrorState error={guides.error} retry={() => guides.refetch()} /> : (
          <>
            <ol className="grid gap-3">
              {guides.data.emergency.map((s, k) => (
                <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="num grid size-8 place-items-center rounded-full bg-bad-soft font-medium text-bad">{k + 1}</span>
                  <span className="grid gap-0.5"><b className="font-medium">{s.title}</b><span className="text-muted">{s.text}</span></span>
                </li>
              ))}
            </ol>
            <Notice>Это памятка, а не юридическая консультация: правила меняются, уточняйте в банке и на сайте Банка России. <Source g={guides.data} keys={['refund30', 'bankiros']} /></Notice>
          </>
        )}
      </section>

      {guides.isSuccess && <>
        <section className="grid gap-4" aria-labelledby="laws-h">
          <h2 id="laws-h" className="text-xl">Что изменилось в законах</h2>
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {guides.data.laws.map((l) => (
              <article key={l.title} className="grid content-start gap-1.5 border-t-2 border-accent pt-3">
                <h3>{l.title}</h3><p className="text-sm">{l.text}</p><Source g={guides.data} keys={l.sources} />
              </article>
            ))}
          </div>
        </section>
        <section className="grid gap-4" aria-labelledby="prot-h">
          <h2 id="prot-h" className="text-xl">Настройте защиту заранее</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {guides.data.protection.map((p) => (
              <li key={p.id} className="grid content-start gap-1.5 rounded-xl border border-line bg-surface p-4">
                <b className="font-medium">{p.title}</b>
                <span className="text-sm text-muted">{p.where}, {p.time}</span>
                <p className="text-sm">{p.text}</p>
                <details className="text-sm"><summary className="cursor-pointer font-medium text-accent">Как сделать</summary>
                  <ol className="mt-2 grid list-decimal gap-1 pl-5">{p.how.map((h) => <li key={h}>{h}</li>)}</ol></details>
                <Source g={guides.data} keys={[p.source]} />
              </li>
            ))}
          </ul>
        </section>
      </>}
    </div>
  );
}
