import { describe, it, expect } from 'vitest';
import { loadState, getDefaultState, store, STORAGE_KEY } from '@app/store.js';

function savedFields(s) {
  return {
    currentTab: s.currentTab,
    travelerName: s.travelerName,
    onboardingComplete: s.onboardingComplete,
    visitedCities: s.visitedCities,
    plannedCities: s.plannedCities,
    cityNotes: s.cityNotes,
    checkedSights: s.checkedSights,
    milestones: s.milestones,
  };
}

describe('getDefaultState', () => {
  it('содержит ровно 8 сохраняемых полей, без эфемерных', () => {
    const d = getDefaultState();
    expect(Object.keys(d).sort()).toEqual([
      'checkedSights', 'cityNotes', 'currentTab', 'milestones',
      'onboardingComplete', 'plannedCities', 'travelerName', 'visitedCities',
    ]);
    expect(d.currentTab).toBe('passport');
    expect(d.milestones).toEqual([]);
    expect(d.visitedCities).toEqual({});
  });
});

describe('store.setState → loadState round-trip (persist)', () => {
  it('setState.persist → load сохраняет 8 полей', () => {
    // Сброс store к дефолту (beforeEach уже очистил localStorage + store)
    store.setState({
      travelerName: 'Тестер',
      visitedCities: { minsk: { date: '2025-01-15' } }, // bronze (без отметок)
      cityNotes: { minsk: 'заметка' },
    });
    // persist-адаптер store уже записал отфильтрованный дамп в localStorage
    const loaded = loadState({ storage: localStorage });
    expect(savedFields(loaded)).toEqual(savedFields({
      ...getDefaultState(),
      travelerName: 'Тестер',
      visitedCities: { minsk: { date: '2025-01-15' } },
      cityNotes: { minsk: 'заметка' },
      milestones: [],
    }));
  });
});

describe('loadState — крайние случаи', () => {
  it('пустое хранилище → дефолт + эфемерные поля', () => {
    const s = loadState({ storage: localStorage });
    expect(s.travelerName).toBe('Белорусский путешественник');
    expect(s.visitedCities).toEqual({});
    expect(s.passportFilter).toBe('all');
    expect(s.mapFilter).toBe('all');
    expect(s.stampOverlayCityId).toBeNull();
    expect(s.openedRegions).toEqual([]);
  });

  it('legacy currentTab "catalog" → миграция в "passport"', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentTab: 'catalog', travelerName: 'X', onboardingComplete: true,
      visitedCities: {}, plannedCities: {}, cityNotes: {}, checkedSights: {}, milestones: [],
    }));
    const s = loadState({ storage: localStorage });
    expect(s.currentTab).toBe('passport');
  });

  it('невалидный JSON → полный сброс к дефолту (без throw)', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{');
    const s = loadState({ storage: localStorage });
    expect(s.travelerName).toBe('Белорусский путешественник');
    expect(s.visitedCities).toEqual({});
    expect(s.milestones).toEqual([]);
  });
});
