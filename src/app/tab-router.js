import { store } from './store.js';

// app/tab-router — переключение вкладок + регистрация tab-bar click handler.
// Phase D2 §4.2: switchTab НЕ делает tab-specific renders (renderPassport/
// renderProfile/initMapPoints) — они замещены store.subscribe() в widgets.
// Остаются: очистка passport UI при уходе С passport (DOM-side-effects, не
// покрываются subscribe) + function-updater (чистит passportSearchQuery) +
// tab visibility DOM.

export function switchTab(tabId) {
  var prev = store.getState();

  // 1. Очистка passport UI при уходе С passport (v3 поведение 1:1, main.js:411–418).
  if (prev.currentTab === "passport") {
    var searchInput = document.getElementById("passport-search");
    if (searchInput) searchInput.value = "";
    var allFilterBtns = document.querySelectorAll(".passport-filter-btn");
    allFilterBtns.forEach(function (b) {
      b.classList.remove("disabled");
      b.classList.toggle("active", b.dataset.filter === prev.passportFilter);
    });
  }

  // 2. State update — function-updater (чистит passportSearchQuery при уходе С passport).
  store.setState(function (prev) {
    var next = { ...prev, currentTab: tabId };
    if (prev.currentTab === "passport") {
      next.passportSearchQuery = "";
    }
    return next;
  });

  // 3. Tab visibility (DOM).
  document.querySelectorAll(".tab-content").forEach(function (el) {
    el.classList.remove("active");
  });
  var target = document.getElementById("tab-" + tabId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  // 4. Tab-specific renders — ЗАМЕНЕНЫ на store.subscribe() в widgets.
  //    setState (шаг 2) синхронно стреляет подписчикам: passport-list/map/profile.
}

export function initTabBar() {
  var tabBar = document.getElementById("tab-bar");
  if (!tabBar) return;
  tabBar.addEventListener("click", function (e) {
    var btn = e.target.closest(".tab-btn");
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });
}
