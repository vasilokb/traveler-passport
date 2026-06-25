# Паспорт путешественника по Беларуси v3 — Описание приложения и кодовой базы

> **Версия документа:** v3 — после реализации всех 6 этапов геймификации.
> **Предыдущая версия:** `MVP_v2/app-description_v2.md` — справочник по коду до v3.

---

## 1. Что делает приложение

**Паспорт путешественника по Беларуси** — мобильное PWA-приложение для коллекционирования цифровых штампов городов Беларуси. Пользователь отмечает посещённые города, собирает штампы по регионам, исследует достопримечательности, повышает ранги городов (Бронза → Серебро → Золото), отслеживает прогресс на карте и в профиле.

### Основные сценарии использования

**Отметить посещение города (Бронза):**
Пользователь находит город (через поиск, в списке по регионам или на карте), открывает карточку города, нажимает «Я здесь был», выбирает дату визита. На экране появляется анимированный штамп. Город получает ранг **Бронза**. Штамп добавляется в коллекцию в разделе «Паспорт».

**Исследовать достопримечательности (Серебро и Золото):**
Для 15 ключевых городов (Топ-15) в карточке доступен чек-лист достопримечательностей. Отметка 50% пунктов повышает город до **Серебра** (milestone записывается в хронику). Отметка 100% — до **Золота** (чек-лист сворачивается в золотой аккордеон). При повышении/понижении ранга штамп в паспорте обновляется: серебряные получают кольцо, золотые — полностью золотую заливку.

**Запланировать поездку (вишлист + Доисследовать):**
Непосещённые города можно добавить в «В планах» (иконка закладки в карточке). Посещённые города ранга Бронза или Серебро можно отметить «Доисследовать» — они попадают в планы с цветным флажком на карте (серебряным для Бронзы, золотым для Серебра). Города Золота автоматически убираются из планов — исследованы полностью.

**Просмотреть коллекцию штампов:**
Вкладка «Паспорт» показывает коллекцию в виде аккордеонов по 7 регионам. Штампы стилизованы по рангу: бронзовые — цвет региона, серебряные — + серебряное кольцо, золотые — полностью золото + свечение. Доступен поиск и 4 фильтра.

**Исследовать карту:**
Вкладка «Карта» показывает интерактивную SVG-карту с 7 визуальными состояниями маркеров: серая точка (не посещён, не в планах), цветная точка (Бронза), цветная точка + серебряное кольцо + счётчик (Серебро), золотая звезда (Золото), флажки для запланированных/доисследуемых. Зум, панирование, подписи при zoom ≥ 1.8x.

**Отслеживать статистику и достижения:**
Вкладка «Профиль» показывает имя путешественника, общую статистику, **панель орденов** (🥇 Золото / 🥈 Серебро / 🥉 Бронза — счётчики по рангам), прогресс-бары по 7 регионам, и **Хронику достижений** — единый список визитов и milestone'ов, отсортированный по дате.

### Технические характеристики

| Параметр | Значение |
|----------|----------|
| Форм-фактор | Строго мобильный, портретная ориентация, 390–430dp |
| Стек | Чистый HTML + CSS + JavaScript (`"use strict"`, без сборки, без библиотек) |
| Хранение | `localStorage`, ключ `"travelerPassport"`, бэкенда нет |
| PWA | manifest.json, Service Worker (v3 кэш), оффлайн, SVG-иконки |
| Вкладки | 3: Паспорт, Карта, Профиль |
| Города | 57 в 7 регионах |
| Чек-листы | 15 городов (Топ-15), 49 достопримечательностей |
| Ранги | 4: null (не посещён) → Bronze → Silver → Gold |
| Запуск | `file:///` или HTTP, деплой в подпапку (все пути относительные) |

---

## 2. Файловая структура

```
F:\projects\traveler-passport\
├── index.html              (109 строк)   — HTML-разметка
├── style.css               (1615 строк)  — все стили
├── app.js                  (2227 строк)  — вся логика
├── data-sights.js          (83 строки)   — данные чек-листов (NEW v3)
├── manifest.json           (22 строки)   — PWA-манифест
├── sw.js                   (42 строки)   — Service Worker (v3 кэш)
├── icon-192.svg                           — иконка 192px
├── icon-512.svg                           — иконка 512px
└── .kilo/plans/
    ├── MVP_v1/                            — спецификация + промпты v1
    ├── MVP_v2/                            — спецификация + промпты v2
    │   └── app-description_v2.md          — описание кодовой базы v2
    └── MVP_v3/                            — спецификация + промпты v3
        ├── MVP_v3.md                      — спецификация v3
        ├── implementation-plan.md         — план реализации (6 этапов)
        ├── stage-1-prompt.md … stage-6-prompt.md
        └── app-description_v3.md          — этот документ
```

---

## 3. index.html — Структура разметки (109 строк)

### 3.1. `<head>` (строки 1–11)
Без изменений из v2: `charset`, viewport с `user-scalable=no`, `theme-color` (#2c3e50), подключение `manifest.json`, `icon-192.svg`, `style.css`.

### 3.2. Онбординг (`#onboarding-overlay`, строки 13–23)
Без изменений из v2.

### 3.3. Контейнер приложения (`#app`, строки 25–87)
Без изменений из v2: три вкладки (Паспорт, Карта, Профиль), tab-bar с 3 кнопками.

**Вкладка «Профиль» (`#tab-profile`):** Пустой контейнер, полностью рендерится JS в `renderProfile()` — теперь включает панель орденов и Хронику достижений.

### 3.4. Оверлеи (строки 89–100)
Без изменений из v2: city-card-overlay (z100), date-picker-modal (z200), stamp-overlay (z300), toast (z400).

### 3.5. Скрипты (строки 101–109)
- **Строка 101:** `<script src="data-sights.js"></script>` — **NEW v3**, загружается перед app.js
- **Строка 103:** `<script src="app.js"></script>`
- **Строка 105:** Регистрация `sw.js`

> **⚠️ Порядок важен:** `data-sights.js` должен загружаться до `app.js`, т.к. `app.js` ссылается на глобальный объект `SIGHTS`.

---

## 4. data-sights.js — Данные чек-листов (NEW v3, 83 строки)

Отдельный файл с `"use strict"`, объявляет глобальный объект `SIGHTS`.

### Структура

```javascript
var SIGHTS = {
  "minsk": [
    { "id": "s0", "name": "Троицкое предместье" },
    { "id": "s1", "name": "Верхний город и Ратуша" },
    ...
  ],
  "nesvizh": [ ... ],
  ...
};
```

- **Ключ** — `cityId` (строка, соответствует `CITIES[].id`)
- **Значение** — массив объектов `{id, name}`, где `id` — строка вида `"s0"`, `"s1"`, ...
- **15 городов** с чек-листами (Топ-15), остальные 42 — без чек-листов (ранг всегда Бронза)

### Города с чек-листами

| Город | Регион | Кол-во пунктов |
|-------|--------|----------------|
| Минск | Минск | 4 |
| Несвиж | Минская обл. | 3 |
| Мир | Минская обл. | 3 |
| Заславль | Минская обл. | 3 |
| Полоцк | Витебская | 4 |
| Витебск | Витебская | 4 |
| Браслав | Витебская | 3 |
| Брест | Брестская | 3 |
| Пинск | Брестская | 4 |
| Гродно | Гродненская | 4 |
| Новогрудок | Гродненская | 3 |
| Лида | Гродненская | 2 |
| Могилёв | Могилёвская | 3 |
| Гомель | Гомельская | 3 |
| Туров | Гомельская | 3 |
| **Всего** | | **49 пунктов** |

---

## 5. style.css — Стили (1615 строк)

### Структура по секциям

| Строки (прибл.) | Секция | Изменения v3 |
|-----------------|--------|-------------|
| 1–30 | Сброс и базовые стили | — |
| 32–101 | Система вкладок и Tab Bar | — |
| 103–196 | Онбординг | — |
| 198–430 | Профиль (имя, статистика, прогресс-бары) | — |
| **431–476** | **Панель орденов + milestone-хроника** | **NEW** |
| 478–840 | Паспорт (sticky, поиск, фильтры, аккордеоны) | tier-gold glow (670–672) |
| 842–984 | Карточка города — базовые стили | — |
| **985–1010** | **Обложка города** | **NEW** |
| **1012–1037** | **Бейдж ранга (tier badge)** | **NEW** |
| **1039–1206** | **Чек-лист (items, progress, gold accordion)** | **NEW** |
| 1208–1286 | Дата-пикер | — |
| 1288–1438 | Карта (header, controls, container, points) | — |
| 1440–1456 | Профиль — блок «В планах» | — |
| 1458–1556 | Экран «Штамп получен» | — |
| 1558–1578 | Тост | — |
| 1580–1585 | Адаптив @media | — |
| **1587–1615** | **v3 Map markers (rings, nums, stars)** | **NEW** |

### 5.1. Новые стили v3 — детально

**Панель орденов (строки 431–462):**
- `.profile-awards`: flex, justify-center, gap 24px, border-top, padding-top 16px
- `.award-item`: flex-column, align-center
- `.award-emoji`: 1.75rem
- `.award-count`: 1.25rem, bold 700
- `.award-label`: 0.75rem, #666

**Milestone-записи в хронике (строки 464–476):**
- `.chronicle-item.milestone`: фон #FFFAEB, border-radius 8px, padding 12px
- `.chronicle-item.milestone .chronicle-city`: цвет #B8860B, bold 600

**Золотое свечение штампа (строки 670–672):**
- `.stamp-cell.tier-gold .stamp-icon`: `filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.4))` — мягкое свечение для золотых штампов в сетке паспорта (48px). В карточке города (80px) свечение не применяется.

**Обложка города (строки 985–1010):**
- `.city-card-cover-wrapper`: width 100%, height 180px, overflow hidden, border-radius 16px 16px 0 0
- `.city-card-cover-placeholder`: absolute, inset 0, gradient `linear-gradient(135deg, #2c2c2c, #1a1a1a)` (вариант `.unvisited`: темнее)
- `.city-card-cover`: width/height 100%, object-fit cover — `<img>` с `onerror` → скрывается, остаётся градиент

**Бейдж ранга (строки 1012–1037):**
- `.city-card-tier-badge`: inline-flex, gap 4px, padding 4px 10px, border-radius 20px, font-size 0.8125rem, font-weight 600
- `.tier-bronze`: фон #F0E0D0, цвет #8B4513
- `.tier-silver`: фон #E8E8E8, цвет #666
- `.tier-gold`: фон #FFF3B0, цвет #B8860B

**Чек-лист (строки 1039–1168):**
- `.city-card-checklist`: margin-bottom 20px
- `.checklist-header`: flex space-between, transition opacity 0.35s (fade при сворачивании)
- `.checklist-title`: bold 700, 1rem
- `.checklist-count`: 0.8125rem, #999
- `.checklist-progress-track`: height 6px, border-radius 3px, фон #f0f0f0
- `.checklist-progress-fill`: height 100%, border-radius 3px, `transition: width 0.3s`
- `.checklist-items`: `display: grid`, `grid-template-rows: 1fr` → `.checklist-collapsed` → `0fr`, `transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1)` — плавное сворачивание для Gold
- `.checklist-items-inner`: `min-height: 0`, `overflow: hidden`, `transition: opacity 0.3s`
- `.checklist-item`: flex, gap 12px, min-height 44px, border-bottom, cursor pointer, `:active` → #f9f9f9
- `.checklist-item.disabled`: opacity 0.6, pointer-events none (для непосещённых городов)
- `.checklist-checkbox`: 24×24px, border 2px #ccc, border-radius 6px, transition all 0.2s
- `.checklist-checkbox.checked`: фон и border = `var(--region-color, #27AE60)`
- `.checklist-item-name.checked`: line-through, color #999
- `.checklist-manifest`: курсив, фон #f9f9f9, border-radius 12px — placeholder для посещённых городов без чек-листа

**Золотой аккордеон чек-листа (строки 1170–1206):**
- `.checklist-gold-header`: flex space-between, padding 12px 16px, gradient `linear-gradient(135deg, #FFF3B0, #FFE873)`, border-radius 12px, cursor pointer, `animation: checklist-gold-fade-in 0.35s`
- `.checklist-gold-badge`: bold 700, color #B8860B
- `.checklist-gold-arrow::after`: ` ▾` (свёрнут) → `.expanded` → ` ▴` (развёрнут)

**v3 Map markers (строки 1587–1615):**
- `.tier-ring, .tier-num, .gold-star`: `display: none` по умолчанию — скрывают tier-элементы
- `.dot.dot--hidden`: `display: none` — скрывает точку для Gold городов (звезда заменяет)
- `.gold-star.marker-visible, .tier-ring.marker-visible`: `display: block` — показ элементов для Silver/Gold
- `.tier-num.marker-visible`: `display: block`, opacity 0, transform scale(0.6), transition 0.25s
- `.map--zoomed .tier-num.marker-visible`: opacity 1, transform scale(1) — числа появляются только при зуме

---

## 6. app.js — Детальный разбор логики (2227 строк)

### 6.1. Константы и конфигурация (строки 1–58)

**`REGIONS`** (строки 3–11): Массив из 7 объектов `{id, name, color}`:

| # | id | Название | Цвет |
|---|----|----------|------|
| 1 | minsk | Минск | **#2980B9** (изменён в v3, было #C0C0C0) |
| 2 | minsk_obl | Минская | #E74C3C |
| 3 | brest | Брестская | #3498DB |
| 4 | grodno | Гродненская | #27AE60 |
| 5 | vitebsk | Витебская | #F39C12 |
| 6 | mogilev | Могилёвская | #9B59B6 |
| 7 | gomel | Гомельская | #1ABC9C |

**`REGION_ICONS`** (строки 13–21): Объект с SVG-path иконками для каждого региона — уникальные силуэты зданий/достопримечательностей внутри штампа.

**`createStampSVG(regionId, tier)`** (строки 23–47): Генерирует SVG-разметку штампа. **Сигнатура изменена в v3** — добавлен параметр `tier` (по умолчанию `"bronze"`):
- viewBox `0 0 100 100`
- Круглая зубчатая рамка (36 точек) — `fill: none, stroke: currentColor, stroke-width: 2.5, opacity: 0.5`
- **Silver:** добавляет серебряное кольцо (`<circle r=47 fill=none stroke=#C0C0C0 stroke-width=2.5>`) + `<g>` обёртка
- **Gold:** полностью золото (`color="#FFD700"`) + золотое кольцо (`<circle r=47 fill=none stroke=#FFD700 stroke-width=2.5>`)
- Внутренняя иконка региона по центру

**`computeStarPoints(cx, cy, outerR)`** (строки 70–82): **NEW v3** — вычисляет 10-точечный полигон звезды (5 вершин + 5 впадин) для золотых маркеров на карте.

**`MAP`** (строки 49–58): Параметры проекции (без изменений).

### 6.2. Проекция координат (строки 60–68)

**`projectToSVG(lat, lon)`**: Линейная проекция GPS → SVG (без изменений).

### 6.3. Рендер карты — три функции (строки 84–298)

Карта использует трёхфункциональную архитектуру: одноразовое построение DOM + обновление стилей + фильтрация через CSS-классы. Перестройки DOM при смене фильтра или отметке города не происходит.

**`mapPointsInitialized`** (строка 84): Флаг — построены ли DOM-точки.

**`initMapPoints()`** (строки 86–182): **Переписана в v3.** Одноразовое построение DOM-точек. Для каждого города создаёт `<g class="map-point">` с элементами:
- `<circle class="hitbox">` — r=22, fill transparent (зона тапа 44dp)
- `<circle class="dot">` — r=7, fill #ccc
- `<circle class="tier-ring">` — r=11, fill none, stroke-width 3 (NEW v3 — для Silver)
- `<text class="tier-num">` — font-size 14, fill #fff, stroke #000, dy 0.35em (NEW v3 — счётчик "X/Y" для Silver)
- `<polygon class="gold-star">` — 10-точечная звезда (NEW v3 — для Gold)
- `<g class="map-flag">` — флажок для запланированных городов: `<line>` + `<rect>`, `display: none`
- `<text class="map-label">` — название, visibility hidden, font-size 26, белый контур

**`updateMapMarkers()`** (строки 184–256): **Переписана в v3.** Обновление стилей точек без перестройки DOM. Для каждого `.map-point`:
1. Вычисляет `tier` через `getCityTier(cityId)`, `isVisited`, `isPlanned`
2. **Сброс:** удаляет `.marker-visible`, `.dot--hidden` классы; сбрасывает dot fill
3. **Рендер по tier:**
   - `null` (не посещён): dot fill #ccc (серый); если planned — fill цвет региона + `.marker-visible` на флаге
   - `bronze`: dot fill цвет региона; если planned — fill цвет региона + флаг `.marker-visible`
   - `silver`: dot fill цвет региона; `.marker-visible` на tier-ring; ring stroke #C0C0C0; tier-num текст "X/Y" + `.marker-visible`; если planned — флаг golden
   - `gold`: `.dot--hidden` (прячет точку); `.marker-visible` на gold-star; star fill #FFD700; star stroke цвет региона
4. Обновляет SVG `color` атрибут для `currentColor` в флажке

**`updateMapFilter()`** (строки 258–298): Фильтрация точек через CSS-класс (без изменений по структуре).

### 6.4. Система зума карты (строки 300–334)

**`MAP_ORIG_VB`** (300), **`mapViewBox`** (301), **`suppressMapClick`** (302) — переменные состояния.

- **`updateMapViewBox()`** (304–311): Устанавливает viewBox, меняет курсор, вызывает `updateMapLabels()`. **v3:** добавляет/удаляет класс `.map--zoomed` на SVG при zoomLevel >= 1.8 — управляет видимостью tier-num.
- **`zoomAtPoint(cx, cy, factor)`** (313–326): Зум «к точке», лимиты 1x–5x.
- **`resetMapZoom()`** (328–334): Сброс к исходному viewBox.

### 6.5. Подписи городов на карте (строки 336–401)

**`updateMapLabels()`**: Без изменений по логике. Collision detection, zoomLevel >= 1.8, жадное размещение с приоритетом посещённых.

### 6.6. Экран «Штамп получен» (строки 403–507)

- **`renderStampOverlay(cityId)`** (403–440): v3 — вызывает `createStampSVG(regionId, getCityTier(cityId))` для tier-корректного штампа.
- **`closeStampOverlay()`** (442–445), **`goToCollection(cityId)`** (447–478), **`showShareText(cityName)`** (480–495), **`showToast(message)`** (497–507) — без изменений.

### 6.7. Массив городов CITIES (строки 509–567)

**57 объектов**: `{id, name, region, lat, lon, description}`. Распределение по 7 регионам: Минск (1), Минская обл. (10), Брестская (10), Гродненская (9), Витебская (9), Могилёвская (8), Гомельская (10).

### 6.8. Утилиты данных (строки 585–606)

**`getCityById(cityId)`** (585–590): Линейный поиск по CITIES. **NEW v3** — используется в валидации loadState.

**`getSightsCount(cityId)`** (592–596): **NEW v3** — возвращает `SIGHTS[cityId].length` (0 если SIGHTS undefined или город не найден).

**`hasChecklist(cityId)`** (598–600): **NEW v3** — `getSightsCount(cityId) > 0`.

**`getCheckedCount(cityId)`** (602–606): **NEW v3** — количество отмеченных пунктов для города.

### 6.9. Система рангов — Tier (строки 608–630, NEW v3)

**`getCityTier(cityId)`** (608–616): Главная функция вычисления ранга города:
- Город не в `visitedCities` → `null`
- `getSightsCount` = 0 (нет чек-листа) → `"bronze"`
- `getCheckedCount` = 0 → `"bronze"`
- `getCheckedCount` < `getSightsCount` (не все) → `"silver"`
- `getCheckedCount` = `getSightsCount` (все) → `"gold"`

> Ранг **не хранится** — всегда вычисляется из `visitedCities` + `checkedSights`.

**`getTierLabel(tier)`** (618–623): Возвращает `"Золото"` / `"Серебро"` / `"Бронза"`.

**`getTierEmoji(tier)`** (625–630): Возвращает `🥇` / `🥈` / `🥉`.

### 6.10. Milestone-менеджмент (строки 632–665, NEW v3)

**`addMilestone(cityId, tier)`** (632–644): Добавляет `{cityId, date: getTodayLocal(), tier}` в `state.milestones` если ещё не существует дубликата (тот же cityId + tier). Только silver/gold.

**`removeMilestone(cityId, tier)`** (646–655): Удаляет конкретный milestone по cityId + tier.

**`removeAllMilestones(cityId)`** (657–665): Удаляет все milestone'ы города (при удалении визита).

### 6.11. Модель состояния (строки 569–862)

**`STORAGE_KEY = "travelerPassport"`** (строка 569)

**`state`** — объект в памяти (строки 571–583):

```javascript
let state = {
  currentTab: "passport",         // сохраняется
  travelerName: "...",            // сохраняется
  onboardingComplete: false,      // сохраняется
  visitedCities: {},              // сохраняется — {cityId: {date: "YYYY-MM-DD"}}
  plannedCities: {},              // сохраняется — {cityId: true}
  cityNotes: {},                  // сохраняется — {cityId: "текст"}
  checkedSights: {},              // сохраняется (NEW v3) — {cityId: ["s0", "s1", ...]}
  milestones: [],                 // сохраняется (NEW v3) — [{cityId, date, tier}]
  openedRegions: [],              // НЕ сохраняется
  activeOverlayCityId: null,      // НЕ сохраняется
  stampOrigin: null,              // НЕ сохраняется
};
```

Дополнительно, устанавливаются в `loadState()` (строки 839–843):
```javascript
state.passportFilter = "all";     // НЕ сохраняется
state.passportSearchQuery = "";   // НЕ сохраняется
state.mapFilter = state.mapFilter || "all"; // НЕ сохраняется
state.stampOverlayCityId = null;  // НЕ сохраняется
state.openedRegions = state.openedRegions || []; // НЕ сохраняется
```

**`loadState()`** (строки 667–844): **Сильно расширена в v3.**

Валидация:
1. Чтение и парсинг `localStorage` → при ошибке полный сброс
2. `currentTab` — с редиректом legacy `"catalog"` → `"passport"`
3. `travelerName` — string, непустой
4. `visitedCities` — object (не array), валидация дат regex, существование cityId
5. `plannedCities` — object, значение `=== true`, существование cityId
6. `cityNotes` — object, значение string, существование cityId
7. **`checkedSights` (NEW v3, строки 722–764):** object (не array); для каждой записи: city существует, значение — array; если `SIGHTS` undefined (offline) — только dedup строк; если `SIGHTS` определён — фильтрация по существующим sightId, dedup
8. **`milestones` (NEW v3, строки 766–791):** array; каждый элемент — object с `cityId` (string, существует), `date` (regex), `tier` (`"silver"` или `"gold"`); dedup по cityId+tier

**4 инварианта v3 (строки 793–819):**
1. **Gold-города удаляются из plannedCities** (793–798) — исследованы полностью
2. **Silver-города принудительно добавляются в plannedCities** (799–804) — автофокус для доисследования
3. **checkedSights удаляются для непосещённых городов** (805–811)
4. **milestones удаляются для непосещённых городов** (812–819)

> **⚠️ v2-инвариант «visited выигрывает над planned» удалён.** В v3 город может быть одновременно посещённым и в планах (для доисследования).

**`saveState()`** (строки 846–862): Сохраняет **8 полей** (добавлены `checkedSights` и `milestones`).

### 6.12. Навигация по вкладкам (строки 864–904)

**`switchTab(tabId)`**: Без изменений по структуре. При переключении на профиль вызывает `renderProfile()` (теперь с орденами и хроникой), на карту — `initMapPoints()` + `updateMapMarkers()` + `updateMapFilter()`.

### 6.13. Утилиты (строки 906–918)

**`getTodayLocal()`** (906–908): `YYYY-MM-DD` через шведскую локаль. **`normalizeForSearch(str)`** (910–918): toLowerCase, ё→е, і→и, ў→в, удаление дефисов/пробелов.

### 6.14. Рендер паспорта — два режима (строки 920–1127)

**`currentPassportMode`** (920): `"filter"` или `"search"`.

**`renderPassport()`** (922–949): Обновляет счётчик, fade-анимация при смене режима (opacity 150мс).

**`buildSearchResults()`** (951–991): v3 — вызывает `createStampSVG(region, getCityTier(cityId))` для tier-стилизованных миниатюр.

**`buildFilterAccordions()`** (993–1093): v3 — ячейки `.stamp-cell` получают класс `tier-{tier}` (CSS: gold glow) и CSS-переменную `--region-color`; `createStampSVG(region, getCityTier(cityId))`.

**`handlePassportClick(e)`** (1095–1127): Делегированный обработчик кликов. Без изменений.

### 6.15. Онбординг (строки 1129–1151)

Без изменений из v2.

### 6.16. Хроника достижений (строки 1153–1203)

**`formatDateDisplay(dateStr)`** (1153–1156): `YYYY-MM-DD` → `DD.MM.YYYY`.

**`generateChronicle()`** (1158–1203): **NEW v3** — строит единый список достижений:
1. **Визиты:** для каждого города в `visitedCities` создаёт запись `{cityId, name, date, type: "visit", priority: 0}` (ранг Bronze)
2. **Milestones:** для каждой записи в `state.milestones` создаёт запись `{cityId, name, date, type: "milestone", tier, priority}` (gold=2, silver=1)
3. **Сортировка:** date DESC → name ASC (localeCompare "ru") → priority DESC
   - При совпадении дат визит (priority 0) идёт **раньше** milestone (priority 1/2) — сначала отмечен визит, потом достижении
4. Возвращает массив записей

### 6.17. Рендер профиля (строки 1205–1364)

**`renderProfile()`** (1205–1333): **Расширена в v3.**
1. **Блок имени:** отображение + inline-редактирование (без изменений)
2. **Общая статистика:** «X из 57» + зелёный прогресс-бар (без изменений)
3. **Блок «В планах: N»** (без изменений)
4. **Панель орденов (NEW v3, ~1246–1270):** три `.award-item`:
   - 🥇 `getCityTier` = `"gold"` — счётчик золотых городов
   - 🥈 `getCityTier` = `"silver"` — счётчик серебряных
   - 🥉 `getCityTier` = `"bronze"` — счётчик бронзовых
   - Сумма всех трёх = количеству посещённых городов
5. **Прогресс по 7 регионам:** название + счётчик + цветной прогресс-бар (без изменений)
6. **Хроника достижений (NEW v3):** вызывает `generateChronicle()`, рендерит `.chronicle-item` с классом `.milestone` для milestone-записей
   - Заголовок: «Хроника достижений»
   - Milestone-записи: золотой tint фона (#FFFAEB), тёмно-золотой текст (#B8860B)
   - Пустое состояние: «Вы пока не посетили ни одного города. Отправляйтесь в путь!»
7. Навешивает addEventListener на кнопки редактирования имени

**`startEditName()`** (1341–1351), **`saveEditName()`** (1353–1360), **`cancelEditName()`** (1362–1364) — без изменений.

### 6.18. Утилиты (строки 1335–1540)

**`escapeHtml(str)`** (1335–1339): XSS-защита через textNode round-trip.

**`rerenderCityCardPreservingScroll(cityId)`** (1534–1540): **NEW v3** — ре-рендер карточки с восстановлением `scrollTop` (чтобы чек-лист не прыгал при тогле пункта).

**`saveNote(cityId, text)`** (1542–1550): Trim, сохранение/удаление, saveState.

### 6.19. Вишлист и чек-лист (строки 1366–1532)

**`isProcessing`** (1366): Мьютекс, блокирует на 400мс.
**`noteDebounceTimer`** (1367): Таймер debounce для заметок.

**`togglePlanned(cityId)`** (1369–1408): **Изменена в v3.** Tier-aware логика:
- **Silver-город:** кнопка-заглушка (серебро авто-фокусируется в планах, invariant #2). Действие — `return` (no-op)
- **Gold-город без чек-листа или Bronze:** обычный toggle
- **Gold-город:** только удаление из планов (нельзя добавить — исследован полностью)
- Блокировка если `isProcessing`
- Перерисовка карточки + обновление карты

**`toggleSight(cityId, sightId)`** (1410–1476): **NEW v3** — ключевой обработчик чек-листа:
1. Проверяет `isProcessing`, город посещён, sightId валиден
2. Вычисляет текущий и будущий tier
3. Toggle в `state.checkedSights[cityId]` (add/remove sightId)
4. `saveState()`
5. **Milestone-менеджмент:**
   - oldTier `"bronze"` → newTier `"silver"`: `addMilestone(cityId, "silver")`
   - → newTier `"gold"`: `addMilestone(cityId, "gold")`
   - `"silver"` → `"bronze"`: `removeMilestone(cityId, "silver")`
   - `"gold"` → `"silver"`: `removeMilestone(cityId, "gold")`
   - `"silver"` → `"gold"`: `addMilestone(cityId, "gold")`
6. **Планы:** silver → всегда в планах; gold → удаляется из планов
7. **Анимация:** класс `tier-transitioning` (CSS transition) при повышении ранга
8. Обновляет карту, ре-рендер карточки (с сохранением скролла)

**`patchChecklistInPlace(cityId, sightId)`** (1478–1532): **NEW v3** — оптимизированное обновление одного пункта чек-листа без полного ре-рендера:
1. Обновляет чекбокс (toggle `.checked` класс, фон)
2. Обновляет прогресс-бар (ширина fill)
3. Обновляет счётчик "X/Y"
4. Обновляет бейдж ранга в карточке
5. При переходе в Gold — разворачивает золотой аккордеон

### 6.20. Карточка города (строки 1552–1817)

**`openCityCard(cityId)`** (1552–1573): Проверка `isProcessing`, сохранение `stampOrigin`, рендер, блокировка tab-bar.

**`closeCityCard()`** (1575–1592): Принудительное сохранение заметки, скрытие overlay, разблокировка tab-bar, ре-рендер паспорта.

**`renderCityCard(cityId)`** (1594–1750): **Сильно расширена в v3.**
- **Обложка:** `.city-card-cover-wrapper` с `<img src="covers/{cityId}.webp" onerror="this.style.display='none'">` + CSS gradient placeholder (посещённые/непосещённые — разные градиенты)
- **Заголовок:** название + регион + бейдж ранга `.city-card-tier-badge.tier-{tier}` (🥉 Бронза / 🥈 Серебро (X/Y) / 🥇 Золото (Y/Y))
- **Действия:** закладка (для непосещённых) **или** «Доисследовать» (для посещённых Bronze/Silver), кнопка закрытия
- **Штамп:** 80×80px, `stamp-tier-{tier}` класс, вызов `createStampSVG(region, getCityTier)`
- **Описание:** историческая справка
- **Чек-лист** (через `renderChecklist()`):
  - Есть чек-лист, посещён, не Gold → активные чекбоксы + прогресс-бар
  - Есть чек-лист, посещён, Gold → золотой аккордеон (развёрнут/свёрнут)
  - Есть чек-лист, не посещён → disabled чекбоксы (opacity 0.6)
  - Нет чек-листа, посещён → `.checklist-manifest` (заглушка «Город без детального чек-листа»)
- **Textarea:** заметки, maxlength=500, контекстный placeholder
- **Кнопки:** «Я здесь был» (непосещённые) / дата + «Удалить отметку» (посещённые)

**`renderChecklist(cityId, hasSights, isVisited, tier, regionColor, svgCheck)`** (1752–1809): **NEW v3** — рендеринг чек-листа для карточки города. Четыре режима (см. выше).

**`getPluralSights(n)`** (1811–1817): **NEW v3** — русская плюрализация: «1 достопримечательность» / «3 достопримечательности» / «5 достопримечательностей».

### 6.21. Выбор даты (строки 1819–1849)

**`openDatePicker(cityId)`** (1819–1845), **`closeDatePicker()`** (1847–1849) — без изменений.

### 6.22. Подтверждение и удаление визита (строки 1851–1898)

**`confirmVisit(cityId, date)`** (1851–1875): **Изменена в v3.**
1. Проверка `isProcessing`
2. Принудительное сохранение заметки
3. Удаляет из plannedCities
4. Записывает `{date}` в visitedCities
5. **v3:** Если город становится Silver (есть чек-лист и отметки) — принудительно добавляется обратно в plannedCities (invariant #2 — автофокус доисследования)
6. `saveState()`, закрывает date-picker, показывает stamp-overlay
7. Обновляет карту

**`removeVisit(cityId)`** (1877–1898): **Изменена в v3.**
1. `delete state.visitedCities[cityId]`
2. **v3:** `delete state.checkedSights[cityId]` — очищение чек-листа
3. **v3:** `removeAllMilestones(cityId)` — удаление всех milestone'ов
4. **v3:** `delete state.plannedCities[cityId]` — очистка планов
5. `saveState()`, закрывает карточку, ре-рендерит профиль, обновляет карту
6. Заметки **не удаляются** — переживают в `cityNotes`

### 6.23. Инициализация и обработчики событий (строки 1900–2214)

**`init()`** (1900–2214): Главная функция инициализации на `DOMContentLoaded`. ~315 строк — самая большая функция.

Последовательность:
1. `loadState()` — загрузка и валидация состояния
2. Регистрация обработчиков: tab-bar, паспорт (список + контролы + поиск), карта (клик + фильтры + зум кнопки/колёсико/touch/мышь-drag), stamp-overlay, онбординг, оверлеи (city-card + date-picker — клик по фону), visibilitychange, pagehide
3. Проверка `onboardingComplete` → показать/скрыть онбординг
4. `switchTab(state.currentTab)` — восстановление вкладки

**`DOMContentLoaded` listener** (строка 2216).

### 6.24. Service Worker обновление (строки 2218–2227)

```javascript
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
```

Логика без изменений из v2: тост только при обновлении (не при первой установке).

---

## 7. Карта Беларуси — v3 обновления

### 7.1. Семь состояний маркеров (NEW v3)

Карта v3 использует 7 визуальных состояний вместо 3 в v2:

| # | Состояние города | dot | tier-ring | tier-num | gold-star | flag |
|---|------------------|-----|-----------|----------|-----------|------|
| 1 | Не посещён, не в планах | #ccc (серый) | — | — | — | — |
| 2 | Не посещён, в планах | цвет региона | — | — | — | нейтральный |
| 3 | Бронза, не в планах | цвет региона | — | — | — | — |
| 4 | Бронза, в планах («Доисследовать») | цвет региона | — | — | — | серебряный |
| 5 | Серебро, не в планах* | цвет региона | ✅ серебряное кольцо | ✅ "X/Y" | — | — |
| 6 | Серебро, в планах | цвет региона | ✅ серебряное кольцо | ✅ "X/Y" | — | золотой |
| 7 | Золото | скрыт (`dot--hidden`) | — | — | ✅ золотая звезда | — |

> *Silver города обычно всегда в plannedCities (invariant #2), поэтому состояние #5 встречается редко.

**Zoom-gating (CSS):**
- Кольца (`tier-ring`), звёзды (`gold-star`) — всегда видны
- Числа (`tier-num`) — только при zoomLevel >= 1.8 (через класс `.map--zoomed` на SVG)
- Флажки — только при zoomLevel >= 1.8 (через `display: none`/`inline`)

### 7.2. Архитектура обновления маркеров

Без изменений из v2 по структуре:

| Функция | Когда вызывается | Что делает |
|---------|-----------------|------------|
| `initMapPoints()` | Первый `switchTab("map")` | Один раз строит весь DOM точек (с v3-элементами) |
| `updateMapMarkers()` | Любое изменение состояния города | Обновляет fill/visible по tier (7 состояний, без перестройки DOM) |
| `updateMapFilter()` | Клик по фильтру, изменение состояния | Toggle `.map-point-hidden` (без перестройки DOM) |

### 7.3. Система зума

Без изменений из v2: кнопки (×1.5), колёсико (×1.15), pinch, drag (touch + мышь). Лимиты 1x–5x. `suppressMapClick` после drag.

### 7.4. Контур карты

Без изменений: 44 точки из GeoJSON, инфляция 3%, point-in-polygon ray casting для всех 57 городов.

---

## 8. Модель данных localStorage

### Сохраняемые поля (8 в v3, было 6 в v2)

```json
{
  "currentTab": "passport",
  "travelerName": "Белорусский путешественник",
  "onboardingComplete": true,
  "visitedCities": {
    "minsk": { "date": "2025-04-12" },
    "nesvizh": { "date": "2025-05-01" }
  },
  "plannedCities": {
    "mir": true,
    "brest": true
  },
  "cityNotes": {
    "minsk": "Был в Троицком предместье, очень красиво!",
    "grodno": "Обязательно посетить Коложскую церковь"
  },
  "checkedSights": {
    "minsk": ["s0", "s1", "s2"],
    "nesvizh": ["s0", "s1", "s2"]
  },
  "milestones": [
    { "cityId": "nesvizh", "date": "2025-05-01", "tier": "silver" },
    { "cityId": "minsk", "date": "2025-04-15", "tier": "gold" }
  ]
}
```

### Эфемерные поля (сбрасываются при загрузке)

| Поле | Дефолт | Назначение |
|------|--------|------------|
| `passportFilter` | `"all"` | Активный фильтр паспорта |
| `passportSearchQuery` | `""` | Текст поиска |
| `mapFilter` | `"all"` | Фильтр карты |
| `stampOverlayCityId` | `null` | Текущий город в overlay |
| `openedRegions` | `[]` | Раскрытые аккордеоны |
| `activeOverlayCityId` | `null` | Город в карточке |
| `stampOrigin` | `null` | Вкладка-источник чекина |

### Валидация при загрузке (v3)

| Поле | Проверка |
|------|----------|
| `visitedCities` | Даты regex, существование cityId, тип object |
| `plannedCities` | Значение `=== true`, существование cityId |
| `cityNotes` | Тип string, существование cityId |
| **`checkedSights`** (NEW) | Тип array, существование cityId, sightId в SIGHTS (если определён), dedup |
| **`milestones`** (NEW) | Тип object, cityId существует, дата regex, tier "silver"/"gold", dedup |

### 4 инварианта v3

1. **Gold ∉ plannedCities** — исследованные города убираются из планов
2. **Silver ∈ plannedCities** — серебряные города авто-фокусируются для доисследования
3. **checkedSights только для посещённых** — очищаются при удалении визита
4. **Milestones только для посещённых** — очищаются при удалении визита

> **Удалённый v2-инвариант:** «visited выигрывает над planned» — в v3 город может быть в обоих списках.

---

## 9. Города и регионы

| # | Регион | id | Цвет | Города |
|---|--------|----|------|--------|
| 1 | Минск | minsk | **#2980B9** | Минск (1) |
| 2 | Минская обл. | minsk_obl | #E74C3C | Несвиж, Мир, Заславль, Слуцк, Борисов, Молодечно, Клецк, Копыль, Марьина Горка, Столбцы (10) |
| 3 | Брестская | brest | #3498DB | Брест, Пинск, Кобрин, Берёза, Каменец, Коссово, Ружаны, Пружаны, Давид-Городок, Высокое (10) |
| 4 | Гродненская | grodno | #27AE60 | Гродно, Новогрудок, Лида, Слоним, Волковыск, Мосты, Дятлово, Щучин, Ошмяны (9) |
| 5 | Витебская | vitebsk | #F39C12 | Полоцк, Витебск, Орша, Браслав, Глубокое, Лепель, Дисна, Докшицы, Миоры (9) |
| 6 | Могилёвская | mogilev | #9B59B6 | Могилёв, Бобруйск, Мстиславль, Быхов, Кричев, Шклов, Чериков, Чаусы (8) |
| 7 | Гомельская | gomel | #1ABC9C | Гомель, Туров, Мозырь, Речица, Ветка, Чечерск, Лоев, Добруш, Калинковичи, Рогачёв (10) |

**Всего:** 57 городов, 7 регионов. **Городов с чек-листами:** 15 (Топ-15), 49 достопримечательностей.

---

## 10. Карточка города — детальный разбор

### Layout (v3)

```
┌─────────────────────────────────────┐
│  .city-card-cover-wrapper (180px)   │  ← NEW v3
│    [обложка / градиент]             │
│─────────────────────────────────────│
│  .city-card-header                  │
│    .city-card-title-block           │
│      Название города (h2)           │
│      Регион (p)                     │
│      [.tier-badge 🥈 Серебро 2/3]   │  ← NEW v3
│                  .city-card-actions │
│                    [bookmark/explore] [×]│
│─────────────────────────────────────│
│         [штамп 80×80, tier-styled]  │  ← v3: silver ring / gold
│                                     │
│  Описание города...                 │
│                                     │
│  ┌─ Чек-лист (NEW v3) ───────────┐  │
│  │ Что посмотреть        2 / 3   │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│  │ [✓] Троицкое предместье      │  │
│  │ [✓] Верхний город и Ратуша   │  │
│  │ [ ] Остров Слёз              │  │
│  └──────────────────────────────┘  │
│  ┌─────────────────────────────┐    │
│  │ textarea (заметки)          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Дата визита: 12.04.2025]     или  │
│  [Я здесь был]                      │
└─────────────────────────────────────┘
```

### Обложка города (NEW v3)
- `.city-card-cover-wrapper` (180px высота, border-radius сверху)
- `<img src="covers/{cityId}.webp">` с `onerror="this.style.display='none'"` — fallback на CSS gradient
- Директория `covers/` **не существует** — всегда показывается градиент (пост-MVP: добавить обложки)
- Градиенты: посещённые — светлее (`#2c2c2c → #1a1a1a`), непосещённые — темнее (`#202020 → #0f0f0f`)

### Бейдж ранга (NEW v3)
- `.city-card-tier-badge.tier-{tier}`: pill-форма, цветовая схема по рангу
- Bronze: 🥉 Бронза
- Silver: 🥈 Серебро (X/Y)
- Gold: 🥇 Золото (Y/Y)

### Кнопки действий (изменено в v3)

| Ранг | Кнопка слева | Поведение |
|------|-------------|-----------|
| Не посещён | 🔖 Bookmark (toggle planned) | Добавить/убрать из вишлиста |
| Bronze (с чек-листом) | 🧭 «Доисследовать» | Добавить в планы (серебряный флаг) |
| Silver | 🧭 «Доисследовать» (disabled) | Авто-фокус (всегда в планах) |
| Gold | — (скрыта) | Исследован полностью |
| Bronze (без чек-листа) | 🔖 Bookmark (toggle planned) | Обычный вишлист |

### Чек-лист (NEW v3)

**Режимы отображения:**
1. **Посещён, есть чек-лист, не Gold:** активные чекбоксы + прогресс-бар + счётчик "X/Y"
2. **Посещён, Gold:** золотой аккордеон — свёрнут по умолчанию, кнопка разворачивает/сворачивает
3. **Не посещён, есть чек-лист:** disabled чекбоксы (opacity 0.6, pointer-events none)
4. **Посещён, нет чек-листа:** `.checklist-manifest` — заглушка «Этот город пока без детального чек-листа. Ранг — Бронза.»

**Интерактивность (через `toggleSight`):**
- Клик по пункту → toggle в `checkedSights` → пересчёт tier → milestone-менеджмент → обновление бейджа/прогресса/карты → патч DOM без полного ре-рендера (`patchChecklistInPlace`)

### Штамп в карточке (изменено в v3)
- 80×80px, вызов `createStampSVG(region, getCityTier(cityId))`
- Silver: + серебряное кольцо
- Gold: полностью золото
- Без свечения (в отличие от 48px в сетке паспорта)

### Заметки (без изменений из v2)
- maxlength=500, контекстный placeholder
- Тройная защита: debounce 300мс + принудительное сохранение + visibilitychange/pagehide
- Переживают удаление визита

---

## 11. Service Worker (sw.js, 42 строки)

### Кэширование (v3)

```javascript
var CACHE_NAME = 'belarus-passport-v3';
var ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'data-sights.js',    // ← NEW v3
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg'
];
```

**Изменения v3:**
- `CACHE_NAME` bumped с `v2` → `v3` — форсирует обновление кэша
- `data-sights.js` добавлен в ASSETS — кэшируется для оффлайна

### Жизненный цикл
- **install:** кэширование ASSETS + `self.skipWaiting()` — немедленная активация
- **fetch:** cache-first (ответ из кэша, fallback на сеть)
- **activate:** удаление старых кэшей + `self.clients.claim()`

### Обновление на клиенте (app.js строки 2218–2227)
Без изменений: `hasControllerOnLoad` → тост «Приложение обновлено» при `controllerchange`.

### Ограничения
- Service Worker **не работает** на `file:///` — приложение работает, но без оффлайн-кэша
- `cache.addAll()` — all-or-nothing: если один файл не существует, весь addList отклоняется. Поэтому `covers/*.webp` **не добавлены** в ASSETS (директория не существует)

---

## 12. PWA-манифест (manifest.json, 22 строк)

Без изменений из v2.

```json
{
  "name": "Паспорт путешественника по Беларуси",
  "short_name": "Беларусь Паспорт",
  "start_url": "index.html",
  "display": "standalone",
  "orientation": "portrait",
  ...
}
```

---

## 13. Ключевые архитектурные решения (v3)

### Перенесённые из v2 (без изменений)

1. **Единый экран паспорта** — поиск и фильтры в одном контейнере
2. **Двухрежимный рендер паспорта** — `currentPassportMode`, fade 150мс только при смене режима
3. **Sticky-обёртка** — `.passport-sticky-header` для заголовка и контролов
4. **Трёхфункциональная карта** — init/Markers/Filter, без перестройки DOM
5. **Заметки с тройной защитой** — debounce + close + visibilitychange/pagehide
6. **color-mix() для активной закладки**
7. **Progressive enhancement для max-height** — 90vh → 90dvh
8. **Нормализация поиска** — ё→е, і→и, ў→в
9. **Event delegation** — обработчики на контейнерах
10. **Мьютекс `isProcessing`** — 400мс
11. **CSS Grid аккордеон** — `grid-template-rows: 0fr → 1fr`
12. **XSS-защита** — `escapeHtml()` через textNode
13. **iOS font-size 16px** — предотвращение зума
14. **Относительные пути во всём PWA**

### Новые в v3

15. **Ранг вычисляется, не хранится** — `getCityTier()` всегда пересчитывает из `visitedCities` + `checkedSights`. Ранг нельзя «сломать» через localStorage — валидация при загрузке восстанавливает консистентность.

16. **Milestones отдельны от визитов** — `state.milestones` хранит только silver/gold переходы. Bronze-визит выводится из `visitedCities.date` (priority 0 в хронике). Это предотвращает дубликаты и упрощает удаление визита.

17. **Отложенный ре-рендер чек-листа** — `patchChecklistInPlace()` обновляет один пункт в DOM без полного ре-рендера карточки. Полный ре-рендер (с сохранением скролла через `rerenderCityCardPreservingScroll`) происходит только при tier-переходе.

18. **4 инварианта в loadState** — Gold ∉ planned, Silver ∈ planned, checkedSights только для посещённых, milestones только для посещённых. Восстанавливают консистентность при любых данных.

19. **Удалённый v2-инвариант** — «visited выигрывает над planned» больше не действует. Посещённый город может быть в планах (для доисследования).

20. **Золотой аккордеон чек-листа** — при достижении Gold чек-лист сворачивается через CSS Grid animation (`grid-template-rows: 1fr → 0fr`). Заголовок `.checklist-gold-header` с золотым градиентом и анимацией fade-in.

21. **7 состояний маркеров на карте** — расширение с 3 (v2) до 7 через CSS-классы `.marker-visible` и `.dot--hidden`. Zoom-gating через класс `.map--zoomed` на SVG.

22. **Золотое свечение для 48px** — `filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.4))` только для `.stamp-cell.tier-gold .stamp-icon`. В карточке (80px) свечение отключено — визуально перегружает.

23. **data-sights.js как отдельный файл** — данные чек-листов вынесены из app.js. Загружается перед app.js через `<script>`. При `SIGHTS === undefined` (offline без кэша) — приложение деградирует: города без чек-листов, ранг всегда Bronze, валидация trust-only (dedup без проверки sightId).

24. **Хроника достижений с группировкой** — `generateChronicle()` мержит визиты (priority 0) и milestones (priority 1/2) в единый список. Сортировка: date DESC → name ASC → priority DESC. При совпадении дат визит идёт раньше milestone.

---

## 14. Что НЕ реализовано

- **Обложки городов** — директория `covers/` не существует, всегда показывается CSS gradient
- Геолокация, GPS-автоотметка
- Социальные функции (друзья, ленты)
- Построение маршрутов
- Push-уведомления
- Монетизация, регистрация
- Облачная синхронизация
- Мультиязычность
- Адаптив под десктоп/планшет
- Тестовая инфраструктура (unit-тесты)
- CI/CD
