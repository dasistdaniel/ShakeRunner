import { createInput } from './input.js';
import { Player, PX, GROUND } from './player.js';
import { World } from './world.js';
import { GameAudio } from './audio.js';
import { createRenderer } from './render.js';
import { createStory, ZIVI_NAME } from './story.js';
import { loadBest, saveBest, loadMode, saveMode, loadScores, addScore, loadName, saveName } from './storage.js';

const STEP = 1 / 60;
const REASONS = {
  normal: {
    crash: 'GEGEN DIE WAND!',
    fall: 'IM ABGRUND VERSUNKEN!',
    breath: 'AUSSER ATEM! SCHÜTTEL WEITER!',
  },
  rentner: {
    crash: 'AUA! MEIN RÜCKEN!',
    fall: 'LOCH IM WEG!',
    breath: 'NICKERCHEN GEMACHT?',
    kevin: `${ZIVI_NAME} HAT DICH<br>ERWISCHT!`,
  },
};
const HINTS = {
  normal: 'HANDY SCHÜTTELN = RENNEN<br>RUCK NACH OBEN = SPRINGEN',
  rentner: 'GANZ GEMÜTLICH SCHÜTTELN<br>SANFT NACH OBEN = SPRINGEN',
};

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const wrap = $('wrap');
const overlay = $('overlay');
const hud = $('hud');
const msg = $('msg');
const startBtn = $('startBtn');
const modeBtn = $('modeBtn');
const shareBtn = $('shareBtn');
const nameInput = $('nameInput');
const scoresEl = $('scores');
const toast = $('toast');
const shout = $('shout');
const quip = $('quip');

const player = new Player();
const world = new World();
const audio = new GameAudio();
const input = createInput(canvas);
const renderer = createRenderer(canvas);

let state = 'MENU'; // MENU | PLAY | DEAD | OVER
let rentner = location.search.includes('rentner') || loadMode() === 'rentner'; // ?rentner = Link zum Weiterschicken
let best = 0;
let deadT = 0;
let shake = 0;
let idleScroll = 0;
let overAt = 0;
let time = 0;
let wake = null;
let cueOn = true; // Absprung-Hinweiston (Taste M schaltet um)
let shoutDelay = null;
let toastDelay = null;
let glitchT = 0;

// ---- Banner (Upgrades), Kevins Zuruf, Kommentare ----
function timedShow(el, html, ms) {
  el.innerHTML = html;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, ms);
}

function hideBanners() {
  for (const el of [toast, shout, quip]) { clearTimeout(el._t); el.hidden = true; }
  clearTimeout(shoutDelay);
  clearTimeout(toastDelay);
}

const ui = {
  toast: (html, ms = 2600, delayMs = 0) => {
    if (!delayMs) { timedShow(toast, html, ms); return; }
    clearTimeout(toastDelay);
    toastDelay = setTimeout(() => { if (state === 'PLAY') timedShow(toast, html, ms); }, delayMs);
  },
  glitch: (sec) => { glitchT = sec; },
  quip: (html) => timedShow(quip, html, 3200),
  shout: (html, delayMs) => {
    clearTimeout(shoutDelay);
    shoutDelay = setTimeout(() => {
      if (state !== 'PLAY') return;
      timedShow(shout, `<b>${ZIVI_NAME}:</b><br>${html}`, 3200);
      audio.shoutSfx();
    }, delayMs);
  },
};

const story = createStory({ player, world, audio, ui });

// ---- Layout: 180x320 skaliert, bevorzugt ganzzahlig ----
function layout() {
  const s = Math.min(innerWidth / 180, innerHeight / 320);
  const u = s >= 2 ? Math.floor(s) : s;
  wrap.style.width = `${180 * u}px`;
  wrap.style.height = `${320 * u}px`;
  document.documentElement.style.setProperty('--u', `${u}px`);
}
addEventListener('resize', layout);
layout();

const touchDevice = matchMedia('(pointer: coarse)').matches;
document.querySelector('.key-hint').hidden = touchDevice;
document.querySelector('.touch-hint').hidden = !touchDevice;

// ---- Menü, Bestenliste, Teilen ----
const modeName = () => (rentner ? 'rentner' : 'normal');
const bestText = () => (best ? `BEST ${best} M` : '');

nameInput.value = loadName();
const cleanName = () => nameInput.value.toUpperCase().replace(/[^A-Z0-9ÄÖÜ ]/g, '').trim().slice(0, 10) || 'ANONYM';
nameInput.addEventListener('input', () => saveName(nameInput.value.toUpperCase().slice(0, 10)));

function renderScores(rank = -1) {
  const list = loadScores(modeName());
  scoresEl.textContent = list.length
    ? `BESTENLISTE\n${list.map((s, i) => `${i === rank ? '>' : ' '}${i + 1} ${s.name.padEnd(10)} ${String(s.score).padStart(4)}`).join('\n')}`
    : '';
}

// view: 'menu' (Name, Hinweise) oder 'over' (Teilen)
function showOverlay(text, btn, view = 'menu', rank = -1) {
  msg.innerHTML = text;
  startBtn.textContent = btn;
  overlay.dataset.view = view;
  overlay.hidden = false;
  hud.hidden = true;
  renderScores(rank);
}

function applyMode() {
  const m = modeName();
  player.setProfile(m);
  world.calm = rentner;
  audio.setMode(rentner ? 'waltz' : 'techno');
  input.setEasy(rentner);
  wrap.classList.toggle('calm', rentner);
  $('title').innerHTML = rentner ? 'RENTNER<br>RUNNER' : 'SHAKE<br>RUNNER';
  modeBtn.textContent = rentner ? 'RENTNER-MODUS: AN' : 'RENTNER-MODUS: AUS';
  document.querySelector('.touch-hint').innerHTML = HINTS[m];
  document.title = rentner ? 'RentnerRunner' : 'ShakeRunner';
  best = loadBest(m);
}

applyMode();
showOverlay(bestText(), 'START');

modeBtn.addEventListener('click', () => {
  if (state === 'PLAY' || state === 'DEAD') return;
  rentner = !rentner;
  saveMode(modeName());
  applyMode();
  state = 'MENU';
  showOverlay(bestText(), 'START');
  modeBtn.blur();
});

shareBtn.addEventListener('click', async () => {
  const url = location.origin + location.pathname + (rentner ? '?rentner' : '');
  const text = `Ich hab im ${rentner ? 'Rentner-Runner' : 'ShakeRunner'} ${player.finalScore} M geschafft! Schaffst du mehr?`;
  try {
    if (navigator.share) { await navigator.share({ title: 'ShakeRunner', text, url }); return; }
  } catch (e) {
    if (e.name === 'AbortError') return; // Teilen-Dialog abgebrochen
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    shareBtn.textContent = 'KOPIERT!';
    setTimeout(() => { shareBtn.textContent = 'TEILEN'; }, 1800);
  } catch {
    window.prompt('Zum Teilen kopieren:', `${text} ${url}`);
  }
  shareBtn.blur();
});

// ---- Spielablauf ----
async function start() {
  if (state === 'PLAY' || state === 'DEAD') return;
  if (state === 'OVER' && performance.now() - overAt < 600) return;
  audio.init(); // synchron in der Geste, vor dem await
  await input.enableMotion();
  try { screen.orientation.lock('portrait').catch(() => {}); } catch { /* nur im Vollbild/PWA */ }
  try { wake = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }

  player.setProfile(modeName()); // nach einem Trip zurück auf das Rentner-Profil
  player.reset();
  world.reset();
  story.reset();
  audio.setMode(rentner ? 'waltz' : 'techno');
  glitchT = 0;
  overlay.hidden = true;
  hideBanners();
  hud.hidden = false;
  $('best').textContent = `HI ${best}`;
  state = 'PLAY';
  audio.start();
}

function gameOver(reason) {
  hideBanners();
  state = 'DEAD';
  deadT = 0;
  shake = rentner ? 0 : 0.5;
  audio.stop();
  audio.crashSfx();
  if (!rentner) {
    renderer.burst(PX + 4, GROUND - 6, '#ff2e88', 22, 90);
    renderer.burst(PX + 4, GROUND - 6, '#00e5ff', 12, 70);
  }
  navigator.vibrate?.(rentner ? 80 : 200);
  wake?.release?.().catch(() => {});
  wake = null;

  const score = Math.floor(player.dist / 10);
  const isBest = score > best;
  if (isBest) { best = score; saveBest(best, modeName()); }
  const name = cleanName();
  saveName(name);
  player.rank = score > 0 ? addScore(modeName(), name, score) : -1;

  player.reasonText = REASONS[modeName()][reason];
  if (player.stage === 4) player.reasonText += `<br><br>${ZIVI_NAME}:<br>"WAR NICHT MEINE SCHULD!"`;
  player.finalScore = score;
  player.isBest = isBest;
}

function showGameOver() {
  state = 'OVER';
  overAt = performance.now();
  showOverlay(
    `${player.reasonText}<br><br>${player.finalScore} M${player.isBest ? '<br>NEUER REKORD!' : `<br>BEST ${best} M`}`,
    'NOCHMAL',
    'over',
    player.rank,
  );
}

input.onPush = (s) => { if (state === 'PLAY') player.push(s); };
input.onJump = (src) => {
  if (state === 'PLAY') {
    player.jump();
    if (player.jumped) { audio.jumpSfx(); player.jumped = false; }
  } else if (src === 'key') {
    start();
  }
};
startBtn.addEventListener('click', start);
addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat && e.target.tagName !== 'INPUT') cueOn = !cueOn;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.suspend();
  else if (state === 'PLAY') audio.resume();
});

// ---- Loop ----
function update(dt) {
  time += dt;
  if (state === 'PLAY') {
    player.update(dt);
    const hit = world.update(player);
    if (rentner) story.update(dt);
    if (hit) {
      if (!(rentner && story.onCrash())) player.dead = player.dead || hit; // Fahrzeug fängt einen Treffer ab
    } else if (cueOn && world.cue(player)) {
      audio.cueSfx();
    }
    audio.setIntensity(player.e / 100);
    if (player.dead) gameOver(player.dead);
    $('score').textContent = `${Math.floor(player.dist / 10)} M`;
  } else if (state === 'DEAD') {
    deadT += dt;
    if (player.dead === 'fall') { player.vy -= 640 * dt; player.y += player.vy * dt; }
    if (deadT > 0.9) showGameOver();
  } else {
    idleScroll += 40 * dt;
    player.anim += dt * 8;
  }
  shake = Math.max(0, shake - dt);
  glitchT = Math.max(0, glitchT - dt);
  wrap.classList.toggle('calm', rentner && !player.trip); // im Trip: Neon-Optik
  renderer.update(dt, player, state === 'PLAY');
}

let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= STEP) { update(STEP); acc -= STEP; }
  const playing = state === 'PLAY' || state === 'DEAD';
  renderer.draw({
    player, world, time, shake, state, calm: rentner && !player.trip,
    scroll: playing ? player.dist : idleScroll,
    pulse: rentner && !player.trip ? 0 : audio.getPulse(),
  });
  if (glitchT > 0) renderer.glitch(Math.min(1, glitchT / 0.45), time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (location.search.includes('debug')) {
  const dbg = document.createElement('pre');
  dbg.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:9;font:11px monospace;color:#0f0;background:#000a;padding:4px;pointer-events:none';
  document.body.appendChild(dbg);
  setInterval(() => {
    dbg.textContent = `events ${input.events}\nmotion ${input.motionActive}\nx ${input.lastX.toFixed(1)} up ${input.lastUp.toFixed(1)}\n` +
      `DME ${typeof DeviceMotionEvent} LAS ${'LinearAccelerationSensor' in window}\nerr ${input.sensorError}\nsecure ${isSecureContext}`;
  }, 100);
}

window.__sr = { player, world, audio, story, get state() { return state; } }; // Debug/Tests

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
