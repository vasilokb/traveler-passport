import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initPlan } from '@features/plan/index.js';
import { store, _resetForTest } from '../../src/app/store.js';
import { SIGHTS } from '@entities/sight/index.js';

const MINSK_SIGHTS = SIGHTS.minsk.map(s => s.id);

function makeHooks() {
  return {
    rerenderCityCard: vi.fn(),
    updateMap: vi.fn(),
    saveNoteNow: vi.fn(),
    withMux: (fn) => fn,
  };
}

describe('features/plan — togglePlanned', () => {
  let hooks, api;
  beforeEach(() => {
    _resetForTest();
    hooks = makeHooks();
    api = initPlan(store, hooks);
  });

  it('Silver город → noop (ранний возврат); planned остаётся true (инвариант #2)', () => {
    store.setState({
      visitedCities: { minsk: { date: '2025-01-15' } },
      checkedSights: { minsk: [MINSK_SIGHTS[0]] }, // 1 из 4 → silver
    });
    expect(store.getState().plannedCities.minsk).toBe(true);

    api.togglePlanned('minsk');

    expect(store.getState().plannedCities.minsk).toBe(true);
    // Ранний возврат ДО hooks — ни один hook не вызван.
    expect(hooks.saveNoteNow).not.toHaveBeenCalled();
    expect(hooks.rerenderCityCard).not.toHaveBeenCalled();
    expect(hooks.updateMap).not.toHaveBeenCalled();
  });

  it('Gold город, не в планах → noop (ранний возврат)', () => {
    store.setState({
      visitedCities: { minsk: { date: '2025-01-15' } },
      checkedSights: { minsk: MINSK_SIGHTS }, // все 4 → gold
    });
    expect(store.getState().plannedCities.minsk).toBeUndefined();

    api.togglePlanned('minsk');

    expect(store.getState().plannedCities.minsk).toBeUndefined();
    expect(hooks.updateMap).not.toHaveBeenCalled();
  });

  it('Visited без чек-листа, не в планах → noop (ранний возврат)', () => {
    // slutsk не имеет SIGHTS → tier=bronze, но isVisited && !hasSights → remove-only
    store.setState({ visitedCities: { slutsk: { date: '2025-01-15' } } });
    expect(store.getState().plannedCities.slutsk).toBeUndefined();

    api.togglePlanned('slutsk');

    expect(store.getState().plannedCities.slutsk).toBeUndefined();
    expect(hooks.updateMap).not.toHaveBeenCalled();
  });

  it('Visited без чек-листа, в планах → удаляет из planned', () => {
    store.setState({
      visitedCities: { slutsk: { date: '2025-01-15' } },
      plannedCities: { slutsk: true },
    });
    expect(store.getState().plannedCities.slutsk).toBe(true);

    api.togglePlanned('slutsk');

    expect(store.getState().plannedCities.slutsk).toBeUndefined();
    expect(hooks.saveNoteNow).toHaveBeenCalledWith('slutsk');
    expect(hooks.rerenderCityCard).toHaveBeenCalledWith('slutsk');
    expect(hooks.updateMap).toHaveBeenCalled();
  });

  it('Непосещённый город → toggle добавляет в planned', () => {
    store.setState({});
    expect(store.getState().plannedCities.minsk).toBeUndefined();

    api.togglePlanned('minsk');

    expect(store.getState().plannedCities.minsk).toBe(true);
    expect(hooks.updateMap).toHaveBeenCalled();
  });

  it('Непосещённый город (повторный toggle) → удаляет из planned', () => {
    store.setState({ plannedCities: { minsk: true } });

    api.togglePlanned('minsk');

    expect(store.getState().plannedCities.minsk).toBeUndefined();
  });

  it('Bronze visited-with-sights → toggle add/remove', () => {
    store.setState({
      visitedCities: { minsk: { date: '2025-01-15' } },
      checkedSights: { minsk: [] },
    });
    // 0 проверенных → bronze, hasSights=true → else-ветка (toggle)
    // (checkedSights пустой ключ может быть выкинут invariants? нет — #3 чистит
    //  только для НЕпосещённых; minsk посещён, остаётся)
    api.togglePlanned('minsk');
    expect(store.getState().plannedCities.minsk).toBe(true);

    api.togglePlanned('minsk');
    expect(store.getState().plannedCities.minsk).toBeUndefined();
  });

  it('visitedCities НЕ мутируется togglePlanned', () => {
    store.setState({ plannedCities: { minsk: true } });
    var visitedBefore = store.getState().visitedCities;

    api.togglePlanned('minsk');

    expect(store.getState().visitedCities).toBe(visitedBefore);
    expect(store.getState().visitedCities.minsk).toBeUndefined();
  });
});
