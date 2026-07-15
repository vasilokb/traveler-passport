import { showToast } from '@shared/lib/dom.js';

// app/sw-register — регистрация Service Worker + toast об обновлении (prod only).
// Phase D2 §4.3: вынесен из main.js. В dev SW не регистрируется (Vite HMR).

export function registerSW() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(function () {});
  var hasControllerOnLoad = !!navigator.serviceWorker.controller;
  var updateToastShown = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (hasControllerOnLoad && !updateToastShown) {
      updateToastShown = true;
      showToast("Приложение обновлено");
    }
  });
}
