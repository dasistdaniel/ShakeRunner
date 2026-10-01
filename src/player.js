export const PX = 40;       // feste Bildschirm-X der Figur
export const GROUND = 262;  // Boden-Y im 180x320-Bild
export const PW = 8;
export const PH = 12;

const GRAVITY = 640;
const JUMP_V = 215;
export const JUMP_AIR_TIME = (2 * JUMP_V) / GRAVITY;
const MAX_EXHAUST = 2.5;    // Sekunden ohne Energie bis "außer Atem"

export class Player {
  constructor() { this.reset(); }

  reset() {
    this.e = 32;          // Tempo-Energie 0..100
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

  get speed() { return this.e * 2.4; }

  push(strength) { this.e = Math.min(100, this.e + 9 * strength); }

  jump() {
    if (this.y === 0 && this.vy === 0) {
      this.vy = JUMP_V;
      this.y = 0.01;
      this.jumped = true;
    }
  }

  update(dt) {
    this.e = Math.max(0, this.e - (6 + 0.17 * this.e) * dt);
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
    if (this.exhaust > MAX_EXHAUST && !this.dead) this.dead = 'breath';
  }
}
