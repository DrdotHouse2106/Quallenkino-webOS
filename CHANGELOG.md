# Änderungen – Quallenkino für webOS

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
