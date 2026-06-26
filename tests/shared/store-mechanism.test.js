import { describe, it, expect, vi } from 'vitest';
import { createStore } from '@shared/lib/store-mechanism.js';

describe('createStore', () => {
  it('#1 getState() возвращает initialState', () => {
    const store = createStore({ initialState: { count: 0 } });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('#2 setState(patch-obj) сливает патч', () => {
    const store = createStore({ initialState: { count: 0, name: 'a' } });
    store.setState({ count: 5 });
    expect(store.getState()).toEqual({ count: 5, name: 'a' });
  });

  it('#3 setState(fn) вызывает функцию с текущим state и принимает результат', () => {
    const store = createStore({ initialState: { count: 1 } });
    store.setState((s) => ({ ...s, count: s.count + 1 }));
    expect(store.getState().count).toBe(2);
  });

  it('#4 subscribe(fn) вызывается после каждого setState', () => {
    const store = createStore({ initialState: { count: 0 } });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState({ count: 1 });
    store.setState({ count: 2 });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith({ count: 2 });
  });

  it('#5 subscribe возвращает функцию отписки', () => {
    const store = createStore({ initialState: { count: 0 } });
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    store.setState({ count: 1 });
    unsub();
    store.setState({ count: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('#6 несколько подписчиков — все получают обновление', () => {
    const store = createStore({ initialState: { count: 0 } });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.setState({ count: 9 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith({ count: 9 });
  });

  it('#7 validate бросает → state не меняется, onError("validate") вызван', () => {
    const onError = vi.fn();
    const store = createStore({
      initialState: { count: 0 },
      validate: () => { throw new Error('bad'); },
      onError,
    });
    store.setState({ count: 5 });
    expect(store.getState()).toEqual({ count: 0 }); // откат
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][1]).toBe('validate');
  });

  it('#8 persist.getItem есть → начальное состояние загружается оттуда', () => {
    const persist = {
      key: 'k',
      getItem: () => JSON.stringify({ count: 42 }),
      setItem: () => {},
    };
    const store = createStore({ initialState: { count: 0 }, persist });
    expect(store.getState()).toEqual({ count: 42 });
  });

  it('#9 persist.setItem вызывается после setState', () => {
    const setItem = vi.fn();
    const persist = { key: 'k', getItem: () => null, setItem };
    const store = createStore({ initialState: { count: 0 }, persist });
    store.setState({ count: 7 });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem.mock.calls[0][0]).toBe('k');
    expect(JSON.parse(setItem.mock.calls[0][1])).toEqual({ count: 7 });
  });

  it('#10 persist.setItem бросает → onError("persist") вызван, state всё равно обновлён', () => {
    const onError = vi.fn();
    const persist = {
      key: 'k',
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
    };
    const store = createStore({ initialState: { count: 0 }, persist, onError });
    store.setState({ count: 3 });
    expect(store.getState()).toEqual({ count: 3 }); // обновлено несмотря на ошибку persist
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][1]).toBe('persist');
  });

  it('#11 validate возвращает трансформированное состояние (state НЕ undefined)', () => {
    const store = createStore({
      initialState: { count: 0 },
      validate: (next) => ({ ...next, flagged: true }),
    });
    store.setState({ count: 5 });
    const s = store.getState();
    expect(s).toEqual({ count: 5, flagged: true });
    expect(s).toBeDefined();
  });

  it('#11b validate возвращает next без изменений → тождество', () => {
    const store = createStore({
      initialState: { count: 0 },
      validate: (next) => next,
    });
    store.setState({ count: 8 });
    expect(store.getState()).toEqual({ count: 8 });
  });
});
