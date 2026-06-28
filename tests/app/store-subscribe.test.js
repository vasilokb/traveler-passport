import { describe, it, expect, vi } from 'vitest';
import { store } from '@app/store.js';

describe('store subscribe', () => {
  it('подписчик вызывается после setState', () => {
    const sub = vi.fn();
    const unsub = store.subscribe(sub);
    store.setState({ currentTab: 'map' });
    expect(sub).toHaveBeenCalledTimes(1);
    expect(sub).toHaveBeenCalledWith(expect.objectContaining({ currentTab: 'map' }));
    unsub();
  });

  it('unsubscribe прекращает вызовы', () => {
    const sub = vi.fn();
    const unsub = store.subscribe(sub);
    store.setState({ currentTab: 'map' });
    unsub();
    store.setState({ currentTab: 'profile' });
    expect(sub).toHaveBeenCalledTimes(1);
  });

  it('несколько подписчиков — все получают обновления', () => {
    const a = vi.fn();
    const b = vi.fn();
    const ua = store.subscribe(a);
    const ub = store.subscribe(b);
    store.setState({ currentTab: 'map' });
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    ua();
    ub();
  });
});
