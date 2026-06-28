export function createStore(opts) {
  var initialState = opts.initialState;
  var validate = opts.validate;
  var persist = opts.persist;
  var onError = opts.onError;
  var initialStateLoader = opts.initialStateLoader;

  var state = initialState;
  var subscribers = new Set();

  // persistFields (опционально): множество полей, которые персистятся. Если задано,
  // persist-запись пропускается для object-patch'ей, затрагивающих только эфемерные
  // (не-персистируемые) поля — они не пишутся в storage в любом случае.
  // Для function-updater'ов запись выполняется всегда (консервативно).
  var persistFieldsLookup = null;
  if (Array.isArray(opts.persistFields)) {
    persistFieldsLookup = Object.create(null);
    for (var i = 0; i < opts.persistFields.length; i++) {
      persistFieldsLookup[opts.persistFields[i]] = true;
    }
  }

  // loadFromPersist (default true): управляет авто-загрузкой сырого дампа из persist.
  // app/store.js передаёт loadFromPersist: false, потому что сам валидирует состояние
  // в loadState() и не хочет, чтобы createStore затирал его сырым невалидированным JSON.
  var shouldLoadFromPersist = opts.loadFromPersist !== false;
  if (shouldLoadFromPersist && persist && persist.key) {
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
      var shouldWrite = true;
      if (persistFieldsLookup && typeof patch !== 'function') {
        shouldWrite = false;
        for (var k in patch) {
          if (persistFieldsLookup[k]) { shouldWrite = true; break; }
        }
      }
      if (shouldWrite) {
        try { persist.setItem(persist.key, JSON.stringify(state)); }
        catch (e) { if (onError) onError(e, 'persist', state); }
      }
    }
    subscribers.forEach(function (fn) { fn(state); });
  }

  function subscribe(fn) {
    subscribers.add(fn);
    return function () { subscribers.delete(fn); };
  }

  // Test-only API: сбрасывает in-memory state (через initialStateLoader, если задан —
  // иначе к initialState) и очищает подписчиков. Маркер имени «_» — НЕ использовать в
  // production-коде. Нужен, потому что store — синглтон, и без сброса тесты flaky.
  function _resetForTest() {
    state = initialStateLoader ? initialStateLoader() : initialState;
    subscribers.clear();
  }

  return { getState: getState, setState: setState, subscribe: subscribe, _resetForTest: _resetForTest };
}
