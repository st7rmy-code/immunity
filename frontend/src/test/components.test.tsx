import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Verdict } from '@/features/Verdict';
import { SkillMap } from '@/features/SkillMap';
import { highlight } from '@/pages/CardsTrainer';
import type { ThreatCheckOut } from '@/shared/api/client';

const verdict: ThreatCheckOut = {
  risk_level: 'critical', confidence: null, strength: 'есть критические признаки', explanation: 'Есть критический признак.',
  detected_indicators: [{ id: 'codes', tier: 'critical', title: 'Просят код', quote: 'продиктуйте код', explanation: 'Код — подпись' }],
  limitations: ['Правила не понимают контекст.'], recommended_actions: ['Положите трубку'], avoid_actions: ['Не называйте код'], engine: 'rules-v2', stored: false,
};

describe('Verdict', () => {
  it('показывает уровень, признак с силой и ограничения, без процентов', () => {
    const { container } = render(<Verdict r={verdict} />);
    expect(screen.getByText('Критический риск')).toBeInTheDocument();
    expect(screen.getByText('критический')).toBeInTheDocument();
    expect(screen.getByText('Правила не понимают контекст.')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d\s?%/);
    expect(container.textContent).toMatch(/нигде не сохраняется/);
  });
  it('неизвестный уровень не превращается в «низкий риск»', () => {
    render(<Verdict r={{ ...verdict, risk_level: 'unknown', detected_indicators: [] }} />);
    expect(screen.getByText('Недостаточно данных')).toBeInTheDocument();
    expect(screen.queryByText('Низкий риск')).toBeNull();
  });
});

describe('SkillMap', () => {
  it('при малом числе данных не показывает число', () => {
    render(<SkillMap skills={[{ skill: 'codes', title: 'Коды', mean: 0.5, sd: 0.2, evidence: 0.2, attempts: 1, status: 'little_data' }]} />);
    expect(screen.getByText('мало данных')).toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/мало данных/);
  });
  it('показывает оценку и коридор погрешности', () => {
    render(<SkillMap skills={[{ skill: 'codes', title: 'Коды', mean: 0.8, sd: 0.1, evidence: 3, attempts: 5, status: 'strong' }]} />);
    expect(screen.getByText('80 ± 10')).toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/от 70 до 90/);
  });
});

describe('highlight', () => {
  it('подсвечивает фразы без учёта регистра и не теряет текст', () => {
    const { container } = render(<p>{highlight('Срочно переведите, СРОЧНО!', ['срочно'])}</p>);
    expect(container.querySelectorAll('mark')).toHaveLength(2);
    expect(container.textContent).toBe('Срочно переведите, СРОЧНО!');
  });
});
