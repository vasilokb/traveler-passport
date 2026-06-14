# Этап 1 — Фундамент: data-sights.js + модель данных + миграция + функции ранжирования

## Контекст

Прочитай следующие документы перед началом работы — они содержат спецификацию v3, полный план реализации и описание текущей кодовой базы:

1. **Спецификация v3:** `F:\projects\traveler-passport\.kilo\plans\MVP_v3\MVP_v3.md` — 5 модулей геймификации: чек-листы Must-See, ранги Бронза/Серебро/Золото, «живые» маркеры карты, панель орденов в профиле.

2. **План реализации v3:** `F:\projects\traveler-passport\.kilo\plans\MVP_v3\implementation-plan.md` — этот этап описан в секции «Этап 1. Фундамент: data-sights.js + модель данных + миграция».

3. **Описание текущей кодовой базы (v2):** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\app-description_v2.md` — детальный разбор всех функций, стилей, модели данных, структуры HTML. Справочник по существующему коду.

**Суть этапа:** Создать файл `data-sights.js` с чек-листами достопримечательностей, добавить в модель данных новые поля (`checkedSights`, `milestones`), обновить загрузку/сохранение/миграцию, и написать хелпер-функции для системы рангов. После этого этапа приложение работает как v2, но с готовым фундаментом для геймификации.

---

## Рекомендуемый порядок выполнения

Задачи ниже пронумерованы логически (1 → 6), но **при работе с `app.js` соблюдай порядок**:

1. **Раздел 1** — создать `data-sights.js` (новый файл)
2. **Раздел 2** — подключить в `index.html`
3. **Раздел 3.1** — добавить поля в объект `state`
4. **Разделы 4–5** — написать все новые функции (`getCityById`, `getCityTier` и др.) и разместить их **до** `loadState()` в коде
5. **Раздел 3.2–3.6** — модифицировать `loadState()` и `saveState()` (теперь `getCityTier()` доступен)
6. **Раздел 6** — добавить очистку непосещённых в конец `try`-блока `loadState()`

⚠️ Это **критично**: `loadState()` (раздел 3.3) вызывает `getCityTier()` в Gold-инварианте. Если функции из разделов 4–5 ещё не добавлены — `loadState()` упадёт с `ReferenceError`.

---

## Задачи

### 1. Создать файл `data-sights.js`

Создать новый файл `F:\projects\traveler-passport\data-sights.js` с полным содержимым чек-листов для Топ-15 городов.

**Структура:** глобальная переменная `SIGHTS` — объект, где ключ = `cityId` (совпадает с `id` в массиве `CITIES`), значение — массив объектов `{ id, name }`.

```javascript
"use strict";

var SIGHTS = {
  "minsk": [
    { "id": "s0", "name": "Троицкое предместье" },
    { "id": "s1", "name": "Верхний город и Ратуша" },
    { "id": "s2", "name": "Остров Слёз" },
    { "id": "s3", "name": "Национальная библиотека" }
  ],
  "nesvizh": [
    { "id": "s0", "name": "Замковый комплекс Радзивиллов" },
    { "id": "s1", "name": "Костёл Божьего Тела (Фарный)" },
    { "id": "s2", "name": "Парк вокруг дворца" }
  ],
  "mir": [
    { "id": "s0", "name": "Мирский замок" },
    { "id": "s1", "name": "Костёл Святого Николая" },
    { "id": "s2", "name": "Замковый пруд и парк" }
  ],
  "polotsk": [
    { "id": "s0", "name": "Софийский собор" },
    { "id": "s1", "name": "Спасо-Ефросиньевский монастырь" },
    { "id": "s2", "name": "Памятник Евфросинии Полоцкой" },
    { "id": "s3", "name": "Дом Симеона Полоцкого" }
  ],
  "brest": [
    { "id": "s0", "name": "Брестская крепость-герой" },
    { "id": "s1", "name": "Музей спасённых художественных ценностей" },
    { "id": "s2", "name": "Пешеходная улица Советская" }
  ],
  "pinsk": [
    { "id": "s0", "name": "Иезуитский коллегиум" },
    { "id": "s1", "name": "Дворец Бутримовича" },
    { "id": "s2", "name": "Францисканский монастырь" },
    { "id": "s3", "name": "Набережная Припяти" }
  ],
  "grodno": [
    { "id": "s0", "name": "Старый и Новый замки" },
    { "id": "s1", "name": "Коложская церковь (XII век)" },
    { "id": "s2", "name": "Фарный костёл (Фара Витовта)" },
    { "id": "s3", "name": "Пешеходная улица Советская" }
  ],
  "vitebsk": [
    { "id": "s0", "name": "Дом-музей Марка Шагала" },
    { "id": "s1", "name": "Ратуша и площадь Победы" },
    { "id": "s2", "name": "Успенский собор" },
    { "id": "s3", "name": "Летний амфитеатр (Славянский базар)" }
  ],
  "novogrudok": [
    { "id": "s0", "name": "Руины замка на Замковой горе" },
    { "id": "s1", "name": "Костёл Святого Михаила Архангела" },
    { "id": "s2", "name": "Дом-музей Адама Мицкевича" }
  ],
  "lida": [
    { "id": "s0", "name": "Лидский замок (XIV век)" },
    { "id": "s1", "name": "Костёл Воздвижения Святого Креста" }
  ],
  "mogilev": [
    { "id": "s0", "name": "Могилёвская ратуша" },
    { "id": "s1", "name": "Костёл Святого Станислава" },
    { "id": "s2", "name": "Мемориал «Буйничское поле»" }
  ],
  "gomel": [
    { "id": "s0", "name": "Дворец Румянцевых и Паскевичей" },
    { "id": "s1", "name": "Дворцово-парковый комплекс" },
    { "id": "s2", "name": "Свято-Петро-Павловский собор" }
  ],
  "braslav": [
    { "id": "s0", "name": "Замковая гора (Городище)" },
    { "id": "s1", "name": "Костёл Успения Девы Марии" },
    { "id": "s2", "name": "Озеро Дривяты" }
  ],
  "zaslavl": [
    { "id": "s0", "name": "Замчище (городище)" },
    { "id": "s1", "name": "Костёл Рождества Девы Марии" },
    { "id": "s2", "name": "Этнографический комплекс" }
  ],
  "turov": [
    { "id": "s0", "name": "Каменные кресты" },
    { "id": "s1", "name": "Деревянная церковь Всех Святых" },
    { "id": "s2", "name": "Городище «Замчанка»" }
  ]
};
```

**Требования к файлу:**
- Кодировка **UTF-8 без BOM**
- `"use strict";` в начале
- Используется `var` (не `const`/`let`) для глобальной переменной — консистентность с остальной кодовой базой
- CityId в ключах **строго совпадают** с `id` в массиве `CITIES` (app.js строки 398–456)

---

### 2. `index.html` — подключить data-sights.js

В `F:\projects\traveler-passport\index.html`, перед строкой 101 (`<script src="app.js"></script>`), добавить:

```html
  <script src="data-sights.js"></script>
  <script src="app.js"></script>
```

Порядок строго: `data-sights.js` **до** `app.js` — чтобы `SIGHTS` была доступна при выполнении `app.js`.

Убедиться, что `<meta charset="UTF-8">` (строка 4) — первый тег внутри `<head>`. В текущем коде это уже так, изменений не требуется.

---

### 3. `app.js` — модель данных

#### 3.1. Добавить поля в объект `state`

В определении `state` (строки 460–470), после `cityNotes: {}`, добавить два новых поля:

```javascript
let state = {
  currentTab: "passport",
  travelerName: "Белорусский путешественник",
  onboardingComplete: false,
  visitedCities: {},
  plannedCities: {},
  cityNotes: {},
  checkedSights: {},           // ← НОВОЕ
  milestones: [],              // ← НОВОЕ
  openedRegions: [],
  activeOverlayCityId: null,
  stampOrigin: null,
};
```

> **Конвенция `let`/`const`/`var`:** Кодовая база v2 **уже** использует `const` (строка 458: `const STORAGE_KEY`) и `let` (строка 460: `let state`) для объявлений на верхнем уровне, и `var` для переменных внутри тел функций. Это сознательная конвенция, а не баг. **Сохраняй её:** `let`/`const` для верхнего уровня, `var` внутри функций. Не меняй существующее `let state` на `var`.
>
> **⚠️ КРИТИЧНО для `for`-циклов:** Внутри всех функций используй **только** `for (var i = 0; ...)`, а НЕ `for (let i = 0; ...)`. Распространённая ошибка — автоматически написать `let` в заголовке цикла. Также все внутренние переменные (`var validChecks = {}`, `var ckey = ...` и т.д.) объявляй через `var`, не через `let`/`const`.
>
> **⚠️ Коллизии имён счётчиков `var`:** Поскольку `var` имеет function scope (а не block scope), все счётчики циклов внутри `loadState()` «подняты» (hoisted) на уровень функции. Используй **уникальные** имена для каждого цикла: `ci`, `ckey`, `cf`, `sri`, `si`, `sf`, `mi`, `ms`, `mf`, `md`, `gi`, `cui`, `vmi` — как в коде ниже. Не переиспользуй `i`, `j`, `k` повторно в соседних циклах внутри одной функции.

#### 3.2. Обновить `loadState()` — загрузка новых полей

В функции `loadState()` (примерно строки 472–555). Все номера строк ниже — **ориентировочные** (по состоянию кода до правок). При вставке новых блоков номера сдвигаются — ищи блоки по их **содержимому**, а не по номерам строк.

**После блока загрузки `cityNotes`** (блок заканчивается `state.cityNotes = validNotes; } else { state.cityNotes = {}; }`) **и ДО блока «visited wins over planned»** (начинается с `var visitedKeys = Object.keys(state.visitedCities);`), добавить загрузку двух новых полей:

> **⚠️ ПОРЯДОК ВАЖЕН:** Поля в `loadState()` должны идти строго в порядке: visitedCities → plannedCities → cityNotes → **checkedSights → milestones** → Gold-инвариант (раздел 3.3) → очистка непосещённых (раздел 6). Это связано с тем, что Gold-инвариант вызывает `getCityTier()`, который читает уже загруженный `state.checkedSights`. Не переставляй блоки местами.

```javascript
      // ПОРЯДОК ВАЖЕН: checkedSights должен быть загружен ДО Gold-инварианта (раздел 3.3)
      // checkedSights
      if (saved.checkedSights && typeof saved.checkedSights === "object" && !Array.isArray(saved.checkedSights)) {
        var validChecks = {};
        var checkIds = Object.keys(saved.checkedSights);
        for (var ci = 0; ci < checkIds.length; ci++) {
          var ckey = checkIds[ci];
          // Город должен существовать в CITIES (for-цикл для ES5-безопасности)
          var ckeyExists = false;
          for (var cf = 0; cf < CITIES.length; cf++) {
            if (CITIES[cf].id === ckey) { ckeyExists = true; break; }
          }
          if (!ckeyExists) continue;
          // Значение должно быть массивом
          var arr = saved.checkedSights[ckey];
          if (!Array.isArray(arr)) continue;
          // Фильтрация: оставить только валидные и уникальные sightId
          var validArr = [];
          if (typeof SIGHTS === "undefined") {
            // ⚠️ data-sights.js не загружен — доверяем старым данным,
            // чтобы не стереть прогресс пользователя (Silver/Gold) при оффлайн-запуске.
            // Сохраняем только строки без дубликатов.
            for (var sri = 0; sri < arr.length; sri++) {
              if (typeof arr[sri] === "string" && validArr.indexOf(arr[sri]) === -1) {
                validArr.push(arr[sri]);
              }
            }
          } else {
            // data-sights.js загружен — полная валидация по SIGHTS
            var sights = SIGHTS[ckey];
            if (sights) {
              for (var si = 0; si < arr.length; si++) {
                if (typeof arr[si] !== "string") continue;
                if (validArr.indexOf(arr[si]) !== -1) continue;
                for (var sf = 0; sf < sights.length; sf++) {
                  if (sights[sf].id === arr[si]) { validArr.push(arr[si]); break; }
                }
              }
            }
          }
          if (validArr.length > 0) {
            validChecks[ckey] = validArr;
          }
        }
        state.checkedSights = validChecks;
      } else {
        state.checkedSights = {};
      }
      // milestones
      if (Array.isArray(saved.milestones)) {
        var validMilestones = [];
        var dateRe2 = /^\d{4}-\d{2}-\d{2}$/;
        for (var mi = 0; mi < saved.milestones.length; mi++) {
          var ms = saved.milestones[mi];
          if (!ms || typeof ms !== "object") continue;
          if (typeof ms.cityId !== "string") continue;
          // Проверка существования города (for-цикл)
          var msCityExists = false;
          for (var mf = 0; mf < CITIES.length; mf++) {
            if (CITIES[mf].id === ms.cityId) { msCityExists = true; break; }
          }
          if (!msCityExists) continue;
          if (typeof ms.date !== "string" || !dateRe2.test(ms.date)) continue;
          if (ms.tier !== "silver" && ms.tier !== "gold") continue;
          // Дедупликация: пропустить если milestone с теми же cityId+tier уже добавлен
          var msDup = false;
          for (var md = 0; md < validMilestones.length; md++) {
            if (validMilestones[md].cityId === ms.cityId && validMilestones[md].tier === ms.tier) {
              msDup = true;
              break;
            }
          }
          if (msDup) continue;
          validMilestones.push({ cityId: ms.cityId, date: ms.date, tier: ms.tier });
        }
        state.milestones = validMilestones;
      } else {
        state.milestones = [];
      }
```

#### 3.3. `loadState()` — заменить инвариант «visited wins» на «Gold not planned»

**УДАЛИТЬ** текущий блок очистки «visited wins over planned». Найти его по содержимому — начинается с `var visitedKeys = Object.keys(state.visitedCities);` и заканчивается закрывающей `}` цикла `for`:
```javascript
      // УДАЛИТЬ ЭТОТ БЛОК ЦЕЛИКОМ:
      var visitedKeys = Object.keys(state.visitedCities);
      for (var m = 0; m < visitedKeys.length; m++) {
        if (state.plannedCities[visitedKeys[m]]) {
          delete state.plannedCities[visitedKeys[m]];
        }
      }
```

**ВМЕСТО НЕГО** добавить новую очистку: Gold-города не могут быть в plannedCities (прокачивать больше нечего):
```javascript
      // v3-инвариант: Gold-города не могут быть в plannedCities
      // ПОРЯДОК ВАЖЕН: этот блок идёт ПОСЛЕ загрузки checkedSights,
      // т.к. getCityTier() → getCheckedCount() читает state.checkedSights
      // Object.keys() создаёт снапшот — безопасно удалять из исходного объекта
      var goldCheckIds = Object.keys(state.plannedCities);
      for (var gi = 0; gi < goldCheckIds.length; gi++) {
        if (getCityTier(goldCheckIds[gi]) === "gold") {
          delete state.plannedCities[goldCheckIds[gi]];
        }
      }
```

> **⚠️ Устойчивость к отсутствию `SIGHTS`:** Если `data-sights.js` не загрузился (сбой сети, ошибка в путях, кривой кэш SW), `typeof SIGHTS === "undefined"`. В этом случае:
> - **checkedSights** — данные **сохраняются как есть** (валидация только на тип string + уникальность). Прогресс Silver/Gold НЕ стирается при оффлайн-запуске. См. код в разделе 3.2.
> - **getSightsCount()** вернёт `0`, **getCityTier()** вернёт `"bronze"` для любого посещённого города — Gold-инвариант не сработает, никто не удалится из plannedCities.
> - **Итог:** приложение не падает, данные не теряются, геймификация временно показывает только Бронзу. При следующей загрузке с сетью — полное восстановление.

> **⚠️ Расположение функций:** `getCityTier()` вызывается в этом блоке, поэтому функция должна быть определена **до** `loadState()` в коде. Размести новые функции (разделы 4–5) **до** функции `loadState()`. См. «Рекомендуемый порядок выполнения» в начале документа.

#### 3.4. `loadState()` — обновить catch-блок

В catch-блоке `loadState()` (блок `} catch (e) { state = { ... }; }`), добавить новые поля в дефолтный state:

> **⚠️ Полная структура:** Не пиши catch-блок с нуля. Открой текущий catch-блок в app.js, добавь в него `checkedSights: {}` и `milestones: []`, **полностью сохранив все остальные поля** из v2 (`currentTab`, `travelerName`, `onboardingComplete`, `visitedCities`, `plannedCities`, `cityNotes`, `openedRegions`). Ни одно поле не должно пропасть.

```javascript
  } catch (e) {
    state = {
      currentTab: "passport",
      travelerName: "Белорусский путешественник",
      onboardingComplete: false,
      visitedCities: {},
      plannedCities: {},
      cityNotes: {},
      checkedSights: {},         // ← НОВОЕ
      milestones: [],            // ← НОВОЕ
      openedRegions: [],
    };
  }
```

#### 3.5. Обновить `saveState()`

В функции `saveState()`, в объекте `toSave` (начинается с `var toSave = {`), добавить новые поля:
```javascript
    var toSave = {
      currentTab: state.currentTab,
      travelerName: state.travelerName,
      onboardingComplete: state.onboardingComplete,
      visitedCities: state.visitedCities,
      plannedCities: state.plannedCities,
      cityNotes: state.cityNotes,
      checkedSights: state.checkedSights,     // ← НОВОЕ
      milestones: state.milestones,           // ← НОВОЕ
    };
```

> **⚠️ Не трогай логику сериализации:** `JSON.stringify(toSave)` в v2 вызывается сразу же после построения объекта `toSave` — это безопасно, ссылки не «протухают». Просто добавь два новых поля и не удаляй/не меняй существующую логику (`try...catch`, `localStorage.setItem`, `showToast`).

#### 3.6. Проверить путь инициализации для нового пользователя

> **⚠️ КРИТИЧНО:** Убедись, что для **нового пользователя** (пустой `localStorage`, `raw === null`) поля `checkedSights` и `milestones` инициализированы значениями по умолчанию.
>
> В v2 нет отдельной функции `initLocalStorage()` — при пустом хранилище блок `if (raw)` в `loadState()` пропускается, и `state` сохраняет значения из объявления (строки 460–470). Поскольку в разделе 3.1 ты добавил `checkedSights: {}` и `milestones: []` в объявление `state`, новый пользователь уже покрыт. Но **обязательно проверь**: поищи в app.js другие места, где `state` может сбрасываться или пересоздаваться (например, при выходе из онбординга, кнопке «сбросить данные», и т.д.). Если найдёшь — добавь туда новые поля тоже.

---

### 4. `app.js` — хелперы и функции ранжирования

Разместить эти функции **до** функции `loadState()` в коде. Рекомендуемое место — сразу после константы `STORAGE_KEY` (строка ~458, до функции `loadState`). Все новые функции этапа 1 (разделы 4–5) должны идти подряд в одном блоке.

> **⚠️ ES5-совместимость:** Кодовая база v2 уже использует `CITIES.find()` (строка 494) и `.filter()` (в `saveState` и др.). Несмотря на это, **весь новый код этого этапа** (валидация, хелперы, milestone-функции) пиши через классические циклы `for`, а не через `.find()`, `.some()`, `.filter()`. Это снижает риск отказа в старых Android WebView, где эти ES5/ES6 array methods могут не поддерживаться. Для перебора `CITIES` по id используй паттерн `getCityById()` (раздел 4.1).

#### 4.1. `getCityById(cityId)`

Lookup города по id из массива CITIES:
```javascript
function getCityById(cityId) {
  for (var i = 0; i < CITIES.length; i++) {
    if (CITIES[i].id === cityId) return CITIES[i];
  }
  return null;
}
```

#### 4.2. `getSightsCount(cityId)`

Общее количество пунктов чек-листа:
```javascript
function getSightsCount(cityId) {
  if (typeof SIGHTS === "undefined") return 0;
  var sights = SIGHTS[cityId];
  return (sights && sights.length > 0) ? sights.length : 0;
}
```

#### 4.3. `hasChecklist(cityId)`

Есть ли чек-лист у города:
```javascript
function hasChecklist(cityId) {
  return getSightsCount(cityId) > 0;
}
```

#### 4.4. `getCheckedCount(cityId)`

Количество отмеченных пунктов:
```javascript
function getCheckedCount(cityId) {
  if (!state.checkedSights) return 0;
  var checked = state.checkedSights[cityId];
  return (checked && Array.isArray(checked)) ? checked.length : 0;
}
```

#### 4.5. `getCityTier(cityId)`

Вычисление ранга города (computed, не хранится в state):
```javascript
function getCityTier(cityId) {
  if (!state.visitedCities[cityId]) return null;        // не посещён
  var sightsCount = getSightsCount(cityId);
  if (sightsCount === 0) return "bronze";                // нет чек-листа → только бронза
  var checkedCount = getCheckedCount(cityId);
  var ratio = checkedCount / sightsCount;
  if (ratio >= 1.0) return "gold";
  if (ratio >= 0.5) return "silver";
  return "bronze";
}
```

> **⚠️ ДОСКОРОЧНЫЙ ВЫХОД КРИТИЧЕН:** Строка `if (sightsCount === 0) return "bronze";` защищает от деления на ноль. Без неё `checkedCount / 0` даст `Infinity`, и `Infinity >= 1.0` → `true` → город ошибочно получит `"gold"`. **Копируй эту функцию один в один.** Не объединяй проверки, не переставляй строки, не «оптимизируй».

#### 4.6. `getTierLabel(tier)` и `getTierEmoji(tier)`

```javascript
function getTierLabel(tier) {
  if (tier === "gold") return "Золото";
  if (tier === "silver") return "Серебро";
  if (tier === "bronze") return "Бронза";
  return "";
}

function getTierEmoji(tier) {
  if (tier === "gold") return "🥇";
  if (tier === "silver") return "🥈";
  if (tier === "bronze") return "🥉";
  return "";
}
```

---

### 5. `app.js` — управление milestone'ами

> **⚠️ Размещение:** Эти функции размести **СТРОГО выше** функции `loadState()`, в том же блоке, что и хелперы ранжирования (раздел 4) — сразу после `STORAGE_KEY`. Не разбрасывай их по файлу. Все новые функции этапа 1 должны быть в одном месте.

#### 5.1. `addMilestone(cityId, tier)`

Идемпотентное добавление milestone (не дублирует существующий):
```javascript
function addMilestone(cityId, tier) {
  // for-цикл вместо .some() для ES5-безопасности
  var exists = false;
  for (var i = 0; i < state.milestones.length; i++) {
    if (state.milestones[i].cityId === cityId && state.milestones[i].tier === tier) {
      exists = true;
      break;
    }
  }
  if (!exists) {
    state.milestones.push({ cityId: cityId, date: getTodayLocal(), tier: tier });
  }
}
```

⚠️ **Зависимость:** `getTodayLocal()` уже существует в кодовой базе (строки 615–617), возвращает дату в формате `YYYY-MM-DD`. Эта функция определена **после** `loadState()`, но поскольку `addMilestone` вызывается только во время работы приложения (не при загрузке), вызов `getTodayLocal()` отработает корректно — функция уже определена к моменту вызова.

#### 5.2. `removeMilestone(cityId, tier)`

Удаление конкретного milestone (по cityId + tier):
```javascript
function removeMilestone(cityId, tier) {
  var filtered = [];
  for (var i = 0; i < state.milestones.length; i++) {
    var m = state.milestones[i];
    if (!(m.cityId === cityId && m.tier === tier)) {
      filtered.push(m);
    }
  }
  state.milestones = filtered;
}
```

#### 5.3. `removeAllMilestones(cityId)`

Удаление всех milestone'ов города (используется при `removeVisit`):
```javascript
function removeAllMilestones(cityId) {
  var filtered = [];
  for (var i = 0; i < state.milestones.length; i++) {
    if (state.milestones[i].cityId !== cityId) {
      filtered.push(state.milestones[i]);
    }
  }
  state.milestones = filtered;
}
```

---

### 6. `app.js` — валидация checkedSights при загрузке: очистка для непосещённых

После загрузки всех данных и применения инвариантов, перед концом `try`-блока в `loadState()`. Найти место по содержимому: **до блока `needsFix`** (начинается с `var needsFix =`), добавить очистку `checkedSights` для непосещённых городов:

> **Порядок:** этот блок идёт **ПОСЛЕ** Gold-инварианта (раздел 3.3), т.к. `getCityTier()` в инварианте может читать `checkedSights` для вычисления Gold-статуса. Сначала Gold-проверка, потом очистка.

```javascript
      // checkedSights имеет смысл только для посещённых городов
      var checkedIds = Object.keys(state.checkedSights);
      for (var cui = 0; cui < checkedIds.length; cui++) {
        if (!state.visitedCities[checkedIds[cui]]) {
          delete state.checkedSights[checkedIds[cui]];
        }
      }
      // milestones имеют смысл только для посещённых городов
      var validMs = [];
      for (var vmi = 0; vmi < state.milestones.length; vmi++) {
        if (state.visitedCities[state.milestones[vmi].cityId]) {
          validMs.push(state.milestones[vmi]);
        }
      }
      state.milestones = validMs;
```

Это страховка: если данные повреждены и есть checkedSights или milestones для непосещённого города — удалить. Milestones требуют отдельной очистки, т.к. валидация в разделе 3.2 проверяет только существование cityId в CITIES, но не его наличие в `visitedCities`.

---

## Критерии готовности

После выполнения всех задач проверь:

1. **Нет JS-ошибок в консоли** — приложение загружается и работает как v2
2. **`data-sights.js` загружается** — открыть консоль, ввести `SIGHTS` → объект с 15 городами. Ввести `SIGHTS["minsk"].length` → `4`
3. **`index.html`** — `data-sights.js` подключён перед `app.js` (DevTools → Sources → порядок скриптов)
4. **Миграция v2 → v3:**
   - Открыть DevTools → Application → Local Storage → `travelerPassport`
   - Значение должно содержать `"checkedSights": {}` и `"milestones": []`
   - Существующие `visitedCities`, `plannedCities`, `cityNotes` сохранены без изменений
5. **Инвариант «visited wins» удалён:**
   - Вручную записать в localStorage город одновременно в `visitedCities` и `plannedCities`
   - Перезагрузить → город остаётся в обоих объектах (не удаляется из planned)
6. **Gold-инвариант работает (когда появится функция getCityTier):**
   - Пока ни один город не может быть Gold (нет UI для отметки чек-листов — это Этап 2)
   - Можно проверить вручную: вписать в `checkedSights` все 4 пункта для Минска → перезагрузить → Минск удаляется из `plannedCities` если был там
7. **Функции работают** — в консоли:
   - `getCityTier("minsk")` → `"bronze"` (если Минск посещён) или `null` (если нет)
   - `getCityById("minsk")` → объект города
   - `getSightsCount("minsk")` → `4`
   - `getSightsCount("slutsk")` → `0` (нет в SIGHTS)
   - `hasChecklist("minsk")` → `true`
   - `hasChecklist("slutsk")` → `false`
8. **Все вкладки работают** как в v2 — Паспорт, Карта, Профиль без визуальных изменений
9. **ES5-конвенция соблюдена** — в DevTools поищи в app.js `for (let` или `for (const` внутри новых функций. Не должно быть ни одного совпадения. Все внутренние переменные — `var`
10. **`getCityTier` скопирован дословно** — досрочный выход `if (sightsCount === 0) return "bronze";` на месте. Проверка: `getCityTier("slutsk")` для посещённого Слуцка (нет в SIGHTS) должен вернуть `"bronze"`, не `"gold"`
11. **Оффлайн-сохранность данных** — вручную записать в localStorage `checkedSights: {"minsk": ["s0","s1","s2","s3"]}` → закомментировать `<script src="data-sights.js">` в index.html → перезагрузить → проверить: `state.checkedSights` сохранил данные Минска (не пустой). Раскомментировать скрипт обратно

---

## Важно — НЕ модифицировать

- **НЕ изменяй** массивы `CITIES` и `REGIONS`
- **НЕ изменяй** `renderCityCard()`, `renderPassport()`, `renderProfile()`, `renderStampOverlay()` — визуальные изменения в этапах 2–5
- **НЕ изменяй** функции карты (`initMapPoints`, `updateMapMarkers`, `updateMapFilter`, zoom) — это этап 3
- **НЕ изменяй** `createStampSVG()` — это этап 4
- **НЕ изменяй** `confirmVisit()`, `removeVisit()`, `togglePlanned()` — они обновляются в этапах 2–3
- **НЕ добавляй** UI чек-листов, бейджей рангов, обложек — это этап 2
- **НЕ обновляй** `sw.js` — это этап 6
- Этот этап — **только фундамент**: данные + функции. Приложение после этапа 1 выглядит и работает как v2, но с готовой инфраструктурой рангов