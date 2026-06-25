# План: Архитектура монетизации (free-чек-листы + paid-аудиогиды/маршруты)

> Архитектурный план. Реализация правок исходников требует переключения на агента, способного редактировать код.
> Наслаивается на существующий план `refactor-appjs-to-esmodules.md` (FSD/ESM) — тот считается **prerequisite**.

## 1. Контекст

PWA «Паспорт путешественника по Беларуси» — vanilla JS монолит (`app.js` ~1982 строк), без сборки, без бэкенда, `localStorage`. Сейчас полностью бесплатное. Цель: добавить платный контент (аудиогиды, маршруты), сохранив free-чек-листы.

**Почему монетизация меняет архитектуру:** текущее «100% клиент» ломается — платный контент нельзя доверять клиенту (утечёт из localStorage/SW), нужны сервер-верификация прав, доставка тяжёлого аудио (мегабайты, вне bundle), привязка покупок, селективный оффлайн.

## 2. Принятые архитектурные решения

| Решение | Выбор | Обоснование (кратко) |
|---|---|---|
| Распространение/платежи | **Capacitor + нативный IAP** | Переиспользуем весь веб-код; витрины сторов = трафик; конверсия IAP в 5–10× выше веб-чекаута |
| Единица монетизации | **Разово за город + lifetime-бандл «вся страна»** | Нет подписочного оттока; низкий барьер; путешественники берут 2–5 городов |
| Верификация IAP | **RevenueCat** | Скрывает валидацию рецептов StoreKit 2/Google, webhooks, refunds; аноним→аккаунт миграция; free до $10K/мес |
| Аккаунты | **Анонимно-устройство (MVP)** | Нет стены логина, нет таблицы users; кросс-девайс отложен (мягкий prompt «сохранить покупки») |
| Контент | **Статика JSON в репо + аудио в R2**, структура готова к CMS позже | Совпадает с текущим паттерном (`data-sights.js`); нет admin-слоя на MVP |
| Бэкенд | **Cloudflare Workers + R2 + KV** | Тонкий бэкенд, R2 signed URLs из коробки, без БД на анонимном MVP |

**Каталог SKU (MVP):** ~16 — по 1 на каждый из 15 городов Топ-15 (аудио есть только у них) + 1 бандл «вся страна». Подписок нет → нет renewal/expiration-логики.

## 3. Destination-архитектура

```
┌──────────────────────────────────────────────────────────────────┐
│  Apple App Store / Google Play  ──(IAP receipts)──▶  RevenueCat  │
│         ▲                                                        │
│         │ purchase                                               │ (держит
│  ┌──────┴────────────────────────────┐                            │  entitlement,
│  │ Capacitor-приложение (web-core)   │◀───getCustomerInfo()──────│  webhooks,
│  │  ▸ free: чек-листы (текущее)      │                            │  cross-platform)
│  │  ▸ paid: аудиогид, маршруты       │                            │
│  └───────────────┬───────────────────┘                            │
│                  │ getSignedAudioUrl(cityId, appUserId)            │
│                  ▼                                                │
│  ┌───────────────────────────────────────────┐                    │
│  │ Cloudflare Worker (gated delivery)        │──verify──▶RevenueCat API
│  │  ▸ приём RC webhooks → KV (кеш entitlement)│                    │
│  │  ▸ проверка права → подписанный URL на R2 │                    │
│  └───────────────┬───────────────────────────┘                    │
│                  ▼                                                │
│           R2 (аудио .m4a, метаданные маршрутов)                    │
│                                                                     │
│  PWA-веб (free-тир): только чек-листы, БЕЗ платного аудио ─────────┘
└──────────────────────────────────────────────────────────────────┘
```

**Три среды исполнения одного кода:**
1. **Native iOS/Android** (Capacitor) — полный функционал, IAP, Filesystem-оффлайн, RevenueCat plugin.
2. **PWA-веб** — только free-чек-листы (привлечение/SEO); `app/platform.js` отключает paywall/audio/download фичи.

## 4. Клиентская модульная структура (расширение FSD)

Поверх плана ESM (`app/shared/entities/features/widgets`). **Жирным** — новые слайсы.

```
src/
  app/
    main.js, store.js              — как в плане ESM
    entitlement.js  ★              — снапшот entitlement (RC getCustomerInfo), subscribe; UI-gating
    platform.js     ★              — web vs native: adapter FS/IAP; что активно в каждой среде
  shared/
    api/
      revenuecat.js ★              — purchase/restore/getEntitlements (обёртка над Capacitor-плагином)
      content.js     ★             — getSignedAudioUrl/getRouteMeta → CF Worker
    lib/ (store-mechanism, dom, format), config/ (map-config)  — как в плане
  entities/
    city/, region/, sight/         — FREE, как в плане
    audio-guide/   ★               — треки/тайминги/текст гида (static JSON, CMS-ready)
    route/         ★               — waypoints/stops, связь с гидом (static JSON)
  features/
    visit/, checklist/, stamps/, plan/, search/        — FREE (текущее)
    entitlement/   ★               — getAccess(contentId) → bool: ЕДИНАЯ точка gating-логики
    purchase/      ★               — purchaseCity/bundle/restore → revenuecat.js
    download/      ★               — manageAudioDownload → Capacitor FS (native-only), статус в store
    audio-player/  ★               — play/seek/queue, media-session, lock-screen
    route-follow/  ★               — подсветка waypoint, прогресс маршрута
  widgets/
    city-card/                     — + секция «Аудиогид» (купить/скачать/слушать, gated) + «Маршрут»
    passport-list/, map/, profile/, onboarding/        — как в плане
    paywall/        ★              — модалка покупки (SKU/цена/IAP), restore
    audio-player-bar/ ★           — мини-плеер (фон)
    route-view/     ★              — маршрут поверх карты
```

**Правило направленных импортов** (из ESM-плана) сохраняется: `app → widgets → features → entities → shared`. Новые слайсы строго подчиняются.

## 5. Ключевой data-flow: покупка → доступ → контент

```
[пользователь тапает «купить аудиогид Минск» в city-card]
   │
   ▼
widgets/city-card → features/entitlement.getAccess("audio:minsk") == false
   │  (UI-gating: показываем paywall, а не плеер)
   ▼
widgets/paywall → features/purchase.purchaseCity("minsk")
   │
   ▼
shared/api/revenuecat.js → RevenueCat SDK → StoreKit/Google Billing → Receipt
   │
   ▼ RevenueCat верифицирует → webhook → наш CF Worker → KV (entitlement кеш)
   ▼
app/entitlement.js обновляет снапшот (subscribe) → UI переключается на «слушать/скачать»
   │
   ▼ пользователь тапает «слушать»
features/audio-player → shared/api/content.getSignedAudioUrl("minsk", appUserId)
   │
   ▼
CF Worker: проверяет право (RC API или KV-кеш) → выдаёт подписанный URL на R2
   │
   ▼
audio-player стримит / или features/download сохраняет в Filesystem для оффлайн
```

## 6. Модели данных

**Client store (дополнения к `state`):**
```js
// UI-gating snapshot — кешируется, ВСЕГДА перечитывается из RC на старте
entitlementSnapshot: { /* из RC customerInfo.entitlements */ },
// native-only: индекс скачанного аудио
downloadedAudio: { [cityId]: { tracks: [{id, localPath, size}], status } },
// прогресс маршрута (free или gated — см. открытые вопросы)
routeProgress: { [routeId]: { completedStops: [...] } },
```

**Static content JSON (новые файлы в репо, как `data-sights.js`):**
- `data-audio-guides.js` → `export const AUDIO_GUIDES = { minsk: { tracks: [{id, title, durationSec, transcript}], ... } }`
- `data-routes.js` → `export const ROUTES = [ { id, cityId, stops: [{lat,lon,name,audioTrackId}], ... } ]`

**Backend (CF KV):** кеш entitlement — `key=appUserId → { entitlements: {...}, expiresAt }` (TTL, источник истины — RevenueCat).

**SKU-каталог:** `data-products.js` → `export const PRODUCTS = { "audio_minsk": {cityId:"minsk", type:"audio", priceTier}, "bundle_country": {...} }`. Соответствует product ID в RevenueCat/App Store Connect.

## 7. Инварианты безопасности (критично)

1. **Клиентский entitlement — ТОЛЬКО для UI** (показать/спрятать paywall). Авторизация — исключительно на сервере: CF Worker перепроверяет право через RC API перед выдачей подписанного URL. Локальный снапшот никогда не авторизует доступ к контенту.
2. **Аудио НИКОГДА не в SW-прекэше** (мегабайты + утечка платного). SW кэширует только shell. Оффлайн-аудио — только через Capacitor Filesystem, и только после успешной покупки.
3. **Единая точка gating** — `features/entitlement.getAccess()`. Никаких разбросанных проверок `if (entitlement.includes(...))` в виджетах.
4. **Весь сетевой ввод-вывод — в `shared/api/*`**; фичи не ходят в сеть напрямую (чистота + трассируемость + единый оффлайн-путь).
5. **PWA-веб не содержит платного контента/логики плеера** в активном пути (отключается через `app/platform.js`) — снижает поверхность атаки на free-тир.

## 8. Фазирование (каждая фаза = deployable, поведение free-тира сохраняется)

- **Phase A — ESM-рефакторинг** (существующий план). **Prerequisite.** Без него наслаивать монетизацию нельзя.
- **Phase B — Platform split + Capacitor-скаффолд + RevenueCat.** `app/platform.js`, Capacitor-плагины (Purchases, Filesystem), `shared/api/revenuecat.js`, `app/entitlement.js` (аноним). PWA-сборка остаётся рабочей. Релиз: приложение собирается в iOS/Android, RC инициализируется (без SKU).
- **Phase C — Gating skeleton + paywall + покупка одного SKU.** `features/entitlement`, `features/purchase`, `widgets/paywall`. Один product ID (город) заведён в App Store Connect/Play + RC. Релиз: можно купить 1 город (контента ещё нет — только flow).
- **Phase D — Модель аудио-гида + плеер + gated delivery + R2.** `entities/audio-guide`, `features/audio-player`, `widgets/audio-player-bar`, `shared/api/content.js`, CF Worker (webhook + gated URL), R2 с первым аудио. Релиз: купленный гид стримится.
- **Phase E — Download/оффлайн.** `features/download` (Capacitor FS), индекс в store, индикаторы статуса. Релиз: скачанный гид играет офлайн.
- **Phase F — Маршруты.** `entities/route`, `features/route-follow`, `widgets/route-view`, `data-routes.js`. Релиз: маршрут рисуется поверх карты, стопы с аудио.
- **Phase G — Бандл SKU + restore + «сохранить покупки».** Product `bundle_country`, restore-кнопка, soft-prompt привязки аккаунта (RC аноним→идентифицирован) для бэкапа при смене устройства.

## 9. Риски и меры

| Риск | Мера |
|---|---|
| **Утечка платного аудио через клиент** | Инвариант §7.1/7.2: серверная верификация перед signed URL; аудио вне SW |
| Анонимное устройство = потеря покупок при смене/потере | Phase G: soft-prompt привязки аккаунта; RC миграция аноним→аккаунт; restore-кнопка |
| Capacitor нативные плагины vs нативный веб-код расходятся | `app/platform.js` — единый adapter; free-PWA-путь покрыт smoke-тестом на каждой фазе |
| Cache-first SW отдаёт устаревший shell с новыми путями | Bump `CACHE_NAME`; network-first для HTML (Phase 6 ESM-плана) |
| RC-снапшот рассинхронизирован с реальным правом | Снапшот перечитывается на старте + после покупки; сервер всё равно перепроверяет |
| Регрессия free-функционала при добавлении gating | `features/entitlement` по умолчанию разрешает free-контент; smoke-чеклист (§10) на каждой фазе |
| Ревью App Store (guidelines, IAP-only для цифрового контента) | Весь цифровой платный контент — только через IAP (не Stripe внутри натива); это уже учтено выбором |

## 10. Проверка (smoke-чеклист — прогонять после каждой фазы)

**Free-регрессия (из ESM-плана):** онбординг, имя, поиск/фильтры паспорта, визит→штамп→tier, закладки, заметки, карта (pan/zoom/pinch/клик), профиль/хроника, перезагрузка сохраняет состояние, офлайн-shell.

**Монетизация (по фазам):**
- B: нативная сборка стартует, RC инициализируется без ошибок; PWA-веб работает как раньше.
- C: paywall открывается на gated-секции, покупка SKU проходит (sandbox), `getAccess()` становится true, restore работает.
- D: купленный гид стримится; запрос без права → Worker отдаёт 403/без URL (проверить напрямую); плеер (play/pause/seek).
- E: скачать → индикатор → выключить сеть → играет офлайн; удалить загрузку.
- F: маршрут рисуется, переход по стопам, аудио-стоп играют.
- G: бандл открывает все города; restore на «чистом» устройстве восстанавливает; prompt бэкапа не мешает.

## 11. Открытые вопросы (за рамками / на усмотрение)

- **Маршруты free или paid?** Принято как paid (по умолчанию), но можно сделать часть маршрутов free для вовлечения. Решить в Phase F.
- **Аудио-плеер детали:** background playback, media-session (lock-screen/notifications), обработка прерываний (звонки). Стандартная Capacitor media-session plugin — в Phase D.
- **Аналитика** (покупки, listening, drop-off): RevenueCat даёт покупательскую; нужен продукт-аналитикс (PostHog/Amplitude) — отдельная инициатива.
- **Ценообразование** ($/конкретные суммы) — продуктовое решение, вне архитектуры.
- **Объём контента** сверх Топ-15 — продлевается добавлением в `data-products.js`/RC/SKU без архитектурных изменений.
- **Аккаунты/кросс-девайс** — отложены (аноним MVP); при включении — RC login + опционально Supabase для прогресса (KV→Postgres).
- **CMS** — отложена; структура JSON (`data-audio-guides.js`, `data-routes.js`) спроектирована под будущий headless CMS.

## 12. ⚠️ Срочно (не блокирует план, но независимо)

Файл `conf` в корне репозитория содержит **живой токен git** (`pv1_8G2D...`), уже присутствующий в истории git → считать скомпрометированным. Действия: удалить файл, добавить в `.gitignore`, ротировать токен на sourcecraft.dev, при необходимости переписать историю. (Уже зафиксировано как Phase 0 в ESM-плане — подтвердить, что выполнено.)
