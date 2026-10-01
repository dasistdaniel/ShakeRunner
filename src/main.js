import { createInput } from './input.js';
import { Player, PX, GROUND } from './player.js';
import { World } from './world.js';
import { GameAudio } from './audio.js';
import { createRenderer } from './render.js';
import { loadBest, saveBest } from './storage.js';

const STEP = 1 / 60;
const REASONS = {
  crash: 'GEGEN DIE WAND!',
  fall: 'IM ABGRUND VERSUNKEN!',
  breath: 'AUSSER ATEM! SCHÜTTEL WEITER!',
};

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const wrap = $('wrap');
const overlay = $('overlay');
const hud = $('hud');
const msg = $('msg');
const startBtn = $('startBtn');

const player = new Player();
const world = new World();
const audio = new GameAudio();
const input = createInput(canvas);
const renderer = createRenderer(canvas);

let state = 'MENU'; // MENU | PLAY | DEAD | OVER
let best = loadBest();
let deadT = 0;
let shake = 0;
let idleScroll = 0;
let overAt = 0;
let time = 0;
let wake = null;
let cueOn = true; // Absprung-Hinweiston (Taste M schaltet um)

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

function showOverlay(text, btn) {
  msg.innerHTML = text;
  startBtn.textContent = btn;
  overlay.hidden = false;
  hud.hidden = true;
}

showOverlay(best ? `BEST ${best} M` : '', 'START');

// ---- Spielablauf ----
async function start() {
  if (state === 'PLAY' || state === 'DEAD') return;
  if (state === 'OVER' && performance.now() - overAt < 600) return;
  audio.init(); // synchron in der Geste, vor dem await
  await input.enableMotion();
  try { screen.orientation.lock('portrait').catch(() => {}); } catch { /* nur im Vollbild/PWA */ }
  try { wake = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }

  player.reset();
  world.reset();
  overlay.hidden = true;
  hud.hidden = false;
  $('best').textContent = `HI ${best}`;
  state = 'PLAY';
  audio.start();
}

function gameOver(reason) {
  state = 'DEAD';
  deadT = 0;
  shake = 0.5;
  audio.stop();
  audio.crashSfx();
  renderer.burst(PX + 4, GROUND - 6, '#ff2e88', 22, 90);
  renderer.burst(PX + 4, GROUND - 6, '#00e5ff', 12, 70);
  navigator.vibrate?.(200);
  wake?.release?.().catch(() => {});
  wake = null;

  const score = Math.floor(player.dist / 10);
  const isBest = score > best;
  if (isBest) { best = score; saveBest(best); }
  player.reasonText = REASONS[reason];
  player.finalScore = score;
  player.isBest = isBest;
}

function showGameOver() {
  state = 'OVER';
  overAt = performance.now();
  showOverlay(
    `${player.reasonText}<br><br>${player.finalScore} M${player.isBest ? '<br>NEUER REKORD!' : `<br>BEST ${best} M`}`,
    'NOCHMAL',
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
addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat) cueOn = !cueOn; });

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
    if (hit) player.dead = player.dead || hit;
    else if (cueOn && world.cue(player)) audio.cueSfx();
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
    player, world, time, shake, state,
    scroll: playing ? player.dist : idleScroll,
    pulse: audio.getPulse(),
  });
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

window.__sr = { player, world, audio, get state() { return state; } }; // Debug/Tests

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
