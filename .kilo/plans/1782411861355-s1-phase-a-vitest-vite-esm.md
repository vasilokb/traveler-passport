# S1 · Phase A — Vitest + Vite + ESM (поведение без изменений)

> **Документ-основа:** `F:\projects\traveler-passport\.kilo\plans\roadmap.md` § «Phase A» (строки 78–110) + `F:\projects\traveler-passport\.kilo\plans\MVP_S1_phase_a\app-description_v3.md` § 6.11 (модель состояния).
> **Состояние кодовой базы до начала:** `app.js` 2227 строк + `data-sights.js` 83 строки + `style.css` 1615 строк, всё в корне, два `<script>`-тега без сборки. `package.json` содержит только `puppeteer-core` (нет сборщика, нет тестов).
> **Результат фазы:** Vitest-инфраструктура + Vite-сборка + ESM-модули. Поведение приложения в браузере идентично v3 (см. §9 про единственное осознанное отклонение). Код НЕ распилен по FSD-слоям — только минимальное извлечение, необходимое для покрытия тестами.

---

Сверяй каждое утверждение плана с реальным app.js перед реализацией. Если план и код расходятся — воспроизводи код. Все найденные расхождения (включая мелкие) фиксируй комментарием в коде и в отчёте, не только те, что перечислены в §9.

## 0. Пререквизит — §0 «Безопасность» из roadmap

Roadmap явно требует **до** начала любой фазы S1:

1. Удалить `conf` из рабочей копии и из истории git (`git filter-repo` / BFG).
2. Добавить `conf`, `*.conf`, `secrets.*` в `.gitignore`.
3. Ротировать токен `pv1_8G2D...` на sourcecraft.dev.
4. Проверка: `grep -r "pv1_8G2D" .` пусто + `git log --all -p | grep -i "pv1_8G2D"` пусто.

**Статус для агента-исполнителя:**
- **§0 ВЫПОЛНЯЕТСЯ ОТДЕЛЬНО, ЧЕЛОВЕКОМ — НЕ агентом.** Очистка git-истории (`git filter-repo` / BFG) и ротация токена — деструктивные операции вне компетенции Phase A.
- **Агенту запрещено** запускать `git filter-repo`, BFG, `git push --force`, `git rebase` над общей историей, удалять `conf` через `rm`+коммит.
- **Единственное, что агент может сделать по §0:** добавить/проверить правила в `.gitignore` (`conf`, `*.conf`, `secrets.*`) в рамках общего шага `.gitignore` (§3.11). Это безопасно.
- Если `grep -r "pv1_8G2D" .` непусто на момент старта — агент **останавливается и сообщает**, продолжать нельзя.

Без выполнения §0 (человеком) Phase A не стартует. В скоуп плана реализации §0 НЕ входит.

---

## 1. Главное архитектурное решение (компромисс)

Roadmap говорит «код НЕ распиливается», но при этом требует Vitest-тесты на чистые функции (`getCityTier`, `escapeHtml`, `loadState`, `generateChronicle`). Без извлечения этих функций в импортируемые модули тесты невозможны.

**Решение:** минимальное извлечение в **временную** директорию `src/lib/` (не FSD). Полная FSD-структура (`shared/`, `entities/`, `features/`, `widgets/`, `app/`) — это Phase B. Извлечённые функции переедут туда в Phase B без изменения имен/сигнатур (один из критериев готовности Phase A — единые имена, удобные для переезда).

| Что | Куда | Почему именно туда |
|---|---|---|
| Pure-функции (tier, chronicle, dom, milestones, dates) | `src/lib/*.js` | Удобно тестировать; Phase B переедет в `src/shared/lib/` или `src/entities/*/` |
| `CITIES`, `getCityById`, `REGIONS`, `REGION_ICONS`, `MAP` | `src/cities.js` | Нужны в `loadState` для валидации cityId; Phase B → `src/entities/city/` |
| `SIGHTS` | `src/data-sights.js` (export) | Уже отдельный файл; Phase B → `src/entities/sight/` |
| Остальной код (DOM-логика, обработчики, рендер) | `src/app/main.js` | Монолит, как был. Phase D2 разнесёт по `widgets/` |

`style.css` остаётся в корне единым файлом — осознанный долг (см. `roadmap.md §0`).

---

## 2. Структура файлов — до и после

### До начала фазы
```
traveler-passport/
├── index.html, style.css, app.js, data-sights.js
├── manifest.json, sw.js, icon-192.svg, icon-512.svg
├── covers/   (пусто)
└── package.json   (только puppeteer-core)
```

### После завершения фазы
```
traveler-passport/
├── index.html                           ← <script type="module" src="/src/app/main.js">
├── style.css                            (без изменений)
├── package.json                         ← + vitest, vite, jsdom; +scripts
├── vite.config.js                       (NEW)
├── vitest.config.js                     (NEW)
├── .gitignore                           (NEW: dist/, node_modules/, .vite/, coverage/)
├── public/                              (NEW: Vite passthrough)
│   ├── manifest.json
│   ├── icon-192.svg
│   ├── icon-512.svg
│   ├── covers/.gitkeep
│   └── sw.js                            (CACHE_NAME → 'traveler-passport-v4', новые пути)
├── src/
│   ├── app/
│   │   └── main.js                      (переименованный app.js + импорты)
│   ├── cities.js                        (CITIES, getCityById, REGIONS, REGION_ICONS, MAP)
│   ├── data-sights.js                   (export const SIGHTS = {...})
│   └── lib/                             (TEMPORARY — Phase B переедет в shared/entities)
│       ├── tier.js
│       ├── chronicle.js
│       ├── dom.js
│       ├── storage.js
│       ├── milestones.js
│       └── dates.js
└── tests/                               (NEW)
    ├── setup.js
    ├── tier.test.js
    ├── chronicle.test.js
    ├── dom.test.js
    ├── storage.test.js
    └── invariants.test.js
```

> **Замечание по `index.html`:** остаётся в корне проекта (требование Vite). Содержимое почти не меняется: убирается `<script src="data-sights.js">` и `<script src="app.js">`, добавляется `<script type="module" src="/src/app/main.js">`. Inline-регистрация SW переносится в `main.js` (см. §3.9).

---

## 3. Подробный план задач (implementation-ready)

### 3.1. Установка зависимостей и конфигурация

1. `npm i -D vitest vite jsdom`
2. `package.json` — добавить секцию `scripts`:
   - `"dev"`: `vite`
   - `"build"`: `vite build`
   - `"preview"`: `vite preview`
   - `"test"`: `vitest`
   - `"test:run"`: `vitest run`
3. Создать `vite.config.js`:
   - `base: './'` (деплой в подпапку)
   - `resolve.alias`: `@app`, `@widgets`, `@features`, `@entities`, `@shared` → `src/app`, `src/widgets`, `src/features`, `src/entities`, `src/shared`
   - `build.outDir: 'dist'`
   - `publicDir: 'public'`
   - `root: '.'` (по умолчанию)
4. Создать `vitest.config.js`:
   - `test.environment: 'jsdom'`
   - `test.globals: true`
   - `test.include: ['tests/**/*.test.js']`
   - `test.setupFiles: ['tests/setup.js']` (для очистки localStorage перед каждым тестом)

### 3.2. Извлечение чистых функций — сигнатуры и граф импортов

**Правило:** функция переезжает в `src/lib/*.js` **только если** она нужна в тестах. Все остальные функции остаются в `src/app/main.js`.

**Контракт по `state`** (критично, см. ниже §3.2.1 и §3.2.2): функции либо принимают `state` параметром и **возвращают** результат (tier, chronicle), либо принимают `state` и **мутируют** его (milestones — как в оригинале). `loadState` — **возвращает** новый объект и принимает только `storage` в deps (не принимает `prevState` и `getTodayLocal` — они не используются оригиналом).

| Файл модуля | Экспорт | Сигнатура (чистая, с DI) | Импортирует из |
|---|---|---|---|
| `src/lib/dates.js` | `getTodayLocal` | `() => "YYYY-MM-DD"` | — |
| `src/lib/dom.js` | `escapeHtml` | `(str: string) => string` | — |
| `src/lib/tier.js` | `getSightsCount` | `(cityId, SIGHTS) => number` | — |
| `src/lib/tier.js` | `hasChecklist` | `(cityId, SIGHTS) => boolean` | — |
| `src/lib/tier.js` | `getCheckedCount` | `(cityId, state) => number` | — |
| `src/lib/tier.js` | `getCityTier` | `(cityId, state, SIGHTS) => tier\|null` | — (внутренние хелперы того же модуля) |
| `src/lib/tier.js` | `getTierLabel`/`getTierEmoji` | `(tier) => string` | — |
| `src/lib/milestones.js` | `addMilestone`/`removeMilestone`/`removeAllMilestones` | `(state, cityId, tier?)` — мутирует `state` | `./dates.js` (`getTodayLocal`, вызывается в `addMilestone`) |
| `src/lib/chronicle.js` | `formatDateDisplay` | `(dateStr) => string` | — |
| `src/lib/chronicle.js` | `generateChronicle` | `(state, CITIES) => entry[]` | `../cities.js` (имя города в записях) или `CITIES` параметром |
| **`src/lib/storage.js`** | `STORAGE_KEY` | константа | — |
| **`src/lib/storage.js`** | `getDefaultState` | `() => state` | — |
| **`src/lib/storage.js`** | `loadState` | `({ storage }) => state` | `./tier.js` (`getCityTier`), `../cities.js` (`getCityById`, `CITIES`) |
| **`src/lib/storage.js`** | `saveState` | `(state, storage) => { ok: boolean, error? }` | — |

#### 3.2.1. Граф импортов внутри `src/lib/` — направленный, без колец

`loadState` реально вызывает (сверено по коду `app.js`):

| Вызов внутри `loadState` | Строка `app.js` | Лежит в | Откуда брать |
|---|---|---|---|
| `getCityTier(cityId)` | 795, 801 (инварианты Gold/Silver) | `src/lib/tier.js` | импорт из `tier.js` |
| `getCityById(ckey)` | 730, 774 (валидация checkedSights/milestones) | `src/cities.js` | импорт из `cities.js` |
| `CITIES` | 689, 800 (валидация visited/planned) | `src/cities.js` | импорт из `cities.js` |
| `saveState()` | 823 (ветка `needsFix`) | тот же модуль | внутренний вызов |

```
storage.js ──imports──▶ tier.js ──imports──▶ (ничего из lib)
storage.js ──imports──▶ cities.js
chronicle.js ──imports──▶ ../cities.js
milestones.js ──imports──▶ ./dates.js  (addMilestone вызывает getTodayLocal)
dom.js, dates.js ──imports──▶ (ничего)
```

**Правило:** `state`, `SIGHTS`, `CITIES` — **параметры**, а не импорты (чтобы функции оставались чистыми и тестируемыми). Исключения-импорты внутри `src/lib/`: `storage.js`→`tier.js`+`../cities.js`, `chronicle.js`→`../cities.js`, `milestones.js`→`./dates.js`. Колец быть не должно.

`getCityTier` и `getCityById` **НЕ передаются в deps** `loadState` — `storage.js` импортирует их напрямую. Это устраняет риск, что агент забудет прокинуть `getCityTier`, хотя `loadState` вызывает его для инвариантов.

> **Контроль:** `grep -rn "import" src/lib/` — внутри `src/lib/` импорты только `storage.js`→`tier.js`+`../cities.js`, `chronicle.js`→`../cities.js`, `milestones.js`→`./dates.js`. Колец быть не должно.

#### 3.2.2. Контракт `loadState`: возврат объекта, а не мутация ссылки

Реальный `catch` `loadState` (`app.js` 826–837) **переприсваивает идентификатор** `state = { ...полный сброс... }`. Переприсвоить параметр-ссылку бесполезно — внешний `state` не изменится.

**Решение:** `loadStatePure` **возвращает** новый объект состояния; `main.js` присваивает результат:

```js
// src/lib/storage.js
// getCityTier, getCityById, CITIES — импортируются напрямую (см. §3.2.1),
// а НЕ передаются в deps. storage (localStorage) — единственный dep.
export function loadState({ storage }) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return finalize(getDefaultState());
    const saved = JSON.parse(raw);
    const next = { ...getDefaultState() };
    // ...валидация, заполнение next.visitedCities, next.checkedSights и т.д...
    // инварианты вызывают getCityTier(id, next, SIGHTS) — next уже частично построен
    // (порядок как в оригинале: checkedSights загружается ДО инвариантов)
    return finalize(next); // добавляет эфемерные поля (passportFilter и пр.)
  } catch (e) {
    return finalize(getDefaultState()); // ПОЛНЫЙ сброс — возвращаем новый объект, не мутация
  }
}
```

```js
// src/app/main.js
import { loadState as loadStatePure } from '../lib/storage.js';
// ...
state = loadStatePure({ storage: localStorage });
```

**Контракт:** функция **чистая** (нет побочных эффектов кроме чтения `storage`), **возвращает** состояние. Мутация внешнего `state` происходит **только** в обёртке `main.js` через присваивание. Эфемерные поля тоже добавляются внутри `loadStatePure` (через хелпер `finalize()`) к возвращаемому объекту — контракт «один вызов = готовое состояние».

**Полный состав `finalize(state)` (всё, что не сохраняется в localStorage) — сверено по `app.js`:**

| Поле | Значение по умолчанию | Источник в коде |
|---|---|---|
| `passportFilter` | `"all"` | `app.js:839` |
| `passportSearchQuery` | `""` | `app.js:840` |
| `mapFilter` | `state.mapFilter \|\| "all"` | `app.js:841` (сохраняет значение, если уже было) |
| `stampOverlayCityId` | `null` | `app.js:842` |
| `openedRegions` | `state.openedRegions \|\| []` | `app.js:843` |
| `activeOverlayCityId` | `null` | объявление `app.js:581` |
| `stampOrigin` | `null` | объявление `app.js:582` |

**Контракт для `getDefaultState()`:** возвращает объект с **8 сохраняемыми** полями (`currentTab`, `travelerName`, `onboardingComplete`, `visitedCities`, `plannedCities`, `cityNotes`, `checkedSights`, `milestones`). `openedRegions` в `getDefaultState()` **НЕ входит** — он всегда добавляется в `finalize()` (как `state.openedRegions || []`), что совпадает с поведением оригинала (`app.js:836` задаёт `[]` в catch, но `:843` всё равно перепроверяет). Эфемерные поля в `getDefaultState()` не дублируются.

**Итоговые формы:**
- Успешный путь: `return finalize(mergeSavedIntoNext);`
- Catch (полный сброс): `return finalize(getDefaultState());`

> Ветку `needsFix` (`app.js` 820–824), где оригинал вызывает `saveState()`, реализовать как внутренний вызов `saveStatePure(next, storage)` внутри `loadStatePure` (обе функции в одном модуле).

#### 3.2.3. `saveState`: обработка `showToast` при ошибке

Реальный `saveState` (`app.js` 846–862) в `catch` вызывает `showToast('Не удалось сохранить данные. Освободите место в браузере.')`. Чистая версия без DOM-доступа тост **молча потеряет** — нарушение инварианта «поведение без изменений».

**Решение:** `saveStatePure` **не вызывает `showToast`**, но **возвращает результат**; тост показывается в обёртке `main.js`:

```js
// src/lib/storage.js
export function saveState(state, storage) {
  try {
    const toSave = { /* 8 полей, как в app.js 848–857 */ };
    storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}
```

```js
// src/app/main.js
import { saveState as saveStatePure } from '../lib/storage.js';
function saveState() {
  const res = saveStatePure(state, localStorage);
  if (!res.ok) showToast('Не удалось сохранить данные. Освободите место в браузере.');
}
```

Это сохраняет тост при `QuotaExceededError` и оставляет ядро чистым.

#### 3.2.4. Мёртвые ветви `typeof SIGHTS === "undefined"` — осознанное отклонение

В ESM `SIGHTS` всегда импортируется, поэтому ветви «data-sights.js не загружен» (`app.js` 736 в `loadState`, 593 в `getSightsCount`) **никогда не выполняются**. Поведение становится **строже**: вместо «доверять старым данным при отсутствии файла» всегда применяется полная валидация по `SIGHTS`.

**Решение:** удалить эти ветви в чистых функциях с комментарием-фиксацией отклонения (см. §9):

```js
// Примечание: в ESM SIGHTS всегда определён (import).
// Удалена ветвь typeof SIGHTS === "undefined" из оригинала (app.js:736, app.js:593).
// Поведение строже: всегда полная валидация по SIGHTS. Безопасно — bundler гарантирует наличие модуля.
```

В `main.js` соответствующие ветви тоже удаляются.

### 3.3. Выделение `src/cities.js`

Из `app.js` строки 509–567 (массив CITIES) + строки 585–590 (`getCityById`) + строки 3–58 (REGIONS, REGION_ICONS, MAP, `computeStarPoints`):

```js
// src/cities.js
export const REGIONS = [...];
export const REGION_ICONS = {...};
export function createStampSVG(regionId, tier) {...}
export function computeStarPoints(cx, cy, outerR) {...}
export const MAP = {...};
export function projectToSVG(lat, lon) {...}
export const CITIES = [...];
export function getCityById(cityId) {...}
```

`createStampSVG` и `projectToSVG` нужны в `src/app/main.js` (рендер штампов и карты), поэтому тоже экспортируются. Это всё ещё извлечение ради **совместимости с ESM**, а не распил по слоям.

### 3.4. Миграция `data-sights.js` → `src/data-sights.js`

Заменить `var SIGHTS = {...}` на `export const SIGHTS = {...}`. Убрать `"use strict";` (модули ESM по умолчанию strict). Импорт в `main.js`:
```js
import { SIGHTS } from '../data-sights.js';
```

**Временный комментарий в коде:**
```js
// TODO(phase-b): переезд в src/entities/sight/; сменить импорт на @entities/sight
```

### 3.5. Vite-конфигурация (детали)

`vite.config.js`:
```js
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@app': path.resolve(process.cwd(), 'src/app'),
      '@widgets': path.resolve(process.cwd(), 'src/widgets'),
      '@features': path.resolve(process.cwd(), 'src/features'),
      '@entities': path.resolve(process.cwd(), 'src/entities'),
      '@shared': path.resolve(process.cwd(), 'src/shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  publicDir: 'public',
});
```

Алиасы объявляются, но **не используются** в Phase A (кода в этих папках ещё нет). Это подготовка к Phase B, чтобы не править `vite.config.js` дважды.

### 3.6. Vitest-конфигурация (детали)

`vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
  },
});
```

`tests/setup.js`:
```js
beforeEach(() => {
  localStorage.clear();
});
```

### 3.7. Тесты — детальный план

#### `tests/tier.test.js` — `getCityTier` + хелперы (5+ кейсов)
1. Город не в `visitedCities` → `null`
2. Город в `visitedCities`, нет чек-листа (нет в SIGHTS) → `"bronze"`
3. Город в `visitedCities`, чек-лист есть, `checkedSights` пуст → `"bronze"`
4. Город в `visitedCities`, чек-лист, частично отмечен → `"silver"`
5. Город в `visitedCities`, чек-лист, все отмечены → `"gold"`
6. `getTierLabel`/`getTierEmoji` для всех 4 значений

#### `tests/chronicle.test.js` — `generateChronicle` (5+ кейсов)

> **⚠️ Источник истины — код (`app.js` 1186–1192), НЕ `app-description_v3.md` §6.16.** В реальном коде **оба** milestone-tier'а (gold и silver) используют `priority: 1` — НЕ gold=2/silver=1, как ошибочно указано в описании. Сортировка `a.priority - b.priority` (ASC, строка 1199), НЕ DESC. Это важно: воспроизводить код, иначе Phase A меняет поведение.

1. Пустое состояние → пустой массив
2. Один визит без milestones → одна запись с `type: "visit"`, `priority: 0`
3. Несколько визитов в разные даты → сортировка DESC по дате
4. Визит + milestone в один день → визит (priority 0) идёт **раньше** milestone (priority 1)
5. Gold и Silver milestone одного города в один день → `priority` **равны** (=1 для обоих tier'ов); относительный порядок определяется стабильностью сортировки (сохраняется порядок вставки в массив). Поведение совпадает с v3 — **не** вводить gold=2/silver=1
6. `formatDateDisplay("2025-04-12")` → `"12.04.2025"`

#### `tests/dom.test.js` — `escapeHtml` (6+ кейсов)
1. `"<script>alert(1)</script>"` → `"&lt;script&gt;alert(1)&lt;/script&gt;"`
2. `"&"` → `"&amp;"`
3. `"<"` → `"&lt;"`
4. `">"` → `"&gt;"`
5. `'"'` → без изменений (текущая реализация через `createTextNode`+`innerHTML` НЕ экранирует кавычки)
6. `"'"` → без изменений
7. `null`/`undefined` → строковое представление (`String(null)` = `"null"`)
8. Текст на русском с ё/і/ў — не должен ломаться

> Реализация `escapeHtml` (`app.js` 1335–1339): `createTextNode` + `innerHTML`. В jsdom базовые векторы (`<`, `>`, `&`) сериализуются корректно; кавычки не экранируются — это подтверждено поведением оригинала.

#### `tests/storage.test.js` — `loadState`/`saveState` (учитывает контракт §3.2.2/§3.2.3)
1. `saveStatePure(state, storage)` → `loadStatePure(...)` → глубокое равенство исходному состоянию (все 8 полей)
2. Пустой localStorage → `loadStatePure` возвращает дефолтное состояние (`getDefaultState()`)
3. Legacy `currentTab: "catalog"` → миграция в `"passport"`
4. Невалидный JSON в localStorage → полный сброс к дефолту (возвращается новый объект, `catch` не падает)
5. `saveStatePure` под моком `setItem`, бросающим `QuotaExceededError` → возвращает `{ ok: false, error }`, **не падает**
6. `getDefaultState()` возвращает корректную структуру: 8 сохраняемых полей; эфемерные поля добавляются `finalize()` отдельно (5 из блока `app.js` 839–843: `passportFilter`, `passportSearchQuery`, `mapFilter`, `stampOverlayCityId`, `openedRegions`; плюс `activeOverlayCityId`/`stampOrigin` из объявления 581–582)
7. (Обёртка в `main.js`, smoke или отдельный тест) при `!ok` обёртка вызывает `showToast` — тост «Не удалось сохранить…» появляется (поведение v3 сохранено)

#### `tests/invariants.test.js` — 4 инварианта v3 (8+ кейсов)
1. **Инвариант #1:** Gold-город в `plannedCities` → удаляется
2. **Инвариант #2:** Silver-город НЕ в `plannedCities` → добавляется
3. **Инвариант #3:** `checkedSights` для непосещённого города → удаляются
4. **Инвариант #4:** `milestones` для непосещённого города → удаляются
5. Все 4 инварианта вместе на одном state
6. Пустой state → инварианты не падают
7. Gold-город, который не должен быть в планах, не в планах → состояние не меняется
8. Silver-город, который уже в планах → состояние не меняется

> Инварианты #1/#2 проверяются **через** `loadStatePure` (именно там лежит логика `app.js` 793–804), который вызывает `getCityTierPure(id, next, SIGHTS)` на частично построенном `next`.

**Шаблон fixture для инвариантов (обязательно):** не синтезировать город с выдуманным `cityId`. Брать **реальные** данные из извлечённых модулей Phase A:
```js
import { CITIES, getCityById } from '../src/cities.js';
import { SIGHTS } from '../src/data-sights.js';
import { loadState } from '../src/lib/storage.js';

// Выбрать реальный город С чек-листом (есть в SIGHTS) для Gold/Silver,
// и реальный город БЕЗ чек-листа для Bronze/null:
const checklistCity = CITIES.find(c => SIGHTS[c.id]);        // напр. 'minsk'
const allSights = SIGHTS[checklistCity.id];                    // ['s0','s1',...]
const plainCity = CITIES.find(c => !SIGHTS[c.id]);             // напр. 'sluck'
```
- Gold-кейс: `visitedCities[checklistCity.id]`, `checkedSights[checklistCity.id] = [...allSights]` → инвариант #1 удаляет его из `plannedCities`.
- Silver-кейс: `checkedSights[checklistCity.id] = allSights.slice(0, 1)` (частично) → инвариант #2 добавляет в `plannedCities`.
- Подготовить исходный state в `localStorage.setItem(STORAGE_KEY, JSON.stringify({...}))`, затем `loadState({ storage: localStorage })`.
- Это гарантирует, что валидация `getCityById`/`CITIES`/`SIGHTS` внутри `loadState` не отбросит тестовые данные как невалидные.

#### Опционально: `tests/smoke.test.js`
- Проверка, что все 5 файлов из roadmap экспортируют ожидаемые имена (страховка от опечаток при извлечении).

### 3.8. Переезд `app.js` → `src/app/main.js`

> **Граница вмешательства в `main.js` (критично для агента):** DOM-логика, функция `init()`, обработчики событий, рендер-функции, маппинг обработчиков — **остаются как есть, символ в символ**. Меняется только:
> 1. Добавляются импорты в начало файла.
> 2. Создаются тонкие обёртки, передающие глобальный `state`/`SIGHTS` в pure-функции.
> 3. Удаляются **дублирующие определения** вынесенных функций/данных.
> 4. `state = loadStatePure(...)` (возврат) и обёртка `saveState()` (тост при `!ok`).
> 5. Удаляются мёртвые ветви `typeof SIGHTS === "undefined"` (§3.2.4).
>
> **Запрещено:** переписывать обработчики, менять алгоритм рендера, «улучшать» код, переименовывать внутренние переменные. Цель Phase A — поведение 1:1, а не рефакторинг. Любое отклонение фиксируется комментарием (как в §9) и отмечается в отчёте.

1. Скопировать `app.js` в `src/app/main.js`.
2. Добавить в начало импорты:
   ```js
   import { SIGHTS } from '../data-sights.js';
   import { CITIES, getCityById, REGIONS, REGION_ICONS, MAP, createStampSVG, projectToSVG, computeStarPoints } from '../cities.js';
   import { getTodayLocal } from '../lib/dates.js';
   import { escapeHtml } from '../lib/dom.js';
   import { getCityTier as getCityTierPure, getSightsCount as getSightsCountPure, hasChecklist as hasChecklistPure, getCheckedCount as getCheckedCountPure, getTierLabel, getTierEmoji } from '../lib/tier.js';
   import { generateChronicle, formatDateDisplay } from '../lib/chronicle.js';
   import { addMilestone as addMilestonePure, removeMilestone as removeMilestonePure, removeAllMilestones as removeAllMilestonesPure } from '../lib/milestones.js';
   import { loadState as loadStatePure, saveState as saveStatePure, STORAGE_KEY } from '../lib/storage.js';
   ```
3. **Удалить дублирующие определения** функций, перенесённых в `lib/` и `cities.js`.
4. **Создать обёртки**, которые передают глобальный state в pure-функции:
   ```js
   function getCityTier(cityId) { return getCityTierPure(cityId, state, SIGHTS); }
   function getSightsCount(cityId) { return getSightsCountPure(cityId, SIGHTS); }
   // и т.д.
   ```
5. **Специально для state-функций (см. §3.2.2/§3.2.3):**
   ```js
   // loadState возвращает объект — присваиваем; deps = только storage
   state = loadStatePure({ storage: localStorage });
   // saveState возвращает { ok, error } — тост при ошибке
   function saveState() {
     const res = saveStatePure(state, localStorage);
     if (!res.ok) showToast('Не удалось сохранить данные. Освободите место в браузере.');
   }
   ```
6. Удалить `STORAGE_KEY = "travelerPassport"` (теперь импортируется).
7. Удалить локальные определения `REGIONS`, `REGION_ICONS`, `MAP`, `createStampSVG`, `projectToSVG`, `computeStarPoints`, `CITIES`, `getCityById` (они импортируются).
8. **Проверить отсутствие дублей вынесенного кода** (механический grep — заменяет прежнюю проверку «на ~250 строк»):
   ```bash
   # Должно быть пусто (вынесенные функции/данные не дублируются в main.js):
   grep -nE "function getCityTier\b|function getSightsCount\b|function hasChecklist\b|function getCheckedCount\b|function getTierLabel\b|function getTierEmoji\b|function formatDateDisplay\b|function generateChronicle\b|function escapeHtml\b|function getTodayLocal\b|function loadState\b|function saveState\b|function addMilestone\b|function removeMilestone\b|function removeAllMilestones\b|function getCityById\b|function computeStarPoints\b|function projectToSVG\b|function createStampSVG\b|const REGIONS\b|const REGION_ICONS\b|const MAP\b|const CITIES\b" src/app/main.js
   ```
   Дополнительно убедиться, что импорты на месте: `grep -n "^import" src/app/main.js` содержит все 8 строк из п.2.

### 3.9. Обновление `index.html`

```diff
-  <script src="data-sights.js"></script>
-  <script src="app.js"></script>
-  <script>
-    if ('serviceWorker' in navigator) {
-      navigator.serviceWorker.register('sw.js');
-    }
-  </script>
+  <script type="module" src="/src/app/main.js"></script>
```

Inline-регистрация SW переезжает в `src/app/main.js` (внутрь `init()`), чтобы избежать проблем с порядком загрузки при ESM:

```js
// В конце init() в main.js:
// Регистрируем SW только в production: в dev Vite отдаёт трансформированные
// модули + HMR-клиент, кэширование которых ломает горячую перезагрузку.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
```

> ⚠️ **Gate `import.meta.env.PROD` обязателен.** Без него SW в `npm run dev` закэширует dev-артефакты Vite (HMR-инъекции, преобразованные ESM) и сломает HMR / даст «залипший» код. Код SW-обновления (`controllerchange` → toast) тоже должен выполняться только в PROD (вынести блок `app.js:2218–2227` под тот же gate).

> **Семантика module-скриптов:** `<script type="module">` defer'ится по умолчанию, поэтому `document.addEventListener("DOMContentLoaded", init)` (`app.js` 2216) корректно срабатывает. Изменений не требуется.

### 3.10. Service Worker (`public/sw.js`) — стратегия под хэшированную сборку Vite

> ⚠️ **Корректировка к исходной версии плана.** Первоначальный вариант предлагал hardcode-список `ASSETS` с путями `./src/*.js` + `style.css`. Это **нерабочее в production**: `npm run build` бандлит и хэширует (`dist/assets/main-[hash].js`, `dist/assets/style-[hash].css`), поэтому `./src/app/main.js` и `style.css` в `dist/` **не существуют** → `cache.addAll` падает на 404 (он all-or-nothing, см. описание §11) → `install` отказывает → **SW никогда не активируется → офлайн полностью мёртв**. В `npm run dev` это при этом «работает» (Vite отдаёт сырые `src/*`), создавая ложное ощущение успеха — поэтому §3.13 проходит, а §3.15 / smoke 10–11 падают.

**Принятая стратегия (минимальная, в духе Phase A):**
- **Precache только стабильные файлы без хэшей.** Хэшированные бандлы предкэшировать hardcode-путями нельзя — их имена меняются при каждой сборке.
- **Fetch-обработчик → cache-first с популяцией** (кэшировать ответ при первом network-запросе). Тогда хэшированные `assets/*-[hash].*` кэшируются автоматически — и offline работает и в dev, и в production.
- Текущий `sw.js:25–31` (`caches.match || fetch`) **не наполняет** кэш — это и есть корень проблемы; его обязательно исправить.

`public/sw.js`:

```js
var CACHE_NAME = 'traveler-passport-v4';
// Precache ТОЛЬКО стабильные ассеты (без content-hash в имени).
// index.html тоже валиден: Vite не хэширует сам HTML, он переписывает ссылки внутри.
var ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      // Если precache частично падает — не блокируем активацию:
      // хэшированные бандлы подтянутся runtime-кэшированием в fetch.
      .catch(function () { return self.skipWaiting(); })
  );
});

// Cache-first С ПОПУЛЯЦИЕЙ: первый запрос идёт в сеть и кэшируется.
// Это и закрывает хэшированные ассеты (main-[hash].js, style-[hash].css).
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        // Кэшируем только успешные (opaque/базовые) ответы, не POST/ошибки.
        if (!res || res.status !== 200 || res.type === 'error' || event.request.method !== 'GET') {
          return res;
        }
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copy); });
        return res;
      });
    }).catch(function () {
      // Сеть недоступна и в кэше нет — отдаём index.html как app-shell fallback
      // (или undefined, если и его нет).
      return caches.match('./');
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all([
        // Явное удаление legacy-кэша v3 (бывшее имя "belarus-passport-v3"):
        caches.delete('belarus-passport-v3'),
        // Общая чистка любых кэшей ≠ текущему:
        ...keys.filter(function (key) { return key !== CACHE_NAME; })
              .map(function (key) { return caches.delete(key); })
      ]);
    })
  );
  self.clients.claim();
});
```

**Ключевые отличия от оригинала:**
1. `ASSETS` сокращён до стабильных файлов; `style.css`, `app.js`, `data-sights.js`, `./src/*` **убраны** (их нет в `dist/` либо их имя меняется).
2. `install` ловит отказ `cache.addAll` → `skipWaiting()` всё равно срабатывает (не блокирует апдейт).
3. `fetch` теперь **наполняет** кэш (раньше — нет), что и обеспечивает кэширование хэшированных бандлов и офлайн после первого онлайн-захода.
4. Сетевой fallback отдаёт закэшированный `./` (app-shell), если конкретный запрос отсутствует.

> **⚠️ Приоритет источника — ПЛАН, не roadmap.** `roadmap.md` строка 102 называет legacy-кэш `'traveler-passport-v3'`, но реальный `sw.js:1` (и любой прошлый деплой) использует **`belarus-passport-v3`**. Поэтому `caches.delete('belarus-passport-v3')` — корректно. Сверено с реальным кодом. Если встретится расхождение «roadmap vs план vs код» — приоритет **код**, затем **план**, затем roadmap.

**Известный риск (см. `roadmap.md` строка 512):** старый кэш v3 может отдать 404 на новые пути. Решение выше гарантирует: `activate` нового SW всегда удаляет старый кэш **до** того, как новые запросы пойдут под новым SW; плюс runtime-популяция кэширует реально существующие пути `dist/`.

> **Trade-off:** офлайн работает **со второго захода** (нужен один онлайн-просмотр, чтобы хэшированные ассеты попали в кэш). Это стандартное поведение для cache-first-runtime-population и приемлемо для Phase A. Полный precache со стабильными именами — либо отключение хэшей (`rollupOptions.output.entryFileNames='[name].js'`, что ломает cache-busting и не рекомендуется), либо генерация precache-манифеста (плагин workbox/Vite — избыточно для Phase A). Оба варианта — вне скоупа.

**Smoke-тест (обязательно на production-сборке, НЕ dev):**
1. `npm run build` → `npm run preview`.
2. Открыть preview-URL онлайн → подождать активацию SW (DevTools → Application → Service Workers → activated).
3. Прогуляться по приложению (паспорт/карта/профиль), чтобы хэшированные ассеты попали в runtime-кэш (Application → Cache Storage → `traveler-passport-v4` содержит `main-[hash].js`, `style-[hash].css`).
4. DevTools → Offline → reload → приложение работает.
5. На устройстве с предыдущей версией: деплой v4 → reload → toast «Приложение обновлено» → офлайн работает.

### 3.11. `.gitignore`

Дополнить:
```
dist/
node_modules/
.vite/
coverage/
```

### 3.12. Перенос статических ассетов

Из корня в `public/`:
- `manifest.json`
- `icon-192.svg`
- `icon-512.svg`
- `sw.js` (см. §3.10)
- `covers/.gitkeep` (пустая директория, заготовка)

`index.html` и `style.css` **остаются в корне** (Vite root).

> **Пути в `manifest.json`:** после переезда иконок в `public/` проверить, что в собранном `dist/` иконки лежат в корне рядом с `manifest.json`, а ссылки в манифесте (`src` относительно манифеста) разрешаются. Smoke: DevTools → Application → Manifest → нет ошибок путей.

### 3.13. Проверка `npm run dev`

1. Запустить `npm run dev` — убедиться, что Vite поднимает dev-сервер.
2. Открыть `http://localhost:5173/` — приложение должно работать идентично v3.
3. Проверить в DevTools: в `<head>` подгружается `style.css`, в `<body>` — `<script type="module" src="/src/app/main.js">`.
4. Network tab: запросы за `./src/app/main.js`, `./src/data-sights.js`, `./src/cities.js`, `./src/lib/*.js`.
5. DevTools → Application → Manifest → нет ошибок путей иконок.
6. **SW НЕ регистрируется в dev** (gate `import.meta.env.PROD`): DevTools → Application → Service Workers → список пуст. Это нормально — SW проверяется только на production-сборке (§3.15).

### 3.14. Проверка `npm run build`

1. Запустить `npm run build` — Vite собирает `dist/`.
2. Проверить структуру `dist/`:
   - `index.html` (с `<script type="module" src="./assets/main-[hash].js">` и `<link ... href="./assets/style-[hash].css">`)
   - `assets/main-[hash].js` (бандл `main.js` + зависимости)
   - `assets/style-[hash].css` (Vite выделяет CSS и хэширует его)
   - `sw.js` (из public/)
   - `manifest.json` (из public/)
   - `icon-192.svg`, `icon-512.svg`
3. Проверить, что в `dist/index.html` пути относительные (`./assets/...`) — благодаря `base: './'` в конфиге.
4. **⚠️ Критично для SW (§3.10):** убедиться, что в `dist/` **нет** каталога `src/` и **нет** файла `style.css` без хэша. Именно поэтому precache-список SW сокращён до стабильных файлов, а бандлы кэшируются runtime.

### 3.15. Проверка `npm run preview` (production-сборка — здесь проверяется офлайн)

1. Запустить `npm run preview` — поднимается статический сервер на `dist/`.
2. Открыть в браузере — приложение работает.
3. DevTools → Application → Service Workers → активен `sw.js` (`traveler-passport-v4`).
4. **Прогуляться по приложению онлайн** (паспорт → карта → профиль), чтобы хэшированные бандлы `assets/*-[hash].*` попали в runtime-кэш. DevTools → Application → Cache Storage → `traveler-passport-v4` содержит `main-[hash].js`, `style-[hash].css` (а НЕ несуществующие `src/*.js`/`style.css`).
5. DevTools → Network → Offline → reload → **приложение продолжает работать** (если упало — §3.10 реализована неверно).
6. Поток обновления SW: внести изменение → `npm run build` → preview → reload → toast «Приложение обновлено».

---

## 4. Smoke-чеклист (из `roadmap.md`, прогоняется после фазы)

| # | Пункт | Как проверить |
|---|---|---|
| 1 | Первый запуск: онбординг → имя сохраняется | Чистый `localStorage` → открыть → ввести имя → reload → имя на месте |
| 2 | Паспорт: поиск, фильтры, аккордеоны | Открыть паспорт → кликнуть фильтры, ввести запрос, раскрыть регион |
| 3 | Карточка города → «Я здесь был» → дата → штамп/ранг | Тап на город → «Я здесь был» → выбрать дату → анимация штампа |
| 4 | Чек-лист: отметить → прогресс Бронза→Серебро→Золото | Тап на город с чек-листом → отметить 50% → Серебро; отметить 100% → Золото |
| 5 | Закладка «в планах» / «Доисследовать» | Тап на закладку; для Silver должна быть заглушка |
| 6 | Заметка по городу → автосохранение | Ввести текст → свернуть вкладку (visibilitychange) → переоткрыть → текст на месте |
| 7 | Карта: pan, zoom, клик, фильтры, 7 состояний маркеров | Открыть карту → проверить все 7 состояний по городам разных tier'ов |
| 8 | Профиль: статистика, ордена, хроника, смена имени | Открыть профиль → проверить счётчики 🥇🥈🥉 и хронику; сменить имя |
| 9 | Перезагрузка — данные на месте | После любых изменений — reload → всё сохранилось |
| 10 | Офлайн — работает | DevTools → Offline → приложение продолжает работать |
| 11 | Поток обновления SW | Пересобрать и задеплоить → reload → toast «Приложение обновлено» |
| 12 | Квота localStorage переполнена → тост | Мок `setItem` throws → тост «Не удалось сохранить…» появляется (поведение v3 сохранено, см. §3.2.3) |

---

## 5. Что НЕ входит в Phase A (явные границы)

| Не делаем | Почему |
|---|---|
| Распил по FSD-слоям (`shared/`, `entities/`, `features/`, `widgets/`, `app/`) | Phase B |
| Перенос `src/lib/*` → `src/shared/lib/` или `src/entities/*/` | Phase B |
| XSS-аудит | Phase B |
| Store с автосохранением | Phase C |
| Вынос features (visit, checklist, stamps, plan, search) | Phase D1 |
| Вынос widgets (passport, map, profile, city-card, onboarding) | Phase D2 |
| Удаление `app.js` (останется до Phase D2) | Phase D2 |
| Фича «Заметки» | Phase E |
| Network-first для HTML в SW | Phase F |
| Разделение `style.css` | Осознанный долг (Phase S3) |
| Использование алиасов `@app`, `@widgets`, … | Phase B |
| Оптимизация O(n) `getCityById` | Осознанное (57 городов — пренебрежимо, не регрессия) |

---

## 6. Риски и меры

| Риск | Вероятность | Мера |
|---|---|---|
| **DI для state ломает поведение** (забыли передать, мутация в pure-функции) | Средняя | Тесты round-trip + smoke-чеклист после сборки; контракт §3.2.2 (возврат объекта) |
| **`loadState` забыт импорт `getCityTier`** → инварианты Gold/Silver не работают | Средняя | Граф импортов зафиксирован §3.2.1; `grep -rn "import" src/lib/` контроль |
| **`showToast` пропадает из `saveState` catch** → регрессия UX | Средняя | Контракт §3.2.3: обёртка в `main.js` показывает тост при `!ok` |
| **`activate` SW не удаляет старый кэш → 404 на новые пути** | Средняя | Явный `caches.delete('belarus-passport-v3')` + smoke на реальном устройстве |
| **SW precache падает на 404 для хэшированных бандлов** (главный риск после правок) | Высокая (если оставить hardcode `src/*`/`style.css`) | Precache сокращён до стабильных файлов + fetch-обработчик наполняет кэш runtime (§3.10); smoke на production-сборке (§3.15) обязателен |
| **SW кэширует dev-артефакты → ломает HMR** | Средняя | Регистрация SW под gate `import.meta.env.PROD` (§3.9) |
| **Vite собирает `main.js` бандлом с другим `scope` для SW** | Низкая | `sw.js` остаётся в `public/` (не бандлится) → scope = `./` |
| **`escapeHtml` ломается под jsdom** | Низкая | Smoke-тест в браузере + jsdom-тест на основные XSS-векторы |
| **Тесты на `loadState` медленные из-за jsdom** | Низкая | jsdom init ~200мс; для 30 тестов это ~6 секунд — приемлемо |
| **§0 не выполнен → утечка токена при коммите** | Высокая (если пропустить) | Блокирующая проверка перед стартом Phase A |
| **Vite переписывает `<script type="module">` в HTML** | Очень низкая | Vite ожидает `<script type="module">` в HTML для entry-point — это его нативный формат |

---

## 7. Критерии «готово» (Phase A)

### Обязательные
- [ ] `npm run dev` стартует, приложение работает идентично v3
- [ ] `npm run build` собирает `dist/` без ошибок
- [ ] `npm run preview` поднимает статику из `dist/`
- [ ] `npm run test:run` зелёный, все 5 файлов тестов проходят (≥25 кейсов)
- [ ] `index.html` подключает `main.js` через `<script type="module">`
- [ ] `sw.js` обновлён: `CACHE_NAME='traveler-passport-v4'`, precache только стабильных файлов, fetch с runtime-популяцией кэша, явное удаление legacy v3, gate регистрации под `import.meta.env.PROD`
- [ ] Офлайн работает **в production-сборке** (`npm run preview`): Cache Storage содержит хэшированные `assets/*-[hash].*`, НЕ `src/*`/`style.css`
- [ ] Статические ассеты перенесены в `public/`; DevTools → Manifest без ошибок путей
- [ ] `package.json` содержит `vitest`, `vite`, `jsdom` в devDependencies + 5 scripts
- [ ] `.gitignore` дополнен (`dist/`, `node_modules/`, `.vite/`, `coverage/`)
- [ ] `grep -rn "typeof SIGHTS" src/` — пусто (мёртвые ветви удалены, см. §9)
- [ ] `grep -rn "import" src/lib/` — направленный граф без колец (см. §3.2.1)
- [ ] `grep -rn "serviceWorker" src/app/main.js` — регистрация под `import.meta.env.PROD` (нет безусловной регистрации SW)
- [ ] Smoke-чеклист пп. 1–12 пройден

### Желательные
- [ ] Дополнительный `tests/smoke.test.js` (проверка экспортов)
- [ ] Покрытие строк >70% для `src/lib/*.js` (Vitest coverage)

### Зафиксированные долги (явно вне Phase A)
- `style.css` остаётся монолитом
- Алиасы `@app/@widgets/...` объявлены, но не используются
- FSD-структура не создана

---

## 8. Порядок выполнения (для implementation-агента)

1. **Пререквизит §0** — безопасность (**выполняется человеком, НЕ агентом**; см. §0). Перед стартом шага 2 агент проверяет `grep -r "pv1_8G2D" .` — если непусто, останавливается и сообщает. В `.gitignore` правила добавляются на шаге §3.11.
2. **Создать feature-ветку** `s1-phase-a` от `main` (после §0).
3. Шаги 1–7 (по roadmap): установить deps → конфиги → извлечение → тесты → переезд → sw.js → проверка.
4. Smoke-чеклист.
5. Аннотированный тег: `git tag -a s1-phase-a -m "S1 Phase A: Vitest + Vite + ESM"`.
6. Push в ветку; PR в `main` НЕ открывается до завершения всего S1 (см. `roadmap.md §Стратегия ветвления`).

> **Важно:** Phase A деплоится только локально (`npm run preview`) + на throwaway-хостинге. Production-деплой — после полного S1.

> **Правило приоритета источников для агента:** при любом расхождении между планом/`app-description_v3.md` и **реальным кодом `app.js`** — воспроизводить **код**. Цель Phase A — «поведение без изменений», код — источник истины. Любое осознанное отклонение фиксировать комментарием в коде (как в §9) и явно отметить в отчёте.

---

## 9. Зафиксированные осознанные отклонения от поведения v3

| Отклонение | Где | Почему безопасно |
|---|---|---|
| **Удалены ветви `typeof SIGHTS === "undefined"`** | `loadState` (`app.js` 736), `getSightsCount` (`app.js` 593) | В ESM `SIGHTS` всегда импортируется. Поведение строже: всегда полная валидация по `SIGHTS` вместо «доверять старым данным при отсутствии файла». Bundler гарантирует наличие модуля. Это **единственное** поведение-отклонение Phase A; см. комментарий в коде (§3.2.4). |

---

## 10. Шпаргалка по именам (для переезда в Phase B)

Чтобы Phase B был механическим переездом, **все имена и сигнатуры Phase A уже совпадают с будущими слоями**:

| Phase A | Phase B (целевое) |
|---|---|
| `src/lib/tier.js` | `src/entities/city/tier.js` или `src/shared/lib/tier.js` |
| `src/lib/chronicle.js` | `src/features/chronicle/` или `src/widgets/profile/chronicle.js` |
| `src/lib/dom.js` | `src/shared/lib/dom.js` |
| `src/lib/storage.js` | `src/app/store.js` (фаза C) |
| `src/lib/milestones.js` | `src/features/checklist/milestones.js` |
| `src/lib/dates.js` | `src/shared/lib/dates.js` |
| `src/cities.js` | `src/entities/city/index.js` |
| `src/data-sights.js` | `src/entities/sight/index.js` |
| `src/app/main.js` | остаётся `src/app/main.js` (тонкий скелет в Phase D2) |
