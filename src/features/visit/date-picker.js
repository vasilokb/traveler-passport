import { CITIES } from '@entities/city/index.js';
import { getTodayLocal } from '@shared/lib/format.js';
import { escapeHtml } from '@shared/lib/dom.js';

// features/visit/date-picker — feature-self-contained UI модального окна выбора даты.
// renderDatePicker(cityId, onConfirm) принимает callback подтверждения вместо
// прямого вызова confirmVisit (разрыв зависимости feature → feature).

export function renderDatePicker(cityId, onConfirm) {
  var city = CITIES.find(function (c) { return c.id === cityId; });
  if (!city) return;

  var today = getTodayLocal();

  var html = "";
  html += '<div class="date-picker-card">';
  html += '  <p class="date-picker-title">Когда вы посетили ' + escapeHtml(city.name) + '?</p>';
  html += '  <input type="date" class="date-picker-input" id="date-picker-input" max="' + today + '" value="' + today + '">';
  html += '  <div class="date-picker-actions">';
  html += '    <button class="date-picker-cancel" id="date-picker-cancel-btn">Отмена</button>';
  html += '    <button class="date-picker-confirm" id="date-picker-confirm-btn">Подтвердить</button>';
  html += '  </div>';
  html += '</div>';

  document.getElementById("date-picker-content").innerHTML = html;
  document.getElementById("date-picker-modal").style.display = "flex";

  document.getElementById("date-picker-cancel-btn").addEventListener("click", closeDatePicker);
  document.getElementById("date-picker-confirm-btn").addEventListener("click", function () {
    var input = document.getElementById("date-picker-input");
    var selectedDate = input.value;
    if (!selectedDate) return;
    onConfirm(cityId, selectedDate);
  });
}

export function closeDatePicker() {
  document.getElementById("date-picker-modal").style.display = "none";
}
