import { store } from './store.js';
import { switchTab } from './tab-router.js';
import { closeStampOverlay } from '@features/stamps/overlay.js';
import { closeCityCard } from '@widgets/city-card/index.js';

// app/overlay-coordinator — координатор оверлея штампа (cross-cutting):
// клик по фону stamp-overlay → закрыть штамп + карточку + вернуться на origin-вкладку.
// Phase D2 §4.0/§6: вынесен из main.js, чтобы skeleton остался чистым bootstrap'ом.
export function initStampOverlayCoordinator() {
  var stampOverlay = document.getElementById("stamp-overlay");
  if (!stampOverlay) return;
  stampOverlay.addEventListener("click", function (e) {
    if (e.target !== e.currentTarget) return;
    var origin = store.getState().stampOrigin;
    closeStampOverlay();
    closeCityCard();
    if (origin) switchTab(origin);
  });
}
