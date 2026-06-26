import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { escapeHtml, qs, qsa, showToast } from '@shared/lib/dom.js';

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

describe('qs', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="toast"></div><div class="tab-content"></div>';
  });
  it('несуществующий селектор → null', () => {
    expect(qs('#nonexistent')).toBeNull();
  });
  it('существующий селектор → элемент', () => {
    const el = qs('#toast');
    expect(el).not.toBeNull();
    expect(el.id).toBe('toast');
  });
  it('root-параметр ограничивает поиск', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="inner"></span>';
    expect(qs('.inner', root)).not.toBeNull();
    expect(qs('.inner')).toBeNull();
  });
});

describe('qsa', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="tab-content"></div><div class="tab-content"></div>';
  });
  it('возвращает массив совпадений', () => {
    const arr = qsa('.tab-content');
    expect(Array.isArray(arr)).toBe(true);
    expect(arr).toHaveLength(2);
  });
  it('нет совпадений → пустой массив', () => {
    expect(qsa('.nope')).toEqual([]);
  });
});

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="toast" style="display:none"></div>';
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('устанавливает textContent + display:block + класс visible', () => {
    showToast('Привет');
    const toast = document.getElementById('toast');
    expect(toast.textContent).toBe('Привет');
    expect(toast.style.display).toBe('block');
    expect(toast.classList.contains('visible')).toBe(true);
  });
  it('через 2000мс скрывает тост', () => {
    showToast('Привет');
    vi.advanceTimersByTime(2000);
    const toast = document.getElementById('toast');
    expect(toast.style.display).toBe('none');
    expect(toast.classList.contains('visible')).toBe(false);
  });
  it('нет #toast → no-op (не бросает)', () => {
    document.body.innerHTML = '';
    expect(() => showToast('x')).not.toThrow();
  });
});
