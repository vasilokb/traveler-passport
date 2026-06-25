import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../src/lib/dom.js';

describe('escapeHtml (createTextNode + innerHTML)', () => {
  it('экранирует < > в XSS-векторе', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('экранирует &', () => {
    expect(escapeHtml('&')).toBe('&amp;');
  });
  it('экранирует <', () => {
    expect(escapeHtml('<')).toBe('&lt;');
  });
  it('экранирует >', () => {
    expect(escapeHtml('>')).toBe('&gt;');
  });
  it('НЕ экранирует двойную кавычку', () => {
    expect(escapeHtml('"')).toBe('"');
  });
  it('НЕ экранирует одинарную кавычку', () => {
    expect(escapeHtml("'")).toBe("'");
  });
  it('null → "null" (String(null))', () => {
    expect(escapeHtml(null)).toBe('null');
  });
  it('undefined → "undefined"', () => {
    expect(escapeHtml(undefined)).toBe('undefined');
  });
  it('кириллица с ё/і/ў не ломается', () => {
    expect(escapeHtml('Ёлка і воўк')).toBe('Ёлка і воўк');
  });
});
