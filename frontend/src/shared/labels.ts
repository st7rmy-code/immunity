// Подписи и форматирование. Логики оценки здесь нет: её считает сервер.
export const KIND: Record<string, string> = { call: 'Звонок', chat: 'Переписка', site: 'Сайт', card: 'Верю — не верю', item: 'Проверочный вопрос' };
export const RESULT: Record<string, { t: string; tone: 'ok' | 'warn' | 'bad' }> = {
  ok: { t: 'без потерь', tone: 'ok' }, warn: { t: 'с ошибками', tone: 'warn' }, bad: { t: 'попались', tone: 'bad' },
};
export const STATUS: Record<string, { t: string; tone: 'plain' | 'ok' | 'warn' | 'bad' }> = {
  little_data: { t: 'мало данных', tone: 'plain' }, weak: { t: 'слабая зона', tone: 'bad' }, medium: { t: 'средне', tone: 'warn' }, strong: { t: 'уверенно', tone: 'ok' },
};
export const RISK: Record<string, { t: string; tone: 'plain' | 'ok' | 'warn' | 'bad'; n: number }> = {
  unknown: { t: 'Недостаточно данных', tone: 'plain', n: 0 }, low: { t: 'Низкий риск', tone: 'ok', n: 1 }, medium: { t: 'Средний риск', tone: 'warn', n: 2 },
  high: { t: 'Высокий риск', tone: 'bad', n: 3 }, critical: { t: 'Критический риск', tone: 'bad', n: 4 },
};
export const TIER: Record<string, { t: string; tone: 'plain' | 'warn' | 'bad' }> = {
  critical: { t: 'критический', tone: 'bad' }, strong: { t: 'сильный', tone: 'bad' }, medium: { t: 'средний', tone: 'warn' }, weak: { t: 'слабый', tone: 'plain' },
};
export const ROLE: Record<string, string> = { learner: 'ученик', teacher: 'преподаватель', org_admin: 'администратор организации', admin: 'администратор платформы' };

const dtf = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (iso: string) => dtf.format(new Date(iso));
export const pct = (v: number) => Math.round(v * 100);
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  return n + ' ' + (m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many);
}
