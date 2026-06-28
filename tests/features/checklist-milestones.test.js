import { describe, it, expect } from 'vitest';
import { addMilestone, removeMilestone, removeAllMilestones } from '@features/checklist/milestones.js';

describe('addMilestone (pure)', () => {
  it('не мутирует входной state', () => {
    const state = { milestones: [] };
    const before = JSON.stringify(state);
    addMilestone(state, 'minsk', 'silver');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('возвращает новый state с milestone', () => {
    const state = { milestones: [] };
    const next = addMilestone(state, 'minsk', 'silver');
    expect(next.milestones).toHaveLength(1);
    expect(next.milestones[0]).toMatchObject({ cityId: 'minsk', tier: 'silver' });
  });

  it('dedup: повторный add с тем же cityId+tier не добавляет', () => {
    const state = { milestones: [{ cityId: 'minsk', tier: 'silver', date: '2025-01-01' }] };
    const next = addMilestone(state, 'minsk', 'silver');
    expect(next.milestones).toHaveLength(1);
  });

  it('dedup: возвращает ТУ ЖЕ ссылку (state as-is) — no-op', () => {
    const state = { milestones: [{ cityId: 'minsk', tier: 'silver', date: '2025-01-01' }] };
    const next = addMilestone(state, 'minsk', 'silver');
    expect(next).toBe(state);
  });

  it('невалидный tier (не silver/gold) → return state as-is', () => {
    const state = { milestones: [] };
    const next = addMilestone(state, 'minsk', 'bronze');
    expect(next).toBe(state);
  });
});

describe('removeMilestone (pure, no-op-оптимизация)', () => {
  it('удаляет существующий milestone', () => {
    const state = { milestones: [{ cityId: 'minsk', tier: 'silver', date: '2025-01-01' }] };
    const next = removeMilestone(state, 'minsk', 'silver');
    expect(next.milestones).toHaveLength(0);
    expect(next).not.toBe(state);
    expect(state.milestones).toHaveLength(1); // вход не мутируется
  });

  it('no-op: несуществующий milestone → return state as-is', () => {
    const state = { milestones: [{ cityId: 'minsk', tier: 'silver', date: '2025-01-01' }] };
    const next = removeMilestone(state, 'minsk', 'gold');
    expect(next).toBe(state);
    expect(next.milestones).toHaveLength(1);
  });
});

describe('removeAllMilestones (pure, no-op-оптимизация)', () => {
  it('удаляет все milestone города', () => {
    const state = {
      milestones: [
        { cityId: 'minsk', tier: 'silver', date: '2025-01-01' },
        { cityId: 'minsk', tier: 'gold', date: '2025-01-02' },
        { cityId: 'nesvizh', tier: 'silver', date: '2025-01-03' },
      ]
    };
    const next = removeAllMilestones(state, 'minsk');
    expect(next.milestones).toHaveLength(1);
    expect(next.milestones[0].cityId).toBe('nesvizh');
    expect(next).not.toBe(state);
  });

  it('no-op: milestone города нет → return state as-is', () => {
    const state = { milestones: [{ cityId: 'minsk', tier: 'silver', date: '2025-01-01' }] };
    const next = removeAllMilestones(state, 'nesvizh');
    expect(next).toBe(state);
  });
});
