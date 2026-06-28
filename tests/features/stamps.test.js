import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { initStamps } from '@features/stamps/index.js';
import { renderStampOverlay, closeStampOverlay } from '@features/stamps/overlay.js';
import { store, _resetForTest } from '../../src/app/store.js';

function makeHooks() {
  return {
    switchTab: vi.fn(),
    closeCityCard: vi.fn(),
  };
}

describe('features/stamps', () => {
  let hooks;
  beforeEach(() => {
    _resetForTest();
    // DOM для closeStampOverlay / renderStampOverlay (direct imports — НЕ моки).
    document.body.innerHTML =
      '<div id="stamp-overlay" style="display:flex"></div>' +
      '<div id="stamp-overlay-content"></div>' +
      '<div id="toast" style="display:none"></div>';
    hooks = makeHooks();
  });

  describe('renderStampOverlay / closeStampOverlay', () => {
    it('renderStampOverlay строит DOM с городом и кнопками + показывает overlay', () => {
      renderStampOverlay('minsk', vi.fn(), vi.fn());
      var content = document.getElementById('stamp-overlay-content');
      expect(content.querySelector('.stamp-card')).not.toBeNull();
      expect(content.querySelector('.stamp-card-city').textContent).toBe('Минск');
      expect(content.querySelector('#stamp-share-btn')).not.toBeNull();
      expect(content.querySelector('#stamp-collection-btn')).not.toBeNull();
      // D-1 bugfix (§17): overlay становится видимым (display:flex).
      expect(document.getElementById('stamp-overlay').style.display).toBe('flex');
    });

    it('renderStampOverlay: кнопки вызывают переданные callbacks', () => {
      var onShare = vi.fn();
      var onCollection = vi.fn();
      renderStampOverlay('minsk', onShare, onCollection);
      document.getElementById('stamp-share-btn').click();
      expect(onShare).toHaveBeenCalledWith('Минск');
      document.getElementById('stamp-collection-btn').click();
      expect(onCollection).toHaveBeenCalledWith('minsk');
    });

    it('renderStampOverlay: несуществующий город → no-op', () => {
      renderStampOverlay('nonexistent', vi.fn(), vi.fn());
      var content = document.getElementById('stamp-overlay-content');
      expect(content.querySelector('.stamp-card')).toBeNull();
    });

    it('closeStampOverlay прячет overlay и сбрасывает stampOverlayCityId', () => {
      store.setState({ stampOverlayCityId: 'minsk' });
      document.getElementById('stamp-overlay').style.display = 'flex';

      closeStampOverlay();

      expect(document.getElementById('stamp-overlay').style.display).toBe('none');
      expect(store.getState().stampOverlayCityId).toBeNull();
    });
  });

  describe('goToCollection', () => {
    it('закрывает overlay + city-card, setState currentTab=passport + openedRegions', () => {
      var api = initStamps(store, hooks);
      store.setState({ stampOverlayCityId: 'minsk', currentTab: 'map' });

      api.goToCollection('minsk');

      var s = store.getState();
      expect(s.currentTab).toBe('passport');
      // minsk region === 'minsk' → должен попасть в openedRegions
      expect(s.openedRegions).toContain('minsk');
      expect(hooks.closeCityCard).toHaveBeenCalled();
      expect(hooks.switchTab).toHaveBeenCalledWith('passport');
    });

    it('не дублирует region в openedRegions', () => {
      store.setState({ openedRegions: ['minsk'] });
      var api = initStamps(store, hooks);
      api.goToCollection('minsk');
      var regions = store.getState().openedRegions;
      expect(regions.filter(r => r === 'minsk')).toHaveLength(1);
    });

    it('scrollIntoView + highlight через 300мс (fake timers)', () => {
      vi.useFakeTimers();
      // Добавим ячейку штампа в DOM, чтобы scrollIntoView сработал.
      var cell = document.createElement('div');
      cell.className = 'stamp-cell';
      cell.setAttribute('data-city-id', 'minsk');
      cell.scrollIntoView = vi.fn();
      document.body.appendChild(cell);

      var api = initStamps(store, hooks);
      api.goToCollection('minsk');

      // До таймера — без подсветки
      expect(cell.classList.contains('stamp-highlight')).toBe(false);

      vi.advanceTimersByTime(299);
      expect(cell.classList.contains('stamp-highlight')).toBe(false);

      vi.advanceTimersByTime(1);
      expect(cell.scrollIntoView).toHaveBeenCalled();
      expect(cell.classList.contains('stamp-highlight')).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('showShareText', () => {
    afterEach(() => {
      delete navigator.share;
      delete navigator.clipboard;
    });

    it('navigator.share доступен → вызывает share с текстом города', async () => {
      navigator.share = vi.fn().mockResolvedValue(undefined);
      var api = initStamps(store, hooks);
      api.showShareText('Минск');
      // share асинхронный — flush microtasks
      await Promise.resolve();
      await Promise.resolve();
      expect(navigator.share).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('Минск') })
      );
    });

    it('clipboard fallback → writeText + toast', async () => {
      delete navigator.share;
      navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
      var api = initStamps(store, hooks);
      api.showShareText('Брест');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Брест')
      );
      expect(document.getElementById('toast').style.display).toBe('block');
    });
  });
});
