# ShakeRunner

8-Bit Endless Runner mit hartem Techno. Läuft im Browser (PWA), Handy zuerst.

## Steuerung
| | Handy | PC |
|---|---|---|
| Rennen | Handy links/rechts schütteln | ← / → oder A / D (abwechselnd) |
| Springen | Handy kurz nach oben ruckeln | Leertaste |

Tempo = Energie: jedes Schütteln gibt Schub, ohne Schütteln verlierst du Tempo. Wer ~2,5 s fast steht, ist außer Atem (Game Over). Je schneller, desto mehr Layer und BPM im Techno-Beat.
Ohne Sensor (oder iOS-Erlaubnis verweigert): Tippen links/rechts = Schub, Wischen hoch = Sprung.

## Rentner-Modus
Menü-Knopf *RENTNER-MODUS* oder Link mit `?rentner` (z. B. `https://dasistdaniel.github.io/ShakeRunner/?rentner`): ca. halbes Tempo, nur niedrige Kisten, keine Abgründe, sanftes Schütteln genügt, Walzer statt Techno, schwarz/gelb/weiß ohne Effekte. Nach 3 geschafften Hürden gibt es das Upgrade: Pixel-Rollator (Energie sinkt langsamer). Eigener Highscore.

## Starten
```bash
npx serve .
```
Handy-Sensoren brauchen **HTTPS** (Ausnahme `localhost`). Zum Testen am Handy: GitHub Pages, oder Tunnel (`npx localtunnel --port 3000` / ngrok). iOS fragt beim Start per Tap nach Bewegungs-Zugriff.

## Feintuning (nur am echten Gerät prüfbar)
`src/input.js`: `SHAKE_THR`, `JUMP_THR`, `PUSH_GAP_MS`.
`src/player.js`: Energie-Zuwachs (`push`), Abbau (`update`), Sprungstärke.

## Struktur
`src/main.js` Loop/Zustände · `input.js` Tastatur/Sensor/Touch · `player.js` Physik · `world.js` Hindernisse · `audio.js` WebAudio-Techno · `render.js` Pixel-Optik · `sw.js` Offline.
