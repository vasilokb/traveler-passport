import { store } from '@app/store.js';

// widgets/onboarding — онбординг нового пользователя.
// Phase D2 §3.5: hideOnboarding() удаляется (subscribe скрывает overlay при
// onboardingComplete=true через classList.toggle). handleContinue/Skip только
// мутируют state; initial show — явный вызов (subscribe НЕ срабатывает при init).

function showOnboarding() {
  var overlay = document.getElementById("onboarding-overlay");
  if (overlay) overlay.classList.add("visible");
}

function handleOnboardingContinue() {
  var input = document.getElementById("onboarding-name-input");
  var name = input.value.trim();
  store.setState({
    travelerName: name || "Белорусский путешественник",
    onboardingComplete: true,
  });
}

function handleOnboardingSkip() {
  store.setState({
    travelerName: "Белорусский путешественник",
    onboardingComplete: true,
  });
}

export function initOnboarding(store) {
  store.subscribe(function (state) {
    var overlay = document.getElementById("onboarding-overlay");
    if (!overlay) return;
    overlay.classList.toggle("visible", !state.onboardingComplete);
  });

  var continueBtn = document.getElementById("onboarding-continue");
  if (continueBtn) continueBtn.addEventListener("click", handleOnboardingContinue);

  var skipBtn = document.getElementById("onboarding-skip");
  if (skipBtn) skipBtn.addEventListener("click", handleOnboardingSkip);

  var onboardingInput = document.getElementById("onboarding-name-input");
  if (onboardingInput) {
    onboardingInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleOnboardingContinue();
    });
  }

  if (!store.getState().onboardingComplete) {
    showOnboarding();
  }

  return {};
}
