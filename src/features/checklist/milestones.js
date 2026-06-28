import { getTodayLocal } from '@shared/lib/format.js';

// «Almost pure»: НЕ мутирует входной state. При no-op возвращает state as-is
// (та же ссылка), иначе возвращает новый объект state с обновлённым milestones.
export function addMilestone(state, cityId, tier) {
  if (tier !== "silver" && tier !== "gold") return state;
  var exists = false;
  for (var i = 0; i < state.milestones.length; i++) {
    if (state.milestones[i].cityId === cityId && state.milestones[i].tier === tier) {
      exists = true;
      break;
    }
  }
  if (exists) return state; // dedup — state as-is, без лишней записи
  return {
    ...state,
    milestones: state.milestones.concat([{ cityId: cityId, date: getTodayLocal(), tier: tier }])
  };
}

export function removeMilestone(state, cityId, tier) {
  var filtered = [];
  var removed = false;
  for (var i = 0; i < state.milestones.length; i++) {
    var m = state.milestones[i];
    if (m.cityId === cityId && m.tier === tier) {
      removed = true;
      continue;
    }
    filtered.push(m);
  }
  if (!removed) return state; // no-op — state as-is
  return { ...state, milestones: filtered };
}

export function removeAllMilestones(state, cityId) {
  var filtered = [];
  var removed = false;
  for (var i = 0; i < state.milestones.length; i++) {
    if (state.milestones[i].cityId === cityId) {
      removed = true;
      continue;
    }
    filtered.push(state.milestones[i]);
  }
  if (!removed) return state; // no-op — state as-is
  return { ...state, milestones: filtered };
}
