import { buildSearchResults, buildFilterAccordions } from './build.js';

// features/search — pure HTML-string рендереры режима поиска/фильтра паспорта.
// В Phase D1 store и hooks не используются внутри search (функции pure).
// Передача (store, {}) при init допустима для единого контракта и будущей
// subscribe-based интеграции (Phase D2).

export function initSearch(store, hooks) {
  return {
    getResultsHtml: function (state) {
      return buildSearchResults(state);
    },
    getAccordionsHtml: function (state) {
      return buildFilterAccordions(state);
    },
  };
}
