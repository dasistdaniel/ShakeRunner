import { PX, GROUND, PH } from './player.js';

export const W = 180;
export const H = 320;

const PAL = { b: '#ff2e88', s: '#ffcc99', k: '#1a0b33', j: '#00e5ff', p: '#5b3cff', w: '#ffffff' };
const CALM_PAL = { b: '#ffe14d', s: '#ffffff', k: '#000000', j: '#ffffff', p: '#00e5ff', w: '#ffe14d' };
const ROLLATOR = ['rrrrrrrrr', '.r.....r.', '.r.....r.', '.r.....r.', '.w.....w.', 'www...www'];
const ROLLATOR_PAL = { r: '#ff4040', w: '#ffffff' };
const WHEEL = [
  '..wwwww..', '.w.....w.', 'w.......w', 'w.......w', 'w...w...w', 'w.......w', 'w.......w', '.w.....w.', '..wwwww..',
];
const ZIVI_PAL = { b: '#39ff88', s: '#ffffff', k: '#000000', j: '#39ff88', p: '#39ff88', w: '#ffffff' };
const PILL = ['.wwwwwwww.', 'wBBBBLLLLw', 'wBBBBLLLLw', 'wBBBBLLLLw', 'wBBBBLLLLw', '.wwwwwwww.'];
const PILL_PAL = { w: '#ffffff', B: '#1f4fff', L: '#8fb8ff' };
const FRAMES = {
  runA: ['..bbbb..', '.bbbbbb.', '.ssssss.', '.sksssk.', '..ssss..', '.jjjjjj.', 'jjjjjjjj', 'jj.jj.jj', '..pppp..', '.pp..pp.', 'pp....pp', 'ww....ww'],
  runB: ['..bbbb..', '.bbbbbb.', '.ssssss.', '.sksssk.', '..ssss..', '.jjjjjj.', 'jjjjjjjj', '.j.jj.j.', '..pppp..', '..pppp..', '..pp.pp.', '..ww.ww.'],
  jump: ['..bbbb..', '.bbbbbb.', '.ssssss.', '.sksssk.', '..ssss..', 'jjjjjjjj', 'j.jjjj.j', '..jjjj..', '..pppp..', '.pp..pp.', '.pp..pp.', '.ww..ww.'],
};

function makeSprite(rows, pal = PAL) {
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); }
  }));
  return c;
}

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function makeSkyline(seed, w, minH, maxH, body, win) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = maxH;
  const g = c.getContext('2d');
  const r = rng(seed);
  let x = 0;
  while (x < w) {
    const bw = 14 + Math.floor(r() * 22);
    const bh = minH + Math.floor(r() * (maxH - minH));
    g.fillStyle = body;
    g.fillRect(x, maxH - bh, bw, bh);
    for (let wy = maxH - bh + 4; wy < maxH - 4; wy += 6) {
      for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        if (r() < 0.35) { g.fillStyle = win[Math.floor(r() * win.length)]; g.fillRect(wx, wy, 2, 3); }
      }
    }
    x += bw + (r() < 0.3 ? 2 : 0);
  }
  return c;
}

function lerpColor(a, b, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const sprites = { runA: makeSprite(FRAMES.runA), runB: makeSprite(FRAMES.runB), jump: makeSprite(FRAMES.jump) };
  const far = makeSkyline(7, 360, 30, 80, '#1d1040', ['#3a2a7a']);
  const near = makeSkyline(21, 360, 20, 62, '#2a1260', ['#ffe14d', '#00e5ff', '#ff2e88']);
  const bands = [];
  const BAND = 14, NB = Math.ceil(GROUND / BAND);
  for (let i = 0; i < NB; i++) bands.push(lerpColor('#0a0620', '#8a1a78', Math.round((i / (NB - 1)) * 10) / 10));
  const sr = rng(99);
  const stars = Array.from({ length: 30 }, () => ({ x: Math.floor(sr() * W), y: Math.floor(sr() * 120), ph: sr() * 6 }));

  const calmSprites = {
    runA: makeSprite(FRAMES.runA, CALM_PAL), runB: makeSprite(FRAMES.runB, CALM_PAL), jump: makeSprite(FRAMES.jump, CALM_PAL),
  };

  // Rollstuhl bei x; frame = Sitzender (oder null = leer), zivi = Schieber-Sprite (oder null)
  function drawChair(x, by, frame, zivi) {
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x - 3, by - 14, 4, 1);                  // Schiebegriff
    ctx.fillRect(x - 1, by - 14, 2, 10);                 // Rückenlehne
    if (frame) ctx.drawImage(frame, 0, 0, 8, 8, x, by - 14, 8, 8); // Oberkörper
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x - 1, by - 4, 9, 1);                   // Sitz
    if (frame) {
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(x + 3, by - 6, 7, 2);                 // Oberschenkel
      ctx.fillRect(x + 8, by - 4, 2, 3);                 // Unterschenkel
      ctx.fillStyle = '#ffe14d';
      ctx.fillRect(x + 8, by - 1, 4, 1);                 // Schuhe
    }
    ctx.drawImage(wheel, x - 1, by - 9);
    if (zivi) ctx.drawImage(zivi, x - 11, by - PH);
  }

  // Figur je nach Stufe: 0 Rentner, 1 +Rollator, 2 neue Hüfte, 3 Rollstuhl, 4 Rollstuhl + Zivi,
  // 5 blaue Pille: steht auf, rennt selbst, Rollstuhl + Zivi bleiben zurück
  function drawCharacter(player, time, scroll) {
    const y = Math.round(player.y);
    const by = GROUND - y;
    const air = player.y !== 0;
    const pick = (set) => (air ? set.jump : (Math.floor(player.anim) % 2 ? set.runA : set.runB));
    const frame = pick(calmSprites);
    const st = player.stage;

    if (st === 5) {
      const cx = Math.round(player.chairX - Math.floor(scroll));
      if (cx > -26) drawChair(cx, GROUND, null, ziviSprites.runB);
    }
    if (st === 3 || st === 4) {
      drawChair(PX, by, frame, st === 4 ? pick(ziviSprites) : null);
      return;
    }

    ctx.drawImage(frame, PX, by - PH);
    if (st === 1) ctx.drawImage(rollator, PX + 4, by - 6);
    if (st === 2) { // neue Hüfte: glitzert
      ctx.fillStyle = Math.floor(time * 6) % 2 ? '#ffffff' : '#00e5ff';
      ctx.fillRect(PX + 2, by - 5, 2, 2);
    }
  }

  // Rentner-Modus: schwarz/weiß/gelb, keine Effekte, nur das Nötigste
  function drawCalm({ player, world, scroll, state, time }) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#262626';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, GROUND, W, 2);
    const d = Math.floor(scroll);
    for (let x = -(d % 24); x < W; x += 24) ctx.fillRect(x, GROUND + 12, 12, 2); // Tempo-Markierungen
    for (const o of world.obs) {
      const x = Math.round(o.x - d);
      if (x > W || x + o.w < 0) continue;
      if (o.type === 'pill') {
        ctx.drawImage(pill, x, GROUND - 37 + Math.round(Math.sin(time * 5) * 2));
        continue;
      }
      if (o.type === 'pit') {
        ctx.fillStyle = '#000';
        ctx.fillRect(x, GROUND, o.w, H - GROUND);
        ctx.fillStyle = '#ffe14d';
        ctx.fillRect(x, GROUND, 2, H - GROUND);
        ctx.fillRect(x + o.w - 2, GROUND, 2, H - GROUND);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 2, GROUND - o.h - 2, o.w + 4, o.h + 2);
        ctx.fillStyle = '#ffe14d';
        ctx.fillRect(x, GROUND - o.h, o.w, o.h);
      }
    }
    if (state !== 'DEAD' || player.dead === 'fall') drawCharacter(player, time, scroll);
    if (state === 'PLAY') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(6, 24, W - 12, 8);
      ctx.fillStyle = '#000';
      ctx.fillRect(8, 26, W - 16, 4);
      ctx.fillStyle = '#ffe14d';
      ctx.fillRect(8, 26, Math.round((W - 16) * player.e / 100), 4);
    }
  }

  const rollator = makeSprite(ROLLATOR, ROLLATOR_PAL);
  const wheel = makeSprite(WHEEL, { w: '#ffffff' });
  const pill = makeSprite(PILL, PILL_PAL);
  const ziviSprites = {
    runA: makeSprite(FRAMES.runA, ZIVI_PAL), runB: makeSprite(FRAMES.runB, ZIVI_PAL), jump: makeSprite(FRAMES.jump, ZIVI_PAL),
  };

  let parts = [];
  let dustT = 0;

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * speed;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: 0.4 + Math.random() * 0.4, color });
    }
  }

  function update(dt, player, running) {
    if (running && player.y === 0 && !player.pit && player.speed > 50) {
      dustT -= dt;
      if (dustT <= 0) {
        dustT = 0.06;
        parts.push({ x: PX + 2, y: GROUND - 1, vx: -player.speed * 0.25, vy: -Math.random() * 25, life: 0.3, color: '#8a7fc4' });
      }
    }
    if (player.landed) { burst(PX + 4, GROUND - 1, '#8a7fc4', 6, 45); player.landed = false; }
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);
  }

  function draw(g) {
    if (g.calm) { drawCalm(g); return; }
    const { player, world, scroll, pulse, time, shake, state } = g;
    ctx.save();
    if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * shake * 12), Math.round((Math.random() - 0.5) * shake * 12));

    // Himmel
    for (let i = 0; i < NB; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(0, i * BAND, W, BAND); }
    ctx.fillStyle = `rgba(255,46,136,${pulse * 0.12})`;
    ctx.fillRect(0, 100, W, GROUND - 100);
    ctx.fillStyle = '#fff';
    for (const s of stars) if (Math.sin(time * 3 + s.ph) > -0.3) ctx.fillRect(s.x, s.y, 1, 1);

    // Sonne mit Streifen
    const cx = 90, cy = GROUND - 78, R = 36 + Math.round(pulse * 2);
    for (let dy = -R; dy <= R; dy++) {
      if (dy > 4 && ((dy - 4) % 8) < 3 + (dy / R) * 2) continue;
      const hw = Math.floor(Math.sqrt(R * R - dy * dy));
      ctx.fillStyle = dy < 0 ? '#ffe14d' : dy < 18 ? '#ff9a3c' : '#ff2e88';
      ctx.fillRect(cx - hw, cy + dy, hw * 2, 1);
    }

    // Skyline (Parallax)
    const fx = -Math.floor((scroll * 0.08) % 360), nx = -Math.floor((scroll * 0.22) % 360);
    ctx.drawImage(far, fx, GROUND - far.height);
    ctx.drawImage(far, fx + 360, GROUND - far.height);
    ctx.drawImage(near, nx, GROUND - near.height);
    ctx.drawImage(near, nx + 360, GROUND - near.height);

    // Boden + Grid
    ctx.fillStyle = '#14082b';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    const depth = H - GROUND;
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 26 - scroll * 0.9) % 312 + 312) % 312 - 40;
      for (let y = GROUND + 1; y < H; y += 2) {
        const k = (y - GROUND) / depth;
        ctx.fillStyle = k < 0.3 ? '#3a1d7a' : '#5b2fb0';
        ctx.fillRect(Math.round(90 + (bx - 90) * (1 + k * 2.4)), y, 1, 2);
      }
    }
    ctx.fillStyle = '#3a1d7a';
    for (const k of [0.1, 0.25, 0.5, 0.85]) ctx.fillRect(0, GROUND + Math.round(depth * k), W, 1);
    ctx.fillStyle = pulse > 0.5 ? '#ffffff' : '#00e5ff';
    ctx.fillRect(0, GROUND, W, 1);

    // Hindernisse
    const d = Math.floor(scroll);
    for (const o of world.obs) {
      const x = Math.round(o.x - d);
      if (x > W || x + o.w < 0) continue;
      if (o.type === 'pit') {
        ctx.fillStyle = '#05020d';
        ctx.fillRect(x, GROUND, o.w, H - GROUND);
        ctx.fillStyle = '#ff2e88';
        ctx.fillRect(x, GROUND, 1, H - GROUND);
        ctx.fillRect(x + o.w - 1, GROUND, 1, H - GROUND);
      } else {
        const y = GROUND - o.h;
        ctx.fillStyle = '#c4146e';
        ctx.fillRect(x, y, o.w, o.h);
        ctx.fillStyle = '#ff5fa8';
        ctx.fillRect(x, y, o.w, 2);
        ctx.fillRect(x, y, 2, o.h);
        ctx.fillStyle = '#6e0a3d';
        ctx.fillRect(x + o.w - 2, y + 2, 2, o.h - 2);
        ctx.fillRect(x + 2, GROUND - 2, o.w - 2, 2);
        ctx.fillStyle = '#ffe14d';
        for (let hy = y + 5; hy < GROUND - 3; hy += 6) ctx.fillRect(x + 3, hy, o.w - 6, 2);
      }
    }

    // Figur
    if (state !== 'DEAD' || player.dead === 'fall') {
      const frame = player.y !== 0 ? sprites.jump : (Math.floor(player.anim) % 2 ? sprites.runA : sprites.runB);
      ctx.drawImage(frame, PX, Math.round(GROUND - PH - player.y));
    }

    // Partikel
    for (const p of parts) { ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }

    // Speedlines
    if (state === 'PLAY' && player.e > 65) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 4; i++) {
        const y = 60 + ((i * 53 + Math.floor(time * 60) * 7) % 190);
        const x = W - ((time * 400 + i * 71) % W);
        ctx.fillRect(Math.round(x), y, 14, 1);
      }
    }

    // Energie-Balken
    if (state === 'PLAY') {
      const e = player.e / 100;
      ctx.fillStyle = '#000';
      ctx.fillRect(6, 24, W - 12, 7);
      ctx.fillStyle = e < 0.15 ? (Math.floor(time * 8) % 2 ? '#ff2e2e' : '#7a0000') : e < 0.5 ? '#ffe14d' : '#39ff88';
      ctx.fillRect(7, 25, Math.round((W - 14) * e), 5);
    }

    ctx.restore();
  }

  return { draw, update, burst };
}
