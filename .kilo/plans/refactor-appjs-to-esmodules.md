# План рефакторинга: `app.js` → модульная FSD-inspired архитектура

## Контекст и текущее состояние

PWA «Паспорт путешественника по Беларуси» — vanilla JS, без сборщика, без фреймворка. Статические файлы + Service Worker (cache-first).

- `app.js` — **монолит 2011 строк / 94 КБ**, смешивает 8+ слоёв: данные, карта (рендер + pan/zoom/pinch), состояние, рендер passport/карточки/профиля, date picker, onboarding, stamps, связывание событий, логика SW.
- `style.css` (25 КБ), `index.html` (109 строк, статичная оболочка), `sw.js` (cache-first v2), `data-sights.js` (4 КБ).
- `CITIES` (57 городов), `REGIONS`, `REGION_ICONS`, `MAP` — захардкожены в `app.js`.
- `init()` — ~315 строк сплошных `addEventListener`; ~180 из них — логика pan/zoom/pinch.

### Корневые проблемы
1. Монолит: все слои в одном файле, всё в глобальной области видимости.
2. Глобальный изменяемый `let state`, прямой доступ отовсюду; `saveState()` вручную после каждой мутации → легко забыть = потеря данных.
3. Ручная синхронизация рендера (`renderPassport` + `updateMapMarkers` + `updateMapFilter` + `renderProfile` вручную) → легко пропустить.
4. Рендер HTML через конкатенацию строк; `escapeHtml` непоследователен → риск XSS.
5. Данные смешаны с логикой; нет защиты от циклических зависимостей между фичами.

### ⚠️ Критично (Phase 0, независимо от рефакторинга)
Файл `conf` в корне репозитория содержит **учётные данные git / токены в открытом виде**. Удалить файл, добавить в `.gitignore`, ротировать токен. В истории git токен уже есть — считать скомпрометированным.

---

## Решения архитектора (приняты)

### Стратегия: нативные ES-модули, без сборщика + FSD-inspired слоистая структура
Обоснование: статическая PWA, уже работает офлайн через SW; нативный ESM решает корневую проблему (монолит) с минимальным риском и без новых зависимостей. Структура — **подмножество FSD** (Feature-Sliced Design): слои `shared / entities / features / widgets / app` с однонаправленными импортами. Полный строгий FSD (7 слоёв + processes/pages + линтер границ) отклонён как оверкилл для 3 вкладок; плоские feature-folders отклонены — нет защиты от спагетти зависимостей. Выбранный вариант масштабируется и оставляет путь «дорасти» до полного FSD. Позже Vite/TypeScript добавляется тривиально.

### Решение 1. Структура слоёв и модулей
```
src/
  app/
    main.js           — точка входа: loadState, вызовы init*(store), регистрация SW, switchTab
    store.js          — экземпляр store + loadState/saveState/миграция (импортит entities для валидации)
  shared/
    index.js          — public API переэкспорт
    lib/
      store-mechanism.js — чистый createStore(): getState/setState/subscribe (без знаний о домене)
      dom.js          — escapeHtml, qs/qsa, showToast
      format.js       — getTodayLocal, formatDateDisplay, normalizeForSearch, getPluralSights
    config/
      map-config.js   — MAP (viewBox, geo-границы)
  entities/
    city/index.js     — CITIES, getCityById, getSightsCount, hasChecklist, getCityTier (чистые, state как аргумент)
    region/index.js   — REGIONS, REGION_ICONS, getRegionById, createStampSVG
    sight/index.js    — SIGHTS (импорт из data-sights.js → ESM)
  features/
    visit/index.js    — toggle/confirm/remove visit + date picker (init(store))
    checklist/index.js— toggleSight, прогресс чек-листа
    stamps/index.js   — stamp overlay, goToCollection, milestones
    plan/index.js     — togglePlanned
    search/index.js   — поиск/фильтры passport (UI-состояние фильтров)
  widgets/
    city-card/index.js — compose (visit+checklist+plan+stamps): renderCityCard, renderChecklist (init(store))
    passport-list/index.js — renderPassport, buildFilterAccordions, buildSearchResults, handlePassportClick
    map/index.js      — projection, initMapPoints, updateMapMarkers/Filter, pan/zoom/pinch, labels (init(store))
    profile/index.js  — renderProfile, смена имени
    onboarding/index.js — show/hide/continue/skip
```
Слои страниц (`pages`) и `processes` осознанно **опущены** — вкладок всего 3, сборку делает `app/main.js`.

### Решение 2. Правило однонаправленных импортов (ядро FSD)
`app → widgets → features → entities → shared` (можно импортировать только строго вниз). Импорты «вверх» или «боковые» (между слайсами одного слоя) — запрещены. Каждый слайс экспортирует только public API через `index.js`. Контроль: ручной на code review; линтер границ (`eslint-plugin-import`/`eslint-plugin-boundaries`) — опционально позже.

### Решение 3. Размещение глобального состояния (дилемма FSD, разрешена)
- `shared/lib/store-mechanism.js` — **только механизм** `createStore` (чистый).
- `app/store.js` — **экземпляр** + `loadState`/`saveState` + миграция (импортирует `entities` для валидации). Верхний слой → имеет право импортировать всё ниже. ✓
- `entities` — **чистые** доменные функции, `state` как аргумент (`getCityTier(state, cityId)`); store не импортируют. ✓
- `widgets`/`features` — получают экземпляр store через **DI** в свой `init(store)`; состояние через `store.getState()`/`store.subscribe()`. Никаких импортов «вверх».
- `setState` **автоматически персистит** в localStorage (после успешной валидации) → устраняет класс багов «забыл saveState».
- `subscribe` → view перерисовываются при релевантных изменениях → устраняет ручную мульти-синхронизацию.
- Существующую логику валидации/миграции `loadState` перенести **as-is** (Gold-инвариант, дедупликация milestones и т.д. — она качественная).

### Решение 4. Рендеринг (без смены парадигмы)
- Конкатенация `html +=` → шаблонные строки (backticks).
- Повторяющиеся SVG/фрагменты → мелкие render-функции в своих виджетах.
- **Все пользовательские/контентные данные — через `escapeHtml`** (обязательный аудит покрытия).

---

## План миграции (инкрементальный, каждый шаг = deployable, поведение сохраняется)

### Phase 0 — Безопасность
- Удалить `conf` из репозитория, добавить в `.gitignore`, ротировать токен.
- Зафиксировать ручной smoke-чеклист (см. «Проверка») как базовую регрессию для всех фаз.

### Phase 1 — Переход на ESM (поведение без изменений)
- Создать `src/app/main.js`, переместить содержимое `app.js` (пока монолитом, но как модуль).
- `index.html`: `<script src="app.js">` → `<script type="module" src="src/app/main.js">`.
- `data-sights.js` → ESM-экспорт (`export const SIGHTS`), подключается через `import` (убрать второй `<script>`).
- `sw.js`: bump `CACHE_NAME` → `belarus-passport-v3`; обновить `ASSETS` (новые пути).
- **Проверить:** офлайн и поток обновления SW (старый юзер → reload → новый SW → новый код).

### Phase 2 — Вынести `shared` и `entities` (чистые, без DOM)
- `shared/lib/` (store-mechanism, dom, format), `shared/config/map-config`.
- `entities/city`, `entities/region`, `entities/sight` — данные + чистые доменные функции (state как аргумент).
- Заменить глобальные обращения на `import`. Поведение без изменений. Импорты строго вниз.

### Phase 3 — Ввести `app/store.js` (самый delicate шаг)
- Экземпляр store (на механизме из shared) + `loadState`/`saveState`/миграция (as-is).
- `setState` автосохраняет; `subscribe` для перерисовки.
- Заменить глобальный `state` и ручные `saveState()` на store API (пока прямой доступ, DI — в Phase 4).
- Полный smoke-тест: изменения переживают перезагрузку.

### Phase 4 — Распил `features` + `widgets`, декомпозиция `init()`
- Вынести features (visit, checklist, stamps, plan, search) и widgets (city-card, passport-list, map, profile, onboarding).
- Каждый экспортирует `init(store)` и сам регистрирует свои слушатели; `app/main.js init()` вызывает их по порядку → shrinkingется с ~315 до ~30 строк.
- Завести DI: app передаёт store в `init(store)`. Применить правило направленных импортов и public API (`index.js`).
- Логика pan/zoom/pinch (touch/mouse/wheel) целиком уезжает в `widgets/map`.

### Phase 5 — Рендер на шаблонных строках + аудит безопасности
- `html +=` → backticks во всех render-функциях.
- Аудит: все интерполяции контента прошли `escapeHtml`.

### Phase 6 (опционально) — Сглаживание обновлений SW
- `sw.js`: **network-first для навигации/HTML**, cache-first для ассетов — обновления приземляются быстрее (актуальная проблема cache-first).

---

## Риски и меры

| Риск | Мера |
|------|------|
| **Ловушка кэша SW**: cache-first отдаёт устаревший `index.html` со ссылками на новые пути → сломанный UI | Bump версии кэша; явная проверка потока обновления (Phase 1); Phase 6 — network-first для HTML |
| Циклические импорты между слайсами одного слоя (map ↔ city-card ↔ passport-list) | Правило направленных импортов + public API; общую логику поднимать в entities/features |
| Регрессия в `loadState` (инварианты: Gold-города, дедупликация milestones, проверка checkedSights) | Перенос as-is без переписывания; smoke-тест миграции на реальных сохранённых данных |
| Потеря данных пользователя при ошибке store | Автосохранение только после успешной валидации; catch с toast (как сейчас) |
| ESM + строгий режим: `var`-глобалы верхнего уровня исчезают в модуле | После Phase 1 пройти по `var`-объявлениям верхнего уровня; объявить как `let`/`const` внутри модулей или экспортировать |
| DI store в `init(store)` — забыть прокинуть | Единая сигнатура `init(store)` у всех виджетов/фич; app собирает их в одном месте |

## Проверка (ручной smoke-чеклист — прогонять после каждой фазы)
1. Первый запуск: onboarding, ввод имени → сохраняется.
2. Passport: поиск по названию; фильтры Все/Посещённые/Непосещённые/В планах.
3. Карточка города → «Я здесь был» → выбор даты → штамп/тир.
4. Чек-лист достопримечательностей: отметить несколько → прогресс Silver/Gold (тир-инвариант).
5. Добавить/снять закладку «в планах».
6. Заметка по городу → автосохранение (visibilitychange / pagehide).
7. Карта: pan (мышь + тач), zoom (кнопки + колесо + pinch), клик по точке → карточка, фильтры карты.
8. Профиль: статистика, смена имени, коллекция штампов.
9. **Перезагрузка страницы** — все изменения переживают её (localStorage).
10. Офлайн (DevTools → Offline) — работает из кэша SW.
11. Поток обновления: деплой новой версии → reload → toast «Приложение обновлено», новый код активен.

## Открытые вопросы (за рамками / на усмотрение реализации)
- Включать ли Phase 6 (network-first) сейчас — рекомендую да (cache-first ухудшает доставку обновлений).
- Линтер границ импортов — отложить (ручной контроль на code review); добавить при росте команды.
- Вынос `CITIES`/`SIGHTS` в `.json` с fetch — пока JS-модули (проще для офлайна).
- Автотесты (Vitest) отсутствуют; план опирается на ручной smoke-чеклист — отдельная инициатива.

## Примечание
План — архитектурный. Реализация правок исходников требует переключения на агента, способного редактировать код.
