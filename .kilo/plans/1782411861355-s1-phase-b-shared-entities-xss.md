# S1 · Phase B — Чистые слои `shared` + `entities` + XSS-аудит

> **Документ-основа:** `roadmap.md` § «Phase B» (строки 114–143) + `app-description_v3.md` § 6.11 (модель состояния) + предыдущая фаза `.kilo/plans/1782411861355-s1-phase-a-vitest-vite-esm.md`.
> **Состояние кодовой базы на начало фазы:** Phase A завершён и сверен. `src/lib/*` (6 файлов: tier, chronicle, dom, storage, milestones, dates), `src/cities.js` (147 строк), `src/data-sights.js` (82 строки, уже `export const SIGHTS`), `src/app/main.js` (1795 строк, монолит DOM-логики), `tests/{chronicle,dom,invariants,smoke,storage,tier}.test.js` + `setup.js` зелёные, Vite+Vitest+jsdom настроены. Алиасы `@app/@widgets/@features/@entities/@shared` объявлены в `vite.config.js` (но не используются). `public/sw.js` = `traveler-passport-v4` (runtime-популяция). Smoke-чеклист пп. 1–11 пройден.
> **Результат фазы:** каноническая FSD-структура `shared/` + `entities/` для нижних слоёв, XSS-аудит завершён (через grep-инструмент + точечные DOM-тесты), поведение приложения идентично v3. Распил features/widgets/store — следующие фазы.

---

## 0. Главное архитектурное решение

**Все нижние слои переезжают в каноническую структуру, но только то, что им принадлежит:**

| Категория | Куда | Когда |
|---|---|---|
| Чистые данные и pure-функции, не зависящие от entities | `src/shared/` | Phase B (сейчас) |
| Доменные сущности (city, region, sight) | `src/entities/` | Phase B (сейчас) |
| Утилиты, привязанные к конкретному entities (storage, chronicle, milestones) | **остаются в `src/lib/`** | Phase C/D1/D2 |

**Три модуля НЕ переезжают в Phase B** (это зафиксированный долг):

| Файл | Куда переедет | В какой фазе |
|---|---|---|
| `src/lib/storage.js` | `src/app/store.js` (с `app/main.js` → скелет) | Phase C |
| `src/lib/chronicle.js` | `src/widgets/profile/chronicle.js` | Phase D2 |
| `src/lib/milestones.js` | `src/features/checklist/milestones.js` | Phase D1 |

Эти файлы **обновят свои импорты** (вместо `../cities.js` → `@entities/city`), но останутся в `src/lib/` до своей фазы. Phase B не трогает бизнес-логику и не переписывает её — только переезжает слои.

### 0.1. Правило направления импортов (источник истины для всей фазы)

```
shared      →  (ничего, только внутри shared между собой)
entities    →  shared  (НЕ entities → entities — это нарушение FSD)
lib         →  shared, entities  (временные, до C/D1/D2)
app/main    →  shared, entities, lib  (всё)
```

> **⚠️ Критично:** `entities/city` **НЕ импортирует** `entities/sight`. Это нарушение FSD (слои одного уровня не зависят друг от друга). Зависимость city→sight разрешается через **параметр `SIGHTS`**, как уже сделано в `src/lib/tier.js` после Phase A (`getCityTier(cityId, state, SIGHTS)`). Phase B сохраняет этот контракт. `SIGHTS` прокидывается из `main.js` в вызовы `getCityTier`/`getSightsCount`/`hasChecklist`.

---

## 1. Структура файлов — до и после

### До начала фазы
```
src/
├── app/
│   └── main.js               (1795 строк)
├── cities.js                 (147 строк: REGIONS, REGION_ICONS, MAP, CITIES, helpers)
├── data-sights.js            (82 строки: export const SIGHTS — уже ESM)
└── lib/
    ├── tier.js               (41 строка)
    ├── chronicle.js          (57 строк, экспортирует formatDateDisplay + generateChronicle)
    ├── dom.js                (5 строк: только escapeHtml)
    ├── storage.js            (213 строк)
    ├── milestones.js         (36 строк)
    └── dates.js              (3 строки: только getTodayLocal)
```

### После завершения фазы
```
src/
├── app/
│   └── main.js               (~1765 строк — −30 после извлечения showToast/normalizeForSearch/getPluralSights; см. §4.4, §13)
├── shared/
│   ├── config/
│   │   └── map-config.js     (MAP, projectToSVG)
│   └── lib/
│       ├── dom.js            (escapeHtml, qs, qsa, showToast)
│       ├── format.js         (formatDateDisplay, getTodayLocal, normalizeForSearch, getPluralSights)
│       └── store-mechanism.js  (createStore — generic, без знания домена; используется в Phase C)
├── entities/
│   ├── city/
│   │   └── index.js          (CITIES, getCityById, getCityTier, getTierLabel, getTierEmoji, getSightsCount, hasChecklist, getCheckedCount)
│   ├── region/
│   │   └── index.js          (REGIONS, REGION_ICONS, createStampSVG, computeStarPoints)
│   └── sight/
│       └── index.js          (SIGHTS)
└── lib/                      (TEMPORARY — Phase C/D1/D2 очистят эту папку)
    ├── storage.js            (импорты обновлены, в остальном as-is)
    ├── chronicle.js          (импорты обновлены; formatDateDisplay — см. §2.6)
    └── milestones.js         (импорты обновлены, в остальном as-is)
```

`tests/` реорганизуется параллельно (см. § 5).
`tools/` — две новые утилиты (см. § 6).

---

## 2. Карта переездов (детальная)

### 2.1. `src/cities.js` → 3 файла

#### `src/entities/city/index.js`
- `CITIES` (массив 57 объектов)
- `getCityById(cityId)`
- `getCityTier(cityId, state, SIGHTS)` — переезд из `src/lib/tier.js` (сигнатура сохраняется, `SIGHTS` параметром)
- `getTierLabel(tier)`
- `getTierEmoji(tier)`
- `getSightsCount(cityId, SIGHTS)`
- `hasChecklist(cityId, SIGHTS)`
- `getCheckedCount(cityId, state)`

**Импорты: НЕТ.** В частности, **НЕ `import { SIGHTS } from '@entities/sight'`** — это нарушило бы правило §0.1 (entities ↛ entities). Все эти функции принимают `SIGHTS` параметром (контракт уже соблюдён в `src/lib/tier.js`).

**Порядок определений:** `getSightsCount` → `hasChecklist` → `getCheckedCount` → `getCityTier` (последняя вызывает первые три). Сохранить комментарии ординалов из `src/lib/tier.js` про удаление ветви `typeof SIGHTS`.

#### `src/entities/region/index.js`
- `REGIONS`
- `REGION_ICONS`
- `createStampSVG(regionId, tier)`
- `computeStarPoints(cx, cy, outerR)`

**Импортов нет** (pure-данные и pure-функции). `createStampSVG` обращается к `REGION_ICONS` (тот же модуль).

#### `src/shared/config/map-config.js`
- `MAP` (viewBoxX/Y/W/H, geoN/S/W/E)
- `projectToSVG(lat, lon)`

**Импортов нет.**

### 2.2. `src/data-sights.js` → `src/entities/sight/index.js`

Файл уже `export const SIGHTS = {...}` (Phase A). Действия: скопировать содержимое 1:1 в новое место, удалить старый TODO-комментарий `// TODO(phase-b): переезд в src/entities/sight/...` (переезд выполнен в этой фазе — TODO неактуален). Не добавлять TODO про `covers/` — обложки городов относятся к карточке города (Phase D2), не к sight-сущности. Удалить старый файл.

### 2.3. `src/lib/dates.js` → `src/shared/lib/format.js`

`getTodayLocal` переезжает (3 строки, `toLocaleDateString("sv-SE")`). Дополнительно в этот же файл переносятся:
- `formatDateDisplay(dateStr)` — **переезд из `src/lib/chronicle.js`** (5 строк). В `chronicle.js` заменить на импорт из `@shared/lib/format` (см. §2.6 — без дублирования).
- `normalizeForSearch(str)` — **извлечение из `main.js:528`** (используется в main.js:571, 575)
- `getPluralSights(n)` — **извлечение из `main.js:1374`** (используется в main.js:1336)

**Импортов нет** (pure).

### 2.4. `src/lib/dom.js` → `src/shared/lib/dom.js` + 3 новые функции

| Функция | Откуда | Куда (в этом же файле) |
|---|---|---|
| `escapeHtml(str)` | `src/lib/dom.js` (5 строк, `createTextNode`+`innerHTML`) | `src/shared/lib/dom.js` (как есть) |
| `showToast(message)` | `src/app/main.js:445` (извлечение) | `src/shared/lib/dom.js` |
| `qs(selector, root?)` | NEW | `src/shared/lib/dom.js` |
| `qsa(selector, root?)` | NEW | `src/shared/lib/dom.js` |

**Контракт `qs`/`qsa`:**
```js
export function qs(selector, root = document) {
  return root.querySelector(selector);
}
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}
```

**`showToast`** — текущая реализация (`app.js:497–507`, после Phase A ≈ `main.js:445`):
```js
function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = "block";
  toast.classList.add("visible");
  setTimeout(function () {
    toast.style.display = "none";
    toast.classList.remove("visible");
  }, 2000);
}
```
Перенести as-is (сверено с `app.js:497–507` — строки `classList.add/remove("visible")` обязательны, без них ломается CSS-переход тоста). Параметр `message` принимает уже готовую строку (вызывающий код отвечает за `escapeHtml`, если строка содержит пользовательские данные).

### 2.5. `src/lib/tier.js` → слияние с `src/entities/city/index.js`

Все 7 функций переезжают в `src/entities/city/index.js` (см. §2.1). Файл `src/lib/tier.js` **удаляется**.

### 2.6. `src/lib/chronicle.js` (остаётся в `src/lib/`)

**Изменения:**
1. Импорт `getCityById`:
   ```diff
   -import { getCityById } from '../cities.js';
   +import { getCityById } from '@entities/city/index.js';
   ```
2. `formatDateDisplay` **удаляется из `chronicle.js` полностью** (без реэкспорта). Единственный источник — `@shared/lib/format.js`. `main.js` (§7.1) импортирует `formatDateDisplay` напрямую из `@shared/lib/format.js`, а не из `chronicle.js`. В `chronicle.js` остаётся только `generateChronicle`.
   - **Сверено с кодом (`app.js:1158–1203`):** `generateChronicle` НЕ вызывает `formatDateDisplay` — даты передаются как `entry.date` сырыми (`visit.date`, `m.date`), форматирование применяется только в рендере (Phase D2). Поэтому переезд `formatDateDisplay` и удаление из `chronicle.js` безопасно и не ломает хронику.
   - **TODO-комментарий** в `src/lib/chronicle.js`: `// TODO(phase-d2): переезд в widgets/profile/chronicle.js`.
   - ⚠️ **Связанный шаг в тестах (§5, шаг 7):** кейс `formatDateDisplay("2025-04-12")` удаляется из `tests/lib/chronicle.test.js` (иначе падение на `undefined import`) и переносится в `tests/shared/format.test.js` (§5.2).

> Сверено с кодом: `generateChronicle` в `src/lib/chronicle.js` НЕ вызывает `formatDateDisplay` (даты передаются как `entry.date` сырыми). Поэтому переезд `formatDateDisplay` в `shared/lib/format.js` и удаление из `chronicle.js` безопасно.

### 2.7. `src/lib/storage.js` (остаётся в `src/lib/`)

**Изменения импортов:**
```diff
-import { getCityTier } from './tier.js';
-import { getCityById, CITIES } from '../cities.js';
-import { SIGHTS } from '../data-sights.js';
+import { getCityTier, getCityById, CITIES } from '@entities/city/index.js';
+import { SIGHTS } from '@entities/sight/index.js';
```

> **Внимание:** `storage.js` — это `lib` (временный), и он импортирует из `entities`. Это допустимо (lib → entities разрешено, см. §0.1). Но `getCityTier` теперь в `entities/city`, а не в `lib/tier` — путь меняется.

Логика `loadState`/`saveState`/`getDefaultState`/`finalize` **не меняется**. **TODO-комментарий:** `// TODO(phase-c): переезд в src/app/store.js + createStore из @shared/lib/store-mechanism`.

### 2.8. `src/lib/milestones.js` (остаётся в `src/lib/`)

**Изменение импорта `getTodayLocal`:**
```diff
-import { getTodayLocal } from './dates.js';
+import { getTodayLocal } from '@shared/lib/format.js';
```

### 2.9. `src/lib/dates.js` — удаляется

После переезда `getTodayLocal` в `src/shared/lib/format.js` файл удаляется.

### 2.10. `src/lib/dom.js` — удаляется

После переезда `escapeHtml` в `src/shared/lib/dom.js` файл удаляется.

---

## 3. Новые модули

### 3.1. `src/shared/lib/store-mechanism.js`

Generic `createStore` — **создаётся в Phase B, используется в Phase C**. В Phase B не подключается в main.js, только пишется и покрывается тестами.

**Контракт:**
```js
/**
 * Создаёт реактивное хранилище состояния.
 * @param {Object} opts
 * @param {Object} opts.initialState   — начальное состояние
 * @param {Function} [opts.validate]   — (next, prev) => next | throws. Если throws — откат к prev + onError.
 *                                        ⚠️ КРИТИЧНО: validate ОБЯЗАН вернуть следующее состояние (то же next
 *                                        или трансформированную копию — напр. для применения инвариантов v3,
 *                                        которые мутируют state: удалить Gold из planned, добавить Silver).
 *                                        Валидатор «только бросает, при успехе возвращает undefined» НЕДОПУСТИМ —
 *                                        тогда state станет undefined → getState() вернёт undefined → краш.
 *                                        Гарантируется тестом #11 (§5.4).
 *                                        ⚠️ Внимание: validate вызывается ТОЛЬКО в setState, НЕ при начальной
 *                                        загрузке из persist (см. TODO ниже и §13).
 * @param {Object} [opts.persist]      — wrapper над хранилищем: { getItem(key): string|null, setItem(key, value): void, key: string }.
 *                                        ⚠️ persist ≠ localStorage: у localStorage есть метод key(n), который
 *                                        затеняет строковое поле key. Поэтому persist должен быть обёрткой
 *                                        { getItem: k => localStorage.getItem(k), setItem: (k,v) => localStorage.setItem(k,v), key: 'travelerPassport' }.
 * @param {Function} [opts.onError]    — (error, operation, payload) => void
 * @returns {{ getState, setState, subscribe }}
 *
 * Контракт setState(patch):
 *  - patch — объект: результат = { ...state, ...patch } (мёрдж).
 *  - patch — функция: она вызывается с текущим state и ДОЛЖНА ВЕРНУТЬ ПОЛНОЕ следующее состояние
 *    (НЕ патч-объект). Результат функции используется как next as-is, без повторного мёрджа.
 *    Пример: `store.setState(state => ({ ...state, count: state.count + 1 }))`.
 */
// TODO(phase-c): начальная загрузка из persist (JSON.parse) обходит validate. Для домена это
// неприемлемо — loadState Phase A делает полную валидацию (cityId, даты, дедуп, 4 инварианта).
// Phase C либо (а) валидирует состояние вручную ПОСЛЕ createStore (тогда persist-загрузку createStore
// отключить/игнорировать), либо (б) дорабатывает createStore: validate(next, initialState) при загрузке.
// ⚠️ ВАЖНО для Phase C: `persist` НЕ равно `localStorage`.
// persist — это wrapper-объект с ПЯМЯ строковым полем `key` + методами getItem/setItem:
//   { getItem: k => localStorage.getItem(k),
//     setItem: (k, v) => localStorage.setItem(k, v),
//     key: 'travelerPassport' }
// Передать `localStorage` напрямую — нельзя: у него есть метод key(n), который затенит
// строковое поле key (persist.key станет функцией).
export function createStore({ initialState, validate, persist, onError }) {
  let state = initialState;
  const subscribers = new Set();

  if (persist && persist.key) {
    try {
      const raw = persist.getItem(persist.key);
      if (raw) state = JSON.parse(raw);
    } catch (e) {
      if (onError) onError(e, 'load', null);
    }
  }

  function getState() { return state; }

  function setState(patch) {
    const next = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
    let validated = next;
    if (validate) {
      try {
        validated = validate(next, state);
      } catch (e) {
        if (onError) onError(e, 'validate', next);
        return state; // откат
      }
    }
    state = validated;
    if (persist && persist.key) {
      try { persist.setItem(persist.key, JSON.stringify(state)); }
      catch (e) { if (onError) onError(e, 'persist', state); }
    }
    subscribers.forEach(fn => fn(state));
  }

  function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  return { getState, setState, subscribe };
}
```

**Почему generic, без знания домена:** не знает про `visitedCities`, `milestones`, инварианты v3. Phase C оборачивает его в `app/store.js` и добавляет доменную валидацию + loadState/saveState логику.

### 3.2. Тесты для `store-mechanism`

`tests/shared/store-mechanism.test.js` — 11 кейсов (см. §5.4).

---

## 4. Извлечения из `src/app/main.js`

> **Источник истины — реальный `app.js` (после Phase A — `src/app/main.js`), НЕ инлайн-сниппеты этого плана.** Приведённые ниже блоки кода — справочные; агент обязан сверить их с фактическим кодом и копировать дословно. Любое «упрощение/улучшение» в переносимых функциях = отклонение от поведения v3. Если сниппет и код расходятся — воспроизводить код и сообщить о расхождении.

### 4.1. `showToast(message)` (app.js:497–507, после Phase A ≈ main.js:445)

См. §2.4. Перенести as-is, без изменений.

### 4.2. `normalizeForSearch(str)` (app.js:910–918, после Phase A ≈ main.js:528)

```js
function normalizeForSearch(str) {
  return str
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/і/g, "и")
    .replace(/ў/g, "в")
    .replace(/[-\s]/g, "")
    .trim();
}
```
Перенести в `src/shared/lib/format.js` as-is (сверено с `app.js:910–918`). **Внимание:** оригинал НЕ имеет null-гарда `String(str||"")`, НЕ срезает em/en dash `—–` (regex ровно `[-\s]`) и заканчивается `.trim()`. Любое «улучшение» здесь = отклонение от поведения v3.

### 4.3. `getPluralSights(n)` (app.js:1811–1817, после Phase A ≈ main.js:1374)

```js
function getPluralSights(n) {
  var mod10 = n % 10;
  var mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "достопримечательность";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "достопримечательности";
  return "достопримечательностей";
}
```
Перенести в `src/shared/lib/format.js` as-is (сверено с `app.js:1811–1817`). Результаты совпадают с упрощённой версией для всех целых `n`, но копируется именно оригинальная условная структура — инвариант фазы «поведение 1:1» и воспроизводимость кода.

### 4.4. Удаление дублей из main.js

После переноса удалить локальные определения `showToast`, `normalizeForSearch`, `getPluralSights` из main.js. Заменить на импорт (см. §7.1). Ожидаемое уменьшение main.js: ~30 строк.

---

## 5. Тесты — реорганизация и новые

### 5.1. Переезд существующих тестов

Текущая структура (после Phase A):
```
tests/
├── chronicle.test.js     (импорт из src/lib/chronicle.js)
├── dom.test.js           (импорт из src/lib/dom.js)
├── invariants.test.js    (импорт из src/lib/storage.js)
├── smoke.test.js         (проверка экспортов Phase A)
├── storage.test.js       (импорт из src/lib/storage.js)
├── tier.test.js          (импорт из src/lib/tier.js)
└── setup.js
```

После Phase B:
```
tests/
├── setup.js
├── shared/
│   ├── format.test.js              ← НОВЫЙ (formatDateDisplay, getTodayLocal, normalizeForSearch, getPluralSights)
│   ├── dom.test.js                 ← ПЕРЕЕЗД из tests/dom.test.js + дополнение (qs, qsa, showToast)
│   └── store-mechanism.test.js     ← НОВЫЙ (createStore — 10 кейсов)
├── entities/
│   ├── city-tier.test.js           ← ПЕРЕЕЗД из tests/tier.test.js (импорт @entities/city)
│   ├── city-data.test.js           ← НОВЫЙ (CITIES.length=57, структура, getCityById)
│   └── region.test.js              ← НОВЫЙ (createStampSVG, computeStarPoints, REGIONS)
├── lib/                            ← TEMPORARY (тесты на временные модули)
│   ├── storage-roundtrip.test.js  ← ПЕРЕЕЗД из tests/storage.test.js
│   ├── invariants.test.js          ← ПЕРЕЕЗД из tests/invariants.test.js (импорт обновлён)
│   └── chronicle.test.js           ← ПЕРЕЕЗД из tests/chronicle.test.js (импорт @entities/city через транзит)
└── security/
    └── xss.test.js                 ← НОВЫЙ — см. §5.6 (стратегия уточнена)
```

`tests/smoke.test.js` (Phase A, проверка экспортов 5 файлов) — обновить под новые пути (`@entities/city` и т.д.) или удалить как избыточный (фактические тесты покрывают экспорты). Рекомендация: обновить и оставить как smoke на структуру.

### 5.2. Тесты для `src/shared/lib/format.js`

`tests/shared/format.test.js` (17 кейсов — см. план Phase A §3.7 + дополнения): formatDateDisplay (2), getTodayLocal regex (1), normalizeForSearch (6: Минск/Мінск/Нёсвіж/Віцебск/UpperCase/А-Б-Г), getPluralSights (7: 1/2/5/11/21/22/111).

> **⚠️ normalizeForSearch и null — НЕ добавлять кейс `null` как «нормализованный результат».** Сверено с `app.js:910–918`: функция **не имеет null-гарда** и бросает `TypeError` на `null`/`undefined` (`Cannot read properties of null (reading 'toLowerCase')`). Поведение 1:1 = бросает. Negative-кейс (опционально) оформлять как `expect(() => normalizeForSearch(null)).toThrow()`, **и НЕ добавлять guard в реализацию** (guard = поведение-отклонение, не входит в Phase B). В реальном коде функция вызывается только на строках (`city.name`, `region.name`, значение `<input>`), поэтому `null` не передаётся — список кейсов выше намеренно НЕ содержит `null`.

### 5.3. Тесты для `src/shared/lib/dom.js`

`tests/shared/dom.test.js` — расширение существующего:
- escapeHtml (9 кейсов — из Phase A: `<script>`, `&`, `<`, `>`, `"`, `'`, null, undefined, кириллица ё/і/ў)
- qs: `qs("#nonexistent")` → null; `qs("#toast")` с заглушкой в DOM → элемент
- qsa: `qsa(".tab-content")` → массив
- showToast: `vi.useFakeTimers()`, вызов устанавливает textContent + `display:block` + `classList.contains("visible")`; `advanceTimersByTime(2000)` → `display:none` + `classList` без `"visible"`

### 5.4. Тесты для `src/shared/lib/store-mechanism.js`

`tests/shared/store-mechanism.test.js` — 11 кейсов:
1. `getState()` возвращает `initialState`
2. `setState(patch-obj)` сливает патч и отражается в `getState()`
3. `setState(fn)` вызывает функцию с текущим state и принимает результат
4. `subscribe(fn)` вызывается после каждого `setState`
5. `subscribe` возвращает функцию отписки; после вызова — не вызывается
6. Несколько подписчиков — все получают обновление
7. `validate` бросает → state не меняется, `onError('validate', ...)` вызван
8. `persist.getItem` есть → начальное состояние загружается оттуда
9. `persist.setItem` вызывается после `setState`
10. `persist.setItem` бросает → `onError('persist', ...)` вызван, state всё равно обновлён
11. **`validate` возвращает трансформированное состояние** — `validate: (next) => ({ ...next, flagged: true })` → `getState()` отражает трансформацию (state НЕ undefined). Защита от валидатора «только бросает»: если validate вернёт `undefined` → тест упадёт, т.к. getState() должен вернуть объект. Дополнительно: `validate`, возвращающий `next` без изменений → state = next (тождество).

### 5.5. Тесты для entities

`tests/entities/city-tier.test.js` (переезд из `tests/tier.test.js`): импорт `@entities/city/index.js`; кейсы те же (4 ранга + label/emoji). `SIGHTS` импортируется из `@entities/sight` и передаётся параметром.

`tests/entities/city-data.test.js` (новый): `CITIES.length === 57`; каждый город имеет `id, name, region, lat, lon, description`; каждый `region` существует в `REGIONS`; `getCityById("minsk")` корректен; `getCityById("nonexistent")` → null.

`tests/entities/region.test.js` (новый, 10 кейсов): `createStampSVG("minsk","bronze")` содержит `<svg>` + иконку, без ring; `"silver"` → `<circle ... #C0C0C0>`; `"gold"` → `<circle ... #FFD700>` + `<g color="#FFD700">`; дефолт = bronze; невалидный tier → fallback bronze; несуществующий регион — валидный SVG без иконки; `computeStarPoints(50,50,10)` → строка из 10 пар через пробел (split → длина 10); `REGIONS.length === 7`; `REGIONS.find(r=>r.id==="minsk")` корректен.

### 5.6. XSS-аудит — стратегия (уточнена)

**Проблема тестируемости:** целевые render-функции (`renderProfile`, `renderCityCard`, `buildSearchResults`) находятся в `src/app/main.js` и **не экспортируются**. Загрузка всего `main.js` в jsdom невозможна без полного DOM-монтажа (файл на верхнем уровне объявляет `var mapPointsInitialized` и регистрирует обработчики `DOMContentLoaded`). Поэтому «DOM-рендер XSS-тесты» на текущем main.js требуют либо распила (Phase D2), либо временного экспорта.

**Принятая стратегия Phase B (двухуровневая):**

**Уровень 1 — основной: `tools/check-xss.mjs` (§6.1).** Grep-сканер по `src/app/main.js`, ищущий `html += ... + <var>` и `innerHTML = ... + <var>`, где `<var>` НЕ обёрнут в `escapeHtml(...)` и НЕ в белом списке контролируемых констант (`region.id`, `city.id`, `regionColor`, `tier`, статические строки). Это формализованный XSS-аудит — его проходят/не проходят, regression-guard. **Это и есть «XSS-аудит фазы» в редакции roadmap §Phase B** («Пройти по всем html += / innerHTML интерполяциям, убедиться что ВСЕ проходят escapeHtml»).

**Уровень 2 — опциональный, точечные DOM-тесты в `tests/security/xss.test.js`.** Допускаются два подхода (агент выбирает по фактической тестируемости):

- **(a) Временный экспорт render-функций из `main.js`** с TODO-комментарием `// TODO(phase-d2): убрать экспорт при распиле widgets`:
  ```js
  // В main.js:
  // TODO(phase-d2): убрать экспорт — временно для Phase B XSS-тестов
  export { renderProfile, renderCityCard, buildSearchResults };
  ```
  Тогда `xss.test.js` импортирует их, монтирует минимальный jsdom-HTML и проверяет отсутствие `onerror`/`<script>` в innerHTML.

- **(b) Если (a) слишком инвазивно** (требует правок main.js, риск регрессии) — ограничить `xss.test.js` проверкой **самой функции `escapeHtml`** на расширенные векторы (более полные, чем `tests/shared/dom.test.js`): `<img src=x onerror=alert(1)>`, вложенные `<svg><script>`, unicode-обход, и т.п. DOM-рендер XSS-тесты переносятся в **Phase D2** (когда render-функции переедут в `widgets/` и будут экспортироваться штатно).

**Рекомендация:** начать с (a) — это даёт реальную защиту на уровне фазы; если экспорт ломает что-то (Vite-tree-shaking, circular import) — откатиться к (b) и явно записать в отчёте «DOM-рендер XSS → Phase D2».

**Кейсы `tests/security/xss.test.js` (при подходе a):**

| # | Вектор | Тест |
|---|---|---|
| 1 | travelerName в профиле | `state.travelerName = "<img src=x onerror=alert(1)>"` → `renderProfile()` → `#tab-profile` innerHTML не содержит `onerror` |
| 2 | city.name в city-card | город CITIES с подменённым `name` (мок) → `renderCityCard` → экранировано |
| 3 | city.description в city-card | то же для `description` |
| 4 | chronicle entries | `state.milestones + visitedCities` с payload → `renderProfile` → хроника экранирована |
| 5 | city.name в search-results | `buildSearchResults` с подмонтированным DOM → экранировано |

> **Убрано (от исходного плана):** тест «cityNotes в textarea.value» — `.value` имеет textContent-семантику, XSS через него невозможен (браузер не парсит HTML внутри `<textarea>`), тест тривиален и неинформативен. Тест «regionName в city-card» — `region.name` берётся из статичного `REGIONS`, не пользовательский ввод; покрывается grep-инструментом (белый список или проверка).

**Паттерн теста (подход a):**
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { renderProfile } from '../../src/app/main.js';
import { CITIES } from '../../src/entities/city/index.js';
import { SIGHTS } from '../../src/entities/sight/index.js';

let state;

beforeEach(() => {
  document.body.innerHTML = `<div id="tab-profile"></div>` + /* минимальный набор узлов, к которым обращается renderProfile */;
  state = { /* минимальный валидный state */ };
  // renderProfile читает глобальный state из main.js — см. примечание ниже
});

it('travelerName XSS', () => {
  // state в main.js — let, не экспортируется. Нужен доступ.
  // Вариант: main.js экспортирует getState()/setState() для тестов (TODO phase-d2 убрать),
  // ЛИБО renderProfile принимает state параметром (тогда это правка сигнатуры — см. §5.6-примечание).
  ...
  expect(html).not.toContain('onerror');
});
```

> **⚠️ Проблема `state` в main.js:** `renderProfile` читает глобальный `let state` замыкания, не параметр. Для теста нужно либо экспортировать getter/setter, либо сделать `renderProfile(state)` — но последнее правит сигнатуру (риск). **Решение:** если выбран подход (a), экспортировать также `__setTestState` хелпер (TODO phase-d2), либо принять, что XSS-тесты на render требуют рефакторинга сигнатуры и поэтому переносятся в Phase D2 (подход b). Агенту: если `renderProfile` нельзя протестировать без правки сигнатуры — применить подход (b), DOM-рендер XSS → Phase D2, и явно отразить в отчёте.

---

## 6. Инструменты защиты от регрессий

### 6.1. `tools/check-xss.mjs` — ОСНОВНОЙ XSS-аудит фазы

Node-скрипт, сканирующий `src/app/main.js` на потенциально небезопасные интерполяции.

**Паттерны (эвристические):**
1. `html += ... + <var> + ...` где `<var>` НЕ `escapeHtml(...)` и НЕ статическая строка
2. `.innerHTML = ... + <var>` — то же
3. ``.innerHTML = `<template>${<var>}` `` — то же
4. `insertAdjacentHTML(...)` с интерполированным `<var>` — то же (сейчас в коде не используется, но паттерн заложен как regression-guard на будущее; roadmap §Phase B явно упоминает его)

**Логика:** находим все `html +=` блоки и проверяем, что каждый интерполированный идентификатор либо (а) обёрнут в `escapeHtml(...)`, либо (б) статическая строка в кавычках/бэктиках, либо (в) в **белом списке** контролируемых констант: `region.id`, `city.id`, `regionColor`, `tier`, `getTierLabel(...)`, `getTierEmoji(...)`, `createStampSVG(...)`, `computeStarPoints(...)`, `formatDateDisplay(...)`, `getPluralSights(...)`.

**Запуск:** `node tools/check-xss.mjs` — exit 0 при отсутствии проблем, 1 при находке.

> **Характер инструмента:** это **best-effort regression guard, а не полноценный статический анализатор**. Парсинг JS-кода регексами (`html += ... + <var>`, `innerHTML = ...`) принципиально неполон (многоформенность выражений, template literals, вложенные вызовы). Назначение скрипта — ловить *регрессии* (новую небезопасную интерполяцию), а не гарантировать отсутствие XSS. Истинный аудит делается человеком по результатам сканера. Полноценный lint границ/потока данных — отдельная инициатива (вне S1).

**Добавить в `package.json`:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "lint:xss": "node tools/check-xss.mjs",
  "lint:imports": "node tools/check-imports.mjs"
}
```

**Ложные срабатывания:** добавлять явный комментарий `// xss-safe: <var> controlled by CITIES data` или расширять белый список скрипта.

### 6.2. `tools/check-imports.mjs`

Проверяет направление импортов (правило §0.1):
- `src/shared/*` → только из `src/shared/*`
- `src/entities/*` → только из `src/shared/*` (НЕ из `entities/*`, НЕ из `lib/*`, НЕ из `app/*`)
- `src/lib/*` → из `src/shared/*` и `src/entities/*`
- `src/app/main.js` → из любого

**Реализация:** regex `/from\s+['"]([^'"]+)['"]/` по каждому файлу; разрешение алиасов (`@shared` → `src/shared` и т.д.) и относительных путей относительно файла. Нарушение = exit 1.

**Ложные срабатывания:** `shared/lib/format.js` → `shared/config/map-config.js` (внутри shared — OK). `entities/city` → `entities/sight` = НАРУШЕНИЕ (должно быть параметр `SIGHTS`).

---

## 7. Обновление `src/app/main.js`

### 7.1. Новые импорты (заменяют старые)

```js
// === OLD (Phase A) — УДАЛИТЬ ===
// import { SIGHTS } from '../data-sights.js';
// import { CITIES, getCityById, REGIONS, REGION_ICONS, MAP, createStampSVG, projectToSVG, computeStarPoints } from '../cities.js';
// import { getTodayLocal } from '../lib/dates.js';
// import { escapeHtml } from '../lib/dom.js';
// import { getCityTier as getCityTierPure, getSightsCount as getSightsCountPure, hasChecklist as hasChecklistPure, getCheckedCount as getCheckedCountPure, getTierLabel, getTierEmoji } from '../lib/tier.js';
// import { generateChronicle as generateChroniclePure, formatDateDisplay } from '../lib/chronicle.js';
// import { addMilestone as addMilestonePure, removeMilestone as removeMilestonePure, removeAllMilestones as removeAllMilestonesPure } from '../lib/milestones.js';
// import { loadState as loadStatePure, saveState as saveStatePure, STORAGE_KEY } from '../lib/storage.js';

// === NEW (Phase B) ===
import { SIGHTS } from '@entities/sight/index.js';
import {
  CITIES,
  getCityById,
  getCityTier as getCityTierPure,
  getSightsCount as getSightsCountPure,
  hasChecklist as hasChecklistPure,
  getCheckedCount as getCheckedCountPure,
  getTierLabel,
  getTierEmoji,
} from '@entities/city/index.js';
import {
  REGIONS,
  REGION_ICONS,
  createStampSVG,
  computeStarPoints,
} from '@entities/region/index.js';
import { MAP, projectToSVG } from '@shared/config/map-config.js';
import {
  formatDateDisplay,
  getTodayLocal,
  normalizeForSearch,
  getPluralSights,
} from '@shared/lib/format.js';
import { escapeHtml, showToast } from '@shared/lib/dom.js';
import { generateChronicle as generateChroniclePure } from '@lib/chronicle.js';
import { addMilestone as addMilestonePure, removeMilestone as removeMilestonePure, removeAllMilestones as removeAllMilestonesPure } from '@lib/milestones.js';
import { loadState as loadStatePure, saveState as saveStatePure, STORAGE_KEY } from '@lib/storage.js';
```

> **Примечание:** `formatDateDisplay` теперь из `@shared/lib/format.js` (не из `@lib/chronicle.js`). Обёртки (`getCityTier`, `getSightsCount`, …) в main.js **остаются как есть** — они передают `state`/`SIGHTS` в pure-функции, контракт сохранён.

### 7.2. Конфигурация — алиасы (КРИТИЧНО для тестов)

**`vite.config.js`** — добавить `@lib`:
```js
resolve: {
  alias: {
    '@app':      path.resolve(process.cwd(), 'src/app'),
    '@widgets':  path.resolve(process.cwd(), 'src/widgets'),
    '@features': path.resolve(process.cwd(), 'src/features'),
    '@entities': path.resolve(process.cwd(), 'src/entities'),
    '@shared':   path.resolve(process.cwd(), 'src/shared'),
    '@lib':      path.resolve(process.cwd(), 'src/lib'),  // ← NEW
  },
},
```

**`vitest.config.js`** — **ОБЯЗАТЕЛЬНО дублировать `resolve.alias`** (включая `@lib`). Текущий `vitest.config.js` (после Phase A) не содержит `resolve.alias`; Vitest в этой настройке не надёжно подхватывает алиасы из отдельного `vite.config.js`. Без дублирования тесты с `@entities/...`/`@shared/...` упадут на `Cannot find module`.

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
  },
  resolve: {
    alias: {
      '@app':      path.resolve(process.cwd(), 'src/app'),
      '@widgets':  path.resolve(process.cwd(), 'src/widgets'),
      '@features': path.resolve(process.cwd(), 'src/features'),
      '@entities': path.resolve(process.cwd(), 'src/entities'),
      '@shared':   path.resolve(process.cwd(), 'src/shared'),
      '@lib':      path.resolve(process.cwd(), 'src/lib'),
    },
  },
});
```

> **Это исправление исходного плана,** который в §13 говорил «Vitest подхватывает алиасы автоматически» — для текущей конфигурации (два отдельных файла) это ненадёжно. Дублирование обязательно.

### 7.3. Удалить локальные определения из main.js

После переноса (§4) удалить:
- `function showToast(message) { ... }` (app.js:497–507, после Phase A ≈ main.js:445–452)
- `function normalizeForSearch(str) { ... }` (app.js:910–918, после Phase A ≈ main.js:528–535)
- `function getPluralSights(n) { ... }` (app.js:1811–1817, после Phase A ≈ main.js:1374–1381)

### 7.4. Глобальные `var` и `window.` — ослабленные критерии (сверено с roadmap)

Roadmap §Phase B критерий: **«Ноль глобальных `var` / `window.X` (кроме легаси в `src/app/main.js`)»**.

**Сверено с кодом** (номера строк — исходный `app.js` до Phase A; после Phase A в `main.js` они сместятся на ~−432 строки, поэтому проверять grep'ом, а не по номерам): в `main.js` есть top-level `var` (`mapPointsInitialized` :84, `MAP_ORIG_VB`/`mapViewBox`/`suppressMapClick` :300–302, `currentPassportMode` :920, `noteDebounceTimer` :1367; `MAP` :49 уезжает в `shared/config` этой же фазой) и `window.`-чтения (`window.navigator.standalone` :1737, `window.matchMedia("(display-mode: standalone)")` :1738, `window.addEventListener("pagehide", ...)` :2202). Это **чтения** браузерных API внутри обработчиков, не `window.X = ...` (присваивание — см. grep ниже, пусто). Переименование `var`→`let` и устранение `window.`-чтений = распил main.js, что Phase D2. Поэтому критерии Phase B:

| Проверка | Ожидание |
|---|---|
| `grep -rn "^var " src/shared/ src/entities/ src/lib/` | **пусто** (новые модули — ESM `export const`/`let`, без top-level `var`) |
| `grep -rn "^var " src/app/main.js` | **допустимо** (легаси, roadmap разрешает «кроме легаси в main.js») |
| `grep -rn "window\.[a-zA-Z]" src/shared/ src/entities/ src/lib/` | **пусто** |
| `grep -rn "window\.[a-zA-Z]" src/app/main.js` | **допустимы только чтения** (`window.navigator`, `window.matchMedia`, `window.addEventListener`) — не присваивания |
| `grep -rn "window\.[a-zA-Z_]* *= " src/` | **пусто** (нигде нет `window.X = ...` присваивания) |

> **Исправление исходного плана,** который в §7.4 требовал «`grep -rn "window\." src/` — должно быть пусто» — это противоречит roadmap и нереализуемо без Phase D2.

### 7.5. Опционально: временный экспорт render-функций для XSS-тестов

Если выбран подход (a) из §5.6 — добавить в конец `main.js`:
```js
// TODO(phase-d2): убрать экспорты — временно для Phase B XSS-тестов
export { renderProfile, renderCityCard, buildSearchResults };
```
И, если render-функции читают глобальный `state` замыкания — экспортировать тестовый хелпер:
```js
// TODO(phase-d2): убрать — временно для тестов
export function __setTestState(s) { state = s; }
```
Если это слишком инвазивно — подход (b), DOM-рендер XSS → Phase D2.

---

## 8. Пошаговый план реализации

### Шаг 1: Инфраструктура (30 мин)
1. Добавить `@lib` алиас в `vite.config.js`
2. **Дублировать весь блок `resolve.alias` (включая `@lib`) в `vitest.config.js`** (§7.2 — критично)
3. Создать `tools/check-xss.mjs` и `tools/check-imports.mjs` (простые версии)
4. Добавить `lint:xss`, `lint:imports` в `package.json` scripts

### Шаг 2: Создать новые модули (entities + shared) (1 час)
1. `src/entities/sight/index.js` — копия `src/data-sights.js`, обновить TODO
2. `src/entities/city/index.js` — склейка CITIES/getCityById из `src/cities.js` + 7 функций из `src/lib/tier.js` (БЕЗ импорта sight — `SIGHTS` параметром)
3. `src/entities/region/index.js` — вырезка из `src/cities.js`
4. `src/shared/config/map-config.js` — MAP + projectToSVG
5. `src/shared/lib/format.js` — formatDateDisplay + getTodayLocal + normalizeForSearch + getPluralSights
6. `src/shared/lib/dom.js` — escapeHtml + qs + qsa + showToast
7. `src/shared/lib/store-mechanism.js` — createStore

### Шаг 3: Обновить временные модули `src/lib/` (15 мин)
1. `src/lib/chronicle.js` — импорт `getCityById` из `@entities/city`; **удалить локальный `formatDateDisplay`** (§2.6)
2. `src/lib/storage.js` — импорты из `@entities/city` и `@entities/sight` (§2.7)
3. `src/lib/milestones.js` — импорт `getTodayLocal` из `@shared/lib/format` (§2.8)

### Шаг 4: Обновить main.js (1 час)
1. Заменить блок импортов на новые (через алиасы, §7.1)
2. Удалить локальные `showToast`, `normalizeForSearch`, `getPluralSights`
3. (Опционально, подход a) добавить временный экспорт render-функций + `__setTestState` (§7.5)
4. Проверить: `grep -nE "from '\.\./(cities|data-sights|lib/(dom|dates|tier))" src/app/main.js` — **пусто**

### Шаг 5: Удалить старые файлы (5 мин)
1. `rm src/cities.js`
2. `rm src/data-sights.js`
3. `rm src/lib/tier.js`
4. `rm src/lib/dates.js`
5. `rm src/lib/dom.js`

### Шаг 6: Реорганизовать тесты (1 час)
1. Создать `tests/shared/{format,dom,store-mechanism}.test.js`
2. Создать `tests/entities/{city-tier,city-data,region}.test.js`
3. Переместить `tests/tier.test.js` → `tests/entities/city-tier.test.js` (обновить импорт `@entities/city`)
4. Переместить `tests/dom.test.js` → `tests/shared/dom.test.js` (дополнить qs/qsa/showToast)
5. Переместить `tests/storage.test.js` → `tests/lib/storage-roundtrip.test.js`
6. Переместить `tests/invariants.test.js` → `tests/lib/invariants.test.js` (обновить импорт `@lib/storage`)
7. Переместить `tests/chronicle.test.js` → `tests/lib/chronicle.test.js` (импорт `@lib/chronicle`; `getCityById` теперь через `@entities/city` внутри chronicle — тест не меняется).
   **⚠️ Важно:** Phase A `chronicle.test.js` содержал кейс `formatDateDisplay("2025-04-12")` → `"12.04.2025"` (item 6). Поскольку `formatDateDisplay` уезжает из `chronicle.js` в `@shared/lib/format.js` (§2.6), этот кейс **удаляется из `chronicle.test.js`** и переносится в `tests/shared/format.test.js` (§5.2). Оставить его в chronicle.test.js = падение теста на `formatDateDisplay is not a function`/`undefined import`.
8. Обновить/удалить `tests/smoke.test.js`

### Шаг 7: XSS-аудит (2 часа)
1. Доработать `tools/check-xss.mjs` (белый список контролируемых констант)
2. Запустить `npm run lint:xss` — зафиксировать текущее состояние (если находки — это и есть аудит: исправить в main.js, добавив `escapeHtml` где пропущено, или добавить `// xss-safe` комментарии)
3. (Подход a) создать `tests/security/xss.test.js` (5 кейсов, §5.6)
4. (Подход b) — создать расширенные escapeHtml-векторы в `xss.test.js`, DOM-рендер → Phase D2 (явно в отчёте)

### Шаг 8: Запуск и проверка (30 мин)
1. `npm run test:run` — все тесты зелёные
2. `npm run lint:xss` — exit 0
3. `npm run lint:imports` — exit 0 (включая проверку: `entities/city` НЕ импортирует `entities/sight`)
4. `npm run dev` — приложение работает идентично v3
5. `npm run build` — сборка чистая
6. Smoke-чеклист пп. 1–11

### Шаг 9: Аннотированный тег
`git tag -a s1-phase-b -m "S1 Phase B: shared + entities + XSS audit"`

---

## 9. Критерии «готово» (Phase B)

### Обязательные
- [ ] Создана структура `src/shared/{config,lib}/` + `src/entities/{city,region,sight}/index.js`
- [ ] Удалены `src/cities.js`, `src/data-sights.js`, `src/lib/{tier,dates,dom}.js`
- [ ] `src/lib/` содержит только `storage.js`, `chronicle.js`, `milestones.js` (transitional)
- [ ] `src/entities/city/index.js` **НЕ импортирует** `@entities/sight` (верифицировано `tools/check-imports.mjs` и grep)
- [ ] `src/app/main.js` импортирует через алиасы `@shared`, `@entities`, `@lib`
- [ ] `resolve.alias` (включая `@lib`) дублирован в `vitest.config.js` — тесты с алиасами проходят
- [ ] `src/shared/lib/store-mechanism.js` создан и покрыт 11 тестами (включая критический #11 — `validate` возвращает трансформированное состояние)
- [ ] `tools/check-xss.mjs` — `npm run lint:xss` exit 0
- [ ] `tools/check-imports.mjs` — `npm run lint:imports` exit 0
- [ ] XSS-аудит проведён: все `html +=`/`innerHTML` интерполяции либо `escapeHtml`, либо белый список/`xss-safe` комментарий
- [ ] `tests/security/xss.test.js` создан (подход a или b — см. §5.6, выбор отражён в отчёте)
- [ ] Все существующие тесты обновлены и зелёные
- [ ] `npm run test:run` зелёный
- [ ] `npm run dev` работает идентично v3
- [ ] `npm run build` собирает `dist/` без ошибок
- [ ] Smoke-чеклист пп. 1–11 пройден
- [ ] `grep -rn "^var " src/shared/ src/entities/ src/lib/` — пусто (новые модули ESM-clean)
- [ ] `grep -rn "window\.[a-zA-Z_]* *= " src/` — пусто (нет `window.X =` присваиваний нигде)

### Желательные
- [ ] Покрытие `src/entities/*` + `src/shared/*` >80% (Vitest coverage)
- [ ] `tools/check-xss.mjs` имеет полноценный белый список
- [ ] Подход (a) для XSS-тестов реализован (временный экспорт render-функций)

### Зафиксированные долги (явно вне Phase B)
- `style.css` остаётся монолитом
- `src/lib/{storage,chronicle,milestones}.js` остаются до Phase C/D1/D2
- main.js всё ещё ~1700 строк (распил в Phase D2); top-level `var` и `window.`-чтения — легаси до Phase D2
- Алиасы `@widgets/@features/@app` объявлены, но не используются
- DOM-рендер XSS-тесты (если подход b) → Phase D2

---

## 10. Smoke-чеклист (из `roadmap.md`)

| # | Пункт | Как проверить |
|---|---|---|
| 1 | Первый запуск: онбординг → имя сохраняется | Чистый localStorage → онбординг → ввести имя → reload |
| 2 | Паспорт: поиск, фильтры, аккордеоны | Открыть паспорт → все 4 фильтра + поиск работают |
| 3 | Карточка города → «Я здесь был» → дата → штамп/ранг | Тап на город → «Я здесь был» → штамп |
| 4 | Чек-лист: Бронза→Серебро→Золото | Отметить 50% → Серебро; 100% → Золото |
| 5 | Закладка «в планах» / «Доисследовать» | Тап на закладку; Silver — заглушка |
| 6 | Заметка по городу → автосохранение | Ввести текст → visibilitychange → reload |
| 7 | Карта: 7 состояний маркеров | Открыть карту → проверить все 7 |
| 8 | Профиль: статистика, ордена, хроника, смена имени | Открыть профиль → всё на месте |
| 9 | Перезагрузка — данные на месте | Все изменения сохраняются |
| 10 | Офлайн — работает | DevTools → Offline (на `npm run preview`, НЕ dev) |
| 11 | Поток обновления SW | Деплой → reload → toast «обновлено» (gate PROD) |

**Дополнительно для Phase B:**
| # | Пункт | Как проверить |
|---|---|---|
| B-1 | Нет 404 в DevTools Network | Все алиасы `@entities`/`@shared`/`@lib` резолвятся |
| B-2 | Vite build warnings | Должно быть пусто (или только informational) |
| B-3 | XSS-регрессия ловится | Внести `state.travelerName = '<script>...'` без escape → `lint:xss` падает ИЛИ `xss.test.js` падает |

---

## 11. Что НЕ входит в Phase B (явные границы)

| Не делаем | Почему | Где |
|---|---|---|
| Реальный store с автосохранением через `createStore` | Phase C | Phase C |
| Переезд `src/lib/storage.js` → `src/app/store.js` | Phase C | Phase C |
| Переезд `src/lib/chronicle.js` → `src/widgets/profile/chronicle.js` | Phase D2 | Phase D2 |
| Переезд `src/lib/milestones.js` → `src/features/checklist/milestones.js` | Phase D1 | Phase D1 |
| Распил features (visit, checklist, stamps, plan, search) | Phase D1 | Phase D1 |
| Распил widgets (passport, map, profile, city-card, onboarding) | Phase D2 | Phase D2 |
| Удаление `main.js` как монолита; переименование top-level `var`→`let`; устранение `window.`-чтений | Phase D2 | Phase D2 |
| Фича «Заметки» | Phase E | Phase E |
| Network-first для HTML в SW | Phase F | Phase F |
| Разделение `style.css` по слоям | Осознанный долг | Phase S3 |
| Замена `html +=` на template literals / DOM API | Косметика (roadmap §S1) | Не блокер |
| DOM-рендер XSS-тесты (если подход b выбран) | Требует экспорта render-функций = Phase D2 | Phase D2 |

---

## 12. Риски и меры

| Риск | Вероятность | Мера |
|---|---|---|
| **Алиасы не резолвятся в Vitest** (главный технический риск после правки плана) | Высокая (без дублирования) | Дублировать `resolve.alias` в `vitest.config.js` обязательно (§7.2) |
| **`entities/city` случайно импортирует `entities/sight`** | Средняя | Контракт `SIGHTS` параметром (§2.1); `tools/check-imports.mjs` ловит entities→entities |
| **XSS-тесты требуют рефакторинга main.js** (export render / __setTestState) | Средняя | Подход (a) — временный экспорт с TODO; иначе подход (b), DOM-тесты → Phase D2 |
| **Grep-чек XSS даёт ложные срабатывания** | Высокая | Белый список контролируемых констант + `// xss-safe` комментарии (§6.1) |
| **Дубликат `formatDateDisplay`** | — | **Устранён:** `formatDateDisplay` убирается из `chronicle.js`, единственный источник — `@shared/lib/format` (§2.6) |
| **Vite build ломается из-за новых путей** | Низкая | `npm run build` — обязательный шаг проверки (§8 шаг 8) |
| **`tools/check-imports.mjs` не ловит все нарушения** | Средняя | Ручной grep-контроль + постепенное ужесточение правил |
| **`createStore` спроектирован неправильно для Phase C** | Средняя | Phase C — итерация над дизайном; базовые тесты уже в Phase B |

---

## 13. Зафиксированные технические решения

1. **`src/entities/city/index.js` — один файл** (7 экспортов, ~80 строк). Если добавятся `entities/city/regions.js`/`visit.js` — рефакторинг.
2. **`entities/city` НЕ импортирует `entities/sight`** (правило FSD). `SIGHTS` — параметр. Это исправление исходного плана, который предлагал импорт (нарушение FSD + внутреннее противоречие с check-imports).
3. **`src/shared/lib/store-mechanism.js` создаётся, но НЕ используется в Phase B** — подготовка к Phase C.
4. **`projectToSVG` живёт в `src/shared/config/map-config.js` рядом с `MAP`** (одно без другого не используется).
5. **`qs/qsa` добавляются в `shared/lib/dom.js`, но в main.js используются не сразу** — переход постепенный (Phase D1/D2).
6. **`showToast` контракт: принимает уже экранированную строку.** Вызывающий код отвечает за `escapeHtml`.
7. **`formatDateDisplay` — единственный источник в `@shared/lib/format`**; из `chronicle.js` удалён (исправление исходного плана про «дубликат до Phase D2»).
8. **`resolve.alias` дублируется в `vitest.config.js`** (исправление исходного плана §13).
9. **Phase B не уменьшает `main.js` значительно** (–30 строк). Главный распил — Phase D2.
10. **`createStore`: persist-загрузка обходит `validate`** (осознанное ограничение Phase B). При создании store `JSON.parse(raw)` заменяет `initialState` **без** вызова `validate`. Для Phase B (createStore тестируется изолированно, домен не подключён) это допустимо. Phase C должен разрешить дилемму: либо валидировать состояние вручную после `createStore` (отключив/проигнорировав persist-загрузку — пусть доменный `loadState` останется единственным источником), либо доработать `createStore` (вызывать `validate(next, initialState)` при загрузке из persist). См. TODO в §3.1.
11. **`tools/check-xss.mjs` — best-effort regression guard, не статанализ.** Назначение — ловить новые небезопасные интерполяции, а не гарантировать отсутствие XSS (см. §6.1).

---

## 14. Порядок выполнения (для implementation-агента)

1. Шаг 1 (инфраструктура): алиасы + tools/ + scripts + **дублирование alias в vitest.config**
2. Шаг 2 (новые модули): создать `shared/` и `entities/` без удаления старых; `entities/city` БЕЗ импорта sight
3. Шаг 3 (временные): обновить импорты в `lib/{storage,chronicle,milestones}`; убрать `formatDateDisplay` из chronicle
4. Шаг 4 (main.js): заменить импорты, удалить локальные showToast/normalizeForSearch/getPluralSights; (опц.) временный экспорт render-функций
5. Шаг 5 (удаление): удалить старые файлы (cities, data-sights, lib/tier, lib/dates, lib/dom)
6. Шаг 6 (тесты): реорганизовать + создать новые; обновить импорты везде
7. Шаг 7 (XSS-аудит): `tools/check-xss.mjs` доработать + запустить + исправить находки в main.js; `xss.test.js` (подход a или b)
8. Шаг 8 (проверка): test:run + lint:xss + lint:imports + dev + build + smoke
9. Шаг 9 (тег): `git tag -a s1-phase-b`
10. **Push в `s1-foundation` ветку; НЕ мержить в main** (стратегия roadmap)

> **Правило приоритета источников (как в Phase A):** при расхождении плана и **реального кода** — воспроизводить код. Цель — поведение 1:1. Отклонения фиксировать комментарием + в отчёте.

---

## 15. Связь с последующими фазами

Phase B закладывает структуру, в которую Phase C/D1/D2 «механически» переезжают:

| Phase B (текущая) | Phase C | Phase D1 | Phase D2 |
|---|---|---|---|
| `src/lib/storage.js` | → `src/app/store.js` (через `createStore`) | — | — |
| `src/lib/chronicle.js` | — | — | → `src/widgets/profile/chronicle.js` |
| `src/lib/milestones.js` | — | → `src/features/checklist/milestones.js` | — |
| `src/app/main.js` (~1700 строк) | остаётся (тонкая обёртка над store) | остаётся | → ~30 строк (только `init()` × N) |
| `@lib` алиас | удаляется (когда `lib/` опустеет) | — | — |
| Временный экспорт render-функций (если подход a) | — | — | убирается при распиле widgets |

Имена функций, экспортируемых в Phase B, **сохраняются** при переезде — это контракт для последующих фаз.
