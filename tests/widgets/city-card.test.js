import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initCityCardWidget,
  openCityCard, closeCityCard, renderCityCard,
  saveNote, saveNoteNow, patchChecklistInPlace,
} from '@widgets/city-card/index.js';
import { store, _resetForTest } from '../../src/app/store.js';
import { SIGHTS } from '@entities/sight/index.js';

function setupDom() {
  document.body.innerHTML =
    '<nav id="tab-bar"></nav>' +
    '<div id="city-card-overlay" style="display:none"><div id="city-card-content"></div></div>' +
    '<div id="date-picker-modal" style="display:none"><div id="date-picker-content"></div></div>';
}

function mockApis() {
  return {
    visitApi: { confirmVisit: vi.fn(), removeVisit: vi.fn() },
    planApi: { togglePlanned: vi.fn() },
    checklistApi: { toggleSight: vi.fn() },
  };
}

describe('widgets/city-card', () => {
  beforeEach(() => {
    _resetForTest();
    setupDom();
  });

  it('openCityCard → activeOverlayCityId + overlay visible + rendered card', () => {
    initCityCardWidget(store, mockApis());
    openCityCard('minsk');
    expect(store.getState().activeOverlayCityId).toBe('minsk');
    expect(document.getElementById('city-card-overlay').style.display).toBe('flex');
    expect(document.querySelector('#city-card-content .city-card')).not.toBeNull();
    expect(document.querySelector('.city-card-name').textContent).toBe('Минск');
  });

  it('closeCityCard → activeOverlayCityId=null + overlay hidden', () => {
    initCityCardWidget(store, mockApis());
    openCityCard('minsk');
    closeCityCard();
    expect(store.getState().activeOverlayCityId).toBe(null);
    expect(document.getElementById('city-card-overlay').style.display).toBe('none');
  });

  it('closeCityCard НЕ вызывает прямой renderPassport (widgets→widgets; subscribe покрывает)', () => {
    // Контракт: closeCityCard только мутирует state + DOM overlay. Рендер паспорта
    // — ответственность widgets/passport-list subscribe, не city-card.
    initCityCardWidget(store, mockApis());
    openCityCard('minsk');
    expect(closeCityCard()).toBeUndefined();
  });

  it('renderCityCard (visited) → tier badge + checklist', () => {
    initCityCardWidget(store, mockApis());
    store.setState({ visitedCities: { minsk: { date: '2025-01-01' } } });
    renderCityCard('minsk');
    var root = document.getElementById('city-card-content');
    expect(root.querySelector('.city-card-tier-badge')).not.toBeNull();
    expect(root.querySelector('.city-card-checklist')).not.toBeNull();
    expect(root.querySelector('#city-card-remove-btn')).not.toBeNull();
  });

  it('saveNote → store.setState({ cityNotes })', () => {
    saveNote('minsk', '  заметка  ');
    expect(store.getState().cityNotes.minsk).toBe('заметка');
    saveNote('minsk', '   ');
    expect(store.getState().cityNotes.minsk).toBeUndefined();
  });

  it('saveNoteNow (bugfix D-2): clearTimeout(noteDebounceTimer) — один save, не два', () => {
    vi.useFakeTimers();
    initCityCardWidget(store, mockApis());
    store.setState({ visitedCities: { minsk: { date: '2025-01-01' } } });
    renderCityCard('minsk');
    var spy = vi.spyOn(store, 'setState');
    var noteEl = document.getElementById('city-card-note');
    noteEl.value = 'привет';
    noteEl.dispatchEvent(new Event('input')); // ставит noteDebounceTimer (300ms)
    saveNoteNow('minsk'); // clearTimeout + saveNote → 1 setState
    vi.advanceTimersByTime(300); // без bugfix здесь сработал бы второй saveNote
    var cityNotesCalls = spy.mock.calls.filter(function (c) {
      return typeof c[0] === 'function';
    }).length;
    // saveNote использует function-updater. Должен быть ровно 1 вызов (от saveNoteNow).
    expect(cityNotesCalls).toBe(1);
    expect(store.getState().cityNotes.minsk).toBe('привет');
    spy.mockRestore();
    vi.useRealTimers();
  });

  it('patchChecklistInPlace → checkbox получает .checked', () => {
    initCityCardWidget(store, mockApis());
    var sight0 = SIGHTS.minsk[0].id;
    store.setState({
      visitedCities: { minsk: { date: '2025-01-01' } },
      checkedSights: { minsk: [sight0] },
    });
    renderCityCard('minsk');
    var item = document.querySelector('.checklist-item[data-sight-id="' + sight0 + '"]');
    expect(item.querySelector('.checklist-checkbox').classList.contains('checked')).toBe(true);
    // uncheck → patch убирает .checked
    store.setState({ checkedSights: { minsk: [] } });
    patchChecklistInPlace('minsk', sight0);
    expect(item.querySelector('.checklist-checkbox').classList.contains('checked')).toBe(false);
  });
});
