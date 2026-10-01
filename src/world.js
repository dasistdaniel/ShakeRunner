import { PX, JUMP_AIR_TIME } from './player.js';

// Vorlauf für Reaktions- und Sensor-Latenz (Sekunden)
const CUE_LEAD = 0.08;

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

  // true, sobald der Absprung-Zeitpunkt für das nächste Hindernis erreicht ist (einmal pro Hindernis).
  // Optimal: Bogenmitte (halbe Flugzeit) liegt über der Hindernismitte.
  cue(player) {
    const speed = player.speed;
    if (speed < 20) return false;
    const center = player.dist + PX + 4;
    for (const o of this.obs) {
      if (o.cued) continue;
      const ahead = o.x + o.w / 2 - center;
      if (ahead < 0) { o.cued = true; continue; }
      if (ahead <= speed * (JUMP_AIR_TIME / 2 + CUE_LEAD)) { o.cued = true; return true; }
      break; // Hindernisse sind nach x sortiert
    }
    return false;
  }
}
