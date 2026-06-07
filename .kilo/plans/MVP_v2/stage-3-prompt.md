# Этап 3 — Карточка города: wishlist + заметки

## Контекст

Прочитай следующие документы перед началом работы — они содержат полное описание текущей кодовой базы, спецификацию v2 и план реализации:

1. **Описание текущего приложения (v1):** `F:\projects\traveler-passport\.kilo\plans\MVP_v1\app-description.md` — детальный разбор всех функций, стилей, модели данных, структуры HTML. Это твой справочник по существующему коду.

2. **Концепция v2:** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\MVP_v2.md` — глобальные изменения: удаление Каталога, 3 вкладки, wishlist, заметки, новые фильтры.

3. **План реализации v2:** `F:\projects\traveler-passport\.kilo\plans\MVP_v2\implementation-plan.md` — этот этап описан в секции «Этап 3. Карточка города: wishlist + заметки».

**Что уже сделано (Этапы 1–2):**
- Каталог удалён. Таб-бар: 3 вкладки (Паспорт, Карта, Профиль)
- В `state` добавлены `plannedCities: {}`, `cityNotes: {}`, `passportFilter: "all"`, `passportSearchQuery: ""`
- `saveState()` / `loadState()` сохраняют и загружают `plannedCities` и `cityNotes`
- Паспорт имеет поиск + 4 фильтра (Все / Посещённые / Непосещённые / В планах) + плоский список результатов
- В HTML на карте 3 фильтра (Все / Посещённые / В планах), но `renderMap()` не обрабатывает «planned» — это этап 4

**Текущее состояние функций, которые нужно модифицировать (изучи по файлу app.js):**

`renderCityCard(cityId)` (~строки 950–993):
- Рендерит: close-btn → название → регион → штамп (80px) → описание → «Я здесь был» / «Удалить отметку»
- Навешивает addEventListener на close, visit, remove кнопки

`openCityCard(cityId)` (~строки 918–936):
- Проверяет `isProcessing`, ставит `stampOrigin`, `activeOverlayCityId`
- Вызывает `renderCityCard()`, показывает overlay, блокирует tab-bar
- Снимает блокировку через 400мс
- ⚠️ **Нужно добавить:** `clearTimeout(noteDebounceTimer); noteDebounceTimer = null;` в начале функции — предотвращает выстрел старого debounce-таймера от предыдущей карточки и перезапись state чужим текстом

`closeCityCard()` (~строки 938–948):
- Обнуляет `activeOverlayCityId` и `stampOrigin`
- Скрывает overlay, разблокирует tab-bar
- Если `currentTab === "passport"` — вызывает `renderPassport()`

`confirmVisit(cityId, date)` (~строки 1027–1040):
- Проверяет `isProcessing`
- `state.visitedCities[cityId] = { date: date }`, `saveState()`
- Закрывает date-picker, показывает stamp-overlay

`removeVisit(cityId)` (~строки 1042–1052):
- Проверяет `isProcessing`
- `delete state.visitedCities[cityId]`, `saveState()`
- Вызывает `closeCityCard()`

---

## Задачи

### 1. app.js — новая функция `togglePlanned(cityId)`

```js
function togglePlanned(cityId) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    // Инвариант: посещённый город не может быть в планах
    if (state.visitedCities[cityId]) return;
    if (state.plannedCities[cityId]) {
      delete state.plannedCities[cityId];
    } else {
      state.plannedCities[cityId] = true;
    }
    saveState();
    // Сброс зависшего debounce — при перерендере textarea пересоздаётся
    clearTimeout(noteDebounceTimer);
    noteDebounceTimer = null;
    renderCityCard(cityId);
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}
```

**Обоснование:** переиспользуется существующий паттерн `isProcessing` (400мс мьютекс). Защищает от двойного тапа. Рендерит карточку заново — кнопка «Хочу поехать» обновит визуальное состояние.

### 2. app.js — новая функция `saveNote(cityId, text)` + debounce

Добавить переменную уровня модуля (рядом с `isProcessing`):
```js
var noteDebounceTimer = null;
```

Функция:
```js
function saveNote(cityId, text) {
  var trimmed = text.trim();
  if (trimmed) {
    state.cityNotes[cityId] = trimmed;
  } else {
    delete state.cityNotes[cityId];
  }
  saveState();
}
```

**Важно:** триггер удаления — именно `text.trim()`, не просто `text`. Это отсекает мусорные ключи типа `{ "minsk": " " }` от случайных пробелов.

### 3. app.js — переписать `renderCityCard(cityId)`

Полностью переписать функцию. Новый лейаут:

**До чекина (`!state.visitedCities[cityId]`):**
1. Close button `×`
2. Название + регион + штамп (80px) — без изменений
3. Описание города — без изменений
4. **Кнопка «Хочу поехать»** — toggle-planned
5. **Textarea заметки** — placeholder «Что посмотреть, куда зайти...»
6. **Кнопка «Я здесь был»** — openDatePicker

**После чекина (`state.visitedCities[cityId]`):**
1. Close button `×`
2. Название + регион + штамп (80px) — без изменений
3. Описание города — без изменений
4. **Textarea заметки** — placeholder «Впечатления, заметки на память...»
5. Дата визита + **Кнопка «Удалить отметку»**

**Логика кнопки «Хочу поехать»:**
- Если город посещён (`state.visitedCities[cityId]`) → **не рендерить** кнопку вообще
- Если в планах (`state.plannedCities[cityId]`) → filled стиль, класс `.city-card-btn-planned.active`, текст «В планах ✓»
- Если не в планах → outlined стиль, класс `.city-card-btn-planned`, текст «Хочу поехать»

⚠️ **CSS-переменная `--region-color`:** кнопка `.city-card-btn-planned.active` использует `var(--region-color)` для фона. Эта переменная должна быть инициализирована **инлайн-стилем на самой кнопке** при рендере:
```js
html += '<button class="city-card-btn-planned active" id="city-card-planned-btn" style="--region-color:' + regionColor + '">В планах ✓</button>';
```
Для неактивной (outlined) кнопке `--region-color` не нужен — она серая. Но если хочешь единообразие — можно добавить и туда. Главное: без инлайн `style="--region-color:..."` CSS `var(--region-color, #27AE60)` будет брать fallback, что не соответствует цвету региона.

**Textarea заметки:**
- `<textarea id="city-card-note" class="city-card-note" ...>` — **оба атрибута обязательны:** `id` для доступа из `closeCityCard()` / `confirmVisit()` / `visibilitychange`, `class` для стилей из секции 8. Без класса textarea будет без стилей (голый HTML-дефолт)
- `value = state.cityNotes[cityId] || ""` — заметка переносится между состояниями бесшовно
- `maxlength="500"`, визуально 4 строки (`min-height: 80px`)
- На `input` событие — debounce 300мс → `saveNote(cityId, textarea.value)`
- Debounce timer: `clearTimeout(noteDebounceTimer)` перед каждым новым `setTimeout`

**Обработчики кнопок и textarea (через addEventListener, как в текущей реализации):**
- Close button → `closeCityCard()`
- «Хочу поехать» → `togglePlanned(cityId)`
- «Я здесь был» → `openDatePicker(cityId)`
- «Удалить отметку» → `removeVisit(cityId)`
- Textarea `#city-card-note` → debounce save + iOS standalone workaround (см. секцию 8)

⚠️ **Все addEventListener навешиваются строго один раз**, в самом конце `renderCityCard()`, **после** `document.getElementById("city-card-content").innerHTML = html`. Поскольку `innerHTML` полностью заменяет DOM, старые элементы и их обработчики уничтожаются автоматически — утечки нет. Но обработчики должны навешиваться только на свежесозданные элементы, не раньше.

### 4. app.js — обновить `closeCityCard()`

Перед скрытием оверлея добавить принудительный save заметки:

```js
function closeCityCard() {
  // Принудительный save заметки
  clearTimeout(noteDebounceTimer);
  var cityId = state.activeOverlayCityId;
  if (cityId) {
    var textarea = document.getElementById("city-card-note");
    if (textarea) saveNote(cityId, textarea.value);
  }

  state.activeOverlayCityId = null;
  state.stampOrigin = null;

  document.getElementById("city-card-overlay").style.display = "none";
  document.getElementById("tab-bar").classList.remove("tab-bar-blocked");

  if (state.currentTab === "passport") {
    renderPassport();
  }
}
```

**Порядок важен:** сначала save → потом обнуление `activeOverlayCityId`.

### 5. app.js — обновить `confirmVisit(cityId, date)`

Добавить **перед** записью в `visitedCities`:

```js
function confirmVisit(cityId, date) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    // Принудительный save заметки (поймать последние символы до debounce)
    clearTimeout(noteDebounceTimer);
    var textarea = document.getElementById("city-card-note");
    if (textarea) saveNote(cityId, textarea.value);

    // Снять флаг «В планах» (если был)
    delete state.plannedCities[cityId];

    state.visitedCities[cityId] = { date: date };
    saveState();
    closeDatePicker();
    state.stampOverlayCityId = cityId;
    renderStampOverlay(cityId);
    document.getElementById("stamp-overlay").style.display = "flex";
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}
```

**Инвариант заметки:** `cityNotes` не трогается — `saveNote()` записывает то, что уже было в textarea. После чекина карточка НЕ ре-рендерится (открывается stamp-overlay), а при следующем открытии textarea получит `value` из `state.cityNotes[cityId]` — текст не моргает.

### 6. app.js — обновить `removeVisit(cityId)`

```js
function removeVisit(cityId) {
  if (isProcessing) return;
  isProcessing = true;
  try {
    // Заметка НЕ удаляется — остаётся в cityNotes
    delete state.visitedCities[cityId];
    saveState();
    closeCityCard();  // внутри closeCityCard() будет принудительный saveNote

    // Если Профиль — текущая активная вкладка, обновить хронику
    if (state.currentTab === "profile") {
      renderProfile();
    }
  } finally {
    setTimeout(function () { isProcessing = false; }, 400);
  }
}
```

**Обоснование:** `closeCityCard()` вызовет `renderPassport()` если текущая вкладка — Паспорт. Для Профиля нужно явное обновление — хроника формируется динамически из `state.visitedCities`.

### 7. app.js — добавить lifecycle-обработчики для save заметок

Добавить в `init()`:

```js
// visibilitychange — переключение вкладки браузера
document.addEventListener("visibilitychange", function () {
  if (document.hidden && state.activeOverlayCityId) {
    clearTimeout(noteDebounceTimer);
    var textarea = document.getElementById("city-card-note");
    if (textarea) saveNote(state.activeOverlayCityId, textarea.value);
  }
});

// pagehide — закрытие/свайп приложения (iOS Safari standalone)
window.addEventListener("pagehide", function () {
  if (state.activeOverlayCityId) {
    var textarea = document.getElementById("city-card-note");
    if (textarea) saveNote(state.activeOverlayCityId, textarea.value);
  }
});
```

### 8. style.css — стили новых элементов карточки

Добавить после существующих стилей `.city-card-btn-*`:

```css
/* Planned button */
.city-card-btn-planned {
  display: block;
  width: 100%;
  min-height: 48px;
  padding: 14px 24px;
  font-size: 1rem;
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

.city-card-btn-planned:active {
  opacity: 0.8;
}

.city-card-btn-planned.active {
  border-color: var(--region-color, #27AE60);
  background: var(--region-color, #27AE60);
  color: #ffffff;
}

/* Note textarea */
.city-card-note {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  font-size: 0.9375rem;
  font-family: inherit;
  line-height: 1.5;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  resize: none;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
  margin-bottom: 16px;
}

.city-card-note:focus {
  border-color: #27AE60;
}

.city-card-note::placeholder {
  color: #999;
}
```

**Обновить `.city-card` для клавиатуры:**
Заменить `max-height: calc(100vh - 40px)` на progressive enhancement с `dvh`. Порядок важен: сначала `vh` (fallback), потом `dvh` (переопределит в поддерживающих браузерах):
```css
.city-card {
  /* существующие свойства */
  max-height: 90vh;   /* fallback для браузеров без dvh */
  max-height: 90dvh;  /* динамическая высота viewport с учётом клавиатуры */
  overflow-y: auto;
}
```

⚠️ **Порядок критичен:** `90vh` должен идти ПЕРЕД `90dvh`. Браузеры без поддержки `dvh`-единиц проигнорируют вторую строку как невалидную и сохранят `90vh`. Браузеры с поддержкой `dvh` применят второе значение. `@supports` блок **не нужен** — этот паттерн уже является progressive enhancement.

**iOS Standalone — padding при фокусе на textarea:** в `renderCityCard()` после вставки HTML добавить JS-обработчик:

⚠️ **Этот блок кода должен находиться строго внутри тела `renderCityCard(cityId)`, после строки `innerHTML = html`.** Только так `saveNote` получит доступ к актуальному `cityId` через замыкание. Не выносить в отдельную функцию — `cityId` будет `undefined`.

```js
// Внутри renderCityCard(cityId), после innerHTML = html:
var noteEl = document.getElementById("city-card-note");
if (noteEl) {
  // Debounced save
  noteEl.addEventListener("input", function () {
    clearTimeout(noteDebounceTimer);
    noteDebounceTimer = setTimeout(function () {
      saveNote(cityId, noteEl.value);
    }, 300);
  });

  // iOS standalone keyboard workaround
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
```

### 9. Проверка overlay click handler

Убедиться, что клик по фону `#city-card-overlay` вызывает `closeCityCard()`, а не просто скрывает элемент. Текущая реализация (в `init()`):
```js
document.getElementById("city-card-overlay").addEventListener("click", function (e) {
  if (e.target === e.currentTarget) closeCityCard();
});
```
Это корректно — `closeCityCard()` вызывается через функцию, которая обеспечит принудительный save заметки. **Не менять.**

---

## Критерии готовности

После выполнения всех задач:

1. **Кнопка «Хочу поехать»** toggle-ит статус planned (outlined ↔ filled)
2. **После чекина** кнопка «Хочу поехать» исчезает, `plannedCities[cityId]` автоматически удаляется
3. **Заметка** сохраняется при вводе (debounced 300мс)
4. **Заметка переживает удаление визита** — после удаления отметки текст заметки сохранён в `state.cityNotes`
5. **Заметка переживает снятие флага «В планах»** — текст в textarea не очищается при toggle
6. **Заметка переживает чекин** — после подтверждения даты и повторного открытия карточки текст на месте
7. **Множественные быстрые действия** (чекин → удаление → повторный чекин) — заметка не теряется
8. **Быстрое закрытие карточки** — принудительный save в `closeCityCard()` ловит последний ввод
9. **Переключение вкладки браузера** (`visibilitychange`) — заметка сохраняется
10. **Закрытие приложения** (`pagehide`) — заметка сохраняется
11. **Placeholder** зависит от состояния: до чекина — «Что посмотреть, куда зайти...», после — «Впечатления, заметки на память...»
12. **iOS standalone** — при фокусе на textarea кнопки не перекрыты клавиатурой

## Важно

- **НЕ удаляй и НЕ модифицируй** массивы `CITIES` (57 городов) и `REGIONS` (7 регионов)
- **НЕ модифицируй** функции карты (`renderMap`, `zoom`, `labels`) — это этап 4
- **НЕ модифицируй** `renderPassport()`, `handlePassportClick()`, обработчики поиска/фильтров — они обновлены в этапе 2
- **НЕ модифицируй** `renderProfile()` — добавление счётчика «В планах» в этапе 4
- **НЕ модифицируй** `renderStampOverlay()` — без изменений
- **НЕ модифицируй** модель данных (`state` определение, `loadState`, `saveState`) — сделано в этапе 1
- **НЕ модифицируй** HTML-структуру (вкладки, таб-бар, карта) — обновлено в этапах 1–2
