import { describe, it, expect, vi } from 'vitest';
import { store, _resetForTest } from '@app/store.js';

describe('_resetForTest', () => {
  it('сбрасывает state к свежему из localStorage', () => {
    store.setState({ currentTab: 'map' });
    expect(store.getState().currentTab).toBe('map');

    localStorage.clear();
    _resetForTest();

    expect(store.getState().currentTab).toBe('passport'); // дефолт
  });

  it('очищает subscribers', () => {
    const sub = vi.fn();
    store.subscribe(sub);
    _resetForTest();

    store.setState({ currentTab: 'map' });
    expect(sub).not.toHaveBeenCalled();
  });
});
