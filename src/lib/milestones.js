// TODO(phase-d1): переезд в features/checklist/milestones.js
import { getTodayLocal } from '@shared/lib/format.js';

export function addMilestone(state, cityId, tier) {
  if (tier !== "silver" && tier !== "gold") return;
  var exists = false;
  for (var i = 0; i < state.milestones.length; i++) {
    if (state.milestones[i].cityId === cityId && state.milestones[i].tier === tier) {
      exists = true;
      break;
    }
  }
  if (!exists) {
    state.milestones.push({ cityId: cityId, date: getTodayLocal(), tier: tier });
  }
}

export function removeMilestone(state, cityId, tier) {
  var filtered = [];
  for (var i = 0; i < state.milestones.length; i++) {
    var m = state.milestones[i];
    if (!(m.cityId === cityId && m.tier === tier)) {
      filtered.push(m);
    }
  }
  state.milestones = filtered;
}

export function removeAllMilestones(state, cityId) {
  var filtered = [];
  for (var i = 0; i < state.milestones.length; i++) {
    if (state.milestones[i].cityId !== cityId) {
      filtered.push(state.milestones[i]);
    }
  }
  state.milestones = filtered;
}
