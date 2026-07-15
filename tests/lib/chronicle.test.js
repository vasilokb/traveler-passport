import { describe, it, expect } from 'vitest';
import { generateChronicle } from '@widgets/profile/chronicle.js';

function st(over) {
  return Object.assign({ visitedCities: {}, milestones: [] }, over);
}

describe('generateChronicle', () => {
  it('пустое состояние → []', () => {
    expect(generateChronicle(st({}))).toEqual([]);
  });

  it('один визит → одна запись type=visit, priority=0', () => {
    const r = generateChronicle(st({ visitedCities: { minsk: { date: '2025-03-01' } } }));
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('visit');
    expect(r[0].priority).toBe(0);
    expect(r[0].label).toContain('Минск');
  });

  it('несколько визитов → сортировка DESC по дате', () => {
    const r = generateChronicle(st({
      visitedCities: {
        minsk: { date: '2025-01-10' },
        brest: { date: '2025-05-02' },
      },
    }));
    expect(r).toHaveLength(2);
    expect(r[0].date).toBe('2025-05-02');
    expect(r[1].date).toBe('2025-01-10');
  });

  it('визит + milestone в один день → визит (priority 0) раньше milestone (priority 1)', () => {
    const r = generateChronicle(st({
      visitedCities: { minsk: { date: '2025-06-01' } },
      milestones: [{ cityId: 'minsk', date: '2025-06-01', tier: 'silver' }],
    }));
    expect(r).toHaveLength(2);
    expect(r[0].type).toBe('visit');
    expect(r[1].type).toBe('milestone');
  });

  it('gold и silver milestone одного города в один день → оба priority=1, порядок вставки сохранён', () => {
    const r = generateChronicle(st({
      visitedCities: { minsk: { date: '2025-06-01' } },
      milestones: [
        { cityId: 'minsk', date: '2025-06-01', tier: 'gold' },
        { cityId: 'minsk', date: '2025-06-01', tier: 'silver' },
      ],
    }));
    expect(r).toHaveLength(3);
    expect(r[0].type).toBe('visit');
    expect(r[1].type).toBe('milestone');
    expect(r[2].type).toBe('milestone');
    expect(r[1].priority).toBe(1);
    expect(r[2].priority).toBe(1);
    // Стабильная сортировка: одинаковые дата/имя/priority → сохранён порядок вставки (gold, затем silver)
    expect(r[1].label).toContain('Золотого');
    expect(r[2].label).toContain('Серебряного');
  });
});
