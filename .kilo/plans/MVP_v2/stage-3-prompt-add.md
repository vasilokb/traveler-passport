# Задача: Редизайн лейаута карточки города (Refactoring UI/UX)

## Контекст

Мы успешно реализовали логику Этапа 3 (сохранение заметок, debounce, инварианты стейта). Однако текущий UI нижней части карточки перегружен: большая кнопка «В планах ✓» визуально спорит с главной кнопкой «Я здесь был» и зажимает текстовое поле `textarea`.

Необходимо провести косметический рефакторинг: перенести функционал wishlist («В планах») в шапку карточки в виде аккуратной кнопки-иконки (bookmark-закладки), разгрузив нижнюю часть экрана и добавив интерфейсу «воздуха».

**Иконка bookmark вместо flag:** В карточке используется иконка bookmark (закладка) — она компактнее и семантически точнее для «сохранить на потом». На карте (этап 4) и в результатах поиска (этап 2) остаётся flag (флажок) — он крупнее и читается издалека. Это осознанное решение: разные контексты — разные иконки.

---

## Задачи

### 1. Изменения в `app.js` — Функция `renderCityCard(cityId)`

Полностью сохраняй всю текущую логику (замыкания, обработчики, debounce, проверку `isStandalone` для iOS), но измени генерируемую HTML-структуру.

**Новая структура шапки (`.city-card-header`):**

Название города и регион — слева в блоке `.city-card-title-block`. Справа — блок контролов `.city-card-actions`, где в один ряд стоят: **кнопка-bookmark** (если город еще не посещен) и **кнопка-крестик** (`×`).

Пример HTML-структуры шапки:
```html
<div class="city-card-header">
  <div class="city-card-title-block">
    <h2 class="city-card-name">Минск</h2>
    <p class="city-card-region">Минск</p>
  </div>
  <div class="city-card-actions">
    <!-- wishlist btn — ТОЛЬКО если город НЕ посещён -->
    <!-- В планах (.active): -->
    <button class="city-card-btn-wishlist active" id="city-card-wishlist-btn" style="--region-color:{regionColor}">
      <svg ... fill="currentColor" ...>...</svg>
    </button>
    <!-- НЕ в планах (outlined, БЕЗ инлайн-стиля): -->
    <!-- <button class="city-card-btn-wishlist" id="city-card-wishlist-btn">
      <svg ... fill="none" ...>...</svg>
    </button> -->
    <button class="city-card-btn-close" id="city-card-close-btn">×</button>
  </div>
</div>
```

**Логика рендера bookmark-кнопки в шапке:**

- Если город посещён (`state.visitedCities[cityId]`) → кнопку **не рендерить** вообще (отсутствует в DOM)
- Если город НЕ посещён:
  - В планах (`state.plannedCities[cityId]`) → класс `city-card-btn-wishlist active`, инлайн `style="--region-color:{regionColor}"`, SVG `fill="currentColor"`
  - НЕ в планах → класс `city-card-btn-wishlist`, **БЕЗ инлайн-стиля** `--region-color` (не нужен — кнопка серая, регион-цвет не используется), SVG `fill="none"` (контурный bookmark)

⚠️ **Инлайн `style="--region-color:{regionColor}"` ставится ТОЛЬКО для `.active` состояния.** Для неактивного (outlined) состояния `--region-color` не нужен — CSS использует `color: #666`. Не захардкодивай серый цвет `#C0C0C0` из примера — пример показывает активное состояние для региона «Минск».

⚠️ **CSS-переменная `--region-color`:** задаётся инлайн на кнопке. CSS `var(--region-color, #27AE60)` использует fallback только если переменная отсутствует. Для `.active` состояния обязательно `style="--region-color:{regionColor}"`.

**Код SVG-bookmark для вставки:**

Активное состояние (filled):
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>
```

Неактивное состояние (outlined):
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>
```

**Новый линейный лейаут контента под шапкой:**

1. Штамп региона (80px) и описание города — без изменений
2. Поле заметки (`textarea` с классом и id `city-card-note`) — теперь идёт сразу под описанием
3. Главная кнопка действия (до чекина: «Я здесь был» / после чекина: дата + «Удалить отметку») — замыкает карточку в самом низу

⚠️ **Обработчик клика:** перевесь с ID `#city-card-planned-btn` на новый ID `#city-card-wishlist-btn`. Логика вызова `togglePlanned(cityId)` без изменений.

⚠️ **Обработчик крестика:** обнови селектор с `.city-card-close` / `#city-card-close-btn` на новый класс `.city-card-btn-close` / ID `#city-card-close-btn` — убедись, что `closeCityCard()` вызывается корректно. Строка навешивания обработчика остаётся в конце `renderCityCard()` после `innerHTML`, как и раньше — просто обнови `getElementById("city-card-close-btn")`.

---

### 2. Изменения в `style.css` — Стили

**Удалить** старые стили крупной кнопки `.city-card-btn-planned` (и `.city-card-btn-planned.active`).

**Удалить** старый стиль `.city-card-close` (если существует) — крестик теперь использует `.city-card-btn-close`.

**Обновить `.city-card`:** убрать `position: relative` — крестик больше не absolute, свойство не нужно. Если в существующем правиле `.city-card` есть только `position: relative` из связанных с крестиком свойств — просто удалить эту строку.

**Добавить/обновить** следующие CSS-правила:

⚠️ **Обновить существующие `.city-card-name` и `.city-card-region`:** в старом лейауте `.city-card-name` имел `padding-right: 32px` для защиты от наезда на absolute-крестик. В новом лейауте крестик — flex-child, отступ не нужен. Без его удаления между названием и кнопками-иконками появится 32px пустого пространства.

Заменить:
```css
.city-card-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
  padding-right: 32px;
}
```
На:
```css
.city-card-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}
```

⚠️ **Удалить правило `.city-card-title-block h2`** из новых стилей ниже — стилизация названия уже обеспечивается обновлённым `.city-card-name`. Дублирование `.city-card-title-block h2` создало бы конфликт специфичности (класс `0,1,0` vs элемент `0,0,1`).

```css
/* Обновленная шапка карточки */
.city-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.city-card-title-block {
  flex: 1;
  min-width: 0; /* предотвращает overflow при длинных названиях */
}

.city-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Круглые кнопки-иконки в шапке */
.city-card-btn-wishlist,
.city-card-btn-close {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f5f5;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.city-card-btn-close {
  font-size: 24px;
  color: #999;
  line-height: 1;
}

.city-card-btn-wishlist {
  color: #666;
}

/* Активное состояние bookmark — цвет региона */
.city-card-btn-wishlist.active {
  /* 12% цвета региона поверх прозрачного фона — адаптируется к любому фону карточки */
  background: color-mix(in srgb, var(--region-color, #27AE60) 12%, transparent);
  color: var(--region-color, #27AE60);
}

.city-card-btn-wishlist:active,
.city-card-btn-close:active {
  background: #e0e0e0;
}
```

**Обновить свойства textarea** — изменить/добавить ТОЛЬКО указанные ниже свойства, остальные (width, min-height, padding, font-size, resize, outline, box-sizing, transition) из stage-3 оставить без изменений:
```css
.city-card-note {
  border: 1.5px solid #e0e0e0;       /* было 2px → тоньше */
  background: #fcfcfc;                 /* было #fff → лёгкий тон */
  margin-top: 8px;                     /* отступ от описания */
  margin-bottom: 24px;                 /* было 16px → больше воздуха до кнопки */
}

.city-card-note:focus {
  border-color: #27AE60;              /* без изменений */
}
```

---

## Важно (Ограничения)

- **НЕ ломай и НЕ удаляй** логику работы `saveNote()`, `noteDebounceTimer`, жизненные циклы `visibilitychange` и `pagehide`. Изменяется только визуальное представление (HTML/CSS) и целевой селектор для клика «В планах».
- Логика инвариантов (удаление из планов при чекине) должна работать бесшовно, как и раньше.
- **НЕ добавляй** `--region-color-rgb` и `rgba()` паттерн — используй `color-mix(in srgb, var(--region-color) 12%, transparent)` для `.active` фона. Это нативный CSS, не требует правок в JS, даёт полупрозрачную подложку поверх любого фона.
- **НЕ модифицируй** `togglePlanned()`, `confirmVisit()`, `removeVisit()`, `closeCityCard()` — только `renderCityCard()` и CSS.
