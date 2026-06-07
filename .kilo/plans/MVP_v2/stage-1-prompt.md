# Этап 1 — Модель данных + миграция + структура HTML

## Контекст

Прочитай следующие документы перед началом работы — они содержат полное описание текущей кодовой базы, спецификацию v2 и план реализации:

1. **Описание текущего приложения (v1):** `F:\projects\traveler-passport\.kilo\plans\MVP_v1\app-description.md` — детальный разбор всех функций, стилей, модели данных, структуры HTML. Это твой справочник по существующему коду.

2. **Концепция v2:** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\MVP_v2.md` — глобальные изменения: удаление Каталога, 3 вкладки, wishlist, заметки, новые фильтры.

3. **План реализации v2:** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\implementation-plan.md` — этот этап описан в секции «Этап 1. Модель данных + миграция + структура HTML».

---

## Задачи

### 1. app.js — модель данных

**Новые persistent-поля в `state`:**
- `plannedCities: {}` — `{cityId: true}` для городов в вишлисте. Посещённый город **не может** быть в `plannedCities`
- `cityNotes: {}` — `{cityId: "текст заметки"}`. Заметка переживает удаление визита и снятие флага «В планах». Пустая заметка удаляется из объекта

**Новые эфемерные поля (НЕ сохраняются в localStorage):**
- `passportFilter: "all"` — активный фильтр вкладки Паспорт (all / visited / unvisited / planned)
- `passportSearchQuery: ""` — текст поиска в Паспорте

**Удалить эфемерные поля:**
- `catalogFilter`
- `catalogSearchQuery`

⚠️ **Важно:** кроме удаления из определения объекта `state`, нужно также удалить строки инициализации в теле `loadState()` (примерно строки 452–453):
```js
// УДАЛИТЬ эти строки:
state.catalogFilter = state.catalogFilter || "all";
state.catalogSearchQuery = state.catalogSearchQuery || "";
```
Вместо них добавить инициализацию новых эфемерных полей:
```js
state.passportFilter = "all";
state.passportSearchQuery = "";
```

**Обновить `saveState()`:**
- Добавить в объект сохранения: `plannedCities` и `cityNotes`
- Защита Safari: `localStorage.setItem` уже обёрнут в `try...catch` (v1), но убедиться, что при ошибке приложение продолжает работать в памяти, не падая. Показать тост с предупреждением

**Обновить `loadState()`:**
- Загружать `plannedCities` (валидация: каждый id существует в CITIES, значение === `true`)
- Загружать `cityNotes` (валидация: каждый id существует в CITIES, значение — строка)
- **Миграция v1→v2:** если загруженный `currentTab === "catalog"` → заменить на `"passport"`
- **Инвариант:** после загрузки гарантировать, что ни один город не находится одновременно в `visitedCities` и `plannedCities`. При конфликте — `visitedCities` побеждает (удалить из `plannedCities`)
- Дефолтный `currentTab` в определении `state` и в `catch`-блоке изменить с `"catalog"` на `"passport"`

### 2. index.html — структура

**Удалить:**
- Секцию `#tab-catalog` целиком (строки 35–48)

**Обновить `#tab-passport`:**
Заменить текущую шапку:
```html
<header class="passport-header">
  <h1>Мой паспорт</h1>
  <div class="passport-progress">
    <span id="passport-count" class="passport-count">0 из 57</span>
  </div>
</header>
<div id="passport-list"></div>
```
На новую с блоком контролов:
```html
<header class="passport-header">
  <h1>Мой паспорт</h1>
  <div class="passport-progress">
    <span id="passport-count" class="passport-count">0 из 57</span>
  </div>
</header>
<div class="passport-controls">
  <form class="passport-search-form" onsubmit="return false">
    <input type="search" id="passport-search" placeholder="Поиск города..." autocomplete="off">
  </form>
  <div class="passport-filter-tabs">
    <button class="passport-filter-btn active" data-filter="all">Все</button>
    <button class="passport-filter-btn" data-filter="visited">Посещённые</button>
    <button class="passport-filter-btn" data-filter="unvisited">Непосещённые</button>
    <button class="passport-filter-btn" data-filter="planned">В планах</button>
  </div>
</div>
<div id="passport-list"></div>
```

**Обновить фильтры карты** (секция `#tab-map`): заменить 2 кнопки на 3:
```html
<div class="map-controls">
  <button class="map-filter-btn active" data-map-filter="all">Все города</button>
  <button class="map-filter-btn" data-map-filter="visited">Посещённые</button>
  <button class="map-filter-btn" data-map-filter="planned">В планах</button>
</div>
```

**Обновить `#tab-bar`:** удалить кнопку «Каталог» (кнопка с data-tab="catalog" и SVG-иконкой списка), оставить 3 кнопки: Паспорт, Карта, Профиль. Убрать класс `.active` с Каталога, поставить на Паспорт:
```html
<nav id="tab-bar">
  <button class="tab-btn active" data-tab="passport">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>
    <span>Паспорт</span>
  </button>
  <button class="tab-btn" data-tab="map">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
    <span>Карта</span>
  </button>
  <button class="tab-btn" data-tab="profile">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    <span>Профиль</span>
  </button>
</nav>
```

### 3. style.css — базовые изменения

**Удалить стили Каталога** (они больше не используются — Паспорт использует собственные классы `.accordion-*`, `.stamps-grid`, `.stamp-cell`, `.stamp-icon`, `.stamp-name`, которые не пересекаются с Каталогом):
- `.catalog-header`
- `.catalog-controls`
- `.catalog-empty-state` (если есть)
- `.region-group`, `.region-header`, `.region-dot`, `.region-name`
- `.city-item` и модификаторы (`:active`, `.visited`, `.city-name`)
- `.city-check` и модификаторы
- `#catalog-search` и `#catalog-search:focus`
- Стили фильтров Каталога: `.filter-tabs`, `.filter-btn`, `.filter-btn.active`

**Добавить минимальные стили для новых элементов Паспорта** (полные стили — в этапе 2, здесь только чтобы не было сломанной вёрстки):
```css
/* Passport controls — temporary basic styles (full styles in Stage 2) */
.passport-controls {
  padding: 0 0 12px 0;
}

.passport-search-form {
  margin-bottom: 8px;
}

#passport-search {
  width: 100%;
  min-height: 44px;
  font-size: 16px;
  padding: 0 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  box-sizing: border-box;
  outline: none;
}

#passport-search:focus {
  border-color: #27AE60;
}

.passport-filter-tabs {
  display: flex;
  gap: 6px;
}

.passport-filter-btn {
  flex: 1;
  min-height: 36px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.passport-filter-btn.active {
  background: #1a1a1a;
  color: #fff;
  border-color: #1a1a1a;
}
```

**Обновить `#tab-bar`** для 3 кнопок: каждая `flex: 1` (было 4, стало 3 — автоматически станет шире, специфичных CSS-изменений не требуется, flexbox распределит равномерно).

### 4. app.js — минимальные правки для работоспособности

**Удалить функции и обработчики Каталога:**
- Функцию `renderCatalog()` целиком
- Функцию `handleCatalogClick()` целиком

**Обновить `switchTab()`:**
- Убрать ветку `"catalog"` из switch/if (больше не существует)
- Убрать вызов `renderCatalog()`

**Обновить `init()`:**
- Удалить обработчики событий Каталога (click на `#catalog-list`, click на `.filter-btn`, input на `#catalog-search`)
- Удалить строку первичного рендера `renderCatalog()` (строка ~1242). Начальный рендер обеспечивается `switchTab(state.currentTab)` на следующей строке — при `currentTab === "passport"` он вызовет `renderPassport()`
- Убедиться, что `switchTab(state.currentTab)` работает с новыми тремя вкладками

**Обновить обработчики карты:**
- Существующий делегированный обработчик на `.map-controls` (строки ~1024–1035) уже ловит клики по всем `.map-filter-btn`, включая новую кнопку «В планах». Добавить проверку: при `state.mapFilter === "planned"` — toggle active класса, но **НЕ вызывать** `renderMap()` (он не знает про фильтр "planned" — это этап 4). Для остальных фильтров (`"all"`, `"visited"`) — `renderMap()` вызывается как обычно

---

## Критерии готовности

После выполнения всех задач:

1. Приложение загружается без JS-ошибок в консоли
2. Таб-бар показывает 3 вкладки: Паспорт, Карта, Профиль
3. Вкладка «Паспорт» открывается по умолчанию с аккордеонами + новая строка поиска + 4 фильтр-кнопки
4. Вкладка «Карта» показывает 3 фильтр-кнопки (Все города / Посещённые / В планах)
5. Переключение между 3 вкладками работает корректно
6. Карточка города открывается из Паспорта и Карты
7. Данные v1 в localStorage корректно мигрируют: `currentTab: "catalog"` → `"passport"`, `plannedCities` и `cityNotes` инициализируются как `{}`

## Важно

- **НЕ удаляй и НЕ модифицируй** массивы `CITIES` (57 городов) и `REGIONS` (7 регионов)
- **НЕ модифицируй** функции карты (renderMap, zoom, labels) — это этап 4
- **НЕ модифицируй** renderCityCard, renderProfile, renderStampOverlay — они обновляются в этапах 3 и 4
- **НЕ добавляй** логику поиска и фильтрации Паспорта — это этап 2. Здесь только HTML-структура и базовые стили
