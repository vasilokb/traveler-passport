import { store, omitKey } from '@app/store.js';
import { getCityTier as getCityTierPure, hasChecklist as hasChecklistPure } from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';

// Локальные wrapper'ы (стиль main.js) — подставляют текущий state/SIGHTS
// в pure-функции entities, сохраняя сигнатуру 1:1 с оригиналом.
function getCityTier(cityId) { return getCityTierPure(cityId, store.getState(), SIGHTS); }
function hasChecklist(cityId) { return hasChecklistPure(cityId, SIGHTS); }

// togglePlanned — управление закладкой «в планах» / «Доисследовать».
// Контракт (§3.4):
// 1. Tier-aware early-return (Silver → noop).
// 2. Вычисляет nextPlanned.
// 3. ОДИН store.setState({ plannedCities }).
// 4. hooks.saveNoteNow → hooks.rerenderCityCard → hooks.updateMap.
// plannedCities-инварианты (#1 Gold, #2 Silver) применяются автоматически
// в applyInvariants.
export function initPlan(_store, hooks) {
  var withMux = hooks.withMux;

  function togglePlanned(cityId) {
    var state = store.getState();
    var isVisited = !!state.visitedCities[cityId];
    var hasSights = hasChecklist(cityId);
    var tier = getCityTier(cityId);
    if (tier === "silver") {
      return;
    }

    // Вычислить новое состояние plannedCities.
    var nextPlanned;
    if (tier === "gold" || (isVisited && !hasSights)) {
      // Нечего удалять — ранний возврат (поведение 1:1 с app.js:1380-1390).
      if (!state.plannedCities[cityId]) return;
      nextPlanned = omitKey(state.plannedCities, cityId);
    } else {
      nextPlanned = state.plannedCities[cityId]
        ? omitKey(state.plannedCities, cityId)
        : Object.assign({}, state.plannedCities, { [cityId]: true });
    }

    store.setState({ plannedCities: nextPlanned });

    // saveNote вызывается для всех веток, кроме silver и раннего возврата.
    // Оригинал вызывал saveNote только в ветке else; для gold-ветки это
    // недостижимо (Gold ∉ plannedCities), для visited-no-sights безвредно (§17).
    hooks.saveNoteNow(cityId);
    hooks.rerenderCityCard(cityId);
    hooks.updateMap();
  }

  return {
    togglePlanned: withMux(togglePlanned),
  };
}
