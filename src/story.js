// Rentner-Story: Upgrades nach geschafften Hürden, Fahrzeug-Treffer, Kevins Verfolgung, Zufalls-Kommentare.
// ui: { toast(html, ms), shout(html, delayMs), quip(html) } wird von main.js geliefert.
import { PX, STAGE_AT, BIKE_AT, KEVIN_DELAY } from './player.js';

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

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const nextQuipIn = () => 12 + Math.random() * 8;

export function createStory({ player, world, audio, ui }) {
  let quipT = nextQuipIn();

  function reset() { quipT = nextQuipIn(); }

  function enterStage(stage) {
    player.stage = stage;
    if (stage in VEHICLE_AT_STAGE) player.vehicle = VEHICLE_AT_STAGE[stage];
    audio.upgradeSfx(stage);
  }

  // Wird jede Spielframe im Rentner-Modus aufgerufen
  function update(dt) {
    if (world.pillNew) {
      world.pillNew = false;
      ui.toast('BLAUE PILLE!<br>SPRING UND FANG SIE!', 3000);
    }
    if (world.pillCaught) { // Stufe 5: aufstehen, Kevin abhängen (der setzt aber zur Verfolgung an)
      world.pillCaught = false;
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

    quipT -= dt;
    if (quipT <= 0) {
      quipT = nextQuipIn();
      ui.quip(pick(QUIPS));
      if (Math.random() < 0.25) audio.hearingSfx(); // Hörgerät pfeift
    }
  }

  // true = Treffer vom Fahrzeug abgefangen (Hindernis wird zerstört), false = tödlich
  function onCrash() {
    if (!player.vehicle) return false;
    if (world.hitObs) world.hitObs.gone = true;
    ui.toast(BREAKS[player.breakVehicle()], 2200);
    audio.crashSfx();
    return true;
  }

  return { reset, update, onCrash };
}
