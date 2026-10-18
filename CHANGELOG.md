# Änderungen – Quallenkino für webOS

## 0.4.5 – 2026-10-18

- **Intro überspringen auf dem LG:** Der Fernseher meldet nach einem Sprung zunächst die angefragte Zeit, läuft aber vom vorigen Schlüsselbild weiter. Die App misst jetzt gut eine Sekunde nach dem Wiederanlauf, wo sie wirklich steht, und springt um den Fehlbetrag weiter.

## 0.4.4 – 2026-10-18

- **Deutsche Tonspur ohne Umrechnung:** Hat ein Film mehrere deutsche Spuren (z. B. DTS und AC3), wählt die App die, die der Fernseher selbst kann; danach die Vorgabe des Servers. Vorher konnte die deutsche DTS-Spur gewinnen, und der Server rechnete um.
- **Intro überspringen** gleicht den Sprung des Fernsehers zum vorigen Schlüsselbild aus: Landet er zu früh, fragt die App um den Fehlbetrag weiter an.
- In der Konsole steht beim Start, welche Spur und welche Abspielart gewählt wurden (Fehlersuche).

## 0.4.3 – 2026-10-18

- **Intro überspringen** landet genau am Ende des Intros. Springt der Fernseher zu früh (Schlüsselbild bzw. HLS-Abschnitt), setzt die App nach.
- **Abspann mit nächster Folge:** Statt „Überspringen“ (5 s) erscheint gleich die Karte „Nächste Folge“ mit sichtbarem 10-Sekunden-Countdown. Nach „Zurück“ bleibt „Abspann überspringen“.
- **Trailer auf der Detailseite** erscheint erst, wenn wirklich Bilder laufen. Kann der Fernseher den Trailer nicht abspielen, bleibt das Hintergrundbild (kein schwarzes Feld mehr).

## 0.4.2 – 2026-10-18

- **AC3/E-AC3 wieder direkt:** In 0.4.1 wurde ein Film mit Dolby-Digital-Ton umgerechnet, wenn er weitere Tonspuren hatte. Umgerechnet wird jetzt nur noch, wenn die gewählte Spur DTS oder TrueHD ist oder beim Wechsel auf eine andere Spur das Umschalten im Fernseher nicht geht.
- **Untertitel:** Die App lädt immer die ganze Untertitel-Datei als WebVTT ab Anfang (vorher teils SRT ab der Startposition, nur wenige Zeilen). SRT-Zeiten werden ebenfalls gelesen.

## 0.4.1 – 2026-10-18

Korrekturen nach dem ersten Test auf einem LG-Fernseher:

- **Server-Suche schneller:** Alle Adressen werden gleichzeitig probiert (höchstens ~3 s statt bis zu 20 s). Bei einer IP-Adresse kommt `http://…:8096` zuerst.
- **Versteckte Profile:** Zeigt der Server keine Profile, öffnet sich gleich die Anmeldung (Passwort oder Quick Connect). Auf diesem Fernseher angemeldete Profile erscheinen bei „Wer schaut gerade?“, auch wenn der Server sie versteckt.
- **Tonspur wechseln** wirkt jetzt auch beim direkten Abspielen (Umschalten im Fernseher, ohne Neustart). Kann der Fernseher die Spur nicht (DTS, TrueHD), rechnet der Server nur den Ton um.
- **SRT-Untertitel in MKV-Dateien** werden angezeigt (der Server liefert sie als WebVTT).
- **OK pausiert** auch bei ausgeblendeter Leiste; das Symbol zeigt, was OK bewirkt (läuft → Pause).
- **Gefällt mir / Nichts für mich** im Player (Folgen über ihre Serie).
- Symbole im Material-Stil (Navigation, Banner, Detailseite, Player).
- Fotos, die nicht laden, zeigen Initialen statt eines leeren Kreises; Poster den Titel.
- Helle Hintergrundbilder oben abgedunkelt (die Uhr bleibt lesbar).
- Hinweis: „Links“ auf „Abspielen“ im Banner geht zum vorigen Vorschlag – wie in der Android-App; beim ersten Vorschlag öffnet es die Navigation.

## 0.4.0 – 2026-10-18

- **Player (Etappe 4):** Abspielen und Fortsetzen von Filmen und Folgen. Der Server spielt direkt ab, wenn der Fernseher die Datei kann (H.264, HEVC, VP9, AV1; AAC, AC3/E-AC3, FLAC, Opus …). Sonst rechnet er nur das Nötige um (z. B. DTS-Ton) und schickt es als HLS.
- Bei Serien startet „Abspielen“ die nächste Folge. Ist ein Titel angefangen, gibt es „Fortsetzen“ und „Von vorne“.
- **Intelligente Untertitel** wie in der Android-App: Bei deutschem Ton nur erzwungene Untertitel, bei fremdem Ton deutsche. Text-Untertitel zeigt die App selbst an (gut lesbar, rücken bei eingeblendeter Leiste nach oben), Bild-Untertitel rechnet der Server ins Bild.
- **Ton & Untertitel in einem Fenster** (zwei Spalten), Wechsel an derselben Stelle.
- **Intro, Rückblick und Abspann überspringen** (Intro Skipper/Media Segments): Der Knopf füllt sich in 5 Sekunden und springt dann; OK springt sofort, „Zurück“ bricht ab.
- **Nächste Folge** beim Abspann bzw. 30 Sekunden vor Schluss, mit 10-Sekunden-Countdown; OK sofort, „Zurück“ bleibt bei der Folge.
- Bedienung: Pfeile oder OK blenden die Leiste ein. „Links“/„Rechts“ auf der Zeitleiste springt 10 s, OK pausiert. Play/Pause, Vor/Zurück (30 s) und Stopp auf der Fernbedienung funktionieren. „Zurück“ blendet die Leiste aus bzw. beendet die Wiedergabe.
- Fortschritt wird an den Server gemeldet (Weiterschauen, Gesehen, Anzeige im Dashboard).

## 0.3.0 – 2026-10-18

- **Detailseite (Etappe 3):** Hintergrundbild mit Logo bzw. Titel, Begründung, Eckdaten, Beschreibung und Tagline. Nach zwei Sekunden läuft der Trailer vom Server im Hintergrund, abgedunkelt und mit Ton bei 75 %.
- Knöpfe: Abspielen bzw. Fortsetzen (Wiedergabe folgt in Etappe 4), Trailer (Vollbild, „Zurück“ beendet), **Gefällt mir / Nichts für mich**. Folgen werden über ihre Serie bewertet, wie in der Android-App.
- Serien: Staffel-Auswahl und Folgen der gewählten Staffel. Dazu die Reihen „Darsteller und Crew“ (Foto oder Initialen, Rolle) und „Das könnte dir auch gefallen“.
- **Personenseite:** Foto, Geburtstag und -ort, Biografie, Filme und Serien auf dem Server (neueste zuerst).
- **Suche** (Navigation links): Ergebnisse schon beim Tippen, getrennt nach Filmen, Serien und Personen. „Runter“ bzw. „Zurück“ nach dem Tippen führt zu den Treffern.
- „Mehr Infos“ im Banner und OK auf eine Karte öffnen die Detailseite. „Zurück“ kehrt dorthin zurück, wo man war, mit derselben Auswahl.

## 0.2.0 – 2026-10-18

- **Startseite (Etappe 2):** großer Infobereich mit Logo bzw. Titel, Begründung der Empfehlung („Weil du … geschaut hast“), Eckdaten und Beschreibung; Bild oben rechts, nach links und unten in Schwarz auslaufend.
- **Banner** mit wechselnden Vorschlägen (Empfehlungen, sonst die neuesten Titel) und den Knöpfen Abspielen / Mehr Infos / Trailer. Nach dem Anmelden ist „Abspielen“ ausgewählt. „Links“ auf „Abspielen“ bzw. „Rechts“ auf „Trailer“ blättert. Die Knöpfe sind nur sichtbar, solange das Banner ausgewählt ist.
- **Trailer-Vorschau:** Nach drei Sekunden im Banner läuft der Trailer vom Server, mit Ton bei 75 %. Der Verlauf liegt auch über dem Video, Logo und Text bleiben lesbar. Das Banner wechselt erst nach dem Trailer weiter.
- **Reihen:** Weiterschauen (mit Fortschritt), Als Nächstes, Empfohlene Filme/Serien für dich, Top 10 bei euch (große Zahlen), Kürzlich hinzugefügt. Die ausgewählte Reihe steht oben, der Infobereich zeigt die ausgewählte Karte. Fehlt eine Beschreibung, wird sie nachgeladen.
- Alle Reihen laden gleichzeitig; das Banner vom letzten Start ist sofort da.
- Navigation am linken Rand (Profil, Startseite, Über) und Uhr oben rechts.
- Noch ohne Funktion: „Abspielen“ und „Mehr Infos“ (Etappen 3 und 4).

## 0.1.0 – 2026-10-18

- Erste Etappe: Grundgerüst mit Quallenkino-Erscheinungsbild (Symbol, Startbild, Farben) und Bedienung mit der Fernbedienung (Pfeiltasten, OK, Zurück, Magic-Remote-Zeiger).
- Server verbinden: Adresse ohne „https://“ eingeben, die App probiert https, http und die Standard-Ports selbst aus.
- „Wer schaut gerade?“ mit Profil-Kacheln; Anmeldung per Passwort oder Quick Connect; die Anmeldung wird pro Profil gemerkt.
- „Über“ mit Version, Server und TMDB-Hinweis.
- Installationspaket (IPK) per GitHub Actions.
