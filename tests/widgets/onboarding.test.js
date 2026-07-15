import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initOnboarding } from '@widgets/onboarding/index.js';
import { store, _resetForTest } from '../../src/app/store.js';

function setupDom() {
  document.body.innerHTML =
    '<div id="onboarding-overlay"></div>' +
    '<input id="onboarding-name-input" />' +
    '<button id="onboarding-continue"></button>' +
    '<button id="onboarding-skip"></button>';
}

describe('widgets/onboarding', () => {
  beforeEach(() => {
    _resetForTest();
    setupDom();
  });

  it('init: onboardingComplete=false → overlay видим (initial show)', () => {
    store.setState({ onboardingComplete: false });
    initOnboarding(store);
    expect(document.getElementById('onboarding-overlay').classList.contains('visible')).toBe(true);
  });

  it('init: onboardingComplete=true → overlay скрыт', () => {
    store.setState({ onboardingComplete: true });
    initOnboarding(store);
    expect(document.getElementById('onboarding-overlay').classList.contains('visible')).toBe(false);
  });

  it('handleContinue → setState({ travelerName, onboardingComplete:true }) + overlay скрывается (subscribe)', () => {
    initOnboarding(store);
    document.getElementById('onboarding-name-input').value = 'Алиса';
    document.getElementById('onboarding-continue').click();
    var s = store.getState();
    expect(s.travelerName).toBe('Алиса');
    expect(s.onboardingComplete).toBe(true);
    expect(document.getElementById('onboarding-overlay').classList.contains('visible')).toBe(false);
  });

  it('handleContinue с пустым именем → default имя', () => {
    initOnboarding(store);
    document.getElementById('onboarding-name-input').value = '   ';
    document.getElementById('onboarding-continue').click();
    expect(store.getState().travelerName).toBe('Белорусский путешественник');
  });

  it('handleSkip → onboardingComplete=true, default имя', () => {
    initOnboarding(store);
    document.getElementById('onboarding-skip').click();
    var s = store.getState();
    expect(s.onboardingComplete).toBe(true);
    expect(s.travelerName).toBe('Белорусский путешественник');
  });

  it('Enter в input → handleContinue', () => {
    initOnboarding(store);
    document.getElementById('onboarding-name-input').value = 'Боб';
    document.getElementById('onboarding-name-input').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter' })
    );
    expect(store.getState().travelerName).toBe('Боб');
  });
});
