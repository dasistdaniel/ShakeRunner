// Einheitliche Eingabe: Tastatur, Bewegungssensor, Touch-Fallback.
// Callbacks: onPush(strength 0..2), onJump(source 'key' | 'motion' | 'touch')

let SHAKE_THR = 6;      // m/s^2 lineare Beschleunigung auf der X-Achse
let JUMP_THR = 9;       // m/s^2 nach oben (Y-Achse)
const PUSH_GAP_MS = 110;  // Entprellung zwischen zwei Schüttel-Impulsen
const JUMP_GAP_MS = 400;

export function createInput(canvas) {
  const api = {
    motionActive: false,
    events: 0,
    lastX: 0,
    lastUp: 0,
    sensorError: '',
    onPush: () => {},
    onJump: () => {},
    enableMotion,
    // Rentner-Modus: empfindlichere Schwellen (sanftes Schütteln genügt)
    setEasy(on) { SHAKE_THR = on ? 4 : 6; JUMP_THR = on ? 6.5 : 9; },
  };

  // ---- Tastatur: abwechselnd links/rechts = volle Kraft, gleiche Taste = halbe ----
  let lastKeyDir = 0;
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const left = e.code === 'ArrowLeft' || e.code === 'KeyA';
    const right = e.code === 'ArrowRight' || e.code === 'KeyD';
    if (left || right) {
      const dir = left ? -1 : 1;
      api.onPush(dir === lastKeyDir ? 0.5 : 1);
      lastKeyDir = dir;
      e.preventDefault();
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
      api.onJump('key');
      e.preventDefault();
    }
  });

  // ---- Bewegungssensor ----
  // Schwerkraft-Vektor (langsames Tiefpass-Filter, Ruhewert zeigt "nach oben").
  // "Hoch" wird als Projektion der Beschleunigung auf diesen Vektor berechnet,
  // dadurch ist es egal, wie schräg das Handy in der Hand liegt.
  let gx = 0, gy = 9.8, gz = 0, gSeeded = false;
  let lastPush = 0, lastPushSign = 0, lastJump = 0;

  function setGravity(x, y, z) {
    if (x == null || y == null || z == null) return;
    if (!gSeeded) { gx = x; gy = y; gz = z; gSeeded = true; return; }
    gx += 0.03 * (x - gx);
    gy += 0.03 * (y - gy);
    gz += 0.03 * (z - gz);
  }

  function onMotion(e) {
    const g = e.accelerationIncludingGravity;
    const a = e.acceleration;
    if (g) setGravity(g.x, g.y, g.z);
    if (a && a.x != null && a.y != null) {
      process(a.x, a.y, a.z ?? 0);
    } else if (g && g.x != null && g.y != null) {
      process(g.x - gx, g.y - gy, (g.z ?? 0) - gz);
    }
  }

  // x/y/z: lineare Beschleunigung (ohne Schwerkraft) im Geräte-Koordinatensystem
  function process(x, y, z) {
    const gn = Math.hypot(gx, gy, gz);
    const up = gn > 5 ? (x * gx + y * gy + z * gz) / gn : y;
    api.motionActive = true;
    api.events++;
    api.lastX = x;
    api.lastUp = up;
    const now = performance.now();

    if (up > JUMP_THR && up > 1.4 * Math.abs(x) && now - lastJump > JUMP_GAP_MS) {
      lastJump = now;
      api.onJump('motion');
      return;
    }
    if (Math.abs(x) > SHAKE_THR && now - lastPush > PUSH_GAP_MS) {
      const sign = Math.sign(x);
      // Richtungswechsel = Schüttelbewegung; gleiche Richtung nur nach Pause
      if (sign !== lastPushSign || now - lastPush > 300) {
        const strength = Math.min(1.8, Math.max(0.7, Math.abs(x) / SHAKE_THR));
        lastPush = now;
        lastPushSign = sign;
        api.onPush(strength);
      }
    }
  }

  // Generic Sensor API (Chrome/Android): Fallback, falls devicemotion keine Daten liefert.
  let sensorStarted = false;
  function startSensorApi() {
    if (sensorStarted || !('LinearAccelerationSensor' in window)) return;
    sensorStarted = true;
    const onErr = (e) => { api.sensorError = e.error?.name || 'error'; };
    try {
      const lin = new LinearAccelerationSensor({ frequency: 60 });
      lin.addEventListener('reading', () => { if (lin.x != null && lin.y != null) process(lin.x, lin.y, lin.z ?? 0); });
      lin.addEventListener('error', onErr);
      lin.start();
      if ('Accelerometer' in window) {
        const acc = new Accelerometer({ frequency: 30 });
        acc.addEventListener('reading', () => setGravity(acc.x, acc.y, acc.z));
        acc.addEventListener('error', onErr);
        acc.start();
      }
    } catch (e) {
      api.sensorError = e.name || 'error';
    }
  }

  let motionBound = false;
  async function enableMotion() {
    startSensorApi();
    try {
      if (typeof DeviceMotionEvent === 'undefined') return false;
      // Listener immer binden: ohne Erlaubnis kommen schlicht keine Events (Touch-Fallback greift).
      if (!motionBound) {
        addEventListener('devicemotion', onMotion);
        motionBound = true;
      }
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission(); // iOS: nur per Tap erlaubt
        return res === 'granted';
      }
      return true;
    } catch {
      return false;
    }
  }

  // Android/Desktop: keine Erlaubnis-Abfrage nötig, Sensoren sofort lauschen lassen.
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') {
    enableMotion();
  }

  // ---- Touch-Fallback (nur wenn kein Sensor liefert): Tippen = Schub, Wischen hoch = Sprung ----
  let touchStartY = null, swiped = false, lastTouchSide = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (api.motionActive) return;
    const r = canvas.getBoundingClientRect();
    const side = e.clientX < r.left + r.width / 2 ? -1 : 1;
    api.onPush(side === lastTouchSide ? 0.5 : 1);
    lastTouchSide = side;
    touchStartY = e.clientY;
    swiped = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (api.motionActive || touchStartY == null || swiped) return;
    if (touchStartY - e.clientY > 24) {
      swiped = true;
      api.onJump('touch');
    }
  });
  const endTouch = () => { touchStartY = null; };
  canvas.addEventListener('pointerup', endTouch);
  canvas.addEventListener('pointercancel', endTouch);

  return api;
}
