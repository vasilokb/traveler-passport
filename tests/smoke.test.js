import { describe, it, expect } from 'vitest';
import * as dates from '../src/lib/dates.js';
import * as dom from '../src/lib/dom.js';
import * as tier from '../src/lib/tier.js';
import * as chronicle from '../src/lib/chronicle.js';
import * as storage from '../src/lib/storage.js';
import * as cities from '../src/cities.js';
import * as sights from '../src/data-sights.js';

describe('module exports (smoke)', () => {
  it('dates: getTodayLocal', () => {
    expect(typeof dates.getTodayLocal).toBe('function');
  });
  it('dom: escapeHtml', () => {
    expect(typeof dom.escapeHtml).toBe('function');
  });
  it('tier: все хелперы', () => {
    ['getSightsCount', 'hasChecklist', 'getCheckedCount', 'getCityTier', 'getTierLabel', 'getTierEmoji']
      .forEach(n => expect(typeof tier[n]).toBe('function'));
  });
  it('chronicle: formatDateDisplay, generateChronicle', () => {
    ['formatDateDisplay', 'generateChronicle'].forEach(n => expect(typeof chronicle[n]).toBe('function'));
  });
  it('storage: STORAGE_KEY, getDefaultState, loadState, saveState', () => {
    expect(storage.STORAGE_KEY).toBe('travelerPassport');
    expect(typeof storage.getDefaultState).toBe('function');
    expect(typeof storage.loadState).toBe('function');
    expect(typeof storage.saveState).toBe('function');
  });
  it('cities: 57 городов + helpers', () => {
    expect(Array.isArray(cities.CITIES)).toBe(true);
    expect(cities.CITIES.length).toBe(57);
    expect(typeof cities.getCityById).toBe('function');
    expect(Array.isArray(cities.REGIONS)).toBe(true);
    expect(cities.REGION_ICONS).toBeDefined();
    expect(cities.MAP).toBeDefined();
    expect(typeof cities.createStampSVG).toBe('function');
    expect(typeof cities.projectToSVG).toBe('function');
    expect(typeof cities.computeStarPoints).toBe('function');
  });
  it('data-sights: SIGHTS объект', () => {
    expect(typeof sights.SIGHTS).toBe('object');
    expect(sights.SIGHTS.minsk).toBeDefined();
    expect(sights.SIGHTS.minsk.length).toBe(4);
  });
});
