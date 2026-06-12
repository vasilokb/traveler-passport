# MVP v3 — Implementation Plan

## Контекст

Эволюция PWA «Паспорт путешественника по Беларуси» из плоского трекера посещений в геймифицированный гид. Поверх кода v2 достраивается система микро-квестов (чек-листы), рангов городов (Бронза/Серебро/Золото) и «живых» маркеров на карте. Код v2 (заметки, вишлист, карта, профиль) не переписывается — расширяется.

**Спецификация:** `.kilo/plans/MVP_v3/MVP_v3.md` (5 модулей)
**Текущая кодовая база:** `index.html` (108 строк), `style.css` (1254 строки), `app.js` (1559 строк), `sw.js` (41 строка), `manifest.json`

---

## Дельта изменений v2 → v3

| Аспект | v2 | v3 |
|--------|----|----|
| Состояния города | 3: непосещён, посещён, в планах | **4 ранга**: непосещён, Бронза, Серебро, Золото (+ планы для каждого) |
| Карточка города | Описание + вишлист + заметки + чекин | + **чек-лист Must-See** + **обложка** + **индикатор ранга** + **«Доисследовать»** |
| Штампы | Один стиль (цвет региона) | **3 визуальных варианта** по рангу (Бронза/Серебро/Золото) |
| Карта — маркеры | 3 стиля (серый/цвет/флаг) | **7 состояний** (ранг × планы) + zoom-aware |
| Карта — регионы | Только контур Беларуси | _(Отложено — заливка регионов вне scope v3)_ |
| Профиль — статистика | «X из 57» + «В планах» | + **панель орденов** 🥇/🥈/🥉 |
| Профиль — хроника | Список визитов по дате | Визиты + **milestone'ы прокачки** |
| Вишлист | Только непосещённые города | Расширён: **посещённые (Бронза/Серебро)** → «Доисследовать» |
| Данные | `visitedCities`, `plannedCities`, `cityNotes` | + `checkedSights`, `milestones` + внешний `data-sights.js` |

---

## Модель данных (localStorage)

```json
{
  "currentTab": "passport",
  "travelerName": "Белорусский путешественник",
  "onboardingComplete": true,
  "visitedCities": {
    "minsk": { "date": "2025-04-12" }
  },
  "plannedCities": {
    "mir": true,
    "brest": true
  },
  "cityNotes": {
    "minsk": "Был в Троицком предместье!"
  },
  "checkedSights": {
    "minsk": ["s0", "s2", "s3"]
  },
  "milestones": [
    { "cityId": "minsk", "date": "2026-03-01", "tier": "silver" },
    { "cityId": "minsk", "date": "2026-06-09", "tier": "gold" }
  ]
}
```

### Новые поля

| Поле | Тип | Назначение |
|------|-----|------------|
| `checkedSights` | `{cityId: [sightId, ...]}` | Отмеченные пункты чек-листа. Пустой массив удаляется из объекта |
| `milestones` | `[{cityId, date, tier}]` | Только Silver/Gold достижения. Bronze — выводится из `visitedCities.date` |

### Инварианты

- **`plannedCities` может содержать посещённые города** (Бронза/Серебро) — это механика «Доисследовать». v2-инвариант «visited побеждает planned» **отменяется**.
- **Gold-города НЕ могут быть в `plannedCities`** — прокачивать больше нечего. При загрузке и при достижении Gold — автоудаление из планов.
- **`checkedSights` имеет смысл только для посещённых городов.** При удалении визита — checkedSights для города очищаются.
- **`milestones` хранят только silver/gold.** При удалении визита — все milestone'ы города удаляются.
- **`cityNotes` переживают удаление визита** (как в v2).

### Ранг города (computed, не хранится)

```javascript
function getCityTier(cityId) {
  if (!state.visitedCities[cityId]) return null;        // не посещён
  var sights = (typeof SIGHTS !== "undefined") && SIGHTS[cityId];
  if (!sights || sights.length === 0) return "bronze";   // нет чек-листа → только бронза
  var checked = state.checkedSights[cityId] || [];
  var ratio = checked.length / sights.length;
  if (ratio >= 1.0) return "gold";
  if (ratio >= 0.5) return "silver";
  return "bronze";
}
```

### Миграция v2 → v3

1. `visitedCities` — без изменений (существующие чекины = Бронза)
2. `plannedCities` — **УБРАТЬ** очистку «visited побеждает planned» из `loadState()`
3. `cityNotes` — без изменений
4. `checkedSights` — новое поле, инициализируется `{}`
5. `milestones` — новое поле, инициализируется `[]` (v2-пользователи не имеют milestone'ов — корректно, т.к. Бронза выводится из `visitedCities`)
6. Новая очистка: Gold-города не могут быть в `plannedCities`

---

## Принятые UX-решения

### Чек-лист в карточке города

- **Непосещённый город:** чек-лист раскрыт, чекбоксы **read-only** (информационный блок «Что посмотреть»)
- **Бронза/Серебро:** чек-лист раскрыт, чекбоксы **интерактивные** — можно отмечать увиденное
- **Золото:** чек-лист **свёрнут** в компактную строку `🥇 Золото (4/4) [Развернуть]`
- **Город без чек-листа** (не в Топ-15): UI-манифест «Этот город ждет своих исследователей...»

### Вишлист → «Доисследовать»

| Состояние города | Кнопка | При активации |
|------------------|--------|---------------|
| Непосещённый | «Хочу поехать» (закладка) | `plannedCities[id] = true`, флаг на карте нейтральный |
| Бронза (есть чек-лист) | «Доисследовать город» (медаль) | `plannedCities[id] = true`, флаг на карте **серебряный** |
| Серебро (есть чек-лист) | «Доисследовать город» (медаль) | `plannedCities[id] = true`, флаг на карте **золотой** |
| Золото | Кнопка **скрыта** | — |
| Бронза (нет чек-листа) | Кнопка **скрыта** | — |

При чекине (`confirmVisit`) город **автоудаляется** из `plannedCities` (как в v2). Пользователь может повторно добавить через «Доисследовать».

### Штампы по рангам

| Ранг | Сеткa 48px | Карточка 80px |
|------|-----------|--------------|
| Бронза | Штамп, цвет региона | Штамп, цвет региона |
| Серебро | Штамп + тонкое серебряное кольцо | Штамп + серебряное кольцо + бейдж `2/4` |
| Золото | Штамп, цвет = золото (#FFD700) | Штамп = золото + золотое тиснение + ⭐ |

### Маркеры карты (7 состояний + zoom-aware)

| # | Состояние | Точка | Кольцо | Прогресс | Флаг | Zoom-out |
|---|-----------|-------|--------|----------|------|----------|
| 1 | Новый, не в планах | Серая (r7, #ccc) | — | — | — | Серая точка |
| 2 | Новый, в планах | Регион (r7) | — | — | Нейтральный | Регион-точка |
| 3 | Бронза, не в планах | Регион (r7) | — | — | — | Регион-точка |
| 4 | Бронза, в планах | Регион (r7) | — | — | Серебряный | Регион-точка |
| 5 | Серебро, не в планах | Регион (r7) | Серебряное (r10) | `2/4` | — | Точка + кольцо |
| 6 | Серебро, в планах | Регион (r7) | Серебряное (r10) | `2/4` | Золотой | Точка + кольцо |
| 7 | Золото | Золотая звезда | — | — | — | Звезда |

**Zoom-aware:** при `zoomLevel < threshold` — скрыты флажки и числа (через CSS `.map--zoomed`). Звезда Золота и серебряное кольцо видны всегда.

### Хроника с milestone'ами

Объединённый список из `visitedCities` (визиты = Бронза) + `milestones` (Silver/Gold). Сортировка: дата DESC, при совпадении дат — **запись «Открыт город» (Бронза) всегда рендерится выше/раньше**, чем запись «Прокачан до Серебра/Золота» (visit `priority: 0` < milestone `priority: 1`), при полном совпадении — название города ASC. Milestone'ы удаляются при downgrade ранга (анчек пунктов).

---

## Этапы реализации

### Этап 1. Фундамент: data-sights.js + модель данных + миграция

**Задачи:**

1. **Создать `data-sights.js`** — отдельный файл с данными чек-листов:
   ```javascript
   "use strict";
   var SIGHTS = {
     "minsk": [
       { "id": "s0", "name": "Троицкое предместье" },
       { "id": "s1", "name": "Верхний город и Ратуша" },
       { "id": "s2", "name": "Остров Слёз" },
       { "id": "s3", "name": "Национальная библиотека" }
     ],
     // ...ещё 14 городов Топ-15
   };
   ```
   - Формат: `{ cityId: [{ id: "s0", name: "Название" }, ...] }`
   - 3–5 пунктов на город
   - **Кодировка UTF-8 без BOM**
   - Топ-15: minsk, nesvizh, mir, polotsk, brest, pinsk, grodno, vitebsk, novogrudok, lida, mogilev, gomel, braslav, zaslavl, turov

2. **`index.html`** — подключить `data-sights.js` перед `app.js`:
   ```html
   <script src="data-sights.js"></script>
   <script src="app.js"></script>
   ```
   - Убедиться, что `<meta charset="UTF-8">` — первый тег в `<head>`

3. **`app.js` — модель данных:**
   - Добавить в `state`: `checkedSights: {}`, `milestones: []`
   - Обновить `saveState()`: сохранять `checkedSights` и `milestones`
   - Обновить `loadState()`:
     - Загружать `checkedSights` (валидация: объект, значения — массивы строк, sightId существует в SIGHTS[cityId])
     - Загружать `milestones` (валидация: массив, каждый элемент `{cityId, date, tier}`, tier ∈ `["silver","gold"]`, cityId существует, дата — regex `/^\d{4}-\d{2}-\d{2}$/`)
     - **УБРАТЬ** очистку «visited побеждает planned» (v2-строки 527–532)
     - **ДОБАВИТЬ** новую очистку: для каждого Gold-города — удалить из `plannedCities`
     - При ошибке парсинга — полный сброс к дефолту (как в v2)

4. **`app.js` — хелперы и функции ранжирования:**
   - `getCityById(cityId)` — lookup города по id из массива CITIES (используется в Хронике и др.)
   - `getCityTier(cityId)` — вычисление ранга (Bronze/Silver/Gold/null)
   - `getTierLabel(tier)` — «Бронза»/«Серебро»/«Золото»
   - `getTierEmoji(tier)` — «🥉»/«🥈»/«🥇»
   - `getCheckedCount(cityId)` — количество отмеченных пунктов
   - `getSightsCount(cityId)` — общее количество пунктов (0 если нет чек-листа)
   - `hasChecklist(cityId)` — boolean, есть ли чек-лист

5. **`app.js` — управление milestone'ами:**
   ```javascript
   function addMilestone(cityId, tier) {
     // Идемпотентность: если milestone уже существует — не дублируем
     var exists = state.milestones.some(function(m) {
       return m.cityId === cityId && m.tier === tier;
     });
     if (!exists) {
       state.milestones.push({ cityId: cityId, date: getTodayLocal(), tier: tier });
     }
   }
   function removeMilestone(cityId, tier) {
     state.milestones = state.milestones.filter(function(m) {
       return !(m.cityId === cityId && m.tier === tier);
     });
   }
   function removeAllMilestones(cityId) {
     state.milestones = state.milestones.filter(function(m) {
       return m.cityId !== cityId;
     });
   }
   ```

**Критерии готовности:**
- [ ] `data-sights.js` загружается без ошибок, `SIGHTS` доступен глобально
- [ ] `index.html` включает `data-sights.js` перед `app.js`
- [ ] Данные v2 корректно загружаются (visitedCities, plannedCities, cityNotes)
- [ ] `plannedCities` может содержать посещённые города (очистка убрана)
- [ ] Gold-города удаляются из `plannedCities` при загрузке
- [ ] `getCityTier()` корректно возвращает ранг для всех сценариев

---

### Этап 2. Карточка города: чек-лист + ранги + обложки + «Доисследовать»

**Задачи:**

1. **`app.js` — `toggleSight(cityId, sightId)`:**
   ```javascript
   function toggleSight(cityId, sightId) {
     var oldTier = getCityTier(cityId);
     var checked = state.checkedSights[cityId] || [];
     var idx = checked.indexOf(sightId);
     if (idx >= 0) { checked.splice(idx, 1); }
     else { checked.push(sightId); }
     if (checked.length > 0) { state.checkedSights[cityId] = checked; }
     else { delete state.checkedSights[cityId]; }
     var newTier = getCityTier(cityId);
     // Milestone management
     if (newTier !== oldTier) {
       if (newTier === "silver" && oldTier !== "silver") addMilestone(cityId, "silver");
       if (newTier === "gold") addMilestone(cityId, "gold");
       if (oldTier === "gold" && newTier !== "gold") removeMilestone(cityId, "gold");
       if (oldTier === "silver" && newTier === "bronze") removeMilestone(cityId, "silver");
     }
     saveState();
     renderCityCard(cityId); // обновить карточку
     // обновить карту/профиль если активны
   }
   ```
   - **Защита от двойного тапа:** переиспользовать `isProcessing` (400мс)

2. **`app.js` — обновить `renderCityCard(cityId)`:**

   **Новый лейаут (сверху вниз):**
   1. Обложка (если есть `covers/{cityId}.webp` — `<img>`, иначе CSS-градиент региона)
   2. Заголовок: название + регион + **бейдж ранга** (🥉/🥈 2/4 /🥇)
   3. Штамп 80×80px с tier-стилизацией (кольцо/золото)
   4. Описание
   5. Блок «Что посмотреть» (чек-лист — см. ниже)
   6. Textarea заметок (без изменений из v2)
   7. Кнопка вишлиста/«Доисследовать» (см. логику ниже)
   8. Кнопка «Я здесь был» / дата + «Удалить отметку»

   **Блок чек-листа:**
   - Город с SIGHTS и непосещённый → раскрытый список, чекбоксы `disabled` (read-only)
   - Город с SIGHTS и Бронза/Серебро → раскрытый список, чекбоксы активны
   - Город с SIGHTS и Золото → свёрнутая строка `🥇 Золото (4/4) [Развернуть]`, аккордеон
   - Город без SIGHTS → манифест-текст «Этот город ждет своих исследователей...»
   - Каждый пункт: `<label>` с кастомным чекбоксом (44×44px tap target) + название
   - Прогресс-бар над списком: «Осмотрено X из Y» + полоса

   **Кнопка вишлиста/«Доисследовать»:**
   ```
   if (!isVisited):
     показать "Хочу поехать" (закладка, как в v2)
   else:
     tier = getCityTier(cityId)
     if hasChecklist(cityId) && (tier === "bronze" || tier === "silver"):
       показать "Доисследовать город" (иконка медали)
       если в plannedCities → filled стиль
     else:
       скрыть кнопку
   ```

3. **`app.js` — обновить `togglePlanned(cityId)`:**
   - Убрать проверку «нельзя планировать посещённый» (v2-строка ~997)
   - Добавить проверку: нельзя планировать Gold-города
   - Остальная логика без изменений (toggle, saveState, re-render, update map)

4. **`app.js` — обновить `confirmVisit(cityId, date)`:**
   - Без изменений в базовой логике (запись в visitedCities, автоудаление из plannedCities, stamp-overlay)
   - Milestone для Бронзы НЕ добавляется (выводится из visitedCities.date)
   - Если у города есть SIGHTS и уже есть checkedSights (маловероятно, т.к. чекбоксы были disabled) — сохраняются

5. **`app.js` — обновить `removeVisit(cityId)`:**
   - **Новое:** `delete state.checkedSights[cityId]` (сброс прогресса чек-листа)
   - **Новое:** `removeAllMilestones(cityId)` (удаление всех milestone'ов)
   - **Новое:** `delete state.plannedCities[cityId]` (удаление «Доисследовать» если было)
   - `cityNotes` — НЕ трогать (переживает удаление, как в v2)
   - Остальная логика без изменений

6. **`app.js` — обработчики событий для чек-листа:**
   - Делегированный `click` на `.checklist-item` → `toggleSight(cityId, sightId)`
   - Делегированный `click` на `.checklist-toggle` (аккордеон Золота) → toggle `.checklist-collapsed`

7. **`style.css` — новые стили:**
   - `.city-card-cover` — `width: 100%`, `aspect-ratio: 16/9`, `object-fit: cover`, `border-radius: 12px 12px 0 0`, `margin: -20px -20px 16px` (растянуть к краям карточки)
   - `.city-card-cover-placeholder` — CSS-градиент через `var(--region-color)`, та же aspect-ratio
   - `.city-card-tier-badge` — inline-бейдж ранга: flex, gap 4px, padding 4px 10px, border-radius 20px, font-size 0.8125rem
     - `.tier-bronze` — фон #F0E0D0, текст #8B4513
     - `.tier-silver` — фон #E8E8E8, текст #808080
     - `.tier-gold` — фон #FFF3B0, текст #B8860B
   - `.city-card-checklist` — контейнер, margin-top 16px
   - `.checklist-header` — flex, space-between, font-weight 600, margin-bottom 12px
   - `.checklist-progress-bar` — height 6px, border-radius 3px, background #f0f0f0, fill через `width: X%`
   - `.checklist-item` — flex, gap 12px, min-height 44px, align-items center, border-bottom 1px solid #f0f0f0, cursor pointer
   - `.checklist-checkbox` — 24×24px, border 2px, border-radius 6px; `.checked` → фон региона, белая галочка
   - `.checklist-checkbox.disabled` — opacity 0.5, cursor default
   - `.checklist-item-name` — flex 1, font-size 0.9375rem; `.checked` → text-decoration line-through, color #999
   - `.checklist-manifest` — padding 16px, background #f9f9f9, border-radius 12px, font-style italic, color #666, text-align center
   - `.checklist-collapsed` — grid-template-rows 0fr → 1fr transition (как аккордеоны паспорта)
   - `.city-card-btn-explore` — аналогично `.city-card-btn-planned`, но с иконкой медали; `.active` → filled стиль

8. **Обложки городов:**
   - Создать директорию `covers/`
   - Для Топ-15: подобрать/сжать WebP-изображения (≤15КБ, 16:9)
   - Именование: `{cityId}.webp` (например, `covers/minsk.webp`)
   - Города без обложки → CSS-градиент (fallback в коде)
   - **Fallback для `file:///`:** протестировать загрузку относительного пути `covers/{cityId}.webp` на реальном устройстве (особенно в WebView-оболочках). Если конкретный WebView заблокирует относительные пути — обложки Топ-15 переводятся в **Base64-строки внутри `data-sights.js`** (полная автономность без сетевых запросов). Структура: `SIGHTS[cityId].cover = "data:image/webp;base64,..."`

**Критерии готовности:**
- [ ] Чек-лист отображается для Топ-15 городов, read-only для непосещённых
- [ ] После чекина (Бронза) чекбоксы становятся интерактивными
- [ ] Отметка 50% → Серебро (бейдж обновляется, milestone записан)
- [ ] Отметка 100% → Золото (чек-лист сворачивается, milestone записан)
- [ ] Снятие галочки → downgrade ранга, milestone удалён
- [ ] Кнопка «Доисследовать город» для Бронзы/Серебра с чек-листом
- [ ] Обложка или градиент-заглушка отображается в карточке
- [ ] Удаление визита сбрасывает checkedSights и milestone'ы, сохраняет заметки

---

### Этап 3. Карта: 7 маркеров + zoom-aware

**Задачи:**

1. **`app.js` — обновить `initMapPoints()`:**

   Расширить структуру каждой точки `<g class="map-point">` новыми элементами. Атрибуты `display` НЕ инлайнятся — видимость управляется CSS-классами (`.marker-visible`) + zoom-aware контейнером:
   ```svg
   <g class="map-point" data-city-id="...">
     <circle class="hitbox" r="22" fill="transparent" />
     <circle class="dot" r="7" fill="#ccc" />
     <circle class="tier-ring" r="10" fill="none" stroke="#C0C0C0" stroke-width="2.5" />
     <text class="tier-num" font-size="16" fill="#333"
           stroke="#fff" stroke-width="3" paint-order="stroke fill">2/4</text>
     <polygon class="gold-star" points="..." fill="#FFD700" />
     <g class="map-flag">
       <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor"
             vector-effect="non-scaling-stroke" stroke-width="2" />
       <rect x="0" y="0" width="10" height="7" fill="currentColor" />
     </g>
     <text class="map-label" visibility="hidden" ...>Название</text>
   </g>
   ```
   - **Видимость по умолчанию:** CSS задаёт `display: none` для `.tier-ring`, `.tier-num`, `.gold-star`, `.map-flag`. JS включает их через `classList.add("marker-visible")`, а CSS решает — показывать или нет — в зависимости от zoom-класса контейнера
   - Звезда: 5-конечная, outer radius ~10, вычисляется полигонально от позиции точки

2. **`app.js` — обновить `updateMapMarkers()`:**

   Для каждой `.map-point` вычислить ранг и состояние планов, затем управлять видимостью через **классы** (не инлайн-стили):
   ```
   tier = getCityTier(cityId)
   isPlanned = state.plannedCities[cityId] === true

   // Сброс: убрать marker-visible со всех доп.элементов + показать точку
   dot.classList.remove("dot--hidden")
   tier-ring.classList.remove("marker-visible")
   tier-num.classList.remove("marker-visible")
   gold-star.classList.remove("marker-visible")
   map-flag.classList.remove("marker-visible")

   if (tier === null):  // непосещён
     dot.fill = isPlanned ? regionColor : "#ccc"
     if (isPlanned): map-flag.classList.add("marker-visible"),
                     flag.style.color = regionColor (нейтральный)

   elif (tier === "bronze"):
     dot.fill = regionColor
     if (isPlanned): map-flag.classList.add("marker-visible"),
                     flag.style.color = "#C0C0C0" (серебряный)

   elif (tier === "silver"):
     dot.fill = regionColor
     tier-ring.classList.add("marker-visible")
     tier-num.textContent = "X/Y"
     tier-num.classList.add("marker-visible")
     if (isPlanned): map-flag.classList.add("marker-visible"),
                     flag.style.color = "#FFD700" (золотой)

   elif (tier === "gold"):
     dot.classList.add("dot--hidden")  // скрыть точку через класс
     gold-star.classList.add("marker-visible")
     // флаг недоступен — гештальт закрыт
   ```
   - Цвет флага: единственный инлайн-стиль — `style.color` на `.map-flag` (т.к. флаг использует `currentColor`). Все остальные видимости — через `classList`
   - `tier-num` позиционируется: `x = dot.x + 14, y = dot.y + 5` (правее точки)
   - **Звезда и кольцо** (`gold-star`, `tier-ring`) показываются через `.marker-visible` и **не зависят** от zoom — они видны всегда при наличии класса

3. **`app.js` — zoom-aware rendering:**
   - В `updateMapViewBox()` (или `updateMapLabels()`): добавить
     ```javascript
     var zoomLevel = MAP_ORIG_VB.w / mapViewBox.w;
     var svg = document.getElementById("belarus-map");
     svg.classList.toggle("map--zoomed", zoomLevel >= 1.8);
     ```
   - Порог 1.8 — совпадает с порогом подписей городов (переиспользование)

4. **`style.css` — zoom-aware маркеры (классы, не инлайны):**
   ```css
   /* По умолчанию: все доп.элементы скрыты */
   .map-flag, .tier-num, .gold-star, .tier-ring { display: none; }
   .dot--hidden { display: none; }

   /* Звезда и кольцо показываются при наличии класса (не зависят от zoom) */
   .gold-star.marker-visible { display: inline; }
   .tier-ring.marker-visible { display: inline; }

   /* Флажки и числа прогресса — только при zoom >= 1.8x И наличии класса */
   .map--zoomed .map-flag.marker-visible { display: inline; }
   .map--zoomed .tier-num.marker-visible { display: inline; }
   ```
   - **Принцип:** JS только добавляет/убирает `.marker-visible`. CSS решает — показывать или нет — на основе zoom-класса контейнера `.map--zoomed`. Никаких инлайн-стилей или хрупких селекторов `[style*="..."]`

5. **`app.js` — обновить `updateMapFilter()`:**
   - Фильтр «В планах» теперь показывает и непосещённые (вишлист), и посещённые («Доисследовать»)
   - Логика без изменений: `map-point-hidden` toggle по `state.mapFilter`

**Критерии готовности:**
- [ ] 7 состояний маркеров корректно отображаются
- [ ] Серебряное кольцо и число прогресса появляются при достижении Серебра
- [ ] Золотая звезда заменяет точку при достижении Золота
- [ ] Флажки меняют цвет: нейтральный/серебряный/золотой
- [ ] При zoom < 1.8x флажки и числа скрыты, при zoom >= 1.8x — видны
- [ ] Фильтр «В планах» показывает города «Доисследовать» наряду с вишлистом

---

### Этап 4. Паспорт: штампы по рангам

**Задачи:**

1. **`app.js` — обновить `createStampSVG(regionId, tier)`:**
   - Добавить параметр `tier` (default `"bronze"` для обратной совместимости)
   - **Бронза:** без изменений — текущий штамп, `currentColor` = цвет региона
   - **Серебро:** добавить внешний серебряный круг:
     ```svg
     <circle cx="50" cy="50" r="47" fill="none" stroke="#C0C0C0"
             stroke-width="2.5" opacity="0.8" />
     <!-- + существующий штамп -->
     ```
   - **Золото:** заменить цвет штампа на золотой:
     ```svg
     <g style="color: #FFD700">
       <!-- существующий зубчатый круг и иконка, но stroke/fill = currentColor = золото -->
     </g>
     <circle cx="50" cy="50" r="47" fill="none" stroke="#FFD700"
             stroke-width="2.5" opacity="0.6" />
     ```
   - Возвращаемая SVG-строка должна включать tier-зависимые элементы

2. **`app.js` — обновить вызовы `createStampSVG()`:**
   - `buildFilterAccordions()` — передавать `getCityTier(cityId)` для каждого города
   - `buildSearchResults()` — то же
   - `renderCityCard()` — то же (штамп 80×80)
   - `renderStampOverlay()` — штамп при получении Бронзы (tier = "bronze")
   - При `null` (непосещённый) — передавать `"bronze"` или `null` для серого силуэта

3. **`app.js` — бейдж ранга на штампе в карточке:**
   - В `renderCityCard()`, рядом со штампом, добавить бейдж:
     - Бронза: «🥉 Бронза»
     - Серебро: «🥈 Серебро (X/Y)»
     - Золото: «🥇 Золото (Y/Y)»
   - Использовать классы `.city-card-tier-badge .tier-bronze/silver/gold`

4. **`style.css`:**
   - Унаследовать стили штампов от v2 (`.stamp-icon`, `.stamp-cell`)
   - Серебряное кольцо и золотое тиснение — внутри SVG (через параметры `createStampSVG`)
   - `.stamp-cell.gold .stamp-icon` — опционально: лёгкая тень/свечение для Gold-штампов в сетке

5. **Аккордеоны — без структурных изменений:**
   - Бейджи «Пройден»/«Старт» остаются (100% региона = все города посещены, не зависимо от ранга)
   - Сетка штампов автоматически отображает tier-стилизацию через обновлённый `createStampSVG()`

**Критерии готовности:**
- [ ] Бронзовые штампы выглядят как в v2
- [ ] Серебряные штампы имеют серебряное кольцо
- [ ] Золотые штампы перекрашены в золото
- [ ] Бейдж ранга отображается в карточке города
- [ ] Поиск и фильтры в Паспорте корректно показывают tier-стилизованные штампы

---

### Этап 5. Профиль: панель орденов + хроника milestone'ов

**Задачи:**

1. **`app.js` — обновить `renderProfile()`:**

   **Панель орденов (заменяет плоский счётчик):**
   ```
   🥇 Золотых: X | 🥈 Серебряных: Y | 🥉 Бронзовых: Z
   ```
   - Подсчёт: обойти все города, вычислить `getCityTier()`, сгруппировать по рангу
   - «Бронзовых» = посещённые города с рангом Bronze (включая города без чек-листа)
   - Сохранить общий счётчик «X из 57» (визитов) рядом с панелью орденов

   **Хроника с milestone'ами:**
   ```javascript
   function generateChronicle() {
     var entries = [];
     // Визиты (Бронза) — из visitedCities
     for (var cityId in state.visitedCities) {
       var city = getCityById(cityId);
       entries.push({
         date: state.visitedCities[cityId].date,
         sortName: city.name,
         label: "Открыт город " + city.name + " (Чернильный штамп)",
         type: "visit",
         priority: 0
       });
     }
     // Milestone'ы (Silver/Gold) — из state.milestones
     state.milestones.forEach(function(m) {
       var city = getCityById(m.cityId);
       var emoji = m.tier === "gold" ? "🥇" : "🥈";
       var tierName = m.tier === "gold" ? "Золотого" : "Серебряного";
       entries.push({
         date: m.date,
         sortName: city.name,
         label: city.name + " прокачан до " + tierName + " ордена! " + emoji,
         type: "milestone",
         priority: 1
       });
     });
     // Сортировка: дата DESC, при совпадении — приоритет (visit раньше milestone), затем имя ASC
     entries.sort(function(a, b) {
       if (a.date !== b.date) return b.date.localeCompare(a.date);
       if (a.priority !== b.priority) return a.priority - b.priority;
       return a.sortName.localeCompare(b.sortName, "ru");
     });
     return entries;
   }
   ```
   - Каждая запись: дата (formatDateDisplay) + label
   - Milestone-записи визуально выделены (эмодзи ордена, возможно лёгкий фон)

   **Блок «В планах» (расширение):**
   - Счётчик «В планах: N» — включает и вишлист, и «Доисследовать»
   - Опционально: разбивка «N впервые + M доисследовать» (если N+M > 0)

2. **`style.css`:**
   - `.profile-awards` — flex, gap 16px, justify-content center, margin 16px 0
   - `.award-item` — flex-column, align-items center, gap 4px
   - `.award-emoji` — font-size 1.75rem
   - `.award-count` — font-size 1.25rem, font-weight 700
   - `.award-label` — font-size 0.75rem, color #666
   - `.chronicle-item.milestone` — background `#FFFAEB` (лёгкий золотой tint), border-radius 8px
   - Унаследовать остальные стили профиля из v2

**Критерии готовности:**
- [ ] Панель орденов показывает корректные счётчики 🥇/🥈/🥉
- [ ] Хроника показывает визиты и milestone'ы в едином списке
- [ ] Сортировка хроники: дата DESC, имя ASC при совпадении
- [ ] Milestone-записи визуально выделены
- [ ] Блок «В планах» корректно считает общий размер plannedCities

---

### Этап 6. Очистка + QA + Service Worker

**Задачи:**

1. **`sw.js` — обновить кэш:**
   - `CACHE_NAME = 'belarus-passport-v3'`
   - Добавить `data-sights.js` в `ASSETS`
   - Добавить `covers/` файлы в `ASSETS` (по мере создания)
   - `self.skipWaiting()` и `self.clients.claim()` — уже есть из v2

2. **`app.js` — обновить SW-уведомления:**
   - Логика `controllerchange` (строки 1550–1559) — без изменений
   - Тост «Приложение обновлено» при обнаружении нового SW

3. **Проверка сценариев (QA):**

   | Сценарий | Ожидаемый результат |
   |----------|---------------------|
   | Миграция v2 → v3 | Все visitedCities → Бронза, plannedCities/cityNotes сохранены |
   | Чекин города без чек-листа | Бронза, кнопка «Доисследовать» скрыта |
   | Чекин города с чек-листом | Бронза, чекбоксы активируются |
   | Отметить 50% пунктов | Серебро, milestone записан, кольцо на карте |
   | Отметить 100% пунктов | Золото, milestone записан, звезда на карте, чек-лист сворачивается |
   | Снять галочку (downgrade) | Milestone удалён, ранг понижен, маркер обновлён |
   | «Доисследовать» для Бронзы | Город в plannedCities, серебряный флаг на карте |
   | «Доисследовать» для Серебра | Город в plannedCities, золотой флаг на карте |
   | Gold + попытка «Доисследовать» | Кнопка скрыта |
   | Удаление визита | checkedSights очищены, milestone'ы удалены, plannedCities очищен, заметки сохранены |
   | Карта: zoom < 1.8x | Флажки и числа скрыты, точки/звёзды/кольца видны |
   | Карта: zoom >= 1.8x | Флажки и числа видны |
   | Хроника | Визиты + milestone'ы, сортировка по дате DESC |
   | Паспорт: фильтр «В планах» | Показывает вишлист + «Доисследовать» |
   | Профиль: панель орденов | Корректные счётчики Bronze/Silver/Gold |

4. **Edge cases:**
   - Город одновременно в visitedCities и plannedCities при загрузке → **допускается** (new v3 invariant)
   - Gold-город в plannedCities при загрузке → удаляется из plannedCities
   - checkedSights для непосещённого города при загрузке → очищается
   - SIGHTS для города не существует → ранг всегда Bronze (при посещении)
   - Пользователь отмечает все пункты в один день с чекином → две записи в Хронике (визит + milestone), визит раньше milestone при сортировке

5. **PWA-тестирование:**
   - Деплой v3 поверх v2 → новый SW активируется (`skipWaiting`)
   - Проверить, что `data-sights.js` кэшируется
   - Проверить оффлайн-режим: чек-листы доступны без сети

**Критерии готовности:**
- [ ] `sw.js` обновлён (v3 кэш, data-sights.js в ASSETS)
- [ ] Все 15 сценариев из таблицы проходят
- [ ] Миграция v2 → v3 не теряет данные
- [ ] `file:///` протокол работает (data-sights.js загружается)
- [ ] Оффлайн-режим: чек-листы и обложки доступны из кэша

---

## Риски

| Риск | Митигация |
|------|-----------|
| Размер app.js растёт (~2000+ строк) | Вынос данных в `data-sights.js`; логика остаётся в `app.js`. При необходимости — дальнейшая модуляризация (post-MVP) |
| WebP-обложки увеличивают вес PWA-кэша | Лимит 15КБ/обложка; для начала — только Топ-15; fallback на CSS-градиент |
| Звезда и кольцо на карте мелкие при zoom 1x | Звезда (r10) и кольцо (r10) больше точки (r7) — различимы. Числа прогресса видны только при zoom >= 1.8x |
| Множественные tier-переходы при быстром клике чекбоксов | `isProcessing` мьютекс 400мс на `toggleSight`; milestone-логика идемпотентна (фильтр по cityId+tier) |
| Несинхронизированные данные: checkedSights для удалённого города | `removeVisit` очищает checkedSights и milestone'ы; `loadState` валидирует все ссылки |
| Gold-город в plannedCities (битые данные от ручного редактирования) | `loadState` удаляет Gold-города из plannedCities при загрузке |
| Заливка регионов на карте не реализована | Отложена явным решением (out of scope v3). Маркеры городов полностью передают прогресс |

---

## Порядок выполнения

Строгий: 1 → 2 → 3 → 4 → 5 → 6. Каждый этап завершается проверкой критериев готовности.

- **Этап 1** (фундамент) — блокирует все остальные
- **Этап 2** (карточка города) — блокирует 3 и 4 (зависят от рангов)
- **Этап 3** (карта) и **Этап 4** (паспорт) — независимы друг от друга, можно параллелить
- **Этап 5** (профиль) — зависит от 1 (milestones) и 2 (ранги)
- **Этап 6** (QA) — после всех этапов
