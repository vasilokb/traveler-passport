import { describe, it, expect } from 'vitest';
import { loadState, saveState, getDefaultState, STORAGE_KEY } from '../src/lib/storage.js';

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

describe('saveState/loadState round-trip', () => {
  it('save → load сохраняет 8 полей (инвариант-стабильное состояние)', () => {
    const state = {
      currentTab: 'passport',
      travelerName: 'Тестер',
      onboardingComplete: true,
      visitedCities: { minsk: { date: '2025-01-15' } }, // bronze (без отметок)
      plannedCities: {},
      cityNotes: { minsk: 'заметка' },
      checkedSights: {},
      milestones: [],
    };
    const res = saveState(state, localStorage);
    expect(res).toEqual({ ok: true });
    const loaded = loadState({ storage: localStorage });
    expect(savedFields(loaded)).toEqual(savedFields(state));
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

describe('saveState — ошибка квоты', () => {
  it('возвращает { ok: false, error } когда setItem бросает QuotaExceededError', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; },
      removeItem: () => {},
    };
    const res = saveState(getDefaultState(), storage);
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });
});

// Примечание: обёртка showToast в main.js при !ok покрывается ручным smoke-чеклистом #12
// (импорт main.js в unit-тестах нежелателен — он регистрирует DOMContentLoaded-слушатель
// и обращается к DOM). Ядро saveStatePure здесь проверено; обёртка — тривиальные 2 строки.
