import { store } from '@app/store.js';
import { getCityTier as getCityTierPure } from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';
import { addMilestone, removeMilestone } from './milestones.js';

// features/checklist — отметка пунктов чек-листа достопримечательностей.
// toggleSight (§3.2):
// 1. hooks.saveNoteNow.
// 2. Guards: cityId visited, sightId существует.
// 3. Вычисляет nextChecked, nextTier (через pure-функции entities).
// 4. Tier-target branching → addMilestone/removeMilestone.
// 5. ОДИН store.setState(nextState).
// 6. hooks.updateMap.
// 7. Tier-change dispatch:
//    - old===new → patchChecklist (optimistic).
//    - new==="gold" → patchChecklist + collapse/fade DOM-inline + delayed rerender.
//    - else → rerenderCityCard.

export function initChecklist(_store, hooks) {
  var withMuxSlow = hooks.withMuxSlow;

  function toggleSight(cityId, sightId) {
    hooks.saveNoteNow(cityId);

    var state = store.getState();
    var isVisited = !!state.visitedCities[cityId];
    var sightIds = SIGHTS[cityId];
    // Guards (Phase C deviation §17): UI отключает чекбоксы для непосещённых
    // городов и передаёт только валидные sightId — практически недостижимо.
    if (!isVisited || !sightIds || !sightIds.some(function (s) { return s.id === sightId; })) return;

    var oldTier = getCityTierPure(cityId, state, SIGHTS);
    var currentChecked = state.checkedSights[cityId] || [];
    var nextChecked = currentChecked.indexOf(sightId) !== -1
      ? currentChecked.filter(function (id) { return id !== sightId; })
      : currentChecked.concat([sightId]);

    // СВЕРЕНО с app.js:1430-1432: если nextChecked пуст — ключ УДАЛЯЕТСЯ, а не [].
    var nextCheckedSights = Object.assign({}, state.checkedSights);
    if (nextChecked.length === 0) {
      delete nextCheckedSights[cityId];
    } else {
      nextCheckedSights[cityId] = nextChecked;
    }
    var nextState = Object.assign({}, state, { checkedSights: nextCheckedSights });

    var newTier = getCityTierPure(cityId, nextState, SIGHTS);

    // Tier-target branching (1:1 с оригиналом):
    if (newTier === "gold") {
      nextState = addMilestone(nextState, cityId, "silver");
      nextState = addMilestone(nextState, cityId, "gold");
    } else if (newTier === "silver") {
      nextState = addMilestone(nextState, cityId, "silver");
      if (oldTier === "gold") nextState = removeMilestone(nextState, cityId, "gold");
    } else if (newTier === "bronze") {
      nextState = removeMilestone(nextState, cityId, "silver");
      nextState = removeMilestone(nextState, cityId, "gold");
    }

    // plannedCities НЕ трогаем вручную — applyInvariants в createStore.validate
    // применит инварианты #1 (Gold ∉ planned) и #2 (Silver ∈ planned) автоматически.
    store.setState(nextState);

    // hooks.updateMap() удалён (Phase D2 §3): subscribe widgets/map покрывает.

    if (oldTier === newTier) {
      hooks.patchChecklist(cityId, sightId);
    } else if (newTier === "gold") {
      hooks.patchChecklist(cityId, sightId);
      var collapseEl = document.querySelector(".city-card-checklist .checklist-items");
      if (collapseEl) collapseEl.classList.add("checklist-collapsed");
      var fadeEls = document.querySelectorAll(".city-card-checklist .checklist-header, .city-card-checklist .checklist-progress-track");
      for (var fe = 0; fe < fadeEls.length; fe++) {
        fadeEls[fe].style.opacity = "0";
      }
      setTimeout(function () {
        hooks.rerenderCityCard(cityId);
      }, 460);
    } else {
      hooks.rerenderCityCard(cityId);
    }
  }

  return {
    toggleSight: withMuxSlow(toggleSight),
  };
}
