"use strict";

const REGIONS = [
  { id: "minsk", name: "Минск", color: "#C0C0C0" },
  { id: "minsk_obl", name: "Минская область", color: "#E74C3C" },
  { id: "brest", name: "Брестская", color: "#3498DB" },
  { id: "grodno", name: "Гродненская", color: "#27AE60" },
  { id: "vitebsk", name: "Витебская", color: "#F39C12" },
  { id: "mogilev", name: "Могилёвская", color: "#9B59B6" },
  { id: "gomel", name: "Гомельская", color: "#1ABC9C" },
];

const REGION_ICONS = {
  minsk: '<path d="M48 38 L50 32 L52 26 L54 24 L46 24 L48 26 L50 32 L50 38 L42 38 L42 40 L58 40 L58 38 Z M46 22 L54 22 L54 24 L46 24 Z" fill="currentColor"/>',
  minsk_obl: '<path d="M40 40 L40 28 L42 26 L46 24 L50 26 L54 24 L58 26 L60 28 L60 40 Z M48 30 L48 36 M44 33 L52 33" fill="currentColor"/>',
  brest: '<path d="M38 40 L38 26 L42 22 L44 22 L44 26 L46 26 L46 22 L54 22 L54 26 L56 26 L56 22 L58 22 L62 26 L62 40 Z M50 28 L50 36 M46 32 L54 32" fill="currentColor"/>',
  grodno: '<path d="M44 40 L44 30 L42 28 L42 22 L46 22 L46 28 L50 28 L50 22 L54 22 L54 28 L52 30 L52 40 Z M48 32 L48 38" fill="currentColor"/>',
  vitebsk: '<path d="M42 40 L42 30 L38 26 L40 22 L44 20 L46 22 L46 18 L48 16 L50 18 L50 22 L52 20 L56 22 L58 26 L54 30 L54 40 Z M48 24 L48 36" fill="currentColor"/>',
  mogilev: '<path d="M42 40 L42 32 L44 30 L44 26 L40 24 L40 22 L46 22 L46 24 L50 24 L50 22 L56 22 L56 24 L52 26 L52 30 L54 32 L54 40 Z M48 34 L48 38" fill="currentColor"/>',
  gomel: '<path d="M38 40 L38 30 L40 28 L40 24 L42 22 L44 22 L44 24 L48 24 L48 22 L52 22 L52 24 L56 24 L56 22 L58 22 L60 24 L60 28 L62 30 L62 40 Z M50 26 L50 36" fill="currentColor"/>',
};

function createStampSVG(regionId) {
  var inner = REGION_ICONS[regionId] || "";
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M50 5 L54 8 L58 6 L61 10 L65 9 L67 13 L71 13 L72 17 L76 18 L76 22 L80 24 L79 28 L82 31 L80 35 L83 38 L80 41 L82 44 L79 47 L80 50 L77 53 L78 56 L74 58 L74 62 L70 63 L69 67 L65 67 L63 71 L59 70 L57 74 L53 72 L50 75 L47 72 L43 74 L41 70 L37 71 L35 67 L31 67 L30 63 L26 62 L26 58 L22 56 L23 53 L20 50 L21 47 L18 44 L20 41 L17 38 L20 35 L18 31 L21 28 L20 24 L24 22 L24 18 L28 17 L29 13 L33 13 L35 9 L39 10 L42 6 L46 8 Z" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.5"/>' +
    '<g transform="translate(0, 5) scale(1)">' + inner + '</g>' +
    '</svg>';
}

var MAP = {
  viewBoxX: 1.472,
  viewBoxY: 1.809,
  viewBoxW: 1626.241,
  viewBoxH: 1450.672,
  geoN: 56.4,
  geoS: 51.1,
  geoW: 22.9,
  geoE: 33.0,
};

function projectToSVG(lat, lon) {
  var x =
    MAP.viewBoxX +
    ((lon - MAP.geoW) / (MAP.geoE - MAP.geoW)) * MAP.viewBoxW;
  var y =
    MAP.viewBoxY +
    ((MAP.geoN - lat) / (MAP.geoN - MAP.geoS)) * MAP.viewBoxH;
  return { x: x, y: y };
}

var mapPointsInitialized = false;

function initMapPoints() {
  if (mapPointsInitialized) return;
  var pointsLayer = document.getElementById("map-points-layer");
  if (!pointsLayer) return;

  pointsLayer.innerHTML = "";
  var fragment = document.createDocumentFragment();

  CITIES.forEach(function (city) {
    var pos = projectToSVG(city.lat, city.lon);
    var region = REGIONS.find(function (r) { return r.id === city.region; });

    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "map-point");
    g.setAttribute("data-city-id", city.id);

    var hitbox = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hitbox.setAttribute("cx", pos.x);
    hitbox.setAttribute("cy", pos.y);
    hitbox.setAttribute("r", "22");
    hitbox.setAttribute("fill", "transparent");
    hitbox.setAttribute("class", "hitbox");

    var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", pos.x);
    dot.setAttribute("cy", pos.y);
    dot.setAttribute("r", "7");
    dot.setAttribute("fill", "#ccc");
    dot.setAttribute("class", "dot");

    var flagGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    flagGroup.setAttribute("class", "map-flag");
    flagGroup.setAttribute("transform", "translate(" + (pos.x + 5) + "," + (pos.y - 10) + ")");
    flagGroup.setAttribute("display", "none");
    flagGroup.innerHTML = '<line x1="0" y1="0" x2="0" y2="12" stroke="currentColor" vector-effect="non-scaling-stroke"/><rect x="0" y="0" width="8" height="6" fill="currentColor"/>';

    var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
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

    g.appendChild(hitbox);
    g.appendChild(dot);
    g.appendChild(flagGroup);
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
  var points = pointsLayer.querySelectorAll(".map-point");
  points.forEach(function (point) {
    var cityId = point.getAttribute("data-city-id");
    var city = CITIES.find(function (c) { return c.id === cityId; });
    if (!city) return;
    var region = REGIONS.find(function (r) { return r.id === city.region; });
    var isVisited = !!state.visitedCities[cityId];
    var isPlanned = !!state.plannedCities[cityId];
    var dot = point.querySelector("circle.dot");
    if (dot) {
      if (isVisited || isPlanned) {
        dot.setAttribute("fill", region ? region.color : "#ccc");
      } else {
        dot.setAttribute("fill", "#ccc");
      }
    }
    var flag = point.querySelector(".map-flag");
    if (flag) {
      if (isPlanned && !isVisited) {
        flag.setAttribute("display", "inline");
        flag.style.color = region ? region.color : "#ccc";
      } else {
        flag.setAttribute("display", "none");
      }
    }
  });
}

function updateMapFilter() {
  var pointsLayer = document.getElementById("map-points-layer");
  if (!pointsLayer) return;
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
        overlayText.textContent = "Нет городов в планах. Откройте карточку города и нажмите закладку в шапке";
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

  var labels = svg.querySelectorAll(".map-label");
  if (labels.length === 0) return;

  var zoomLevel = MAP_ORIG_VB.w / mapViewBox.w;

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

function renderStampOverlay(cityId) {
  var city = CITIES.find(function (c) {
    return c.id === cityId;
  });
  if (!city) return;

  var region = REGIONS.find(function (r) {
    return r.id === city.region;
  });
  var regionColor = region ? region.color : "#ccc";

  var html = "";
  html += '<div class="stamp-card">';
  html +=
    '  <div class="stamp-card-icon" style="color:' +
    regionColor +
    '">' +
    createStampSVG(city.region) +
    "</div>";
  html +=
    '  <div class="stamp-card-city">' + escapeHtml(city.name) + "</div>";
  html += '  <div class="stamp-card-actions">';
  html +=
    '    <button class="stamp-card-btn stamp-card-btn-share" id="stamp-share-btn">Поделиться</button>';
  html +=
    '    <button class="stamp-card-btn stamp-card-btn-collection" id="stamp-collection-btn">В коллекцию</button>';
  html += "  </div>";
  html += "</div>";

  document.getElementById("stamp-overlay-content").innerHTML = html;

  var shareBtn = document.getElementById("stamp-share-btn");
  if (shareBtn) shareBtn.addEventListener("click", function () { showShareText(city.name); });

  var collectionBtn = document.getElementById("stamp-collection-btn");
  if (collectionBtn)
    collectionBtn.addEventListener("click", function () { goToCollection(cityId); });
}

function closeStampOverlay() {
  state.stampOverlayCityId = null;
  document.getElementById("stamp-overlay").style.display = "none";
}

function goToCollection(cityId) {
  closeStampOverlay();
  closeCityCard();

  state.currentTab = "passport";

  var city = CITIES.find(function (c) {
    return c.id === cityId;
  });
  var regionId = city ? city.region : null;

  if (regionId && state.openedRegions.indexOf(regionId) === -1) {
    state.openedRegions.push(regionId);
  }

  switchTab("passport");

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

function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = "block";
  toast.classList.add("visible");
  setTimeout(function () {
    toast.style.display = "none";
    toast.classList.remove("visible");
  }, 2000);
}

const CITIES = [
  { id: "minsk", name: "Минск", region: "minsk", lat: 53.9006, lon: 27.5590, description: "Столица Беларуси с монументальной сталинской архитектурой проспекта Независимости, Троицким предместьем и одним из старейших университетов Восточной Европы." },
  { id: "nesvizh", name: "Несвиж", region: "minsk_obl", lat: 53.2227, lon: 26.6753, description: "Жемчужина белорусской архитектуры — дворцово-парковый комплекс Радзивиллов и костёл Божьего Тела, занесённые в список ЮНЕСКО." },
  { id: "mir", name: "Мир", region: "minsk_obl", lat: 53.4518, lon: 26.4705, description: "Город с легендарным Мирским замком — первым объектом Всемирного наследия ЮНЕСКО в Беларуси, поражающим своими пятисотлетними стенами." },
  { id: "zaslavl", name: "Заславль", region: "minsk_obl", lat: 54.3314, lon: 27.2850, description: "Один из древнейших городов Беларуси, основанный в 985 году, с живописным замчищем и Спасо-Преображенским храмом XII века." },
  { id: "slutsk", name: "Слуцк", region: "minsk_obl", lat: 53.0251, lon: 27.5630, description: "Город знаменитых слуцких поясов — шедевров декоративно-прикладного искусства, с богатой историей и старинной Петропавловской церковью." },
  { id: "borisov", name: "Борисов", region: "minsk_obl", lat: 54.2277, lon: 28.5036, description: "Город-герой на Березине, где развернулась одна из ключевых битв Отечественной войны 1812 года, с памятниками боевой славы." },
  { id: "molodechno", name: "Молодечно", region: "minsk_obl", lat: 54.3089, lon: 26.8573, description: "Культурная столица Минской области с известным театром и ежегодным фестивалем белорусской песни и поэзии «Маладзечанская сузор'е»." },
  { id: "kletsk", name: "Клецк", region: "minsk_obl", lat: 52.7583, lon: 26.6942, description: "Город с величественным Троицким костёлом и доминиканским монастырём XVII века, хранящий память о битве на реке Лани." },
  { id: "kopyl", name: "Копыль", region: "minsk_obl", lat: 53.1538, lon: 27.5287, description: "Тихий городок у подножия Минской возвышенности с краеведческим музеем и живописными окрестностями, воспетыми Кузьмой Чорным." },
  { id: "marina_gorka", name: "Марьина Горка", region: "minsk_obl", lat: 53.5117, lon: 28.1528, description: "Город с уютной центральной площадью и Свято-Никольским храмом, окружённый сосновыми лесами и живописными берегами реки Титовка." },
  { id: "stolbtsy", name: "Столбцы", region: "minsk_obl", lat: 53.4826, lon: 26.7419, description: "Город на Немане, где находится уникальная церковь Святой Анны — памятник деревянного зодчества, и дом-музей Якуба Коласа." },
  { id: "brest", name: "Брест", region: "brest", lat: 52.0976, lon: 23.6878, description: "Город-герой с легендарной Брестской крепостью, памятником мужества советских воинов, и живописной пешеходной улицей Советской." },
  { id: "pinsk", name: "Пинск", region: "brest", lat: 52.1151, lon: 26.0694, description: "«Венеция Полесья» — город на реке Припять с изящным иезуитским коллегиумом и кармелитским костёлом в стиле барокко." },
  { id: "kobrin", name: "Кобрин", region: "brest", lat: 52.2142, lon: 24.3502, description: "Город-сад с monumentом в честь победы Суворова и живописным парком, заложенным на месте старинного замка." },
  { id: "bereza", name: "Берёза", region: "brest", lat: 52.5361, lon: 24.9686, description: "Город, выросший вокруг древнего картезианского монастыря, чьи руины до сих пор впечатляют масштабами и готической эстетикой." },
  { id: "kamenets", name: "Каменец", region: "brest", lat: 52.4039, lon: 23.8527, description: "Город с уникальной Белой Вежей — оборонной башней XIII века, одной из старейших кирпичных построек на территории Беларуси." },
  { id: "kossovo", name: "Коссово", region: "brest", lat: 52.7614, lon: 25.1519, description: "Местечко с сказочным неоготическим дворцом Пусловских, который называют белорусским «замком спящей красавицы»." },
  { id: "ruzhany", name: "Ружаны", region: "brest", lat: 52.8631, lon: 24.8931, description: "Живописный посёлок с грандиозным дворцовым комплексом Сапег, когда-то называвшимся «белорусским Версалем»." },
  { id: "pruzhany", name: "Пружаны", region: "brest", lat: 52.5594, lon: 24.4592, description: "Ворота в Беловежскую пущу с краеведческим музеем, где выставлена единственная в Беларуси экспозиция соломенного ткачества." },
  { id: "david_gorodok", name: "Давид-Городок", region: "brest", lat: 52.0867, lon: 27.2106, description: "Древний город на Горыни, основанный князем Давыдом Игоревичем, с уцелевшими валами XI века и церковью XVIII столетия." },
  { id: "vysokoe", name: "Высокое", region: "brest", lat: 52.0764, lon: 23.3614, description: "Пограничный городок с монументальным Троицким костёлом и руинами замка Гогензоллернов, возвышающимися над долиной реки Пульвы." },
  { id: "grodno", name: "Гродно", region: "grodno", lat: 53.6694, lon: 23.8244, description: "Королевский город на Немане с Старым и Новым замками, величественной Фарой Витовта и единственной в Беларуси Коложской церковью XII века." },
  { id: "novogrudok", name: "Новогрудок", region: "grodno", lat: 53.5981, lon: 25.8228, description: "Первая столица Великого княжества Литовского с живописными руинами замка на Замковой горе и церковью Адама Мицкевича." },
  { id: "lida", name: "Лида", region: "grodno", lat: 53.8847, lon: 25.2922, description: "Город с мощным Лидским замком XIV века — одним из лучших образков оборонной готики, и нарядным костёлом Воздвижения." },
  { id: "slonim", name: "Слоним", region: "grodno", lat: 53.0867, lon: 25.4761, description: "Город с изящным костёлом Святого Андрея в стиле рококо и старинной синагогой — свидетельством многовекового сосуществования культур." },
  { id: "volkovysk", name: "Волковыск", region: "grodno", lat: 53.1536, lon: 24.4536, description: "Древний город на Роси, упомянутый в летописи 1005 года, с краеведческим музеем в шведском редуте и холмом Замчище." },
  { id: "mosty", name: "Мосты", region: "grodno", lat: 53.4097, lon: 24.5272, description: "Город на Немане, окружённый сосновыми борами и живописными береговыми обрывами — идеальная точка для любителей природы." },
  { id: "dyatlovo", name: "Дятлово", region: "grodno", lat: 53.4786, lon: 25.4919, description: "Городок с изящным Троицким костёлом и руинами дворца Радзивиллов, окружённый холмистым ландшафтом Новогрудской возвышенности." },
  { id: "shchuchin", name: "Щучин", region: "grodno", lat: 53.6128, lon: 24.7369, description: "Город с монументальным костёлом Святой Терезы и живописным парком бывшего монастыря бернардинцев." },
  { id: "oshmyany", name: "Ошмяны", region: "grodno", lat: 54.0278, lon: 26.0772, description: "Пограничный город на реке Ошмянке с костёлом Святых Франциска и Бернарда и домом-музеем поэта Франтишка Богушевича." },
  { id: "polotsk", name: "Полоцк", region: "vitebsk", lat: 55.4847, lon: 28.7642, description: "Древнейший город Беларуси и колыбель славянской письменности с Софийским собором и знаменитым памятником Евфросинии Полоцкой." },
  { id: "vitebsk", name: "Витебск", region: "vitebsk", lat: 55.1848, lon: 30.2016, description: "Родина Марка Шагала, город фестивалей и вдохновения с живописной ратушей и Успенским собором на высоком берегу Западной Двины." },
  { id: "orsha", name: "Орша", region: "vitebsk", lat: 54.5081, lon: 30.4178, description: "Город на Днепре с величественным Кутеинским монастырём XVII века и памятником первопечатнику Франциску Скорине." },
  { id: "braslav", name: "Браслав", region: "vitebsk", lat: 55.6481, lon: 27.0331, description: "Ворота Браславских озёр — город среди голубых озёр ледникового происхождения с древним Замковым холмом и видом на озеро Дривяты." },
  { id: "glubokoe", name: "Глубокое", region: "vitebsk", lat: 55.1336, lon: 27.6833, description: "Город с одним из красивейших костёлов Беларуси — трёхбашенным храмом Святой Троицы, возвышающимся над озером Глубокое." },
  { id: "lepel", name: "Лепель", region: "vitebsk", lat: 54.8811, lon: 28.0378, description: "Город на берегу живописного Лепельского озера с парком XIX века и памятником героям войны 1812 года." },
  { id: "disna", name: "Дисна", region: "vitebsk", lat: 55.5625, lon: 28.2883, description: "Один из самых маленьких городов Беларуси с каменной застройкой XIX века и потрясающим видом на слияние рек Дисны и Западной Двины." },
  { id: "dokshitsy", name: "Докшицы", region: "vitebsk", lat: 54.9172, lon: 27.7394, description: "Тихий городок у истоков Березины с костёлом Святого Иоанна Крестителя и живописными берегами реки." },
  { id: "miory", name: "Миоры", region: "vitebsk", lat: 55.6264, lon: 27.6231, description: "Город у границы с Литвой, окружённый озёрами и лесами, с деревянной церковью Святого Георгия начала XX века." },
  { id: "mogilev", name: "Могилёв", region: "mogilev", lat: 53.9006, lon: 30.3314, description: "Третий по величине город Беларуси с величественным собором трёх святителей и одним из лучших в Европе Музея этнографии." },
  { id: "bobruisk", name: "Бобруйск", region: "mogilev", lat: 53.1481, lon: 29.2364, description: "Город с мощной Бобруйской крепостью XIX века — свидетелем войн и восстаний, и нарядной исторической застройкой начала XX века." },
  { id: "mstislavl", name: "Мстиславль", region: "mogilev", lat: 54.0236, lon: 31.7228, description: "«Белорусский Суздаль» — город с семью сохранившимися храмами, кармелитским костёлом и живописным Замковым холмом над рекой Вихрой." },
  { id: "bykhov", name: "Быхов", region: "mogilev", lat: 53.5197, lon: 30.2367, description: "Город с уникальной синагогой XVII века — бывшей резиденцией гетмана Синявского, и старинной Покровской церковью." },
  { id: "krichev", name: "Кричев", region: "mogilev", lat: 53.7269, lon: 31.7125, description: "Город на Соже с величественным дворцом Потёмкина и старинной Александровской церковью — свидетельницей побед Суворова." },
  { id: "shklov", name: "Шклов", region: "mogilev", lat: 54.2164, lon: 30.2931, description: "Город на Днепре с живописной Ратушей и еврейским кладбищем XVII века, родина израильского премьера Шимона Переса." },
  { id: "cherikov", name: "Чериков", region: "mogilev", lat: 53.6250, lon: 31.3631, description: "Небольшой город на Соже с дореволюционной застройкой и живописным видом на речную долину из парка на холме." },
  { id: "chausy", name: "Чаусы", region: "mogilev", lat: 53.8106, lon: 31.0433, description: "Тихий городок на реке Бася с монументальным мемориалом погибшим землякам и краеведческим музеем в старинном здании." },
  { id: "gomel", name: "Гомель", region: "gomel", lat: 52.4317, lon: 30.9936, description: "Второй по величине город Беларуси с великолепным дворцово-парковым комплексом Румянцевых-Паскевичей и Свято-Петро-Павловским собором." },
  { id: "turov", name: "Туров", region: "gomel", lat: 52.0614, lon: 27.7381, description: "Один из древнейших городов Восточной Европы и духовная столица Беларуси с легендарным каменным крестом и руинами храма XII века." },
  { id: "mozyr", name: "Мозырь", region: "gomel", lat: 52.0419, lon: 29.2589, description: "Город на Припяти с живописными холмами — редкостью для равнинного Полесья — и старинным монастырём бернардинцев." },
  { id: "rechitsa", name: "Речица", region: "gomel", lat: 52.3611, lon: 30.3950, description: "Город на Днепре с белокаменным Свято-Троицким костёлом и живописной набережной, один из старейших городов региона." },
  { id: "vetka", name: "Ветка", region: "gomel", lat: 52.5467, lon: 31.1764, description: "Центр старообрядческой культуры с единственным в мире музеем старообрядчества и библиотекой рукописных книг XVI–XVIII веков." },
  { id: "chechersk", name: "Чечерск", region: "gomel", lat: 52.9272, lon: 30.9497, description: "Город с изящной ратушей и торговыми рядами, построенными по проекту итальянского архитектора Кампиони, и древним городищем." },
  { id: "loevo", name: "Лоев", region: "gomel", lat: 51.9089, lon: 30.7986, description: "Посёлок на Днепре, где развернулась знаменитая битва 1651 года, с краеведческим музеем и потрясающими видами на речные просторы." },
  { id: "dobrush", name: "Добруш", region: "gomel", lat: 52.3789, lon: 31.3133, description: "Город бумажников с старейшей в Беларуси бумажной фабрикой и дворцом-усадьбой графа Румянцева на берегу реки Ипуть." },
  { id: "kalinkovichi", name: "Калинковичи", region: "gomel", lat: 52.5294, lon: 29.3247, description: "Важный железнодорожный узел Полесья с памятником жертвам Холокоста и краеведческим музеем, рассказывающим о полесском быте." },
  { id: "rogachev", name: "Рогачёв", region: "gomel", lat: 53.0972, lon: 30.0378, description: "Город на Днепре с величественным Свято-Никольским собором и старинной еврейской синагогой, родина знаменитой молочной марки." },
];

const STORAGE_KEY = "travelerPassport";

let state = {
  currentTab: "passport",
  travelerName: "Белорусский путешественник",
  onboardingComplete: false,
  visitedCities: {},
  plannedCities: {},
  cityNotes: {},
  checkedSights: {},
  milestones: [],
  openedRegions: [],
  activeOverlayCityId: null,
  stampOrigin: null,
};

function getCityById(cityId) {
  for (var i = 0; i < CITIES.length; i++) {
    if (CITIES[i].id === cityId) return CITIES[i];
  }
  return null;
}

function getSightsCount(cityId) {
  if (typeof SIGHTS === "undefined") return 0;
  var sights = SIGHTS[cityId];
  return (sights && sights.length > 0) ? sights.length : 0;
}

function hasChecklist(cityId) {
  return getSightsCount(cityId) > 0;
}

function getCheckedCount(cityId) {
  if (!state.checkedSights) return 0;
  var checked = state.checkedSights[cityId];
  return (checked && Array.isArray(checked)) ? checked.length : 0;
}

function getCityTier(cityId) {
  if (!state.visitedCities[cityId]) return null;
  var sightsCount = getSightsCount(cityId);
  if (sightsCount === 0) return "bronze";
  var checkedCount = getCheckedCount(cityId);
  var ratio = checkedCount / sightsCount;
  if (ratio >= 1.0) return "gold";
  if (ratio >= 0.5) return "silver";
  return "bronze";
}

function getTierLabel(tier) {
  if (tier === "gold") return "Золото";
  if (tier === "silver") return "Серебро";
  if (tier === "bronze") return "Бронза";
  return "";
}

function getTierEmoji(tier) {
  if (tier === "gold") return "🥇";
  if (tier === "silver") return "🥈";
  if (tier === "bronze") return "🥉";
  return "";
}

function addMilestone(cityId, tier) {
  if (tier !== "silver" && tier !== "gold") return;
  var exists = false;
  for (var i = 0; i < state.milestones.length; i++) {
    if (state.milestones[i].cityId === cityId && state.milestones[i].tier === tier) {
      exists = true;
      break;
    }
  }
  if (!exists) {
    state.milestones.push({ cityId: cityId, date: getTodayLocal(), tier: tier });
  }
}

function removeMilestone(cityId, tier) {
  var filtered = [];
  for (var i = 0; i < state.milestones.length; i++) {
    var m = state.milestones[i];
    if (!(m.cityId === cityId && m.tier === tier)) {
      filtered.push(m);
    }
  }
  state.milestones = filtered;
}

function removeAllMilestones(cityId) {
  var filtered = [];
  for (var i = 0; i < state.milestones.length; i++) {
    if (state.milestones[i].cityId !== cityId) {
      filtered.push(state.milestones[i]);
    }
  }
  state.milestones = filtered;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.currentTab = saved.currentTab || "passport";
      if (state.currentTab === "catalog") state.currentTab = "passport";
      if (typeof saved.travelerName === "string" && saved.travelerName.trim()) {
        state.travelerName = saved.travelerName;
      } else {
        state.travelerName = "Белорусский путешественник";
      }
      state.onboardingComplete = !!saved.onboardingComplete;
      if (saved.visitedCities && typeof saved.visitedCities === "object" && !Array.isArray(saved.visitedCities)) {
        var validCities = {};
        var dateRe = /^\d{4}-\d{2}-\d{2}$/;
        var cityIds = Object.keys(saved.visitedCities);
        for (var i = 0; i < cityIds.length; i++) {
          var cid = cityIds[i];
          var entry = saved.visitedCities[cid];
          if (!entry || typeof entry !== "object") continue;
          if (typeof entry.date !== "string" || !dateRe.test(entry.date)) continue;
          if (!CITIES.find(function (c) { return c.id === cid; })) continue;
          validCities[cid] = entry;
        }
        state.visitedCities = validCities;
      } else {
        state.visitedCities = {};
      }
      if (saved.plannedCities && typeof saved.plannedCities === "object" && !Array.isArray(saved.plannedCities)) {
        var validPlanned = {};
        var plannedIds = Object.keys(saved.plannedCities);
        for (var j = 0; j < plannedIds.length; j++) {
          var pid = plannedIds[j];
          if (saved.plannedCities[pid] !== true) continue;
          if (!CITIES.find(function (c) { return c.id === pid; })) continue;
          validPlanned[pid] = true;
        }
        state.plannedCities = validPlanned;
      } else {
        state.plannedCities = {};
      }
      if (saved.cityNotes && typeof saved.cityNotes === "object" && !Array.isArray(saved.cityNotes)) {
        var validNotes = {};
        var noteIds = Object.keys(saved.cityNotes);
        for (var k = 0; k < noteIds.length; k++) {
          var nid = noteIds[k];
          if (typeof saved.cityNotes[nid] !== "string") continue;
          if (!CITIES.find(function (c) { return c.id === nid; })) continue;
          validNotes[nid] = saved.cityNotes[nid];
        }
        state.cityNotes = validNotes;
      } else {
        state.cityNotes = {};
      }
      // ПОРЯДОК ВАЖЕН: checkedSights должен быть загружен ДО Gold-инварианта (раздел 3.3)
      // checkedSights
      if (saved.checkedSights && typeof saved.checkedSights === "object" && !Array.isArray(saved.checkedSights)) {
        var validChecks = {};
        var checkIds = Object.keys(saved.checkedSights);
        for (var ci = 0; ci < checkIds.length; ci++) {
          var ckey = checkIds[ci];
          // Город должен существовать в CITIES
          if (!getCityById(ckey)) continue;
          // Значение должно быть массивом
          var arr = saved.checkedSights[ckey];
          if (!Array.isArray(arr)) continue;
          // Фильтрация: оставить только валидные и уникальные sightId
          var validArr = [];
          if (typeof SIGHTS === "undefined") {
            // data-sights.js не загружен — доверяем старым данным,
            // чтобы не стереть прогресс пользователя (Silver/Gold) при оффлайн-запуске.
            for (var sri = 0; sri < arr.length; sri++) {
              if (typeof arr[sri] === "string" && validArr.indexOf(arr[sri]) === -1) {
                validArr.push(arr[sri]);
              }
            }
          } else {
            // data-sights.js загружен — полная валидация по SIGHTS
            var sights = SIGHTS[ckey];
            if (sights) {
              for (var si = 0; si < arr.length; si++) {
                if (typeof arr[si] !== "string") continue;
                if (validArr.indexOf(arr[si]) !== -1) continue;
                for (var sf = 0; sf < sights.length; sf++) {
                  if (sights[sf].id === arr[si]) { validArr.push(arr[si]); break; }
                }
              }
            }
          }
          if (validArr.length > 0) {
            validChecks[ckey] = validArr;
          }
        }
        state.checkedSights = validChecks;
      } else {
        state.checkedSights = {};
      }
      // milestones
      if (Array.isArray(saved.milestones)) {
        var validMilestones = [];
        var dateRe2 = /^\d{4}-\d{2}-\d{2}$/;
        for (var mi = 0; mi < saved.milestones.length; mi++) {
          var ms = saved.milestones[mi];
          if (!ms || typeof ms !== "object") continue;
          if (typeof ms.cityId !== "string") continue;
          // Проверка существования города
          if (!getCityById(ms.cityId)) continue;
          if (typeof ms.date !== "string" || !dateRe2.test(ms.date)) continue;
          if (ms.tier !== "silver" && ms.tier !== "gold") continue;
          // Дедупликация: пропустить если milestone с теми же cityId+tier уже добавлен
          var msDup = false;
          for (var md = 0; md < validMilestones.length; md++) {
            if (validMilestones[md].cityId === ms.cityId && validMilestones[md].tier === ms.tier) {
              msDup = true;
              break;
            }
          }
          if (msDup) continue;
          validMilestones.push({ cityId: ms.cityId, date: ms.date, tier: ms.tier });
        }
        state.milestones = validMilestones;
      } else {
        state.milestones = [];
      }
      // v3-инвариант: Gold-города не могут быть в plannedCities
      var goldCheckIds = Object.keys(state.plannedCities);
      for (var gi = 0; gi < goldCheckIds.length; gi++) {
        if (getCityTier(goldCheckIds[gi]) === "gold") {
          delete state.plannedCities[goldCheckIds[gi]];
        }
      }
      // checkedSights имеет смысл только для посещённых городов
      var checkedIds = Object.keys(state.checkedSights);
      for (var cui = 0; cui < checkedIds.length; cui++) {
        if (!state.visitedCities[checkedIds[cui]]) {
          delete state.checkedSights[checkedIds[cui]];
        }
      }
      // milestones имеют смысл только для посещённых городов
      var validMs = [];
      for (var vmi = 0; vmi < state.milestones.length; vmi++) {
        if (state.visitedCities[state.milestones[vmi].cityId]) {
          validMs.push(state.milestones[vmi]);
        }
      }
      state.milestones = validMs;
      var needsFix = (typeof saved.travelerName !== "string") ||
        (saved.visitedCities && (typeof saved.visitedCities !== "object" || Array.isArray(saved.visitedCities)));
      if (needsFix) {
        saveState();
      }
    }
  } catch (e) {
    state = {
      currentTab: "passport",
      travelerName: "Белорусский путешественник",
      onboardingComplete: false,
      visitedCities: {},
      plannedCities: {},
      cityNotes: {},
      checkedSights: {},
      milestones: [],
      openedRegions: [],
    };
  }
  state.passportFilter = "all";
  state.passportSearchQuery = "";
  state.mapFilter = state.mapFilter || "all";
  state.stampOverlayCityId = null;
  state.openedRegions = state.openedRegions || [];
}

function saveState() {
  try {
    var toSave = {
      currentTab: state.currentTab,
      travelerName: state.travelerName,
      onboardingComplete: state.onboardingComplete,
      visitedCities: state.visitedCities,
      plannedCities: state.plannedCities,
      cityNotes: state.cityNotes,
      checkedSights: state.checkedSights,
      milestones: state.milestones,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    showToast('Не удалось сохранить данные. Освободите место в браузере.');
  }
}

function switchTab(tabId) {
  if (state.currentTab === "passport") {
    state.passportSearchQuery = "";
    var searchInput = document.getElementById("passport-search");
    if (searchInput) searchInput.value = "";
    var allFilterBtns = document.querySelectorAll(".passport-filter-btn");
    allFilterBtns.forEach(function (b) {
      b.classList.remove("disabled");
      b.classList.toggle("active", b.dataset.filter === state.passportFilter);
    });
  }

  state.currentTab = tabId;
  saveState();

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

function getTodayLocal() {
  return new Date().toLocaleDateString("sv-SE");
}

function normalizeForSearch(str) {
  return str
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/і/g, "и")
    .replace(/ў/g, "в")
    .replace(/[-\s]/g, "")
    .trim();
}

var currentPassportMode = "filter";

function renderPassport() {
  var container = document.getElementById("passport-list");
  if (!container) return;
  var totalVisited = Object.keys(state.visitedCities).length;

  var countEl = document.getElementById("passport-count");
  if (countEl) countEl.textContent = totalVisited + " из " + CITIES.length;

  var newMode = state.passportSearchQuery !== "" ? "search" : "filter";

  function buildHtml() {
    if (newMode === "search") {
      return buildSearchResults();
    }
    return buildFilterAccordions();
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

function buildSearchResults() {
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
    html += '  <div class="passport-search-icon" style="color:' + regionColor + '">' + createStampSVG(city.region) + '</div>';
    html += '  <span class="passport-search-name">' + escapeHtml(city.name) + '</span>';
    html += '  <span class="passport-search-status">' + statusIcon + '</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function buildFilterAccordions() {
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

    var isComplete = regionTotal > 0 && regionVisited === regionTotal;
    var isOpen = state.openedRegions.indexOf(region.id) !== -1;

    html += '<div class="accordion-item' + (isOpen ? ' open' : '') + '" data-region-id="' + region.id + '">';
    html += '  <div class="accordion-header">';
    html += '    <span class="accordion-color-dot" style="background:' + region.color + '"></span>';
    html += '    <span class="accordion-region-name">' + region.name + '</span>';

    if (isComplete) {
      if (region.id === "minsk") {
        html += '    <span class="accordion-badge badge-silver">Старт</span>';
      } else {
        html += '    <span class="accordion-badge badge-gold">Пройден</span>';
      }
    }

    html += '    <span class="accordion-count">' + regionVisited + ' из ' + regionTotal + '</span>';
    html += '    <svg class="accordion-arrow" viewBox="0 0 20 20" fill="currentColor"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>';
    html += '  </div>';
    html += '  <div class="accordion-body">';
    html += '    <div class="accordion-inner">';
    html += '      <div class="stamps-grid">';

    filtered.forEach(function (city) {
      var isVisited = !!state.visitedCities[city.id];
      html += '<div class="stamp-cell' + (isVisited ? ' visited' : '') + '" data-city-id="' + city.id + '">';
      html += '  <div class="stamp-icon' + (isVisited ? ' visited' : '') + '" style="' + (isVisited ? '--region-color:' + region.color + ';color:' + region.color : '') + '">';
      html += createStampSVG(region.id);
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

    var idx = state.openedRegions.indexOf(regionId);
    if (idx !== -1) {
      state.openedRegions.splice(idx, 1);
    } else {
      state.openedRegions.push(regionId);
    }
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
  state.travelerName = name || "Белорусский путешественник";
  state.onboardingComplete = true;
  saveState();
  hideOnboarding();
}

function handleOnboardingSkip() {
  state.travelerName = "Белорусский путешественник";
  state.onboardingComplete = true;
  saveState();
  hideOnboarding();
}

function formatDateDisplay(dateStr) {
  var parts = dateStr.split("-");
  return parts[2] + "." + parts[1] + "." + parts[0];
}

function renderProfile() {
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
  html += '  <div class="chronicle-title">Хроника посещений</div>';
  if (totalVisited === 0) {
    html += '  <p class="chronicle-empty">Вы пока не посетили ни одного города. Отправляйтесь в путь!</p>';
  } else {
    var chronicleItems = [];
    visitedIds.forEach(function (cityId) {
      var city = CITIES.find(function (c) { return c.id === cityId; });
      if (city && state.visitedCities[cityId] && state.visitedCities[cityId].date) {
        chronicleItems.push({ name: city.name, date: state.visitedCities[cityId].date });
      }
    });
    chronicleItems.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.name.localeCompare(b.name, "ru");
    });
    html += '  <ul class="chronicle-list">';
    chronicleItems.forEach(function (item) {
      html += '<li class="chronicle-item">';
      html += '  <span class="chronicle-city">' + escapeHtml(item.name) + '</span>';
      html += '  <span class="chronicle-date">' + formatDateDisplay(item.date) + '</span>';
      html += '</li>';
    });
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

function escapeHtml(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function startEditName() {
  var displayEl = document.getElementById("profile-name-display");
  var editEl = document.getElementById("profile-name-edit");
  var input = document.getElementById("profile-name-input");
  if (!displayEl || !editEl || !input) return;
  input.value = state.travelerName;
  displayEl.style.display = "none";
  editEl.style.display = "flex";
  input.focus();
  input.select();
}

function saveEditName() {
  var input = document.getElementById("profile-name-input");
  if (!input) return;
  var name = input.value.trim();
  state.travelerName = name || "Белорусский путешественник";
  saveState();
  renderProfile();
}

function cancelEditName() {
  renderProfile();
}

let isProcessing = false;
var noteDebounceTimer = null;

function togglePlanned(cityId) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    if (state.visitedCities[cityId]) return;
    if (state.plannedCities[cityId]) {
      delete state.plannedCities[cityId];
    } else {
      state.plannedCities[cityId] = true;
    }
    saveState();
    clearTimeout(noteDebounceTimer);
    noteDebounceTimer = null;
    renderCityCard(cityId);
    if (mapPointsInitialized) {
      updateMapMarkers();
      updateMapFilter();
    }
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}

function saveNote(cityId, text) {
  var trimmed = text.trim();
  if (trimmed) {
    state.cityNotes[cityId] = trimmed;
  } else {
    delete state.cityNotes[cityId];
  }
  saveState();
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
    state.stampOrigin = originMap[state.currentTab] || state.currentTab;
    state.activeOverlayCityId = cityId;

    renderCityCard(cityId);

    document.getElementById("city-card-overlay").style.display = "flex";
    document.getElementById("tab-bar").classList.add("tab-bar-blocked");
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}

function closeCityCard() {
  clearTimeout(noteDebounceTimer);
  var cityId = state.activeOverlayCityId;
  if (cityId) {
    var textarea = document.getElementById("city-card-note");
    if (textarea) saveNote(cityId, textarea.value);
  }

  state.activeOverlayCityId = null;
  state.stampOrigin = null;

  document.getElementById("city-card-overlay").style.display = "none";
  document.getElementById("tab-bar").classList.remove("tab-bar-blocked");

  if (state.currentTab === "passport") {
    renderPassport();
  }
}

function renderCityCard(cityId) {
  var city = CITIES.find(function (c) { return c.id === cityId; });
  if (!city) return;

  var region = REGIONS.find(function (r) { return r.id === city.region; });
  var regionName = region ? region.name : "";
  var regionColor = region ? region.color : "#ccc";
  var isVisited = !!state.visitedCities[cityId];

  var svgBookmarkFilled = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>';
  var svgBookmarkOutlined = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>';

  var html = "";
  html += '<div class="city-card">';

  html += '  <div class="city-card-header">';
  html += '    <div class="city-card-title-block">';
  html += '      <h2 class="city-card-name">' + escapeHtml(city.name) + '</h2>';
  html += '      <p class="city-card-region">' + escapeHtml(regionName) + '</p>';
  html += '    </div>';
  html += '    <div class="city-card-actions">';
  if (!isVisited) {
    if (state.plannedCities[cityId]) {
      html += '      <button class="city-card-btn-wishlist active" id="city-card-wishlist-btn" style="--region-color:' + regionColor + '">' + svgBookmarkFilled + '</button>';
    } else {
      html += '      <button class="city-card-btn-wishlist" id="city-card-wishlist-btn">' + svgBookmarkOutlined + '</button>';
    }
  }
  html += '      <button class="city-card-btn-close" id="city-card-close-btn">&times;</button>';
  html += '    </div>';
  html += '  </div>';

  html += '  <div class="city-card-stamp' + (isVisited ? ' visited' : '') + '" style="' + (isVisited ? '--region-color:' + regionColor + ';color:' + regionColor : 'color:#ccc') + '">';
  html += createStampSVG(city.region);
  html += '  </div>';

  html += '  <p class="city-card-description">' + escapeHtml(city.description) + '</p>';

  var noteValue = state.cityNotes[cityId] || "";
  var notePlaceholder = isVisited ? "Впечатления, заметки на память..." : "Что посмотреть, куда зайти...";
  html += '  <textarea id="city-card-note" class="city-card-note" maxlength="500" placeholder="' + notePlaceholder + '">' + escapeHtml(noteValue) + '</textarea>';

  if (isVisited) {
    var visit = state.visitedCities[cityId];
    html += '  <p class="city-card-date">Дата визита: <span>' + formatDateDisplay(visit.date) + '</span></p>';
    html += '  <button class="city-card-btn city-card-btn-danger" id="city-card-remove-btn">Удалить отметку</button>';
  } else {
    html += '  <button class="city-card-btn city-card-btn-primary" id="city-card-visit-btn">Я здесь был</button>';
  }

  html += '</div>';

  document.getElementById("city-card-content").innerHTML = html;

  var closeBtn = document.getElementById("city-card-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeCityCard);

  if (isVisited) {
    var removeBtn = document.getElementById("city-card-remove-btn");
    if (removeBtn) removeBtn.addEventListener("click", function () { removeVisit(cityId); });
  } else {
    var wishlistBtn = document.getElementById("city-card-wishlist-btn");
    if (wishlistBtn) wishlistBtn.addEventListener("click", function () { togglePlanned(cityId); });
    var visitBtn = document.getElementById("city-card-visit-btn");
    if (visitBtn) visitBtn.addEventListener("click", function () { openDatePicker(cityId); });
  }

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

function openDatePicker(cityId) {
  var city = CITIES.find(function (c) { return c.id === cityId; });
  if (!city) return;

  var today = new Date().toLocaleDateString("sv-SE");

  var html = "";
  html += '<div class="date-picker-card">';
  html += '  <p class="date-picker-title">Когда вы посетили ' + escapeHtml(city.name) + '?</p>';
  html += '  <input type="date" class="date-picker-input" id="date-picker-input" max="' + today + '" value="' + today + '">';
  html += '  <div class="date-picker-actions">';
  html += '    <button class="date-picker-cancel" id="date-picker-cancel-btn">Отмена</button>';
  html += '    <button class="date-picker-confirm" id="date-picker-confirm-btn">Подтвердить</button>';
  html += '  </div>';
  html += '</div>';

  document.getElementById("date-picker-content").innerHTML = html;
  document.getElementById("date-picker-modal").style.display = "flex";

  document.getElementById("date-picker-cancel-btn").addEventListener("click", closeDatePicker);
  document.getElementById("date-picker-confirm-btn").addEventListener("click", function () {
    var input = document.getElementById("date-picker-input");
    var selectedDate = input.value;
    if (!selectedDate) return;
    confirmVisit(cityId, selectedDate);
  });
}

function closeDatePicker() {
  document.getElementById("date-picker-modal").style.display = "none";
}

function confirmVisit(cityId, date) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    clearTimeout(noteDebounceTimer);
    var textarea = document.getElementById("city-card-note");
    if (textarea) saveNote(cityId, textarea.value);

    delete state.plannedCities[cityId];

    state.visitedCities[cityId] = { date: date };
    saveState();
    closeDatePicker();
    state.stampOverlayCityId = cityId;
    renderStampOverlay(cityId);
    document.getElementById("stamp-overlay").style.display = "flex";
    if (mapPointsInitialized) {
      updateMapMarkers();
      updateMapFilter();
    }
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}

function removeVisit(cityId) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    delete state.visitedCities[cityId];
    saveState();
    closeCityCard();

    if (state.currentTab === "profile") {
      renderProfile();
    }
    if (mapPointsInitialized) {
      updateMapMarkers();
      updateMapFilter();
    }
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}

function init() {
  loadState();

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
      state.passportFilter = btn.dataset.filter;
      document.querySelectorAll(".passport-filter-btn").forEach(function (b) {
        b.classList.toggle("active", b.dataset.filter === state.passportFilter);
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
        state.passportSearchQuery = "";
        renderPassport();
        document.querySelectorAll(".passport-filter-btn").forEach(function (b) {
          b.classList.remove("disabled");
          b.classList.toggle("active", b.dataset.filter === state.passportFilter);
        });
        return;
      }
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        state.passportSearchQuery = value.trim();
        renderPassport();
        if (state.passportSearchQuery !== "") {
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
      state.stampOrigin = "map";
      openCityCard(cityId);
    });
  }

  var mapControls = document.querySelector(".map-controls");
  if (mapControls) {
    mapControls.addEventListener("click", function (e) {
      var btn = e.target.closest(".map-filter-btn");
      if (!btn) return;
      state.mapFilter = btn.dataset.mapFilter;
      document.querySelectorAll(".map-filter-btn").forEach(function (b) {
        b.classList.toggle("active", b.dataset.mapFilter === state.mapFilter);
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
      var origin = state.stampOrigin;
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
    if (document.hidden && state.activeOverlayCityId) {
      clearTimeout(noteDebounceTimer);
      var textarea = document.getElementById("city-card-note");
      if (textarea) saveNote(state.activeOverlayCityId, textarea.value);
    }
  });

  window.addEventListener("pagehide", function () {
    if (state.activeOverlayCityId) {
      var textarea = document.getElementById("city-card-note");
      if (textarea) saveNote(state.activeOverlayCityId, textarea.value);
    }
  });

  if (!state.onboardingComplete) {
    showOnboarding();
  }

  switchTab(state.currentTab);
}

document.addEventListener("DOMContentLoaded", init);

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  var hasControllerOnLoad = !!navigator.serviceWorker.controller;
  var updateToastShown = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (hasControllerOnLoad && !updateToastShown) {
      updateToastShown = true;
      showToast("Приложение обновлено");
    }
  });
}
