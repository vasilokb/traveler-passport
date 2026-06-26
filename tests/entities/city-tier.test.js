import { describe, it, expect } from 'vitest';
import {
  getCityTier, getSightsCount, hasChecklist, getCheckedCount, getTierLabel, getTierEmoji,
} from '@entities/city/index.js';
import { SIGHTS } from '@entities/sight/index.js';

const CHECKLIST_CITY = 'minsk';  // 4 sights in SIGHTS
const PLAIN_CITY = 'slutsk';    // нет чек-листа (не в SIGHTS)

function stateWith(over) {
  return Object.assign({ visitedCities: {}, checkedSights: {}, plannedCities: {} }, over);
}

describe('getSightsCount / hasChecklist', () => {
  it('возвращает число достопримечательностей для города с чек-листом', () => {
    expect(getSightsCount(CHECKLIST_CITY, SIGHTS)).toBe(4);
  });
  it('возвращает 0 для города без чек-листа', () => {
    expect(getSightsCount(PLAIN_CITY, SIGHTS)).toBe(0);
  });
  it('hasChecklist true/false', () => {
    expect(hasChecklist(CHECKLIST_CITY, SIGHTS)).toBe(true);
    expect(hasChecklist(PLAIN_CITY, SIGHTS)).toBe(false);
  });
});

describe('getCityTier', () => {
  it('null — город не посещён', () => {
    expect(getCityTier(CHECKLIST_CITY, stateWith({ visitedCities: {} }), SIGHTS)).toBeNull();
  });
  it('bronze — посещённый город без чек-листа', () => {
    expect(getCityTier(PLAIN_CITY, stateWith({ visitedCities: { slutsk: { date: '2025-01-01' } } }), SIGHTS)).toBe('bronze');
  });
  it('bronze — город с чек-листом, ничего не отмечено', () => {
    expect(getCityTier(CHECKLIST_CITY, stateWith({ visitedCities: { minsk: { date: '2025-01-01' } } }), SIGHTS)).toBe('bronze');
  });
  it('silver — чек-лист отмечен частично', () => {
    expect(getCityTier(CHECKLIST_CITY, stateWith({ visitedCities: { minsk: { date: '2025-01-01' } }, checkedSights: { minsk: ['s0'] } }), SIGHTS)).toBe('silver');
  });
  it('gold — чек-лист отмечен полностью', () => {
    expect(getCityTier(CHECKLIST_CITY, stateWith({ visitedCities: { minsk: { date: '2025-01-01' } }, checkedSights: { minsk: ['s0', 's1', 's2', 's3'] } }), SIGHTS)).toBe('gold');
  });
});

describe('getTierLabel / getTierEmoji', () => {
  it('метки всех tier', () => {
    expect(getTierLabel('gold')).toBe('Золото');
    expect(getTierLabel('silver')).toBe('Серебро');
    expect(getTierLabel('bronze')).toBe('Бронза');
    expect(getTierLabel(null)).toBe('');
    expect(getTierLabel(undefined)).toBe('');
  });
  it('эмодзи всех tier', () => {
    expect(getTierEmoji('gold')).toBe('🥇');
    expect(getTierEmoji('silver')).toBe('🥈');
    expect(getTierEmoji('bronze')).toBe('🥉');
    expect(getTierEmoji(null)).toBe('');
  });
});

describe('getCheckedCount', () => {
  it('0 когда checkedSights пуст', () => {
    expect(getCheckedCount(CHECKLIST_CITY, { checkedSights: {} })).toBe(0);
  });
  it('число отмеченных', () => {
    expect(getCheckedCount(CHECKLIST_CITY, { checkedSights: { minsk: ['s0', 's1'] } })).toBe(2);
  });
});
