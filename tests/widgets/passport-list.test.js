import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initPassportList } from '@widgets/passport-list/index.js';
import { store, _resetForTest } from '../../src/app/store.js';

function setupDom() {
  document.body.innerHTML =
    '<div id="tab-passport" class="tab-content">' +
    '  <span id="passport-count">0 из 57</span>' +
    '  <div class="passport-controls">' +
    '    <form class="passport-search-form"><input id="passport-search"></form>' +
    '    <div class="passport-filter-tabs">' +
    '      <button class="passport-filter-btn active" data-filter="all">Все</button>' +
    '      <button class="passport-filter-btn" data-filter="visited">Посещённые</button>' +
    '    </div>' +
    '  </div>' +
    '  <div id="passport-list"></div>' +
    '</div>';
}

function mockSearchApi() {
  return {
    getResultsHtml: function () { return '<div class="passport-search-result" data-city-id="minsk">Минск</div>'; },
    getAccordionsHtml: function () { return '<div class="stamp-cell" data-city-id="minsk">М</div>'; },
  };
}

describe('widgets/passport-list', () => {
  let openCityCard;
  beforeEach(() => {
    _resetForTest();
    setupDom();
    openCityCard = vi.fn();
  });

  it('subscribe: render при currentTab==="passport" (searchApi.getAccordionsHtml)', () => {
    initPassportList(store, { searchApi: mockSearchApi(), openCityCard: openCityCard });
    store.setState({ currentTab: 'passport' });
    expect(document.getElementById('passport-list').querySelector('.stamp-cell')).not.toBeNull();
  });

  it('subscribe: НЕ render при currentTab!=="passport"', () => {
    initPassportList(store, { searchApi: mockSearchApi(), openCityCard: openCityCard });
    store.setState({ currentTab: 'map' });
    expect(document.getElementById('passport-list').innerHTML).toBe('');
  });

  it('handlePassportClick на .stamp-cell → openCityCard(cityId)', () => {
    initPassportList(store, { searchApi: mockSearchApi(), openCityCard: openCityCard });
    store.setState({ currentTab: 'passport' });
    document.querySelector('.stamp-cell').click();
    expect(openCityCard).toHaveBeenCalledWith('minsk');
  });

  it('filter button click → setState({ passportFilter }) + active class', () => {
    initPassportList(store, { searchApi: mockSearchApi(), openCityCard: openCityCard });
    store.setState({ currentTab: 'passport' });
    var visitedBtn = document.querySelector('.passport-filter-btn[data-filter="visited"]');
    visitedBtn.click();
    expect(store.getState().passportFilter).toBe('visited');
    expect(visitedBtn.classList.contains('active')).toBe(true);
    expect(document.querySelector('.passport-filter-btn[data-filter="all"]').classList.contains('active')).toBe(false);
  });

  it('search input (пустой) → setState({ passportSearchQuery:"" }) + filter buttons enabled', () => {
    vi.useFakeTimers();
    initPassportList(store, { searchApi: mockSearchApi(), openCityCard: openCityCard });
    store.setState({ currentTab: 'passport' });
    var input = document.getElementById('passport-search');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(store.getState().passportSearchQuery).toBe('');
    expect(document.querySelector('.passport-filter-btn[data-filter="all"]').classList.contains('disabled')).toBe(false);
    vi.useRealTimers();
  });

  it('search input (текст) → debounced setState({ passportSearchQuery }) через 250ms', () => {
    vi.useFakeTimers();
    initPassportList(store, { searchApi: mockSearchApi(), openCityCard: openCityCard });
    store.setState({ currentTab: 'passport' });
    var input = document.getElementById('passport-search');
    input.value = 'минск';
    input.dispatchEvent(new Event('input'));
    expect(store.getState().passportSearchQuery).toBe('');
    vi.advanceTimersByTime(250);
    expect(store.getState().passportSearchQuery).toBe('минск');
    vi.useRealTimers();
  });
});
