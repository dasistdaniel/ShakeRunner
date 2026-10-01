// Rentner-Story: Upgrades nach geschafften Hürden, Fahrzeug-Treffer, Kevins Verfolgung (zweimal), Boss,
// rote Pille (Matrix-Trip), Rente (Cape-Flug + Abspann), Mittagsschlaf, Hörgerät-Ausfall, Zufalls-Kommentare.
// ui: { toast(html, ms, delayMs), shout(html, delayMs), quip(html), glitch(sec), finish() } wird von main.js geliefert.
import {
  PX, STAGE_AT, BIKE_AT, RED_AT, BOSS_AT, KEVIN2_AT, RENTE_AT,
  KEVIN_DELAY, KEVIN2_SPEED, TRIP_SECONDS, FLY_SECONDS, SLEEP_SECONDS,
} from './player.js';

export const ZIVI_NAME = 'KEVIN';

const UPGRADES = [
  'UPGRADE: ROLLATOR!',
  'NEUE HÜFTE!<br>ROLLATOR WEG!',
  'UPGRADE: ROLLSTUHL!',
  `ZIVI ${ZIVI_NAME} SCHIEBT!<br>GUTE FAHRT!`,
];
// Fahrzeug je erreichter Stufe (nicht aufgeführt = unverändert)
const VEHICLE_AT_STAGE = { 1: 'rollator', 2: null, 3: 'chair' };

const BREAKS = {
  rollator: 'ROLLATOR KAPUTT!',
  chair: 'ROLLSTUHL<br>TOTALSCHADEN!',
  bike: 'MOTORRAD HIN!',
};

const SHOUTS = [
  'WARTE! WER ZAHLT MEIN<br>TAXI ZURÜCK?!',
  'DAS MELDE ICH<br>DEM CHEF!',
  'MEIN RÜCKEN!<br>UND DER ROLLSTUHL?!',
  'ICH KÜNDIGE!<br>GANZ BESTIMMT!',
  'ICH WAR DOCH<br>NETT ZU DIR!',
];

const QUIPS = [
  'FRÜHER WAR<br>ALLES BESSER!',
  'DAS KNIE...<br>DAS KNIE!',
  'WO IST MEINE<br>BRILLE?',
  'ICH HAB&#39;S<br>IM RÜCKEN!',
  'IN MEINER JUGEND<br>GING DAS BERGAUF!',
  'JUNGE, MACH MAL<br>LEISER!',
  'UM 18 UHR GIBT&#39;S<br>ABENDBROT!',
  'DIE JUGEND<br>VON HEUTE...',
];

const BACK_LINES = [
  'WAS WAR DAS<br>FÜRN TRIP?!',
  'ICH HAB NIX<br>GENOMMEN, ECHT!',
  'MEIN KREISLAUF...<br>MEIN KREISLAUF!',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const nextQuipIn = () => 12 + Math.random() * 8;
const nextDeafIn = () => 25 + Math.random() * 15;

export function createStory({ player, world, audio, ui }) {
  let quipT = nextQuipIn();
  let deafIn = nextDeafIn();
  let deafLeft = 0;
  let kevinBack = false; // Kevin ist schon zurückgekehrt

  function setDeaf(on) {
    player.deaf = on;
    audio.muffle(on);
  }

  function reset() {
    quipT = nextQuipIn();
    deafIn = nextDeafIn();
    deafLeft = 0;
    kevinBack = false;
    audio.muffle(false);
  }

  // Zum Vorführen (?start=N): Spielstand so setzen, als wären N Hürden geschafft
  function jumpTo(n) {
    world.passed = n;
    const stage = n >= BIKE_AT ? 6 : n >= 50 ? 5 : STAGE_AT.filter((a) => n >= a).length;
    player.stage = stage;
    player.vehicle = stage === 6 ? 'bike' : stage === 3 || stage === 4 ? 'chair' : stage === 1 ? 'rollator' : null;
    player.redTaken = n > RED_AT + 5;
    world.bossDone = n > BOSS_AT;
    kevinBack = n > KEVIN2_AT;
  }

  function enterStage(stage) {
    player.stage = stage;
    if (stage in VEHICLE_AT_STAGE) player.vehicle = VEHICLE_AT_STAGE[stage];
    audio.upgradeSfx(stage);
  }

  // Rote Pille: kurz im "echten" Spiel (Neon, Techno, normales Tempo); ein Crash beendet den Trip vorzeitig
  function switchWorld(mode) {
    ui.glitch(0.9);
    audio.glitchSfx();
    audio.stop();
    audio.setMode(mode);
    audio.start();
  }

  function startTrip() {
    player.redTaken = true;
    player.trip = true;
    player.tripT = TRIP_SECONDS;
    player.setProfile('normal');
    switchWorld('techno');
    ui.toast('WILLKOMMEN IM<br>ECHTEN SPIEL!', 3000);
  }

  // early = Crash im Trip: man überlebt, wird aber früher in die Matrix zurückgekickt
  function endTrip(early = false) {
    player.trip = false;
    player.setProfile('rentner');
    switchWorld('waltz');
    ui.toast(early ? 'CRASH! RAUSGEKICKT!<br>ZURÜCK IN DER MATRIX!' : 'WILLKOMMEN ZURÜCK<br>IN DER MATRIX!', 2400);
    ui.toast(pick(BACK_LINES), 3200, 2600);
  }

  // Kevin kehrt auf einem Motorrad zurück und jagt erneut (zweite Verfolgung, schneller)
  function kevinReturns() {
    kevinBack = true;
    const head = player.vehicle === 'bike' ? 320 : 480; // ohne Motorrad mehr Vorsprung
    player.kevin = { x: player.dist + PX - head, hasChair: false, bike: true, speed: KEVIN2_SPEED, delay: 0 };
    audio.revSfx();
    ui.toast(`${ZIVI_NAME} IST ZURÜCK!<br>UND ER IST SAUER!`, 3500);
    ui.shout('DU HAST MEINEN<br>ROLLSTUHL GESTOHLEN!', 1800);
  }

  // Rente eingereicht: Pensionär-Man fliegt mit Cape über alles, danach Abspann
  function retire() {
    player.stage = 7;
    player.flying = true;
    player.flyT = FLY_SECONDS;
    player.kevin = null;
    audio.upgradeSfx(7);
    audio.fanfareSfx();
    ui.toast('RENTE EINGEREICHT!<br>PENSIONÄR-MAN!', 4000);
    ui.shout('NEIN! WER ZAHLT<br>JETZT MEINE RENTE?!', 2200);
  }

  // Wird jede Spielframe im Rentner-Modus aufgerufen
  function update(dt) {
    if (world.pillNew) {
      ui.toast(world.pillNew === 'red' ? 'ROTE PILLE!<br>WILLST DU DIE WAHRHEIT?' : 'BLAUE PILLE!<br>SPRING UND FANG SIE!', 3000);
      world.pillNew = null;
    }
    if (world.pillCaught === 'red') startTrip();
    if (world.pillCaught === 'blue') { // Stufe 5: aufstehen, Kevin abhängen (der setzt aber zur Verfolgung an)
      player.kevin = { x: player.dist + PX - 13, hasChair: player.vehicle === 'chair', delay: KEVIN_DELAY };
      player.vehicle = null;
      enterStage(5);
      ui.toast(`MACHS GUT ${ZIVI_NAME},<br>DU LOOSER!`, 5000);
      ui.shout(pick(SHOUTS), KEVIN_DELAY * 1000);
    }
    if (player.stage < STAGE_AT.length && world.passed >= STAGE_AT[player.stage]) {
      enterStage(player.stage + 1);
      ui.toast(UPGRADES[player.stage - 1]);
    }
    if (player.stage === 5 && world.passed >= BIKE_AT) { // Midlife-Crisis: Motorrad
      enterStage(6);
      player.vehicle = 'bike';
      audio.revSfx();
      ui.toast('MIDLIFE CRISIS!<br>ER FINDET EIN MOTORRAD!', 4500);
    }

    if (world.bossNew) {
      world.bossNew = false;
      ui.toast('BOSS!<br>DIE KAFFEEFAHRT-GRUPPE', 3000);
    }
    if (world.bossBeaten) {
      world.bossBeaten = false;
      ui.toast('GESCHAFFT!<br>DIE GRUPPE FÄHRT WEITER', 2600);
    }
    if (player.stage === 6 && !player.trip && !kevinBack && world.passed >= KEVIN2_AT) kevinReturns();
    if (player.stage === 6 && !player.trip && world.passed >= RENTE_AT) retire();

    if (world.benchHit) { // Mittagsschlaf: Energie, aber kurz weggetreten
      world.benchHit = false;
      player.e = Math.min(100, player.e + 40);
      player.sleepT = SLEEP_SECONDS;
      audio.snoreSfx();
    }

    if (player.trip && (player.tripT -= dt) <= 0) endTrip();
    if (player.flying && (player.flyT -= dt) <= 0) {
      player.flying = false;
      ui.finish(); // Abspann
    }
    world.pillCaught = null;

    // Hörgerät fällt kurz aus: Ton dumpf und kein Absprung-Ping
    if (deafLeft > 0) {
      deafLeft -= dt;
      if (deafLeft <= 0) setDeaf(false);
    } else if (world.passed >= 8 && !player.trip && (deafIn -= dt) <= 0) {
      deafIn = nextDeafIn();
      deafLeft = 4;
      setDeaf(true);
      ui.toast('WAS? ICH VERSTEH<br>DICH NICHT!', 3000);
    }

    quipT -= dt;
    if (quipT <= 0) {
      quipT = nextQuipIn();
      ui.quip(pick(QUIPS));
      if (Math.random() < 0.25) audio.hearingSfx(); // Hörgerät pfeift
    }
  }

  // true = Treffer vom Fahrzeug abgefangen (Hindernis wird zerstört), false = tödlich
  function onCrash() {
    if (player.trip) { // Trip überlebt, aber vorzeitig beendet
      if (world.hitObs) world.hitObs.gone = true;
      player.invuln = 1.2;
      endTrip(true);
      return true;
    }
    if (!player.vehicle) return false;
    if (world.hitObs) {
      world.hitObs.gone = true;
      if (world.hitObs.boss) { world.bossDone = true; world.bossOut = false; } // Boss zerlegt
    }
    ui.toast(BREAKS[player.breakVehicle()], 2200);
    audio.crashSfx();
    return true;
  }

  return { reset, update, onCrash, jumpTo };
}
