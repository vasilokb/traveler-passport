import { describe, it, expect } from 'vitest';
import { REGIONS, REGION_ICONS, createStampSVG, computeStarPoints } from '@entities/region/index.js';

describe('REGIONS данные', () => {
  it('7 регионов', () => {
    expect(REGIONS.length).toBe(7);
  });
  it('регион "minsk" корректен', () => {
    const minsk = REGIONS.find((r) => r.id === 'minsk');
    expect(minsk).toBeDefined();
    expect(minsk.name).toBe('Минск');
    expect(minsk.color).toMatch(/^#/);
  });
  it('каждый регион имеет иконку в REGION_ICONS', () => {
    REGIONS.forEach((r) => {
      expect(REGION_ICONS[r.id]).toBeDefined();
    });
  });
});

describe('createStampSVG', () => {
  it('bronze (дефолт): содержит <svg> и иконку, без ring', () => {
    const svg = createStampSVG('minsk', 'bronze');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).not.toContain('stroke="#C0C0C0"');
    expect(svg).not.toContain('stroke="#FFD700"');
  });
  it('silver → кольцо #C0C0C0', () => {
    const svg = createStampSVG('minsk', 'silver');
    expect(svg).toContain('stroke="#C0C0C0"');
    expect(svg).not.toContain('color="#FFD700"');
  });
  it('gold → кольцо #FFD700 + <g color="#FFD700">', () => {
    const svg = createStampSVG('minsk', 'gold');
    expect(svg).toContain('stroke="#FFD700"');
    expect(svg).toContain('<g color="#FFD700">');
  });
  it('tier не передан → bronze (дефолт)', () => {
    const svg = createStampSVG('minsk');
    expect(svg).not.toContain('stroke="#C0C0C0"');
    expect(svg).not.toContain('stroke="#FFD700"');
  });
  it('невалидный tier → fallback bronze', () => {
    const svg = createStampSVG('minsk', 'platinum');
    expect(svg).not.toContain('stroke="#C0C0C0"');
    expect(svg).not.toContain('stroke="#FFD700"');
  });
  it('несуществующий регион → валидный SVG без иконки (не падает)', () => {
    const svg = createStampSVG('nonexistent', 'bronze');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });
});

describe('computeStarPoints', () => {
  it('возвращает строку из 10 пар (20 чисел) через пробел', () => {
    const pts = computeStarPoints(50, 50, 10);
    const pairs = pts.split(' ');
    expect(pairs).toHaveLength(10);
    pairs.forEach((p) => {
      const [x, y] = p.split(',');
      expect(Number.isFinite(Number(x))).toBe(true);
      expect(Number.isFinite(Number(y))).toBe(true);
    });
  });
});
