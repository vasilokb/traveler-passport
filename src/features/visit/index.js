import { store, omitKey } from '@app/store.js';
import { closeDatePicker } from './date-picker.js';

// features/visit — подтверждение/удаление визита города.
// confirmVisit: после setState вызывает hook showStampOverlay (bugfix D-1 §17 —
// renderStampOverlay была мёртвым кодом в v3).
// removeVisit: фильтрует milestones инлайном (НЕ импортирует removeAllMilestones
// из checklist — §6: features → features запрещено; тривиальный one-liner).

export function initVisit(_store, hooks) {
  var withMux = hooks.withMux;

  function confirmVisit(cityId, date) {
    hooks.saveNoteNow(cityId);

    store.setState(function (prev) {
      var next = {
        ...prev,
        visitedCities: { ...prev.visitedCities, [cityId]: { date: date } }
      };
      if (next.plannedCities[cityId]) {
        next.plannedCities = omitKey(next.plannedCities, cityId);
      }
      return next;
    });
    // Silver-инвариант (#2) применится автоматически в applyInvariants.
    closeDatePicker();
    hooks.rerenderCityCard(cityId);
    hooks.updateMap();
    // Bugfix D-1 (§17): подключаем stamp-overlay к confirmVisit.
    hooks.showStampOverlay(cityId);
  }

  function removeVisit(cityId) {
    store.setState(function (prev) {
      var next = { ...prev };
      next.visitedCities = omitKey(next.visitedCities, cityId);
      next.checkedSights = omitKey(next.checkedSights, cityId);
      next.plannedCities = omitKey(next.plannedCities, cityId);
      // Инлайн фильтра milestones (§3.1): features → features импорт запрещён.
      next.milestones = next.milestones.filter(function (m) { return m.cityId !== cityId; });
      return next;
    });
    hooks.closeCityCard();

    if (store.getState().currentTab === "profile") hooks.renderProfile();
    hooks.updateMap();
  }

  return {
    confirmVisit: withMux(confirmVisit),
    removeVisit: withMux(removeVisit),
  };
}
