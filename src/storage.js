const KEY = 'shakerunner.best';
const MODE_KEY = 'shakerunner.mode';

const bestKey = (mode) => (mode === 'rentner' ? `${KEY}.rentner` : KEY);

export function loadBest(mode = 'normal') {
  try { return parseInt(localStorage.getItem(bestKey(mode)), 10) || 0; } catch { return 0; }
}

export function saveBest(v, mode = 'normal') {
  try { localStorage.setItem(bestKey(mode), String(v)); } catch { /* privater Modus */ }
}

export function loadMode() {
  try { return localStorage.getItem(MODE_KEY) === 'rentner' ? 'rentner' : 'normal'; } catch { return 'normal'; }
}

export function saveMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* privater Modus */ }
}
