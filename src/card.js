// Score-Karte als PNG (zum Teilen): Name, Meter, Hürden, Story-Stufe, Platz.
import { makeSprite, FRAMES, PAL, CALM_PAL } from './render.js';

const W = 600;
const H = 800;
const GROUND = 640;
const STAGE_LABELS = ['RENTNER', 'ROLLATOR', 'NEUE HÜFTE', 'ROLLSTUHL', 'ZIVI KEVIN', 'BLAUE PILLE', 'MOTORRAD', 'PENSIONÄR-MAN'];
const FONT = '"Press Start 2P", monospace';

function lerpColor(a, b, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

// Text mittig, schrumpft bei Bedarf auf die verfügbare Breite
function text(g, str, y, size, color, shadow) {
  g.font = `${size}px ${FONT}`;
  while (g.measureText(str).width > W - 60 && size > 10) { size -= 2; g.font = `${size}px ${FONT}`; }
  g.textAlign = 'center';
  if (shadow) { g.fillStyle = shadow; g.fillText(str, W / 2 + size / 10, y + size / 10); }
  g.fillStyle = color;
  g.fillText(str, W / 2, y);
}

function neonBackground(g) {
  for (let i = 0; i < 16; i++) {
    g.fillStyle = lerpColor('#0a0620', '#8a1a78', i / 15);
    g.fillRect(0, i * 40, W, 40);
  }
  const cx = 300, cy = 560, R = 110;
  for (let dy = -R; dy <= R; dy += 4) {
    if (dy > 10 && ((dy - 10) % 24) < 10 + (dy / R) * 8) continue; // Streifen
    const hw = Math.floor(Math.sqrt(R * R - dy * dy));
    g.fillStyle = dy < 0 ? '#ffe14d' : dy < 50 ? '#ff9a3c' : '#ff2e88';
    g.fillRect(cx - hw, cy + dy, hw * 2, 4);
  }
  g.fillStyle = '#14082b';
  g.fillRect(0, GROUND, W, H - GROUND);
  g.fillStyle = '#00e5ff';
  g.fillRect(0, GROUND, W, 4);
  g.fillStyle = '#3a1d7a';
  for (let x = -300; x <= 900; x += 60) {
    for (let y = GROUND + 8; y < H; y += 4) g.fillRect(Math.round(300 + (x - 300) * (1 + (y - GROUND) / 160 * 2)), y, 2, 4);
  }
}

function calmBackground(g) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#262626';
  g.fillRect(0, GROUND, W, H - GROUND);
  g.fillStyle = '#fff';
  g.fillRect(0, GROUND, W, 6);
  for (let x = 20; x < W; x += 80) g.fillRect(x, GROUND + 40, 40, 6);
}

// info: { rentner, name, score, rank (0-basiert, -1 = nicht in den Top 5), hurdles, stage, url }
export async function makeScoreCard(info) {
  try { await document.fonts.load(`32px ${FONT}`); } catch { /* Schrift optional */ }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  if (info.rentner) calmBackground(g); else neonBackground(g);

  // Figur
  const sprite = makeSprite(FRAMES.runA, info.rentner ? CALM_PAL : PAL);
  g.drawImage(sprite, 260, GROUND - 12 * 10, 8 * 10, 12 * 10);

  text(g, info.rentner ? 'RENTNERRUNNER' : 'SHAKERUNNER', 100, 38, info.rentner ? '#ffe14d' : '#00e5ff', info.rentner ? null : '#ff2e88');
  text(g, info.name, 175, 28, '#ffe14d');
  text(g, `${info.score} M`, 300, 88, '#ffffff', '#000');
  text(g, `${info.hurdles} HÜRDEN`, 380, 24, '#ffffff');
  if (info.rentner) text(g, `STUFE: ${STAGE_LABELS[info.stage] || STAGE_LABELS[0]}`, 430, 22, '#ffe14d');
  if (info.rank >= 0) text(g, `PLATZ ${info.rank + 1} DER BESTENLISTE`, info.rentner ? 480 : 440, 20, '#ffffff');
  text(g, info.url.replace(/^https?:\/\//, ''), 760, 16, info.rentner ? '#aaaaaa' : '#9b8fd1');

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
