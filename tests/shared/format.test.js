import { describe, it, expect } from 'vitest';
import {
  formatDateDisplay, getTodayLocal, normalizeForSearch, getPluralSights,
} from '@shared/lib/format.js';

describe('formatDateDisplay', () => {
  it('YYYY-MM-DD → DD.MM.YYYY', () => {
    expect(formatDateDisplay('2025-04-12')).toBe('12.04.2025');
  });
  it('другая дата', () => {
    expect(formatDateDisplay('2024-01-07')).toBe('07.01.2024');
  });
});

describe('getTodayLocal', () => {
  it('возвращает строку формата YYYY-MM-DD', () => {
    expect(getTodayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('normalizeForSearch', () => {
  it('Минск → нижний регистр, без дефисов/пробелов', () => {
    expect(normalizeForSearch('Минск')).toBe('минск');
  });
  it('Мінск (бел. і → и)', () => {
    expect(normalizeForSearch('Мінск')).toBe('минск');
  });
  it('Нёсіжев (ё→е, і→и, ў→в)', () => {
    expect(normalizeForSearch('Нёсіжаў')).toBe('несижав');
  });
  it('Віцебск → вицебск', () => {
    expect(normalizeForSearch('Віцебск')).toBe('вицебск');
  });
  it('UpperCase → lowercase', () => {
    expect(normalizeForSearch('ABCDEF')).toBe('abcdef');
  });
  it('дефисы и пробелы срезаются (А-Б-Г)', () => {
    expect(normalizeForSearch('А - Б - Г')).toBe('абг');
  });
});

describe('getPluralSights', () => {
  it('1 → достопримечательность', () => {
    expect(getPluralSights(1)).toBe('достопримечательность');
  });
  it('2 → достопримечательности', () => {
    expect(getPluralSights(2)).toBe('достопримечательности');
  });
  it('5 → достопримечательностей', () => {
    expect(getPluralSights(5)).toBe('достопримечательностей');
  });
  it('11 → достопримечательностей', () => {
    expect(getPluralSights(11)).toBe('достопримечательностей');
  });
  it('21 → достопримечательность', () => {
    expect(getPluralSights(21)).toBe('достопримечательность');
  });
  it('22 → достопримечательности', () => {
    expect(getPluralSights(22)).toBe('достопримечательности');
  });
  it('111 → достопримечательностей', () => {
    expect(getPluralSights(111)).toBe('достопримечательностей');
  });
});
