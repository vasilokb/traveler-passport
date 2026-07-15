import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initProfile, renderProfile } from '@widgets/profile/index.js';
import { store, _resetForTest } from '../../src/app/store.js';

function setupDom() {
  document.body.innerHTML = '<div id="tab-profile"></div>';
}

describe('widgets/profile', () => {
  beforeEach(() => {
    _resetForTest();
    setupDom();
  });

  it('renderProfile → ордена (gold/silver/bronze counts) и хроника', () => {
    store.setState({
      onboardingComplete: true,
      travelerName: 'Тестер',
      visitedCities: { minsk: { date: '2025-06-01' } },
      milestones: [{ cityId: 'minsk', date: '2025-06-01', tier: 'silver' }],
    });
    renderProfile();
    var root = document.getElementById('tab-profile');
    expect(root.querySelector('.profile-stat-number').textContent).toBe('1');
    var awards = root.querySelectorAll('.award-count');
    expect(awards.length).toBe(3);
    expect(root.querySelectorAll('.chronicle-city').length).toBeGreaterThan(0);
  });

  it('renderProfile экранирует travelerName (XSS)', () => {
    var payload = '<img src=x onerror=alert(1)>';
    store.setState({ onboardingComplete: true, travelerName: payload });
    renderProfile();
    var root = document.getElementById('tab-profile');
    expect(root.querySelector('.profile-name-text').textContent).toBe(payload);
    expect(root.querySelectorAll('img, script')).toHaveLength(0);
  });

  it('subscribe: re-render ТОЛЬКО при currentTab==="profile"', () => {
    initProfile(store);
    store.setState({ currentTab: 'map', travelerName: 'X' });
    expect(document.getElementById('tab-profile').innerHTML).toBe('');
    store.setState({ currentTab: 'profile', travelerName: 'Y' });
    expect(document.getElementById('tab-profile').querySelector('.profile-name-text').textContent).toBe('Y');
  });

  it('saveEditName → setState({ travelerName }); прямой renderProfile удалён (subscribe)', () => {
    initProfile(store);
    store.setState({ currentTab: 'profile', onboardingComplete: true, travelerName: 'Old' });
    var root = document.getElementById('tab-profile');
    root.querySelector('#profile-edit-btn').click();
    document.getElementById('profile-name-input').value = 'New';
    root.querySelector('#profile-save-btn').click();
    expect(store.getState().travelerName).toBe('New');
  });

  it('cancelEditName → прямой renderProfile (без setState) скрывает edit-режим', () => {
    initProfile(store);
    store.setState({ currentTab: 'profile', onboardingComplete: true, travelerName: 'Old' });
    var root = document.getElementById('tab-profile');
    root.querySelector('#profile-edit-btn').click();
    expect(document.getElementById('profile-name-edit').style.display).toBe('flex');
    document.getElementById('profile-cancel-btn').click();
    expect(document.getElementById('profile-name-edit').style.display).toBe('none');
  });
});
