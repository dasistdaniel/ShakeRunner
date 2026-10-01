const KEY = 'shakerunner.best';

export function loadBest() {
  try { return parseInt(localStorage.getItem(KEY), 10) || 0; } catch { return 0; }
}

export function saveBest(v) {
  try { localStorage.setItem(KEY, String(v)); } catch { /* privater Modus */ }
}
