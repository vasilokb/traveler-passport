import { store } from './store.js';
import { withMux, withMuxSlow } from './processing.js';
import { switchTab, initTabBar } from './tab-router.js';
import { registerSW } from './sw-register.js';
import { initStampOverlayCoordinator } from './overlay-coordinator.js';
import { initVisit } from '@features/visit/index.js';
import { initChecklist } from '@features/checklist/index.js';
import { initStamps } from '@features/stamps/index.js';
import { initPlan } from '@features/plan/index.js';
import { initSearch } from '@features/search/index.js';
import { renderStampOverlay } from '@features/stamps/overlay.js';
import { initPassportList } from '@widgets/passport-list/index.js';
import { initMap } from '@widgets/map/index.js';
import { initProfile } from '@widgets/profile/index.js';
import { initOnboarding } from '@widgets/onboarding/index.js';
import {
  initCityCardWidget, closeCityCard, openCityCard,
  rerenderCityCardPreservingScroll, patchChecklistInPlace, saveNoteNow,
} from '@widgets/city-card/index.js';

function init() {
  var cityCardApi = {
    close: closeCityCard,
    open: withMux(openCityCard),
    rerender: rerenderCityCardPreservingScroll,
    patchChecklist: patchChecklistInPlace,
    saveNoteNow: saveNoteNow,
  };
  var stampsApi = initStamps(store, { switchTab: switchTab, closeCityCard: cityCardApi.close });
  var visitApi = initVisit(store, {
    rerenderCityCard: cityCardApi.rerender,
    saveNoteNow: cityCardApi.saveNoteNow,
    closeCityCard: cityCardApi.close,
    showStampOverlay: function (cityId) {
      renderStampOverlay(cityId, stampsApi.showShareText, stampsApi.goToCollection);
    },
    withMux: withMux, withMuxSlow: withMuxSlow,
  });
  var checklistApi = initChecklist(store, {
    patchChecklist: cityCardApi.patchChecklist,
    saveNoteNow: cityCardApi.saveNoteNow,
    rerenderCityCard: cityCardApi.rerender,
    withMux: withMux, withMuxSlow: withMuxSlow,
  });
  var planApi = initPlan(store, {
    rerenderCityCard: cityCardApi.rerender,
    saveNoteNow: cityCardApi.saveNoteNow,
    withMux: withMux,
  });
  var searchApi = initSearch(store, {});
  initPassportList(store, { searchApi: searchApi, openCityCard: cityCardApi.open });
  initMap(store, { openCityCard: cityCardApi.open });
  initProfile(store);
  initOnboarding(store);
  initCityCardWidget(store, { visitApi: visitApi, planApi: planApi, checklistApi: checklistApi });
  initTabBar();
  switchTab(store.getState().currentTab);
  registerSW();
  initStampOverlayCoordinator();
}

document.addEventListener('DOMContentLoaded', init);
