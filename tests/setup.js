import { _resetForTest } from '../src/app/store.js';

beforeEach(() => {
  localStorage.clear();
  // store — синглтон; без сброса in-memory state + subscribers тесты flaky.
  _resetForTest();
});

// jsdom не реализует window.matchMedia. Некоторый код приложения (напр. привязка
// слушателей в renderCityCard) вызывает matchMedia синхронно. Стаб нужен для
// DOM-тестов, импортирующих main.js.
if (!window.matchMedia) {
  window.matchMedia = function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () { return false; },
    };
  };
}
