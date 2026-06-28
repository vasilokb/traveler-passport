import { CITIES } from '@entities/city/index.js';
import { getCityTier as getCityTierPure } from '@entities/city/index.js';
import { REGIONS, createStampSVG } from '@entities/region/index.js';
import { SIGHTS } from '@entities/sight/index.js';
import { normalizeForSearch } from '@shared/lib/format.js';
import { escapeHtml } from '@shared/lib/dom.js';

// Pure HTML-string рендереры режима поиска/фильтра паспорта.
// Принимают state аргументом (DI) вместо store.getState() — вызываются
// из features/search/index.js и из renderPassport (main.js).

export function buildSearchResults(state) {
  var query = state.passportSearchQuery;
  var normalizedQuery = normalizeForSearch(query);
  var results = [];

  CITIES.forEach(function (city) {
    if (normalizeForSearch(city.name).includes(normalizedQuery)) {
      results.push(city);
    }
  });

  if (results.length === 0) {
    return '<div class="passport-search-empty">Ничего не найдено</div>';
  }

  var html = '<div class="passport-search-results">';
  results.forEach(function (city) {
    var region = REGIONS.find(function (r) { return r.id === city.region; });
    var regionColor = region ? region.color : "#ccc";
    var isVisited = !!state.visitedCities[city.id];
    var isPlanned = !!state.plannedCities[city.id];

    var statusIcon = "";
    if (isVisited) {
      statusIcon = '<svg width="16" height="16" viewBox="0 0 20 20" fill="#27AE60"><path d="M7.629 14.566l-4.24-4.24 1.414-1.414 2.826 2.826 7.072-7.072 1.414 1.414z"/></svg>';
    } else if (isPlanned) {
      statusIcon = '<svg width="16" height="16" viewBox="0 0 20 20" fill="' + regionColor + '">' +
        '<line x1="3" y1="2" x2="3" y2="16" stroke="' + regionColor + '" stroke-width="1.5"/>' +
        '<rect x="3" y="2" width="10" height="7" fill="' + regionColor + '"/>' +
        '</svg>';
    }

    html += '<div class="passport-search-result" data-city-id="' + city.id + '">';
    html += '  <div class="passport-search-icon" style="color:' + regionColor + '">' + createStampSVG(city.region, getCityTierPure(city.id, state, SIGHTS)) + '</div>';
    html += '  <span class="passport-search-name">' + escapeHtml(city.name) + '</span>';
    html += '  <span class="passport-search-status">' + statusIcon + '</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

export function buildFilterAccordions(state) {
  var filter = state.passportFilter || "all";
  var html = "";
  var anyRendered = false;

  REGIONS.forEach(function (region) {
    var citiesInRegion = CITIES.filter(function (c) { return c.region === region.id; });
    var regionTotal = citiesInRegion.length;
    var regionVisited = citiesInRegion.filter(function (c) { return state.visitedCities[c.id]; }).length;

    var filtered;
    if (filter === "visited") {
      filtered = citiesInRegion.filter(function (c) { return state.visitedCities[c.id]; });
    } else if (filter === "unvisited") {
      filtered = citiesInRegion.filter(function (c) { return !state.visitedCities[c.id]; });
    } else if (filter === "planned") {
      filtered = citiesInRegion.filter(function (c) { return state.plannedCities[c.id]; });
    } else {
      filtered = citiesInRegion;
    }

    if (filtered.length === 0) return;
    anyRendered = true;

    var isOpen = state.openedRegions.indexOf(region.id) !== -1;
    var isCapital = region.id === "minsk";

    if (isCapital) {
      var capCity = filtered[0];
      var capTier = getCityTierPure(capCity.id, state, SIGHTS);
      var capVisited = !!state.visitedCities[capCity.id];

      html += '<div class="accordion-item capital-block">';
      html += '  <div class="accordion-header">';
      html += '    <span class="accordion-color-dot" style="background:' + region.color + '"></span>';
      html += '    <span class="accordion-region-name">' + escapeHtml(capCity.name) + ' <span class="capital-tag">столица</span></span>';
      html += '  </div>';
      html += '  <div class="stamps-grid">';
      html += '    <div class="stamp-cell' + (capVisited ? ' visited' : '') + (capTier ? ' tier-' + capTier : '') + '" data-city-id="' + capCity.id + '">';
      html += '      <div class="stamp-icon' + (capVisited ? ' visited' : '') + '" style="' + (capVisited ? '--region-color:' + region.color + ';color:' + region.color : '') + '">';
      html += createStampSVG(region.id, capTier);
      html += '      </div>';
      html += '      <span class="stamp-name">' + escapeHtml(capCity.name) + '</span>';
      html += '    </div>';
      html += '  </div>';
      html += '</div>';
      return;
    }

    var isComplete = regionTotal > 0 && regionVisited === regionTotal;

    var itemClass = "accordion-item";
    if (isOpen) itemClass += " open";
    html += '<div class="' + itemClass + '" data-region-id="' + region.id + '">';
    html += '  <div class="accordion-header">';

    html += '    <span class="accordion-color-dot" style="background:' + region.color + '"></span>';

    html += '    <span class="accordion-region-name">' + region.name + '</span>';

    if (isComplete) {
      html += '    <span class="accordion-badge badge-gold">Пройден</span>';
    }

    html += '    <span class="accordion-count">' + regionVisited + ' из ' + regionTotal + '</span>';
    html += '    <svg class="accordion-arrow" viewBox="0 0 20 20" fill="currentColor"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>';
    html += '  </div>';
    html += '  <div class="accordion-body">';
    html += '    <div class="accordion-inner">';
    html += '      <div class="stamps-grid">';

    filtered.forEach(function (city) {
      var isVisited = !!state.visitedCities[city.id];
      var cityTier = getCityTierPure(city.id, state, SIGHTS);
      html += '<div class="stamp-cell' + (isVisited ? ' visited' : '') + (cityTier ? ' tier-' + cityTier : '') + '" data-city-id="' + city.id + '">';
      html += '  <div class="stamp-icon' + (isVisited ? ' visited' : '') + '" style="' + (isVisited ? '--region-color:' + region.color + ';color:' + region.color : '') + '">';
      html += createStampSVG(region.id, cityTier);
      html += '  </div>';
      html += '  <span class="stamp-name">' + escapeHtml(city.name) + '</span>';
      html += '</div>';
    });

    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
  });

  if (!anyRendered) {
    var totalVisited = Object.keys(state.visitedCities).length;
    if (filter === "planned") {
      html = '<div class="passport-search-empty">Нет городов в планах. Откройте карточку города и нажмите «Хочу поехать»</div>';
    } else if (filter === "visited") {
      html = '<div class="passport-search-empty">Здесь появятся города, которые вы посетите</div>';
    } else if (filter === "unvisited" && totalVisited === CITIES.length) {
      html = '<div class="passport-search-empty">Ура! Вы прошли всю Беларусь!</div>';
    }
  }

  return html;
}
