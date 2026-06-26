// TODO(phase-c): переезд в src/app/store.js + createStore из @shared/lib/store-mechanism
import { getCityTier, getCityById, CITIES } from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';

export const STORAGE_KEY = "travelerPassport";

// Возвращает 8 сохраняемых полей (без эфемерных). openedRegions сюда НЕ входит —
// он всегда добавляется в finalize() (как state.openedRegions || []), что совпадает
// с поведением оригинала (app.js:836 задаёт [] в catch, но :843 всё равно перепроверяет).
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

// Добавляет эфемерные поля (всё, что не сохраняется в localStorage) — свёрено по app.js.
function finalize(state) {
  state.passportFilter = "all";            // app.js:839
  state.passportSearchQuery = "";           // app.js:840
  state.mapFilter = state.mapFilter || "all"; // app.js:841
  state.stampOverlayCityId = null;         // app.js:842
  state.openedRegions = state.openedRegions || []; // app.js:843
  state.activeOverlayCityId = null;        // объявление app.js:581
  state.stampOrigin = null;                // объявление app.js:582
  return state;
}

// Контракт §3.2.2: возвращает новый объект состояния; единственный dep — storage.
// getCityTier/getCityById/CITIES/SIGHTS импортируются напрямую (граф §3.2.1).
export function loadState({ storage }) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return finalize(getDefaultState());
    const saved = JSON.parse(raw);
    const next = getDefaultState();
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
    // ПОРЯДОК ВАЖЕН: checkedSights должен быть загружен ДО Gold-инварианта (раздел 3.3)
    if (saved.checkedSights && typeof saved.checkedSights === "object" && !Array.isArray(saved.checkedSights)) {
      var validChecks = {};
      var checkIds = Object.keys(saved.checkedSights);
      for (var ci = 0; ci < checkIds.length; ci++) {
        var ckey = checkIds[ci];
        // Город должен существовать в CITIES
        if (!getCityById(ckey)) continue;
        // Значение должно быть массивом
        var arr = saved.checkedSights[ckey];
        if (!Array.isArray(arr)) continue;
        // Фильтрация: оставить только валидные и уникальные sightId
        var validArr = [];
        // Примечание: в ESM SIGHTS всегда определён (import).
        // Удалена ветвь проверки SIGHTS на undefined из оригинала (app.js:736).
        // Поведение строже: всегда полная валидация по SIGHTS. Безопасно — bundler гарантирует наличие модуля.
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
    // milestones
    if (Array.isArray(saved.milestones)) {
      var validMilestones = [];
      var dateRe2 = /^\d{4}-\d{2}-\d{2}$/;
      for (var mi = 0; mi < saved.milestones.length; mi++) {
        var ms = saved.milestones[mi];
        if (!ms || typeof ms !== "object") continue;
        if (typeof ms.cityId !== "string") continue;
        // Проверка существования города
        if (!getCityById(ms.cityId)) continue;
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
      next.milestones = validMilestones;
    } else {
      next.milestones = [];
    }
    // v3-инвариант: Gold-города не могут быть в plannedCities
    var goldCheckIds = Object.keys(next.plannedCities);
    for (var gi = 0; gi < goldCheckIds.length; gi++) {
      if (getCityTier(goldCheckIds[gi], next, SIGHTS) === "gold") {
        delete next.plannedCities[goldCheckIds[gi]];
      }
    }
    // v3-инвариант: Silver-города ВСЕГДА в plannedCities (авто-фокус)
    for (var si2 = 0; si2 < CITIES.length; si2++) {
      if (getCityTier(CITIES[si2].id, next, SIGHTS) === "silver") {
        next.plannedCities[CITIES[si2].id] = true;
      }
    }
    // checkedSights имеет смысл только для посещённых городов
    var checkedIds = Object.keys(next.checkedSights);
    for (var cui = 0; cui < checkedIds.length; cui++) {
      if (!next.visitedCities[checkedIds[cui]]) {
        delete next.checkedSights[checkedIds[cui]];
      }
    }
    // milestones имеют смысл только для посещённых городов
    var validMs = [];
    for (var vmi = 0; vmi < next.milestones.length; vmi++) {
      if (next.visitedCities[next.milestones[vmi].cityId]) {
        validMs.push(next.milestones[vmi]);
      }
    }
    next.milestones = validMs;
    var needsFix = (typeof saved.travelerName !== "string") ||
      (saved.visitedCities && (typeof saved.visitedCities !== "object" || Array.isArray(saved.visitedCities)));
    if (needsFix) {
      saveState(next, storage);
    }
    return finalize(next);
  } catch (e) {
    // ПОЛНЫЙ сброс — возвращаем новый объект, не мутация (контракт §3.2.2).
    return finalize(getDefaultState());
  }
}

// Контракт §3.2.3: не вызывает showToast (ядро чистое), возвращает { ok, error }.
// Тост показывает обёртка в main.js при !ok.
export function saveState(state, storage) {
  try {
    var toSave = {
      currentTab: state.currentTab,
      travelerName: state.travelerName,
      onboardingComplete: state.onboardingComplete,
      visitedCities: state.visitedCities,
      plannedCities: state.plannedCities,
      cityNotes: state.cityNotes,
      checkedSights: state.checkedSights,
      milestones: state.milestones,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}
