import { getCityById } from '@entities/city/index.js';

// formatDateDisplay НЕ определяется/реэкспортируется здесь — единственный источник
// @shared/lib/format.js (см. §2.6). generateChronicle НЕ вызывает formatDateDisplay:
// даты передаются сырыми (visit.date, m.date), форматирование применяется в рендере.

// Отклонение от табличной сигнатуры плана §3.2 (`(state, CITIES)`):
// имя города разрешается через импортированный getCityById (граф импортов §3.2.1:
// chronicle.js → @entities/city), чтобы сохранить оригинальный алгоритм 1:1
// (app.js вызывает getCityById(cityId), а не обращается к CITIES напрямую).
export function generateChronicle(state) {
  var entries = [];

  // Визиты (Бронза) — из visitedCities
  var visitedIds = Object.keys(state.visitedCities);
  for (var vi = 0; vi < visitedIds.length; vi++) {
    var cityId = visitedIds[vi];
    var city = getCityById(cityId);
    if (!city) continue;
    var visit = state.visitedCities[cityId];
    if (!visit || !visit.date) continue;
    entries.push({
      date: visit.date,
      sortName: city.name,
      label: "Открыт город " + city.name + " (Чернильный штамп)",
      type: "visit",
      priority: 0
    });
  }

  // Milestone'ы (Silver/Gold) — из state.milestones
  var milestones = state.milestones || [];
  for (var mi = 0; mi < milestones.length; mi++) {
    var m = milestones[mi];
    var mCity = getCityById(m.cityId);
    if (!mCity) continue;
    var emoji = m.tier === "gold" ? "🥇" : "🥈";
    var tierName = m.tier === "gold" ? "Золотого" : "Серебряного";
    entries.push({
      date: m.date,
      sortName: mCity.name,
      label: mCity.name + " прокачан до " + tierName + " ордена! " + emoji,
      type: "milestone",
      priority: 1
    });
  }

  // Сортировка: дата DESC → имя ASC (группировка по городу) → priority ASC (визит раньше milestone)
  entries.sort(function (a, b) {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.sortName !== b.sortName) return a.sortName.localeCompare(b.sortName, "ru");
    return a.priority - b.priority;
  });

  return entries;
}
