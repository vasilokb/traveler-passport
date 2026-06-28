import { describe, it, expect } from 'vitest';
import { CITIES } from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';
import { loadState, STORAGE_KEY } from '@app/store.js';

// Реальные данные из модулей (не выдуманные cityId) — гарантирует, что валидация
// getCityById/CITIES/SIGHTS внутри loadState не отбросит фикстуры.
const checklistCity = CITIES.find(c => SIGHTS[c.id]);           // 'minsk', 4 достопримечательности
const allSights = SIGHTS[checklistCity.id].map(s => s.id);       // ['s0','s1','s2','s3']
const secondSightsCity = 'brest';                                // в SIGHTS (3), используется как silver
const secondSightsAll = SIGHTS[secondSightsCity].map(s => s.id);
const unvisitedSightsCity = 'grodno';                           // в SIGHTS, но НЕ посещён → для инварианта #3
const unvisitedSightsId0 = SIGHTS[unvisitedSightsCity][0].id;
const plainCity = CITIES.find(c => !SIGHTS[c.id]).id;           // напр. 'slutsk' — для инварианта #4

function loadFrom(saved) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return loadState({ storage: localStorage });
}

describe('v3-инварианты через loadState', () => {
  it('#1 Gold-город удаляется из plannedCities', () => {
    const s = loadFrom({
      currentTab: 'passport', travelerName: 'T', onboardingComplete: true,
      visitedCities: { [checklistCity.id]: { date: '2025-02-01' } },
      plannedCities: { [checklistCity.id]: true },
      cityNotes: {}, checkedSights: { [checklistCity.id]: allSights }, milestones: [],
    });
    expect(s.plannedCities[checklistCity.id]).toBeUndefined();
  });

  it('#2 Silver-город добавляется в plannedCities (авто-фокус)', () => {
    const s = loadFrom({
      currentTab: 'passport', travelerName: 'T', onboardingComplete: true,
      visitedCities: { [checklistCity.id]: { date: '2025-02-01' } },
      plannedCities: {},
      cityNotes: {}, checkedSights: { [checklistCity.id]: [allSights[0]] }, milestones: [],
    });
    expect(s.plannedCities[checklistCity.id]).toBe(true);
  });

  it('#3 checkedSights непосещённого города удаляются', () => {
    const s = loadFrom({
      currentTab: 'passport', travelerName: 'T', onboardingComplete: true,
      visitedCities: {},
      plannedCities: {}, cityNotes: {},
      checkedSights: { [unvisitedSightsCity]: [unvisitedSightsId0] }, milestones: [],
    });
    expect(s.checkedSights[unvisitedSightsCity]).toBeUndefined();
  });

  it('#4 milestones непосещённого города удаляются', () => {
    const s = loadFrom({
      currentTab: 'passport', travelerName: 'T', onboardingComplete: true,
      visitedCities: {}, plannedCities: {}, cityNotes: {}, checkedSights: {},
      milestones: [{ cityId: plainCity, date: '2025-03-01', tier: 'silver' }],
    });
    expect(s.milestones).toEqual([]);
  });

  it('все 4 инварианта вместе на одном state', () => {
    const s = loadFrom({
      currentTab: 'passport', travelerName: 'T', onboardingComplete: true,
      visitedCities: {
        [checklistCity.id]: { date: '2025-01-01' },
        [secondSightsCity]: { date: '2025-02-01' },
      },
      plannedCities: { [checklistCity.id]: true },            // gold → удалится (#1)
      cityNotes: {},
      checkedSights: {
        [checklistCity.id]: allSights,                         // minsk gold
        [secondSightsCity]: [secondSightsAll[0]],             // brest silver
        [unvisitedSightsCity]: [unvisitedSightsId0],          // grodno непосещён → удалится (#3)
      },
      milestones: [{ cityId: plainCity, date: '2025-03-01', tier: 'silver' }], // #4 удалится
    });
    expect(s.plannedCities[checklistCity.id]).toBeUndefined(); // #1
    expect(s.plannedCities[secondSightsCity]).toBe(true);     // #2 добавлен
    expect(s.checkedSights[unvisitedSightsCity]).toBeUndefined(); // #3
    expect(s.checkedSights[checklistCity.id]).toHaveLength(4);    // сохранён
    expect(s.checkedSights[secondSightsCity]).toHaveLength(1);    // сохранён
    expect(s.milestones).toEqual([]);                          // #4
  });

  it('пустой state → инварианты не падают', () => {
    const s = loadFrom({
      currentTab: 'passport', travelerName: 'T', onboardingComplete: false,
      visitedCities: {}, plannedCities: {}, cityNotes: {}, checkedSights: {}, milestones: [],
    });
    expect(s.visitedCities).toEqual({});
    expect(s.milestones).toEqual([]);
    expect(s.plannedCities).toEqual({});
  });

  it('Gold-город, которого нет в планах, не добавляется (#2 не добавляет gold)', () => {
    const s = loadFrom({
      currentTab: 'passport', travelerName: 'T', onboardingComplete: true,
      visitedCities: { [checklistCity.id]: { date: '2025-02-01' } },
      plannedCities: {}, cityNotes: {},
      checkedSights: { [checklistCity.id]: allSights }, milestones: [],
    });
    expect(s.plannedCities[checklistCity.id]).toBeUndefined();
  });

  it('Silver-город, уже в планах → остаётся', () => {
    const s = loadFrom({
      currentTab: 'passport', travelerName: 'T', onboardingComplete: true,
      visitedCities: { [checklistCity.id]: { date: '2025-02-01' } },
      plannedCities: { [checklistCity.id]: true }, cityNotes: {},
      checkedSights: { [checklistCity.id]: [allSights[0]] }, milestones: [],
    });
    expect(s.plannedCities[checklistCity.id]).toBe(true);
  });
});
