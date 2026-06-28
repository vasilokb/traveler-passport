import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, store, _resetForTest, STORAGE_KEY } from '@app/store.js';

describe('store load (loadState напрямую)', () => {
  beforeEach(() => localStorage.clear());

  it('legacy currentTab="catalog" мигрирует в "passport"', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentTab: 'catalog',
      travelerName: 'Test',
      onboardingComplete: true,
      visitedCities: {},
      plannedCities: {},
      cityNotes: {},
      checkedSights: {},
      milestones: []
    }));
    const state = loadState({ storage: localStorage });
    expect(state.currentTab).toBe('passport');
  });

  it('повреждённый JSON → дефолт', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{');
    const state = loadState({ storage: localStorage });
    expect(state.travelerName).toBe('Белорусский путешественник');
  });

  it('пустой storage → дефолт', () => {
    const state = loadState({ storage: localStorage });
    expect(state.currentTab).toBe('passport');
    expect(state.visitedCities).toEqual({});
  });

  it('v0 дамп (только currentTab) → остальные поля дефолт', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentTab: 'map' }));
    const state = loadState({ storage: localStorage });
    expect(state.currentTab).toBe('map');
    expect(state.visitedCities).toEqual({});
    expect(state.travelerName).toBe('Белорусский путешественник');
  });
});

describe('store re-init из localStorage', () => {
  it('после localStorage.setItem + _resetForTest — store видит новое', () => {
    expect(store.getState().currentTab).toBe('passport');

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentTab: 'map',
      travelerName: 'X',
      onboardingComplete: true,
      visitedCities: {},
      plannedCities: {},
      cityNotes: {},
      checkedSights: {},
      milestones: []
    }));
    _resetForTest();

    expect(store.getState().currentTab).toBe('map');
  });
});
