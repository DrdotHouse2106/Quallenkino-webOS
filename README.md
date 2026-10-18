# Quallenkino für LG-Fernseher (webOS)

Eigenständige TV-App für **LG-Fernseher mit webOS**, die mit einem eigenen Medienserver (Jellyfin) spricht – mit Kino-Startseite, persönlichen Empfehlungen, Welten und Live-TV. Die App ist eine eigene Entwicklung (TypeScript, Preact, Navigation mit der Fernbedienung) und **kein** Fork der Jellyfin-Weboberfläche. Die Schwester-App für Android TV und Fire TV ist [Quallenkino](https://github.com/DrdotHouse2106/Jellyfin-TV-Client).

**Plugins auf dem Server** – keines ist Pflicht, die App läuft auch ohne, nur ohne die jeweiligen Zusatzfunktionen:

| Plugin | Wofür |
|---|---|
| [Local Recommendations](https://github.com/DrdotHouse2106/Lokal-Vorschlag-Jellyfin) (empfohlen) | Empfehlungen mit Begründung, Top 10, Welten, Live-TV-Besetzung |
| [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) mit Jellyseerr | Filme und Serien anfragen |
| [Intro Skipper](https://github.com/intro-skipper/intro-skipper) | Intro und Abspann überspringen |

> English version: [README.en.md](README.en.md) · Änderungen: [CHANGELOG.md](CHANGELOG.md)

## Stand

Version **0.4** – Etappe 4 von 7:

- [x] Grundgerüst, Quallenkino-Erscheinungsbild (Symbol, Startbild, Farben), Bedienung mit der Fernbedienung
- [x] Server verbinden (https/http und Standard-Ports werden selbst ausprobiert)
- [x] „Wer schaut gerade?“ mit Profil-Kacheln, Anmeldung per Passwort oder Quick Connect, Anmeldung pro Profil gemerkt
- [x] Installationspaket (IPK) per GitHub Actions
- [x] Startseite: Banner mit Trailer und Begründungen, Weiterschauen, Als Nächstes, Für dich, Top 10, Kürzlich hinzugefügt
- [x] Detailseite mit Auto-Trailer, Daumen hoch/runter, Staffeln und Folgen, Besetzung, Ähnliche Titel; Personenseite; Suche
- [x] Player: direkt abspielen oder umrechnen, Fortsetzen, intelligente Untertitel, Ton & Untertitel in einem Fenster, Intro überspringen, Nächste Folge
- [ ] Live-TV: Heute im TV für dich, Programmführer mit Besetzung
- [ ] Welten, Anfragen über Jellyseerr
- [ ] Feinschliff, Bildschirmschoner

## Download

Immer die neueste Version (sobald veröffentlicht):
https://github.com/DrdotHouse2106/Quallenkino-webOS/releases/latest/download/quallenkino-webos.ipk

## Installation (Developer Mode)

1. Auf dem Fernseher die App **Developer Mode** aus dem LG Content Store installieren, mit einem LG-Konto anmelden und „Dev Mode Status“ einschalten (der Fernseher startet neu).
2. Am Computer die webOS-Werkzeuge installieren: `npm install -g @webos-tools/cli`
3. Fernseher einrichten: `ares-setup-device` (IP-Adresse des Fernsehers, Name z. B. `lgtv`), dann `ares-novacom --device lgtv --getkey` mit der Passphrase aus der Developer-Mode-App.
4. Installieren und starten:
   ```
   ares-install --device lgtv quallenkino-webos.ipk
   ares-launch --device lgtv de.drdothouse.quallenkino
   ```

Die Developer-Mode-Sitzung läuft nach einiger Zeit ab (Restzeit in der Developer-Mode-App) und muss dort verlängert werden – sonst entfernt der Fernseher die App.

## Selbst bauen

```
npm ci
npm test
npm run build              # → dist/
npx ares-package dist -o out
```

GitHub Actions baut bei jedem Push auf `main` und legt das IPK als Artefakt ab. „Run workflow“ mit „release“ erstellt ein Release `v{Version aus package.json}`.

## Herkunft von Code

Die App ist eigenständig geschrieben, auch der Player: Abspiel-Fähigkeiten des Fernsehers, Direkt abspielen oder Umrechnen und die Untertitel stammen aus eigenem Code, ohne Code aus [jellyfin-web](https://github.com/jellyfin/jellyfin-web). Wird später doch Code von dort übernommen (GPL-2.0), trägt die Datei am Anfang einen Herkunftshinweis und steht in [NOTICE](NOTICE).

## Datenquellen

Daten und Bilder: [TMDB](https://www.themoviedb.org). Dieses Produkt nutzt die TMDB-API, ist aber nicht von TMDB unterstützt oder zertifiziert. Der Hinweis steht auch in der App unter „Über“.

## Unterstützen

Die Entwicklung kostet Zeit und Geld (Server, Testgeräte, KI-Werkzeuge). Wenn dir das Projekt gefällt, freue ich mich über eine kleine Spende:

[![Spenden via PayPal](https://img.shields.io/badge/Spenden-PayPal-0070ba?logo=paypal&logoColor=white)](https://paypal.me/DrdotHouse)

## Lizenz

GPL v2 (siehe [LICENSE](LICENSE)). „Jellyfin“ wird nur beschreibend verwendet; Quallenkino ist kein offizielles Jellyfin-Produkt.
