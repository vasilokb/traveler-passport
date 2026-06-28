import { describe, it, expect } from 'vitest';
import { applyInvariants, omitKey } from '@app/store.js';
import { addMilestone, removeAllMilestones } from '@features/checklist/milestones.js';
import { CITIES } from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';

// НЕ использует store-синглтон (избегаем singleton-isolation проблем).
// Работает напрямую с applyInvariants — pure на свежем state.
const minsk = CITIES.find(c => SIGHTS[c.id] && SIGHTS[c.id].length === 4).id; // 'minsk'
const allSights = SIGHTS[minsk].map(s => s.id);

function ephemeralBase(over) {
  return Object.assign({
    currentTab: 'passport',
    travelerName: 'Test',
    onboardingComplete: true,
    visitedCities: {},
    plannedCities: {},
    cityNotes: {},
    checkedSights: {},
    milestones: [],
  }, over);
}

describe('confirmVisit flow (на уровне applyInvariants)', () => {
  it('visit города с чек-листом → tier=Bronze, plannedCities очищен', () => {
    const initial = ephemeralBase({ plannedCities: { [minsk]: true } });

    const next = applyInvariants({
      ...initial,
      visitedCities: { [minsk]: { date: '2025-01-15' } },
      plannedCities: {}, // confirmVisit удаляет из планов
    }, null);

    expect(next.visitedCities[minsk]).toEqual({ date: '2025-01-15' });
    expect(next.checkedSights[minsk]).toBeUndefined();
    expect(next.milestones).toEqual([]);
  });

  it('Bronze → Silver (отметка 1-го пункта) → plannedCities=true (инвариант #2)', () => {
    const next = applyInvariants({
      ...ephemeralBase(),
      visitedCities: { [minsk]: { date: '2025-01-15' } },
      checkedSights: { [minsk]: [allSights[0]] }, // 1 из 4
    }, null);

    expect(next.plannedCities[minsk]).toBe(true);
  });

  it('Silver → Gold (все пункты) → milestone=Gold, plannedCities удалён (#1)', () => {
    const before = applyInvariants({
      ...ephemeralBase(),
      visitedCities: { [minsk]: { date: '2025-01-15' } },
      plannedCities: { [minsk]: true },
      checkedSights: { [minsk]: [allSights[0], allSights[1], allSights[2]] },
      milestones: [{ cityId: minsk, tier: 'silver', date: '2025-01-15' }],
    }, null);
    expect(before.plannedCities[minsk]).toBe(true);

    // Отмечаем 4-й пункт → gold milestone добавляется
    const after = addMilestone(
      { ...before, checkedSights: { [minsk]: allSights } },
      minsk,
      'gold'
    );
    const afterWithInvariants = applyInvariants(after, null);

    expect(afterWithInvariants.plannedCities[minsk]).toBeUndefined();
    expect(afterWithInvariants.milestones.find(m => m.tier === 'gold')).toBeDefined();
  });

  it('removeVisit: очищает visited + checkedSights + planned + milestones', () => {
    const before = ephemeralBase({
      visitedCities: { [minsk]: { date: '2025-01-15' } },
      plannedCities: { [minsk]: true },
      checkedSights: { [minsk]: allSights },
      milestones: [
        { cityId: minsk, tier: 'silver', date: '2025-01-15' },
        { cityId: minsk, tier: 'gold', date: '2025-01-16' },
      ],
    });

    const after = removeAllMilestones({
      ...before,
      visitedCities: omitKey(before.visitedCities, minsk),
      checkedSights: omitKey(before.checkedSights, minsk),
      plannedCities: omitKey(before.plannedCities, minsk),
    }, minsk);
    const finalState = applyInvariants(after, null);

    expect(finalState.visitedCities[minsk]).toBeUndefined();
    expect(finalState.checkedSights[minsk]).toBeUndefined();
    expect(finalState.plannedCities[minsk]).toBeUndefined();
    expect(finalState.milestones).toHaveLength(0);
  });
});
