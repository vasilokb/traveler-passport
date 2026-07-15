import { store, omitKey } from '@app/store.js';
import {
  CITIES,
  getCityById,
  getCityTier as getCityTierPure,
  getSightsCount as getSightsCountPure,
  hasChecklist as hasChecklistPure,
  getCheckedCount as getCheckedCountPure,
  getTierLabel,
  getTierEmoji,
} from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';
import { REGIONS, createStampSVG } from '@entities/region/index.js';
import { escapeHtml } from '@shared/lib/dom.js';
import { formatDateDisplay, getPluralSights } from '@shared/lib/format.js';
import { renderDatePicker, closeDatePicker } from '@features/visit/date-picker.js';

// widgets/city-card — карточка города (overlay) + чек-лист + заметки.
// Phase D2 §3.4/§4.4/§4.5: city-card НЕ subscribe (re-render через imperative hooks,
// см. §4.4 — иначе двойной рендер + потерера scroll). Imperative API — named exports.
// openCityCard БЕЗ isProcessing/try/finally — mux накладывает main.js через withMux.
// closeCityCard: прямой renderPassport() (main.js:831–833) удалён — subscribe
// passport-list покрывает. saveNoteNow: bugfix D-2 — clearTimeout(noteDebounceTimer).

var noteDebounceTimer = null;

// Module-level wrappers (1:1 с main.js:34-37).
function getCityTier(cityId) { return getCityTierPure(cityId, store.getState(), SIGHTS); }
function getSightsCount(cityId) { return getSightsCountPure(cityId, SIGHTS); }
function hasChecklist(cityId) { return hasChecklistPure(cityId, SIGHTS); }
function getCheckedCount(cityId) { return getCheckedCountPure(cityId, store.getState()); }

// Module-level storage для feature APIs (сетится в initCityCardWidget).
// Паттерн 1:1 с main.js:42 (let visitApi...). renderCityCard — named export без
// параметров, читает эти ссылки через замыкание.
let _visitApi, _planApi, _checklistApi;

export function patchChecklistInPlace(cityId, sightId) {
  var city = getCityById(cityId);
  if (!city) return;
  var region = null;
  for (var pi = 0; pi < REGIONS.length; pi++) {
    if (REGIONS[pi].id === city.region) { region = REGIONS[pi]; break; }
  }
  var regionColor = region ? region.color : "#ccc";

  var state = store.getState();
  var checked = state.checkedSights[cityId] || [];
  var checkedCount = checked.length;
  var totalCount = getSightsCount(cityId);
  var isChecked = checked.indexOf(sightId) !== -1;
  var tier = getCityTier(cityId);

  var svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  var item = document.querySelector('.checklist-item[data-sight-id="' + sightId + '"]');
  if (item) {
    var checkbox = item.querySelector(".checklist-checkbox");
    var nameEl = item.querySelector(".checklist-item-name");
    if (isChecked) {
      if (checkbox) {
        checkbox.classList.add("checked");
        checkbox.style.setProperty("--region-color", regionColor);
        checkbox.innerHTML = svgCheck;
      }
      if (nameEl) nameEl.classList.add("checked");
    } else {
      if (checkbox) {
        checkbox.classList.remove("checked");
        checkbox.style.removeProperty("--region-color");
        checkbox.innerHTML = "";
      }
      if (nameEl) nameEl.classList.remove("checked");
    }
  }

  var fillEl = document.querySelector(".checklist-progress-fill");
  if (fillEl && totalCount > 0) {
    var pct = Math.round((checkedCount / totalCount) * 100);
    fillEl.style.width = pct + "%";
  }

  var countEl = document.querySelector(".checklist-count");
  if (countEl) {
    countEl.textContent = "Осмотрено " + checkedCount + " из " + totalCount;
  }

  var badge = document.querySelector(".city-card-tier-badge");
  if (badge && tier) {
    badge.className = "city-card-tier-badge tier-" + tier;
    badge.textContent = getTierEmoji(tier) + " " + getTierLabel(tier) + " (" + checkedCount + "/" + totalCount + ")";
  }
}

export function rerenderCityCardPreservingScroll(cityId) {
  var cardEl = document.querySelector("#city-card-content .city-card");
  var scrollTop = cardEl ? cardEl.scrollTop : 0;
  renderCityCard(cityId);
  var newCardEl = document.querySelector("#city-card-content .city-card");
  if (newCardEl) newCardEl.scrollTop = scrollTop;
}

export function saveNote(cityId, text) {
  var trimmed = text.trim();
  store.setState(function (prev) {
    var next = { ...prev };
    if (trimmed) {
      next.cityNotes = { ...prev.cityNotes, [cityId]: trimmed };
    } else {
      next.cityNotes = omitKey(prev.cityNotes, cityId);
    }
    return next;
  });
}

export function openCityCard(cityId) {
  // ⚠️ БЕЗ isProcessing/try/finally — mux накладывает main.js через withMux (§4.1).
  clearTimeout(noteDebounceTimer);
  noteDebounceTimer = null;

  var city = CITIES.find(function (c) { return c.id === cityId; });
  if (!city) return;

  var originMap = { passport: "passport", map: "map" };
  var currentTab = store.getState().currentTab;
  var origin = originMap[currentTab] || currentTab;
  store.setState({ stampOrigin: origin, activeOverlayCityId: cityId });

  renderCityCard(cityId);

  document.getElementById("city-card-overlay").style.display = "flex";
  document.getElementById("tab-bar").classList.add("tab-bar-blocked");
}

export function closeCityCard() {
  clearTimeout(noteDebounceTimer);
  var cityId = store.getState().activeOverlayCityId;
  if (cityId) {
    var textarea = document.getElementById("city-card-note");
    if (textarea) saveNote(cityId, textarea.value);
  }

  store.setState({ activeOverlayCityId: null, stampOrigin: null });

  document.getElementById("city-card-overlay").style.display = "none";
  document.getElementById("tab-bar").classList.remove("tab-bar-blocked");

  // Прямой renderPassport() (main.js:831–833) удалён — widgets→widgets запрещено;
  // subscribe passport-list покрывает (срабатывает при setState({activeOverlayCityId:null})
  // ЕСЛИ currentTab==='passport'). ⚠️ closeCityCard делает ДВА setState (saveNote + activeOverlayCityId)
  // → passport-list subscribe сработает дважды — принятый долг (§4.4, §12).
}

// bugfix D-2 (§17): clearTimeout(noteDebounceTimer) — потерян в D1, восстановлен в D2.
export function saveNoteNow(cityId) {
  clearTimeout(noteDebounceTimer);
  noteDebounceTimer = null;
  var noteEl = document.getElementById("city-card-note");
  if (noteEl) saveNote(cityId, noteEl.value);
}

// ЭКСПОРТИРУЕТСЯ для XSS-тестов (tests/security/xss.test.js).
// TODO(phase-e): реструктурировать XSS-тесты на public API.
export function renderCityCard(cityId) {
  var city = getCityById(cityId);
  if (!city) return;

  var state = store.getState();

  var region = null;
  for (var ri = 0; ri < REGIONS.length; ri++) {
    if (REGIONS[ri].id === city.region) { region = REGIONS[ri]; break; }
  }
  var regionName = region ? region.name : "";
  var regionColor = region ? region.color : "#ccc";

  var isVisited = !!state.visitedCities[cityId];
  var tier = getCityTier(cityId);
  var hasSights = hasChecklist(cityId);

  var svgBookmarkFilled = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>';
  var svgBookmarkOutlined = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>';
  var svgMedal = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>';
  var svgMedalFilled = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" fill="none"/></svg>';
  var svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  var html = "";
  html += '<div class="city-card">';

  // 1. Обложка
  html += '<div class="city-card-cover-wrapper">';
  html += '  <div class="city-card-cover-placeholder' + (isVisited ? '' : ' unvisited') + '"></div>';
  if (hasSights) {
    html += '  <img class="city-card-cover" src="covers/' + cityId + '.webp" onerror="this.style.display=\'none\'" alt="">';
  }
  html += '</div>';

  // 2. Заголовок + бейдж ранга
  html += '  <div class="city-card-header">';
  html += '    <div class="city-card-title-block">';
  html += '      <h2 class="city-card-name">' + escapeHtml(city.name) + '</h2>';
  html += '      <p class="city-card-region">' + escapeHtml(regionName) + '</p>';
  if (isVisited && tier) {
    html += '      <span class="city-card-tier-badge tier-' + tier + '">' + getTierEmoji(tier) + ' ' + getTierLabel(tier);
    if (hasSights) {
      html += ' (' + getCheckedCount(cityId) + '/' + getSightsCount(cityId) + ')';
    }
    html += '</span>';
  }
  html += '    </div>';
  html += '    <div class="city-card-actions">';
  var showExploreBtn = !isVisited || (hasSights && tier === "bronze");
  if (isVisited && hasSights && tier === "silver") {
    html += '      <span class="city-card-explore-status">Город исследуется</span>';
  } else if (showExploreBtn) {
    if (state.plannedCities[cityId]) {
      html += '      <button class="city-card-btn-icon active" id="city-card-explore-btn" style="--region-color:' + regionColor + '">' + (isVisited ? svgMedalFilled : svgBookmarkFilled) + '</button>';
    } else {
      html += '      <button class="city-card-btn-icon" id="city-card-explore-btn">' + (isVisited ? svgMedal : svgBookmarkOutlined) + '</button>';
    }
  }
  html += '      <button class="city-card-btn-close" id="city-card-close-btn">&times;</button>';
  html += '    </div>';
  html += '  </div>';

  // 3. Штамп (v2 как есть, + CSS-класс ранга для Этапа 4)
  var stampTierClass = tier ? ' stamp-tier-' + tier : '';
  html += '  <div class="city-card-stamp' + (isVisited ? ' visited' : '') + stampTierClass + '" style="' + (isVisited ? '--region-color:' + regionColor + ';color:' + regionColor : 'color:#ccc') + '">';
  html += createStampSVG(city.region, tier);
  html += '  </div>';

  // 4. Описание
  html += '  <p class="city-card-description">' + escapeHtml(city.description) + '</p>';

  // 5. Блок «Что посмотреть» (чек-лист / манифест)
  html += renderChecklist(cityId, hasSights, isVisited, tier, regionColor, svgCheck);

  // 6. Textarea заметок (v2 без изменений)
  var noteValue = state.cityNotes[cityId] || "";
  var notePlaceholder = isVisited ? "Впечатления, заметки на память..." : "Что посмотреть, куда зайти...";
  html += '  <textarea id="city-card-note" class="city-card-note" maxlength="500" placeholder="' + notePlaceholder + '">' + escapeHtml(noteValue) + '</textarea>';

  // 7. Кнопка визита / удаления (v2 без изменений)
  if (isVisited) {
    var visit = state.visitedCities[cityId];
    html += '  <p class="city-card-date">Дата визита: <span>' + formatDateDisplay(visit.date) + '</span></p>';
    html += '  <button class="city-card-btn city-card-btn-danger" id="city-card-remove-btn">Удалить отметку</button>';
  } else {
    html += '  <button class="city-card-btn city-card-btn-primary" id="city-card-visit-btn">Я здесь был</button>';
  }

  html += '</div>';

  document.getElementById("city-card-content").innerHTML = html;

  // --- Привязка обработчиков ---

  var closeBtn = document.getElementById("city-card-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeCityCard);

  if (isVisited) {
    var removeBtn = document.getElementById("city-card-remove-btn");
    if (removeBtn) removeBtn.addEventListener("click", function () { _visitApi.removeVisit(cityId); });
  } else {
    var visitBtn = document.getElementById("city-card-visit-btn");
    if (visitBtn) visitBtn.addEventListener("click", function () { renderDatePicker(cityId, _visitApi.confirmVisit); });
  }

  // Кнопка вишлиста / «Доисследовать» (общая для обоих случаев)
  var exploreBtn = document.getElementById("city-card-explore-btn");
  if (exploreBtn) exploreBtn.addEventListener("click", function () { _planApi.togglePlanned(cityId); });

  // Чек-лист: интерактивные пункты (IIFE для изоляции в ES5)
  if (hasSights && isVisited) {
    var items = document.querySelectorAll("#city-card-content .checklist-item");
    for (var ev_si = 0; ev_si < items.length; ev_si++) {
      (function (item) {
        item.addEventListener("click", function () {
          _checklistApi.toggleSight(cityId, item.getAttribute("data-sight-id"));
        });
      })(items[ev_si]);
    }
  }

  // Аккордеон Золота
  var goldToggle = document.getElementById("checklist-gold-toggle");
  if (goldToggle) {
    goldToggle.addEventListener("click", function () {
      var body = document.getElementById("checklist-gold-body");
      if (body) body.classList.toggle("checklist-collapsed");
      goldToggle.classList.toggle("expanded");
      var arrow = goldToggle.querySelector(".checklist-gold-arrow");
      if (arrow) {
        arrow.textContent = goldToggle.classList.contains("expanded") ? "Свернуть" : "Развернуть";
      }
    });
  }

  // Textarea заметок (v2 без изменений)
  var noteEl = document.getElementById("city-card-note");
  if (noteEl) {
    noteEl.addEventListener("input", function () {
      clearTimeout(noteDebounceTimer);
      noteDebounceTimer = setTimeout(function () {
        saveNote(cityId, noteEl.value);
      }, 300);
    });

    var isStandalone = window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      var card = noteEl.closest(".city-card");
      noteEl.addEventListener("focus", function () {
        if (card) card.style.paddingBottom = "200px";
        setTimeout(function () { noteEl.scrollIntoView({ block: "center" }); }, 300);
      });
      noteEl.addEventListener("blur", function () {
        if (card) card.style.paddingBottom = "";
      });
    }
  }
}

function renderChecklist(cityId, hasSights, isVisited, tier, regionColor, svgCheck) {
  if (!hasSights) {
    return '<div class="checklist-manifest">Этот город ждёт своих исследователей. Возможно, именно вы откроете его скрытые жемчужины!</div>';
  }

  var sights = SIGHTS[cityId];
  var state = store.getState();
  var checked = state.checkedSights[cityId] || [];
  var checkedCount = checked.length;
  var totalCount = sights.length;
  var interactive = isVisited;
  var isGold = tier === "gold";

  var html = "";
  html += '<div class="city-card-checklist">';

  if (!isGold) {
    html += '  <div class="checklist-header">';
    html += '    <span class="checklist-title">Что посмотреть</span>';
    if (isVisited) {
      html += '  <span class="checklist-count">Осмотрено ' + checkedCount + ' из ' + totalCount + '</span>';
    } else {
      html += '  <span class="checklist-count">' + totalCount + ' ' + getPluralSights(totalCount) + '</span>';
    }
    html += '  </div>';
    if (isVisited) {
      var pct = Math.round((checkedCount / totalCount) * 100);
      html += '  <div class="checklist-progress-track"><div class="checklist-progress-fill" style="width:' + pct + '%;background:' + regionColor + '"></div></div>';
    }
  }

  if (isGold) {
    html += '  <div class="checklist-gold-header" id="checklist-gold-toggle" style="border-left:4px solid ' + regionColor + '">';
    html += '    <span class="checklist-gold-badge">🥇 Золото (' + checkedCount + '/' + totalCount + ')</span>';
    html += '    <span class="checklist-gold-arrow">Развернуть</span>';
    html += '  </div>';
    html += '  <div class="checklist-items checklist-collapsed" id="checklist-gold-body"><div class="checklist-items-inner">';
  } else {
    html += '  <div class="checklist-items"><div class="checklist-items-inner">';
  }

  for (var si = 0; si < sights.length; si++) {
    var sight = sights[si];
    var isChecked = checked.indexOf(sight.id) !== -1;
    var disabled = !interactive ? " disabled" : "";
    var checkedClass = isChecked ? " checked" : "";

    html += '  <div class="checklist-item' + disabled + '" data-sight-id="' + sight.id + '">';
    html += '    <div class="checklist-checkbox' + checkedClass + '" style="' + (isChecked ? '--region-color:' + regionColor : '') + '">';
    if (isChecked) html += svgCheck;
    html += '    </div>';
    html += '    <span class="checklist-item-name' + checkedClass + '">' + escapeHtml(sight.name) + '</span>';
    html += '  </div>';
  }

  html += '  </div></div>';
  html += '</div>';
  return html;
}

export function initCityCardWidget(store, deps) {
  _visitApi = deps.visitApi;
  _planApi = deps.planApi;
  _checklistApi = deps.checklistApi;

  // ⚠️ НЕ subscribe — см. §4.4 (city-card imperative re-render only).

  document.getElementById("city-card-overlay").addEventListener("click", function (e) {
    if (e.target === e.currentTarget) closeCityCard();
  });

  document.getElementById("date-picker-modal").addEventListener("click", function (e) {
    if (e.target === e.currentTarget) closeDatePicker();
  });

  document.addEventListener("visibilitychange", function () {
    var activeOverlayCityId = store.getState().activeOverlayCityId;
    if (document.hidden && activeOverlayCityId) {
      clearTimeout(noteDebounceTimer);
      var textarea = document.getElementById("city-card-note");
      if (textarea) saveNote(activeOverlayCityId, textarea.value);
    }
  });

  window.addEventListener("pagehide", function () {
    var activeOverlayCityId = store.getState().activeOverlayCityId;
    if (activeOverlayCityId) {
      var textarea = document.getElementById("city-card-note");
      if (textarea) saveNote(activeOverlayCityId, textarea.value);
    }
  });

  return { open: openCityCard, close: closeCityCard, rerender: rerenderCityCardPreservingScroll, patchChecklist: patchChecklistInPlace, saveNoteNow: saveNoteNow };
}
