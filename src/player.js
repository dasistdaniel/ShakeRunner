export const PX = 40;       // feste Bildschirm-X der Figur
export const GROUND = 262;  // Boden-Y im 180x320-Bild
export const PW = 8;
export const PH = 12;

const GRAVITY = 640;
const JUMP_V = 215;
export const JUMP_AIR_TIME = (2 * JUMP_V) / GRAVITY;

// speedK: px/s je Energiepunkt, d0/d1: Energie-Abbau (konstant + proportional), gain: Schub je Schütteln,
// exhaust: Sekunden ohne Energie bis "außer Atem", e0: Start-Energie
const PROFILES = {
  normal: { speedK: 2.4, d0: 6, d1: 0.17, gain: 9, exhaust: 2.5, e0: 32 },
  rentner: { speedK: 1.3, d0: 3, d1: 0.1, gain: 12, exhaust: 6, e0: 40 },
};

export class Player {
  constructor() { this.prof = PROFILES.normal; this.reset(); }

  setProfile(name) { this.prof = PROFILES[name] || PROFILES.normal; }

  reset() {
    this.e = this.prof.e0;          // Tempo-Energie 0..100
    this.y = 0;           // Höhe über Boden (negativ = im Loch)
    this.vy = 0;
    this.dist = 0;        // zurückgelegte Weltstrecke
    this.exhaust = 0;
    this.pit = false;     // von World gesetzt: Füße über Loch
    this.dead = null;     // null | 'fall' | 'breath' | 'crash'
    this.anim = 0;
    this.landed = false;
    this.jumped = false;
  }

  get speed() { return this.e * this.prof.speedK; }

  push(strength) { this.e = Math.min(100, this.e + this.prof.gain * strength); }

  jump() {
    if (this.y === 0 && this.vy === 0) {
      this.vy = JUMP_V;
      this.y = 0.01;
      this.jumped = true;
    }
  }

  update(dt) {
    this.e = Math.max(0, this.e - (this.prof.d0 + this.prof.d1 * this.e) * dt);
    this.dist += this.speed * dt;
    this.anim += this.speed * dt * 0.1;

    if (this.y !== 0 || this.vy !== 0 || this.pit) {
      const wasAir = this.y > 0;
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0 && !this.pit) {
        this.y = 0;
        this.vy = 0;
        if (wasAir) this.landed = true;
      }
      if (this.y < -8 && !this.dead) this.dead = 'fall';
    }

    if (this.e < 4) this.exhaust += dt;
    else this.exhaust = Math.max(0, this.exhaust - dt * 2);
    if (this.exhaust > this.prof.exhaust && !this.dead) this.dead = 'breath';
  }
}
