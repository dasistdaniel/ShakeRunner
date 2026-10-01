import { PX } from './player.js';

export class World {
  constructor() { this.reset(); }

  reset() {
    this.obs = [];
    this.nextX = 300;
  }

  spawn(speed) {
    const x = this.nextX;
    const diff = Math.min(1, x / 5000);
    const roll = Math.random();
    let o;
    if (x > 500 && roll < 0.28) {
      o = { type: 'pit', x, w: 26 + Math.floor(Math.random() * (8 + diff * 8)), h: 0 };
    } else if (roll < 0.5) {
      o = { type: 'box', x, w: 10, h: 10 };
    } else if (roll < 0.72) {
      o = { type: 'box', x, w: 24, h: 12 };
    } else {
      o = { type: 'box', x, w: 10, h: 22 };
    }
    this.obs.push(o);
    // Lücke wächst mit Tempo, damit zwischen zwei Sprüngen immer Zeit zum Landen bleibt
    const gap = Math.max(130, Math.max(speed, 80) * (1.05 - diff * 0.2 + Math.random() * 0.55) + 40);
    this.nextX = x + o.w + gap;
  }

  // Gibt 'crash' bei Kollision zurück, setzt player.pit.
  update(player) {
    const d = player.dist;
    while (this.nextX < d + 260) this.spawn(player.speed);
    this.obs = this.obs.filter((o) => o.x + o.w > d - 30);

    const l = d + PX + 1;
    const r = d + PX + 7;
    player.pit = false;
    for (const o of this.obs) {
      if (o.type === 'pit') {
        if (l > o.x && r < o.x + o.w) player.pit = true;
      } else if (r - 1 > o.x && l + 1 < o.x + o.w && player.y < o.h) {
        return 'crash';
      }
    }
    return null;
  }
}
