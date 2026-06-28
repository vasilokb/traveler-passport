import { describe, it, expect } from 'vitest';
import { buildSearchResults, buildFilterAccordions } from '@features/search/build.js';
import { initSearch } from '@features/search/index.js';
import { CITIES } from '@entities/city/index.js';
import { REGIONS } from '@entities/region/index.js';
import { SIGHTS } from '@entities/sight/index.js';

// Минимальный state с эфемерными полями, нужными рендерерам.
function stateWith(over) {
  return Object.assign({
    currentTab: 'passport',
    travelerName: 'Test',
    onboardingComplete: true,
    visitedCities: {},
    plannedCities: {},
    cityNotes: {},
    checkedSights: {},
    milestones: [],
    passportFilter: 'all',
    passportSearchQuery: '',
    mapFilter: 'all',
    stampOverlayCityId: null,
    openedRegions: [],
    activeOverlayCityId: null,
    stampOrigin: null,
  }, over);
}

describe('features/search — initSearch contract', () => {
  it('возвращает getResultsHtml и getAccordionsHtml', () => {
    const api = initSearch(null, {});
    expect(typeof api.getResultsHtml).toBe('function');
    expect(typeof api.getAccordionsHtml).toBe('function');
  });
});

describe('buildSearchResults(state)', () => {
  it('пустой запрос → список всех городов', () => {
    const html = buildSearchResults(stateWith({ passportSearchQuery: '' }));
    expect(html).toContain('passport-search-results');
    // Хотя бы один результат (Минск)
    expect(html).toContain('data-city-id="minsk"');
  });

  it('запрос без совпадений → empty-state', () => {
    const html = buildSearchResults(stateWith({ passportSearchQuery: 'zzzzzнеттакогогорода' }));
    expect(html).toContain('passport-search-empty');
    expect(html).toContain('Ничего не найдено');
  });

  it('совпадение по имени → результат с data-city-id', () => {
    const html = buildSearchResults(stateWith({ passportSearchQuery: 'Минск' }));
    expect(html).toContain('data-city-id="minsk"');
    expect(html).toContain('passport-search-name');
  });

  it('visited город → зелёная галочка (статус)', () => {
    const html = buildSearchResults(stateWith({
      passportSearchQuery: 'минск',
      visitedCities: { minsk: { date: '2025-01-01' } },
    }));
    expect(html).toContain('#27AE60');
  });

  it('planned (не visited) город → иконка-закладка', () => {
    const html = buildSearchResults(stateWith({
      passportSearchQuery: 'минск',
      plannedCities: { minsk: true },
    }));
    expect(html).not.toContain('#27AE60');
    // Наличие bookmark-иконки (rect с цветом региона)
    expect(html).toMatch(/<rect/);
  });

  it('не содержит живых инъекций (escape)', () => {
    const html = buildSearchResults(stateWith({ passportSearchQuery: '' }));
    expect(html).not.toMatch(/<script/);
    expect(html).not.toMatch(/<img[^>]*onerror=/);
  });
});

describe('buildFilterAccordions(state)', () => {
  it('filter=all → рендерит все регионы (capital block + аккордеоны)', () => {
    const html = buildFilterAccordions(stateWith({ passportFilter: 'all' }));
    expect(html).toContain('capital-block');
    expect(html).toContain('accordion-item');
    // столица Минск
    expect(html).toContain('столица');
  });

  it('filter=visited, нет посещённых → empty-state для visited', () => {
    const html = buildFilterAccordions(stateWith({ passportFilter: 'visited' }));
    expect(html).toContain('passport-search-empty');
    expect(html).toContain('Здесь появятся города');
  });

  it('filter=planned, нет планов → empty-state для planned', () => {
    const html = buildFilterAccordions(stateWith({ passportFilter: 'planned' }));
    expect(html).toContain('Нет городов в планах');
  });

  it('filter=visited → только посещённые города', () => {
    const html = buildFilterAccordions(stateWith({
      passportFilter: 'visited',
      visitedCities: { minsk: { date: '2025-01-01' } },
    }));
    // Минск — столица, попадает в capital-block
    expect(html).toContain('capital-block');
    expect(html).toContain('data-city-id="minsk"');
  });

  it('аккордеон открыт если регион в openedRegions', () => {
    const html = buildFilterAccordions(stateWith({
      passportFilter: 'all',
      openedRegions: ['brest'],
    }));
    expect(html).toContain('data-region-id="brest"');
    expect(html).toMatch(/accordion-item open/);
  });

  it('регион полностью пройден → badge «Пройден»', () => {
    // brest region: 8 городов. Отметим все.
    const brestCities = CITIES.filter(c => c.region === 'brest');
    const visited = {};
    brestCities.forEach(c => { visited[c.id] = { date: '2025-01-01' }; });
    const html = buildFilterAccordions(stateWith({
      passportFilter: 'all',
      visitedCities: visited,
    }));
    expect(html).toContain('badge-gold');
    expect(html).toContain('Пройден');
  });

  it('не содержит живых инъекций', () => {
    const html = buildFilterAccordions(stateWith({ passportFilter: 'all' }));
    expect(html).not.toMatch(/<script/);
    expect(html).not.toMatch(/<img[^>]*onerror=/);
  });
});
