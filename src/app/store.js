import { createStore } from '@shared/lib/store-mechanism.js';
import { CITIES, getCityById, getCityTier } from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';
import { showToast } from '@shared/lib/dom.js';

export const STORAGE_KEY = "travelerPassport";

// Возвращает 8 сохраняемых полей (без эфемерных).
export function getDefaultState() {
  return {
    currentTab: "passport",
    travelerName: "Белорусский путешественник",
    onboardingComplete: false,
    visitedCities: {},
    plannedCities: {},
    cityNotes: {},
    checkedSights: {},
    milestones: [],
  };
}

// Сохраняемые поля (ровно 8). Единственный источник истины — ключи getDefaultState.
// Всё остальное в state — эфемерное (mapFilter, openedRegions, passportFilter,
// passportSearchQuery, stampOverlayCityId, activeOverlayCityId, stampOrigin) и НЕ
// персистится. Сверено с v3 saveState (app.js:848-857).
const PERSIST_FIELDS = Object.keys(getDefaultState());

// Добавляет 6 эфемерных полей (всё, что не сохраняется в localStorage) — свёрено по app.js.
function withEphemeral(state) {
  state.passportFilter = "all";
  state.passportSearchQuery = "";
  state.mapFilter = state.mapFilter || "all";
  state.stampOverlayCityId = null;
  state.openedRegions = state.openedRegions || [];
  state.activeOverlayCityId = null;
  state.stampOrigin = null;
  return state;
}

// 4 инварианта v3 (лёгкие, применяются на каждом setState).
// ВАЖНО: мутирует top-level ключи `next`, но НЕ мутирует вложенные map'ы, алиасящиеся
// из shallow-merge в createStore.setState — перед удалением/добавлением ключей они
// клонируются. Таким образом snapshot `getState()`, удержанный вызывающим до setState,
// не повреждается. milestones заменяется новым массивом (.filter).
// Принимает (next, _prev) для совместимости с сигнатурой createStore.validate(next, prev).
export function applyInvariants(next, _prev) {
  var planned = next.plannedCities;
  var plannedCloned = false;
  // #1: Gold ∉ plannedCities
  for (var cityId in planned) {
    if (getCityTier(cityId, next, SIGHTS) === "gold") {
      if (!plannedCloned) { planned = Object.assign({}, planned); plannedCloned = true; }
      delete planned[cityId];
    }
  }
  // #2: Silver ∈ plannedCities (авто-фокус)
  for (var i = 0; i < CITIES.length; i++) {
    if (getCityTier(CITIES[i].id, next, SIGHTS) === "silver") {
      if (!plannedCloned) { planned = Object.assign({}, planned); plannedCloned = true; }
      planned[CITIES[i].id] = true;
    }
  }
  if (plannedCloned) next.plannedCities = planned;
  // #3: checkedSights только для посещённых городов
  var checked = next.checkedSights;
  var checkedCloned = false;
  for (var cityId2 in checked) {
    if (!next.visitedCities[cityId2]) {
      if (!checkedCloned) { checked = Object.assign({}, checked); checkedCloned = true; }
      delete checked[cityId2];
    }
  }
  if (checkedCloned) next.checkedSights = checked;
  // #4: milestones только для посещённых городов (.filter возвращает новый массив)
  var filteredMilestones = next.milestones.filter(function (m) {
    return next.visitedCities[m.cityId];
  });
  if (filteredMilestones.length !== next.milestones.length) {
    next.milestones = filteredMilestones;
  }
  return next;
}

// Тяжёлая валидация сохранённого дампа (типы, cityId, sightId, dedup).
// Вызывается один раз при инициализации (loadState).
// КОНТРАКТ: строит _cleanState ТОЛЬКО из 8 сохраняемых полей. Неизвестные/лишние ключи
// (в т.ч. случайно попавшие эфемерные поля) ИГНОРИРУЮТСЯ — защита от утечки эфемерных
// полей в state при загрузке. Возвращает { _cleanState, _needsResave }.
function validateDump(saved) {
  // needsResave вычисляется ОДИН раз из `saved` (поведение 1:1 с v3 storage.js:182-186),
  // чтобы не дублировать правила валидации в конце функции.
  var needsResave = (typeof saved.travelerName !== "string") ||
    (saved.visitedCities && (typeof saved.visitedCities !== "object" || Array.isArray(saved.visitedCities)));

  var next = getDefaultState();
  next.currentTab = saved.currentTab || "passport";
  if (next.currentTab === "catalog") next.currentTab = "passport";
  if (typeof saved.travelerName === "string" && saved.travelerName.trim()) {
    next.travelerName = saved.travelerName;
  } else {
    next.travelerName = "Белорусский путешественник";
  }
  next.onboardingComplete = !!saved.onboardingComplete;
  if (saved.visitedCities && typeof saved.visitedCities === "object" && !Array.isArray(saved.visitedCities)) {
    var validCities = {};
    var dateRe = /^\d{4}-\d{2}-\d{2}$/;
    var cityIds = Object.keys(saved.visitedCities);
    for (var i = 0; i < cityIds.length; i++) {
      var cid = cityIds[i];
      var entry = saved.visitedCities[cid];
      if (!entry || typeof entry !== "object") continue;
      if (typeof entry.date !== "string" || !dateRe.test(entry.date)) continue;
      if (!CITIES.find(function (c) { return c.id === cid; })) continue;
      validCities[cid] = entry;
    }
    next.visitedCities = validCities;
  } else {
    next.visitedCities = {};
  }
  if (saved.plannedCities && typeof saved.plannedCities === "object" && !Array.isArray(saved.plannedCities)) {
    var validPlanned = {};
    var plannedIds = Object.keys(saved.plannedCities);
    for (var j = 0; j < plannedIds.length; j++) {
      var pid = plannedIds[j];
      if (saved.plannedCities[pid] !== true) continue;
      if (!CITIES.find(function (c) { return c.id === pid; })) continue;
      validPlanned[pid] = true;
    }
    next.plannedCities = validPlanned;
  } else {
    next.plannedCities = {};
  }
  if (saved.cityNotes && typeof saved.cityNotes === "object" && !Array.isArray(saved.cityNotes)) {
    var validNotes = {};
    var noteIds = Object.keys(saved.cityNotes);
    for (var k = 0; k < noteIds.length; k++) {
      var nid = noteIds[k];
      if (typeof saved.cityNotes[nid] !== "string") continue;
      if (!CITIES.find(function (c) { return c.id === nid; })) continue;
      validNotes[nid] = saved.cityNotes[nid];
    }
    next.cityNotes = validNotes;
  } else {
    next.cityNotes = {};
  }
  // ПОРЯДОК ВАЖЕН: checkedSights должен быть загружен ДО Gold-инварианта.
  if (saved.checkedSights && typeof saved.checkedSights === "object" && !Array.isArray(saved.checkedSights)) {
    var validChecks = {};
    var checkIds = Object.keys(saved.checkedSights);
    for (var ci = 0; ci < checkIds.length; ci++) {
      var ckey = checkIds[ci];
      if (!getCityById(ckey)) continue;
      var arr = saved.checkedSights[ckey];
      if (!Array.isArray(arr)) continue;
      var validArr = [];
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
      if (validArr.length > 0) {
        validChecks[ckey] = validArr;
      }
    }
    next.checkedSights = validChecks;
  } else {
    next.checkedSights = {};
  }
  if (Array.isArray(saved.milestones)) {
    var validMilestones = [];
    var dateRe2 = /^\d{4}-\d{2}-\d{2}$/;
    for (var mi = 0; mi < saved.milestones.length; mi++) {
      var ms = saved.milestones[mi];
      if (!ms || typeof ms !== "object") continue;
      if (typeof ms.cityId !== "string") continue;
      if (!getCityById(ms.cityId)) continue;
      if (typeof ms.date !== "string" || !dateRe2.test(ms.date)) continue;
      if (ms.tier !== "silver" && ms.tier !== "gold") continue;
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
    next.milestones = validMilestones;
  } else {
    next.milestones = [];
  }
  // Применяем 4 инварианта к чистому состоянию (single source of truth).
  applyInvariants(next, null);
  return { _cleanState: next, _needsResave: needsResave };
}

// Загрузка из localStorage. Публичная — используется и как initialStateLoader
// для _resetForTest, и напрямую в тестах миграции.
// Сигнатура: loadState({ storage } = {}) — опциональный storage для тестов.
export function loadState(opts) {
  var storage = (opts && opts.storage) || (typeof localStorage !== 'undefined' ? localStorage : null);
  try {
    var raw = storage.getItem(STORAGE_KEY);
    if (!raw) return withEphemeral(getDefaultState());
    var saved = JSON.parse(raw);
    var validated = validateDump(saved);
    if (validated._needsResave) {
      // Синхронное пересохранение чистого дампа (поведение 1:1 с v3 storage.js:185).
      // Ранее был setTimeout(0) — это порождало гонку: setState до тика перезаписывал
      // localStorage свежим state, а затем макротаск затирал его устаревшим снимком.
      // storage доступен здесь напрямую — откладывание не нужно.
      try { storage.setItem(STORAGE_KEY, JSON.stringify(validated._cleanState)); }
      catch (e) { /* best-effort: in-memory state уже корректен */ }
    }
    return withEphemeral(validated._cleanState);
  } catch (e) {
    return withEphemeral(getDefaultState());
  }
}

// Persist-адаптер (НЕ localStorage напрямую!).
// ⚠️ `persist` НЕ равно `localStorage`: у localStorage есть метод key(n), который
// затенил бы строковое поле key адаптера. Поэтому оборачиваем.
// ⚠️ setItem ФИЛЬТРУЕТ полный state до 8 полей (поведение 1:1 с v3 saveState):
// createStore передаёт сюда JSON.stringify(state) — все 14 полей; без фильтрации
// эфемерные mapFilter/openedRegions утекли бы в дамп → видимое поведение-отклонение.
var persistAdapter = {
  key: STORAGE_KEY,
  getItem: function (k) { return localStorage.getItem(k); },
  setItem: function (k, v) {
    try {
      var full = JSON.parse(v);
      var toSave = {};
      for (var i = 0; i < PERSIST_FIELDS.length; i++) {
        var f = PERSIST_FIELDS[i];
        if (full[f] !== undefined) toSave[f] = full[f];
      }
      localStorage.setItem(k, JSON.stringify(toSave));
    } catch (e) {
      // fallback: записать как есть (лучше мусор, чем потеря данных)
      localStorage.setItem(k, v);
    }
  }
};

function showSaveError() {
  showToast('Не удалось сохранить данные. Освободите место в браузере.');
}

// Store instance.
// loadFromPersist: false — createStore НЕ должен перезаписывать наш валидированный
// initialState сырым JSON из persist (см. план §2.5.1).
// initialStateLoader: loadState — для _resetForTest(): store перечитывает localStorage.
// persistFields: PERSIST_FIELDS — createStore пропускает persist-запись для патчей,
// затрагивающих только эфемерные поля (они не персистятся в любом случае).
export const store = createStore({
  initialState: loadState(),
  validate: applyInvariants,
  persist: persistAdapter,
  persistFields: PERSIST_FIELDS,
  loadFromPersist: false,
  initialStateLoader: loadState,
  onError: function (e, op) {
    if (op === 'persist') showSaveError();
    // 'load' и 'validate' ошибки — silent (loadState уже fallback на default,
    // validate не должен бросать — инварианты безопасны).
  }
});

// omitKey ЭКСПОРТИРУЕТСЯ — используется в main.js (togglePlanned, confirmVisit,
// removeVisit, saveNote — delete-операции на вложенных map-ах) и в тестах.
export function omitKey(obj, key) {
  var copy = {};
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && k !== key) {
      copy[k] = obj[k];
    }
  }
  return copy;
}

// Ре-экспорт test-only API для tests/setup.js.
export const _resetForTest = store._resetForTest;
