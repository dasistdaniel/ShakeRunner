// Synthetisierter Techno per WebAudio: keine Audiodateien.
// Intensität (0..1, aus Spieler-Tempo) schaltet Layer zu und erhöht das BPM.

const ROOT = 55; // A1
const ACID = [0, null, 12, 0, 3, null, 7, null, 0, 12, null, 10, 5, null, 7, 3];
const BAR_SHIFT = [0, 0, 3, -2];

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.playing = false;
    this.intensity = 0;
    this.bpm = 138;
    this.target = 138;
    this.step = 0;
    this.nextTime = 0;
    this.visKick = [];
    this.lastKick = -9;
  }

  // Muss in einer Nutzer-Geste aufgerufen werden (iOS/Autoplay-Regeln).
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = (this.ctx = new C());

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    this.bassBus = ctx.createGain();   // wird vom Kick "ge-sidechained"
    this.bassBus.connect(this.master);

    this.dist = ctx.createWaveShaper();
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) curve[i] = Math.tanh((i * 2 / n - 1) * 6);
    this.dist.curve = curve;
    this.dist.connect(this.bassBus);

    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    ctx.resume();
  }

  start() {
    if (!this.ctx) return;
    this.ctx.resume();
    this.step = 0;
    this.bpm = this.target = 138;
    this.nextTime = this.ctx.currentTime + 0.12;
    this.playing = true;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
  }

  suspend() { if (this.ctx) this.ctx.suspend(); }
  resume() { if (this.ctx) this.ctx.resume(); }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
    this.target = 138 + this.intensity * 22; // 138..160 BPM
  }

  // 0..1 Puls für die Optik, synchron zum hörbaren Kick
  getPulse() {
    if (!this.ctx) return 0;
    const now = this.ctx.currentTime;
    while (this.visKick.length && this.visKick[0] <= now) this.lastKick = this.visKick.shift();
    return Math.max(0, 1 - (now - this.lastKick) / 0.28);
  }

  schedule() {
    if (!this.playing) return;
    const ctx = this.ctx;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.bpm += (this.target - this.bpm) * 0.05;
      this.nextTime += 60 / this.bpm / 4;
      this.step = (this.step + 1) % 64;
    }
  }

  playStep(step, t) {
    const i = this.intensity;
    const s = step % 16;
    const bar = Math.floor(step / 16);

    if (s % 4 === 0) this.kick(t);
    if (s % 4 === 2) this.hat(t, true, 0.22);
    else if (i > 0.25 && s % 2 === 1) this.hat(t, false, 0.1);
    if (i > 0.25 && (s === 4 || s === 12)) this.clap(t);
    if (s % 4 === 2) this.rumble(t, BAR_SHIFT[bar]);
    if (i > 0.45 && ACID[s] != null) this.acid(t, ACID[s] + BAR_SHIFT[bar], s % 4 === 0 || Math.random() < 0.25);
    if (i > 0.75 && bar === 3 && s >= 8) this.noiseHit(t, { type: 'highpass', f: 2000 + (s - 8) * 700, dur: 0.1, vol: 0.05 + (s - 8) * 0.01 });
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.4);
    this.noiseHit(t, { type: 'highpass', f: 3000, dur: 0.012, vol: 0.4 });
    this.bassBus.gain.setValueAtTime(0.15, t);
    this.bassBus.gain.linearRampToValueAtTime(1, t + 0.2);
    this.visKick.push(t);
  }

  hat(t, open, vol) {
    this.noiseHit(t, { type: 'highpass', f: 7000, dur: open ? 0.16 : 0.04, vol });
  }

  clap(t) {
    for (let k = 0; k < 3; k++) this.noiseHit(t + k * 0.012, { type: 'bandpass', f: 1500, q: 1.2, dur: k === 2 ? 0.14 : 0.02, vol: 0.4 });
  }

  noiseHit(t, { type, f, q = 0.7, dur, vol }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  rumble(t, shift) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = ROOT * Math.pow(2, shift / 12);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(f);
    f.connect(g);
    g.connect(this.bassBus);
    o.start(t);
    o.stop(t + 0.22);
  }

  acid(t, semi, accent) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = ROOT * 2 * Math.pow(2, semi / 12);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 14;
    const base = 300 + this.intensity * 1500;
    f.frequency.setValueAtTime(base * (accent ? 4 : 2.5), t);
    f.frequency.exponentialRampToValueAtTime(base, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.3 : 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.connect(f);
    f.connect(g);
    g.connect(this.dist);
    o.start(t);
    o.stop(t + 0.15);
  }

  jumpSfx() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.16);
  }

  // Hinweiston: "jetzt springen"
  cueSfx() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1320, t);
    o.frequency.setValueAtTime(1760, t + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.11);
  }

  crashSfx() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.7);
    this.noiseHit(t, { type: 'lowpass', f: 3000, dur: 0.6, vol: 0.7 });
  }
}
