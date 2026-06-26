// TODO(phase-c): начальная загрузка из persist (JSON.parse) обходит validate. Для домена это
// неприемлемо — loadState Phase A делает полную валидацию (cityId, даты, дедуп, 4 инварианта).
// Phase C либо (а) валидирует состояние вручную ПОСЛЕ createStore (тогда persist-загрузку createStore
// отключить/игнорировать), либо (б) дорабатывает createStore: validate(next, initialState) при загрузке.
// ⚠️ ВАЖНО для Phase C: `persist` НЕ равно `localStorage`.
// persist — это wrapper-объект с ПЯМЯ строковым полем `key` + методами getItem/setItem:
//   { getItem: k => localStorage.getItem(k),
//     setItem: (k, v) => localStorage.setItem(k, v),
//     key: 'travelerPassport' }
// Передать `localStorage` напрямую — нельзя: у него есть метод key(n), который затенит
// строковое поле key (persist.key станет функцией).
export function createStore(opts) {
  var initialState = opts.initialState;
  var validate = opts.validate;
  var persist = opts.persist;
  var onError = opts.onError;

  var state = initialState;
  var subscribers = new Set();

  if (persist && persist.key) {
    try {
      var raw = persist.getItem(persist.key);
      if (raw) state = JSON.parse(raw);
    } catch (e) {
      if (onError) onError(e, 'load', null);
    }
  }

  function getState() { return state; }

  function setState(patch) {
    var next = typeof patch === 'function' ? patch(state) : Object.assign({}, state, patch);
    var validated = next;
    if (validate) {
      try {
        validated = validate(next, state);
      } catch (e) {
        if (onError) onError(e, 'validate', next);
        return state; // откат
      }
    }
    state = validated;
    if (persist && persist.key) {
      try { persist.setItem(persist.key, JSON.stringify(state)); }
      catch (e) { if (onError) onError(e, 'persist', state); }
    }
    subscribers.forEach(function (fn) { fn(state); });
  }

  function subscribe(fn) {
    subscribers.add(fn);
    return function () { subscribers.delete(fn); };
  }

  return { getState: getState, setState: setState, subscribe: subscribe };
}
