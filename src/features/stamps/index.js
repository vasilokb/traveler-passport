import { store } from '@app/store.js';
import { CITIES } from '@entities/city/index.js';
import { showToast } from '@shared/lib/dom.js';
import { closeStampOverlay } from './overlay.js';

// features/stamps — навигация в коллекцию штампов + шаринг.
// goToCollection использует function-updater (НЕ patch-объект) — openedRegions
// опасное поле-массив, разделяемое shallow-merge в createStore.setState.

export function initStamps(_store, hooks) {
  function goToCollection(cityId) {
    closeStampOverlay();
    hooks.closeCityCard();

    var city = CITIES.find(function (c) {
      return c.id === cityId;
    });
    var regionId = city ? city.region : null;

    store.setState(function (prev) {
      var next = { ...prev, currentTab: "passport" };
      if (regionId && prev.openedRegions.indexOf(regionId) === -1) {
        next.openedRegions = prev.openedRegions.concat([regionId]);
      }
      return next;
    });

    hooks.switchTab("passport");

    if (regionId && cityId) {
      setTimeout(function () {
        var cell = document.querySelector(
          '.stamp-cell[data-city-id="' + cityId + '"]'
        );
        if (cell) {
          cell.scrollIntoView({ behavior: "smooth", block: "center" });
          cell.classList.add("stamp-highlight");
          setTimeout(function () {
            cell.classList.remove("stamp-highlight");
          }, 2000);
        }
      }, 300);
    }
  }

  function showShareText(cityName) {
    var text =
      "Я посетил " +
      cityName +
      " и получил штамп в Паспорте путешественника по Беларуси! 🇧🇾";

    if (navigator.share) {
      navigator.share({ title: "Паспорт путешественника", text: text }).catch(
        function () {}
      );
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast("Текст скопирован");
      }).catch(function () {});
    }
  }

  return {
    goToCollection: goToCollection,
    showShareText: showShareText,
  };
}
