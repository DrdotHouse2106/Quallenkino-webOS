# Änderungen – Quallenkino für webOS

## 0.7.3 – 2026-10-18

- **LG-Bildschirmschoner überdeckt Quallenkino nicht mehr:** Solange die App im Vordergrund ist und „Bildschirmschoner nach“ eingeschaltet ist, hält Quallenkino den Schoner des Fernsehers zurück (Anfrage über `com.webos.service.tvpower`, Antwort `ack:false`). Steht der eigene Schoner auf „Aus“, darf der LG-Schoner wie gewohnt kommen.

## 0.7.2 – 2026-10-18

- **Ton der Teaser im Bildschirmschoner** als Einstellung: Stumm (Standard), Leise oder Normal.
- Bildschirmschoner: Bild und Logo erscheinen erst, wenn das Hintergrundbild geladen ist; das nächste Bild wird vorgeladen (kein fast schwarzes erstes Bild mehr).

## 0.7.1 – 2026-10-18

- **Teaser im Bildschirmschoner wie in der Android-App:** eigene Einstellung „Teaser im Bildschirmschoner“ (ab Werk aus). Gewählt wird ein **Teaser** vom Server – Video mit „Teaser“ im Namen bzw. Pfad, sonst das kürzeste Video bis 100 Sekunden (Trailer und Extras), sonst der erste Trailer. Der Titel bleibt so lange stehen wie der Teaser plus 3 Sekunden, höchstens 3 Minuten; Ton wie bei der Trailer-Vorschau.
- Lange Einstellungsseite scrollt mit dem Fokus mit.

## 0.7.0 – 2026-10-18

Etappe 7 – damit sind alle geplanten Etappen fertig.

- **Bildschirmschoner (wie Android):** nach einigen Minuten ohne Tastendruck (Einstellungen: 2, 5 oder 10 Minuten oder aus; Standard 5) persönliche Titel – Empfehlungen und angefangene Filme – als Hintergrundbild mit langsamer Kamerafahrt, Logo bzw. Titel und Uhr. Liegt ein Trailer auf dem Server, läuft er ohne Ton. OK öffnet den gezeigten Titel, jede andere Taste beendet. Während der Wiedergabe kommt er nie; Trailer im Hintergrund pausieren, solange er läuft.
- **„Quallenkino beenden?“:** „Zurück“ auf der Startseite fragt jetzt (Beenden, Profil wechseln, Abbrechen) statt direkt zur Profilauswahl zu springen – so verlangt es LG für Apps im Store.

## 0.6.6 – 2026-10-18

- **Personenseiten mit ganzer Filmografie (wie Android):** Für alle Personen – aus Detailseiten, Suche und Live-TV – zeigt die Seite mit Jellyseerr und bekannter TMDB-Id alle Filme und Serien. Jedes Plakat zeigt den Stand: **Verfügbar**, **Teilweise**, **Angefragt**. Oben die Reihe **„In deiner Bibliothek“** (verfügbare zuerst).
- OK auf einen Titel, der schon auf dem Server liegt, öffnet dessen Jellyfin-Detailseite; sonst die Jellyseerr-Detailseite zum Anfragen. Ohne Jellyseerr oder TMDB-Id bleibt es bei der Personenseite des Servers.

## 0.6.5 – 2026-10-18

- **YouTube auf dem LG:** Der Fernseher führt die App unter `file://` aus; YouTube bettet dort nicht ein (Fehler 153, fehlende Herkunft). Der offizielle Player liegt deshalb auf einer kleinen Seite bei GitHub Pages (`site/yt.html`), die Quallenkino einbettet – für die Vorschau oben rechts und das Vollbild-Fenster. Die Seite zeigt nur den Player und meldet bereit/läuft/Ende/Fehler an die App.

## 0.6.4 – 2026-10-18

- **YouTube-Trailer wie in der Android-App:** Auf Detailseiten ohne Trailer auf dem Server (Jellyfin-Titel mit YouTube-Trailer in den Metadaten, Entdecken-Titel aus Jellyseerr) startet der Trailer nach 2 s **automatisch oben rechts** – als freies 16:9-Rechteck mit dem offiziellen Player, nichts liegt darüber, die Sprache steht darunter („EN“, „OmU“). Bei Fehlern oder am Ende verschwindet er. Abschaltbar mit „Trailer-Vorschau“ in den Einstellungen.
- **Vollbild nur auf Wunsch:** Das eigene Trailer-Fenster öffnet sich nur mit dem Knopf „Trailer“.
- Entdecken-Titel, die schon auf dem Server liegen, zeigen deren Trailer automatisch im Hintergrund.

## 0.6.3 – 2026-10-18

- **YouTube-Trailer in Quallenkino:** statt in die YouTube-App zu wechseln, läuft der Trailer im eigenen Fenster mit dem offiziellen YouTube-Player (bildschirmfüllend, nichts darüber, Ton bei 75 %). OK bzw. Play/Pause hält an, „Zurück“ schließt, am Ende geht es von selbst zurück. Nur wenn der Player nicht geht (nicht einbettbar, keine Verbindung), öffnet sich die YouTube-App.
- **Trailer auf der Detailseite:** Gibt es keinen Trailer auf dem Server, läuft der YouTube-Trailer aus den Metadaten im selben Fenster.
- **Navigation:** „Rechts“ aus der Navigation führt zurück in den Bereich, aus dem man mit „Links“ gekommen ist (z. B. Entdecken).
- Startfokus auf Detailseiten wird bei Bedarf ein zweites Mal gesetzt (nach schnellem Tastendruck war er manchmal weg).

## 0.6.2 – 2026-10-18

- **Personen aus der Live-TV-Besetzung:** Gibt es die Person auf dem Server (ohne eigene Titel), wird ihre TMDB-Id genutzt und direkt die passende Jellyseerr-Seite geöffnet – auch wenn mehrere Personen gleich heißen. Ohne Server-Eintrag gewinnt bei gleichen Namen die Schauspielerin bzw. der Schauspieler mit der größten Bekanntheit.

## 0.6.1 – 2026-10-18

Korrekturen nach dem LG-Test von 0.6.0:

- **Personen aus der Live-TV-Besetzung:** Hat die Person auf dem Server keine Titel, öffnet sich ihre Seite aus Jellyseerr mit ganzer Filmografie (anfragbar).
- **Entdecken:** „Hoch“ aus der ersten Reihe führt ins Suchfeld. „Links“ am linken Rand führt in die Navigation – ebenso in Suche, Programmführer und Einstellungen (wie Android).
- **Fokus nach „Zurück“** wird zuverlässig auf die vorher gewählte Karte gesetzt (auf langsamen Fernsehern ein zweiter Versuch).
- **„Heute im TV für dich“:** Karten mit Titel und „Heute 20:15 · Sender“ bzw. „Läuft“ und Fortschritt; im Infobereich das Bild der Sendung.
- **Trailer auf der Entdecken-Detailseite:** vom eigenen Server, sonst in der YouTube-App des Fernsehers (deutsche zuerst, sonst gekennzeichnet, z. B. „Trailer (OmU)“).

## 0.6.0 – 2026-10-18

Etappen 5 und 6 – die Navigation links ist jetzt wie in der Android-App: Profil, Suche, Startseite, Live-TV, Entdecken, Einstellungen.

- **Live-TV (Etappe 5):** Reihe **„Heute im TV für dich“** auf der Startseite (Plugin Local Recommendations), Zeit und Sender im Infobereich („Heute 20:15–21:45 · in 2 Stunden · Das Erste“).
- **Programmführer:** Sender untereinander, Sendungen als Zeitleiste ab jetzt (12 Stunden, Linie für „jetzt“), Filter Alle, Favoriten, Filme, Serien, Nachrichten, Kinder, Sport. Oben die ausgewählte Sendung mit **Regie und Darstellern** aus den Programmdaten. Auch bei vielen Sendern flüssig (nur sichtbare Zeilen, Sendungen werden nachgeladen).
- **Sendungs-Details:** Zeit, Sender, Beschreibung, „Regie: …“ und „Mit: …“, Darsteller und Crew als Kreise; OK auf eine Person öffnet ihre Seite (auf dem Server oder aus Jellyseerr). Knöpfe **Einschalten** und **Lieblingssender**.
- **Sender im Player:** Leiste mit LIVE, laufender Sendung und Fortschritt; der Server rechnet als HLS um, es wird nur ein Live-Stream geöffnet und beim Beenden wieder geschlossen.
- **Welten (Etappe 6):** Reihe „Welten“ mit Kacheln (Hintergrund, Logo vom eigenen Server, Name); im Infobereich Logo und Zahl der Titel, nach 3 s der Trailer der Welt. Welt-Seite mit „Für dich in dieser Welt“, „Neu dazugekommen“, den Filmreihen, „Filme“ und „Serien aus der Welt von …“.
- **Entdecken & Anfragen (Jellyseerr über Jellyfin Enhanced):** „Für dich“ (Empfehlungen zu Favoriten und zuletzt Gesehenem, ohne Titel, die schon da oder angefragt sind; neueste zuerst) und Suche (Jahreszahl am Ende filtert). Plakate mit Stand **Verfügbar / Teilweise / Angefragt**. Detailseite mit Eckdaten, FSK, Regie bzw. Idee, Staffeln mit Stand, Besetzung, Ähnlichem; **Anfragen**, bei Serien **Alle Staffeln anfragen** oder **Staffeln wählen**; „In Jellyfin öffnen“, wenn der Titel schon da ist. Der Punkt „Entdecken“ erscheint nur, wenn Jellyseerr erreichbar ist.
- **Einstellungen:** Untertitel beim Start (Intelligent, Immer deutsche, Aus), Ton beim Start (Deutsch bevorzugen, Originalton), Trailer-Vorschau an/aus, Profil wechseln, Abmelden, Server wechseln, Über mit Version und TMDB-Hinweis. „Über“ ist aus der Navigation in die Einstellungen gewandert.

## 0.4.6 – 2026-10-18

- **Überspringen (Intro, Rückblick, Abspann): lieber etwas zu früh als Inhalt verpassen.** Der LG kann nur auf Schlüsselbilder springen; die App fragt das Ende des Abschnitts an und bleibt beim Schlüsselbild davor (die letzten Sekunden des Intros sind noch zu sehen). Nur wenn das mehr als 8 s zu früh ist, wird einmal knapp hinter dem Ziel nachgefragt – schießt das mehr als 1 s darüber hinaus, geht es zurück zur ersten Landung. 0.4.5 konnte einige Sekunden der Folge verschlucken.

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
