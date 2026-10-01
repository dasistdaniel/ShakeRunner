// Einheitliche Eingabe: Tastatur, Bewegungssensor, Touch-Fallback.
// Callbacks: onPush(strength 0..2), onJump(source 'key' | 'motion' | 'touch')

const SHAKE_THR = 7;      // m/s^2 lineare Beschleunigung auf der X-Achse
const JUMP_THR = 9;       // m/s^2 nach oben (Y-Achse)
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
  let gX = 0, gY = 0;          // langsames Tiefpass-Filter = Schwerkraft-Schätzung
  let upSign = 1;              // Vorzeichen von "nach oben" (Android/iOS unterschiedlich)
  let lastPush = 0, lastPushSign = 0, lastJump = 0;

  function onMotion(e) {
    const g = e.accelerationIncludingGravity;
    const a = e.acceleration;
    if (g && g.x != null && g.y != null) {
      gX += 0.02 * (g.x - gX);
      gY += 0.02 * (g.y - gY);
      // Handy aufrecht gehalten: Ruhewert der Y-Achse zeigt, welches Vorzeichen "hoch" hat.
      if (Math.abs(gY) > 3) upSign = Math.sign(gY);
    }
    let x, y;
    if (a && a.x != null && a.y != null) {
      x = a.x; y = a.y;
    } else if (g && g.x != null && g.y != null) {
      x = g.x - gX; y = g.y - gY;
    } else {
      return;
    }
    process(x, y, y * upSign);
  }

  // x/y: lineare Beschleunigung, up: Beschleunigung nach oben (vorzeichenrichtig)
  function process(x, y, up) {
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
  async function startSensorApi() {
    if (sensorStarted || !('LinearAccelerationSensor' in window)) return;
    sensorStarted = true;
    try {
      const s = new LinearAccelerationSensor({ frequency: 60 });
      s.addEventListener('reading', () => {
        if (s.x != null && s.y != null) process(s.x, s.y, s.y);
      });
      s.addEventListener('error', (e) => { api.sensorError = e.error?.name || 'error'; });
      s.start();
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
