import { describe, it, expect } from 'vitest';
import { applyInvariants } from '@app/store.js';
import { CITIES } from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';

const checklistCity = CITIES.find(c => SIGHTS[c.id]);        // 'minsk', 4 sights
const allSights = SIGHTS[checklistCity.id].map(s => s.id);
const secondSightsCity = 'brest';
const secondSightsAll = SIGHTS[secondSightsCity].map(s => s.id);
const plainCity = CITIES.find(c => !SIGHTS[c.id]).id;        // 'slutsk'

function base(over) {
  return Object.assign({
    visitedCities: {},
    plannedCities: {},
    checkedSights: {},
    milestones: [],
    cityNotes: {}
  }, over);
}

describe('applyInvariants', () => {
  it('мутирует входной state и возвращает ту же ссылку (контракт)', () => {
    const state = base({});
    const result = applyInvariants(state, null);
    expect(result).toBe(state);
  });

  it('инвариант #1: Gold ∉ plannedCities', () => {
    const state = base({
      visitedCities: { [checklistCity.id]: { date: '2025-01-01' } },
      plannedCities: { [checklistCity.id]: true },
      checkedSights: { [checklistCity.id]: allSights },
    });
    applyInvariants(state, null);
    expect(state.plannedCities[checklistCity.id]).toBeUndefined();
  });

  it('инвариант #2: Silver ∈ plannedCities', () => {
    const state = base({
      visitedCities: { [checklistCity.id]: { date: '2025-01-01' } },
      checkedSights: { [checklistCity.id]: [allSights[0]] },
    });
    applyInvariants(state, null);
    expect(state.plannedCities[checklistCity.id]).toBe(true);
  });

  it('инвариант #3: checkedSights только для visited', () => {
    const state = base({
      visitedCities: {},
      checkedSights: { [checklistCity.id]: [allSights[0]] },
    });
    applyInvariants(state, null);
    expect(state.checkedSights[checklistCity.id]).toBeUndefined();
  });

  it('инвариант #4: milestones только для visited', () => {
    const state = base({
      visitedCities: {},
      milestones: [{ cityId: plainCity, date: '2025-03-01', tier: 'silver' }],
    });
    applyInvariants(state, null);
    expect(state.milestones).toEqual([]);
  });

  it('Bronze-город НЕ добавляется в plannedCities (#2 не добавляет bronze/gold)', () => {
    const state = base({
      visitedCities: { [secondSightsCity]: { date: '2025-01-01' } },
    });
    applyInvariants(state, null);
    expect(state.plannedCities[secondSightsCity]).toBeUndefined();
  });

  it('Silver другого города тоже добавляется', () => {
    const state = base({
      visitedCities: { [secondSightsCity]: { date: '2025-01-01' } },
      checkedSights: { [secondSightsCity]: [secondSightsAll[0]] },
    });
    applyInvariants(state, null);
    expect(state.plannedCities[secondSightsCity]).toBe(true);
  });
});
