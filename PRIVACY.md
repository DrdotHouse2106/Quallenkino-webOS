# Datenschutzerklärung – Quallenkino für LG-Fernseher (webOS) und Samsung (Tizen)

*Stand: 18. Oktober 2026* · [English version](PRIVACY.en.md)

Quallenkino („die App“) ist eine App für LG-Fernseher mit webOS, mit der man Medien von einem **eigenen Jellyfin-Server** ansieht. Sie ist kein offizielles Produkt des Jellyfin-Projekts. Für Samsung-Fernseher mit Tizen gibt es dieselbe App aus demselben Code; alles hier Gesagte gilt dort genauso (im Jellyfin-Dashboard erscheint das Gerät als „Samsung Tizen“).

## Kurz gesagt

- Der Entwickler der App **erhält keine Daten** von dir. Es gibt keine Server des Entwicklers, kein Benutzerkonto beim Entwickler, **keine Werbung, kein Tracking und keine Nutzungsanalyse**.
- Die App verbindet sich mit dem **Jellyfin-Server, den du selbst einträgst** (dein eigener Server oder der einer Person, der du vertraust). Was dort mit Daten passiert, bestimmt der Betreiber dieses Servers.

## Welche Daten die App an deinen Jellyfin-Server sendet

- **Anmeldedaten** (Benutzername und Passwort bzw. Quick-Connect-Code) zum Anmelden.
- **Geräteangaben**: Gerätename, eine zufällige Geräte-ID, App-Name und -Version, unterstützte Video- und Tonformate (damit der Server passend abspielen kann).
- **Wiedergabe**: was abgespielt wird, Fortschritt, Pausen, „Gesehen“-Status, Daumen hoch/runter.
- **Anfragen** von Filmen und Serien, wenn auf dem Server Jellyseerr eingerichtet ist (über den Server weitergeleitet).

Diese Daten gehen ausschließlich an den von dir eingetragenen Server, nicht an den Entwickler.

## Daten auf dem Fernseher

Die App speichert auf dem Fernseher die Serveradresse, die Anmeldung pro Profil (ein Zugangstoken, nicht dein Passwort) und deine Einstellungen. „Abmelden“ (Einstellungen → Konto oder „Wer schaut?“) widerruft die Anmeldung auch beim Server und entfernt sie vom Fernseher; das gilt ebenso für alle Profile beim Wechsel auf einen anderen Server. Beim Deinstallieren der App wird alles gelöscht. Bei Servernamen verbindet sich die App nur verschlüsselt (https); unverschlüsselt (http) nur bei einer IP-Adresse oder wenn du ausdrücklich „http://“ eingibst – dann erscheint bei der Anmeldung ein Hinweis.

## Dienste Dritter

- **Bilder von TMDB**: Für Titel, die noch nicht auf deinem Server sind (z. B. unter „Entdecken“), lädt die App Plakate direkt von `image.tmdb.org`. Dabei erfährt TMDB die IP-Adresse deines Anschlusses. Es gelten die Datenschutzbestimmungen von TMDB.
- **Suchen und angesehene Titel** (mit dem Plugin Local Recommendations ab 12.36): Deine Suchbegriffe (nach einer kurzen Tipp-Pause) und die Detailseiten von Filmen und Serien, die du öffnest, gehen an deinen Jellyfin-Server und verbessern dort deine Empfehlungen; dazu die Abweichung deiner Uhrzeit von UTC für Vorschläge nach Tageszeit. Der Server speichert das nur, wenn der Admin es eingeschaltet hat und du es nicht abgeschaltet hast – unter Einstellungen → „Suchen und angesehene Titel für Empfehlungen nutzen“ lässt es sich abschalten und das Gespeicherte löschen; dort steht auch die Speicherdauer (Standard 365 Tage).
- **Update-Prüfung**: Höchstens alle 20 Stunden fragt die App die öffentliche Release-Liste bei GitHub (`api.github.com`) nach einer neueren Version; dabei erhält GitHub die üblichen Verbindungsdaten (u. a. IP-Adresse). Das Ergebnis merkt sich die App auf dem Fernseher. In den Einstellungen lässt sich das mit „Beim Öffnen nach Updates suchen“ abschalten.
- **YouTube-Trailer**: Trailer von YouTube zeigt die App mit dem offiziellen YouTube-Player. Dieser wird über eine kleine Seite bei GitHub Pages (`drdothouse2106.github.io`) eingebettet. Dabei erhalten GitHub und Google/YouTube die üblichen Verbindungsdaten (u. a. IP-Adresse); für YouTube gelten die Datenschutzbestimmungen von Google. Mit Einstellungen → Trailer-Vorschau „Aus“ startet kein Trailer mehr von selbst; YouTube wird dann nur noch geladen, wenn du die Taste „Trailer“ drückst.

Die App enthält keine Dienste Dritter für Werbung oder Analyse.

## Kinder

Die App richtet sich nicht gezielt an Kinder und erhebt selbst keine Daten. Welche Inhalte sichtbar sind, legt der Betreiber des Jellyfin-Servers über die Benutzerkonten fest.

## Deine Rechte

Da der Entwickler keine Daten über dich hat, kann er auch keine Auskunft geben oder Daten löschen. Für Daten auf einem Jellyfin-Server wende dich an dessen Betreiber. Deine Daten auf dem Fernseher entfernst du, indem du die App deinstallierst (nur die Anmeldung eines Profils: „Abmelden“).

## Quellcode und Kontakt

Die App ist Open Source (GPL v2): <https://github.com/DrdotHouse2106/Quallenkino-webOS>  
Fragen zum Datenschutz: <https://github.com/DrdotHouse2106/Quallenkino-webOS/issues>

Änderungen dieser Erklärung werden in diesem Repository veröffentlicht.
