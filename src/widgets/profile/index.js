import { store } from '@app/store.js';
import { CITIES, getCityTier as getCityTierPure } from '@entities/city/index.js';
import { REGIONS } from '@entities/region/index.js';
import { SIGHTS } from '@entities/sight/index.js';
import { generateChronicle as generateChroniclePure } from './chronicle.js';
import { escapeHtml } from '@shared/lib/dom.js';
import { formatDateDisplay } from '@shared/lib/format.js';

// widgets/profile — рендер профиля + смена имени.
// Module-level wrappers (1-arg, как в main.js — вызываются из renderProfile).
function getCityTier(cityId) { return getCityTierPure(cityId, store.getState(), SIGHTS); }
function generateChronicle() { return generateChroniclePure(store.getState()); }

// ЭКСПОРТИРУЕТСЯ для XSS-тестов (tests/security/xss.test.js).
// TODO(phase-e): реструктурировать XSS-тесты на public API (init + setState → check DOM).
export function renderProfile() {
  var state = store.getState();
  var container = document.getElementById("tab-profile");
  var visitedIds = Object.keys(state.visitedCities);
  var totalVisited = visitedIds.length;
  var totalCities = CITIES.length;
  var totalPlanned = Object.keys(state.plannedCities).filter(function (k) { return state.plannedCities[k] === true; }).length;

  var html = "";

  html += '<div class="profile-section">';
  html += '  <div id="profile-name-display" class="profile-name-block">';
  html += '    <span class="profile-name-text' + (state.travelerName === "Белорусский путешественник" ? " is-default" : "") + '">' + escapeHtml(state.travelerName) + '</span>';
  html += '    <button class="profile-name-edit-btn" id="profile-edit-btn">';
  html += '      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  html += '    </button>';
  html += '  </div>';
  html += '  <div id="profile-name-edit" class="profile-edit-row" style="display:none">';
  html += '    <input type="text" id="profile-name-input" class="profile-name-input" maxlength="50">';
  html += '    <div class="profile-edit-actions">';
  html += '      <button class="profile-save-btn" id="profile-save-btn">Сохранить</button>';
  html += '      <button class="profile-cancel-btn" id="profile-cancel-btn">Отмена</button>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="profile-divider"></div>';

  html += '<div class="profile-section">';
  html += '  <div class="profile-stat-title">Общая статистика</div>';
  html += '  <div class="profile-stat-total">';
  html += '    <span class="profile-stat-number">' + totalVisited + '</span>';
  html += '    <span class="profile-stat-label">из ' + totalCities + '</span>';
  html += '  </div>';
  var totalPct = totalCities > 0 ? (totalVisited / totalCities * 100) : 0;
  html += '  <div class="progress-bar-track">';
  html += '    <div class="progress-bar-fill" style="width:' + totalPct + '%;background:#27AE60"></div>';
  html += '  </div>';
  html += '  <div class="profile-planned-row">';
  html += '    <span class="profile-planned-label">В планах</span>';
  html += '    <span class="profile-planned-count">' + totalPlanned + '</span>';
  html += '  </div>';
  // Панель орденов
  var goldCount = 0, silverCount = 0, bronzeCount = 0;
  for (var ci = 0; ci < CITIES.length; ci++) {
    var cityTier = getCityTier(CITIES[ci].id);
    if (cityTier === "gold") goldCount++;
    else if (cityTier === "silver") silverCount++;
    else if (cityTier === "bronze") bronzeCount++;
  }
  html += '  <div class="profile-awards">';
  html += '    <div class="award-item">';
  html += '      <span class="award-emoji">🥇</span>';
  html += '      <span class="award-count">' + goldCount + '</span>';
  html += '      <span class="award-label">Золотых</span>';
  html += '    </div>';
  html += '    <div class="award-item">';
  html += '      <span class="award-emoji">🥈</span>';
  html += '      <span class="award-count">' + silverCount + '</span>';
  html += '      <span class="award-label">Серебряных</span>';
  html += '    </div>';
  html += '    <div class="award-item">';
  html += '      <span class="award-emoji">🥉</span>';
  html += '      <span class="award-count">' + bronzeCount + '</span>';
  html += '      <span class="award-label">Бронзовых</span>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  html += '<div class="profile-divider"></div>';

  html += '<div class="profile-section">';
  html += '  <div class="profile-stat-title">Прогресс по регионам</div>';
  REGIONS.forEach(function (region) {
    var citiesInRegion = CITIES.filter(function (c) { return c.region === region.id; });
    var regionTotal = citiesInRegion.length;
    var regionVisited = citiesInRegion.filter(function (c) { return state.visitedCities[c.id]; }).length;
    var regionPct = regionTotal > 0 ? (regionVisited / regionTotal * 100) : 0;
    html += '<div class="region-progress-item">';
    html += '  <div class="region-progress-header">';
    html += '    <span class="region-progress-name">' + region.name + '</span>';
    html += '    <span class="region-progress-count">' + regionVisited + ' из ' + regionTotal + '</span>';
    html += '  </div>';
    html += '  <div class="progress-bar-track">';
    html += '    <div class="progress-bar-fill" style="width:' + regionPct + '%;background:' + region.color + '"></div>';
    html += '  </div>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="profile-divider"></div>';

  html += '<div class="profile-section">';
  html += '  <div class="chronicle-title">Хроника достижений</div>';
  var chronicleEntries = generateChronicle();
  if (chronicleEntries.length === 0) {
    html += '  <p class="chronicle-empty">Вы пока не посетили ни одного города. Отправляйтесь в путь!</p>';
  } else {
    html += '  <ul class="chronicle-list">';
    for (var cei = 0; cei < chronicleEntries.length; cei++) {
      var entry = chronicleEntries[cei];
      var itemClass = entry.type === "milestone" ? "chronicle-item milestone" : "chronicle-item";
      html += '<li class="' + itemClass + '">';
      html += '  <span class="chronicle-city">' + escapeHtml(entry.label) + '</span>';
      html += '  <span class="chronicle-date">' + formatDateDisplay(entry.date) + '</span>';
      html += '</li>';
    }
    html += '  </ul>';
  }
  html += '</div>';

  container.innerHTML = html;

  var editBtn = document.getElementById("profile-edit-btn");
  if (editBtn) editBtn.addEventListener("click", startEditName);

  var saveBtn = document.getElementById("profile-save-btn");
  if (saveBtn) saveBtn.addEventListener("click", saveEditName);

  var cancelBtn = document.getElementById("profile-cancel-btn");
  if (cancelBtn) cancelBtn.addEventListener("click", cancelEditName);

  var nameInput = document.getElementById("profile-name-input");
  if (nameInput) {
    nameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") saveEditName();
      if (e.key === "Escape") cancelEditName();
    });
  }
}

function startEditName() {
  var displayEl = document.getElementById("profile-name-display");
  var editEl = document.getElementById("profile-name-edit");
  var input = document.getElementById("profile-name-input");
  if (!displayEl || !editEl || !input) return;
  input.value = store.getState().travelerName;
  displayEl.style.display = "none";
  editEl.style.display = "flex";
  input.focus();
  input.select();
}

function saveEditName() {
  var input = document.getElementById("profile-name-input");
  if (!input) return;
  var name = input.value.trim();
  store.setState({ travelerName: name || "Белорусский путешественник" });
  // Прямой renderProfile() удалён — subscribe покрывает (setState стреляет подписчикам,
  // гейт currentTab==='profile' активен). См. §3.3 таблицу saveEditName.
}

function cancelEditName() {
  // ⚠️ ОБЯЗАТЕЛЕН прямой вызов: cancelEditName НЕ делает setState → subscribe не
  // срабатывает → без renderProfile() пользователь застрянет в edit-режиме.
  renderProfile();
}

export function initProfile(store) {
  // subscribe: re-render ТОЛЬКО при currentTab==='profile' (гейт; условие как
  // main.js:453–454, но НЕ 1:1 по частоте — см. ниже). Стреляет на каждый setState
  // пока profile активна: замещает switchTab:453–454 и удалённый прямой renderProfile()
  // в saveEditName (таблица выше). cancelEditName — без setState, прямой вызов ОСТАЁТСЯ.
  store.subscribe(function (state) {
    if (state.currentTab === 'profile') {
      renderProfile();
    }
  });

  return {};
}
