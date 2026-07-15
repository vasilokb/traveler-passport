import { store } from '@app/store.js';
import {
  CITIES,
  getCityById,
  getCityTier as getCityTierPure,
  getSightsCount as getSightsCountPure,
  getCheckedCount as getCheckedCountPure,
} from '@entities/city/index.js';
import { REGIONS, computeStarPoints } from '@entities/region/index.js';
import { SIGHTS } from '@entities/sight/index.js';
import { MAP, projectToSVG } from '@shared/config/map-config.js';

// widgets/map — SVG-карта Беларуси: маркеры, фильтр, pan/zoom/pinch/drag.
// Phase D2 §3.2: самая сложная логика (~400 строк). Module-level state
// (mapPointsInitialized/MAP_ORIG_VB/mapViewBox/suppressMapClick) — внутри виджета.
// openCityCard — dep (widgets→widgets запрещено). Прямой updateMapFilter() из
// filter handler удалён — subscribe покрывает. Touch/drag state — local в initMap.

var mapPointsInitialized = false;

// Module-level wrappers (1:1 с main.js:34-37, используются updateMapMarkers).
function getCityTier(cityId) { return getCityTierPure(cityId, store.getState(), SIGHTS); }
function getSightsCount(cityId) { return getSightsCountPure(cityId, SIGHTS); }
function getCheckedCount(cityId) { return getCheckedCountPure(cityId, store.getState()); }

let _openCityCard;

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

export function initMap(store, deps) {
  _openCityCard = deps.openCityCard;

  // subscribe: при currentTab==='map' — инициализация (первое открытие) + обновление.
  // ⚠️ КРИТИЧНО: initMapPoints() должен вызваться при ПЕРВОМ открытии map.
  // Оригинал (main.js:445–451) вызывал initMapPoints внутри switchTab.
  // subscribe проверяет currentTab === 'map' (как оригинал), а НЕ mapPointsInitialized
  // (который false до первого initMapPoints).
  // ⚠️ Subscribe стреляет на каждый setState пока currentTab==='map' (синхронно,
  // store-mechanism.js:63) — замещает switchTab-рендер (445–451, удалён в §4.2 шаг 4)
  // и удалённые hooks.updateMap из features (§3 шаг 3). Лишние ре-рендеры — долг (§4.4, §12).
  store.subscribe(function (state) {
    if (state.currentTab === 'map') {
      if (!mapPointsInitialized) {
        initMapPoints();
      }
      updateMapMarkers();
      updateMapFilter();
    }
  });

  var mapContainer = document.getElementById("map-container");
  if (mapContainer) {
    mapContainer.addEventListener("click", function (e) {
      if (suppressMapClick) { suppressMapClick = false; return; }
      var point = e.target.closest(".map-point");
      if (!point) return;
      var cityId = point.dataset.cityId;
      if (!cityId) return;
      store.setState({ stampOrigin: "map" });
      _openCityCard(cityId);
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

  return {};
}
