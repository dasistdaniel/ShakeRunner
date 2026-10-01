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

// ---- Bestenliste (lokal, je Modus Top 5) und Spielername ----
const SCORES_KEY = 'shakerunner.scores';
const NAME_KEY = 'shakerunner.name';

export function loadScores(mode = 'normal') {
  try { return JSON.parse(localStorage.getItem(`${SCORES_KEY}.${mode}`)) || []; } catch { return []; }
}

// Trägt den Score ein, gibt den Platz (0-basiert) zurück oder -1, wenn nicht in den Top 5
export function addScore(mode, name, score) {
  const list = loadScores(mode);
  const entry = { name, score };
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const rank = list.indexOf(entry);
  list.length = Math.min(list.length, 5);
  try { localStorage.setItem(`${SCORES_KEY}.${mode}`, JSON.stringify(list)); } catch { /* privater Modus */ }
  return rank < 5 ? rank : -1;
}

export function loadName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export function saveName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* privater Modus */ }
}
