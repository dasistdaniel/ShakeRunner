// Pixel-Hindernisse für den Rentner-Modus. Größe = Hitbox (Breite x Höhe des Sprites).
export const OBSTACLE_PAL = {
  w: '#ffffff', y: '#ffe14d', r: '#ff4040', g: '#aaaaaa', b: '#c97b3a',
  k: '#000000', c: '#00e5ff', G: '#39ff88', p: '#ff7ad9', s: '#ffcc99',
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

// Boss: Kaffeefahrt-Gruppe 40 x 26 (fünf Rentner nebeneinander, in der Mitte am größten)
function bossRows() {
  const W = 40, H = 26;
  const grid = Array.from({ length: H }, () => Array(W).fill('.'));
  const heights = [16, 22, 26, 22, 16];
  const bodies = ['r', 'c', 'G', 'p', 'y'];
  heights.forEach((h, i) => {
    const x0 = i * 8, top = H - h;
    for (let x = 2; x <= 5; x++) grid[top][x0 + x] = 'w';                    // weiße Haare
    for (let y = 1; y <= 3; y++) for (let x = 2; x <= 5; x++) grid[top + y][x0 + x] = 's'; // Gesicht
    grid[top + 2][x0 + 3] = 'k'; grid[top + 2][x0 + 5] = 'k';                 // Brille
    for (let y = 4; y < H - 4; y++) for (let x = 1; x <= 6; x++) grid[y][x0 + x] = bodies[i]; // Oberkörper
    for (let y = H - 4; y < H; y++) { grid[y][x0 + 2] = 'g'; grid[y][x0 + 3] = 'g'; grid[y][x0 + 4] = 'g'; grid[y][x0 + 5] = 'g'; }
    grid[H - 1][x0 + 2] = 'w'; grid[H - 1][x0 + 5] = 'w';                      // Schuhe
    for (let y = top + 6; y < H; y++) grid[y][x0 + 7] = 'b';                  // Gehstock
  });
  return grid.map((r) => r.join(''));
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
  // Parkbank 16 x 8 (kein Hindernis: Mittagsschlaf, siehe World)
  bench: [
    'GGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGG',
    'g..............g',
    'wwwwwwwwwwwwwwww',
    'GGGGGGGGGGGGGGGG',
    '.g............g.',
    '.g............g.',
    '.g............g.',
  ],
  boss: bossRows(),
};

// Auswahl für den Spawner (nur normale Hürden; Bank und Boss spawnt World gezielt): [{ kind, w, h }]
const HURDLES = ['bpm', 'pillbox', 'dog', 'stairlift', 'bus'];
export const KINDS = HURDLES.map((kind) => ({ kind, w: OBSTACLES[kind][0].length, h: OBSTACLES[kind].length }));
