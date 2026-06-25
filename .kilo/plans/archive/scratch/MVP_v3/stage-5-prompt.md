# Этап 5 — Профиль: панель орденов + хроника milestone'ов

## Контекст

Прочитай следующие документы перед началом работы:

1. **Спецификация v3:** `F:\projects\traveler-passport\.kilo\plans\MVP_v3\MVP_v3.md` — Модуль 4 (Дофаминовый Профиль и Хроника Достижений).

2. **План реализации v3:** `F:\projects\traveler-passport\.kilo\plans\MVP_v3\implementation-plan.md` — этот этап описан в секции «Этап 5. Профиль: панель орденов + хроника milestone'ов».

3. **Описание текущей кодовой базы (v2):** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\app-description_v2.md` — справочник по существующему коду.

**Суть этапа:** Профильная вкладка (`renderProfile()`) в v2 показывает плоский счётчик «X из Y» и хронику из одних только визитов. В v3:

- **Панель орденов:** под счётчиком «X из Y» появляется блок `🥇 Золотых: N | 🥈 Серебряных: M | 🥉 Бронзовых: K` — города группируются по рангу через `getCityTier()`.
- **Хроника достижений:** хроника объединяет визиты (Бронза = «Открыт город») и milestone'ы (Серебро/Золото = «прокачан до … ордена»). Сортировка: дата DESC → визит раньше milestone при совпадении дат → название города ASC.

---

## Что уже сделано (Этапы 1–4)

- `data-sights.js` подключён, `SIGHTS` содержит 15 городов
- `state.checkedSights`, `state.milestones` — загружаются и сохраняются
- Функции ранжирования (Этап 1):
  - `getCityTier(cityId)` — возвращает `"bronze"` / `"silver"` / `"gold"` / `null`
  - `getTierLabel(tier)` — возвращает `"Бронза"` / `"Серебро"` / `"Золото"` / `""`
  - `getTierEmoji(tier)` — возвращает `"🥉"` / `"🥈"` / `"🥇"` / `""`
  - `getCheckedCount(cityId)`, `getSightsCount(cityId)`, `hasChecklist(cityId)`
  - `getCityById(cityId)` — lookup города по id из массива `CITIES`
- `state.milestones` — массив объектов `{ cityId, date, tier }`, где `tier` ∈ `["silver", "gold"]`. Milestone'ы создаются/удаляются в `toggleSight()` при переходах ранга
- Карточка города, карта, штампы — реализованы (Этапы 2–4)

---

## Текущее состояние функций (изучи по app.js)

**`formatDateDisplay(dateStr)` (строки ~1149–1156):** Принимает `"YYYY-MM-DD"`, возвращает `"DD.MM.YYYY"`. Используется в хронике.

**`renderProfile()` (строки 1158–1269):** Рендерит 4 секции профиля:

1. **Имя путешественника** (строки 1167–1181) — без изменений, НЕ ТРОГАТЬ
2. **«Общая статистика»** (строки 1185–1199) — счётчик «X из Y», прогресс-бар, строка «В планах: N»
3. **«Прогресс по регионам»** (строки 1203–1220) — без изменений, НЕ ТРОГАТЬ
4. **«Хроника посещений»** (строки 1224–1249) — **ТОЛЬКО визиты**, без milestone'ов. Сортировка: date DESC → name ASC

**Текущая хроника (строки 1229–1247)** — inline-логика:
```javascript
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
```

> **⚠️ Проблемы текущей хроники:**
> - `CITIES.find()` — нарушает конвенцию (нужно `getCityById()`)
> - Нет milestone'ов — `state.milestones` не используется
> - Нет priority tie-break — при одинаковой дате визит и milestone могут идти в любом порядке
> - Заголовок «Хроника посещений» — не отражает новый контент

**Блок «В планах» (строки 1195–1198):** Уже работает корректно — считает все `plannedCities === true`, включая и вишлист, и «Доисследовать». **Не требует изменений.**

---

## Конвенции кода (из Этапа 1 — соблюдать)

- `let`/`const` на верхнем уровне, `var` внутри тел функций
- `for (var i = 0; ...)` — НЕ `for (let ...)`
- Не использовать `CITIES.find()` — использовать `getCityById()`
- Имена счётчиков циклов — уникальные (`vi`, `mi`, `ci`, `cei` и т.д.), не простые `i` — чтобы избежать hoisting-коллизий в функциях с несколькими циклами

---

## Задачи

### 1. `app.js` — создать функцию `generateChronicle()`

Вставить **перед** `renderProfile()` (между `formatDateDisplay()` на строке 1156 и `renderProfile()` на строке 1158). Currently line 1157 is blank — вставляй туда.

```javascript
function generateChronicle() {
  var entries = [];

  // Визиты (Бронза) — из visitedCities
  var visitedIds = Object.keys(state.visitedCities);
  for (var vi = 0; vi < visitedIds.length; vi++) {
    var cityId = visitedIds[vi];
    var city = getCityById(cityId);
    if (!city) continue;
    var visit = state.visitedCities[cityId];
    if (!visit || !visit.date) continue;
    entries.push({
      date: visit.date,
      sortName: city.name,
      label: "Открыт город " + city.name + " (Чернильный штамп)",
      type: "visit",
      priority: 0
    });
  }

  // Milestone'ы (Silver/Gold) — из state.milestones
  var milestones = state.milestones || [];
  for (var mi = 0; mi < milestones.length; mi++) {
    var m = milestones[mi];
    var mCity = getCityById(m.cityId);
    if (!mCity) continue;
    var emoji = m.tier === "gold" ? "🥇" : "🥈";
    var tierName = m.tier === "gold" ? "Золотого" : "Серебряного";
    entries.push({
      date: m.date,
      sortName: mCity.name,
      label: mCity.name + " прокачан до " + tierName + " ордена! " + emoji,
      type: "milestone",
      priority: 1
    });
  }

  // Сортировка: дата DESC → имя ASC (группировка по городу) → priority ASC (визит раньше milestone)
  entries.sort(function (a, b) {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.sortName !== b.sortName) return a.sortName.localeCompare(b.sortName, "ru");
    return a.priority - b.priority;
  });

  return entries;
}
```

> **⚠️ Порядок сортировки: дата → имя → priority (а не дата → priority → имя):** Имя (`sortName`) идёт **выше** priority в цепочке сортировки. Это значит, что при нескольких событиях в один день хроника **группируется по городу**, а не «все визиты, потом все апгрейды»:
> ```
> 09.06.2026  Открыт город Брест (Чернильный штамп)
> 09.06.2026  Брест прокачан до Серебряного ордена! 🥈
> 09.06.2026  Открыт город Витебск (Чернильный штамп)
> 09.06.2026  Витебск прокачан до Серебряного ордена! 🥈
> ```
> При совпадении и даты, и имени (тот же город, визит + milestone в один день) — `priority` решает: визит (`0`) раньше milestone (`1`). Первичный инвариант «визит раньше апгрейда для конкретного города» сохраняется.
>
> **⚠️ Guard `if (!city) continue` / `if (!mCity) continue`:** Защита от orphaned-данных — город мог быть удалён из `CITIES`, но остаться в `localStorage`. Без guard — `TypeError: Cannot read property 'name' of null`.
>
> **⚠️ `var milestones = state.milestones || []`:** Defensive — если `state.milestones` вдруг `undefined` (битый localStorage), функция не упадёт.
>
> **⚠️ Уникальные имена счётчиков:** `vi` (visits), `mi` (milestones) — не конфликтуют с другими циклами в области видимости.

---

### 2. `app.js` — добавить панель орденов в `renderProfile()`

Вставить **внутрь секции «Общая статистика»**, после строки «В планах» (после строки ~1198, перед `html += '</div>';` на строке ~1199).

**Код для вставки** (между `html += '  </div>';` блока «В планах» и `html += '</div>';` закрывающего `.profile-section`):

```javascript
  // Панель орденов
  var goldCount = 0, silverCount = 0, bronzeCount = 0;
  for (var ci = 0; ci < CITIES.length; ci++) {
    var cityTier = getCityTier(CITIES[ci].id);
    if (cityTier === "gold") goldCount++;
    else if (cityTier === "silver") silverCount++;
    else if (cityTier === "bronze") bronzeCount++;
  }
  html += '  <div class="profile-awards">';
  html += '    <div class="award-item">';
  html += '      <span class="award-emoji">🥇</span>';
  html += '      <span class="award-count">' + goldCount + '</span>';
  html += '      <span class="award-label">Золотых</span>';
  html += '    </div>';
  html += '    <div class="award-item">';
  html += '      <span class="award-emoji">🥈</span>';
  html += '      <span class="award-count">' + silverCount + '</span>';
  html += '      <span class="award-label">Серебряных</span>';
  html += '    </div>';
  html += '    <div class="award-item">';
  html += '      <span class="award-emoji">🥉</span>';
  html += '      <span class="award-count">' + bronzeCount + '</span>';
  html += '      <span class="award-label">Бронзовых</span>';
  html += '    </div>';
  html += '  </div>';
```

> **⚠️ Логика подсчёта:** Обходим **весь** массив `CITIES` (не только `visitedCities`), для каждого вызываем `getCityTier()`. Непосещённый город → `null` → не учитывается. Посещённый без чек-листа → `"bronze"`. Посещённый с чек-листом и прогрессом → `"bronze"` / `"silver"` / `"gold"` по соотношению отмеченных пунктов.
>
> **⚠️ `goldCount + silverCount + bronzeCount` = `totalVisited`:** Сумма орденов всегда равна количеству посещённых городов. Проверь это в консоли — если сумма не сходится, где-то баг в `getCityTier()`.

---

### 3. `app.js` — переписать хронику в `renderProfile()`

**Заменить весь блок хроники** (строки ~1224–1249) — от `html += '<div class="profile-section">';` с заголовком «Хроника» до закрывающего `html += '</div>';` секции хроники.

**Было (строки ~1224–1249):**

```javascript
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
```

**Стало:**

```javascript
  html += '<div class="profile-section">';
  html += '  <div class="chronicle-title">Хроника достижений</div>';
  var chronicleEntries = generateChronicle();
  if (chronicleEntries.length === 0) {
    html += '  <p class="chronicle-empty">Вы пока не посетили ни одного города. Отправляйтесь в путь!</p>';
  } else {
    html += '  <ul class="chronicle-list">';
    for (var cei = 0; cei < chronicleEntries.length; cei++) {
      var entry = chronicleEntries[cei];
      var itemClass = entry.type === "milestone" ? "chronicle-item milestone" : "chronicle-item";
      html += '<li class="' + itemClass + '">';
      html += '  <span class="chronicle-city">' + escapeHtml(entry.label) + '</span>';
      html += '  <span class="chronicle-date">' + formatDateDisplay(entry.date) + '</span>';
      html += '</li>';
    }
    html += '  </ul>';
  }
  html += '</div>';
```

> **⚠️ Заголовок изменён:** «Хроника посещений» → «Хроника достижений» — теперь включает не только визиты, но и milestone'ы.
>
> **⚠️ `chronicleEntries.length === 0`:** Заменило проверку `totalVisited === 0`. Логически эквивалентно (нет визитов → нет milestone'ов → пусто), но `generateChronicle()` — единый источник правды.
>
> **⚠️ `entry.label` вместо `item.name`:** В v2 хроника показывала только название города. Теперь `label` содержит полную строку: «Открыт город Полоцк (Чернильный штамп)» или «Полоцк прокачан до Золотого ордена! 🥇».
>
> **⚠️ Класс `milestone`:** Milestone-записи получают класс `chronicle-item milestone` — для CSS-стилизации (золотой tint, жирный шрифт).
>
> **⚠️ `escapeHtml(entry.label)`:** Label содержит эмодзи (🥇/🥈) и название города. `escapeHtml` безопасно экранирует название, эмодзи проходят как есть.

---

### 4. `style.css` — стили панели орденов

Добавить **после** стилей хроники (после `.chronicle-date` на строке ~429, перед `.passport-sticky-header` на строке ~431).

```css
/* Awards panel */
.profile-awards {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.award-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.award-emoji {
  font-size: 1.75rem;
  line-height: 1.2;
}

.award-count {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
}

.award-label {
  font-size: 0.75rem;
  color: #666;
}
```

> **⚠️ `border-top` + `padding-top`:** Разделитель между строкой «В планах» и панелью орденов — тонкая линия `#f0f0f0` (как `.profile-divider`, но внутри секции).
>
> **⚠️ `gap: 24px`:** Расстояние между 🥇/🥈/🥉 колонками. На узких экранах (320px) три колонки помещаются: каждая ~80px шириной.

---

### 5. `style.css` — стили milestone-записей в хронике

Добавить **сразу после** стилей панели орденов (задача 4), в том же блоке.

```css
/* Chronicle milestone entries */
.chronicle-item.milestone {
  background: #FFFAEB;
  border-radius: 8px;
  border-bottom-color: transparent;
  padding: 12px;
  margin: 4px 0;
}

.chronicle-item.milestone .chronicle-city {
  color: #B8860B;
  font-weight: 600;
}
```

> **⚠️ `background: #FFFAEB`:** Лёгкий золотистый tint — визуально выделяет milestone-записи среди обычных визитов, не кричащий.
>
> **⚠️ `border-bottom-color: transparent`:** Убирает нижнюю границу `.chronicle-item` (`1px solid #f0f0f0`) — без этого линия проходит по нижнему краю золотого фона и выглядит грязно.
>
> **⚠️ `padding: 12px`:** Переопределяет `padding: 12px 0` из `.chronicle-item` — даёт горизонтальный padding, чтобы фон с `border-radius` выглядел как карточка.
>
> **⚠️ `color: #B8860B` (DarkGoldenrod):** Текст milestone-записей — тёмное золото, контрастирует с обычным `#333` визитов.

---

## Критерии готовности

После выполнения всех задач проверь:

1. **Панель орденов** отображается в секции «Общая статистика», под строкой «В планах»
2. **Три колонки** (🥇 / 🥈 / 🥉) с числами и подписями «Золотых» / «Серебряных» / «Бронзовых»
3. **Сумма орденов** (Gold + Silver + Bronze) = количеству посещённых городов
4. **Город без чек-листа** (не в Топ-15) после чекина → учитывается как Бронза
5. **Отметка 50% пунктов** → город переходит из Бронзы в Серебро, счётчик обновляется
6. **Отметка 100% пунктов** → город переходит в Золото, счётчик обновляется
7. **Хроника** показывает визиты и milestone'ы в едином списке
8. **Заголовок хроники** — «Хроника достижений» (не «посещений»)
9. **Milestone-записи** визуально выделены: золотой tint фона, тёмно-золотой текст, жирный шрифт
10. **Сортировка хроники** — дата DESC (свежие сверху), внутри дня — группировка по городу (имя ASC)
11. **Совпадение дат, тот же город** — визит («Открыт город…») рендерится **выше** milestone («прокачан до…») того же города в тот же день
12. **Совпадение дат, разные города** — записи группируются по городу: визит + milestone Бреста, затем визит + milestone Витебска (а не все визиты, потом все milestone'ы)
13. **Снятие галочки** (downgrade ранга) → milestone удаляется из хроники без перезагрузки
14. **Пустая хроника** (нет визитов) → сообщение «Вы пока не посетили ни одного города»
15. **Переключение вкладок** (Паспорт → Профиль) обновляет панель орденов и хронику
16. **Нет JS-ошибок** — открой консоль, переключи на вкладку Профиля

---

## Важно — НЕ модифицировать

- **НЕ изменяй** массивы `CITIES`, `REGIONS`, `REGION_ICONS`, объект `SIGHTS`
- **НЕ изменяй** функции `getCityTier()`, `getTierLabel()`, `getTierEmoji()`, `getCheckedCount()`, `getSightsCount()`, `hasChecklist()`, `getCityById()` — это Этап 1
- **НЕ изменяй** `toggleSight()`, `addMilestone()`, `removeMilestone()`, `removeAllMilestones()` — это Этапы 1–2
- **НЕ изменяй** `confirmVisit()`, `removeVisit()`, `togglePlanned()` — это Этапы 1–2
- **НЕ изменяй** `renderCityCard()`, `renderChecklist()` — это Этап 2
- **НЕ изменяй** `initMapPoints()`, `updateMapMarkers()`, `updateMapLabels()`, `updateMapFilter()` — это Этап 3
- **НЕ изменяй** `createStampSVG()`, `buildFilterAccordions()`, `buildSearchResults()` — это Этап 4
- **НЕ изменяй** секцию имени путешественника в `renderProfile()` (строки 1167–1181)
- **НЕ изменяй** секцию «Прогресс по регионам» в `renderProfile()` (строки 1203–1220)
- **НЕ изменяй** блок «В планах» — уже работает корректно
- **НЕ изменяй** `formatDateDisplay()` — используется как есть
- **НЕ обновляй** `sw.js` — это Этап 6
- **НЕ изменяй** `loadState()`, `saveState()` — данные уже сохраняются/загружаются (Этап 1)
