import { store } from '@app/store.js';
import { CITIES } from '@entities/city/index.js';

// widgets/passport-list — рендер паспорта (фильтр/поиск) + клики по списку.
// Phase D2 §3.1: renderPassport/handlePassportClick переезжают из main.js.
// searchApi (getResultsHtml/getAccordionsHtml) и openCityCard — deps (widgets→widgets
// запрещено, поэтому через init(store, deps)). Прямые вызовы renderPassport() из
// filter/search handlers удалены — subscribe покрывает (§4.4). DOM classList-манипуляции
// остаются (не покрываются subscribe).

var currentPassportMode = "filter";

// Module-level storage для feature/widget APIs (сетится в initPassportList).
// Паттерн 1:1 с main.js:42 (let visitApi...). renderPassport/handlePassportClick
// — module-level, читают эти ссылки через замыкание.
let _searchApi, _openCityCard;

function renderPassport() {
  var container = document.getElementById("passport-list");
  if (!container) return;
  var state = store.getState();
  var totalVisited = Object.keys(state.visitedCities).length;

  var countEl = document.getElementById("passport-count");
  if (countEl) countEl.textContent = totalVisited + " из " + CITIES.length;

  var newMode = state.passportSearchQuery !== "" ? "search" : "filter";

  function buildHtml() {
    if (newMode === "search") {
      return _searchApi.getResultsHtml(store.getState());
    }
    return _searchApi.getAccordionsHtml(store.getState());
  }

  if (newMode !== currentPassportMode) {
    container.style.opacity = "0";
    setTimeout(function () {
      container.innerHTML = buildHtml();
      container.style.opacity = "1";
    }, 150);
    currentPassportMode = newMode;
  } else {
    container.innerHTML = buildHtml();
  }
}

function handlePassportClick(e) {
  var searchResult = e.target.closest(".passport-search-result");
  if (searchResult) {
    var srCityId = searchResult.dataset.cityId;
    if (srCityId) _openCityCard(srCityId);
    return;
  }

  var header = e.target.closest(".accordion-header");
  if (header) {
    var item = header.closest(".accordion-item");
    if (!item) return;
    var regionId = item.dataset.regionId;
    if (!regionId) return;

    var opened = store.getState().openedRegions;
    var idx = opened.indexOf(regionId);
    store.setState(function (prev) {
      var pidx = prev.openedRegions.indexOf(regionId);
      if (pidx !== -1) {
        return { ...prev, openedRegions: prev.openedRegions.slice(0, pidx).concat(prev.openedRegions.slice(pidx + 1)) };
      }
      return { ...prev, openedRegions: prev.openedRegions.concat([regionId]) };
    });
    // Прямой item.classList.toggle("open") удалён (Phase D2): setState синхронно
    // стреляет subscribe → renderPassport() перестраивает #passport-list, и `item`
    // к этому моменту уже detached. Состояние аккордеона задаётся rebuild'ом из
    // state.openedRegions (через searchApi.getAccordionsHtml).
    return;
  }

  var cell = e.target.closest(".stamp-cell");
  if (cell) {
    var cityId = cell.dataset.cityId;
    if (cityId) {
      _openCityCard(cityId);
    }
  }
}

export function initPassportList(store, deps) {
  _searchApi = deps.searchApi;
  _openCityCard = deps.openCityCard;

  // subscribe: рендер ТОЛЬКО когда passport активна (гейт currentTab==='passport').
  // ⚠️ НЕ 1:1 с main.js:441: оригинал рендерил только при switchTab на passport,
  // subscribe же стреляет на КАЖДЫЙ setState пока passport активна (store-mechanism.js:63).
  // Замещает switchTab:441 + удалённые прямые вызовы closeCityCard:831 / filter / search.
  // Безусловный (без гейта) subscribe = рендер 57 городов на каждое setState — недопустимо.
  store.subscribe(function (state) {
    if (state.currentTab === 'passport') renderPassport();
  });

  var passportList = document.getElementById("passport-list");
  if (passportList) passportList.addEventListener("click", handlePassportClick);

  var passportControls = document.querySelector(".passport-controls");
  if (passportControls) {
    passportControls.addEventListener("click", function (e) {
      var btn = e.target.closest(".passport-filter-btn");
      if (!btn) return;
      if (btn.classList.contains("disabled")) return;
      var filter = btn.dataset.filter;
      store.setState({ passportFilter: filter });
      document.querySelectorAll(".passport-filter-btn").forEach(function (b) {
        b.classList.toggle("active", b.dataset.filter === filter);
      });
    });
  }

  var passportSearchInput = document.getElementById("passport-search");
  var searchDebounceTimer = null;
  if (passportSearchInput) {
    passportSearchInput.addEventListener("input", function () {
      var value = passportSearchInput.value;
      if (value === "") {
        clearTimeout(searchDebounceTimer);
        store.setState({ passportSearchQuery: "" });
        document.querySelectorAll(".passport-filter-btn").forEach(function (b) {
          b.classList.remove("disabled");
          b.classList.toggle("active", b.dataset.filter === store.getState().passportFilter);
        });
        return;
      }
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        store.setState({ passportSearchQuery: value.trim() });
        if (store.getState().passportSearchQuery !== "") {
          document.querySelectorAll(".passport-filter-btn").forEach(function (b) {
            b.classList.remove("active");
            b.classList.add("disabled");
          });
        }
      }, 250);
    });
  }

  var passportSearchForm = document.querySelector(".passport-search-form");
  if (passportSearchForm) {
    passportSearchForm.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  return {};
}
