## Контекст

Прочитай следующие документы перед началом работы — они содержат спецификацию v2 и план реализации:

1. **Описание текущего приложения (v1):** `F:\projects\traveler-passport\.kilo\plans\MVP_v1\app-description.md` — детальный разбор всех функций, стилей, модели данных, структуры HTML. Это твой справочник по существующему коду.

2. **Концепция v2:** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\MVP_v2.md` — глобальные изменения: удаление Каталога, 3 вкладки, wishlist, заметки, новые фильтры.

3. **План реализации v2:** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\implementation-plan.md` — этот этап описан в секции «Этап 2. Паспорт: поиск, фильтры, плоский список».

**Что уже сделано (Этап 1):**
- Каталог удалён. Таб-бар содержит 3 вкладки: Паспорт, Карта, Профиль
- В `state` добавлены `plannedCities: {}`, `cityNotes: {}`, `passportFilter: "all"`, `passportSearchQuery: ""`
- Удалены `catalogFilter`, `catalogSearchQuery`, `renderCatalog()`, `handleCatalogClick()`
- В HTML добавлены `.passport-controls` с поиском и 4 фильтр-кнопками, `#tab-bar` обновлён
- В CSS добавлены базовые стили для `.passport-controls` (временно, будут заменены в этом этапе)
- `renderPassport()` и `handlePassportClick()` существуют и работают (аккордеоны без фильтрации)

---

## Задачи

### 1. app.js — функция нормализации поиска

Создать вспомогательную функцию `normalizeForSearch(str)` для нормализации строк перед сравнением. Используется при поиске — и для запроса пользователя, и для названий городов.

**Порядок нормализации (строгий, каждая операция применяется к результату предыдущей):**
1. Привести к нижнему регистру (`toLowerCase()`)
2. Заменить `ё` на `е`
3. Заменить `і` на `и`
4. Заменить `ў` на `в`
5. Удалить дефисы (`-`) и пробелы (заменить на пустую строку)
6. Вызвать `.trim()` для отсечения краевых пробелов

**Примеры:**
- `"Марьина Горка"` → `"марьинагорка"`
- `"Мёры"` → `"меры"`
- `"Іўе"` → `"иве"`
- `"доб-руш"` → `"добруш"`
- `"  Брест  "` → `"брест"`

Функция должна быть чистой (pure), без побочных эффектов.

### 2. app.js — переписать `renderPassport()`

Текущая `renderPassport()` (строки ~543–596) рендерит аккордеоны для всех регионов со всеми городами. Необходимо переписать её с поддержкой двух режимов: **поиск** и **фильтр**.

**Общая логика:**
1. Обновить счётчик `#passport-count` — «X из 57» (без изменений)
2. Проверить `state.passportSearchQuery`:
   - Если непустая → режим поиска (плоский список)
   - Если пустая → режим фильтра (аккордеоны)

#### Режим поиска (`passportSearchQuery !== ""`)

- Рендерить плоский список с классом `.passport-search-results` внутри `#passport-list`
- Отфильтровать все CITIES: `normalizeForSearch(city.name).includes(normalizeForSearch(query))`
- Для каждого совпадения создать строку `.passport-search-result`:
  ```html
  <div class="passport-search-result" data-city-id="{cityId}">
    <div class="passport-search-icon" style="color: {regionColor или #ccc}">
      {createStampSVG(regionId)}
    </div>
    <span class="passport-search-name">{cityName}</span>
    <span class="passport-search-status">{статусная иконка}</span>
  </div>
  ```
- **Статусная иконка** (правая часть строки):
  - Посещённый город → зелёный чекмарк (CSS-галочка или SVG-иконка `✓`)
  - Город в планах → маленький SVG-флажок (для консистентности с маркерами на карте в этапе 4)
  - Непосещённый и не в планах → пустое место (нет иконки)
- Если 0 результатов → показать `<div class="passport-search-empty">Ничего не найдено</div>`
- Тап по строке → `openCityCard(cityId)` (через делегирование)

#### Режим фильтра (`passportSearchQuery === ""`)

- Рендерить аккордеоны по регионам (как текущая реализация), но с фильтрацией
- Для каждого региона фильтровать `citiesInRegion` по `state.passportFilter`:
  - `"all"` — все города (текущее поведение)
  - `"visited"` — только города, где `state.visitedCities[id]` существует
  - `"unvisited"` — только города, где `state.visitedCities[id]` **не** существует
  - `"planned"` — только города, где `state.plannedCities[id]` существует
- **Скрытие пустых регионов:** если после фильтрации в регионе 0 городов — **не рендерить** аккордеон этого региона вообще (пропустить в цикле)
- **Счётчик в аккордеоне:** `accordion-count` должен показывать «X из Y» где X = отфильтрованные посещённые (не зависит от фильтра — всегда считаем посещённые), Y = всего городов в регионе
- **Глобальный empty state:** если после фильтрации **все** регионы пусты (ни одного аккордеона не отрендерено) → показать заглушку вместо аккордеонов:
  - `passportFilter === "planned"` при 0 запланированных: `«Нет городов в планах. Откройте карточку города и нажмите «Хочу поехать»»`
  - `passportFilter === "visited"` при 0 посещённых: `«Здесь появятся города, которые вы посетите»`
  - `passportFilter === "unvisited"` при 57/57: `«Ура! Вы прошли всю Беларусь!»`
  - Для `"all"` — empty state невозможен (всегда 57 городов)

**Transition при переключении режимов:**
Fade-анимация нужна **только при смене режима** (search ↔ filter), а не при каждом вызове `renderPassport()`. Иначе закрытие карточки города вызовет моргание всего списка.

Добавить переменную уровня модуля: `var currentPassportMode = "filter";` (`"filter"` или `"search"`).

В начале `renderPassport()` определить новый режим:
```js
var newMode = state.passportSearchQuery !== "" ? "search" : "filter";
```

Логика рендера:
- Если `newMode !== currentPassportMode`:
  1. `container.style.opacity = "0"` (fade-out)
  2. Через 150мс (setTimeout): заменить `container.innerHTML`, `container.style.opacity = "1"` (fade-in)
  3. Обновить `currentPassportMode = newMode`
- Если `newMode === currentPassportMode`:
  - Просто заменить `container.innerHTML` без fade (обновление данных, без визуального скачка)

Контейнер `#passport-list` должен иметь CSS `transition: opacity 150ms ease`.

### 3. app.js — обновить `handlePassportClick()`

Текущая функция (строки ~598–623) обрабатывает клики по аккордеонам и штампам. Необходимо расширить:

- Клик по `.passport-search-result` → `openCityCard(cell.dataset.cityId)`
- Существующая логика аккордеонов и штампов остаётся без изменений

### 4. app.js — обработчики событий

**Все обработчики навешиваются в `init()` через делегирование.**

#### 4.1. Фильтр-кнопки Паспорта

Делегированный click на `.passport-controls`:
- Найти `.passport-filter-btn` через `e.target.closest()`
- Обновить `state.passportFilter = btn.dataset.filter`
- Обновить active класс: убрать `.active` у всех, поставить на нажатую
- Вызвать `renderPassport()`

#### 4.2. Поиск (input на `#passport-search`)

- Debounce 250мс
- При каждом input:
  - Если `value === ""` — **мгновенно, без debounce**: `state.passportSearchQuery = ""`, `renderPassport()`, снять `.disabled` с фильтр-кнопок, восстановить `.active` на текущем `state.passportFilter`
  - Если `value !== ""` — через debounce 250мс: `state.passportSearchQuery = value.trim()`, `renderPassport()`, добавить `.disabled` на все фильтр-кнопки, убрать `.active` со всех

**Шорткат при очистке:** если пользователь нажал нативный крестик в `<input type="search">` и `value` стал пустым — игнорировать debounce, запустить рендер аккордеонов синхронно и немедленно.

#### 4.3. Форма поиска (submit)

Добавить обработчик `submit` на `.passport-search-form` с `e.preventDefault()` — гарантирует, что нажатие «Enter» на мобильной клавиатуре не перезагрузит страницу. Удалить `onsubmit="return false"` из HTML (функциональность переносится в JS).

### 5. app.js — обновить `switchTab()`

Перед переключением вкладки — если текущая вкладка `"passport"`:
1. Сбросить `state.passportSearchQuery = ""`
2. Очистить поле `#passport-search` (если элемент существует): `input.value = ""`
3. Снять `.disabled` с фильтр-кнопок, восстановить `.active` на `state.passportFilter`

Это предотвращает «залипший» поиск при возврате на Паспорт.

### 6. app.js — обновить `closeCityCard()`

После закрытия карточки города — если `state.currentTab === "passport"`, вызвать `renderPassport()`. Это обновит статусные иконки в результатах поиска (например, после чекина появится чекмарк вместо флажка). Благодаря проверке режима (секция 2, transition) — fade НЕ сработает, потому что режим не меняется (search → search или filter → filter). Только innerHTML обновится без моргания.

### 7. style.css — полные стили

**Заменить временные стили Этапа 1** (помечены комментарием `/* Passport controls — temporary basic styles (full styles in Stage 2) */`) на полные:

```css
/* Passport sticky header — wraps header + controls together */
.passport-sticky-header {
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 10;
}

.passport-controls {
  padding: 0 0 12px 0;
}

.passport-search-form {
  margin-bottom: 8px;
}

#passport-search {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 16px;
  font-family: inherit;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

#passport-search:focus {
  border-color: #27AE60;
}

.passport-filter-tabs {
  display: flex;
  gap: 6px;
}

.passport-filter-btn {
  flex: 1;
  min-height: 38px;
  padding: 8px 4px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  color: #666;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.passport-filter-btn.active {
  background: #1a1a1a;
  color: #fff;
  border-color: #1a1a1a;
}

.passport-filter-btn.disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* Passport search results */
#passport-list {
  transition: opacity 150ms ease;
}

.passport-search-results {
  padding: 0;
  margin: 0;
}

.passport-search-result {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 4px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  transition: background-color 0.15s;
}

.passport-search-result:active {
  background-color: #f5f5f5;
}

.passport-search-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.passport-search-icon svg {
  width: 100%;
  height: auto;
  display: block;
}

.passport-search-name {
  flex: 1;
  font-size: 0.9375rem;
  color: #333;
}

.passport-search-status {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.passport-search-empty {
  text-align: center;
  padding: 40px 16px;
  color: #999;
  font-style: italic;
}
```

**Примечание:** Заголовок и контролы обёрнуты в `.passport-sticky-header` с `position: sticky; top: 0` — при скролле оба блока «прилипают» вместе, без необходимости вычислять точную высоту заголовка. Существующий CSS `.passport-header` (sticky, top: 0, z-index: 10) нужно обновить: убрать `position: sticky`, `top: 0`, `background` и `z-index` — эти свойства теперь на обёртке `.passport-sticky-header`.

### 8. index.html — правки

**Обернуть заголовок и контролы в sticky-контейнер:**
Текущая структура (созданная в этапе 1):
```html
<div id="tab-passport" class="tab-content">
  <header class="passport-header">...</header>
  <div class="passport-controls">...</div>
  <div id="passport-list"></div>
</div>
```
Заменить на:
```html
<div id="tab-passport" class="tab-content">
  <div class="passport-sticky-header">
    <header class="passport-header">...</header>
    <div class="passport-controls">...</div>
  </div>
  <div id="passport-list"></div>
</div>
```
Содержимое `<header>` и `.passport-controls` остаётся без изменений — только добавляется обёртка.

**Удалить `onsubmit="return false"`** с `<form class="passport-search-form">` — обработчик submit теперь регистрируется в JS (секция 4.3).

---

## Критерии готовности

После выполнения всех задач:

1. Вкладка «Паспорт» показывает аккордеоны по умолчанию (фильтр «Все»)
2. **Фильтр «Посещённые»:** только посещённые города, пустые регионы скрыты, при 0 — заглушка «Здесь появятся города...»
3. **Фильтр «Непосещённые»:** только непосещённые города, при 57/57 — заглушка «Ура! Вы прошли всю Беларусь!»
4. **Фильтр «В планах»:** только запланированные города, при 0 — заглушка «Нет городов в планах...»
5. Ввод текста в поиск → плоский список с мини-штампами + статусными иконками
6. Поиск «Марьина Горка» находится по запросу «марьина», «горка», «марьинагорка»
7. Поиск «Мёры» находится по запросу «меры»
8. Очистка поиска → плавный возврат к аккордеонам с активным фильтром
9. При поиске фильтр-кнопки визуально disabled
10. После очистки поиска активная кнопка фильтра восстанавливается корректно
11. Переход на другую вкладку и возврат → поиск сброшен, аккордеоны с фильтром
12. Чекин города из результатов поиска → при закрытии карточки статус обновляется (чекмарк вместо сердечка)
13. Fade transition при переключении между аккордеонами и списком

## Важно

- **НЕ удаляй и НЕ модифицируй** массивы `CITIES` (57 городов) и `REGIONS` (7 регионов)
- **НЕ модифицируй** функции карты (renderMap, zoom, labels) — это этап 4
- **НЕ модифицируй** `renderCityCard`, `renderProfile`, `renderStampOverlay` — они обновляются в этапах 3 и 4
- **НЕ модифицируй** модель данных (state, loadState, saveState) — это сделано в этапе 1
- **НЕ модифицируй** HTML-структуру вкладок, таб-бара, карты — они обновлены в этапе 1. Единственное исключение — удаление `onsubmit="return false"` с формы поиска
- **НЕ трогай** стили аккордеонов (`.accordion-*`), штампов (`.stamp-*`), карты, профиля, карточки города