import { SIGHTS } from '@entities/sight/index.js';
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
import {
  REGIONS,
  REGION_ICONS,
  createStampSVG,
  computeStarPoints,
} from '@entities/region/index.js';
import { MAP, projectToSVG } from '@shared/config/map-config.js';
import {
  formatDateDisplay,
  getPluralSights,
} from '@shared/lib/format.js';
import { escapeHtml, showToast } from '@shared/lib/dom.js';
import { generateChronicle as generateChroniclePure } from '@lib/chronicle.js';
import { initVisit } from '@features/visit/index.js';
import { initChecklist } from '@features/checklist/index.js';
import { initStamps } from '@features/stamps/index.js';
import { initPlan } from '@features/plan/index.js';
import { initSearch } from '@features/search/index.js';
import { renderStampOverlay, closeStampOverlay } from '@features/stamps/overlay.js';
import { renderDatePicker, closeDatePicker } from '@features/visit/date-picker.js';
import { store, omitKey } from './store.js';

function getCityTier(cityId) { return getCityTierPure(cityId, store.getState(), SIGHTS); }
function getSightsCount(cityId) { return getSightsCountPure(cityId, SIGHTS); }
function hasChecklist(cityId) { return hasChecklistPure(cityId, SIGHTS); }
function getCheckedCount(cityId) { return getCheckedCountPure(cityId, store.getState()); }
function generateChronicle() { return generateChroniclePure(store.getState()); }

// Feature API (module-level): init() присваивает их; render-функции
// (renderCityCard, renderPassport), вызываемые ПОСЛЕ init(), ссылаются на них.
let visitApi, checklistApi, planApi, stampsApi, searchApi;

// Мьютекс isProcessing централизован через обёртки withMux/withMuxSlow (§4.2):
// features получают их через hooks и оборачивают свои public-методы.
function withMux(fn) {
  return function (...args) {
    if (isProcessing) return;
    isProcessing = true;
    try { return fn.apply(this, args); }
    finally { setTimeout(function () { isProcessing = false; }, 400); }
  };
}
function withMuxSlow(fn) {
  return function (...args) {
    if (isProcessing) return;
    isProcessing = true;
    try { return fn.apply(this, args); }
    finally { setTimeout(function () { isProcessing = false; }, 560); }
  };
}








var mapPointsInitialized = false;

function initMapPoints() {
  if (mapPointsInitialized) return;
  var pointsLayer = document.getElementById("map-points-layer");
  if (!pointsLayer) return;

  pointsLayer.innerHTML = "";
  var fragment = document.createDocumentFragment();
  var svgNS = "http://www.w3.org/2000/svg";

  CITIES.forEach(function (city) {
    var pos = projectToSVG(city.lat, city.lon);
    var region = null;
    for (var ri = 0; ri < REGIONS.length; ri++) {
      if (REGIONS[ri].id === city.region) { region = REGIONS[ri]; break; }
    }

    var g = document.createElementNS(svgNS, "g");
    g.setAttribute("class", "map-point");
    g.setAttribute("data-city-id", city.id);

    // 1. Hitbox
    var hitbox = document.createElementNS(svgNS, "circle");
    hitbox.setAttribute("cx", pos.x);
    hitbox.setAttribute("cy", pos.y);
    hitbox.setAttribute("r", "22");
    hitbox.setAttribute("fill", "transparent");
    hitbox.setAttribute("class", "hitbox");
    g.appendChild(hitbox);

    // 2. Dot
    var dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", pos.x);
    dot.setAttribute("cy", pos.y);
    dot.setAttribute("r", "7");
    dot.setAttribute("fill", "#ccc");
    dot.setAttribute("class", "dot");
    g.appendChild(dot);

    // 3. Tier ring
    var tierRing = document.createElementNS(svgNS, "circle");
    tierRing.setAttribute("cx", pos.x);
    tierRing.setAttribute("cy", pos.y);
    tierRing.setAttribute("r", "10");
    tierRing.setAttribute("fill", "none");
    tierRing.setAttribute("stroke", "none");
    tierRing.setAttribute("stroke-width", "2.5");
    tierRing.setAttribute("vector-effect", "non-scaling-stroke");
    tierRing.setAttribute("class", "tier-ring");
    g.appendChild(tierRing);

    // 4. Tier progress number
    var tierNum = document.createElementNS(svgNS, "text");
    tierNum.setAttribute("x", pos.x);
    tierNum.setAttribute("y", pos.y + 22);
    tierNum.setAttribute("dy", "0.35em");
    tierNum.setAttribute("text-anchor", "middle");
    tierNum.setAttribute("font-size", "16");
    tierNum.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, sans-serif");
    tierNum.setAttribute("fill", "#333");
    tierNum.setAttribute("stroke", "#fff");
    tierNum.setAttribute("stroke-width", "3");
    tierNum.setAttribute("paint-order", "stroke fill");
    tierNum.setAttribute("class", "tier-num");
    tierNum.textContent = "";
    g.appendChild(tierNum);

    // 5. Gold star
    var goldStar = document.createElementNS(svgNS, "polygon");
    goldStar.setAttribute("points", computeStarPoints(pos.x, pos.y, 10));
    goldStar.setAttribute("fill", "#FFD700");
    goldStar.setAttribute("class", "gold-star");
    g.appendChild(goldStar);

    // 6. Label
    var label = document.createElementNS(svgNS, "text");
    label.setAttribute("class", "map-label");
    label.setAttribute("x", pos.x + 14);
    label.setAttribute("y", pos.y);
    label.setAttribute("dy", "0.35em");
    label.setAttribute("visibility", "hidden");
    label.setAttribute("font-size", "26");
    label.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, sans-serif");
    label.setAttribute("fill", "#333");
    label.setAttribute("stroke", "#fff");
    label.setAttribute("stroke-width", "3");
    label.setAttribute("paint-order", "stroke fill");
    label.textContent = city.name;
    g.appendChild(label);

    fragment.appendChild(g);
  });

  pointsLayer.appendChild(fragment);
  mapPointsInitialized = true;
  updateMapLabels();
  updateMapMarkers();
}

function updateMapMarkers() {
  var pointsLayer = document.getElementById("map-points-layer");
  if (!pointsLayer) return;
  var state = store.getState();
  var points = pointsLayer.querySelectorAll(".map-point");

  points.forEach(function (point) {
    var cityId = point.getAttribute("data-city-id");
    var city = getCityById(cityId);
    if (!city) return;
    var region = null;
    for (var ri = 0; ri < REGIONS.length; ri++) {
      if (REGIONS[ri].id === city.region) { region = REGIONS[ri]; break; }
    }
    var regionColor = region ? region.color : "#ccc";
    var isCapital = city.region === "minsk";
    var accentColor = isCapital ? "#2980B9" : null;

    var tier = getCityTier(cityId);
    var isPlanned = !!state.plannedCities[cityId];

    var dot = point.querySelector(".dot");
    var tierRing = point.querySelector(".tier-ring");
    var tierNum = point.querySelector(".tier-num");
    var goldStar = point.querySelector(".gold-star");

    // Reset
    if (dot) dot.classList.remove("dot--hidden");
    if (tierRing) {
      tierRing.classList.remove("marker-visible");
      tierRing.setAttribute("stroke", "none");
    }
    if (tierNum) {
      tierNum.classList.remove("marker-visible");
      tierNum.textContent = "";
      tierNum.setAttribute("fill", "#333");
    }
    if (goldStar) goldStar.classList.remove("marker-visible");

    var checkedCount = getCheckedCount(cityId);
    var totalCount = getSightsCount(cityId);

    if (tier === null) {
      if (dot) dot.setAttribute("fill", "#ccc");
      if (isPlanned && tierRing) {
        tierRing.classList.add("marker-visible");
        tierRing.setAttribute("stroke", "#333");
      }

    } else if (tier === "bronze") {
      if (dot) dot.setAttribute("fill", accentColor || regionColor);
      if (isPlanned && tierRing) {
        tierRing.classList.add("marker-visible");
        tierRing.setAttribute("stroke", accentColor || "#CD7F32");
      }

    } else if (tier === "silver") {
      if (dot) dot.setAttribute("fill", accentColor || regionColor);
      if (tierRing) {
        tierRing.classList.add("marker-visible");
        tierRing.setAttribute("stroke", accentColor || "#C0C0C0");
      }
      if (tierNum) {
        tierNum.setAttribute("fill", accentColor || "#333");
        tierNum.textContent = checkedCount + "/" + totalCount;
        tierNum.classList.add("marker-visible");
      }

    } else if (tier === "gold") {
      if (dot) dot.classList.add("dot--hidden");
      if (goldStar) goldStar.classList.add("marker-visible");
    }
  });
}

function updateMapFilter() {
  var pointsLayer = document.getElementById("map-points-layer");
  if (!pointsLayer) return;
  var state = store.getState();
  var points = pointsLayer.querySelectorAll(".map-point");
  var filter = state.mapFilter || "all";
  var visibleCount = 0;

  points.forEach(function (point) {
    var cityId = point.getAttribute("data-city-id");
    var city = CITIES.find(function (c) { return c.id === cityId; });
    var visible = false;
    if (filter === "all") {
      visible = true;
    } else if (filter === "visited") {
      visible = !!state.visitedCities[cityId];
    } else if (filter === "planned") {
      visible = !!state.plannedCities[cityId];
    }
    if (visible) {
      point.classList.remove("map-point-hidden");
      visibleCount++;
    } else {
      point.classList.add("map-point-hidden");
    }
  });

  var overlay = document.getElementById("map-empty-overlay");
  var overlayText = document.getElementById("map-empty-overlay-text");
  if (overlay && overlayText) {
    if (visibleCount === 0) {
      overlay.style.display = "flex";
      if (filter === "visited") {
        overlayText.textContent = "Вы пока не отметили ни одного города. Откройте карточку города и нажмите \"Я здесь был\"";
      } else if (filter === "planned") {
        overlayText.textContent = "Нет городов в планах. Нажмите на иконку закладки или медали в карточке города, чтобы добавить его сюда.";
      }
    } else {
      overlay.style.display = "none";
    }
  }
}

var MAP_ORIG_VB = { x: MAP.viewBoxX, y: MAP.viewBoxY, w: MAP.viewBoxW, h: MAP.viewBoxH };
var mapViewBox = { x: MAP.viewBoxX, y: MAP.viewBoxY, w: MAP.viewBoxW, h: MAP.viewBoxH };
var suppressMapClick = false;

function updateMapViewBox() {
  var svg = document.getElementById("belarus-map");
  if (svg) {
    svg.setAttribute("viewBox", mapViewBox.x + " " + mapViewBox.y + " " + mapViewBox.w + " " + mapViewBox.h);
    svg.style.cursor = mapViewBox.w < MAP_ORIG_VB.w * 0.99 ? "grab" : "default";
  }
  updateMapLabels();
}

function zoomAtPoint(cx, cy, factor) {
  var newW = mapViewBox.w * factor;
  var newH = mapViewBox.h * factor;
  if (newW >= MAP_ORIG_VB.w) { resetMapZoom(); return; }
  var minW = MAP_ORIG_VB.w / 5;
  if (newW < minW) { newW = minW; newH = newW * (MAP_ORIG_VB.h / MAP_ORIG_VB.w); }
  var rx = (cx - mapViewBox.x) / mapViewBox.w;
  var ry = (cy - mapViewBox.y) / mapViewBox.h;
  mapViewBox.x = cx - rx * newW;
  mapViewBox.y = cy - ry * newH;
  mapViewBox.w = newW;
  mapViewBox.h = newH;
  updateMapViewBox();
}

function resetMapZoom() {
  mapViewBox.x = MAP_ORIG_VB.x;
  mapViewBox.y = MAP_ORIG_VB.y;
  mapViewBox.w = MAP_ORIG_VB.w;
  mapViewBox.h = MAP_ORIG_VB.h;
  updateMapViewBox();
}

function updateMapLabels() {
  var svg = document.getElementById("belarus-map");
  if (!svg) return;
  var state = store.getState();

  var labels = svg.querySelectorAll(".map-label");
  if (labels.length === 0) return;

  var zoomLevel = MAP_ORIG_VB.w / mapViewBox.w;
  svg.classList.toggle("map--zoomed", zoomLevel >= 1.8);

  if (zoomLevel < 1.8) {
    labels.forEach(function (l) { l.setAttribute("visibility", "hidden"); });
    return;
  }

  var rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  var scaleX = rect.width / mapViewBox.w;
  var scaleY = rect.height / mapViewBox.h;
  var fontSize = 26;

  var boxes = [];
  labels.forEach(function (label) {
    var x = parseFloat(label.getAttribute("x"));
    var y = parseFloat(label.getAttribute("y"));
    var text = label.textContent;
    var estW = text.length * fontSize * 0.48 * scaleX;
    var estH = fontSize * scaleY;
    var screenX = (x - mapViewBox.x) * scaleX;
    var screenY = (y - mapViewBox.y) * scaleY;
    var pad = 4;
    boxes.push({
      el: label,
      left: screenX - pad,
      top: screenY - estH / 2 - pad,
      right: screenX + estW + pad,
      bottom: screenY + estH / 2 + pad,
      cityId: label.parentNode ? label.parentNode.dataset.cityId : ""
    });
  });

  boxes.sort(function (a, b) {
    var aV = !!state.visitedCities[a.cityId];
    var bV = !!state.visitedCities[b.cityId];
    if (aV !== bV) return bV ? 1 : -1;
    return 0;
  });

  var placed = [];
  boxes.forEach(function (box) {
    var overlaps = false;
    for (var i = 0; i < placed.length; i++) {
      if (!(box.right < placed[i].left || box.left > placed[i].right ||
            box.bottom < placed[i].top || box.top > placed[i].bottom)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) {
      box.el.setAttribute("visibility", "hidden");
    } else {
      box.el.setAttribute("visibility", "visible");
      placed.push(box);
    }
  });
}


















function switchTab(tabId) {
  var state = store.getState();
  if (state.currentTab === "passport") {
    var searchInput = document.getElementById("passport-search");
    if (searchInput) searchInput.value = "";
    var allFilterBtns = document.querySelectorAll(".passport-filter-btn");
    allFilterBtns.forEach(function (b) {
      b.classList.remove("disabled");
      b.classList.toggle("active", b.dataset.filter === state.passportFilter);
    });
  }

  store.setState(function (prev) {
    var next = { ...prev, currentTab: tabId };
    // СВЕРЕНО с app.js:865 — чистим searchQuery при уходе С passport
    // (без проверки tabId !== "passport").
    if (prev.currentTab === "passport") {
      next.passportSearchQuery = "";
    }
    return next;
  });

  document.querySelectorAll(".tab-content").forEach(function (el) {
    el.classList.remove("active");
  });
  var target = document.getElementById("tab-" + tabId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  if (tabId === "passport") {
    renderPassport();
  }

  if (tabId === "map") {
    if (!mapPointsInitialized) {
      initMapPoints();
    }
    updateMapMarkers();
    updateMapFilter();
  }

  if (tabId === "profile") {
    renderProfile();
  }
}



var currentPassportMode = "filter";

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
      return searchApi.getResultsHtml(store.getState());
    }
    return searchApi.getAccordionsHtml(store.getState());
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
    if (srCityId) openCityCard(srCityId);
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
    item.classList.toggle("open");
    return;
  }

  var cell = e.target.closest(".stamp-cell");
  if (cell) {
    var cityId = cell.dataset.cityId;
    if (cityId) {
      openCityCard(cityId);
    }
  }
}

function showOnboarding() {
  document.getElementById("onboarding-overlay").classList.add("visible");
}

function hideOnboarding() {
  document.getElementById("onboarding-overlay").classList.remove("visible");
}

function handleOnboardingContinue() {
  var input = document.getElementById("onboarding-name-input");
  var name = input.value.trim();
  store.setState({
    travelerName: name || "Белорусский путешественник",
    onboardingComplete: true,
  });
  hideOnboarding();
}

function handleOnboardingSkip() {
  store.setState({
    travelerName: "Белорусский путешественник",
    onboardingComplete: true,
  });
  hideOnboarding();
}



function renderProfile() {
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
  renderProfile();
}

function cancelEditName() {
  renderProfile();
}

let isProcessing = false;
var noteDebounceTimer = null;

function patchChecklistInPlace(cityId, sightId) {
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

function rerenderCityCardPreservingScroll(cityId) {
  var cardEl = document.querySelector("#city-card-content .city-card");
  var scrollTop = cardEl ? cardEl.scrollTop : 0;
  renderCityCard(cityId);
  var newCardEl = document.querySelector("#city-card-content .city-card");
  if (newCardEl) newCardEl.scrollTop = scrollTop;
}

function saveNote(cityId, text) {
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

function openCityCard(cityId) {
  if (isProcessing) return;
  isProcessing = true;
  try {
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
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}

function closeCityCard() {
  clearTimeout(noteDebounceTimer);
  var cityId = store.getState().activeOverlayCityId;
  if (cityId) {
    var textarea = document.getElementById("city-card-note");
    if (textarea) saveNote(cityId, textarea.value);
  }

  store.setState({ activeOverlayCityId: null, stampOrigin: null });

  document.getElementById("city-card-overlay").style.display = "none";
  document.getElementById("tab-bar").classList.remove("tab-bar-blocked");

  if (store.getState().currentTab === "passport") {
    renderPassport();
  }
}

function renderCityCard(cityId) {
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
    if (removeBtn) removeBtn.addEventListener("click", function () { visitApi.removeVisit(cityId); });
  } else {
    var visitBtn = document.getElementById("city-card-visit-btn");
    if (visitBtn) visitBtn.addEventListener("click", function () { renderDatePicker(cityId, visitApi.confirmVisit); });
  }

  // Кнопка вишлиста / «Доисследовать» (общая для обоих случаев)
  var exploreBtn = document.getElementById("city-card-explore-btn");
  if (exploreBtn) exploreBtn.addEventListener("click", function () { planApi.togglePlanned(cityId); });

  // Чек-лист: интерактивные пункты (IIFE для изоляции в ES5)
  if (hasSights && isVisited) {
    var items = document.querySelectorAll("#city-card-content .checklist-item");
    for (var ev_si = 0; ev_si < items.length; ev_si++) {
      (function (item) {
        item.addEventListener("click", function () {
          checklistApi.toggleSight(cityId, item.getAttribute("data-sight-id"));
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

function init() {
  var tabBar = document.getElementById("tab-bar");
  tabBar.addEventListener("click", function (e) {
    var btn = e.target.closest(".tab-btn");
    if (!btn) return;
    switchTab(btn.dataset.tab);
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
      renderPassport();
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
        renderPassport();
        document.querySelectorAll(".passport-filter-btn").forEach(function (b) {
          b.classList.remove("disabled");
          b.classList.toggle("active", b.dataset.filter === store.getState().passportFilter);
        });
        return;
      }
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        store.setState({ passportSearchQuery: value.trim() });
        renderPassport();
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

  var mapContainer = document.getElementById("map-container");
  if (mapContainer) {
    mapContainer.addEventListener("click", function (e) {
      if (suppressMapClick) { suppressMapClick = false; return; }
      var point = e.target.closest(".map-point");
      if (!point) return;
      var cityId = point.dataset.cityId;
      if (!cityId) return;
      store.setState({ stampOrigin: "map" });
      openCityCard(cityId);
    });
  }

  var mapControls = document.querySelector(".map-controls");
  if (mapControls) {
    mapControls.addEventListener("click", function (e) {
      var btn = e.target.closest(".map-filter-btn");
      if (!btn) return;
      var mapFilter = btn.dataset.mapFilter;
      store.setState({ mapFilter: mapFilter });
      document.querySelectorAll(".map-filter-btn").forEach(function (b) {
        b.classList.toggle("active", b.dataset.mapFilter === mapFilter);
      });
      updateMapFilter();
    });
  }

  var zoomInBtn = document.getElementById("map-zoom-in");
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var cx = mapViewBox.x + mapViewBox.w / 2;
      var cy = mapViewBox.y + mapViewBox.h / 2;
      zoomAtPoint(cx, cy, 1 / 1.5);
    });
  }

  var zoomOutBtn = document.getElementById("map-zoom-out");
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var cx = mapViewBox.x + mapViewBox.w / 2;
      var cy = mapViewBox.y + mapViewBox.h / 2;
      zoomAtPoint(cx, cy, 1.5);
    });
  }

  var mapSvg = document.getElementById("belarus-map");
  if (mapSvg) {
    mapSvg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var rect = mapSvg.getBoundingClientRect();
      var mx = mapViewBox.x + ((e.clientX - rect.left) / rect.width) * mapViewBox.w;
      var my = mapViewBox.y + ((e.clientY - rect.top) / rect.height) * mapViewBox.h;
      var factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      zoomAtPoint(mx, my, factor);
    }, { passive: false });
  }

  var mapTouchState = {
    dragging: false,
    pinching: false,
    startX: 0,
    startY: 0,
    startVb: null,
    pinchDist: 0,
    moved: false
  };

  if (mapContainer) {
    mapContainer.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        mapTouchState.pinching = true;
        mapTouchState.dragging = false;
        mapTouchState.startVb = { x: mapViewBox.x, y: mapViewBox.y, w: mapViewBox.w, h: mapViewBox.h };
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        mapTouchState.pinchDist = Math.sqrt(dx * dx + dy * dy);
        e.preventDefault();
      } else if (e.touches.length === 1) {
        mapTouchState.dragging = false;
        mapTouchState.pinching = false;
        mapTouchState.moved = false;
        mapTouchState.startX = e.touches[0].clientX;
        mapTouchState.startY = e.touches[0].clientY;
        mapTouchState.startVb = { x: mapViewBox.x, y: mapViewBox.y, w: mapViewBox.w, h: mapViewBox.h };
      }
    }, { passive: false });

    mapContainer.addEventListener("touchmove", function (e) {
      if (mapTouchState.pinching && e.touches.length === 2) {
        e.preventDefault();
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var newDist = Math.sqrt(dx * dx + dy * dy);
        if (mapTouchState.pinchDist < 1) return;
        var scale = mapTouchState.pinchDist / newDist;
        var newW = mapTouchState.startVb.w * scale;
        var newH = mapTouchState.startVb.h * scale;
        if (newW >= MAP_ORIG_VB.w) { resetMapZoom(); return; }
        var minW = MAP_ORIG_VB.w / 5;
        if (newW < minW) {
          newW = minW;
          newH = newW * (MAP_ORIG_VB.h / MAP_ORIG_VB.w);
        }
        var svgEl = document.getElementById("belarus-map");
        var rect = svgEl.getBoundingClientRect();
        var pcx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        var pcy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        var rx = (pcx - rect.left) / rect.width;
        var ry = (pcy - rect.top) / rect.height;
        var origCx = mapTouchState.startVb.x + rx * mapTouchState.startVb.w;
        var origCy = mapTouchState.startVb.y + ry * mapTouchState.startVb.h;
        mapViewBox.x = origCx - rx * newW;
        mapViewBox.y = origCy - ry * newH;
        mapViewBox.w = newW;
        mapViewBox.h = newH;
        updateMapViewBox();
      } else if (e.touches.length === 1 && !mapTouchState.pinching) {
        var tdx = e.touches[0].clientX - mapTouchState.startX;
        var tdy = e.touches[0].clientY - mapTouchState.startY;
        if (!mapTouchState.moved && (Math.abs(tdx) > 8 || Math.abs(tdy) > 8)) {
          mapTouchState.moved = true;
          mapTouchState.dragging = true;
        }
        if (mapTouchState.dragging && mapViewBox.w < MAP_ORIG_VB.w * 0.99) {
          e.preventDefault();
          suppressMapClick = true;
          var svgEl2 = document.getElementById("belarus-map");
          var rect2 = svgEl2.getBoundingClientRect();
          mapViewBox.x = mapTouchState.startVb.x - (tdx / rect2.width) * mapTouchState.startVb.w;
          mapViewBox.y = mapTouchState.startVb.y - (tdy / rect2.height) * mapTouchState.startVb.h;
          mapViewBox.w = mapTouchState.startVb.w;
          mapViewBox.h = mapTouchState.startVb.h;
          updateMapViewBox();
        }
      }
    }, { passive: false });

    mapContainer.addEventListener("touchend", function (e) {
      if (mapTouchState.moved) suppressMapClick = true;
      if (e.touches.length === 0) {
        mapTouchState.dragging = false;
        mapTouchState.pinching = false;
        mapTouchState.moved = false;
      } else if (e.touches.length === 1 && mapTouchState.pinching) {
        mapTouchState.pinching = false;
        mapTouchState.dragging = false;
        mapTouchState.moved = false;
        mapTouchState.startX = e.touches[0].clientX;
        mapTouchState.startY = e.touches[0].clientY;
        mapTouchState.startVb = { x: mapViewBox.x, y: mapViewBox.y, w: mapViewBox.w, h: mapViewBox.h };
      }
    });
  }

  var mapDragState = { active: false, moved: false, startX: 0, startY: 0, startVb: null };

  if (mapSvg) {
    mapSvg.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      if (mapViewBox.w >= MAP_ORIG_VB.w * 0.99) return;
      mapDragState.active = true;
      mapDragState.moved = false;
      mapDragState.startX = e.clientX;
      mapDragState.startY = e.clientY;
      mapDragState.startVb = { x: mapViewBox.x, y: mapViewBox.y, w: mapViewBox.w, h: mapViewBox.h };
      e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
      if (!mapDragState.active) return;
      var dx = e.clientX - mapDragState.startX;
      var dy = e.clientY - mapDragState.startY;
      if (!mapDragState.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        mapDragState.moved = true;
      }
      if (mapDragState.moved) {
        var rect = mapSvg.getBoundingClientRect();
        mapViewBox.x = mapDragState.startVb.x - (dx / rect.width) * mapDragState.startVb.w;
        mapViewBox.y = mapDragState.startVb.y - (dy / rect.height) * mapDragState.startVb.h;
        mapViewBox.w = mapDragState.startVb.w;
        mapViewBox.h = mapDragState.startVb.h;
        updateMapViewBox();
      }
    });

    document.addEventListener("mouseup", function () {
      if (mapDragState.active && mapDragState.moved) {
        suppressMapClick = true;
      }
      mapDragState.active = false;
      mapDragState.moved = false;
    });

    mapSvg.style.cursor = mapViewBox.w < MAP_ORIG_VB.w * 0.99 ? "grab" : "default";
  }

  var stampOverlay = document.getElementById("stamp-overlay");
  if (stampOverlay) {
    stampOverlay.addEventListener("click", function (e) {
      if (e.target !== e.currentTarget) return;
      var origin = store.getState().stampOrigin;
      closeStampOverlay();
      closeCityCard();
      if (origin) {
        switchTab(origin);
      }
    });
  }

  var continueBtn = document.getElementById("onboarding-continue");
  if (continueBtn) continueBtn.addEventListener("click", handleOnboardingContinue);

  var skipBtn = document.getElementById("onboarding-skip");
  if (skipBtn) skipBtn.addEventListener("click", handleOnboardingSkip);

  var onboardingInput = document.getElementById("onboarding-name-input");
  if (onboardingInput) {
    onboardingInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleOnboardingContinue();
    });
  }

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

  if (!store.getState().onboardingComplete) {
    showOnboarding();
  }

  // === Инициализация features (§5.4) ===
  // API объявлены на module-уровне (let ...), т.к. нужны render-функциям
  // (renderCityCard/renderPassport), вызываемым ПОСЛЕ init().
  function updateMap() {
    if (mapPointsInitialized) {
      updateMapMarkers();
      updateMapFilter();
    }
  }
  function saveNoteNow(cityId) {
    var noteEl = document.getElementById("city-card-note");
    if (noteEl) saveNote(cityId, noteEl.value);
  }

  visitApi = initVisit(store, {
    rerenderCityCard: rerenderCityCardPreservingScroll,
    updateMap: updateMap,
    renderProfile: renderProfile,
    closeCityCard: closeCityCard,
    saveNoteNow: saveNoteNow,
    // ⚠️ renderStampOverlay требует callbacks onShare/onCollection (§2.1).
    // stampsApi — module-level, инициализируется ниже; closure гарантирует
    // доступность stampsApi к моменту вызова hook'а (после init()).
    showStampOverlay: function (cityId) {
      renderStampOverlay(cityId, stampsApi.showShareText, stampsApi.goToCollection);
    },
    withMux: withMux,
    withMuxSlow: withMuxSlow,
  });

  checklistApi = initChecklist(store, {
    rerenderCityCard: rerenderCityCardPreservingScroll,
    patchChecklist: patchChecklistInPlace,
    updateMap: updateMap,
    saveNoteNow: saveNoteNow,
    withMux: withMux,
    withMuxSlow: withMuxSlow,
  });

  planApi = initPlan(store, {
    rerenderCityCard: rerenderCityCardPreservingScroll,
    updateMap: updateMap,
    saveNoteNow: saveNoteNow,
    withMux: withMux,
  });

  stampsApi = initStamps(store, {
    switchTab: switchTab,
    closeCityCard: closeCityCard,
  });

  searchApi = initSearch(store, {});

  switchTab(store.getState().currentTab);

  // Register SW only in production: in dev Vite serves transformed modules + HMR
  // client, and caching them breaks hot reload. SW update toast also gated to PROD.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
    var hasControllerOnLoad = !!navigator.serviceWorker.controller;
    var updateToastShown = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (hasControllerOnLoad && !updateToastShown) {
        updateToastShown = true;
        showToast("Приложение обновлено");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", init);

// TODO(phase-d2): убрать экспорты — временно для Phase B XSS-тестов (tests/security/xss.test.js).
// После распила widgets/ эти функции переедут в modules и будут экспортироваться штатно.
// NOTE(phase-d1): buildSearchResults переехал в features/search/build.js; XSS-тест
// #5 теперь импортирует его напрямую оттуда (с state-аргументом).
export { renderProfile, renderCityCard };
// __setTestState заменяет состояние store для тестов (раньше — прямой присвоение
// модульной переменной state). setState проходит через validate=applyInvariants,
// что безопасно для чистых тестовых фикстур.
export function __setTestState(s) { store.setState(s); }


