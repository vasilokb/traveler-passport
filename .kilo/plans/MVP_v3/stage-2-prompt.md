# Этап 2 — Карточка города: чек-лист + ранги + обложки + «Доисследовать»

## Контекст

Прочитай следующие документы перед началом работы:

1. **Спецификация v3:** `F:\projects\traveler-passport\.kilo\plans\MVP_v3\MVP_v3.md` — Модуль 1 (чек-листы Must-See), Модуль 2 (ранги Бронза/Серебро/Золото).

2. **План реализации v3:** `F:\projects\traveler-passport\.kilo\plans\MVP_v3\implementation-plan.md` — этот этап описан в секции «Этап 2. Карточка города: чек-лист + ранги + обложки + «Доисследовать»».

3. **Описание текущей кодовой базы (v2):** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\app-description_v2.md` — справочник по существующему коду.

**Суть этапа:** Переписать карточку города — добавить обложку, бейдж ранга, чек-лист «Что посмотреть» с прогресс-баром, кнопку «Доисследовать». Создать функцию `toggleSight`. Обновить `togglePlanned`, `confirmVisit`, `removeVisit` для поддержки новых полей. После этапа карточка города полностью обновлена, остаётся карта (Этап 3), штампы (Этап 4) и профиль (Этап 5).

---

## Что уже сделано (Этап 1)

- `data-sights.js` создан, подключён в `index.html` перед `app.js`
- Глобальный объект `SIGHTS` содержит чек-листы для 15 городов (Топ-15)
- `state` содержит `checkedSights: {}` и `milestones: []`
- `loadState()` / `saveState()` загружают и сохраняют новые поля
- Инвариант «visited wins over planned» удалён; добавлен Gold-инвариант
- Функции: `getCityById()`, `getCityTier()`, `getTierLabel()`, `getTierEmoji()`, `getSightsCount()`, `getCheckedCount()`, `hasChecklist()`
- Функции: `addMilestone()`, `removeMilestone()`, `removeAllMilestones()`

---

## Конвенции кода (из Этапа 1 — соблюдать)

- `let`/`const` на верхнем уровне, `var` внутри тел функций
- `for (var i = 0; ...)` — НЕ `for (let ...)`
- Уникальные имена счётчиков внутри одной функции
- `escapeHtml(str)` (строка 1130) — для всего пользовательского текста в HTML
- **Глобальные переменные НЕ переобъявлять:** `isProcessing` (строка 1161), `noteDebounceTimer` (строка 1162), `mapPointsInitialized` — уже объявлены на уровне `app.js`. Используй их как есть. При полной замене `renderCityCard` ссылайся на `noteDebounceTimer` из глобальной области — **не** объявляй `var noteDebounceTimer` внутри функции

---

## Задачи

### 1. `app.js` — функция `toggleSight(cityId, sightId)`

Создать новую функцию. Разместить рядом с `togglePlanned` (после строки ~1185). Использует `isProcessing` (строка 1161) для защиты от двойного тапа — тот же паттерн, что в `confirmVisit`/`removeVisit`.

```javascript
function toggleSight(cityId, sightId) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    // Сохранить незавершённую заметку перед ре-рендером (паттерн из confirmVisit)
    clearTimeout(noteDebounceTimer);
    var noteTextarea = document.getElementById("city-card-note");
    if (noteTextarea) saveNote(cityId, noteTextarea.value);

    var oldTier = getCityTier(cityId);
    // Мутабельная работа с state — как во всём приложении v2/v3.
    // Защита от гонки обеспечивается мьютексом isProcessing, а не иммутабельностью.
    var checked = state.checkedSights[cityId];
    if (!checked) {
      checked = [];
      state.checkedSights[cityId] = checked;
    }
    var idx = checked.indexOf(sightId);
    if (idx >= 0) {
      checked.splice(idx, 1);
    } else {
      checked.push(sightId);
    }
    if (checked.length === 0) {
      delete state.checkedSights[cityId];
    }
    var newTier = getCityTier(cityId);
    // Мгновенная очистка из plannedCities при достижении Золота
    // (Gold-инвариант из Этапа 1 срабатывает при загрузке, но здесь — мгновенно)
    if (newTier === "gold" && state.plannedCities[cityId]) {
      delete state.plannedCities[cityId];
    }
    // Детерминированное управление milestone'ами
    // Золото автоматически включает Серебро (прыжок Bronze→Gold возможен для 1-сайт-городов)
    if (newTier === "gold") {
      addMilestone(cityId, "silver");
      addMilestone(cityId, "gold");
    } else if (newTier === "silver") {
      addMilestone(cityId, "silver");
      if (oldTier === "gold") removeMilestone(cityId, "gold");
    } else if (newTier === "bronze") {
      // Безусловное удаление обоих milestone'ов: при прыжке Gold→Bronze
      // (возможно для города с 1 достопримечательностью) Silver milestone
      // тоже должен быть удалён. removeMilestone безопасен если milestone'а нет.
      removeMilestone(cityId, "silver");
      removeMilestone(cityId, "gold");
    }
    saveState();
    renderCityCard(cityId);
    if (mapPointsInitialized) {
      updateMapMarkers();
      updateMapFilter(); // Критично: при Gold город удаляется из plannedCities
    }
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}
```

> **⚠️ Мутабельность `state`:** В этом проекте `state` мутируется напрямую (как `visitedCities`, `plannedCities`, `cityNotes` в v2). `.slice()` и иммутабельные паттерны **не используются** — защиту от гонки обеспечивает мьютекс `isProcessing`. Не добавляй клонирование массивов.

> **⚠️ Логика milestone'ов — детерминированная, не копируй «как было раньше»:** Прыжок Bronze→Gold возможен (город с 1 достопримечательностью). При достижении Золота Silver milestone добавляется **вместе** с Gold — Хроника (Этап 5) покажет обе записи. `addMilestone` идемпотентен (for-цикл проверка на дубликат из Этапа 1), так что повторный вызов безопасен.

> **⚠️ Мгновенная очистка plannedCities при Gold:** Без строки `delete state.plannedCities[cityId]` город останется в plannedCities до следующей перезагрузки (Gold-инвариант из Этапа 1 сработает только при `loadState()`). Карточка перерендерится и кнопка исчезнет, но `state` будет рассинхронизирован с UI.

> **⚠️ `updateMapMarkers()` + `updateMapFilter()` — оба нужны:** Tier-изменение меняет внешний вид маркера (`updateMapMarkers`), а при достижении Золота город удаляется из `plannedCities` — значит, под фильтром «В планах» он должен исчезнуть (`updateMapFilter`). Визуальный эффект на маркерах появится в Этапе 3.

---

### 2. `app.js` — переписать `renderCityCard(cityId)`

Текущая функция: строки 1239–1328. Полностью заменить содержимое функции.

**Новый лейаут карточки (сверху вниз):**

1. **Обложка** — `<img>` если город в SIGHTS (Топ-15), с `onerror` fallback на CSS-градиент. Города без SIGHTS — сразу градиент (только посещённые — градиент виден, непосещённые — серый).
2. **Заголовок** — название + регион + **бейдж ранга** (для посещённых)
3. **Штамп** 80×80px (без изменений из v2, добавить CSS-класс ранга для будущего Этапа 4)
4. **Описание** (без изменений)
5. **Блок «Что посмотреть»** — чек-лист или манифест
6. **Textarea заметок** (без изменений из v2)
7. **Кнопка вишлиста / «Доисследовать»** — логика ниже
8. **Кнопка «Я здесь был» / дата + «Удалить отметку»** (без изменений)

```javascript
function renderCityCard(cityId) {
  var city = getCityById(cityId);
  if (!city) return;

  var region = null;
  for (var ri = 0; ri < REGIONS.length; ri++) {
    if (REGIONS[ri].id === city.region) { region = REGIONS[ri]; break; }
  }
  var regionName = region ? region.name : "";
  var regionColor = region ? region.color : "#ccc";

  var isVisited = !!state.visitedCities[cityId];
  var tier = getCityTier(cityId);
  var hasSights = hasChecklist(cityId);

  // SVG-иконки
  var svgBookmarkFilled = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>';
  var svgBookmarkOutlined = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>';
  var svgMedal = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>';
  var svgMedalFilled = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" fill="none"/></svg>';
  var svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  var html = "";
  html += '<div class="city-card">';

  // 1. Обложка
  html += '<div class="city-card-cover-wrapper" style="--region-color:' + regionColor + '">';
  html += '  <div class="city-card-cover-placeholder' + (isVisited ? '' : ' unvisited') + '"></div>';
  if (hasSights) {
    // Топ-15 город — пытаемся загрузить covers/{cityId}.webp
    html += '  <img class="city-card-cover" src="covers/' + cityId + '.webp" onerror="this.style.display=\'none\'" alt="">';
  }
  html += '</div>';

  // 2. Заголовок + бейдж ранга
  html += '  <div class="city-card-header">';
  html += '    <div class="city-card-title-block">';
  html += '      <h2 class="city-card-name">' + escapeHtml(city.name) + '</h2>';
  html += '      <p class="city-card-region">' + escapeHtml(regionName) + '</p>';
  if (isVisited && tier) {
    html += '      <span class="city-card-tier-badge tier-' + tier + '">' + getTierEmoji(tier) + ' ' + getTierLabel(tier);
    if (hasSights) {
      html += ' (' + getCheckedCount(cityId) + '/' + getSightsCount(cityId) + ')';
    }
    html += '</span>';
  }
  html += '    </div>';
  html += '    <div class="city-card-actions">';
  html += '      <button class="city-card-btn-close" id="city-card-close-btn">&times;</button>';
  html += '    </div>';
  html += '  </div>';

  // 3. Штамп (v2 как есть, + CSS-класс ранга для Этапа 4)
  var stampTierClass = tier ? ' stamp-tier-' + tier : '';
  html += '  <div class="city-card-stamp' + (isVisited ? ' visited' : '') + stampTierClass + '" style="' + (isVisited ? '--region-color:' + regionColor + ';color:' + regionColor : 'color:#ccc') + '">';
  html += createStampSVG(city.region);
  html += '  </div>';

  // 4. Описание
  html += '  <p class="city-card-description">' + escapeHtml(city.description) + '</p>';

  // 5. Блок «Что посмотреть» (чек-лист / манифест)
  html += renderChecklist(cityId, hasSights, isVisited, tier, regionColor, svgCheck);

  // 6. Textarea заметок (v2 без изменений)
  var noteValue = state.cityNotes[cityId] || "";
  var notePlaceholder = isVisited ? "Впечатления, заметки на память..." : "Что посмотреть, куда зайти...";
  html += '  <textarea id="city-card-note" class="city-card-note" maxlength="500" placeholder="' + notePlaceholder + '">' + escapeHtml(noteValue) + '</textarea>';

  // 7. Кнопка вишлиста / «Доисследовать»
  if (!isVisited) {
    // Непосещённый → «Хочу поехать» (как в v2)
    if (state.plannedCities[cityId]) {
      html += '  <button class="city-card-btn-explore active" id="city-card-explore-btn" style="--region-color:' + regionColor + '">' + svgBookmarkFilled + ' <span>В планах</span></button>';
    } else {
      html += '  <button class="city-card-btn-explore" id="city-card-explore-btn">' + svgBookmarkOutlined + ' <span>Хочу поехать</span></button>';
    }
  } else {
    // Посещённый → «Доисследовать» для Бронзы/Серебра с чек-листом
    if (hasSights && (tier === "bronze" || tier === "silver")) {
      if (state.plannedCities[cityId]) {
        html += '  <button class="city-card-btn-explore active" id="city-card-explore-btn" style="--region-color:' + regionColor + '">' + svgMedalFilled + ' <span>Доисследовать</span></button>';
      } else {
        html += '  <button class="city-card-btn-explore" id="city-card-explore-btn">' + svgMedal + ' <span>Доисследовать город</span></button>';
      }
    }
    // Gold и города без чек-листа → кнопка не рендерится
  }

  // 8. Кнопка визита / удаления (v2 без изменений)
  if (isVisited) {
    var visit = state.visitedCities[cityId];
    html += '  <p class="city-card-date">Дата визита: <span>' + formatDateDisplay(visit.date) + '</span></p>';
    html += '  <button class="city-card-btn city-card-btn-danger" id="city-card-remove-btn">Удалить отметку</button>';
  } else {
    html += '  <button class="city-card-btn city-card-btn-primary" id="city-card-visit-btn">Я здесь был</button>';
  }

  html += '</div>';

  document.getElementById("city-card-content").innerHTML = html;

  // --- Привязка обработчиков ---

  var closeBtn = document.getElementById("city-card-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeCityCard);

  if (isVisited) {
    var removeBtn = document.getElementById("city-card-remove-btn");
    if (removeBtn) removeBtn.addEventListener("click", function () { removeVisit(cityId); });
  } else {
    var visitBtn = document.getElementById("city-card-visit-btn");
    if (visitBtn) visitBtn.addEventListener("click", function () { openDatePicker(cityId); });
  }

  // Кнопка вишлиста / «Доисследовать» (общая для обоих случаев)
  var exploreBtn = document.getElementById("city-card-explore-btn");
  if (exploreBtn) exploreBtn.addEventListener("click", function () { togglePlanned(cityId); });

  // Чек-лист: интерактивные пункты (IIFE для изоляции в ES5)
  if (hasSights && isVisited) {
    var items = document.querySelectorAll("#city-card-content .checklist-item");
    for (var ev_si = 0; ev_si < items.length; ev_si++) {
      (function (item) {
        item.addEventListener("click", function () {
          toggleSight(cityId, item.getAttribute("data-sight-id"));
        });
      })(items[ev_si]);
    }
  }

  // Аккордеон Золота
  var goldToggle = document.getElementById("checklist-gold-toggle");
  if (goldToggle) {
    goldToggle.addEventListener("click", function () {
      var body = document.getElementById("checklist-gold-body");
      if (body) body.classList.toggle("checklist-collapsed");
      goldToggle.classList.toggle("expanded");
      var arrow = goldToggle.querySelector(".checklist-gold-arrow");
      if (arrow) {
        arrow.textContent = goldToggle.classList.contains("expanded") ? "Свернуть" : "Развернуть";
      }
    });
  }

  // Textarea заметок (v2 без изменений)
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
```

> **⚠️ Удалена кнопка вишлиста из `.city-card-actions`:** В v2 кнопка-закладка находилась в шапке рядом с кнопкой закрытия. В v3 она перемещена вниз карточки как полноразмерная кнопка (секция 7), чтобы освободить шапку для бейджа ранга. Кнопка закрытия остаётся в шапке.

---

### 3. `app.js` — вспомогательная функция `renderChecklist()`

Создать новую функцию рядом с `renderCityCard`. Возвращает HTML-строку блока чек-листа.

```javascript
function renderChecklist(cityId, hasSights, isVisited, tier, regionColor, svgCheck) {
  if (!hasSights) {
    // Города без чек-листа — манифест
    return '<div class="checklist-manifest">Этот город ждёт своих исследователей. Возможно, именно вы откроете его скрытые жемчужины!</div>';
  }

  var sights = SIGHTS[cityId];
  var checked = state.checkedSights[cityId] || [];
  var checkedCount = checked.length;
  var totalCount = sights.length;
  var interactive = isVisited;
  var isGold = tier === "gold";

  var html = "";
  html += '<div class="city-card-checklist">';

  // Прогресс-бар (не для свёрнутого Золота — там отдельная строка)
  if (!isGold) {
    html += '  <div class="checklist-header">';
    html += '    <span class="checklist-title">Что посмотреть</span>';
    if (isVisited) {
      html += '  <span class="checklist-count">Осмотрено ' + checkedCount + ' из ' + totalCount + '</span>';
    } else {
      html += '  <span class="checklist-count">' + totalCount + ' ' + getPluralSights(totalCount) + '</span>';
    }
    html += '  </div>';
    if (isVisited) {
      var pct = Math.round((checkedCount / totalCount) * 100);
      html += '  <div class="checklist-progress-track"><div class="checklist-progress-fill" style="width:' + pct + '%;background:' + regionColor + '"></div></div>';
    }
  }

  // Gold → свёрнутый аккордеон
  if (isGold) {
    html += '  <div class="checklist-gold-header" id="checklist-gold-toggle" style="border-left:4px solid ' + regionColor + '">';
    html += '    <span class="checklist-gold-badge">🥇 Золото (' + checkedCount + '/' + totalCount + ')</span>';
    html += '    <span class="checklist-gold-arrow">Развернуть</span>';
    html += '  </div>';
    html += '  <div class="checklist-items checklist-collapsed" id="checklist-gold-body"><div class="checklist-items-inner">';
  } else {
    html += '  <div class="checklist-items"><div class="checklist-items-inner">';
  }

  // Пункты чек-листа
  for (var si = 0; si < sights.length; si++) {
    var sight = sights[si];
    var isChecked = checked.indexOf(sight.id) !== -1;
    var disabled = !interactive ? " disabled" : "";
    var checkedClass = isChecked ? " checked" : "";

    html += '  <div class="checklist-item' + disabled + '" data-sight-id="' + sight.id + '">';
    html += '    <div class="checklist-checkbox' + checkedClass + '" style="' + (isChecked ? '--region-color:' + regionColor : '') + '">';
    if (isChecked) html += svgCheck;
    html += '    </div>';
    html += '    <span class="checklist-item-name' + checkedClass + '">' + escapeHtml(sight.name) + '</span>';
    html += '  </div>';
  }

  html += '  </div></div>'; // .checklist-items-inner + .checklist-items
  html += '</div>';         // .city-card-checklist
  return html;
}
```

#### Хелпер `getPluralSights(n)`

Правильное склонение слова «достопримечательность»:

```javascript
function getPluralSights(n) {
  var mod10 = n % 10;
  var mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "достопримечательность";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "достопримечательности";
  return "достопримечательностей";
}
```

> **⚠️ Логика чек-листа по состояниям:**
>
> | Состояние | Чек-лист | Чекбоксы | Прогресс-бар |
> |---|---|---|---|
> | Непосещённый + есть SIGHTS | Развёрнут, все пункты видны | `disabled` (read-only) | Скрыт |
> | Бронза + есть SIGHTS | Развёрнут | Активны | Виден |
> | Серебро + есть SIGHTS | Развёрнут | Активны | Виден |
> | Золото + есть SIGHTS | Свёрнут (аккордеон) | Активны при разворачивании (`pointer-events:none` через CSS пока свёрнут) | Скрыт, бейдж «🥇 Золото (X/Y)» |
> | Любое, нет SIGHTS | Манифест-текст | — | — |

---

### 4. `app.js` — обновить `togglePlanned(cityId)`

Текущая функция: строки 1164–1185.

**Изменение 1:** Удалить строку 1168 `if (state.visitedCities[cityId]) return;` — в v3 посещённые города могут быть в plannedCities («Доисследовать»).

**Изменение 2:** Добавить проверку: Gold-города нельзя планировать.

```javascript
function togglePlanned(cityId) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    // УДАЛЕНО: if (state.visitedCities[cityId]) return;
    var isVisited = !!state.visitedCities[cityId];
    var hasSights = hasChecklist(cityId);
    var tier = getCityTier(cityId);
    // Нельзя планировать: Gold (исследовать нечего)
    // ИЛИ посещённый город без чек-листа (тоже исследовать нечего)
    if (tier === "gold" || (isVisited && !hasSights)) {
      if (state.plannedCities[cityId]) {
        delete state.plannedCities[cityId];
        saveState();
        renderCityCard(cityId);
        if (mapPointsInitialized) {
          updateMapMarkers();
          updateMapFilter();
        }
      }
      return;
    }
    if (state.plannedCities[cityId]) {
      delete state.plannedCities[cityId];
    } else {
      state.plannedCities[cityId] = true;
    }
    saveState();
    clearTimeout(noteDebounceTimer);
    var noteEl = document.getElementById("city-card-note");
    if (noteEl) saveNote(cityId, noteEl.value);
    renderCityCard(cityId);
    if (mapPointsInitialized) {
      updateMapMarkers();
      updateMapFilter();
    }
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}
```

---

### 5. `app.js` — обновить `confirmVisit(cityId, date)`

Текущая функция: строки 1362–1385. Без структурных изменений — `delete state.plannedCities[cityId]` остаётся (при посещении города «Хочу поехать» выполнено). Milestone для Бронзы НЕ добавляется (выводится из `visitedCities.date` в Хронике — Этап 5).

Функция остаётся **как есть**. Никаких изменений не требуется.

---

### 6. `app.js` — обновить `removeVisit(cityId)`

Текущая функция: строки 1387–1405. Добавить очистку новых полей **после** `delete state.visitedCities[cityId]` и **до** `saveState()`:

```javascript
function removeVisit(cityId) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    delete state.visitedCities[cityId];
    // НОВОЕ: сброс прогресса чек-листа
    delete state.checkedSights[cityId];
    // НОВОЕ: удаление всех milestone'ов
    removeAllMilestones(cityId);
    // НОВОЕ: удаление из plannedCities («Доисследовать» больше не нужно)
    delete state.plannedCities[cityId];
    // cityNotes — НЕ трогать (переживает удаление визита)
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
```

---

### 7. `style.css` — новые стили

Добавить в конец файла (или после блока `.city-card-note::placeholder`, строка ~893).

#### 7.1. Обложка

```css
/* City card cover */
.city-card-cover-wrapper {
  position: relative;
  margin: -20px -20px 16px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 16px 16px 0 0;
}

.city-card-cover-placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--region-color, #ccc), color-mix(in srgb, var(--region-color, #ccc) 50%, #333));
  display: flex;
  align-items: center;
  justify-content: center;
}

.city-card-cover-placeholder.unvisited {
  background: linear-gradient(135deg, #e0e0e0, #bbb);
}

.city-card-cover {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
```

> **Поведение:** `.city-card-cover-placeholder` — абсолютный позиционированный фон-градиент. `.city-card-cover` (`<img>`) — поверх. Если WebP не загрузился, `onerror` скрывает `<img>`, открывая градиент. `color-mix` уже используется в кодовой базе (строка 789), поэтому безопасен.

#### 7.2. Бейдж ранга

```css
/* Tier badge */
.city-card-tier-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-top: 8px;
}

.city-card-tier-badge.tier-bronze {
  background: #F0E0D0;
  color: #8B4513;
}

.city-card-tier-badge.tier-silver {
  background: #E8E8E8;
  color: #666;
}

.city-card-tier-badge.tier-gold {
  background: #FFF3B0;
  color: #B8860B;
}
```

#### 7.3. Чек-лист

```css
/* Checklist */
.city-card-checklist {
  margin-bottom: 20px;
}

.checklist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.checklist-title {
  font-weight: 700;
  font-size: 1rem;
  color: #1a1a1a;
}

.checklist-count {
  font-size: 0.8125rem;
  color: #999;
}

.checklist-progress-track {
  height: 6px;
  border-radius: 3px;
  background: #f0f0f0;
  overflow: hidden;
  margin-bottom: 12px;
}

.checklist-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.checklist-items {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.3s ease;
}

.checklist-items-inner {
  min-height: 0; /* Критично для корректного схлопывания grid-rows 0fr */
  overflow: hidden;
}

.checklist-items.checklist-collapsed {
  grid-template-rows: 0fr;
}

.checklist-items.checklist-collapsed .checklist-item {
  pointer-events: none; /* Элементы внутри свёрнутого блока не кликабельны */
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 4px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  transition: background-color 0.15s;
}

.checklist-item:active {
  background-color: #f9f9f9;
}

.checklist-item.disabled {
  cursor: default;
  opacity: 0.6;
  pointer-events: none;
}

.checklist-item.disabled:active {
  background-color: transparent;
}

.checklist-checkbox {
  width: 24px;
  height: 24px;
  min-width: 24px;
  border: 2px solid #ccc;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checklist-checkbox.checked {
  background: var(--region-color, #27AE60);
  border-color: var(--region-color, #27AE60);
}

.checklist-item-name {
  flex: 1;
  font-size: 0.9375rem;
  color: #333;
  line-height: 1.4;
}

.checklist-item-name.checked {
  text-decoration: line-through;
  color: #999;
}

.checklist-manifest {
  padding: 20px 16px;
  background: #f9f9f9;
  border-radius: 12px;
  font-style: italic;
  color: #888;
  text-align: center;
  font-size: 0.9375rem;
  line-height: 1.5;
  margin-bottom: 20px;
}
```

#### 7.4. Аккордеон Золота

```css
/* Gold checklist accordion */
.checklist-gold-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #FFF3B0, #FFE873);
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 8px;
}

.checklist-gold-badge {
  font-weight: 700;
  color: #B8860B;
  font-size: 0.9375rem;
}

.checklist-gold-arrow {
  font-size: 0.8125rem;
  color: #B8860B;
  font-weight: 600;
}

.checklist-gold-arrow::after {
  content: " ▾";
}

.checklist-gold-header.expanded .checklist-gold-arrow::after {
  content: " ▴";
}
```

> **⚠️ Анимация аккордеона:** CSS `grid-template-rows: 1fr → 0fr` даёт плавную анимацию высоты **только если внутри один дочерний блок-обёртка**. Поэтому в `renderChecklist` (Раздел 3) все `.checklist-item` обёрнуты в `<div class="checklist-items-inner">` с `min-height: 0; overflow: hidden`. Не удаляй эту обёртку — без неё анимация схлопывается мгновенно с рывком.

#### 7.5. Кнопка вишлиста / «Доисследовать»

```css
/* Explore / Wishlist button */
.city-card-btn-explore {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 12px 20px;
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: inherit;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: #ffffff;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.city-card-btn-explore:active {
  opacity: 0.8;
}

.city-card-btn-explore.active {
  background: #f0fdf4; /* Fallback для старых WebView без color-mix */
  background: color-mix(in srgb, var(--region-color, #27AE60) 12%, transparent);
  color: var(--region-color, #27AE60);
  border-color: var(--region-color, #27AE60);
}
```

#### 7.6. Корректировка отступа карточки

Текущий `.city-card` имеет `padding: 20px`. Обложка использует `margin: -20px -20px 16px` чтобы растянуться к краям карточки. Это работает корректно — негативный `margin` компенсирует `padding`.

Если у карточки есть `border-radius: 16px`, а обложка — `border-radius: 16px 16px 0 0`, верхние углы обложки скругляются вместе с карточкой. Нужно убедиться, что `overflow` обложки не обрезает скругление. Текущий CSS `.city-card` не имеет `overflow: hidden`, а `.city-card-cover-wrapper` имеет `overflow: hidden` — это правильно.

---

### 8. Обложки городов

**Подход:**
1. Создать директорию `F:\projects\traveler-passport\covers\`
2. Для каждого из Топ-15 городов: подобрать изображение, обрезать до 16:9, сжать в WebP (≤15КБ), сохранить как `covers/{cityId}.webp`
3. Именование строго по `cityId` из массива `CITIES`:
   `minsk.webp`, `nesvizh.webp`, `mir.webp`, `polotsk.webp`, `brest.webp`, `pinsk.webp`, `grodno.webp`, `vitebsk.webp`, `novogrudok.webp`, `lida.webp`, `mogilev.webp`, `gomel.webp`, `braslav.webp`, `zaslavl.webp`, `turov.webp`

**Если обложек пока нет** — это нормально. Код рендерит `<img>` с `onerror`, который мгновенно скрывает битую картинку, показывая градиент. Карточка работает корректно без единого файла в `covers/`. Добавляй обложки постепенно.

**Fallback для `file:///`:** Если WebView блокирует относительные пути (`covers/minsk.webp`), `<img>` не загрузится, `onerror` сработает, градиент покажется. Это безопасный fallback. Если в будущем потребуется полная автономность — обложки можно перевести в Base64 внутри `data-sights.js`.

---

## Критерии готовности

После выполнения всех задач проверь:

1. **Нет JS-ошибок** — карточка открывается без ошибок для всех типов городов
2. **Карточка непосещённого Топ-15 города** (например, Минск):
   - Обложка: градиент (или WebP если файл есть)
   - Чек-лист развёрнут, все 4 пункта видны, чекбоксы `disabled` (серые)
   - Прогресс-бар скрыт
   - Кнопка «Хочу поехать» внизу
3. **Карточка непосещённого города без SIGHTS** (например, Слуцк):
   - Обложка: серый градиент
   - Манифест-текст «Этот город ждёт своих исследователей...»
   - Нет чек-листа, нет прогресс-бара
4. **После чекина** (Бронза):
   - Бейдж «🥉 Бронза (0/4)» в шапке
   - Чекбоксы стали интерактивными
   - Прогресс-бар виден, показывает 0%
   - Кнопка «Доисследовать город» (вместо «Хочу поехать»)
5. **Отметка пункта чек-листа:**
   - Чекбокс заполняется цветом региона, галочка белая
   - Название перечёркнуто, серое
   - Прогресс-бар обновляется плавно
   - Бейдж обновляется: «🥉 Бронза (1/4)»
6. **Отметка 50% → Серебро:**
   - Бейдж меняется на «🥈 Серебро (2/4)»
   - Milestone записан: `state.milestones` содержит `{cityId, tier:"silver", date}`
7. **Отметка 100% → Золото:**
   - Бейдж меняется на «🥇 Золото (4/4)»
   - Чек-лист сворачивается в аккордеон «🥇 Золото (4/4) [Развернуть ▾]»
   - Нажатие «Развернуть» — плавная анимация раскрытия, текст меняется на «Свернуть ▴», чекбоксы активны
   - Кнопка «Доисследовать» **скрыта** (Gold — исследовать нечего)
   - Milestone записан: `{cityId, tier:"gold", date}`
8. **Снятие галочки (Gold → Silver):**
   - Бейдж возвращается на «🥈 Серебро (3/4)»
   - Чек-лист разворачивается (не аккордеон)
   - Gold milestone удалён из `state.milestones`
   - Кнопка «Доисследовать» снова видна
9. **Снятие галочки (Silver → Bronze):**
   - Бейдж: «🥉 Бронза (1/4)»
   - Silver milestone удалён
10. **Прыжок Gold → Bronze** (через консоль, для города с 1 пунктом — добавить временно):
    - В консоли: `SIGHTS["slutsk"] = [{id:"s0",name:"Тест"}]` — Слуцк есть в CITIES, но нет в SIGHTS
    - Открыть карточку Слуцка, отметить визит → Бронза, отметить единственный пункт → Золото
    - Снять единственную галочку → Бронза
    - Проверить: `state.milestones` НЕ содержит ни silver, ни gold milestone для Слуцка
    - Очистить: `delete SIGHTS["slutsk"]`, перезагрузить страницу
11. **«Доисследовать» toggles plannedCities:**
    - Нажатие → кнопка заполняется цветом, `state.plannedCities[cityId] === true`
    - Повторное нажатие → кнопка очищается, `cityId` удалён из plannedCities
12. **Удаление визита:**
    - `checkedSights[cityId]` удалён
    - `milestones` не содержит записей для этого города
    - `plannedCities[cityId]` удалён
    - `cityNotes[cityId]` **сохранён**
13. **Не посещённый город в plannedCities** остаётся после перезагрузки (инвариант «visited wins» больше не работает)
14. **Штамп рендерится корректно** — `createStampSVG(city.region)` вызывается с тем же аргументом, что в v2. Проверить: открыть карточку любого города — штамп виден (иконка региона), для посещённого — окрашен в `regionColor`
15. **Все вкладки работают** без визуальных поломок

---

## Важно — НЕ модифицировать

- **НЕ изменяй** массивы `CITIES`, `REGIONS`, `REGION_ICONS`, объект `SIGHTS`
- **НЕ изменяй** `createStampSVG()` — tier-стилизация штампа это Этап 4. Класс `stamp-tier-{tier}` добавляется в HTML, но CSS для него будет в Этапе 4
- **НЕ изменяй** функции карты (`initMapPoints`, `updateMapMarkers`, `updateMapFilter`, zoom) — это Этап 3
- **НЕ изменяй** `renderPassport()`, `renderProfile()`, `renderStampOverlay()` — они обновляются в этапах 4–5
- **НЕ изменяй** модель данных (`state`, `loadState`, `saveState`) — это сделано в Этапе 1
- **НЕ изменяй** `confirmVisit()` — она остаётся как есть
- **НЕ добавляй** новые маркеры карты, бейджи в паспорте, хронику в профиле — это этапы 3–5
- **НЕ обновляй** `sw.js` — это Этап 6
