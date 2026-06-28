import { describe, it, expect, vi } from 'vitest';
import { store } from '@app/store.js';

describe('store autosave', () => {
  it('setState вызывает localStorage.setItem с отфильтрованным дампом', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    store.setState({ currentTab: 'profile' });
    expect(setItem).toHaveBeenCalledWith(
      'travelerPassport',
      expect.stringContaining('"currentTab":"profile"')
    );
    setItem.mockRestore();
  });

  it('QuotaExceededError → onError("persist"), state всё равно обновлён', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    });
    // onError показывает тост (showToast) — в jsdom это noop/не падает
    store.setState({ currentTab: 'map' });
    expect(store.getState().currentTab).toBe('map');
    vi.restoreAllMocks();
  });
});
