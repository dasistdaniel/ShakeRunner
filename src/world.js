import { PX, JUMP_AIR_TIME, RED_AT, BOSS_AT } from './player.js';
import { KINDS } from './sprites.js';

// Vorlauf für Reaktions- und Sensor-Latenz (Sekunden)
const CUE_LEAD = 0.08;

export class World {
  constructor() { this.reset(); }

  reset() {
    this.obs = [];
    this.nextX = 300;
    this.passed = 0; // erfolgreich passierte Hindernisse
    this.pillOut = false;    // Pille liegt gerade auf der Strecke
    this.trip = false;       // Matrix-Trip aktiv: echte Hindernisse, keine Abgründe, nicht tödlich
    this.pillDue = null;     // Pille soll erscheinen: null | 'blue' | 'red'
    this.pillNew = null;     // Flag: Farbe der eben gespawnten Pille
    this.pillCaught = null;  // Flag: Farbe der gefangenen Pille
    this.hitObs = null;      // zuletzt getroffenes Hindernis
    this.bossDone = false;   // Boss besiegt/übersprungen
    this.bossOut = false;    // Boss liegt gerade auf der Strecke
    this.bossNew = false;    // Flag: Boss wurde eben gespawnt
    this.bossBeaten = false; // Flag: Boss wurde eben überwunden
    this.benchHit = false;   // Flag: Spieler hat sich auf eine Bank gesetzt
    this.lastBenchX = -9999;
    this.bossDue = false;
  }

  spawn(speed) {
    const x = this.nextX;
    if (this.calm && !this.trip) { // Rentner-Modus: nur niedrige Kisten, keine Abgründe, viel Platz dazwischen
      if (this.pillDue && !this.pillOut) { // blaue Pille schwebt hoch: nur im Sprung fangbar
        this.obs.push({ type: 'pill', color: this.pillDue, x, w: 10, h: 0 });
        this.pillOut = true;
        this.pillNew = this.pillDue;
        this.nextX = x + 10 + Math.max(150, Math.max(speed, 50) * 2.2 + 60);
        return;
      }
      if (this.bossDue && !this.bossOut) { // Boss: Kaffeefahrt-Gruppe, nur mit gutem Sprung zu überwinden
        this.obs.push({ type: 'box', kind: 'boss', boss: true, x, w: 40, h: 26 });
        this.bossOut = this.bossNew = true;
        this.nextX = x + 40 + Math.max(220, Math.max(speed, 50) * 2.4 + 80);
        return;
      }
      if (this.passed >= 15 && x - this.lastBenchX > 800 && Math.random() < 0.12) { // Parkbank: Mittagsschlaf
        this.lastBenchX = x;
        this.obs.push({ type: 'bench', kind: 'bench', x, w: 16, h: 8, cued: true });
        this.nextX = x + 16 + Math.max(150, Math.max(speed, 50) * 2 + 60);
        return;
      }
      // Rentner-Hindernisse (Sprites): Bus ist selten, der Rest gleich verteilt
      const k = KINDS[Math.random() < 0.12 ? KINDS.length - 1 : Math.floor(Math.random() * (KINDS.length - 1))];
      const o = { type: 'box', kind: k.kind, x, w: k.w, h: k.h };
      this.obs.push(o);
      this.nextX = x + o.w + Math.max(150, Math.max(speed, 50) * (1.8 + Math.random() * 0.8) + 60);
      return;
    }
    const diff = Math.min(1, x / 5000);
    const roll = Math.random();
    let o;
    if (!this.trip && x > 500 && roll < 0.28) {
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
    this.trip = player.trip;
    this.bossDue = this.calm && !player.trip && player.stage === 6 && !this.bossDone && this.passed >= BOSS_AT;
    if (!this.calm || player.trip) this.pillDue = null;
    else if (player.stage === 4 && this.passed >= 50) this.pillDue = 'blue';
    else if (player.stage === 6 && !player.redTaken && this.passed >= RED_AT) this.pillDue = 'red';
    else this.pillDue = null;
    while (this.nextX < d + 260) this.spawn(player.speed);
    this.obs = this.obs.filter((o) => o.x + o.w > d - 30 && !o.gone);

    const l = d + PX + 1;
    const r = d + PX + 7;
    player.pit = false;
    for (const o of this.obs) {
      if (o.type === 'pill') {
        if (r > o.x && l < o.x + o.w && player.y + 12 > 28 && player.y < 40) { o.gone = true; this.pillCaught = o.color; }
        else if (!o.counted && o.x + o.w < l) { o.counted = true; this.pillOut = false; } // verpasst: kommt wieder
        continue;
      }
      if (o.type === 'bench') { // Bank: Energie, aber zwei Sekunden Mittagsschlaf; drüberspringen geht auch
        if (r > o.x && l < o.x + o.w && player.y < 8 && !player.flying) { o.gone = true; this.benchHit = true; }
        continue;
      }
      if (!o.counted && o.x + o.w < l) {
        o.counted = true;
        this.passed++;
        if (o.boss) { this.bossDone = true; this.bossOut = false; this.bossBeaten = true; }
      }
      if (o.type === 'pit') {
        if (l > o.x && r < o.x + o.w) player.pit = true;
      } else if (r - 1 > o.x && l + 1 < o.x + o.w && player.y < o.h && player.invuln <= 0 && !player.flying) {
        this.hitObs = o;
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
