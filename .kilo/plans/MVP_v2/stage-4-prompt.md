# Этап 4 — Карта: 3 маркера + 3 фильтра + обновление профиля

## Контекст

Прочитай следующие документы перед началом работы — они содержат полное описание текущей кодовой базы, спецификацию v2 и план реализации:

1. **Описание текущего приложения (v1):** `F:\projects\traveler-passport\.kilo\plans\MVP_v1\app-description.md` — детальный разбор всех функций, стилей, модели данных, структуры HTML. Это твой справочник по существующему коду.

2. **Концепция v2:** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\MVP_v2.md` — глобальные изменения: 3 состояния города (непосещён / посещён / в планах), маркеры карты, фильтры.

3. **План реализации v2:** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\implementation-plan.md` — этот этап описан в секции «Этап 4. Карта: 3 маркера + 3 фильтра + обновление профиля».

**Что уже сделано (Этапы 1–3):**
- Каталог удалён. Таб-бар: 3 вкладки (Паспорт, Карта, Профиль)
- В `state` добавлены `plannedCities: {}`, `cityNotes: {}`, `passportFilter: "all"`, `passportSearchQuery: ""`
- `saveState()` / `loadState()` сохраняют и загружают `plannedCities` и `cityNotes`
- Паспорт имеет поиск + 4 фильтра + плоский список результатов
- Карточка города: bookmark-кнопка в шапке, textarea заметки, debounce + lifecycle-save
- В HTML на карте 3 фильтр-кнопки (Все / Посещённые / В планах), но `renderMap()` **не обрабатывает «planned»** — текущий обработчик при `state.mapFilter === "planned"` делает ранний `return` без вызова `renderMap()`

**Текущее состояние функций, которые нужно модифицировать (изучи по файлу app.js):**

`renderMap()` (~строки 52–127):
- Делает `pointsLayer.innerHTML = ""` — **полностью пересобирает DOM** при каждом вызове
- Рендерит hitbox + dot + label для каждого города
- Поддерживает 2 стиля точек: серый (#ccc) и цветной (region color)
- Не знает про `plannedCities` и фильтр `"planned"`
- Вызывает `updateMapLabels()` в конце

`switchTab("map")` (~строка 542):
- Вызывает `renderMap()` напрямую

Обработчик фильтров карты (~строки 1225–1237):
- Делегированный click на `.map-controls`
- При `state.mapFilter === "planned"` делает `return` без рендера (заглушка из этапа 1)
- При остальных фильтрах вызывает `renderMap()`

---

## Задачи

### 1. app.js — заменить `renderMap()` на три функции

Текущая `renderMap()` пересобирает DOM при каждом вызове — это медленно и неприемлемо для частых переключений фильтра. Заменить на три специализированные функции:

#### 1.1. `initMapPoints()` — одноразовая инициализация

Вызывается **один раз** при первом открытии вкладки «Карта». Рендерит все 57 `<g class="map-point">` в `#map-points-layer`.

Добавить переменную уровня модуля (рядом с `mapViewBox`):
```js
var mapPointsInitialized = false;
```

Логика:
- Если `mapPointsInitialized === true` → `return` (повторные вызовы игнорируются)
- Очистить `pointsLayer.innerHTML`
- Для каждого города из `CITIES`:
  - Вычислить позицию через `projectToSVG(city.lat, city.lon)`
  - Найти регион для цвета: `REGIONS.find(r => r.id === city.region)`
  - Создать `<g class="map-point" data-city-id="{id}">` с четырьмя дочерними элементами:
    1. `<circle class="hitbox" cx="..." cy="..." r="22" fill="transparent"/>` — зона тапа 44dp
    2. `<circle class="dot" cx="..." cy="..." r="7" fill="{dotColor}"/>` — видимая точка
    3. `<g class="map-flag" transform="translate({x+5},{y-10})" display="none">` — SVG-флаг (изначально скрыт через атрибут `display="none"`). Содержимое флага:
       ```html
       <line x1="0" y1="0" x2="0" y2="12" stroke="currentColor" vector-effect="non-scaling-stroke"/>
       <rect x="0" y="0" width="8" height="6" fill="currentColor"/>
       ```
    4. `<text class="map-label" ...>` — подпись (как в текущей реализации)
  - `dotColor` = серый (#ccc) — начальный цвет, будет обновлён `updateMapMarkers()`
- ⚠️ **Для производительности:** добавляй все `<g class="map-point">` в `pointsLayer` через `DocumentFragment` (один `appendChild` фрагмента вместо 57 отдельных). Вызов `updateMapMarkers()` — строго после того, как фрагмент встроен в DOM.
- Установить `mapPointsInitialized = true`
- Вызвать `updateMapLabels()`
- Вызвать `updateMapMarkers()` — ⚠️ **ОБЯЗАТЕЛЬНО:** подтягивает актуальные цвета и флаги при первой инициализации, когда пользователь уже отметил города на других вкладках
- ⚠️ **Порядок критичен:** `updateMapMarkers()` должен вызываться строго ПОСЛЕ того, как все сгенерированные `<g class="map-point">` добавлены в `pointsLayer` (через `appendChild` или `DocumentFragment`). Если вызвать раньше — `querySelectorAll(".map-point")` вернёт пустую коллекцию

⚠️ **Сборка SVG-элементов:** Контейнер точки `<g class="map-point">` и контейнер флага `<g class="map-flag">` создаются через `document.createElementNS("http://www.w3.org/2000/svg", "g")`. Однако для наполнения вложенной геометрии флага разрешается использовать `.innerHTML` — это безопасно внутри SVG-контекста и не плодит рутинный код.

Пример сборки элемента флага:
```js
var flagGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
flagGroup.setAttribute("class", "map-flag");
flagGroup.setAttribute("transform", "translate(" + (pos.x + 5) + "," + (pos.y - 10) + ")");
flagGroup.setAttribute("display", "none");  // SVG-атрибут, не style.display
flagGroup.innerHTML = '<line x1="0" y1="0" x2="0" y2="12" stroke="currentColor" vector-effect="non-scaling-stroke"/><rect x="0" y="0" width="8" height="6" fill="currentColor"/>';
```

⚠️ **Видимость SVG-элементов:** используй SVG-атрибут `display` (`setAttribute("display", "none")` / `setAttribute("display", "inline")`), а не `style.display`. WebKit (iOS Safari) обрабатывает SVG-атрибут `display` надёжнее, чем инлайн-стиль.

#### 1.2. `updateMapMarkers()` — обновление стилей при изменении состояния

Вызывается при: чекин, удаление визита, toggle planned, а также при каждом открытии вкладки «Карта» (в `switchTab`).

Логика:
- Найти все `.map-point` элементы: `pointsLayer.querySelectorAll(".map-point")`
- Для каждого:
 - Прочитать `cityId` через `point.getAttribute("data-city-id")` — единый способ чтения во всех трёх функциях
  - Найти город: `CITIES.find(function (c) { return c.id === cityId; })`

  ⚠️ **Сравнение без приведения типов:** `getAttribute` возвращает строку, `CITIES[].id` — тоже строка (`"minsk"`, `"mir"` и т.д.). Прямое сравнение `c.id === cityId` работает корректно. **НЕ используй `Number(cityId)`** — `Number("minsk")` вернёт `NaN`, и ни один город не будет найден.
  - Найти регион: найденный город → `REGIONS.find(function (r) { return r.id === city.region; })`
  - Определить состояние:
    - `isVisited = !!state.visitedCities[cityId]`
    - `isPlanned = !!state.plannedCities[cityId]`
  - Обновить dot (`circle.dot`):
    - Посещённый → `fill = region.color`
    - В планах → `fill = region.color`
    - Непосещённый → `fill = "#ccc"`
  - Обновить флаг (`g.map-flag`):
    - ⚠️ Сначала найти элемент: `point.querySelector(".map-flag")`. Если не найден — пропустить.
    - В планах и НЕ посещённый → `setAttribute("display", "inline")`, `style.color = region.color`
    - В остальных случаях → `setAttribute("display", "none")`

#### 1.3. `updateMapFilter()` — CSS-фильтрация без пересборки DOM

Вызывается при: клик на `.map-filter-btn`, открытие вкладки «Карта».

Логика:
- Найти все `.map-point` элементы
- Определить `filter = state.mapFilter || "all"`
- Для каждого `.map-point`:
  - Прочитать `cityId` через `point.getAttribute("data-city-id")` (единый паттерн для всех трёх функций)
  - Найти город: `CITIES.find(function (c) { return c.id === cityId; })` — без `Number()`, ID — строки
  - Определить видимость:
    - `"all"` → видимый (убрать класс `.map-point-hidden`)
    - `"visited"` → видимый только если `state.visitedCities[cityId]`
    - `"planned"` → видимый только если `state.plannedCities[cityId]`
  - Toggle класс `.map-point-hidden` (`display: none`) на основе видимости
- Управление empty state:
  - Посчитать количество видимых точек (без `.map-point-hidden`)
  - Если 0 видимых → показать `.map-empty-overlay` (`display: flex`), а текст подсказки записать в элемент `#map-empty-overlay-text` через `textContent`:
    - `"visited"` при 0 посещённых: «Вы пока не отметили ни одного города. Откройте карточку города и нажмите "Я здесь был"»
    - `"planned"` при 0 запланированных: «Нет городов в планах. Откройте карточку города и нажмите закладку в шапке»
  - Если есть видимые → скрыть `.map-empty-overlay` (`display: none`)
  - Для `"all"` empty state невозможен (всегда 57 городов)

⚠️ **Не вызывать `updateMapLabels()` из `updateMapFilter()`** — подписи не зависят от фильтра. `updateMapLabels()` вызывается только из `initMapPoints()` и `updateMapViewBox()`.

#### 1.4. Удалить `renderMap()`

Полностью удалить функцию `renderMap()`. Все вызовы заменить:
- `switchTab("map")` → см. секцию 2
- Обработчик фильтров карты → см. секцию 3
- Других вызовов `renderMap()` в коде нет (проверь через поиск)

### 2. app.js — обновить `switchTab()`

Заменить текущую ветку:
```js
if (tabId === "map") {
  renderMap();
}
```
На:
```js
if (tabId === "map") {
  if (!mapPointsInitialized) {
    initMapPoints();
  }
  updateMapMarkers();
  updateMapFilter();
}
```

Это гарантирует: при первом открытии — полная инициализация; при повторных — только обновление маркеров и фильтра.

### 3. app.js — обновить обработчики фильтров карты

В `init()` заменить текущий обработчик (строки ~1225–1237):
```js
// УДАЛИТЬ весь блок:
var mapControls = document.querySelector(".map-controls");
if (mapControls) {
  mapControls.addEventListener("click", function (e) {
    var btn = e.target.closest(".map-filter-btn");
    if (!btn) return;
    state.mapFilter = btn.dataset.mapFilter;
    document.querySelectorAll(".map-filter-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mapFilter === state.mapFilter);
    });
    if (state.mapFilter === "planned") return;
    renderMap();
  });
}
```
На новый:
```js
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
```

### 4. app.js — обновить профиль `renderProfile()`

После блока общей статистики (после строки `html += '</div>';` закрывающей `.profile-stat-total` и прогресс-бар, ~строка 813) добавить строку «В планах»:

```js
html += '<div class="profile-planned-row">';
html += '  <span class="profile-planned-label">В планах</span>';
html += '  <span class="profile-planned-count">' + totalPlanned + '</span>';
html += '</div>';
```

Где `totalPlanned` — количество ключей в `state.plannedCities` со значением `true`. Для безопасности считать через фильтр: `Object.keys(state.plannedCities).filter(function (k) { return state.plannedCities[k] === true; }).length`. Вычислить в начале `renderProfile()` рядом с `totalVisited`.

Разместить **до** разделителя `.profile-divider` перед «Прогресс по регионам» — строка «В планах» визуально примыкает к общей статистике.

### 5. app.js — обновить `removeVisit()` для карты

В текущей реализации `removeVisit()` вызывает `renderProfile()` если текущая вкладка — профиль. Аналогично, если карта уже инициализирована — нужно обновить маркеры:

После `closeCityCard()` внутри `removeVisit()` добавить:
```js
if (mapPointsInitialized) {
  updateMapMarkers();
  updateMapFilter();
}
```

### 6. app.js — обновить `confirmVisit()` для карты

После чекина город может перейти из «в планах» в «посещённые» — маркер на карте должен обновиться. Добавить в конце `confirmVisit()` (после показа stamp-overlay):
```js
if (mapPointsInitialized) {
  updateMapMarkers();
  updateMapFilter();
}
```

### 7. app.js — обновить `togglePlanned()` для карты

После toggle planned-статуса маркер на карте должен обновиться. Добавить в конце `togglePlanned()` (после `renderCityCard(cityId)`):
```js
if (mapPointsInitialized) {
  updateMapMarkers();
  updateMapFilter();
}
```

### 8. index.html — заменить empty state на overlay

Заменить текущий `#map-empty-state` (строки 62–64):
```html
<div id="map-empty-state" class="empty-state" style="display:none;">
  Вы пока не отметили ни одного города. Перейдите в Паспорт, чтобы поставить первые штампы!
</div>
```
На overlay-элемент:
```html
<div id="map-empty-overlay" class="map-empty-overlay" style="display:none;">
  <p id="map-empty-overlay-text"></p>
</div>
```

Этот элемент позиционируется абсолютно **поверх** SVG-карты (не внутри `<svg>`), с полупрозрачным фоном. Текст устанавливается из `updateMapFilter()`.

### 9. style.css — новые стили

```css
/* Скрытие маркеров при фильтрации */
.map-point-hidden {
  display: none;
}

/* Empty state overlay поверх карты */
.map-empty-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
  z-index: 5;
}

.map-empty-overlay p {
  font-size: 0.9375rem;
  color: #666;
  text-align: center;
  padding: 0 24px;
  line-height: 1.5;
}

/* ⚠️ Zoom-кнопки должны быть выше overlay (z-index: 5), чтобы оставаться кликабельными при пустом фильтре */
.map-zoom-controls,
.map-zoom-btn {
  z-index: 10;
}

/* Profile planned count */
.profile-planned-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.profile-planned-label {
  font-size: 0.875rem;
  color: #666;
}

.profile-planned-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
}
```

**Удалить** старый стиль `.empty-state` если он использовался только для карты (проверь использование класса в других местах перед удалением).

---

## Критерии готовности

После выполнения всех задач:

1. **3 фильтра карты** работают корректно: «Все» показывает 57 точек, «Посещённые» — только посещённые, «В планах» — только запланированные
2. **3 стиля маркеров:** серый (непосещён), цветной (посещён), цветной + флаг (в планах)
3. **Флаг** отображается справа-сверху от точки, цвет = цвет региона, при зуме остаётся чётким (`vector-effect="non-scaling-stroke"`)
4. **При чекине** флаг исчезает с карты (автоматическое снятие planned → updateMapMarkers)
5. **При toggle planned** флаг появляется/исчезает без пересборки DOM
6. **При удалении визита** точка становится серой, флаг не появляется (planned был снят при чекине)
7. **Empty state:** фильтр «В планах» при 0 → overlay с текстом-подсказкой; фильтр «Посещённые» при 0 → overlay
8. **Профиль** показывает «В планах: X» под общей статистикой
9. **Производительность:** переключение фильтров не пересобирает DOM (только toggle CSS-классов)
10. **Зум и панорамирование** работают без изменений (подписи, zoom-кнопки, pinch-to-zoom)

---

## Важно

- **НЕ удаляй и НЕ модифицируй** массивы `CITIES` (57 городов) и `REGIONS` (7 регионов)
- **НЕ модифицируй** систему зума карты (`zoomAtPoint`, `resetMapZoom`, `updateMapViewBox`, `updateMapLabels`, обработчики mouse/touch) — она работает корректно
- **НЕ модифицируй** `renderPassport()`, `handlePassportClick()`, обработчики поиска/фильтров Паспорта
- **НЕ модифицируй** `renderCityCard()`, `togglePlanned()`, `saveNote()`, `closeCityCard()`, `confirmVisit()`, `removeVisit()` — в секциях 5–7 добавляй код **в конец** существующих функций, не переписывая их
- **НЕ модифицируй** модель данных (`state`, `loadState`, `saveState`)
- **НЕ модифицируй** HTML-структуру Паспорта, Профиля, таб-бара — только заменяй `#map-empty-state` на `#map-empty-overlay`