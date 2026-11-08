import type { SkillState } from '@/shared/api/client';
import { STATUS, pct } from '@/shared/labels';
import { Tag } from '@/shared/ui';

/** Карта навыков: оценка и коридор неопределённости (± стандартное отклонение). Коридор — честная часть оценки. */
export function SkillMap({ skills }: { skills: SkillState[] }) {
  return (
    <ul className="grid gap-4" aria-label="Оценка по темам">
      {skills.map((s) => {
        const m = pct(s.mean), lo = Math.max(0, pct(s.mean - s.sd)), hi = Math.min(100, pct(s.mean + s.sd));
        const st = STATUS[s.status] ?? STATUS.little_data!;
        const little = s.status === 'little_data';
        return (
          <li key={s.skill} className="grid gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-medium">{s.title}</span>
              <span className="flex items-center gap-2 text-sm text-muted">
                {!little && <span className="num text-ink">{m} ± {Math.max(1, pct(s.sd))}</span>}
                <Tag tone={st.tone}>{st.t}</Tag>
              </span>
            </div>
            <div className="skillbar" data-status={s.status} role="img"
              aria-label={little ? `${s.title}: мало данных` : `${s.title}: ${m} из 100, вероятно от ${lo} до ${hi}`}>
              {!little && <><span className="band" style={{ left: lo + '%', width: Math.max(1, hi - lo) + '%' }} /><span className="mean" style={{ left: `calc(${m}% - 1.5px)` }} /></>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
