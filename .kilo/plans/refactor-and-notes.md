# План S1: рефакторинг монолита + фича «Заметки»

> Слияние `refactor-appjs-to-esmodules.md` + `mvp-stage1-refactor-and-notes.md`.
> Связанные схемы: `docs/01-current-state`, `02-target`, `03-evolution`, `04-notes`.

---

## 1. Контекст

PWA «Паспорт путешественника по Беларуси» — vanilla JS, без сборщика, без фреймворка.

- `app.js` — **монолит ~2000 строк / 94 КБ**: данные, состояние, рендер, карта
  (pan/zoom/pinch), карточка города, профиль, date-picker, onboarding, события, SW.
- `init()` — ~315 строк сплошных `addEventListener` (~180 — pan/zoom/pinch).
- `style.css` ~1400 строк, `index.html` ~109 строк, `sw.js` (cache-first), `data-sights.js`.
- `CITIES` (57), `REGIONS`, `REGION_ICONS`, `MAP` — захардкожены в `app.js`.

### Корневые проблемы
1. Всё в одном файле, всё глобально.
2. Глобальный `let state`, прямой доступ; `saveState()` вручную → забыл = потеря.
3. Ручная синхронизация рендера → пропустил = рассинхрон.
4. Рендер через конкатенацию; `escapeHtml` непоследователен → риск XSS.
5. Нет границ → зависимости во все стороны.

---

## 2. Архитектурные решения

### Стратегия: нативные ESM + FSD-подмножество
Статическая PWA уже работает офлайн. ESM решает проблему монолита с минимальным
риском. Структура — **5-слойное подмножество FSD**: `shared / entities / features /
widgets / app`, импорты строго вниз. Полный FSD (7 слоёв) — оверкилл для 3–4 вкладок;
плоская структура — нет защиты от спагетти. Выбранный вариант масштабируется и
оставляет путь «дорасти» до полного FSD.

### Правило импортов (ядро FSD)
`app → widgets → features → entities → shared` — только вниз. Импорты «вверх» и
«боковые» (между слайсами одного слоя) — запрещены. Каждый слайс экспортирует
public API через `index.js`. Контроль: ручной на code review; линтер границ — позже.

### Состояние
- `shared/lib/store-mechanism.js` — **чистый** `createStore()` (без знания домена).
- `app/store.js` — экземпляр + `loadState`/`saveState` + миграция (импортит entities
  для валидации — имеет право, верхний слой).
- `entities` — **чистые** функции, state аргументом (`getCityTier(state, cityId)`).
- `widgets`/`features` — store через DI в `init(store)`.
- `setState` **автосохраняет** в localStorage (после валидации).
- `subscribe` — виджеты сами перерисовываются.
- Существующую валидацию/миграцию `loadState` перенести **as-is** (Gold-инвариант,
  дедупликация milestones — уже качественные).

---

## 3. Структура модулей

```
src/
├── app/
│   ├── main.js               точка входа: load → init(widgets) → switchTab → SW
│   └── store.js              store + loadState/saveState/миграция
├── shared/
│   ├── lib/
│   │   ├── store-mechanism.js  createStore() — чистый
│   │   ├── dom.js              escapeHtml, qs/qsa, showToast
│   │   └── format.js           даты, normalizeForSearch, плюрализация
│   └── config/
│       └── map-config.js       MAP (viewBox, границы)
├── entities/
│   ├── city/                 CITIES, getCityById, getCityTier, getSightsCount
│   ├── region/               REGIONS, REGION_ICONS, createStampSVG
│   ├── sight/                SIGHTS
│   └── note/                 ← NEW (фаза E)
├── features/
│   ├── visit/                toggle/confirm/remove + date picker
│   ├── checklist/            toggleSight
│   ├── stamps/               stamp overlay, milestones
│   ├── plan/                 togglePlanned
│   ├── search/               поиск/фильтры passport
│   └── notes/                ← NEW (фаза E)
├── widgets/
│   ├── passport-list/        renderPassport, поиск, фильтры
│   ├── map/                  projection, markers, pan/zoom/pinch, labels
│   ├── profile/              статистика, ордена, хроника
│   ├── city-card/            композит: visit+checklist+plan+stamps
│   ├── onboarding/           первый запуск
│   ├── notes-list/           ← NEW (фаза E)
│   └── note-editor/          ← NEW (фаза E)
```

---

## 4. План фаз (каждая = deployable, поведение сохраняется)

### Phase 0 — Безопасность
- Удалить `conf` из репозитория, `.gitignore`, ротация токена.
- Зафиксировать smoke-чеклист (§7) как базовую регрессию.

### Phase A — Vite + ESM (поведение без изменений)
- Внедрить Vite (dev-сервер + сборка).
- `app.js` → `src/app/main.js` (пока монолитом, но как модуль).
- `index.html`: `<script type="module" src="src/app/main.js">`.
- `data-sights.js` → ESM-экспорт (`export const SIGHTS`), убрать второй `<script>`.
- `sw.js`: bump `CACHE_NAME`; обновить `ASSETS` (новые пути).
- **Проверить:** офлайн + поток обновления SW.

### Phase B — Чистые слои (shared + entities)
- Вынести `shared/lib/` (store-mechanism, dom, format), `shared/config/map-config`.
- Вынести `entities/city`, `region`, `sight` — данные + чистые функции (state аргументом).
- Заменить глобальные обращения на `import`. Импорты строго вниз.

### Phase C — app/store.js (самый delicate)
- Экземпляр store + `loadState`/`saveState`/миграция (as-is).
- `setState` автосохраняет; `subscribe` для перерисовки.
- Заменить глобальный `state` и ручные `saveState()` на store API.
- Полный smoke-тест: изменения переживают перезагрузку.

### Phase D — Распил features + widgets
- Вынести features (visit, checklist, stamps, plan, search) и widgets (passport-list,
  map, profile, city-card, onboarding).
- Каждый экспортирует `init(store)` и сам регистрирует слушатели.
- `app/main.js init()` вызывает их по порядку → ~315 строк → ~30.
- DI: app передаёт store в `init(store)`. public API (`index.js`).
- Pan/zoom/pinch (touch/mouse/wheel) целиком → `widgets/map`.
- **`app.js` удаляется.**

### Phase E — Фича «Заметки»

**Модель данных:**
```
note = {
  id, title, body, cityId?, tags?,
  createdAt: "YYYY-MM-DD", updatedAt: "YYYY-MM-DD"
}
state.notes = { [id]: note }
```

**Миграция cityNotes → notes** (один раз при `loadState`):
1. Если `cityNotes` есть, а `notes` нет → для каждого `cityId` создать note
   `{ id, title: <имя города>, body: cityNotes[cityId], cityId, createdAt/updatedAt = сегодня }`.
2. Удалить `cityNotes`, bump версии схемы, сохранить.

**Модули:**
| Слой | Модуль | Ответственность |
|---|---|---|
| entities/note | schema, isValidNote, getNoteById, listNotes (чистые) |
| features/notes | createNote, updateNote, deleteNote, searchNotes, getCityNote (мутации store + save) |
| widgets/notes-list | вкладка: список (сорт. updatedAt ↓), поиск, фильтр, пустое состояние, «+ новая» |
| widgets/note-editor | fullscreen overlay: title/body/city/tags, autosave (debounce), «удалить» |
| widgets/city-card | (существ.) textarea = быстрая заметка → features/notes; ссылка «открыть в редакторе» |
| app/store | +state.notes, миграция |

**Потоки:**
1. Вкладка: «+» → createNote → открыть редактор. Поиск по title/body.
2. Редактор: autosave (debounce, как текущая заметка). Удалить → confirm → deleteNote.
3. Карточка города: textarea обновляет note с cityId (создаётся при первом символе).
   Ссылка открывает full-редактор с той же заметкой.

### Phase F — Рендер + безопасность + SW (опционально)
- `html +=` → шаблонные строки во всех render-функциях.
- Аудит: все интерполяции контента через `escapeHtml`.
- `sw.js`: network-first для навигации/HTML, cache-first для ассетов — обновления
  приземляются быстрее (актуальная проблема cache-first).

---

## 5. Риски и меры

| Риск | Мера |
|------|------|
| Ловушка кэша SW: cache-first отдаёт устаревший index.html | Bump версии кэша; проверка потока обновления (A); network-first для HTML (F) |
| Циклические импорты между слайсами | Правило направленных импортов + public API; общую логику поднимать в entities/features |
| Регрессия loadState (инварианты) | Перенос as-is; smoke-тест миграции на реальных данных |
| Потеря данных при ошибке store | Автосохранение только после валидации; catch с toast |
| ESM + strict: var-глобалы исчезают в модуле | После A пройти по var-объявлениям; объявить как let/const или экспортировать |
| DI store — забыть прокинуть | Единая сигнатура `init(store)`; app собирает в одном месте |

---

## 6. Capacitor (опционально, конец S1)

После стабилизации веб-версии — обернуть в Capacitor (статусбар, сплэш, иконки) +
сборка APK/AAB для внутреннего теста. Без платёжной/аккаунтной логики. Публикация
в сторы и IAP — S2. Если отложить — весь MVP остаётся чистым PWA.

---

## 7. Smoke-чеклист (прогонять после каждой фазы)

1. Первый запуск: onboarding, ввод имени → сохраняется.
2. Паспорт: поиск, фильтры (Все/Посещённые/Непосещённые/В планах), аккордеоны.
3. Карточка города → «Я здесь был» → дата → штамп/ранг.
4. Чек-лист: отметить пункты → прогресс Бронза→Серебро→Золото.
5. Закладка «в планах» / «доисследовать».
6. Заметка по городу → автосохранение (visibilitychange/pagehide).
7. Карта: pan (мышь+тач), zoom (кнопки+колесо+pinch), клик → карточка, фильтры.
8. Профиль: статистика, ордена, хроника, смена имени.
9. **Перезагрузка** — все изменения на месте (localStorage).
10. Офлайн (DevTools → Offline) — работает из кэша.
11. Поток обновления: деплой → reload → toast «обновлено», новый код активен.
12. **Заметки (фаза E):** создать, отредактировать, удалить, найти через поиск.
13. **Быстрая заметка** в карточке города ↔ редактор синхронны.
14. **Миграция:** старые `cityNotes` → `notes` корректно.
15. Импорт старого дампа (v0) не падает.
16. В `conf`/репо нет утёкшего токена.

---

## 8. Открытые вопросы

- Phase F (network-first SW) — рекомендую да (cache-first ухудшает доставку обновлений).
- Линтер границ импортов — отложить (ручной контроль); добавить при росте команды.
- Вынос `CITIES`/`SIGHTS` в `.json` с fetch — пока JS-модули (проще для офлайна).
- Автотесты (Vitest) — отсутствуют; план опирается на ручной smoke-чеклист.
