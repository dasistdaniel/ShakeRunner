// Pixel-Hindernisse für den Rentner-Modus. Größe = Hitbox (Breite x Höhe des Sprites).
export const OBSTACLE_PAL = {
  w: '#ffffff', y: '#ffe14d', r: '#ff4040', g: '#aaaaaa', b: '#c97b3a',
  k: '#000000', c: '#00e5ff', G: '#39ff88', p: '#ff7ad9',
};

// Kaffeefahrt-Bus: 24 x 12
function busRows() {
  const full = 'w'.repeat(24);
  const win = 'w' + 'ccw'.repeat(7) + 'cw';
  const body = 'w' + 'y'.repeat(22) + 'w';
  const wheelTop = '.'.repeat(3) + '.www.' + '.'.repeat(8) + '.www.' + '.'.repeat(3);
  const wheelMid = '.'.repeat(3) + 'wwwww' + '.'.repeat(8) + 'wwwww' + '.'.repeat(3);
  return [full, win, win, full, body, body, body, body, body, wheelTop, wheelMid, wheelTop];
}

export const OBSTACLES = {
  // Blutdruckmessgerät 10 x 10
  bpm: [
    'wwwwwwwwww',
    'wkkkkkkkkw',
    'wkGkGGkGkw',
    'wkkkkkkkkw',
    'wwwwwwwwww',
    'wggggggggw',
    'wgrrgggccw',
    'wggggggggw',
    'wggggggggw',
    'wwwwwwwwww',
  ],
  // Tablettendose 10 x 12
  pillbox: [
    'wwwwwwwwww', 'wrrwyywccw', 'wrrwyywccw',
    'wwwwwwwwww', 'wGGwppwbbw', 'wGGwppwbbw',
    'wwwwwwwwww', 'wyywrrwGGw', 'wyywrrwGGw',
    'wwwwwwwwww', 'wccwyywrrw', 'wccwyywrrw',
  ],
  // Hund an der Leine 14 x 10
  dog: [
    '..........bb..',
    '.b.bbbbbbbbbbb',
    'bbbbbbbbbbbwkb',
    '.bbbbbbbbbrbbb',
    '..bbbbbbbbbbkk',
    '..bbbbbbbbbbb.',
    '..bbbbbbbbbb..',
    '..bb......bb..',
    '..bb......bb..',
    '..ww......ww..',
  ],
  // Treppenlift 14 x 12
  stairlift: [
    'yy............',
    'yy............',
    'yy............',
    'yy............',
    'yyyyyyyyyyy...',
    'yyyyyyyyyyy...',
    '...gg....gg...',
    '...gg....gg...',
    '...gg....gg...',
    'cccccccccccccc',
    '..gg......gg..',
    '..gg......gg..',
  ],
  bus: busRows(),
};

// Auswahl für den Spawner: [{ kind, w, h }]
export const KINDS = Object.entries(OBSTACLES).map(([kind, rows]) => ({ kind, w: rows[0].length, h: rows.length }));
