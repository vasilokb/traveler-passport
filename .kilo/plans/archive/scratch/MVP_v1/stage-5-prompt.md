# Промпт: Этап 5 — Экран-эмоция, Карта Беларуси и умные фильтры

Это Этап 5 из 6. **Этапы 1–4 уже реализованы** — в проекте есть рабочие файлы `index.html`, `style.css`, `app.js` с Каталогом, Паспортом (аккордеоны + штампы), Профилем, онбордингом и карточкой города с выбором даты. Теперь нужно добавить экран «Штамп получен», интерактивную карту Беларуси и фильтры с пустыми состояниями.

**Не переписывай всё с нуля.** Дописывай и модифицируй существующие файлы. Вся текущая функциональность должна работать без регрессий.

⚠️ **ЖЁСТКОЕ ТРЕБОВАНИЕ:** При обновлении файла `app.js` **запрещено удалять, сокращать или заменять заглушками** массив `CITIES` (57 городов) и массив `REGIONS` (7 регионов). Весь справочник данных должен остаться в коде в неизменном и полном виде. Новый код размещай **выше** массивов.

---

## 0. АРХИТЕКТУРНЫЕ ПРАВИЛА (КРИТИЧНО — прочитай первым)

Эти правила предотвращают конкретные баги, которые LLM допускает в 90% случаев. Нарушение любого из них = переделка.

### 0.1. Сохранение фокуса поиска
Функция `renderCatalog()` должна обновлять **только** внутренний контейнер `#catalog-list`. Инпут поиска и табы-фильтры — **статичные HTML-элементы**, они не перерендериваются. При обновлении списка городов инпут **не должен** терять фокус, текст или позицию курсора.

### 0.2. Строгое делегирование событий
**Запрещено** `querySelectorAll().forEach(btn => btn.addEventListener(...))` на кнопки фильтров, точки карты или строки городов. Все обработчики — через делегирование на родительских контейнерах:
- **Клики** по фильтрам Каталога → делегирование `click` на контейнере `.catalog-controls`, проверка `event.target.closest('.filter-btn')`.
- **Клики** по фильтрам Карты → делегирование `click` на контейнере `.map-controls`, проверка `event.target.closest('.map-filter-btn')`.
- **Ввод поиска** → делегирование `input` на контейнере `.catalog-controls`, проверка `event.target.id === 'catalog-search'`. **⚠️ Критично:** debounce 300мс применяется **только** к обработке `input` на `#catalog-search`. Не вешай debounced-обработчик на весь контейнер без проверки `e.target` — иначе debounce подавит клики по кнопкам фильтров внутри того же `.catalog-controls`.
- Точки карты → делегирование на `#map-container` (проверка `event.target.closest('.map-point')`).
- Строки Каталога → делегирование на `#catalog-list` (уже существует из Этапа 1).

Альтернатива: вешать `input` напрямую на `#catalog-search` (один элемент — один слушатель, это допустимо). Но клики по кнопкам фильтров — **только** через делегирование.

Функция инициализации событий вызывается **один раз** при старте приложения.

### 0.3. Hydration ephemeral-полей
Поля `state.catalogFilter`, `state.catalogSearchQuery`, `state.mapFilter`, `state.stampOverlayCityId`, `state.openedRegions` — **ephemeral**, не сохраняются в `saveState()`. После `loadState()` (который десериализует JSON из localStorage) эти поля могут быть `undefined`. **Обязательно** добавляй дефолтные значения после десериализации:

```js
state.catalogFilter = state.catalogFilter || 'all';
state.catalogSearchQuery = state.catalogSearchQuery || '';
state.mapFilter = state.mapFilter || 'all';
state.stampOverlayCityId = null;
state.openedRegions = state.openedRegions || [];
```

**Поведение `openedRegions`:** это **ephemeral по дизайну** — при перезагрузке страницы все аккордеоны в Паспорте будут закрыты. Это ожидаемое поведение: пользователь уже перешёл в Паспорт через целевое действие «В коллекцию», раскрытый аккордеон — одноразовый визуальный фидбек. Не добавляй `openedRegions` в `saveState()`.

---

## Слои оверлеев (z-index)

```
z-index: 0    → Вкладка (Каталог / Паспорт / Карта / Профиль)
z-index: 100  → Карточка города (#city-card-overlay)
z-index: 200  → Модалка выбора даты (#date-picker-modal)
z-index: 300  → Экран «Штамп получен» (#stamp-overlay)
```

---

## 1. ЭКРАН «ШТАМП ПОЛУЧЕН» (z-index: 300)

Показывается после подтверждения даты в `confirmVisit()`. Карточка города под ним **не закрывается**.

### Содержимое (строгий порядок сверху вниз):

1. **Крупный штамп** — через `createStampSVG(regionId)` (функция из Этапа 3), увеличен до ~200×200px. `regionId` получается так: `const city = CITIES.find(c => c.id === cityId); const regionId = city.region;`.
2. **CSS-анимация «впечатывания»** — `@keyframes stamp-imprint`: от `scale(1.6) rotate(-15deg) opacity(0)` до `scale(1) rotate(0deg) opacity(1)`, ~0.4s, `ease-out`.
3. **Название города** — крупный жирный текст.
4. **Кнопка «Поделиться» (≥ 44×44px)** — Web Share API. Fallback на ПК: `navigator.clipboard.writeText()` + тост «Текст скопирован» (`#toast`, `position: fixed; bottom: 90px`, исчезает через 2 сек).
5. **Кнопка «В коллекцию» (≥ 44×44px)** — закрывает штамп и карточку, переключает на Паспорт (подробности ниже).

### Кнопка «В коллекцию» — подробная логика:
1. Закрыть `#stamp-overlay`.
2. Закрыть карточку города (`closeCityCard()`).
3. `state.currentTab = 'passport'`.
4. Определить регион: `CITIES.find(c => c.id === cityId).region`.
5. Добавить `regionId` в `state.openedRegions` (если нет).
6. Переключить вкладку → `renderPassport()`.
7. **С задержкой `setTimeout(300)`** — `scrollIntoView({ behavior: 'smooth', block: 'center' })` к ячейке штампа и класс `.highlight` на 2 сек (пульсация `box-shadow`). Задержка критична: `renderPassport()` выставляет `openedRegions` до рендера, но CSS-анимация аккордеона (`grid-template-rows: 0fr → 1fr`) занимает ~300ms — без задержки `scrollIntoView` попадёт в нулевую высоту. Альтернатива `requestAnimationFrame` не гарантирует завершение CSS-перехода.

### Закрытие по фону:
Тап по пустому месту оверлея → проверка `event.target === event.currentTarget` → закрыть штамп и карточку → возврат на вкладку `state.stampOrigin`.

**⚠️ Важно:** при закрытии через «В коллекцию» возврат на `stampOrigin` **НЕ** делается — пользователь целевым действием перешёл в Паспорт.

### Обновление `confirmVisit()`:
Заменить заглушку (`console.log`) на: установить `state.stampOverlayCityId = cityId`, вызвать `renderStampOverlay(cityId)`, показать `#stamp-overlay`.

---

## 2. ИНТЕРАКТИВНАЯ КАРТА БЕЛАРУСИ

### Замена заглушки `#tab-map`

Убрать «Карта (скоро)». Секция содержит:
- Переключатель фильтра: «Все города / Посещённые» (статичный HTML).
- Контейнер `#map-container` с SVG-картой и слоем точек `#map-points-layer`.
- Плашка empty state `#map-empty-state` (скрыта по умолчанию).

**Шаблон HTML для `#tab-map`:**
```html
<div class="map-controls">
  <button class="map-filter-btn active" data-map-filter="all">Все города</button>
  <button class="map-filter-btn" data-map-filter="visited">Посещённые</button>
</div>
<div id="map-container">
  <!-- SVG карта вставляется сюда -->
  <div id="map-empty-state" class="empty-state" style="display:none;">
    Вы пока не отметили ни одного города...
  </div>
</div>
```

### SVG-карта — ЖЁСТКО ЗАДАННЫЙ КОНТУР (не генерировать!)

**⚠️ КРИТИЧНО:** Контур Беларуси **запрещено генерировать, угадывать или рисовать**. Используй **только** данные из файла `.kilo/plans/belarus-border-path.txt` — это реальный контур из Wikimedia Commons (Equirectangular/Plate Carrée проекция, N/S stretching 170%).

**Исходные данные карты:**
- **ViewBox:** `1.472 1.809 1626.241 1450.672`
- **Географические границы:** N: 56.4°, S: 51.1°, W: 22.9°, E: 33.0°
- **Проекция:** Equirectangular (Plate Carrée), N/S stretching 170%
- **Источник:** Wikimedia Commons, `Belarus_location_map.svg` by NordNordWest (CC BY-SA 3.0 / GFDL)
- **Элемент:** `path#path10` — контур сухопутной границы Беларуси

**Внедрение в HTML:**
Прочитай файл `.kilo/plans/belarus-border-path.txt`, возьми строку path data (после заголовков) и вставь её как `<path d="..."/>` в inline SVG внутри `#map-container`. **Path data — это 13K символов, она будет предоставлена отдельно** — не пытайся её запомнить или сократить. Вставляй целиком, без пропусков. SVG: `viewBox="1.472 1.809 1626.241 1450.672"`, `width: 100%; height: auto;`.

```html
<svg id="belarus-map" viewBox="1.472 1.809 1626.241 1450.672" 
     width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
  <path d="<!-- ВСТАВИТЬ ДАННЫЕ ИЗ belarus-border-path.txt СЮДА -->" 
        fill="#e8e8e8" stroke="#ccc" stroke-width="1"/>
  <g id="map-points-layer"></g>
</svg>
```

**⚠️ НЕ пытайся аппроксимировать контур. НЕ генерируй точки самостоятельно. Только данные из файла.**

**Если файл `belarus-border-path.txt` не найден** — не пытайся сгенерировать контур. Выведи в `console.error('belarus-border-path.txt not found')` и используй запасной прямоугольник в `#map-container`: `<rect x="200" y="200" width="1200" height="1000" fill="#e8e8e8" stroke="#ccc"/>` — это лучше, чем фейковый контур.

### Функция `projectToSVG(lat, lon)`
Переводит GPS-координаты в SVG-точки **внутри заданного viewBox**.

**Точные параметры (выведены из viewBox и географических границ):**
```js
const MAP = {
  viewBoxX: 1.472,   viewBoxY: 1.809,
  viewBoxW: 1626.241, viewBoxH: 1450.672,
  geoN: 56.4,  geoS: 51.1,
  geoW: 22.9,  geoE: 33.0
};

function projectToSVG(lat, lon) {
  const x = MAP.viewBoxX + ((lon - MAP.geoW) / (MAP.geoE - MAP.geoW)) * MAP.viewBoxW;
  const y = MAP.viewBoxY + ((MAP.geoN - lat) / (MAP.geoN - MAP.geoS)) * MAP.viewBoxH;
  return { x, y };
}
```

**Проверка калибровки** (подставь в `projectToSVG` и проверь, что точки внутри контура):
- Брест (52.097, 23.685) → должен быть юго-запад
- Витебск (55.184, 30.205) → должен быть северо-восток
- Гродно (53.669, 23.823) → северо-запад
- Гомель (52.435, 30.988) → юго-восток
- Полоцк (55.485, 28.761) → север

Если точки попадают внутрь контура — калибровка верна. Если нет — проверь, что viewBox и path data совпадают.

### 57 точек городов
Рендерятся динамически в `<g id="map-points-layer">`. Посещённые — цвет региона (`REGIONS.color`), непосещённые — серые (`#ccc`). Каждая точка — группа `<g class="map-point" data-city-id="...">`:
- Визуальный `<circle>` (r=4–6).
- Невидимый хитбокс `<circle r="22">` (44px / 2). **Критично:** `fill="transparent"`, **не `fill="none"`** — `fill="none"` пропускает клики насквозь.

Тап по точке → `state.stampOrigin = 'map'` → `openCityCard(cityId)`.

### Фильтр и Empty State карты
- «Все города» — видны все 57 точек.
- «Посещённые» — непосещённые скрываются. Если `Object.keys(state.visitedCities).length === 0`: слой точек `opacity: 0.15` (блёклый силуэт), по центру — плашка: *«Вы пока не отметили ни одного города. Перейдите в Каталог или Паспорт, чтобы поставить первые штампы!»*

### Функция `renderMap()`
Генерирует точки в `#map-points-layer` на основе `state.visitedCities` и `state.mapFilter`. Вызывается при переключении на вкладку `map`.

---

## 3. ФИЛЬТРЫ И ПОИСК В КАТАЛОГЕ

**Шаблон HTML для контролов Каталога (вставить в `#tab-catalog` перед `#catalog-list`):**
```html
<div class="catalog-controls">
  <input type="text" id="catalog-search" placeholder="Поиск города..." />
  <div class="filter-tabs">
    <button class="filter-btn active" data-filter="all">Все</button>
    <button class="filter-btn" data-filter="visited">Посещённые</button>
    <button class="filter-btn" data-filter="unvisited">Непосещённые</button>
  </div>
</div>
<div id="catalog-list"><!-- рендерится динамически --></div>
```

### Поиск
Инпут `<input type="text" id="catalog-search" placeholder="Поиск города...">` — статичный HTML, не перерендеривается. Высота ≥ 44px. Фильтрация по `city.name.toLowerCase().includes(query)` — не RegExp (спецсимволы `()*+` не должны крашить). Пустые регионы скрываются. **Debounce 300 мс** на обработчик ввода — через `setTimeout`/`clearTimeout`, не внешнюю библиотеку.

### Табы-фильтры (строго три)
- **«Все»** — `state.catalogFilter = 'all'`
- **«Посещённые»** — `state.catalogFilter = 'visited'`
- **«Непосещённые»** — `state.catalogFilter = 'unvisited'`

Статичные кнопки в HTML. Активный фильтр визуально выделен.

### Empty States Каталога (точные тексты из MVP)
- Фильтр «Посещённые» при 0 отметок → *«Здесь появятся города, которые вы посетили. Время отправляться в путь!»*
- Фильтр «Непосещённые» при 57/57 → *«Ура! Вы прошли всю Беларусь! Все штампы собраны.»*

### Обновление `renderCatalog()`
Функция фильтрует `CITIES` по `state.catalogFilter` и `state.catalogSearchQuery`, группирует по регионам, скрывает пустые регионы. **Рендерит только `#catalog-list`**, не трогает инпут и кнопки.

---

## ИЗМЕНЕНИЯ В ФАЙЛАХ

### index.html
- Добавить статичные контролы в `#tab-catalog`: инпут `#catalog-search` и контейнер `.filter-tabs` с тремя кнопками.
- Заменить заглушку `#tab-map`: переключатель фильтра, SVG-карта с `<g id="map-points-layer">`, плашка `#map-empty-state`.
- Добавить `#stamp-overlay` (скрыт, `z-index: 300`) и `#toast` (скрыт) перед `</body>`.

### style.css
- Фильтры и поиск: кнопки ≥ 44px высота, инпут `font-size: 16px` (против iOS zoom).
- Карта: SVG адаптивна, точки стилизованы, хитбоксы `fill="transparent"`.
- Штамп: анимация `stamp-imprint`, подсветка `stamp-highlight` (пульсация `box-shadow` на 2 сек).
- Тост: `position: fixed; bottom: 90px; z-index: 400;`.
- Empty states: центрированный текст, `color: #8e8e93`.

### app.js
Добавить:
- Ephemeral-поля в `state`: `catalogFilter`, `catalogSearchQuery`, `mapFilter`, `stampOverlayCityId`.
- Функции: `renderStampOverlay(cityId)`, `closeStampOverlay()`, `goToCollection(cityId)`, `showShareText(cityName)`, `projectToSVG(lat, lon)`, `renderMap()`.
- Обновить: `confirmVisit()`, `renderCatalog()`, функцию переключения вкладок (вызывать `renderMap()` при `tab === 'map'`).

---

## КРИТЕРИИ ГОТОВНОСТИ

**5a. Экран «Штамп получен»:**
1. [ ] После подтверждения даты — полноэкранный штамп с анимацией впечатывания.
2. [ ] Порядок кнопок: сначала «Поделиться», потом «В коллекцию».
3. [ ] «Поделиться» — системный диалог (мобильные) или копирование + тост (ПК).
4. [ ] «В коллекцию» → Паспорт, нужный аккордеон раскрыт, скролл к штампу с подсветкой.
5. [ ] Тап по фону → закрытие штампа и карточки, возврат на `stampOrigin`.
6. [ ] «В коллекцию» НЕ вызывает возврат на `stampOrigin`.

**5b. Карта:**
7. [ ] SVG-карта — узнаваемый контур Беларуси, точки внутри границ.
8. [ ] 57 точек: посещённые — цветные, непосещённые — серые. Хитбоксы кликабельны.
9. [ ] Тап по точке → карточка города, `stampOrigin = 'map'`.
10. [ ] Фильтр «Все / Посещённые» работает.
11. [ ] Empty state при 0 посещённых: блёклый силуэт + плашка.

**5c. Каталог:**
12. [ ] Поиск фильтрует по мере ввода, не теряет фокус.
13. [ ] Три фильтра: «Все» / «Посещённые» / «Непосещённые».
14. [ ] Empty state «Посещённые» при 0: точный текст из MVP.
15. [ ] Empty state «Непосещённые» при 57/57: точный текст из MVP.

**Общие:**
16. [ ] Все обработчики — через делегирование, не индивидуальные слушатели.
17. [ ] Ephemeral-поля инициализируются после `loadState()`.
18. [ ] Массивы `CITIES` и `REGIONS` — в полном и неизменном виде.
19. [ ] Все предыдущие экраны работают без регрессий.
