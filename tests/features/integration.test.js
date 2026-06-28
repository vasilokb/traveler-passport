import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initVisit } from '@features/visit/index.js';
import { initChecklist } from '@features/checklist/index.js';
import { initStamps } from '@features/stamps/index.js';
import { initPlan } from '@features/plan/index.js';
import { initSearch } from '@features/search/index.js';
import { store, _resetForTest } from '../../src/app/store.js';
import { SIGHTS } from '@entities/sight/index.js';

const MS = SIGHTS.minsk.map(s => s.id);

// Единый набор mock-hooks для всех features (§7.2: «Без UI — только store + hooks»).
function makeHooks() {
  return {
    rerenderCityCard: vi.fn(),
    patchChecklist: vi.fn(),
    updateMap: vi.fn(),
    renderProfile: vi.fn(),
    closeCityCard: vi.fn(),
    saveNoteNow: vi.fn(),
    showStampOverlay: vi.fn(),
    switchTab: vi.fn(),
    withMux: (fn) => fn,
    withMuxSlow: (fn) => fn,
  };
}

describe('features/integration — реальный store + 5 features', () => {
  let visit, checklist, stamps, plan, search, hooks;
  beforeEach(() => {
    _resetForTest();
    // DOM-стабы для direct-import функций (closeDatePicker/closeStampOverlay).
    document.body.innerHTML =
      '<div id="date-picker-modal" style="display:none"></div>' +
      '<div id="date-picker-content"></div>' +
      '<div id="stamp-overlay" style="display:none"></div>' +
      '<div id="stamp-overlay-content"></div>';
    hooks = makeHooks();
    visit = initVisit(store, hooks);
    checklist = initChecklist(store, hooks);
    stamps = initStamps(store, hooks);
    plan = initPlan(store, hooks);
    search = initSearch(store, {});
  });

  it('E2E: confirmVisit → Bronze→Silver → Silver→Gold → removeVisit', () => {
    // 1. Планируем и подтверждаем визит Минска
    plan.togglePlanned('minsk'); // непосещён → add
    expect(store.getState().plannedCities.minsk).toBe(true);

    visit.confirmVisit('minsk', '2025-06-01');
    expect(store.getState().visitedCities.minsk).toEqual({ date: '2025-06-01' });
    expect(store.getState().plannedCities.minsk).toBeUndefined();
    expect(hooks.showStampOverlay).toHaveBeenCalledWith('minsk');

    // 2. Bronze → Silver: отметить 1-й пункт
    checklist.toggleSight('minsk', MS[0]);
    var s1 = store.getState();
    expect(s1.checkedSights.minsk).toEqual([MS[0]]);
    expect(s1.milestones.map(m => m.tier)).toContain('silver');
    // Silver-инвариант (#2): minsk авто-в planned
    expect(s1.plannedCities.minsk).toBe(true);

    // 3. Silver → Gold: отметить остальные
    checklist.toggleSight('minsk', MS[1]);
    checklist.toggleSight('minsk', MS[2]);
    checklist.toggleSight('minsk', MS[3]);
    var s2 = store.getState();
    expect(s2.checkedSights.minsk).toHaveLength(4);
    var tiers = s2.milestones.map(m => m.tier).sort();
    expect(tiers).toEqual(['gold', 'silver']);
    // Gold-инвариант (#1): minsk удалён из planned
    expect(s2.plannedCities.minsk).toBeUndefined();

    // 4. removeVisit: всё чисто
    hooks.showStampOverlay.mockClear();
    visit.removeVisit('minsk');
    var s3 = store.getState();
    expect(s3.visitedCities.minsk).toBeUndefined();
    expect(s3.checkedSights.minsk).toBeUndefined();
    expect(s3.plannedCities.minsk).toBeUndefined();
    expect(s3.milestones).toEqual([]);
  });

  it('search отражает актуальный state после feature-мутаций', () => {
    visit.confirmVisit('minsk', '2025-06-01');

    // filter=visited → минск появляется в аккордеонах
    var htmlVisited = search.getAccordionsHtml({ ...store.getState(), passportFilter: 'visited' });
    expect(htmlVisited).toContain('data-city-id="minsk"');

    // filter=planned, ничего не запланировано → empty-state
    var htmlPlanned = search.getAccordionsHtml({ ...store.getState(), passportFilter: 'planned' });
    expect(htmlPlanned).toContain('Нет городов в планах');

    // search по имени
    var htmlSearch = search.getResultsHtml({ ...store.getState(), passportSearchQuery: 'минск' });
    expect(htmlSearch).toContain('data-city-id="minsk"');
  });

  it('stamps.goToCollection переключает на passport и открывает регион', () => {
    visit.confirmVisit('pinsk', '2025-06-01'); // pinsk region='brest'
    store.setState({ currentTab: 'map' });

    stamps.goToCollection('pinsk');

    var s = store.getState();
    expect(s.currentTab).toBe('passport');
    expect(s.openedRegions).toContain('brest');
    expect(hooks.switchTab).toHaveBeenCalledWith('passport');
  });
});
