// app/processing — мьютекс isProcessing (централизованное мутабельное состояние).
// Phase D2 §2: вынесен из main.js. Features получают withMux/withMuxSlow через
// hooks и оборачивают свои public-методы; features НЕ имеют прямого доступа к
// isProcessing — только через wrappers.
export let isProcessing = false;

export function withMux(fn) {
  return function (...args) {
    if (isProcessing) return;
    isProcessing = true;
    try { return fn.apply(this, args); }
    finally { setTimeout(function () { isProcessing = false; }, 400); }
  };
}

export function withMuxSlow(fn) {
  return function (...args) {
    if (isProcessing) return;
    isProcessing = true;
    try { return fn.apply(this, args); }
    finally { setTimeout(function () { isProcessing = false; }, 560); }
  };
}
