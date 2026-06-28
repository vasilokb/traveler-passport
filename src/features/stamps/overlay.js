import { CITIES } from '@entities/city/index.js';
import { getCityTier as getCityTierPure } from '@entities/city/index.js';
import { REGIONS, createStampSVG } from '@entities/region/index.js';
import { SIGHTS } from '@entities/sight/index.js';
import { store } from '@app/store.js';
import { escapeHtml } from '@shared/lib/dom.js';

// features/stamps/overlay — feature-self-contained UI оверлея штампа.
// renderStampOverlay(cityId, onShare, onCollection) принимает callbacks (onShare/
// onCollection) вместо прямого вызова showShareText/goToCollection — разрыв
// зависимости feature → feature.

function getCityTier(cityId) { return getCityTierPure(cityId, store.getState(), SIGHTS); }

export function renderStampOverlay(cityId, onShare, onCollection) {
  var city = CITIES.find(function (c) {
    return c.id === cityId;
  });
  if (!city) return;

  var region = REGIONS.find(function (r) {
    return r.id === city.region;
  });
  var regionColor = region ? region.color : "#ccc";

  var html = "";
  html += '<div class="stamp-card">';
  html +=
    '  <div class="stamp-card-icon" style="color:' +
    regionColor +
    '">' +
    createStampSVG(city.region, getCityTier(cityId)) +
    "</div>";
  html +=
    '  <div class="stamp-card-city">' + escapeHtml(city.name) + "</div>";
  html += '  <div class="stamp-card-actions">';
  html +=
    '    <button class="stamp-card-btn stamp-card-btn-share" id="stamp-share-btn">Поделиться</button>';
  html +=
    '    <button class="stamp-card-btn stamp-card-btn-collection" id="stamp-collection-btn">В коллекцию</button>';
  html += "  </div>";
  html += "</div>";

  document.getElementById("stamp-overlay-content").innerHTML = html;
  // Показываем overlay (display:flex по умолчанию в CSS; inline display:none
  // проставлен в index.html и closeStampOverlay). Без этой строки D-1 bugfix
  // (§17) не достигает цели — пользователь не увидит анимацию штампа.
  document.getElementById("stamp-overlay").style.display = "flex";

  var shareBtn = document.getElementById("stamp-share-btn");
  if (shareBtn) shareBtn.addEventListener("click", function () { onShare(city.name); });

  var collectionBtn = document.getElementById("stamp-collection-btn");
  if (collectionBtn)
    collectionBtn.addEventListener("click", function () { onCollection(cityId); });
}

export function closeStampOverlay() {
  store.setState({ stampOverlayCityId: null });
  document.getElementById("stamp-overlay").style.display = "none";
}
