# Паспорт путешественника по Беларуси — Описание приложения и кодовой базы

## 1. Что делает приложение

**Паспорт путешественника по Беларуси** — мобильное PWA-приложение для коллекционирования цифровых штампов городов Беларуси. Пользователь отмечает посещённые города с указанием даты, планирует будущие поездки, оставляет заметки о городах, собирает штампы по регионам и отслеживает прогресс на карте.

### Основные сценарии использования

**Отметить посещение города:**
Пользователь находит город (через поиск, в списке по регионам или на карте), открывает карточку города, нажимает «Я здесь был», выбирает дату визита. На экране появляется анимированный штамп — «печать» города. Штамп навсегда добавляется в коллекцию в разделе «Паспорт».

**Запланировать поездку (вишлист):**
В карточке непосещённого города пользователь нажимает иконку закладки. Город добавляется в «В планах». На карте такой город помечается флажком. В паспорте доступен отдельный фильтр «В планах». При подтверждении визита город автоматически убирается из планов.

**Оставить заметку:**
В карточке города есть текстовое поле для заметок. Placeholder зависит от статуса: «Впечатления, заметки на память...» для посещённых, «Что посмотреть, куда зайти...» для непосещённых. Заметки сохраняются автоматически (debounce 300мс) и переживают удаление визита.

**Просмотреть коллекцию штампов:**
Вкладка «Паспорт» показывает коллекцию в виде аккордеонов по 7 регионам. Каждый регион — сетка штампов. Посещённые города — с цветным штампом, непосещённые — серым контуром. Доступен поиск по названию и 4 фильтра (все / посещённые / непосещённые / в планах).

**Исследовать карту:**
Вкладка «Карта» показывает интерактивную SVG-карту Беларуси с 57 точками городов. Зум (кнопки, пинч, колёсико), панирование (свайп, drag), подписи городов при зуме ≥1.8x. Три фильтра: все города / посещённые / в планах.

**Отслеживать статистику:**
Вкладка «Профиль» показывает имя путешественника (редактируемое), общее количество посещённых городов из 57, количество запланированных, прогресс-бары по каждому из 7 регионов, хронологию посещений (список с датами).

**Поделиться достижением:**
При получении нового штампа пользователь может поделиться текстом «Я посетил {город} и получил штамп в Паспорте путешественника по Беларуси! 🇧🇾» через Web Share API (мобильные) или копирование в буфер (десктоп).

### Технические характеристики

| Параметр | Значение |
|----------|----------|
| Форм-фактор | Строго мобильный, портретная ориентация, 390–430dp |
| Стек | Чистый HTML + CSS + JavaScript (`"use strict"`, без сборки, без библиотек) |
| Хранение | `localStorage`, ключ `"travelerPassport"`, бэкенда нет |
| PWA | manifest.json, Service Worker, оффлайн-кэш, SVG-иконки |
| Вкладки | 3: Паспорт, Карта, Профиль |
| Города | 57 в 7 регионах |
| Запуск | `file:///` или HTTP, деплой в подпапку (все пути относительные) |

---

## 2. Файловая структура

```
F:\projects\traveler-passport\
├── index.html              (108 строк)  — HTML-разметка
├── style.css               (1254 строки)— все стили
├── app.js                  (1559 строк) — вся логика
├── manifest.json           (22 строки)  — PWA-манифест
├── sw.js                   (41 строка)  — Service Worker
├── icon-192.svg                          — иконка 192px
├── icon-512.svg                          — иконка 512px
├── conf                                 — конфигурационный файл
└── .kilo/plans/
    ├── MVP_v1/                           — спецификация + промпты v1
    ├── MVP_v2/                           — спецификация + промпты v2
    └── MVP_v3/                           — папка для v3
```

---

## 3. index.html — Структура разметки (108 строк)

### 3.1. `<head>` (строки 1–11)
- `charset="UTF-8"`, viewport с `user-scalable=no`
- `theme-color` meta (#2c3e50)
- Подключены `manifest.json`, `icon-192.svg`, `style.css`

### 3.2. Онбординг (`#onboarding-overlay`, строки 13–23)
- Полноэкранный белый оверлей, скрыт по умолчанию (`display: none`)
- Показывается через класс `.visible` (→ `display: flex`)
- Заголовок «Добро пожаловать в Паспорт путешественника!»
- Поле ввода имени (`#onboarding-name-input`, maxlength=50)
- Кнопки «Продолжить» и «Пропустить»

### 3.3. Контейнер приложения (`#app`, строки 25–87)
`max-width: 430px`, центрирован, `overflow: hidden`, белый фон.

**Вкладка «Паспорт» (`#tab-passport`, строки 26–47):**
- `.passport-sticky-header` — обёртка для sticky-позиционирования заголовка и контролов вместе
  - `<header class="passport-header">`:
    - `<h1>Мой паспорт</h1>`
    - `#passport-count` («0 из 57»)
  - `.passport-controls`:
    - `<form class="passport-search-form">` с `#passport-search` (placeholder «Поиск города...»)
    - `.passport-filter-tabs` — 4 кнопки: `data-filter="all|visited|unvisited|planned"` (Все / Посещённые / Непосещённые / В планах)
- `#passport-list` (рендерится JS — два режима: поиск или фильтр-аккордеоны)

**Вкладка «Карта» (`#tab-map`, строки 48–70):**
- `<header class="map-header">` с `<h1>Карта Беларуси</h1>`
- `.map-controls` — 3 кнопки фильтра: `data-map-filter="all|visited|planned"` (Все города / Посещённые / В планах)
- `#map-container` (position: relative, touch-action: none):
  - `<svg id="belarus-map">` — viewBox `1.472 1.809 1626.241 1450.672`, preserveAspectRatio `xMidYMid meet`
    - `<path>` — контур границы Беларуси (44 точки, инфлирован на 3%)
    - `<g id="map-points-layer">` — точки городов (рендерится JS один раз)
  - `#map-empty-overlay` — пустое состояние (скрыто по умолчанию)
  - `.map-zoom-controls` — кнопки зума «+» и «−» (position: absolute, bottom-right)

**Вкладка «Профиль» (`#tab-profile`, строки 71):**
- Пустой контейнер, полностью рендерится JS в `renderProfile()`

**Нижняя навигация (`#tab-bar`, строки 73–86):**
- `position: fixed`, `bottom: 0`, `max-width: 430px`
- 3 кнопки со SVG-иконками: Паспорт (документ), Карта (полигон), Профиль (силуэт)
- Класс `.active` на текущей вкладке, `.tab-bar-blocked` при открытом оверлее (pointer-events: none, opacity: 0.5)

### 3.4. Оверлеи (строки 89–100)

| Элемент | z-index | Назначение |
|---------|---------|------------|
| `#city-card-overlay` | 100 | Карточка города (dark backdrop) |
| `#date-picker-modal` | 200 | Выбор даты визита |
| `#stamp-overlay` | 300 | Экран «Штамп получен» |
| `#toast` | 400 | Тост-уведомление (bottom: 90px) |

### 3.5. Service Worker (строки 102–106)
Регистрация `sw.js` (относительный путь) при загрузке.

---

## 4. style.css — Детальный разбор стилей (1254 строки)

### 4.1. Сброс и базовые стили (1–30)
- Универсальный сброс `*, *::before, *::after`
- `-webkit-tap-highlight-color: transparent` — убран синий outline при тапе
- `html`: `font-size: 16px`, antialiased, text-size-adjust 100%
- `body`: системный шрифт (`-apple-system, BlinkMacSystemFont, "Segoe UI"...`), фон `#e5e5e5`
- `#app`: `max-width: 430px`, центрирован, белый фон, `min-height: 100vh`, `overflow: hidden`

### 4.2. Система вкладок и Tab Bar (32–101)
- `.tab-content`: `display: none`, `padding: 0 16px`, `padding-bottom: 72px` (отступ под tab-bar), `min-height: calc(100vh - 56px)`, `overflow-y: auto`, `-webkit-overflow-scrolling: touch`
- `.tab-content.active`: `display: block`
- `#tab-bar`: fixed, bottom: 0, max-width: 430px, height: 56px, border-top, `padding-bottom: env(safe-area-inset-bottom)`
- `.tab-btn`: flex-column, gap 2px, `min-width: 44px`, `min-height: 44px`, SVG 22×22, текст 0.625rem
- `.tab-btn.active`: цвет `#1a1a1a`, `stroke-width: 2.5`
- Hover-стили только при `@media (hover: hover)`

### 4.3. Онбординг (103–196)
- `#onboarding-overlay`: fixed, z-index: 1000, белый фон, `display: none` → `.visible` → `display: flex`
- `.onboarding-content`: max-width 430px, padding 32px 24px, text-align center
- `.onboarding-input`: width 100%, max-width 320px, border 2px, border-radius 12px, min-height 48px, при focus → border-color `#27AE60`
- Кнопки: primary (зелёная), secondary (серая), min-height 48px, border-radius 12px

### 4.4. Профиль (198–422)
- Имя: `.profile-name-block` (flex, gap 12px), кнопка-карандаш 44×44px
- `.profile-name-text.is-default`: серый цвет, если имя дефолтное
- Редактирование: `.profile-edit-row` (flex), input + save/cancel, при focus → зелёная рамка
- Статистика: `.profile-stat-number` (2rem, bold 700) + `.profile-stat-label` (1rem, #666)
- Блок «В планах»: `.profile-planned-row` (flex, space-between) → `.profile-planned-label` + `.profile-planned-count`
- Прогресс-бары: `.progress-bar-track` (height 10px, border-radius 8px, фон #f0f0f0), `.progress-bar-fill` (transition width 0.3s)
- Региональные прогресс-бары: 7 штук, цвет заливки = цвет региона
- Разделители: `.profile-divider` (1px, #f0f0f0, margin 20px 0)
- Хроника: `.chronicle-item` (flex, space-between, min-height 44px, border-bottom)
- Пустое состояние хроники: курсив, цвет #999

### 4.5. Паспорт — sticky-заголовок и контролы (424–713)

**Sticky-обёртка:**
- `.passport-sticky-header`: `position: sticky; top: 0; background: #fff; z-index: 10` — обёртка для заголовка и контролов вместе

**Заголовок:**
- `.passport-header`: `padding: 20px 0 12px`
- `.passport-header h1`: 1.375rem, bold 700
- `.passport-count`: 1.125rem, bold 600, цвет #666

**Контролы поиска и фильтров:**
- `.passport-controls`: `padding: 0 0 12px 0`
- `#passport-search`: width 100%, min-height 44px, `font-size: 16px` (предотвращает зум на iOS), border 2px, border-radius 10px, при focus → зелёная рамка
- `.passport-filter-tabs`: flex, gap 6px
- `.passport-filter-btn`: flex 1, min-height 38px, border 2px, border-radius 10px, font-size 0.75rem, font-weight 600
  - `.active`: фон #1a1a1a, белый текст
  - `.disabled`: opacity 0.4, `pointer-events: none` — состояние при активном поиске

**Режим поиска (плоский список):**
- `#passport-list`: `transition: opacity 150ms ease` — для fade при смене режима
- `.passport-search-result`: flex, gap 12px, min-height 56px, border-bottom, cursor pointer
  - `:active` → фон #f5f5f5
- `.passport-search-icon`: 48×48px, миниатюра штампа
- `.passport-search-name`: flex 1, font-size 0.9375rem
- `.passport-search-status`: 20×20px, иконка статуса (галочка/флажок)
- `.passport-search-empty`: центрированный курсивный текст

**Режим фильтра (аккордеоны):**
- `.accordion-item`: border-bottom 1px
- `.accordion-header`: flex, gap 10px, min-height 52px, cursor pointer
  - `:active` → background + отрицательный margin для визуального расширения
  - Цветная точка 12px + название + бейдж + счётчик + стрелка
  - Бейджи: `.badge-gold` (фон #FFF3B0, текст #B8860B), `.badge-silver` (фон #E8E8E8, текст #808080)
  - Стрелка: SVG 20×20, `transition: transform 0.3s`, при `.open` → `rotate(180deg)`
  - Тело аккордеона: `display: grid`, `grid-template-rows: 0fr` → `.open` → `1fr`, `transition 0.3s`
  - `.accordion-inner`: `overflow: hidden`
- Сетка штампов `.stamps-grid`: `repeat(auto-fill, minmax(70px, 1fr))`, gap 10px
- `.stamp-cell`: flex-column, min-height 80px
- `.stamp-icon`: 48×48px, при `.visited` → цвет через CSS-переменную `--region-color`
- `.stamp-name`: 0.6875rem, text-align center, при `.visited` → цвет #333, bold

### 4.6. Карточка города (715–893)

**Overlay:**
- `#city-card-overlay`: fixed, z-index 100, backdrop rgba(0,0,0,0.5), flex center, `overscroll-behavior-y: contain`

**Карточка:**
- `.city-card`: white, border-radius 16px, max-width 400px, width 100%, padding 20px
- `max-height: 90vh; max-height: 90dvh;` — progressive enhancement (90vh объявлен раньше 90dvh: браузеры без поддержки dvh используют 90vh)

**Заголовок:**
- `.city-card-header`: flex, `justify-content: space-between`, `align-items: flex-start`, gap 16px, margin-bottom 20px
- `.city-card-title-block`: flex 1, min-width 0 — обёртка для названия и региона
- `.city-card-actions`: flex, gap 8px, flex-shrink 0 — обёртка для кнопок (закладка + закрытие)
- `.city-card-btn-wishlist` и `.city-card-btn-close`: 40×40px, border-radius 50%, background #f5f5f5, border none, cursor pointer
- `.city-card-btn-close`: font-size 24px, символ «×», цвет #999
- `.city-card-btn-wishlist.active`: `background: color-mix(in srgb, var(--region-color, #27AE60) 12%, transparent); color: var(--region-color, #27AE60)` — цвет активной закладки через `color-mix()`
- `.city-card-name`: 1.5rem, bold 700

**Содержимое:**
- `.city-card-stamp`: 80×80px, margin 12px auto 16px, при `.visited` → цвет региона
- `.city-card-description`: 0.9375rem, line-height 1.5, margin-bottom 20px
- `.city-card-note`: textarea, width 100%, min-height 80px, padding 12px, border 1.5px, border-radius 12px, resize none, при focus → зелёная рамка, фон #fcfcfc
- `.city-card-date`: 0.9375rem, дата с жирным выделением
- Кнопки: `.city-card-btn-primary` (зелёная), `.city-card-btn-danger` (красная), min-height 48px

### 4.7. Дата-пикер (895–973)
- `#date-picker-modal`: fixed, z-index 200, backdrop rgba(0,0,0,0.5)
- Карточка: white, border-radius 16px, max-width 360px
- Input: `<input type="date">`, border 2px, border-radius 12px, min-height 48px
- Кнопки «Отмена» и «Подтвердить»: flex 1, min-height 48px

### 4.8. Карта (975–1107)
- `.map-header`: sticky, top: 0, z-index: 10, padding 20px 0 12px
- `.map-controls`: flex, gap 8px, margin-bottom 12px
- `.map-filter-btn`: flex 1, min-height 38px, border 2px, border-radius 10px
  - `.active`: фон #1a1a1a, белый текст
- `#map-container`: position relative, `touch-action: none`, `overflow: hidden`
- `.map-zoom-controls`: absolute, bottom 16px, right 16px, flex-column, gap 8px, z-index 10
- `.map-zoom-btn`: 40×40px, круглая, тень, белый фон
- SVG: `display: block`, `width: 100%`, `height: auto`
- `.map-point`: cursor pointer
- `.hitbox`: fill transparent (r=22 — зона тапа 44×44dp)
- `.dot`: transition r 0.15s, при hover → r: 7
- `.map-point-hidden`: `display: none` — скрытие точек при фильтре
- `.map-empty-overlay`: absolute, `background: rgba(255,255,255,0.7)`, `backdrop-filter: blur(4px)` — полупрозрачная плашка с подсказкой

### 4.9. Экран «Штамп получен» (1127–1225)
- `#stamp-overlay`: fixed, z-index 300, backdrop rgba(0,0,0,0.7)
- `.stamp-card`: white, border-radius 20px, max-width 340px, padding 32px 24px
- `.stamp-card-icon`: 200×200px, анимация `stamp-imprint 0.4s ease-out` (scale 1.6 → 1, rotate -15deg → 0)
- Кнопки «Поделиться» (серая) и «В коллекцию» (зелёная), min-height 48px
- `.stamp-highlight`: анимация `stamp-pulse 2s` (box-shadow от зелёного 10px до нуля)

### 4.10. Тост (1227–1247)
- `#toast`: fixed, bottom 90px, горизонтально по центру, фон #1a1a1a, белый текст, z-index 400
- Показывается 2 секунды, класс `.visible` → `display: block !important`

### 4.11. Адаптив (1249–1254)
- `@media (max-width: 430px)`: `#tab-bar` без центрирования (left: 0, transform: none)

---

## 5. app.js — Детальный разбор логики (1559 строк)

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

### 5.3. Рендер карты — три функции (строки 52–188)

Карта использует трёхфункциональную архитектуру: одноразовое построение DOM + обновление стилей + фильтрация через CSS-классы. Перестройки DOM при смене фильтра или отметке города не происходит.

**`mapPointsInitialized`** (строка 52): Флаг — построены ли уже DOM-точки.

**`initMapPoints()`** (строки 54–115): Одноразовое построение DOM-точек.
1. Проверяет `mapPointsInitialized`, выходит если уже построено
2. Очищает `#map-points-layer`, создаёт DocumentFragment
3. Для каждого города:
   - Вычисляет позицию через `projectToSVG()`
   - Создаёт `<g class="map-point" data-city-id="...">` с четырьмя элементами:
     - `<circle class="hitbox">` — r=22, fill transparent (зона тапа 44dp)
     - `<circle class="dot">` — r=7, fill #ccc (дефолтный серый цвет)
     - `<g class="map-flag">` — флажок для запланированных городов: `<line>` (древко, `vector-effect="non-scaling-stroke"`) + `<rect>` (полотно), `display: none` по умолчанию
     - `<text class="map-label">` — название, visibility hidden, font-size 26, белый контур (stroke-width 3, paint-order stroke fill)
4. Добавляет fragment в layer, ставит флаг
5. Вызывает `updateMapLabels()` и `updateMapMarkers()`

**`updateMapMarkers()`** (строки 117–146): Обновление стилей точек без перестройки DOM.
- Обходит все `.map-point`, для каждого:
  - Вычисляет `isVisited` и `isPlanned` из state
  - Устанавливает цвет точки (`dot`): цвет региона если visited или planned, иначе #ccc
  - Показывает/скрывает флажок (`map-flag`): виден если planned и НЕ visited, цвет = регион
- Вызывается при: `initMapPoints()`, `switchTab("map")`, `togglePlanned()`, `confirmVisit()`, `removeVisit()`

**`updateMapFilter()`** (строки 148–188): Фильтрация точек через CSS-класс.
- Обходит все `.map-point`, для каждого вычисляет видимость по `state.mapFilter`:
  - `"all"` → виден
  - `"visited"` → виден если в `visitedCities`
  - `"planned"` → виден если в `plannedCities`
- Добавляет/удаляет класс `map-point-hidden` (CSS: `display: none`)
- Управляет `#map-empty-overlay`: если видимых 0 — показывает плашку с подсказкой
- Вызывается при: `switchTab("map")`, клике по фильтру, `togglePlanned()`, `confirmVisit()`, `removeVisit()`

### 5.4. Система зума карты (строки 190–224)

**Переменные состояния:**
- `MAP_ORIG_VB`: исходный viewBox (неизменный)
- `mapViewBox`: текущий viewBox (изменяется при зуме/пане)
- `suppressMapClick`: флаг блокировки клика после перетаскивания

**`updateMapViewBox()`** (строки 194–201):
- Устанавливает `viewBox` атрибут SVG
- Меняет курсор: `grab` при зуме >1x, `default` при 1x
- Вызывает `updateMapLabels()`

**`zoomAtPoint(cx, cy, factor)`** (строки 203–216):
- `factor < 1` = зум вперёд, `factor > 1` = зум назад
- Сохраняет пропорцию точки (rx, ry) — зум «к точке»
- Лимиты: макс. зум = 5x (`minW = origW / 5`), мин. = 1x (сброс)
- При выходе за 1x → `resetMapZoom()`

**`resetMapZoom()`** (строки 218–224): Возвращает viewBox к исходному.

### 5.5. Подписи городов на карте (строки 226–290)

**`updateMapLabels()`**:
1. Вычисляет `zoomLevel = origW / currentW`
2. При zoomLevel < 1.8 — скрывает все подписи
3. При zoomLevel >= 1.8:
   - Вычисляет масштаб SVG→пиксели через `getBoundingClientRect()`
   - Для каждой подписи вычисляет экранный bounding box:
     - Ширина: `text.length × fontSize(26) × 0.48 × scaleX` (коэффициент 0.48 — оценка ширины символа)
     - Высота: `fontSize × scaleY`
   - **Сортировка по приоритету:** посещённые города первыми
   - **Жадное размещение:** обходит подписи по порядку, показывает только те, чей box не пересекается ни с одним уже размещённым (проверка AABB: `!(right < left || left > right || bottom < top || top > bottom)`)
   - Остальные скрываются

### 5.6. Экран «Штамп получен» (строки 292–396)

**`renderStampOverlay(cityId)`** (строки 292–329):
- Генерирует карточку: иконка штампа (200×200, цвет региона) + название + 2 кнопки
- Кнопки получают индивидуальные addEventListener (не делегирование, т.к. оверлей пересоздаётся)

**`closeStampOverlay()`** (строки 331–334): Скрывает `#stamp-overlay`.

**`goToCollection(cityId)`** (строки 336–367):
1. Закрывает stamp-overlay и city-card
2. Переключает на вкладку «Паспорт»
3. Раскрывает нужный регион в аккордеоне
4. Через 300мс (ожидание рендера) — scrollIntoView к ячейке + класс `.stamp-highlight` на 2 секунды

**`showShareText(cityName)`** (строки 369–384):
- Генерирует текст: «Я посетил {город} и получил штамп в Паспорте путешественника по Беларуси! 🇧🇾»
- Web Share API (мобильные) → fallback `navigator.clipboard.writeText` (десктоп)

**`showToast(message)`** (строки 386–396): Показывает `#toast` на 2 секунды.

### 5.7. Массив городов CITIES (строки 398–456)

57 объектов: `{id, name, region, lat, lon, description}`.
- `id` — строковый идентификатор (например, `"minsk"`, `"mir"`, `"david_gorodok"`)
- `lat`/`lon` — реальные GPS-координаты
- `description` — краткая историческая справка (1–2 предложения)
- Каждый город привязан к одному из 7 регионов

### 5.8. Модель состояния (строки 458–571)

**`STORAGE_KEY = "travelerPassport"`**

**`state`** — объект в памяти (строки 460–470):
```javascript
{
  currentTab: "passport",         // сохраняется
  travelerName: "...",            // сохраняется
  onboardingComplete: false,      // сохраняется
  visitedCities: {},              // сохраняется — {cityId: {date: "YYYY-MM-DD"}}
  plannedCities: {},              // сохраняется — {cityId: true}
  cityNotes: {},                  // сохраняется — {cityId: "текст"}
  openedRegions: [],              // НЕ сохраняется
  activeOverlayCityId: null,      // НЕ сохраняется
  stampOrigin: null,              // НЕ сохраняется
}
```

Дополнительно, устанавливаются в `loadState()` (строки 550–554):
```javascript
state.passportFilter = "all";     // НЕ сохраняется
state.passportSearchQuery = "";   // НЕ сохраняется
state.mapFilter = state.mapFilter || "all"; // НЕ сохраняется
state.stampOverlayCityId = null;  // НЕ сохраняется
```

**`loadState()`** (строки 472–555):
1. Читает `localStorage`, парсит JSON
2. Восстанавливает `currentTab`, `travelerName`, `onboardingComplete`
3. **Валидация `visitedCities`:** проверяет формат дат (`/^\d{4}-\d{2}-\d{2}$/`), существование cityId в CITIES, тип объекта (не array)
4. **Валидация `plannedCities`:** проверяет значение `=== true`, существование cityId
5. **Валидация `cityNotes`:** проверяет тип `string`, существование cityId
6. **Конфликт visited vs planned** (строки 527–532): если город одновременно в `visitedCities` и `plannedCities`, удаляется из `plannedCities` (visited выигрывает)
7. При ошибке парсинга — полный сброс к дефолту
8. Устанавливает эфемерные поля в дефолтные значения

**`saveState()`** (строки 557–571):
- Сохраняет 6 полей: `{currentTab, travelerName, onboardingComplete, visitedCities, plannedCities, cityNotes}`
- При ошибке (QuotaExceeded) — показывает тост с просьбой освободить место

### 5.9. Навигация по вкладкам (строки 573–613)

**`switchTab(tabId)`**:
1. **При уходе с паспорта** (строки 574–583): сбрасывает поисковый запрос, очищает поле поиска, восстанавливает активный фильтр (снимает `.disabled`)
2. Обновляет `state.currentTab` + `saveState()`
3. Убирает `.active` у всех `.tab-content`, ставит `.active` на целевой
4. Обновляет `.tab-btn.active` по data-tab
5. Вызывает соответствующий render-метод:
   - `"passport"` → `renderPassport()`
   - `"map"` → ленивая инициализация: `initMapPoints()` если ещё не было + `updateMapMarkers()` + `updateMapFilter()`
   - `"profile"` → `renderProfile()`

### 5.10. Утилиты (строки 615–627)

**`getTodayLocal()`** (строки 615–617): Возвращает текущую дату в формате `YYYY-MM-DD` через `toLocaleDateString("sv-SE")` (шведская локаль = ISO-формат).

**`normalizeForSearch(str)`** (строки 619–627): Нормализация для поиска:
- `toLowerCase()`
- Замены: ё→е, і→и, ў→в
- Удаление дефисов и пробелов
- `trim()`

### 5.11. Рендер паспорта — два режима (строки 629–777)

Паспорт имеет два режима отображения: **поиск** (плоский список) и **фильтр** (аккордеоны по регионам). Переключение между ними происходит автоматически в зависимости от того, пустой ли поисковый запрос.

**`currentPassportMode`** (строка 629): Глобальная переменная — текущий режим (`"filter"` или `"search"`).

**`renderPassport()`** (строки 631–658):
1. Обновляет счётчик `#passport-count`
2. Вычисляет `newMode`: `"search"` если `passportSearchQuery !== ""`, иначе `"filter"`
3. **Fade при смене режима** (строки 648–657): если `newMode !== currentPassportMode`, устанавливает `opacity: 0`, через 150мс меняет содержимое и возвращает `opacity: 1`. Если режим не изменился — мгновенная замена без fade.
4. Делегирует рендер: `buildSearchResults()` или `buildFilterAccordions()`

**`buildSearchResults()`** (строки 660–700): Плоский список результатов поиска.
1. Фильтрует CITIES по `normalizeForSearch(city.name).includes(normalizedQuery)`
2. Для каждого результата:
   - Миниатюра штампа (48×48) в цвете региона
   - Название города
   - **Иконка статуса:** зелёная галочка если visited, SVG-флажок цвета региона если planned, пусто если ни того ни другого
3. Пустое состояние: «Ничего не найдено»

**`buildFilterAccordions()`** (строки 702–777): Аккордеоны по регионам с фильтрацией.
1. Обходит REGIONS → фильтрует CITIES по `state.passportFilter`:
   - `"all"` → все города региона
   - `"visited"` → только посещённые
   - `"unvisited"` → только непосещённые
   - `"planned"` → только в планах
2. Пропускает регионы с 0 городов после фильтра
3. Бейдж: `badge-gold «Пройден»` или `badge-silver «Старт»` (для Минска)
4. Сетка `.stamps-grid` с ячейками `.stamp-cell`
5. Пустые состояния для каждого фильтра

**`handlePassportClick(e)`** (строки 779–811): Делегированный обработчик.
- Клик по `.passport-search-result` → `openCityCard()`
- Клик по `.accordion-header` → toggle `.open` + управление `openedRegions`
- Клик по `.stamp-cell` → `openCityCard()`

### 5.12. Онбординг (строки 813–835)

**`showOnboarding()`** / **`hideOnboarding()`**: toggle класса `.visible` на `#onboarding-overlay`

**`handleOnboardingContinue()`**: берёт имя из input, сохраняет «Белорусский путешественник» если пустое, ставит `onboardingComplete = true`.

**`handleOnboardingSkip()`**: ставит дефолтное имя + `onboardingComplete = true`.

### 5.13. Рендер профиля (строки 837–953)

**`formatDateDisplay(dateStr)`** (строки 837–840): «2025-04-12» → «12.04.2025»

**`renderProfile()`** (строки 842–953):
1. **Блок имени:** отображение + inline-редактирование (кнопка-карандаш, input, save/cancel)
2. **Общая статистика:** число «X из 57» + зелёный прогресс-бар
3. **Блок «В планах: N»:** `.profile-planned-row` — количество запланированных городов
4. **Прогресс по 7 регионам:** название + счётчик + цветной прогресс-бар
5. **Хроника посещений:** список посещённых городов
   - Сортировка: `date` по убыванию, при совпадении — `localeCompare("ru")` по названию
   - Пустое состояние: «Вы пока не посетили ни одного города. Отправляйтесь в путь!»
6. Навешивает addEventListener на кнопки редактирования имени, Enter/Escape в input

### 5.14. Утилиты (строки 955–984)

**`escapeHtml(str)`**: создаёт текстовый узел, читает innerHTML — защита от XSS.

**`startEditName()`**: прячет display, показывает edit-row, ставит фокус + select.

**`saveEditName()`**: берёт значение input, сохраняет, ре-рендерит профиль.

**`cancelEditName()`**: ре-рендерит профиль.

### 5.15. Вишлист и заметки (строки 986–1020)

**`isProcessing`** (строка 986): Флаг-мьютекс, предотвращает двойные нажатия. Блокируется на 400мс.

**`noteDebounceTimer`** (строка 987): Таймер debounce для автосохранения заметок.

**`togglePlanned(cityId)`** (строки 989–1010):
1. Проверяет `isProcessing`
2. Блокирует если город уже visited (нельзя планировать посещённый)
3. Toggle: удаляет из `plannedCities` если есть, добавляет если нет
4. `saveState()`, сбрасывает debounce таймер
5. Перерисовывает карточку города
6. Обновляет карту (`updateMapMarkers()` + `updateMapFilter()`) если инициализирована

**`saveNote(cityId, text)`** (строки 1012–1020):
- Если текст не пустой → сохраняет в `state.cityNotes[cityId]`
- Если пустой → удаляет запись (`delete state.cityNotes[cityId]`)
- `saveState()`

### 5.16. Карточка города (строки 1022–1153)

**`openCityCard(cityId)`** (строки 1022–1043):
1. Проверяет `isProcessing`, блокирует
2. Сбрасывает debounce таймер заметок
3. Сохраняет `stampOrigin` (вкладка, с которой открыт город)
4. Рендерит карточку, показывает overlay, блокирует tab-bar
5. Через 400мс снимает блокировку

**`closeCityCard()`** (строки 1045–1062):
1. **Принудительное сохранение заметки** (строки 1047–1051): сбрасывает debounce, читает textarea, вызывает `saveNote()` — тройная защита вместе с `visibilitychange` и `pagehide`
2. Обнуляет `activeOverlayCityId` и `stampOrigin`
3. Скрывает overlay, разблокирует tab-bar
4. Если текущая вкладка — паспорт, ре-рендерит паспорт (обновляет иконки статусов)

**`renderCityCard(cityId)`** (строки 1064–1153):
- **Заголовок:**
  - `.city-card-header` (flex space-between)
    - `.city-card-title-block`: `<h2>` (название) + `<p>` (регион)
    - `.city-card-actions`: bookmark-кнопка (только для непосещённых) + close-кнопка
  - Bookmark: SVG outlined → filled, при `.active` → цвет через `--region-color`
  - Close: символ «×»
- **Штамп:** 80×80px, цвет региона если visited, #ccc если нет
- **Описание:** историческая справка
- **Textarea:** `#city-card-note`, maxlength=500
  - Placeholder зависит от статуса: «Впечатления, заметки на память...» если visited, «Что посмотреть, куда зайти...» если нет
- **Кнопки:** «Я здесь был» (непосещённые) или дата + «Удалить отметку» (посещённые)
- **Заметки — обработчики событий:**
  - `input` → debounce 300мс → `saveNote()`
  - В standalone-режиме (PWA): `focus` → `paddingBottom: 200px` + scrollIntoView через 300мс; `blur` → сброс padding — защита от перекрытия клавиатурой

### 5.17. Выбор даты (строки 1155–1185)

**`openDatePicker(cityId)`**:
- Заголовок «Когда вы посетили {город}?»
- `<input type="date">` с max=сегодня, value=сегодня (через `getTodayLocal()`)
- Кнопки «Отмена» и «Подтвердить»

**`closeDatePicker()`**: Скрывает модалку.

### 5.18. Подтверждение и удаление визита (строки 1187–1230)

**`confirmVisit(cityId, date)`** (строки 1187–1210):
1. Проверяет `isProcessing`
2. **Принудительное сохранение заметки** (строки 1191–1193): сбрасывает debounce, сохраняет textarea
3. **Удаляет из plannedCities** (строка 1195): при подтверждении визита город автоматически убирается из планов
4. Записывает `{date: date}` в `state.visitedCities`
5. `saveState()`, закрывает date-picker
6. Показывает stamp-overlay с анимацией
7. Обновляет карту (`updateMapMarkers()` + `updateMapFilter()`) если инициализирована

**`removeVisit(cityId)`** (строки 1212–1230):
1. Проверяет `isProcessing`
2. `delete state.visitedCities[cityId]`
3. `saveState()`, закрывает city-card
4. Ре-рендерит профиль если на нём
5. Обновляет карту если инициализирована
6. Заметки **не удаляются** — сохраняются в `cityNotes` даже после удаления визита

### 5.19. Инициализация и обработчики событий (строки 1232–1559)

**`init()`** (строка 1232): Вызывается на `DOMContentLoaded`.

**Последовательность регистрации обработчиков:**

1. **Tab Bar** (строки 1235–1240): click → делегирование, `.tab-btn` → `switchTab()`
2. **Паспорт — список** (строки 1242–1243): click → `handlePassportClick()`
3. **Паспорт — контролы** (строки 1245–1293):
   - Фильтры: click → делегирование по `.passport-filter-btn`, проверка `.disabled`, toggle active, `renderPassport()`
   - Поиск: `input` с debounce 250мс → `state.passportSearchQuery` → `renderPassport()`
     - При пустом поле: мгновенный сброс + разблокировка фильтров (снятие `.disabled`)
     - При непустом: блокировка фильтров (`.disabled` + снятие `.active`)
   - Форма поиска: `submit` → `preventDefault()` (предотвращает перезагрузку)
4. **Карта — клик по городу** (строки 1295–1306): click → делегирование по `.map-point`, проверка `suppressMapClick`, установка `stampOrigin = "map"`, `openCityCard()`
5. **Карта — фильтры** (строки 1308–1319): click → toggle `.map-filter-btn`, `updateMapFilter()`
6. **Зум — кнопки +/−** (строки 1321–1339): `zoomAtPoint()` с центром экрана, factor 1/1.5 и 1.5
7. **Зум — колёсико мыши** (строки 1341–1351): `wheel` на SVG, `preventDefault`, зум к точке курсора, factor 1.15
8. **Зум — touch (пинч и драг)** (строки 1353–1448):
   - `touchstart`: 2 пальца → pinch (запоминание начальной дистанции + viewBox), 1 палец → подготовка к drag
   - `touchmove`: pinch → пересчёт viewBox с сохранением центра пинча; drag (порог 8px) → панорамирование только при зуме >1x
   - `touchend`: сброс состояний, при переходе от 2→1 пальцу — инициализация нового drag-контекста
9. **Зум — мышь drag** (строки 1450–1490):
   - `mousedown` на SVG (только при зуме >1x): старт drag
   - `mousemove` на document: если сдвиг >4px → панирование
   - `mouseup` на document: если был drag → `suppressMapClick = true`
10. **Stamp overlay** (строки 1492–1503): клик по фону (e.target === e.currentTarget) → закрытие + возврат на stampOrigin
11. **Онбординг** (строки 1505–1516): click на continue/skip, Enter в input
12. **Оверлеи** (строки 1518–1524): клик по фону city-card и date-picker → закрытие
13. **visibilitychange** (строки 1526–1532): при сворачивании приложения с открытой карточкой → принудительное сохранение заметки
14. **pagehide** (строки 1534–1539): при уходе со страницы → принудительное сохранение заметки

**Финальные шаги init()** (строки 1541–1545):
- Проверка `onboardingComplete` → показать/скрыть онбординг
- `switchTab(state.currentTab)` — восстановление вкладки

**Service Worker update detection** (строки 1550–1559):
- `hasControllerOnLoad` (строка 1551): проверяет, был ли SW уже активен до загрузки — если нет, тост об обновлении не показывается (новый пользователь)
- `updateToastShown` (строка 1552): защита от двойного срабатывания `controllerchange`
- При `controllerchange`: если `hasControllerOnLoad && !updateToastShown` → тост «Приложение обновлено»

---

## 6. Карта Беларуси — техническое описание

### 6.1. Источник контура
- **Репозиторий:** `github.com/johan/world.geo.json`
- **Файл:** `countries/BLR.geo.json`
- **Формат:** GeoJSON `Feature` с `Polygon` (44 точки, координаты [lon, lat])
- **Лицензия:** открытая (public domain)

### 6.2. Обработка контура
- 44 точки полигона спроецированы через `projectToSVG(lat, lon)` в SVG-координаты
- Равномерная инфляция полигона на 3% от центроида:
  1. Вычислен центроид (среднее x, y всех точек)
  2. Каждая точка сдвинута: `новая = центроид + (точка − центроид) × 1.03`
  3. Проверено: все 57 городов прошли тест point-in-polygon (ray casting)

### 6.3. SVG-структура карты
```html
<svg id="belarus-map" viewBox="1.472 1.809 1626.241 1450.672"
     preserveAspectRatio="xMidYMid meet">
  <path d="M 73.16,677.84 L 233.46,679.76 ..." fill="#e8e8e8" stroke="#ccc"/>
  <g id="map-points-layer">
    <g class="map-point" data-city-id="minsk">
      <circle class="hitbox" cx="..." cy="..." r="22" fill="transparent"/>
      <circle class="dot" cx="..." cy="..." r="7" fill="#ccc"/>
      <g class="map-flag" transform="translate(x+5,y-10)" display="none">
        <line x1="0" y1="0" x2="0" y2="12" stroke="currentColor"
              vector-effect="non-scaling-stroke"/>
        <rect x="0" y="0" width="8" height="6" fill="currentColor"/>
      </g>
      <text class="map-label" x="..." y="..." dy="0.35em" visibility="hidden"
            font-size="26" fill="#333" stroke="#fff" stroke-width="3"
            paint-order="stroke fill">Минск</text>
    </g>
  </g>
</svg>
```

### 6.4. Три типа маркеров

| Состояние города | dot (точка) | flag (флажок) |
|------------------|-------------|---------------|
| Не посещён, не в планах | fill: #ccc (серый) | display: none |
| В планах (не посещён) | fill: цвет региона | display: inline, color: регион |
| Посещён | fill: цвет региона | display: none |

Флажок: древко (`<line>` с `vector-effect="non-scaling-stroke"`) + прямоугольное полотно (`<rect>`), сдвинут на `(x+5, y-10)` от центра точки.

### 6.5. Архитектура обновления маркеров

| Функция | Когда вызывается | Что делает |
|---------|-----------------|------------|
| `initMapPoints()` | Первый `switchTab("map")` | Один раз строит весь DOM точек |
| `updateMapMarkers()` | Любое изменение состояния города | Обновляет `fill` точки и видимость флажка (без перестройки DOM) |
| `updateMapFilter()` | Клик по фильтру, изменение состояния | Toggle класса `.map-point-hidden` (без перестройки DOM) |

### 6.6. Система зума

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

**Защита от ложных кликов:**
- После перетаскивания (touch drag или mouse drag) устанавливается `suppressMapClick = true`
- В обработчике клика по карте проверяется этот флаг → клик блокируется

### 6.7. Подписи городов

**Условие появления:** zoomLevel >= 1.8 (вычисляется как `MAP_ORIG_VB.w / mapViewBox.w`)

**Стиль подписи:**
- `font-size: 26` SVG-единиц → ~12px при 1.8x зуме, ~20px при 3x
- `dy: 0.35em` — вертикальное центрирование
- Отступ от точки: `x = dot.x + 14` (подпись правее)
- Белый контур: `stroke: #fff`, `stroke-width: 3`, `paint-order: stroke fill` — текст с halo

**Collision detection (алгоритм):**
1. Для каждой подписи вычисляется экранный AABB (ширина = `text.length × 26 × 0.48 × scaleX`, высота = `26 × scaleY`, padding 4px)
2. Массив сортируется: посещённые города первыми
3. Жадное размещение: подпись показывается только если её AABB не пересекается с уже размещёнными
4. Перекрывающиеся подписи получают `visibility: hidden`

---

## 7. Модель данных localStorage

### Сохраняемые поля
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
  }
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

### Валидация при загрузке
- Даты проверяются regex `/^\d{4}-\d{2}-\d{2}$/`
- cityId проверяется на существование в CITIES
- `visitedCities` проверяется на тип `object` (не `array`)
- `plannedCities` проверяется на значение `=== true`
- `cityNotes` проверяется на тип `string`
- Конфликт visited vs planned: города одновременно в обоих удаляются из `plannedCities` (visited выигрывает)
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

**Всего:** 57 городов, 7 регионов.

---

## 9. Карточка города — детальный разбор

### Layout
```
┌─────────────────────────────────────┐
│  .city-card-header                  │
│    .city-card-title-block           │
│      Название города (h2)           │
│      Регион (p)                     │
│                  .city-card-actions │
│                    [bookmark] [×]   │
│─────────────────────────────────────│
│         [штамп 80×80]               │
│                                     │
│  Описание города...                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ textarea (заметки)          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Дата визита: 12.04.2025]     или  │
│  [Я здесь был]                      │
└─────────────────────────────────────┘
```

### Bookmark-кнопка (вишлист)
- Отображается **только для непосещённых** городов
- SVG outlined → filled при активации
- При `.active`: фон через `color-mix(in srgb, region-color 12%, transparent)`, цвет = регион
- Вызывает `togglePlanned(cityId)` → перерисовка карточки + обновление карты

### Textarea (заметки)
- maxlength=500
- Placeholder контекстно-зависимый:
  - Посещённый: «Впечатления, заметки на память...»
  - Непосещённый: «Что посмотреть, куда зайти...»
- **Тройная защита от потери данных:**
  1. Debounce 300мс на `input` → `saveNote()`
  2. Принудительное сохранение при `closeCityCard()` → `saveNote()`
  3. `visibilitychange` + `pagehide` → `saveNote()`
- Заметки **не удаляются** при удалении визита — переживают в `cityNotes`
- В standalone-режиме (PWA): дополнительный padding-bottom при фокусе, защита от перекрытия клавиатурой

---

## 10. Service Worker (sw.js, 41 строка)

### Кэширование
```javascript
var CACHE_NAME = 'belarus-passport-v2';
var ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg'
];
```
Все пути **относительные** (без ведущего `/`) — совместимость с деплоем в подпапку (например, `username.github.io/repo/`).

### Жизненный цикл
- **install:** кэширование ASSETS + `self.skipWaiting()` — немедленная активация нового SW
- **fetch:** cache-first (ответ из кэша, fallback на сеть)
- **activate:** удаление старых кэшей (`key !== CACHE_NAME`) + `self.clients.claim()`

### Обновление на клиенте (app.js строки 1550–1559)
- `hasControllerOnLoad`: если SW уже был активен при загрузке → показывается тост «Приложение обновлено» при `controllerchange`
- `updateToastShown`: защита от двойного срабатывания
- Новый пользователь (SW не активен при загрузке) → тост не показывается
- `window.location.reload()` не вызывается намеренно — это вызывает бесконечный цикл в Chrome/WebView

---

## 11. PWA-манифест (manifest.json, 22 строки)

```json
{
  "name": "Паспорт путешественника по Беларуси",
  "short_name": "Беларусь Паспорт",
  "description": "Отмечайте города Беларуси, планируйте поездки и коллекционируйте штампы",
  "start_url": "index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#2c3e50",
  "icons": [
    { "src": "icon-192.svg", "sizes": "192x192", "type": "image/svg+xml" },
    { "src": "icon-512.svg", "sizes": "512x512", "type": "image/svg+xml" }
  ]
}
```

`start_url: "index.html"` — относительный путь, совместимость с деплоем в подпапку.

---

## 12. Ключевые архитектурные решения

1. **Единый экран паспорта:** Поиск и фильтры в одном контейнере. Один экран вместо двух (вкладка «Каталог» отсутствует).

2. **Двухрежимный рендер паспорта:** Переменная `currentPassportMode` отслеживает режим (search/filter). Fade-анимация (opacity 150мс) срабатывает **только при смене режима**, а не при каждом вводе символа или переключении фильтра.

3. **Sticky-обёртка вместо жёстких top-значений:** `.passport-sticky-header` оборачивает и заголовок, и контролы вместе. Не нужно вручную вычислять `top` для каждого элемента.

4. **Трёхфункциональная карта:** `initMapPoints()` (одноразовое построение DOM) + `updateMapMarkers()` (обновление стилей) + `updateMapFilter()` (toggle CSS-класса). Никакой перестройки DOM при смене фильтра или отметке города.

5. **Вишлист через отдельное состояние:** `plannedCities: {id: true}` не зависит от `visitedCities`. При подтверждении визита город автоматически удаляется из планов. Конфликты разрешаются в пользу visited при загрузке.

6. **Заметки с тройной защитой:** Debounce 300мс + принудительное сохранение при закрытии карточки + `visibilitychange`/`pagehide`. Заметки переживают удаление визита.

7. **color-mix() для активной закладки:** Вместо отдельных rgba-переменных — `color-mix(in srgb, var(--region-color) 12%, transparent)`.

8. **Progressive enhancement для max-height:** `max-height: 90vh` (фолбэк) объявлен раньше `max-height: 90dvh` (современные браузеры). Браузеры без поддержки dvh используют 90vh.

9. **Нормализация поиска:** `normalizeForSearch()` приводит ё→е, і→и, ў→в, удаляет дефисы и пробелы. Поиск «копыл» находит «Копыль».

10. **Event delegation:** все обработчики навешиваются на контейнеры (`#passport-list`, `#map-container`, `#tab-bar`), а не на отдельные элементы. Это позволяет пересоздавать DOM без утечек слушателей.

11. **Мьютекс `isProcessing`:** предотвращает двойные нажатия на «Я здесь был» и «Поделиться». Блокирует на 400мс.

12. **CSS Grid аккордеон:** вместо `max-height` transition используется `grid-template-rows: 0fr → 1fr` — плавная анимация без знания высоты контента.

13. **XSS-защита:** все пользовательские данные (имя, названия городов, заметки) проходят через `escapeHtml()`.

14. **iOS font-size 16px:** поле поиска имеет `font-size: 16px` — предотвращает авто-зум страницы при фокусе на iOS.

15. **Относительные пути во всём PWA:** `manifest.json` (`start_url: "index.html"`), `sw.js` (ASSETS без `/`), `index.html` (`register('sw.js')`) — единообразная поддержка деплоя в подпапку.

---

## 13. Что НЕ реализовано

Геолокация, GPS-автоотметка, социальные функции (друзья, ленты), построение маршрутов, push-уведомления, монетизация, регистрация, облачная синхронизация, мультиязычность, адаптив под десктоп/планшет, тестовая инфраструктура (unit-тесты), CI/CD.
