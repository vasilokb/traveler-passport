import { describe, it, expect } from 'vitest';
import { CITIES, getCityById } from '@entities/city/index.js';
import { REGIONS } from '@entities/region/index.js';

describe('CITIES данные', () => {
  it('содержит ровно 57 городов', () => {
    expect(CITIES.length).toBe(57);
  });

  it('каждый город имеет обязательные поля', () => {
    CITIES.forEach((city) => {
      expect(typeof city.id).toBe('string');
      expect(city.id.length).toBeGreaterThan(0);
      expect(typeof city.name).toBe('string');
      expect(typeof city.region).toBe('string');
      expect(typeof city.lat).toBe('number');
      expect(typeof city.lon).toBe('number');
      expect(typeof city.description).toBe('string');
    });
  });

  it('каждый city.region существует в REGIONS', () => {
    const regionIds = new Set(REGIONS.map((r) => r.id));
    CITIES.forEach((city) => {
      expect(regionIds.has(city.region)).toBe(true);
    });
  });

  it('все id уникальны', () => {
    const ids = CITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getCityById', () => {
  it('известный id → город', () => {
    const minsk = getCityById('minsk');
    expect(minsk).not.toBeNull();
    expect(minsk.name).toBe('Минск');
  });
  it('несуществующий id → null', () => {
    expect(getCityById('nonexistent')).toBeNull();
  });
});
