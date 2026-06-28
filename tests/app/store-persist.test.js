import { describe, it, expect, vi } from 'vitest';
import { store, STORAGE_KEY, loadState } from '@app/store.js';

const EIGHT = [
  'checkedSights', 'cityNotes', 'currentTab', 'milestones',
  'onboardingComplete', 'plannedCities', 'travelerName', 'visitedCities',
];

describe('persist-фильтрация до 8 полей (поведение 1:1 с v3)', () => {
  it('эфемерные поля НЕ попадают в дамп localStorage', () => {
    // Сначала persisted-запись (устанавливает чистый 8-полей дамп).
    store.setState({ travelerName: 'X' });
    // Затем ephemeral-запись — persist-адаптер фильтрует до 8 полей, эфемерные не
    // протекают (даже если бы записывались).
    store.setState({
      mapFilter: 'visited',
      openedRegions: ['minsk'],
      passportFilter: 'visited',
      passportSearchQuery: 'запрос',
      stampOverlayCityId: 'minsk',
      activeOverlayCityId: 'minsk',
      stampOrigin: 'map',
    });

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const dumped = JSON.parse(raw);

    expect(Object.keys(dumped).sort()).toEqual(EIGHT);
    expect(dumped.mapFilter).toBeUndefined();
    expect(dumped.openedRegions).toBeUndefined();
    expect(dumped.passportFilter).toBeUndefined();
    expect(dumped.stampOverlayCityId).toBeUndefined();
  });

  it('ephemeral-only setState не пишет в storage (оптимизация)', () => {
    var setItem = vi.spyOn(Storage.prototype, 'setItem');
    store.setState({ mapFilter: 'visited', openedRegions: ['minsk'] });
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('после reload эфемерные поля сбрасываются к дефолту', () => {
    store.setState({ mapFilter: 'visited', openedRegions: ['minsk'] });
    expect(store.getState().mapFilter).toBe('visited');

    const reloaded = loadState({ storage: localStorage });
    expect(reloaded.mapFilter).toBe('all');
    expect(reloaded.openedRegions).toEqual([]);
  });
});
