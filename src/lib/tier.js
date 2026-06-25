export function getSightsCount(cityId, SIGHTS) {
  // Примечание: в ESM SIGHTS всегда определён (import).
  // Удалена ветвь проверки SIGHTS на undefined из оригинала (app.js:593).
  // Поведение строже: всегда полная валидация по SIGHTS. Безопасно — bundler гарантирует наличие модуля.
  var sights = SIGHTS[cityId];
  return (sights && sights.length > 0) ? sights.length : 0;
}

export function hasChecklist(cityId, SIGHTS) {
  return getSightsCount(cityId, SIGHTS) > 0;
}

export function getCheckedCount(cityId, state) {
  if (!state.checkedSights) return 0;
  var checked = state.checkedSights[cityId];
  return (checked && Array.isArray(checked)) ? checked.length : 0;
}

export function getCityTier(cityId, state, SIGHTS) {
  if (!state.visitedCities[cityId]) return null;
  var sightsCount = getSightsCount(cityId, SIGHTS);
  if (sightsCount === 0) return "bronze";
  var checkedCount = getCheckedCount(cityId, state);
  if (checkedCount >= sightsCount) return "gold";
  if (checkedCount > 0) return "silver";
  return "bronze";
}

export function getTierLabel(tier) {
  if (tier === "gold") return "Золото";
  if (tier === "silver") return "Серебро";
  if (tier === "bronze") return "Бронза";
  return "";
}

export function getTierEmoji(tier) {
  if (tier === "gold") return "🥇";
  if (tier === "silver") return "🥈";
  if (tier === "bronze") return "🥉";
  return "";
}
