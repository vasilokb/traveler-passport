# Паспорт путешественника по Беларуси — Полное описание реализации

## 1. Общие сведения

**Назначение:** Мобильное веб-приложение для коллекционирования цифровых штампов городов Беларуси. Пользователь отмечает посещённые города с указанием даты, собирает штампы по регионам, отслеживает прогресс на карте и в статистике.

**Форм-фактор:** Строго мобильный, портретная ориентация, ширина 390–430dp. На десктопе — центрированная мобильная колонка. Нет адаптива под планшеты.

**Стек:** Чистый HTML + CSS + JavaScript (ES5-совместимый `"use strict"`, без сборки, без библиотек, без фреймворков).

**Хранение:** Все данные — в `localStorage` под ключом `"travelerPassport"`. Бэкенда нет. Работает через `file:///` и через HTTP.

**PWA:** Подключены `manifest.json`, `sw.js` (Service Worker), SVG-иконки 192/512px.

---

## 2. Файловая структура

```
F:\projects\traveler-passport\
├── index.html              (112 строк)  — HTML-разметка
├── style.css               (1209 строк) — все стили
├── app.js                  (1251 строка)— вся логика
├── manifest.json                        — PWA-манифест
├── sw.js                                — Service Worker
├── icon-192.svg                          — иконка 192px
├── icon-512.svg                          — иконка 512px
├── conf                                 — конфигурационный файл
└── .kilo/plans/
    ├── MVP_v1/                           — спецификация + промпты этапов 1–6
    ├── MVP_v2/                           — папка для v2
    ├── implementation-plan-v2.md
    ├── belarus-border-path.txt           — старый ручной полигон (не используется)
    └── debug-map.js                      — Puppeteer-тест карты
```

---

## 3. index.html — Структура разметки (112 строк)

### 3.1. `<head>`
- `charset="UTF-8"`, viewport с `user-scalable=no`
- `theme-color` meta (#2c3e50)
- Подключены `manifest.json`, `icon-192.svg`, `style.css`

### 3.2. Онбординг (`#onboarding-overlay`, строки 10–23)
- Полноэкранный белый оверлей, скрыт по умолчанию (`display: none`)
- Показывается через класс `.visible` (→ `display: flex`)
- Заголовок «Добро пожаловать в Паспорт путешественника!»
- Подзаголовок «Отмечайте города Беларуси, которые вы посетили»
- Поле ввода имени (`#onboarding-name-input`, maxlength=50)
- Кнопки «Продолжить» и «Пропустить»

### 3.3. Контейнер приложения (`#app`, строки 25–91)
`max-width: 430px`, центрирован, `overflow: hidden`, белый фон.

**Вкладка «Паспорт» (`#tab-passport`):**
- Sticky-заголовок с `<h1>Мой паспорт</h1>` и счётчиком `#passport-count` («0 из 57»)
- Контейнер `#passport-list` (рендерится JS)

**Вкладка «Каталог» (`#tab-catalog`):**
- Sticky-заголовок «Каталог городов»
- Блок `.catalog-controls`:
  - Поле поиска `#catalog-search` (placeholder «Поиск города...»)
  - Три кнопки фильтра: `data-filter="all|visited|unvisited"` (Все / Посещённые / Непосещённые)
- Контейнер `#catalog-list` (рендерится JS)

**Вкладка «Карта» (`#tab-map`):**
- Sticky-заголовок «Карта Беларуси»
- Кнопки фильтра карты: `data-map-filter="all|visited"` (Все города / Посещённые)
- `#map-container` (position: relative, touch-action: none):
  - `<svg id="belarus-map">` — viewBox `1.472 1.809 1626.241 1450.672`, preserveAspectRatio `xMidYMid meet`
    - `<path>` — контур границы Беларуси (44 точки, инфлирован на 3%)
    - `<g id="map-points-layer">` — точки городов (рендерится JS)
  - `#map-empty-state` — пустое состояние (скрыто по умолчанию)
  - `.map-zoom-controls` — кнопки зума «+» и «−» (position: absolute, bottom-right)

**Вкладка «Профиль» (`#tab-profile`):**
- Пустой контейнер, полностью рендерится JS в `renderProfile()`

**Нижняя навигация (`#tab-bar`, строки 73–90):**
- `position: fixed`, `bottom: 0`, `max-width: 430px`
- 4 кнопки со SVG-иконками: Паспорт, Каталог, Карта, Профиль
- Класс `.active` на текущей вкладке, `.tab-bar-blocked` при открытом оверлее (pointer-events: none, opacity: 0.5)

### 3.4. Оверлеи (строки 93–104)

| Элемент | z-index | Назначение |
|---------|---------|------------|
| `#city-card-overlay` | 100 | Карточка города (dark backdrop) |
| `#date-picker-modal` | 200 | Выбор даты визита |
| `#stamp-overlay` | 300 | Экран «Штамп получен» |
| `#toast` | 400 | Тост-уведомление (bottom: 90px) |

### 3.5. Service Worker (строки 106–110)
Регистрация `/sw.js` при загрузке.

---

## 4. style.css — Детальный разбор стилей (1209 строк)

### 4.1. Сброс и базовые стили (1–30)
- Универсальный сброс `*, *::before, *::after`
- `-webkit-tap-highlight-color: transparent` — убран синий outline при тапе
- `html`: `font-size: 16px`, antialiased, text-size-adjust 100%
- `body`: системный шрифт (`-apple-system, BlinkMacSystemFont, "Segoe UI"...`), фон `#e5e5e5`
- `#app`: `max-width: 430px`, центрирован, белый фон, `min-height: 100vh`, `overflow: hidden`

### 4.2. Система вкладок (32–43)
- `.tab-content`: `display: none`, `padding: 0 16px`, `padding-bottom: 72px` (отступ под tab-bar), `min-height: calc(100vh - 56px)`, `overflow-y: auto`, `-webkit-overflow-scrolling: touch`
- `.tab-content.active`: `display: block`

### 4.3. Каталог (57–153)
- `.catalog-header`: sticky, `top: 0`, `z-index: 10`
- `.region-group`: `margin-top: 20px` (у первого — 4px)
- `.region-header`: flex, gap 10px, цветная точка 12×12px + название региона
- `.city-item`: flex, gap 12px, `min-height: 44px`, `border-bottom: 1px solid #f0f0f0`, `user-select: none`, `transition: background 0.15s`
  - `:active` → фон `#f5f5f5`
  - `.visited .city-name` → цвет `#27AE60`, `font-weight: 600`
- `.city-check`: кружок 24×24px, border 2px, при `.visited` → зелёный с CSS-галочкой (border-left + border-bottom + rotate)

### 4.4. Tab Bar (154–214)
- `#tab-bar`: fixed, bottom: 0, max-width: 430px, height: 56px, border-top, `padding-bottom: env(safe-area-inset-bottom)`
- `.tab-btn`: flex-column, gap 2px, `min-width: 44px`, `min-height: 44px`, SVG 22×22, текст 0.625rem
- `.tab-btn.active`: цвет `#1a1a1a`, `stroke-width: 2.5`
- Hover-стили только при `@media (hover: hover)`

### 4.5. Онбординг (216–309)
- `#onboarding-overlay`: fixed, z-index: 1000, белый фон, `display: none` → `.visible` → `display: flex`
- `.onboarding-content`: max-width 430px, padding 32px 24px, text-align center
- `.onboarding-input`: width 100%, max-width 320px, border 2px, border-radius 12px, min-height 48px, при focus → border-color `#27AE60`
- Кнопки: primary (зелёная), secondary (серая), min-height 48px, border-radius 12px

### 4.6. Профиль (311–535)
- Имя: `.profile-name-block` (flex, gap 12px), кнопка редактирования 44×44px
- Редактирование: `.profile-edit-row` (flex), input + save/cancel, при focus → зелёная рамка
- Статистика: `.profile-stat-number` (2rem, bold 700) + `.profile-stat-label` (1rem, #666)
- Прогресс-бары: `.progress-bar-track` (height 10px, border-radius 8px, фон #f0f0f0), `.progress-bar-fill` (transition width 0.3s)
- Региональные прогресс-бары: 7 штук, цвет заливки = цвет региона
- Разделители: `.profile-divider` (1px, #f0f0f0, margin 20px 0)
- Хроника: `.chronicle-item` (flex, space-between, min-height 44px, border-bottom)
- Пустое состояние хроники: курсив, цвет #999

### 4.7. Паспорт (537–707)
- `.passport-header`: sticky, z-index: 10
- Аккордеон `.accordion-item`:
  - `.accordion-header`: flex, gap 10px, min-height 52px, cursor pointer
  - `:active` → background + отрицательный margin для визуального расширения
  - Цветная точка 12px + название + бейдж + счётчик + стрелка
  - Бейджи: `.badge-gold` (фон #FFF3B0, текст #B8860B), `.badge-silver` (фон #E8E8E8, текст #808080)
  - Стрелка: SVG 20×20, `transition: transform 0.3s`, при `.open` → `rotate(180deg)`
  - Тело аккордеона: `display: grid`, `grid-template-rows: 0fr` → `.open` → `1fr`, `transition 0.3s`
  - `.accordion-inner`: `overflow: hidden`
- Сетка штампов `.stamps-grid`: `grid-template-columns: repeat(auto-fill, minmax(70px, 1fr))`, gap 10px
- Ячейка `.stamp-cell`: flex-column, min-height 80px, min-width 44px
- Иконка штампа `.stamp-icon`: 48×48px, при `.visited` → цвет через CSS-переменную `--region-color`
- Название `.stamp-name`: 0.6875rem, text-align center, при `.visited` → цвет #333, bold
- `.tab-bar-blocked`: pointer-events none, opacity 0.5, grayscale 50%

### 4.8. Карточка города (709–829)
- `#city-card-overlay`: fixed, z-index 100, backdrop rgba(0,0,0,0.5), flex center
- `.city-card`: white, border-radius 16px, max-width 400px, max-height calc(100vh - 40px), overflow-y auto
- Кнопка закрытия: absolute, 44×44px, символ «×»
- Иконка штампа: 80×80px
- Название: 1.5rem, bold, padding-right 32px (чтобы не залезать под кнопку закрытия)
- Кнопки: `.city-card-btn-primary` (зелёная), `.city-card-btn-danger` (красная), min-height 48px

### 4.9. Дата-пикер (831–909)
- `#date-picker-modal`: fixed, z-index 200, backdrop rgba(0,0,0,0.5)
- Карточка: white, border-radius 16px, max-width 360px
- Input: border 2px, border-radius 12px, min-height 48px
- Кнопки «Отмена» и «Подтвердить»: flex 1, min-height 48px

### 4.10. Каталог — контролы (911–961)
- `.catalog-controls`: sticky, `top: 56px` (под заголовком), z-index 10
- Поиск: min-height 44px, font-size 16px (предотвращает зум на iOS), border-radius 10px
- Фильтры `.filter-btn`: flex 1, min-height 38px, border 2px, border-radius 10px
  - `.active`: фон #1a1a1a, белый текст

### 4.11. Карта (963–1064)
- `.map-header`: sticky, z-index 10
- `.map-controls`: flex, gap 8px, margin-bottom 12px
- `.map-filter-btn`: аналогично `.filter-btn`
- `#map-container`: position relative, `touch-action: none`, `overflow: hidden`
- `.map-zoom-controls`: absolute, bottom 16px, right 16px, flex-column, gap 8px, z-index 10
- `.map-zoom-btn`: 40×40px, круглая, тень, белый фон
- SVG: `display: block`, `width: 100%`, `height: auto`
- `.map-point`: cursor pointer
- `.hitbox`: fill transparent (r=22 — зона тапа 44×44dp)
- `.dot`: transition r 0.15s, при hover → r: 7

### 4.12. Экран «Штамп получен» (1082–1180)
- `#stamp-overlay`: fixed, z-index 300, backdrop rgba(0,0,0,0.7)
- `.stamp-card`: white, border-radius 20px, max-width 340px, padding 32px 24px
- `.stamp-card-icon`: 200×200px, анимация `stamp-imprint 0.4s ease-out`
- Анимация `stamp-imprint`: от `scale(1.6) rotate(-15deg) opacity 0` → `scale(1) rotate(0) opacity 1`
- Кнопки «Поделиться» (серая) и «В коллекцию» (зелёная), min-height 48px
- `.stamp-highlight`: анимация `stamp-pulse 2s` (box-shadow от зелёного 10px до нуля)

### 4.13. Тост (1182–1202)
- `#toast`: fixed, bottom 90px, горизонтально по центру, фон #1a1a1a, белый текст, z-index 400
- Показывается 2 секунды, класс `.visible` → `display: block !important`

### 4.14. Адаптив (1204–1209)
- `@media (max-width: 430px)`: `#tab-bar` без центрирования (left: 0, transform: none)

---

## 5. app.js — Детальный разбор логики (1251 строка)

### 5.1. Константы и конфигурация (строки 1–40)

**`REGIONS`** (строки 3–11): Массив из 7 объектов `{id, name, color}`:
- Минск (#C0C0C0), Минская обл. (#E74C3C), Брестская (#3498DB), Гродненская (#27AE60), Витебская (#F39C12), Могилёвская (#9B59B6), Гомельская (#1ABC9C)

**`REGION_ICONS`** (строки 13–21): Объект с SVG-path иконками для каждого региона — уникальные силуэты зданий/достопримечательностей внутри штампа.

**`createStampSVG(regionId)`** (строки 23–29): Генерирует SVG-разметку штампа:
- viewBox `0 0 100 100`
- Круглая зубчатая рамка (36 точек) — `fill: none, stroke: currentColor, stroke-width: 2.5, opacity: 0.5`
- Внутренняя иконка региона по центру (сдвиг `translate(0, 5)`)

**`MAP`** (строки 31–40): Объект с параметрами проекции:
- `viewBoxX: 1.472, viewBoxY: 1.809, viewBoxW: 1626.241, viewBoxH: 1450.672`
- `geoN: 56.4, geoS: 51.1, geoW: 22.9, geoE: 33.0`

### 5.2. Проекция координат (строки 42–50)

**`projectToSVG(lat, lon)`**: Линейная проекция GPS → SVG:
```
x = viewBoxX + ((lon - geoW) / (geoE - geoW)) × viewBoxW
y = viewBoxY + ((geoN - lat) / (geoN - geoS)) × viewBoxH
```

### 5.3. Рендер карты (строки 52–127)

**`renderMap()`**:
1. Очищает `#map-points-layer`
2. Проверяет фильтр и пустое состояние (opacity 0.15 + плашка)
3. Для каждого города (проходящего фильтр):
   - Вычисляет позицию через `projectToSVG()`
   - Создаёт `<g class="map-point" data-city-id="...">` с тремя элементами:
     - `<circle class="hitbox">` — r=22, fill transparent (зона тапа 44dp)
     - `<circle class="dot">` — r=7, цвет региона или #ccc
     - `<text class="map-label">` — название, visibility hidden, font-size 26, белый контур (stroke-width 3, paint-order stroke fill)
4. Вызывает `updateMapLabels()`

### 5.4. Система зума карты (строки 129–163)

**Переменные состояния:**
- `MAP_ORIG_VB`: исходный viewBox (неизменный)
- `mapViewBox`: текущий viewBox (изменяется при зуме/пане)
- `suppressMapClick`: флаг блокировки клика после перетаскивания

**`updateMapViewBox()`** (строки 133–140):
- Устанавливает `viewBox` атрибут SVG
- Меняет курсор: `grab` при зуме >1x, `default` при 1x
- Вызывает `updateMapLabels()`

**`zoomAtPoint(cx, cy, factor)`** (строки 142–155):
- `factor < 1` = зум вперёд, `factor > 1` = зум назад
- Сохраняет пропорцию точки (rx, ry) — зум «к точке»
- Лимиты: макс. зум = 5x (`minW = origW / 5`), мин. = 1x (сброс)
- При выходе за 1x → `resetMapZoom()`

**`resetMapZoom()`** (строки 157–163): Возвращает viewBox к исходному.

### 5.5. Подписи городов на карте (строки 165–229)

**`updateMapLabels()`**:
1. Вычисляет `zoomLevel = origW / currentW`
2. При zoomLevel < 1.8 — скрывает все подписи
3. При zoomLevel >= 1.8:
   - Вычисляет масштаб SVG→пиксели через `getBoundingClientRect()`
   - Для каждой подписи вычисляет экранный bounding box:
     - Ширина: `text.length × fontSize(26) × 0.48 × scaleX` (коэффициент 0.48 — оценка ширины символа)
     - Высота: `fontSize × scaleY`
     - Позиция: из SVG-координат + padding 4px
   - **Сортировка по приоритету:** посещённые города первыми
   - **Жадное размещение:** обходит подписи по порядку, показывает только те, чей box не пересекается ни с одним уже размещённым (проверка AABB: `!(right < left || left > right || bottom < top || top > bottom)`)
   - Остальные скрываются

### 5.6. Экран «Штамп получен» (строки 231–335)

**`renderStampOverlay(cityId)`** (строки 231–268):
- Генерирует карточку: иконка штампа (200×200, цвет региона) + название + 2 кнопки
- Кнопки получают индивидуальные addEventListener (не делегирование, т.к. оверлей пересоздаётся)

**`closeStampOverlay()`** (строки 270–273): Скрывает `#stamp-overlay`.

**`goToCollection(cityId)`** (строки 275–306):
1. Закрывает stamp-overlay и city-card
2. Переключает на вкладку «Паспорт»
3. Раскрывает нужный регион в аккордеоне
4. Через 300мс (ожидание рендера) — scrollIntoView к ячейке + класс `.stamp-highlight` на 2 секунды

**`showShareText(cityName)`** (строки 308–323):
- Генерирует текст: «Я посетил {город} и получил штамп в Паспорте путешественника по Беларуси! 🇧🇾»
- Web Share API (мобильные) → fallback `navigator.clipboard.writeText` (десктоп)

**`showToast(message)`** (строки 325–335): Показывает `#toast` на 2 секунды.

### 5.7. Массив городов CITIES (строки 337–395)

57 объектов: `{id, name, region, lat, lon, description}`.
- `lat`/`lon` — реальные GPS-координаты
- `description` — краткая историческая справка (1–2 предложения)
- Каждый город привязан к одному из 7 регионов

### 5.8. Модель состояния (строки 397–457)

**`STORAGE_KEY = "travelerPassport"`**

**`state`** — объект в памяти:
```javascript
{
  currentTab: "catalog",         // сохраняется
  travelerName: "...",           // сохраняется
  onboardingComplete: false,     // сохраняется
  visitedCities: {},             // сохраняется — {cityId: {date: "YYYY-MM-DD"}}
  openedRegions: [],             // НЕ сохраняется
  activeOverlayCityId: null,     // НЕ сохраняется
  stampOrigin: null,             // НЕ сохраняется
  catalogFilter: "all",          // НЕ сохраняется (сбрасывается при загрузке)
  catalogSearchQuery: "",        // НЕ сохраняется
  mapFilter: "all",              // НЕ сохраняется
  stampOverlayCityId: null       // НЕ сохраняется
}
```

**`loadState()`** (строки 409–457):
1. Читает `localStorage`, парсит JSON
2. Восстанавливает `currentTab`, `travelerName`, `onboardingComplete`
3. **Валидация `visitedCities`:** проверяет формат дат (`/^\d{4}-\d{2}-\d{2}$/`), существование cityId в CITIES, тип объекта
4. При невалидных данных — автокоррекция через `saveState()`
5. При ошибке парсинга — полный сброс к дефолту
6. Устанавливает эфемерные поля в дефолтные значения

**`saveState()`** (строки 459–471):
- Сохраняет ТОЛЬКО `{currentTab, travelerName, onboardingComplete, visitedCities}`
- При ошибке (QuotaExceeded) — показывает тост с просьбой освободить место

### 5.9. Навигация по вкладкам (строки 473–502)

**`switchTab(tabId)`**:
1. Обновляет `state.currentTab` + `saveState()`
2. Убирает `.active` у всех `.tab-content`, ставит `.active` на целевой
3. Обновляет `.tab-btn.active` по data-tab
4. Вызывает соответствующий render-метод: `renderCatalog()`, `renderPassport()`, `renderMap()`, `renderProfile()`

### 5.10. Рендер каталога (строки 504–572)

**`renderCatalog()`**:
1. Очищает `#catalog-list`
2. Проверяет пустые состояния:
   - Фильтр «visited» при 0 посещённых → заглушка «Здесь появятся города...»
   - Фильтр «unvisited» при 57/57 → заглушка «Ура! Вы прошли всю Беларусь!»
3. Обходит REGIONS → для каждого фильтрует CITIES по (filter + searchQuery)
4. Создаёт `.region-group` с заголовком + `.city-item` для каждого города
5. Если ничего не найдено при поиске → «Ничего не найдено»

**`handleCatalogClick(e)`** (строки 578–584): Делегированный обработчик — находит `.city-item` по `e.target.closest()`, вызывает `openCityCard()`.

### 5.11. Рендер паспорта (строки 586–666)

**`renderPassport()`**:
1. Обновляет счётчик `#passport-count`
2. Для каждого региона:
   - Вычисляет `regionVisited` / `regionTotal`, `isComplete`
   - Аккордеон с классом `.open` если регион в `state.openedRegions`
   - Бейдж: `badge-gold «Пройден»` или `badge-silver «Старт»` (для Минска)
   - Сетка `.stamps-grid` с ячейками `.stamp-cell`, каждая содержит `createStampSVG()` + название

**`handlePassportClick(e)`** (строки 641–666):
- Клик по `.accordion-header` → toggle `.open` + добавление/удаление из `openedRegions`
- Клик по `.stamp-cell` → `openCityCard()`

### 5.12. Онбординг (строки 668–690)

**`showOnboarding()`** / **`hideOnboarding()`**: toggle класса `.visible` на `#onboarding-overlay`

**`handleOnboardingContinue()`**: берёт имя из input, сохраняет «Белорусский путешественник» если пустое, ставит `onboardingComplete = true`.

**`handleOnboardingSkip()`**: ставит дефолтное имя + `onboardingComplete = true`.

### 5.13. Рендер профиля (строки 692–834)

**`formatDateDisplay(dateStr)`**: «2025-04-12» → «12.04.2025»

**`renderProfile()`**:
1. **Блок имени:** отображение + inline-редактирование (кнопка-карандаш, input, save/cancel)
2. **Общая статистика:** число «X из 57» + зелёный прогресс-бар
3. **Прогресс по 7 регионам:** название + счётчик + цветной прогресс-бар
4. **Хроника посещений:** список посещённых городов
   - Сортировка: `date` по убыванию, при совпадении — `localeCompare("ru")` по названию
   - Пустое состояние: «Вы пока не посетили ни одного города...»
5. Навешивает addEventListener на кнопки редактирования имени, Enter/Escape в input

### 5.14. Утилиты (строки 805–834)

**`escapeHtml(str)`**: создаёт текстовый узел, читает innerHTML — защита от XSS.

**`startEditName()`**: прячет display, показывает edit-row, ставит фокус + select.

**`saveEditName()`**: берёт значение input, сохраняет, ре-рендерит профиль.

**`cancelEditName()`**: ре-рендерит профиль.

### 5.15. Карточка города (строки 836–909)

**`isProcessing`** (строка 836): Флаг-мьютекс, предотвращает двойные нажатия. Ставится на 400мс.

**`openCityCard(cityId)`** (строки 838–856):
1. Проверяет `isProcessing`, блокирует
2. Сохраняет `stampOrigin` (вкладка, с которой открыт город)
3. Рендерит карточку, показывает overlay, блокирует tab-bar
4. Через 400мс снимает блокировку

**`closeCityCard()`** (строки 858–864): Скрывает overlay, разблокирует tab-bar, обнуляет origin.

**`renderCityCard(cityId)`** (строки 866–909):
- Название, регион, описание, миниатюра штампа (80×80)
- Если не посещён: кнопка «Я здесь был» → `openDatePicker()`
- Если посещён: дата визита + кнопка «Удалить отметку» → `removeVisit()`

### 5.16. Выбор даты (строки 911–941)

**`openDatePicker(cityId)`**:
- Заголовок «Когда вы посетили {город}?»
- `<input type="date">` с max=сегодня, value=сегодня
- Кнопки «Отмена» и «Подтвердить»

**`closeDatePicker()`**: Скрывает модалку.

### 5.17. Подтверждение и удаление визита (строки 943–968)

**`confirmVisit(cityId, date)`**:
1. Проверяет `isProcessing`
2. Записывает `{date: date}` в `state.visitedCities`
3. `saveState()`, закрывает date-picker
4. Показывает stamp-overlay с анимацией

**`removeVisit(cityId)`**:
1. Проверяет `isProcessing`
2. `delete state.visitedCities[cityId]`
3. `saveState()`, закрывает city-card

### 5.18. Инициализация и обработчики событий (строки 970–1251)

**`init()`** (строка 970): Вызывается на `DOMContentLoaded`.

**Последовательность регистрации обработчиков:**

1. **Tab Bar** (строки 973–978): click → делегирование, `.tab-btn` → `switchTab()`
2. **Каталог — список** (строки 980–981): click → `handleCatalogClick()`
3. **Каталог — контролы** (строки 983–1006):
   - Фильтры: click → делегирование по `.filter-btn`, toggle active, `renderCatalog()`
   - Поиск: `input` с debounce 300мс → `state.catalogSearchQuery` → `renderCatalog()`
4. **Паспорт** (строки 1008–1009): click → `handlePassportClick()`
5. **Карта — клик по городу** (строки 1011–1022): click → делегирование по `.map-point`, проверка `suppressMapClick`, установка `stampOrigin = "map"`, `openCityCard()`
6. **Карта — фильтры** (строки 1024–1035): click → toggle `.map-filter-btn`, `renderMap()`
7. **Зум — кнопки +/−** (строки 1037–1055): `zoomAtPoint()` с центром экрана, factor 1/1.5 и 1.5
8. **Зум — колёсико мыши** (строки 1057–1067): `wheel` на SVG, `preventDefault`, зум к точке курсора, factor 1.15
9. **Зум — touch (пинч и драг)** (строки 1069–1164):
   - `touchstart`: 2 пальца → pinch (запоминание начальной дистанции + viewBox), 1 палец → подготовка к drag
   - `touchmove`: pinch → пересчёт viewBox с сохранением центра пинча; drag (порог 8px) → панорамирование только при зуме >1x
   - `touchend`: сброс состояний, при переходе от 2→1 пальцу — инициализация нового drag-контекста
10. **Зум — мышь drag** (строки 1166–1206):
    - `mousedown` на SVG (только при зуме >1x): старт drag
    - `mousemove` на document: если сдвиг >4px → панирование
    - `mouseup` на document: если был drag → `suppressMapClick = true`
11. **Stamp overlay** (строки 1208–1219): клик по фону (e.target === e.currentTarget) → закрытие + возврат на stampOrigin
12. **Онбординг** (строки 1221–1232): click на continue/skip, Enter в input
13. **Оверлеи** (строки 1234–1240): клик по фону city-card и date-picker → закрытие

**Финальные шаги init()** (строки 1242–1249):
- `renderCatalog()` — первичный рендер
- Проверка `onboardingComplete` → показать/скрыть онбординг
- `switchTab(state.currentTab)` — восстановление вкладки

---

## 6. Карта Беларуси — полное техническое описание

### 6.1. Источник контура
- **Репозиторий:** `github.com/johan/world.geo.json`
- **Файл:** `countries/BLR.geo.json`
- **Формат:** GeoJSON `Feature` с `Polygon` (44 точки, координаты [lon, lat])
- **Лицензия:** открытая (public domain)

### 6.2. Обработка контура
- 44 точки полигона спроецированы через `projectToSVG(lat, lon)` в SVG-координаты
- Обнаружено: 3 города (Высокое, Мстиславль, Лоев) оказались за пределами упрощённого контура
- **Решение:** равномерная инфляция полигона на 3% от центроида:
  1. Вычислен центроид (среднее x, y всех точек)
  2. Каждая точка сдвинута: `новая = центроид + (точка − центроид) × 1.03`
  3. Проверено: все 57 городов прошли тест point-in-polygon (ray casting)

### 6.3. SVG-структура карты
```html
<svg id="belarus-map" viewBox="1.472 1.809 1626.241 1450.672"
     preserveAspectRatio="xMidYMid meet">
  <path d="M 73.16,677.84 L 233.46,679.76 ..." fill="#e8e8e8" stroke="#ccc"/>
  <g id="map-points-layer">
    <!-- для каждого города -->
    <g class="map-point" data-city-id="minsk">
      <circle class="hitbox" cx="..." cy="..." r="22" fill="transparent"/>
      <circle class="dot" cx="..." cy="..." r="7" fill="#C0C0C0"/>
      <text class="map-label" x="..." y="..." dy="0.35em" visibility="hidden"
            font-size="26" fill="#333" stroke="#fff" stroke-width="3"
            paint-order="stroke fill">Минск</text>
    </g>
  </g>
</svg>
```

### 6.4. Система зума

| Метод ввода | Обработчик | Поведение |
|-------------|-----------|-----------|
| Кнопка «+» | click | zoom ×1.5 к центру экрана |
| Кнопка «−» | click | zoom ÷1.5 от центра |
| Колёсико мыши | wheel | непрерывный зум ×1.15 к точке курсора |
| Pinch (2 пальца) | touchstart/move/end | зум пропорционально расстоянию, к центру пинча |
| Drag (1 палец, зум>1x) | touchstart/move/end | панорамирование, порог 8px |
| Drag (мышь, зум>1x) | mousedown/move/up | панорамирование, порог 4px |

**Ограничения:**
- Минимальный зум: 1x (исходный масштаб, авто-сброс)
- Максимальный зум: 5x (`minW = origW / 5`)
- Перетаскивание работает только при зуме >1% от исходного

**Защита от ложных кликов:**
- После перетаскивания (touch drag или mouse drag) устанавливается `suppressMapClick = true`
- В обработчике клика по карте проверяется этот флаг → клик блокируется

### 6.5. Подписи городов

**Условие появления:** zoomLevel >= 1.8 (вычисляется как `MAP_ORIG_VB.w / mapViewBox.w`)

**Стиль подписи:**
- `font-size: 26` SVG-единиц → ~12px при 1.8x зуме, ~20px при 3x
- `dy: 0.35em` — вертикальное центрирование относительно точки
- Отступ от точки: `x = dot.x + 14` (подпись правее)
- Белый контур: `stroke: #fff`, `stroke-width: 3`, `paint-order: stroke fill` — текст с halo, читаемый на любом фоне

**Collision detection (алгоритм):**
1. Для каждой подписи вычисляется экранный AABB:
   - Ширина: `text.length × 26 × 0.48 × (containerWidth / viewBoxWidth)`
   - Высота: `26 × (containerHeight / viewBoxHeight)`
   - Padding: 4px с каждой стороны
2. Массив подписей сортируется: посещённые города первыми
3. Жадное размещение: подпись показывается только если её AABB не пересекается ни с одним уже размещённым
4. Формула пересечения: `!(A.right < B.left || A.left > B.right || A.bottom < B.top || A.top > B.bottom)`
5. Перекрывающиеся подписи получают `visibility: hidden`

---

## 7. Модель данных localStorage

### Сохраняемые поля
```json
{
  "currentTab": "catalog",
  "travelerName": "Белорусский путешественник",
  "onboardingComplete": true,
  "visitedCities": {
    "minsk": { "date": "2025-04-12" },
    "nesvizh": { "date": "2025-05-01" }
  }
}
```

### Эфемерные поля (сбрасываются при загрузке)
| Поле | Дефолт | Назначение |
|------|--------|------------|
| `catalogFilter` | `"all"` | Активный фильтр каталога |
| `catalogSearchQuery` | `""` | Текст поиска |
| `mapFilter` | `"all"` | Фильтр карты |
| `stampOverlayCityId` | `null` | Текущий город в overlay |
| `openedRegions` | `[]` | Раскрытые аккордеоны |
| `activeOverlayCityId` | `null` | Город в карточке |
| `stampOrigin` | `null` | Вкладка-источник чекина |

### Валидация при загрузке
- Даты проверяются regex `/^\d{4}-\d{2}-\d{2}$/`
- cityId проверяется на существование в CITIES
- visitedCities проверяется на тип `object` (не `array`)
- travelerName проверяется на тип `string`
- Невалидные данные автоматически корректируются и пересохраняются

---

## 8. Города и регионы

| # | Регион | id | Цвет | Города |
|---|--------|----|------|--------|
| 1 | Минск | minsk | #C0C0C0 | Минск (1) |
| 2 | Минская область | minsk_obl | #E74C3C | Несвиж, Мир, Заславль, Слуцк, Борисов, Молодечно, Клецк, Копыль, Марьина Горка, Столбцы (10) |
| 3 | Брестская | brest | #3498DB | Брест, Пинск, Кобрин, Берёза, Каменец, Коссово, Ружаны, Пружаны, Давид-Городок, Высокое (10) |
| 4 | Гродненская | grodno | #27AE60 | Гродно, Новогрудок, Лида, Слоним, Волковыск, Мосты, Дятлово, Щучин, Ошмяны (9) |
| 5 | Витебская | vitebsk | #F39C12 | Полоцк, Витебск, Орша, Браслав, Глубокое, Лепель, Дисна, Докшицы, Миоры (9) |
| 6 | Могилёвская | mogilev | #9B59B6 | Могилёв, Бобруйск, Мстиславль, Быхов, Кричев, Шклов, Чериков, Чаусы (8) |
| 7 | Гомельская | gomel | #1ABC9C | Гомель, Туров, Мозырь, Речица, Ветка, Чечерск, Лоев, Добруш, Калинковичи, Рогачёв (10) |

---

## 9. Ключевые архитектурные решения

1. **Event delegation:** все обработчики навешиваются на контейнеры (`#catalog-list`, `#passport-list`, `#map-container`, `#tab-bar`), а не на отдельные элементы. Это позволяет пересоздавать DOM без утечек слушателей.

2. **Мьютекс `isProcessing`:** предотвращает двойные нажатия на «Я здесь был» и «Поделиться». Блокирует на 400мс.

3. **Selectively saveState:** в localStorage попадают только 4 поля (currentTab, travelerName, onboardingComplete, visitedCities). Эфемерные поля UI не сохраняются.

4. **CSS Grid аккордеон:** вместо `max-height` transition используется `grid-template-rows: 0fr → 1fr` — плавная анимация без знания высоты контента.

5. **XSS-защита:** все пользовательские данные (имя, названия городов) проходят через `escapeHtml()`.

6. **iOS font-size 16px:** поле поиска имеет `font-size: 16px` — предотвращает авто-зум страницы при фокусе на iOS.

7. **Touch-action: none:** на `#map-container` отключает стандартные жесты браузера (зум страницы при pinch), чтобы работал кастомный pinch-to-zoom карты.

8. **ViewBox-манипуляция для зума:** вместо CSS transform (который не меняет координатное пространство SVG) изменяется атрибут viewBox — точки, подписи и контур масштабируются нативно.

---

## 10. Что НЕ реализовано (не входит в MVP)

Геолокация, GPS-автоотметка, социальные функции (друзья, ленты), построение маршрутов, push-уведомления, монетизация, регистрация, облачная синхронизация, мультиязычность, адаптив под десктоп/планшет, тестовая инфраструктура (unit-тесты), CI/CD.
