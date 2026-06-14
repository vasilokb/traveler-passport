# Этап 3 — Карта: 7 маркеров + zoom-aware

## Контекст

Прочитай следующие документы перед началом работы:

1. **Спецификация v3:** `F:\projects\traveler-passport\.kilo\plans\MVP_v3\MVP_v3.md` — Модуль 3 (карта как витрина), Модуль 5 (zoom-aware rendering).

2. **План реализации v3:** `F:\projects\traveler-passport\.kilo\plans\MVP_v3\implementation-plan.md` — этот этап описан в секции «Этап 3. Карта: 7 маркеров + zoom-aware».

3. **Описание текущей кодовой базы (v2):** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\app-description_v2.md` — справочник по существующему коду.

**Суть этапа:** Переписать систему маркеров карты. Вместо двух состояний (непосещённый / посещённый) маркер кодирует 7 визуальных состояний через ранги (Бронза/Серебро/Золото) и флажки планов. Видимость доп.элементов управляется CSS-классами, а не инлайн-стилями. При zoom ≥ 1.8x показываются флажки и числа прогресса.

---

## Что уже сделано (Этапы 1–2)

- `data-sights.js` подключён, `SIGHTS` содержит 15 городов
- `state.checkedSights`, `state.milestones` — загружаются и сохраняются
- Функции: `getCityTier()`, `getCityById()`, `getCheckedCount()`, `getSightsCount()`, `hasChecklist()`
- `toggleSight()` вызывает `updateMapMarkers()` + `updateMapFilter()` после изменения ранга
- `togglePlanned()` вызывает `updateMapMarkers()` + `updateMapFilter()`
- Инвариант «visited wins over planned» удалён — посещённые города могут быть в `plannedCities`
- Gold-города не могут быть в `plannedCities` (очищаются мгновенно в `toggleSight` и при загрузке)

---

## Текущее состояние функций (изучи по app.js)

**`initMapPoints()` (строки 54–115):**
- Создаёт `<g class="map-point">` для каждого города
- Внутри: `hitbox` (circle r=22), `dot` (circle r=7), `map-flag` (g, display="none"), `map-label` (text, visibility="hidden")
- Флаг: `transform="translate(x+5, y-10)"`, содержит line + rect
- Использует `CITIES.forEach()`, `projectToSVG()`, `REGIONS.find()`

**`updateMapMarkers()` (строки 117–146):**
- Для каждой точки: устанавливает `fill` у dot, переключает `display` у flag
- Логика: visited ИЛИ planned → цвет региона; иначе #ccc
- Флаг: planned И НЕ visited → виден; иначе скрыт

**`updateMapFilter()` (строки 148–188):**
- toggle класса `map-point-hidden` по `state.mapFilter`
- Фильтр «planned» → `visible = !!state.plannedCities[cityId]`
- Overlay-текст для planned: упоминает «закладку в шапке» — **устарел**

**`updateMapLabels()` (строки 226–290):**
- Вычисляет `zoomLevel = MAP_ORIG_VB.w / mapViewBox.w`
- При zoom < 1.8 → все labels скрыты
- При zoom ≥ 1.8 → collision detection, видимые labels

**`updateMapViewBox()` (строки 194–201):**
- Обновляет viewBox SVG, вызывает `updateMapLabels()`
- Вызывается при zoom и pan

---

## Конвенции кода (из Этапа 1 — соблюдать)

- `let`/`const` на верхнем уровне, `var` внутри тел функций
- `for (var i = 0; ...)` — НЕ `for (let ...)`
- **Глобальные переменные НЕ переобъявлять:** `mapPointsInitialized` (строка 52), `MAP_ORIG_VB` (строка 190), `mapViewBox` (строка 191) — уже объявлены

---

## Задачи

### 1. `app.js` — хелпер `computeStarPoints(cx, cy, outerR)`

Создать новую функцию рядом с `projectToSVG` (после строки 50). Вычисляет 10 точек 5-конечной звезды как строку для атрибута `points` SVG `<polygon>`.

```javascript
function computeStarPoints(cx, cy, outerR) {
  var innerR = outerR * 0.382;
  var pts = [];
  for (var i = 0; i < 10; i++) {
    var angle = -Math.PI / 2 + i * Math.PI / 5;
    var radius = (i % 2 === 0) ? outerR : innerR;
    pts.push(
      (cx + radius * Math.cos(angle)).toFixed(1) + "," +
      (cy + radius * Math.sin(angle)).toFixed(1)
    );
  }
  return pts.join(" ");
}
```

> **Проверка:** `computeStarPoints(100, 100, 10)` должен вернуть строку из 10 пар координат, первая точка `"100.0,90.0"` (верх звезды).
>
> **⚠️ `cx` и `cy` — чистые числа:** В `initMapPoints` передавай `pos.x` и `pos.y` строго после `projectToSVG(city.lat, city.lon)`. Координаты городов хардкод в `CITIES` — NaN невозможен, но функция не валидирует вход.

---

### 2. `app.js` — переписать `initMapPoints()`

Текущая функция: строки 54–115. **Полностью заменить содержимое функции** (от `function initMapPoints() {` до закрывающей `}`).

Структура каждой точки `<g class="map-point">` расширяется новыми элементами. **Порядок дочерних элементов критичен** (z-order в SVG = порядок документа):

1. `hitbox` — circle r=22 (клик-зона, без изменений)
2. `dot` — circle r=7 (базовая точка)
3. `tier-ring` — circle r=10 (кольцо Серебра, **НОВОЕ**)
4. `tier-num` — text (прогресс «2/4», **НОВОЕ**)
5. `gold-star` — polygon (звезда Золота, **НОВОЕ**)
6. `map-flag` — g (флажок плана, **МОДИФИЦИРОВАН**)
7. `map-label` — text (название города, без изменений)

```javascript
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

    // 3. Tier ring (Silver)
    var tierRing = document.createElementNS(svgNS, "circle");
    tierRing.setAttribute("cx", pos.x);
    tierRing.setAttribute("cy", pos.y);
    tierRing.setAttribute("r", "10");
    tierRing.setAttribute("fill", "none");
    tierRing.setAttribute("stroke", "#C0C0C0");
    tierRing.setAttribute("stroke-width", "2.5");
    tierRing.setAttribute("vector-effect", "non-scaling-stroke");
    tierRing.setAttribute("class", "tier-ring");
    g.appendChild(tierRing);

    // 4. Tier progress number (ЦЕНТР ВНИЗУ маркера — не справа!)
    // tier-num и map-label оба видимы при zoom >= 1.8x для Silver-городов.
    // Если positioned справа (x+14, y) — label (font-size 26, элемент 7 в DOM)
    // рисуется ПОВЕРХ tier-num (font-size 16, элемент 4) и полностью его закрывает.
    // Поэтому tier-num — центрирован ПОД маркером.
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

    // 6. Flag (modified — no display attribute, CSS controls visibility)
    var flagGroup = document.createElementNS(svgNS, "g");
    flagGroup.setAttribute("class", "map-flag");
    flagGroup.setAttribute("transform", "translate(" + (pos.x + 5) + "," + (pos.y - 10) + ")");
    flagGroup.innerHTML =
      '<line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" vector-effect="non-scaling-stroke" stroke-width="2" />' +
      '<rect x="0" y="0" width="10" height="7" fill="currentColor" />';
    g.appendChild(flagGroup);

    // 7. Label (unchanged from v2)
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
```

> **⚠️ Ключевые отличия от v2:**
> - `document.createDocumentFragment()` сохранён — batch-вставка 57 элементов за один reflow, как в v2.
> - Удалён атрибут `display="none"` с `map-flag`. Видимость управляется CSS (раздел 5).
> - Флаг увеличен: line y2=14 (было 12), rect 10×7 (было 8×6).
> - Добавлены элементы: `tier-ring`, `tier-num`, `gold-star`.
> - `REGIONS.find()` заменён на for-цикл (конвенция Этапа 1 — не используем `.find()` в новом коде).
> - `CITIES.forEach()` сохранён — это существующий паттерн функции, не добавляй for-цикл вместо него.

---

### 3. `app.js` — переписать `updateMapMarkers()`

Текущая функция: строки 117–146. **Полностью заменить содержимое функции**.

Принцип: JS только добавляет/убирает класс `.marker-visible` и устанавливает `fill`/`color`. CSS (раздел 5) решает — показывать или нет — на основе zoom-класса `.map--zoomed`.

> **⚠️ Безопасность при пустом слое:** Если юзер на вкладке «Паспорт» или «Профиль» отмечает чекбокс, `toggleSight` вызывает `updateMapMarkers()`. Слой `#map-points-layer` существует в DOM, но точки могут быть не инициализированы (`mapPointsInitialized = false`). `points.forEach` на пустой коллекции — безопасный no-op. **НЕ вызывай** `initMapPoints()` из `updateMapMarkers()` — карта инициализируется при первом открытии вкладки «Карта».

```javascript
function updateMapMarkers() {
  var pointsLayer = document.getElementById("map-points-layer");
  if (!pointsLayer) return;
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

    var tier = getCityTier(cityId);
    var isPlanned = !!state.plannedCities[cityId];

    var dot = point.querySelector(".dot");
    var tierRing = point.querySelector(".tier-ring");
    var tierNum = point.querySelector(".tier-num");
    var goldStar = point.querySelector(".gold-star");
    var flag = point.querySelector(".map-flag");

    // Сброс: убрать marker-visible + очистить динамический контент
    if (dot) dot.classList.remove("dot--hidden");
    if (tierRing) tierRing.classList.remove("marker-visible");
    if (tierNum) {
      tierNum.classList.remove("marker-visible");
      tierNum.textContent = "";  // Сброс: старый «2/4» не должен залипать
    }
    if (goldStar) goldStar.classList.remove("marker-visible");
    if (flag) {
      flag.classList.remove("marker-visible");
      flag.style.color = "";    // Сброс: старый цвет флага не должен протекать
      flag.style.display = "";  // Сброс: вычистить инлайн display из v2 (setAttribute/style)
      flag.removeAttribute("display");  // Сброс: вычистить SVG-атрибут display из v2
    }

    if (tier === null) {
      // Непосещённый
      if (dot) dot.setAttribute("fill", isPlanned ? regionColor : "#ccc");
      if (isPlanned && flag) {
        flag.classList.add("marker-visible");
        flag.style.color = regionColor;
      }

    } else if (tier === "bronze") {
      if (dot) dot.setAttribute("fill", regionColor);
      if (isPlanned && flag) {
        flag.classList.add("marker-visible");
        flag.style.color = "#C0C0C0";
      }

    } else if (tier === "silver") {
      if (dot) dot.setAttribute("fill", regionColor);
      if (tierRing) tierRing.classList.add("marker-visible");
      if (tierNum) {
        tierNum.textContent = getCheckedCount(cityId) + "/" + getSightsCount(cityId);
        tierNum.classList.add("marker-visible");
      }
      if (isPlanned && flag) {
        flag.classList.add("marker-visible");
        flag.style.color = "#FFD700";
      }

    } else if (tier === "gold") {
      // Сброс выше уже очистил tierNum.textContent, flag.style.color,
      // снял .marker-visible с ring/num/flag. Осталась только звезда:
      if (dot) dot.classList.add("dot--hidden");
      if (goldStar) goldStar.classList.add("marker-visible");
    }
  });
}
```

> **⚠️ 7 состояний маркера (полная таблица):**
>
> | # | Ранг | planned? | Точка | Кольцо | Число | Звезда | Флажок (zoom ≥ 1.8) | Цвет флажка |
> |---|---|---|---|---|---|---|---|---|
> | 1 | null | нет | #ccc | — | — | — | — | — |
> | 2 | null | да | regionColor | — | — | — | виден | regionColor (нейтр.) |
> | 3 | bronze | нет | regionColor | — | — | — | — | — |
> | 4 | bronze | да | regionColor | — | — | — | виден | #C0C0C0 (серебр.) |
> | 5 | silver | нет | regionColor | виден | «X/Y» | — | — | — |
> | 6 | silver | да | regionColor | виден | «X/Y» | — | виден | #FFD700 (золот.) |
> | 7 | gold | — | скрыта | — | — | видна | — | — |

> **⚠️ Кольцо и звезда не зависят от zoom:** Они видны всегда при наличии `.marker-visible`. Только флажки и числа прогресса — zoom-gated (раздел 5).

> **⚠️ `CITIES.find()` заменён на `getCityById()`:** Функция создана в Этапе 1. Используй её вместо inline `.find()`.

> **⚠️ ПОКРАСКА ФЛАГА — только `flag.style.color`:** Внутри `<g class="map-flag">` лежат `<line stroke="currentColor">` и `<rect fill="currentColor">`. CSS-функция `currentColor` автоматически наследует значение `color` от родительского `<g>`. Поэтому единственный способ поменять цвет флага — `flag.style.color = "#FFD700"`. **НЕ перезаписывай** `flag.innerHTML`, **НЕ** устанавливай `stroke`/`fill` атрибуты на `<line>`/`<rect>` напрямую. При сбросе ставь `flag.style.color = ""`, чтобы старый цвет не протекал на следующий рендер.

> **⚠️ СБРОС `tierNum.textContent = ""`:** При переходе Серебро → Бронза (юзер снял галочки) класс `.marker-visible` снимается, но без очистки `textContent` старый текст «2/4» остаётся в DOM. Если CSS где-то даст сбой — цифра вылезет. Всегда зануляй `textContent` в сбросе.

---

### 4. `app.js` — zoom-aware класс на SVG

В функции `updateMapLabels()` (строки 226–290). Эта функция вызывается при каждом изменении viewBox (через `updateMapViewBox()`).

В существующем коде **уже есть** расчёт зума примерно на строке 233. Найди его и добавь **одну строку** сразу после.

**ДО (существующий код, ~строка 233):**
```javascript
  var zoomLevel = MAP_ORIG_VB.w / mapViewBox.w;
  // ... существующий collision detection для меток ...
```

**ПОСЛЕ (вставь ровно одну строку):**
```javascript
  var zoomLevel = MAP_ORIG_VB.w / mapViewBox.w;
  svg.classList.toggle("map--zoomed", zoomLevel >= 1.8);  // ← НОВАЯ СТРОКА
  // ... существующий collision detection для меток без изменений ...
```

> **⚠️ КРИТИЧНО — не дублируй переменные:** В существующем коде `updateMapLabels` уже объявлены `var svg` (строка 227) и `var zoomLevel` (строка 233). Добавляй **только** `svg.classList.toggle(...)` — ровно одну строку после `zoomLevel`. Никаких повторных `var svg`, `document.getElementById("belarus-map")` или второго `var zoomLevel` внутри этой функции. Весь остальной код (collision detection, цикл по меткам, `updateMapViewBox`) — **без изменений**.

---

### 5. `style.css` — zoom-aware маркеры

Добавить в конец файла (после существующих map-стилей, строки ~1285–1303).

```css
/* ===== v3 Map markers ===== */

/* По умолчанию: все доп.элементы скрыты */
.tier-ring,
.tier-num,
.gold-star,
.map-flag {
  display: none;
}

/* Dot скрыт для Gold */
.dot.dot--hidden {
  display: none;
}

/* Звезда и кольцо — всегда видны при наличии класса (не зависят от zoom) */
/* display: block — для SVG-элементов безопаснее, чем inline (iOS WebKit) */
.gold-star.marker-visible {
  display: block;
}

.tier-ring.marker-visible {
  display: block;
}

/* Флажки и числа прогресса — только при zoom >= 1.8x */
.map--zoomed .map-flag.marker-visible {
  display: block;
}

.map--zoomed .tier-num.marker-visible {
  display: block;
}
```

> **⚠️ Принцип:** JS только добавляет/убирает `.marker-visible`. CSS решает — показывать или нет — на основе zoom-класса `.map--zoomed`. Звезда и кольцо — безусловны (видны на любом zoom). Флажки и числа — только при zoom ≥ 1.8x.
>
> **⚠️ Существующий CSS `.map-point-hidden { display: none; }` (строка 1301) НЕ трогать** — он управляет фильтрацией (визит/план), а не рангами.

---

### 6. `app.js` — обновить overlay-текст в `updateMapFilter()`

Текущая функция: строки 148–188. Логика фильтрации **без изменений** — `visible = !!state.plannedCities[cityId]` уже корректно показывает и непосещённые (вишлист), и посещённые («Доисследовать»).

**Единственное изменение:** обновить устаревший overlay-текст для фильтра «planned» (строка ~182):

```javascript
      if (filter === "planned") {
        overlayText.textContent = "Нет городов в планах. Нажмите на иконку закладки или медали в карточке города, чтобы добавить его сюда.";
      }
```

---

## Критерии готовности

После выполнения всех задач проверь:

1. **Нет JS-ошибок** — карта открывается и работает без ошибок в консоли
2. **Маркер непосещённого города без плана** — серая точка (#ccc), нет кольца/числа/звезды/флажка
3. **Маркер непосещённого города в плане** (zoom ≥ 1.8x) — цветная точка (regionColor) + флажок цвета региона
4. **Маркер Бронзы без плана** — цветная точка (regionColor), нет доп.элементов
5. **Маркер Бронзы в плане** (zoom ≥ 1.8x) — цветная точка + серебряный флажок (#C0C0C0)
6. **Маркер Серебра без плана** — цветная точка + серебряное кольцо (r=10) + число «X/Y» (при zoom ≥ 1.8x)
7. **Маркер Серебра в плане** (zoom ≥ 1.8x) — точка + кольцо + число + золотой флажок (#FFD700)
8. **Маркер Золота** — точка скрыта, золотая звезда видна. Нет флажка (недоступен)
9. **Zoom-aware:**
   - При zoom < 1.8x: флажки и числа скрыты, но кольца и звёзды видны
   - При zoom ≥ 1.8x: всё видимо
   - Плавный переход при зуме (класс `.map--zoomed` toggлится)
10. **Фильтр «В планах»** показывает и непосещённые (вишлист), и посещённые города («Доисследовать»)
11. **Overlay-текст** для пустого фильтра «В планах» обновлён
12. **Клик по маркеру** открывает карточку города (без изменений)
13. **Отметка пункта чек-листа в карточке** → маркер на карте мгновенно обновляется (если вкладка карты уже была открыта)
14. **Все 7 состояний** проверить: выбрать города с разными комбинациями visited/planned/tier, открыть карту, zoom in/out

---

## Важно — НЕ модифицировать

- **НЕ изменяй** массивы `CITIES`, `REGIONS`, объект `SIGHTS`
- **НЕ изменяй** функции zoom/pan: `zoomAtPoint()`, `resetMapZoom()`, обработчики touch/mouse/drag (строки 1770–1945)
- **НЕ изменяй** `updateMapViewBox()` — только `updateMapLabels()` добавляет zoom-класс
- **НЕ изменяй** collision detection в `updateMapLabels()` (логика overlap — строки 246–289)
- **НЕ изменяй** клик-обработчик карты (строки 1749–1757) — `openCityCard` вызывается как в v2
- **НЕ изменяй** обработчики фильтров карты (строки 1760–1769) — `updateMapFilter()` вызывается как в v2
- **НЕ изменяй** SVG path Беларуси (строка 59 в index.html)
- **НЕ изменяй** `renderCityCard()`, `renderPassport()`, `renderProfile()` — это Этапы 2/4/5
- **НЕ изменяй** `createStampSVG()` — это Этап 4
- **НЕ обновляй** `sw.js` — это Этап 6
- **НЕ изменяй** `projectToSVG()` — система координат карты не меняется
- **`updateMapMarkers()` НЕ должна вызывать перерендер карточки** — `closeCityCard()`, `renderCityCard()` и т.п. Когда юзер кликает чекбокс внутри карточки, `updateMapMarkers()` обновляет только SVG-слой `#map-points-layer`. Если она затронет DOM карточки — скролл пользователя сбросится.
- **НЕ перезаписывай `innerHTML` SVG-контейнера** `#belarus-map` при изменении зума. `updateMapLabels()` вызывается на **каждый** жест — зум, pan, drag. Класс `.map--zoomed` добавляется **строго** через `classList.toggle`. Перезапись `innerHTML` внутри `updateMapLabels()` моргнёт картой, сбросит текущий drag/pan и подвесит приложение.
