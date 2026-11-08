import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardsTrainer } from '@/pages/CardsTrainer';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
const CARDS: Record<string, unknown> = {
  c02: { id: 'c02', f: 'Ваш банк', k: 'Уведомление', x: 'Покупка 1 290 ₽. Доступно 23 410 ₽', s: 0, w: 'Обычное уведомление о вашей покупке.' },
  c01: { id: 'c01', f: '+7 965 000-81-12', k: 'Сообщение', x: 'Мам, это мой новый номер. Срочно скинь 6 000', s: 1, m: ['новый номер', 'Срочно'], w: 'Классика.', mk: ['kin'] },
};

function setup(slugs: string[], saveStatus = 201) {
  const posted: unknown[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith('/api/v1/scenarios?')) return json(slugs.map((slug) => ({ kind: 'card', slug, title: slug, skill: 'social', level: 1, audiences: [], has_audio: false })));
    const m = url.match(/\/scenarios\/card\/(\w+)$/);
    if (m) return json({ kind: 'card', slug: m[1], title: '', skill: 'social', level: 1, audiences: [], has_audio: false, markers: [], content: CARDS[m[1]!], lines: [] });
    if (url === '/api/v1/attempts' && init?.method === 'POST') { posted.push(JSON.parse(String(init.body))); return saveStatus === 201 ? json({ id: 1 }, 201) : json({ error: { code: 'x', message: 'Сбой' } }, saveStatus); }
    return json({}, 404);
  }));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><MemoryRouter><CardsTrainer /></MemoryRouter></QueryClientProvider>);
  return posted;
}
afterEach(() => vi.unstubAllGlobals());

describe('Верю — не верю', () => {
  it('лишняя тревога на честном сообщении сохраняется как ошибка с false_positive', async () => {
    const posted = setup(['c02']);
    await userEvent.click(await screen.findByRole('button', { name: /Не верю/ }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ kind: 'card', scenario: 'c02', result: 'bad', score: 0, false_positive: true, markers: [] });
    expect(screen.getByText('Это честное сообщение')).toBeInTheDocument();
  });
  it('пропущенный обман сохраняет приёмы и подсвечивает фразы', async () => {
    const posted = setup(['c01']);
    await userEvent.click(await screen.findByRole('button', { name: /Верю — всё в порядке/ }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ scenario: 'c01', result: 'bad', score: 0, false_positive: false, markers: ['kin'] });
    expect(document.querySelectorAll('mark.flag').length).toBe(2);
  });
  it('клавиша ← — «не верю», верный ответ сохраняется как ok', async () => {
    const posted = setup(['c01']);
    await screen.findByRole('button', { name: /Не верю/ });
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ result: 'ok', score: 1, markers: [] });
  });
  it('ошибка сохранения показывается и её можно повторить', async () => {
    const posted = setup(['c02'], 500);
    await userEvent.click(await screen.findByRole('button', { name: /Верю — всё в порядке/ }));
    expect(await screen.findByText(/Результат не сохранился/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить ещё раз' }));
    await waitFor(() => expect(posted).toHaveLength(2));
  });
});
