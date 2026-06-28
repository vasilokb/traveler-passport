import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initChecklist } from '@features/checklist/index.js';
import { store, _resetForTest } from '../../src/app/store.js';
import { SIGHTS } from '@entities/sight/index.js';

const MS = SIGHTS.minsk.map(s => s.id); // ['s0','s1','s2','s3']

function makeHooks() {
  return {
    rerenderCityCard: vi.fn(),
    patchChecklist: vi.fn(),
    updateMap: vi.fn(),
    saveNoteNow: vi.fn(),
    withMux: (fn) => fn,
    withMuxSlow: (fn) => fn,
  };
}

function visitMinsk() {
  store.setState({ visitedCities: { minsk: { date: '2025-01-15' } } });
}

describe('features/checklist — toggleSight', () => {
  let hooks, api;
  beforeEach(() => {
    _resetForTest();
    hooks = makeHooks();
    api = initChecklist(store, hooks);
  });

  it('Guards: не-visited город → noop', () => {
    api.toggleSight('minsk', MS[0]);
    expect(store.getState().checkedSights.minsk).toBeUndefined();
    expect(hooks.updateMap).not.toHaveBeenCalled();
  });

  it('Guards: невалидный sightId → noop', () => {
    visitMinsk();
    api.toggleSight('minsk', 'nonexistent-sight');
    expect(store.getState().checkedSights.minsk).toBeUndefined();
    expect(hooks.updateMap).not.toHaveBeenCalled();
  });

  it('add sightId: Bronze → Silver (добавляется milestone silver)', () => {
    visitMinsk();
    api.toggleSight('minsk', MS[0]);

    const s = store.getState();
    expect(s.checkedSights.minsk).toEqual([MS[0]]);
    expect(s.milestones).toEqual([
      expect.objectContaining({ cityId: 'minsk', tier: 'silver' }),
    ]);
    expect(hooks.updateMap).toHaveBeenCalled();
    // tier изменился → rerenderCityCard
    expect(hooks.rerenderCityCard).toHaveBeenCalledWith('minsk');
    expect(hooks.patchChecklist).not.toHaveBeenCalled();
  });

  it('no-tier-change (Silver → Silver) → patchChecklist (optimistic)', () => {
    visitMinsk();
    api.toggleSight('minsk', MS[0]); // → silver
    hooks.rerenderCityCard.mockClear();
    hooks.patchChecklist.mockClear();
    hooks.updateMap.mockClear();

    api.toggleSight('minsk', MS[1]); // silver → silver

    expect(hooks.patchChecklist).toHaveBeenCalledWith('minsk', MS[1]);
    expect(hooks.rerenderCityCard).not.toHaveBeenCalled();
    expect(hooks.updateMap).toHaveBeenCalled();
    expect(store.getState().checkedSights.minsk).toEqual([MS[0], MS[1]]);
  });

  it('remove sightId: Silver → Bronze (удаляются milestones)', () => {
    visitMinsk();
    api.toggleSight('minsk', MS[0]); // → silver (milestone silver)

    api.toggleSight('minsk', MS[0]); // → bronze

    const s = store.getState();
    expect(s.checkedSights.minsk).toBeUndefined(); // пустой ключ удалён
    expect(s.milestones).toEqual([]);
  });

  it('Silver → Gold: добавляются milestones silver+gold', () => {
    visitMinsk();
    api.toggleSight('minsk', MS[0]);
    api.toggleSight('minsk', MS[1]);
    api.toggleSight('minsk', MS[2]); // silver, 3 проверено

    api.toggleSight('minsk', MS[3]); // → gold

    const s = store.getState();
    expect(s.checkedSights.minsk).toEqual([MS[0], MS[1], MS[2], MS[3]]);
    var tiers = s.milestones.map(m => m.tier).sort();
    expect(tiers).toEqual(['gold', 'silver']);
    // gold-ветка: patchChecklist вызывается сразу
    expect(hooks.patchChecklist).toHaveBeenCalledWith('minsk', MS[3]);
  });

  it('Gold → Silver: откат, milestone gold удаляется', () => {
    visitMinsk();
    MS.forEach(id => api.toggleSight('minsk', id)); // → gold
    expect(store.getState().milestones.map(m => m.tier)).toContain('gold');

    api.toggleSight('minsk', MS[3]); // gold → silver

    const s = store.getState();
    expect(s.milestones.map(m => m.tier)).toEqual(['silver']);
    // tier изменился (gold→silver) → rerenderCityCard (else-ветка)
    expect(hooks.rerenderCityCard).toHaveBeenCalledWith('minsk');
  });

  it('toggle на одном пункте дважды → возвращается к исходному (round-trip)', () => {
    visitMinsk();
    api.toggleSight('minsk', MS[0]); // add
    expect(store.getState().checkedSights.minsk).toEqual([MS[0]]);
    api.toggleSight('minsk', MS[0]); // remove
    expect(store.getState().checkedSights.minsk).toBeUndefined();
  });

  it('saveNoteNow вызывается перед мутацией state', () => {
    visitMinsk();
    api.toggleSight('minsk', MS[0]);
    expect(hooks.saveNoteNow).toHaveBeenCalledWith('minsk');
  });
});
