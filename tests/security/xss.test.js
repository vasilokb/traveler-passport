import { describe, it, expect, beforeEach } from 'vitest';
// TODO(phase-d2): убрать временные экспорты render*/__setTestState из main.js.
// После распила widgets/ эти функции переедут в modules и будут экспортироваться штатно.
import {
  renderProfile, renderCityCard, __setTestState,
} from '../../src/app/main.js';
// phase-d1: buildSearchResults переехал в features/search/build.js (pure, принимает state).
import { buildSearchResults } from '../../src/features/search/build.js';

function baseState(over) {
  return Object.assign({
    currentTab: 'passport',
    travelerName: 'Тестер',
    onboardingComplete: true,
    visitedCities: {},
    plannedCities: {},
    cityNotes: {},
    checkedSights: {},
    milestones: [],
  }, over);
}

// Проверка: в корне нет «живых» опасных элементов/атрибутов, которые мог бы
// породить инжект пользовательского ввода (img с onerror, script, iframe,
// произвольные on*-обработчики вне контролируемых нами).
function assertNoLiveDanger(root) {
  // <script> / <iframe> недопустимы нигде.
  expect(root.querySelectorAll('script, iframe')).toHaveLength(0);
  // <img onerror=...> из инжекта: в city-card есть легитный cover-img с onerror
  // (контролируем), поэтому проверяем только img, у которых onerror содержит
  // маркер инжекта alert(, а не легитное 'none'.
  root.querySelectorAll('img').forEach((img) => {
    const onerr = img.getAttribute('onerror') || '';
    expect(onerr).not.toContain('alert(');
  });
}

describe('XSS-аудит render-функций main.js', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="tab-profile"></div>' +
      '<div id="city-card-content"></div>';
  });

  it('#1 travelerName в renderProfile — рендерится как текст, не как элементы', () => {
    const payload = '<img src=x onerror=alert(1)>';
    __setTestState(baseState({ travelerName: payload }));
    renderProfile();
    const root = document.getElementById('tab-profile');
    const nameSpan = root.querySelector('.profile-name-text');
    expect(nameSpan).not.toBeNull();
    // Текстовая нода содержит исходный payload (браузер декодирует сущности обратно в textContent).
    expect(nameSpan.textContent).toBe(payload);
    // Никаких живых <img> внутри span'а имени.
    expect(nameSpan.querySelectorAll('img, script')).toHaveLength(0);
    assertNoLiveDanger(root);
  });

  it('#2 city.name/description в renderCityCard — статичные данные, инжекта нет', () => {
    __setTestState(baseState({
      visitedCities: { minsk: { date: '2025-01-01' } },
    }));
    renderCityCard('minsk');
    const root = document.getElementById('city-card-content');
    // Имя и описание берутся из статичных CITIES — рендерятся через escapeHtml.
    expect(root.querySelector('.city-card-name').textContent).toBe('Минск');
    assertNoLiveDanger(root);
  });

  it('#3 cityNotes в renderCityCard — textarea.value = текст, breakout невозможен', () => {
    const payload = '</textarea><img src=x onerror=alert(1)>';
    __setTestState(baseState({
      visitedCities: { minsk: { date: '2025-01-01' } },
      cityNotes: { minsk: payload },
    }));
    renderCityCard('minsk');
    const root = document.getElementById('city-card-content');
    const ta = root.querySelector('#city-card-note');
    expect(ta).not.toBeNull();
    // .value — это текст, HTML внутри textarea не парсится браузером.
    expect(ta.value).toBe(payload);
    assertNoLiveDanger(root);
  });

  it('#4 chronicle entries (milestones + visited) в renderProfile — экранированы', () => {
    __setTestState(baseState({
      visitedCities: { minsk: { date: '2025-06-01' } },
      milestones: [{ cityId: 'minsk', date: '2025-06-01', tier: 'silver' }],
    }));
    renderProfile();
    const root = document.getElementById('tab-profile');
    // Метки хроники построены из статичных имён городов — инжекта нет.
    const items = root.querySelectorAll('.chronicle-city');
    expect(items.length).toBeGreaterThan(0);
    items.forEach((el) => {
      expect(el.querySelectorAll('img, script')).toHaveLength(0);
    });
    assertNoLiveDanger(root);
  });

  it('#5 city.name в buildSearchResults — строка без живых тегов инжекта', () => {
    const state = baseState({ passportSearchQuery: '' });
    const html = buildSearchResults(state);
    // Имена городов статичны и экранируются. Строка не должна содержать «живой» инъекции.
    expect(html).not.toContain('<script');
    expect(html).not.toContain('</script');
    // onerror как атрибут внутри тега невозможен (имя через escapeHtml → текст).
    // Допускается только текстовое вхождение подстроки внутри экранированного текста,
    // поэтому проверяем отсутствие паттерна «живого» атрибута: 'onerror=' без '&lt;'.
    // Учитываем, что escapeHtml не экранирует '=', но разоружает '<img' → '&lt;img'.
    expect(html).not.toMatch(/<img[^>]*onerror=/);
  });
});

describe('regression: check-xss сканер ловит убранный escape', () => {
  // Косвенная гарантия: сам escapeHtml нейтрализует тег. Если бы рендер убрал escapeHtml,
  // то textContent остался бы тем же, а innerHTML содержал бы &lt;img... или <img... .
  // Здесь фиксируем контракт экранирования через escapeHtml напрямую.
  it('escapeHtml превращает <img ... onerror=...> в безопасный текст', async () => {
    const { escapeHtml } = await import('@shared/lib/dom.js');
    const out = escapeHtml('<img src=x onerror=alert(1)>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });
});
