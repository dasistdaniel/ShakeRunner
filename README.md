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
Menü-Knopf *RENTNER-MODUS* oder Link mit `?rentner` (z. B. `https://dasistdaniel.github.io/ShakeRunner/?rentner`): ca. halbes Tempo, nur niedrige Kisten, keine Abgründe, sanftes Schütteln genügt, Walzer statt Techno, schwarz/gelb/weiß ohne Effekte. Upgrades nach geschafften Hürden: 3 Rollator, 10 neue Hüfte (Rollator weg), 20 Rollstuhl, 25 Zivi schiebt (Tempo fällt nie unter einen Mindestwert), nach 50 erscheint eine blaue Pille: im Sprung fangen, dann steht man auf, rennt selbst (schneller) und lässt Kevin im Rollstuhl stehen. Nach 75: Midlife-Crisis, er findet ein Motorrad (noch schneller). Je Stufe sinkt die Energie langsamer. Eigener Highscore.

**Fahrzeuge** (Rollator, Rollstuhl, Motorrad) fangen je einen Treffer ab, dann sind sie kaputt und bleiben als Wrack liegen. Nach der blauen Pille verfolgt Kevin den Läufer (Game Over, wenn er ihn einholt). Hindernisse im Rentner-Modus: Blutdruckmessgerät, Tablettendose, Hund, Treppenlift, Kaffeefahrt-Bus. Zwischendurch gibt es Rentner-Kommentare. Nach 90 Hürden (mit Motorrad-Stufe) erscheint eine rote Pille: 10 Sekunden im "echten" Neon-Techno-Spiel (ein Crash überlebt man, wird aber früher zurück in die Matrix gekickt), dann zurück in die Matrix.

## Rentner-Story (Hürden-Zähler)
3 Rollator · 10 neue Hüfte · 20 Rollstuhl · 25 Zivi Kevin schiebt · 50 blaue Pille (Kevin jagt hinterher) · 75 Motorrad · 90 rote Pille (10 s "echtes" Spiel) · 100 Boss: Kaffeefahrt-Gruppe · 110 Kevin kommt auf dem Motorrad zurück · 120 Rente: Pensionär-Man fliegt, danach Abspann. Dazu: Parkbank (Energie, aber 2 s Mittagsschlaf) und Hörgerät-Ausfall (Ton dumpf, kein Absprung-Ping).

Zum Vorführen: `?rentner&start=N` startet mit N geschafften Hürden (z. B. `?rentner&start=100`).

## Bestenliste & Teilen
Name im Menü eintragen. Je Modus Top 5 lokal im Browser. Nach dem Game Over: *TEILEN* (Teilen-Dialog des Handys, sonst Link in die Zwischenablage).

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
