import { describe, it, expect } from 'vitest';
import * as format from '@shared/lib/format.js';
import * as dom from '@shared/lib/dom.js';
import * as storeMechanism from '@shared/lib/store-mechanism.js';
import * as mapConfig from '@shared/config/map-config.js';
import * as city from '@entities/city/index.js';
import * as region from '@entities/region/index.js';
import * as sight from '@entities/sight/index.js';
import * as chronicle from '@lib/chronicle.js';
import * as storage from '@lib/storage.js';
import * as milestones from '@lib/milestones.js';

describe('module exports (smoke на структуру)', () => {
  it('shared/lib/format: formatDateDisplay, getTodayLocal, normalizeForSearch, getPluralSights', () => {
    ['formatDateDisplay', 'getTodayLocal', 'normalizeForSearch', 'getPluralSights']
      .forEach(n => expect(typeof format[n]).toBe('function'));
  });
  it('shared/lib/dom: escapeHtml, qs, qsa, showToast', () => {
    ['escapeHtml', 'qs', 'qsa', 'showToast']
      .forEach(n => expect(typeof dom[n]).toBe('function'));
  });
  it('shared/lib/store-mechanism: createStore', () => {
    expect(typeof storeMechanism.createStore).toBe('function');
  });
  it('shared/config/map-config: MAP, projectToSVG', () => {
    expect(mapConfig.MAP).toBeDefined();
    expect(typeof mapConfig.projectToSVG).toBe('function');
  });
  it('entities/city: 57 городов + все хелперы', () => {
    expect(Array.isArray(city.CITIES)).toBe(true);
    expect(city.CITIES.length).toBe(57);
    expect(typeof city.getCityById).toBe('function');
    ['getSightsCount', 'hasChecklist', 'getCheckedCount', 'getCityTier', 'getTierLabel', 'getTierEmoji']
      .forEach(n => expect(typeof city[n]).toBe('function'));
  });
  it('entities/region: REGIONS, REGION_ICONS, createStampSVG, computeStarPoints', () => {
    expect(Array.isArray(region.REGIONS)).toBe(true);
    expect(region.REGION_ICONS).toBeDefined();
    ['createStampSVG', 'computeStarPoints'].forEach(n => expect(typeof region[n]).toBe('function'));
  });
  it('entities/sight: SIGHTS объект', () => {
    expect(typeof sight.SIGHTS).toBe('object');
    expect(sight.SIGHTS.minsk).toBeDefined();
    expect(sight.SIGHTS.minsk.length).toBe(4);
  });
  it('lib/chronicle: generateChronicle (без formatDateDisplay — переехал в shared/lib/format)', () => {
    expect(typeof chronicle.generateChronicle).toBe('function');
  });
  it('lib/storage: STORAGE_KEY, getDefaultState, loadState, saveState', () => {
    expect(storage.STORAGE_KEY).toBe('travelerPassport');
    ['getDefaultState', 'loadState', 'saveState'].forEach(n => expect(typeof storage[n]).toBe('function'));
  });
  it('lib/milestones: addMilestone, removeMilestone, removeAllMilestones', () => {
    ['addMilestone', 'removeMilestone', 'removeAllMilestones']
      .forEach(n => expect(typeof milestones[n]).toBe('function'));
  });
});
