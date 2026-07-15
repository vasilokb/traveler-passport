import { describe, it, expect } from 'vitest';
import * as mainModule from '../../src/app/main.js';

// Phase D2 §7.2: main.js — skeleton. Старые test-only экспорты (renderProfile,
// renderCityCard, __setTestState) удалены — рендеры в widgets/, тесты используют
// store.setState напрямую.
describe('app/main — skeleton (Phase D2)', () => {
  it('не экспортирует рендер-функции (переехали в widgets/)', () => {
    expect(mainModule.renderProfile).toBeUndefined();
    expect(mainModule.renderCityCard).toBeUndefined();
    expect(mainModule.__setTestState).toBeUndefined();
  });

  it('не имеет named exports (skeleton: только bootstrap + DOMContentLoaded)', () => {
    expect(Object.keys(mainModule)).toHaveLength(0);
  });
});
