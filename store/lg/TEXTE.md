# LG Content Store – Eintrag „Quallenkino“

Unterlagen für die LG Seller Lounge (webOS TV). Die genauen Bildgrößen und Pflichtfelder bitte beim Anlegen in der Seller Lounge gegenprüfen – LG ändert sie gelegentlich.

## Grafiken

| Verwendung | Datei |
|---|---|
| App-Symbol 80×80 (im Paket) | `public/icon.png` |
| App-Symbol 130×130 (im Paket) | `public/largeIcon.png` |
| Startbild 1920×1080 (im Paket) | `public/splash.png` |
| Store-Symbol 400×400 (Seller Lounge verlangt mindestens 400×400) | `assets/quallenkino-icon-400.png` (auch 512×512: `assets/quallenkino-icon-512.png`) |
| Screenshots 1920×1080 | `store/lg/screenshots/01-…11-*.png` |

Screenshots:

| Datei | Inhalt | Quelle |
|---|---|---|
| 01-startseite | Startseite im Kino-Stil | Jellyfin-Demo-Server |
| 02-reihen | Reihen „Weiterschauen“ usw. | Jellyfin-Demo-Server |
| 03-details | Detailseite | Jellyfin-Demo-Server |
| 04-begruendung | Empfehlung mit Begründung | eigener Server, weichgezeichnet |
| 05-heute-im-tv | „Heute im TV für dich“ | eigener Server, weichgezeichnet |
| 06-programmfuehrer | Programmführer mit Regie und Darstellern | eigener Server, weichgezeichnet |
| 07-welt | Welt-Seite | eigener Server, weichgezeichnet |
| 08-person | Personenseite mit „Verfügbar“/„Angefragt“ | eigener Server, weichgezeichnet |
| 09-entdecken | Entdecken & Anfragen | eigener Server, weichgezeichnet |
| 10-suche | Suche | Jellyfin-Demo-Server |
| 11-einstellungen | Einstellungen | Jellyfin-Demo-Server |

Auf den Bildern vom eigenen Server sind Plakate, Logos, Filmtitel, Inhaltsangaben, Sender und Rollennamen weichgezeichnet (Marken- und Urheberrechte). Die Demo-Bilder zeigen die frei lizenzierten Inhalte des Jellyfin-Demo-Servers.

## Grunddaten

| Feld | Wert |
|---|---|
| App-Name | Quallenkino für Jellyfin (Ausweichname: Quallenkino for Jellyfin) |
| App-ID | de.drdothouse.quallenkino |
| Kategorie | Entertainment (bzw. „Video“/„Movies & TV“, falls angeboten) |
| Support-Website | https://github.com/DrdotHouse2106/Quallenkino-webOS |
| Support-E-Mail | (in der Seller Lounge selbst eintragen) |
| Datenschutzerklärung | https://github.com/DrdotHouse2106/Quallenkino-webOS/blob/main/PRIVACY.md |
| Preis | kostenlos |
| Werbung / In-App-Käufe | keine |
| Altersfreigabe | Die App selbst zeigt keine Inhalte; was sichtbar ist, legt der Betreiber des Jellyfin-Servers fest |

## Deutsch

**Kurzbeschreibung**

Deine Filme und Serien vom eigenen Jellyfin-Server – mit Kino-Startseite, persönlichen Empfehlungen und Live-TV.

**Beschreibung**

Quallenkino bringt deinen eigenen Jellyfin-Medienserver auf den LG-Fernseher. Filme, Serien und Live-TV laufen direkt von deinem Server – ohne Abo, ohne Werbung, ohne Tracking.

Besonderheiten:
• Startseite im Kino-Stil mit großem Infobereich, wechselnden Vorschlägen und Trailer-Vorschau
• Persönliche Empfehlungen: „Empfohlene Filme für dich“, „Empfohlene Serien für dich“ und „Heute im TV für dich“ – jeweils mit Begründung („Weil du … geschaut hast“)
• „Welten“: Filmreihen und Studios mit eigener Seite, Logo und Trailer
• „Top 10 bei euch“: die meistgesehenen Titel aller Benutzer auf deinem Server
• Daumen hoch/runter auf der Detailseite – fließt in die Empfehlungen ein
• Live-TV mit Programmführer, Filtern, Lieblingssendern sowie Regie und Darstellern zur Sendung
• Personenseiten mit allen Titeln aus deiner Bibliothek und dem Status „Verfügbar“ oder „Angefragt“
• Filme und Serien direkt am Fernseher anfragen (Jellyseerr, wenn auf dem Server eingerichtet)
• Intelligente Untertitel (aus bei deutschem Ton), Ton und Untertitel in einem Fenster, Intro überspringen, nächste Folge automatisch
• Bildschirmschoner mit deinen Titeln, auf Wunsch mit Trailern

Außerdem: Weiterschauen, Als Nächstes, Suche, mehrere Profile, Anmeldung per Passwort oder Quick Connect.

Voraussetzung: ein Jellyfin-Server (eigener oder von Familie/Freunden). Empfehlungen, Welten und Top 10 brauchen das Server-Plugin „Local Recommendations“; alle anderen Funktionen laufen mit jedem Jellyfin-Server. Quallenkino ist kein offizielles Produkt des Jellyfin-Projekts. Open Source (GPL v2): github.com/DrdotHouse2106/Quallenkino-webOS

**Funktionsliste (eine Zeile pro Punkt)**

Startseite im Kino-Stil mit Trailer-Vorschau
Persönliche Empfehlungen mit Begründung
Welten und „Top 10 bei euch“
Live-TV mit Programmführer, Regie und Darstellern
Daumen hoch/runter für bessere Empfehlungen
Filme und Serien anfragen (Jellyseerr)
Intelligente Untertitel und Intro überspringen
Weiterschauen und Als Nächstes
Mehrere Profile und Quick Connect
Keine Werbung, kein Tracking, Open Source

**Stichwörter**

jellyfin, mediaserver, heimkino, filme, serien, live-tv, empfehlungen, top 10, jellyseerr, streaming

## English

**Short description**

Movies and shows from your own Jellyfin server – with a cinematic home screen, personal recommendations and live TV.

**Description**

Quallenkino brings your own Jellyfin media server to your LG TV. Movies, shows and live TV stream straight from your server – no subscription, no ads, no tracking.

Highlights:
• Cinematic home screen with a large info area, rotating suggestions and trailer preview
• Personal recommendations: movies, shows and "On TV today for you" – each with a reason ("Because you watched …")
• "Worlds": film series and studios with their own page, logo and trailer
• "Top 10": the most watched titles of all users on your server
• Thumbs up/down on the detail page – improves your recommendations
• Live TV with program guide, filters, favourite channels plus director and cast for each programme
• Person pages listing every title in your library, marked "Available" or "Requested"
• Request movies and shows right from the TV (Jellyseerr, if set up on the server)
• Smart subtitles (off for audio in your language), audio and subtitles in one window, intro skipping, automatic next episode
• Screensaver with your titles, optionally with trailers

Also included: continue watching, next up, search, multiple profiles, sign-in with password or Quick Connect.

Requires a Jellyfin server (your own or one from family and friends). Recommendations, Worlds and Top 10 need the server plugin "Local Recommendations"; everything else works with any Jellyfin server. Quallenkino is not an official Jellyfin product. Open source (GPL v2): github.com/DrdotHouse2106/Quallenkino-webOS

**Feature bullets**

Cinematic home screen with trailer preview
Personal recommendations with a reason
Worlds and Top 10
Live TV with program guide, director and cast
Thumbs up/down for better recommendations
Request movies and shows (Jellyseerr)
Smart subtitles and intro skipping
Continue watching and next up
Multiple profiles and Quick Connect
No ads, no tracking, open source

**Keywords**

jellyfin, media server, home theater, movies, tv shows, live tv, recommendations, top 10, jellyseerr, streaming

## Hinweis für die Prüfer (Testing instructions)

The app requires a Jellyfin media server. For testing please use the public Jellyfin demo server:
Server: https://demo.jellyfin.org/stable – User: demo – Password: (empty)
Recommendation rows, Worlds and Top 10 only appear on servers with the "Local Recommendations" plugin; live TV needs a server with TV tuners. All other features work with the demo server.
YouTube trailers are shown with the official YouTube player, embedded from https://drdothouse2106.github.io/Quallenkino-webOS/yt.html (the TV runs the app under file://, where YouTube does not embed directly). The player is neither covered nor cropped.
