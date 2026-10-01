export const PX = 40;       // feste Bildschirm-X der Figur
export const GROUND = 262;  // Boden-Y im 180x320-Bild
export const PW = 8;
export const PH = 12;

const GRAVITY = 640;
const JUMP_V = 215;
export const JUMP_AIR_TIME = (2 * JUMP_V) / GRAVITY;

// Rentner-Upgrades: nach so vielen geschafften Hürden wird die nächste Stufe freigeschaltet
export const STAGE_AT = [3, 10, 20, 25];
export const RED_AT = 90;  // rote Pille (Trip ins "echte" Spiel), nur nach dem Motorrad
export const TRIP_SECONDS = 10;
export const BOSS_AT = 100;   // Boss-Hürde: die Kaffeefahrt-Gruppe
export const KEVIN2_AT = 110; // Kevin kommt auf dem Motorrad zurück
export const RENTE_AT = 120;  // Rente eingereicht: Pensionär-Man fliegt, danach Abspann
export const FLY_SECONDS = 12;
export const SLEEP_SECONDS = 2;
export const BIKE_AT = 75; // Stufe 6: Midlife-Crisis, Motorrad (nach Stufe 5)
const STAGE_DECAY = [1, 0.6, 0.5, 0.4, 0.4, 0.4, 0.3, 0.3]; // Energie-Abbau je Stufe

export const KEVIN_SPEED = 105;  // Kevin verfolgt den Läufer mit konstantem Tempo (px/s)
export const KEVIN_DELAY = 1.6;  // Sekunden Schockstarre nach der Pille
export const KEVIN2_SPEED = 175; // Kevin auf dem Motorrad
const INVULN_AFTER_HIT = 1.2;    // Sekunden Unverwundbarkeit nach zerstörtem Fahrzeug

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
    // Rentner-Story: 0 nichts, 1 Rollator, 2 Hüfte, 3 Rollstuhl, 4 Zivi, 5 blaue Pille, 6 Motorrad, 7 Rente (Flug)
    this.stage = 0;
    this.vehicle = null;   // null | 'rollator' | 'chair' | 'bike': jedes Fahrzeug fängt einen Treffer ab
    this.invuln = 0;       // Restzeit Unverwundbarkeit
    this.deaf = false;     // Hörgerät-Ausfall: kein Absprung-Ping
    this.sleepT = 0;       // Mittagsschlaf auf der Bank: steht still
    this.flying = false;   // Pensionär-Man: fliegt über alles
    this.flyT = 0;
    this.redTaken = false; // rote Pille schon genommen
    this.trip = false;     // Matrix-Trip: kurz im "echten" Spiel (unverwundbar)
    this.tripT = 0;
    this.wreck = null;     // { kind, x }: zerstörtes Fahrzeug bleibt in der Welt liegen
    this.kevin = null;     // { x, hasChair, delay }: ab Stufe 5 verfolgt Kevin den Läufer
    this.e = this.prof.e0; // Tempo-Energie 0..100
    this.y = 0;            // Höhe über Boden (negativ = im Loch)
    this.vy = 0;
    this.dist = 0;         // zurückgelegte Weltstrecke
    this.exhaust = 0;
    this.pit = false;      // von World gesetzt: Füße über Loch
    this.dead = null;      // null | 'fall' | 'breath' | 'crash' | 'kevin'
    this.anim = 0;
    this.landed = false;
    this.jumped = false;
  }

  get speedFactor() { return this.trip ? 1 : this.flying ? 3 : this.vehicle === 'bike' ? 2.2 : this.stage >= 5 ? 1.6 : 1; }

  get speed() { return this.sleepT > 0 ? 0 : this.e * this.prof.speedK * this.speedFactor; }

  // Abstand zwischen Kevins Front und dem Läufer (px); Infinity ohne Verfolger
  get kevinGap() {
    const k = this.kevin;
    return k ? (this.dist + PX + 1) - (k.x + (k.bike ? 17 : k.hasChair ? 9 : -3)) : Infinity;
  }

  push(strength) { if (this.sleepT > 0) return; this.e = Math.min(100, this.e + this.prof.gain * strength); }

  jump() {
    if (this.y === 0 && this.vy === 0 && this.sleepT <= 0) {
      this.vy = JUMP_V;
      this.y = 0.01;
      this.jumped = true;
    }
  }

  // Treffer abgefangen: Fahrzeug geht kaputt und bleibt als Wrack liegen
  breakVehicle() {
    const kind = this.vehicle;
    this.wreck = { kind, x: this.dist + PX - 1 };
    this.vehicle = null;
    this.invuln = INVULN_AFTER_HIT;
    return kind;
  }

  update(dt) {
    this.invuln = Math.max(0, this.invuln - dt);
    const sleeping = this.sleepT > 0;
    this.sleepT = Math.max(0, this.sleepT - dt);
    if (!sleeping) this.e = Math.max(0, this.e - (this.prof.d0 + this.prof.d1 * this.e) * STAGE_DECAY[this.stage] * dt);
    if (this.flying) this.e = Math.max(this.e, 60); // Flug: bleibt schnell
    if (this.vehicle === 'chair' && this.stage === 4) this.e = Math.max(this.e, 25); // Zivi schiebt: nie ganz stehen bleiben
    if (this.trip) this.e = Math.max(this.e, 30); // im Trip nie außer Atem
    this.dist += this.speed * dt;
    this.anim += this.speed * dt * 0.1;

    const k = this.kevin;
    if (k && !this.trip) { // Kevin pausiert während des Trips
      if (k.delay > 0) k.delay -= dt;
      else {
        k.x += (k.speed || KEVIN_SPEED) * dt;
        if (this.kevinGap <= 0 && !this.dead) this.dead = 'kevin';
      }
    }

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

    if (this.e < 4 && !sleeping) this.exhaust += dt;
    else this.exhaust = Math.max(0, this.exhaust - dt * 2);
    if (this.exhaust > this.prof.exhaust && !this.dead) this.dead = 'breath';
  }
}
