import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initVisit } from '@features/visit/index.js';
import { store, _resetForTest } from '../../src/app/store.js';
import { SIGHTS } from '@entities/sight/index.js';

const MINSK_SIGHTS = SIGHTS.minsk.map(s => s.id);

function makeHooks() {
  return {
    rerenderCityCard: vi.fn(),
    updateMap: vi.fn(),
    renderProfile: vi.fn(),
    closeCityCard: vi.fn(),
    saveNoteNow: vi.fn(),
    showStampOverlay: vi.fn(),
    withMux: (fn) => fn,
    withMuxSlow: (fn) => fn,
  };
}

describe('features/visit', () => {
  let hooks;
  beforeEach(() => {
    _resetForTest();
    // DOM для closeDatePicker (direct import из ./date-picker.js — НЕ мок).
    document.body.innerHTML =
      '<div id="date-picker-modal" style="display:none"></div>' +
      '<div id="date-picker-content"></div>';
    hooks = makeHooks();
  });

  describe('confirmVisit', () => {
    it('добавляет в visitedCities, удаляет из plannedCities, вызывает hooks', () => {
      store.setState({ plannedCities: { minsk: true } });
      document.getElementById('date-picker-modal').style.display = 'flex';

      const api = initVisit(store, hooks);
      api.confirmVisit('minsk', '2025-01-15');

      const s = store.getState();
      expect(s.visitedCities.minsk).toEqual({ date: '2025-01-15' });
      expect(s.plannedCities.minsk).toBeUndefined();
      // closeDatePicker — реальная функция (direct import), проверяем DOM:
      expect(document.getElementById('date-picker-modal').style.display).toBe('none');
      expect(hooks.showStampOverlay).toHaveBeenCalledWith('minsk');
      expect(hooks.rerenderCityCard).toHaveBeenCalledWith('minsk');
      // Phase D2: hooks.updateMap удалён (subscribe widgets/map покрывает) — НЕ вызывается.
      expect(hooks.updateMap).not.toHaveBeenCalled();
      expect(hooks.saveNoteNow).toHaveBeenCalledWith('minsk');
    });

    it('Silver-город → авто-возврат в plannedCities (инвариант #2)', () => {
      store.setState({
        visitedCities: { minsk: { date: '2025-01-15' } },
        checkedSights: { minsk: [MINSK_SIGHTS[0]] }, // 1 из 4 → silver
      });
      const api = initVisit(store, hooks);
      api.confirmVisit('pinsk', '2025-02-01');
      expect(store.getState().plannedCities.minsk).toBe(true);
    });

    it('передаёт дату как { date } объект', () => {
      const api = initVisit(store, hooks);
      api.confirmVisit('brest', '2025-03-10');
      expect(store.getState().visitedCities.brest).toEqual({ date: '2025-03-10' });
    });
  });

  describe('removeVisit', () => {
    it('очищает visited + checkedSights + planned + milestones (inline filter)', () => {
      store.setState({
        visitedCities: { minsk: { date: '2025-01-15' } },
        checkedSights: { minsk: MINSK_SIGHTS },
        plannedCities: { minsk: true },
        milestones: [{ cityId: 'minsk', date: '2025-01-15', tier: 'silver' }],
      });

      const api = initVisit(store, hooks);
      api.removeVisit('minsk');

      const s = store.getState();
      expect(s.visitedCities.minsk).toBeUndefined();
      expect(s.checkedSights.minsk).toBeUndefined();
      expect(s.plannedCities.minsk).toBeUndefined();
      expect(s.milestones).toEqual([]);
      expect(hooks.closeCityCard).toHaveBeenCalled();
      // Phase D2: hooks.updateMap удалён (subscribe widgets/map покрывает) — НЕ вызывается.
      expect(hooks.updateMap).not.toHaveBeenCalled();
    });

    it('milestones других городов сохраняются', () => {
      store.setState({
        visitedCities: {
          minsk: { date: '2025-01-15' },
          pinsk: { date: '2025-02-01' },
        },
        milestones: [
          { cityId: 'minsk', date: '2025-01-15', tier: 'silver' },
          { cityId: 'pinsk', date: '2025-02-01', tier: 'silver' },
        ],
      });

      const api = initVisit(store, hooks);
      api.removeVisit('minsk');

      expect(store.getState().milestones).toEqual([
        { cityId: 'pinsk', date: '2025-02-01', tier: 'silver' },
      ]);
    });

    // Phase D2: features больше НЕ вызывают renderProfile напрямую — re-render
    // профиля покрывается subscribe widgets/profile. Hook не должен вызываться.
    it('removeVisit НЕ вызывает renderProfile напрямую (subscribe покрывает)', () => {
      store.setState({
        currentTab: 'profile',
        visitedCities: { minsk: { date: '2025-01-15' } },
      });
      const api = initVisit(store, hooks);
      api.removeVisit('minsk');
      expect(store.getState().visitedCities.minsk).toBeUndefined();
      expect(hooks.renderProfile).not.toHaveBeenCalled();
    });

    it('removeVisit на не-visited городе → no-op по данным (инварианты чистят)', () => {
      const api = initVisit(store, hooks);
      api.removeVisit('minsk');
      // проверок не падает, closeCityCard всё равно вызывается (контракт removeVisit)
      expect(hooks.closeCityCard).toHaveBeenCalled();
      expect(store.getState().milestones).toEqual([]);
    });
  });
});
