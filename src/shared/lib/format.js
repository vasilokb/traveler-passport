export function formatDateDisplay(dateStr) {
  var parts = dateStr.split("-");
  return parts[2] + "." + parts[1] + "." + parts[0];
}

export function getTodayLocal() {
  return new Date().toLocaleDateString("sv-SE");
}

export function normalizeForSearch(str) {
  return str
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/і/g, "и")
    .replace(/ў/g, "в")
    .replace(/[-\s]/g, "")
    .trim();
}

export function getPluralSights(n) {
  var mod10 = n % 10;
  var mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "достопримечательность";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "достопримечательности";
  return "достопримечательностей";
}
