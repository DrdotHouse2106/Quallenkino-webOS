# Quallenkino für LG-Fernseher (webOS) und Samsung (Tizen)

[![Spendier mir einen Kaffee](https://img.shields.io/badge/☕_Spendier_mir_einen_Kaffee-PayPal-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/DrdotHouse)

Eigenständige TV-App für **LG-Fernseher mit webOS**, die mit einem eigenen Medienserver (Jellyfin) spricht – mit Kino-Startseite, persönlichen Empfehlungen, Welten und Live-TV. Die App ist eine eigene Entwicklung (TypeScript, Preact, Navigation mit der Fernbedienung) und **kein** Fork der Jellyfin-Weboberfläche. Die Schwester-App für Android TV und Fire TV ist [Quallenkino](https://github.com/DrdotHouse2106/Jellyfin-TV-Client).

**Plugins auf dem Server** – keines ist Pflicht, die App läuft auch ohne, nur ohne die jeweiligen Zusatzfunktionen:

| Plugin | Wofür |
|---|---|
| [Local Recommendations](https://github.com/DrdotHouse2106/Lokal-Vorschlag-Jellyfin) (empfohlen) | Empfehlungen mit Begründung, Top 10, Welten, Live-TV-Besetzung |
| [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) mit Jellyseerr | Filme und Serien anfragen |
| [Intro Skipper](https://github.com/intro-skipper/intro-skipper) | Intro und Abspann überspringen |

> English version: [README.en.md](README.en.md) · Änderungen: [CHANGELOG.md](CHANGELOG.md)

## Stand

**Neu ab 1.11.0** (Plugin ab 12.46): „Momente“ – zeitabhängige Zeilen vom Server wie „Läuft heute im TV – hier ohne Werbung“, „Neu diese Woche“, „Vor dem Kinostart: Hol die Reihe nach“ oder „Heute vor X Jahren“; Auswahl und Reihenfolge bestimmt der Server, die Begründung steht im Infobereich.

**Neu ab 1.10.0** (Plugin Local Recommendations ab 12.45): Zeile „Filmreihen für dich“ mit dem nächsten Teil („Weiter mit Teil 3“), „Weitere Teile der Reihe“ auf der Detailseite eines Films und – nur zur passenden Zeit – eine Saison-Zeile wie „Weihnachtsfilme“ direkt nach „Als Nächstes“.

Version **1.0** – alle 7 Etappen:

- [x] Grundgerüst, Quallenkino-Erscheinungsbild (Symbol, Startbild, Farben), Bedienung mit der Fernbedienung
- [x] Server verbinden (https/http und Standard-Ports werden selbst ausprobiert)
- [x] „Wer schaut gerade?“ mit Profil-Kacheln, Anmeldung per Passwort oder Quick Connect, Anmeldung pro Profil gemerkt (danach ein Klick aufs Profilbild, keine PIN). Erscheint bei jedem Start und nach mehr als 10 Minuten im Hintergrund (nicht während einer Wiedergabe); das letzte Profil wird nie automatisch angemeldet
- [x] Installationspaket (IPK) per GitHub Actions
- [x] Startseite: Banner mit Trailer und Begründungen, Weiterschauen, Als Nächstes, Für dich, Top 10, Kürzlich hinzugefügt
- [x] Detailseite mit Auto-Trailer, Daumen hoch/runter, Staffeln und Folgen, Besetzung, Ähnliche Titel; Personenseite; Suche
- [x] Player: direkt abspielen oder umrechnen, Fortsetzen, intelligente Untertitel, Ton & Untertitel in einem Fenster, Intro überspringen, Nächste Folge
- [x] Live-TV: „Heute im TV für dich“, Programmführer (Filter, Lieblingssender), Sendungs-Details mit Regie und Darstellern, Sender einschalten
- [x] Welten (Kacheln mit Logo und Trailer, Welt-Seite), Entdecken & Anfragen über Jellyseerr (Für dich, Suche, Staffeln wählen)
- [x] Einstellungen: Untertitel und Ton beim Start, Trailer-Vorschau, Profil/Server wechseln, Abmelden, Über
- [x] Empfehlungen nach Tageszeit und aus Suchen und angesehenen Titeln (Plugin Local Recommendations ab 12.36) – abschaltbar und löschbar in den Einstellungen
- [x] Profilbild selbst wählen (Figur + Hintergrundfarbe, Bild erzeugt das Plugin Local Recommendations ab 12.22) – in „Wer schaut?“ und in den Einstellungen
- [x] Bildschirmschoner mit persönlichen Titeln und Trailern, „Quallenkino beenden?“ bei „Zurück“ auf der Startseite, YouTube-Trailer im eigenen Fenster und automatisch oben rechts

## YouTube-Trailer

Der Fernseher führt die App unter `file://` aus; YouTube bettet dort nicht ein. Der offizielle Player liegt deshalb auf einer kleinen Seite bei GitHub Pages ([`site/yt.html`](site/yt.html)), die die App einbettet – ohne den Player zu überdecken oder zu beschneiden.

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

### Entwicklermodus automatisch verlängern

`scripts/devmode-refresh.sh` verlängert die Sitzung über die LG-Adresse und zeigt die Restlaufzeit. Am besten täglich auf einem Rechner im Heimnetz oder Server ausführen (cron/systemd-Timer):

1. Token einmalig vom Fernseher holen (bleibt geheim, nicht ins Repository):
   ```
   mkdir -p ~/.config/quallenkino
   ares-novacom --device lgtv --run "cat /var/luna/preferences/devmode_enabled" > ~/.config/quallenkino/devmode-token
   chmod 600 ~/.config/quallenkino/devmode-token
   ```
2. Täglich ausführen, z. B. per cron: `17 4 * * * /pfad/zu/scripts/devmode-refresh.sh`

Die App selbst kann das Token nicht lesen (webOS-Apps haben keinen Zugriff auf diese Datei), deshalb läuft die Verlängerung außerhalb des Fernsehers.

### Updates

Gibt es eine neue Version, fragt Quallenkino beim Öffnen und zeigt links in der Navigation einen grünen Knopf „Update“, der den Homebrew Channel öffnet. Unter **Einstellungen → Updates** lässt sich auch von Hand suchen. Selbst installieren kann sich eine webOS-App nicht; am bequemsten geht das Update über den **Homebrew Channel**:

1. Homebrew Channel installieren (siehe [webosbrew.org](https://www.webosbrew.org/)).
2. Im Homebrew Channel unter Einstellungen → Repositories diese Quelle hinzufügen:
   `https://drdothouse2106.github.io/Quallenkino-webOS/homebrew/apps.json`
3. Danach erscheint Quallenkino in der Liste und lässt sich mit „Update“ aktualisieren. Die Quelle wird bei jedem Release automatisch erneuert (mit Prüfsumme der IPK).

Ohne Homebrew Channel die neue IPK wie oben mit `ares-install` installieren.

## Samsung-Fernseher (Tizen)

Quallenkino gibt es auch für **Samsung-Fernseher mit Tizen** (Ziel: Modelle ab 2020, Tizen 5.5). Es ist dieselbe App aus demselben Code, nur anders verpackt. **Neu und noch nicht auf einem Samsung-Gerät getestet** – Rückmeldungen sind willkommen.

Download (unsigniert, wird beim Installieren mit dem eigenen Zertifikat signiert):
https://github.com/DrdotHouse2106/Quallenkino-webOS/releases/latest/download/quallenkino-tizen.wgt

Samsung lässt eigene Apps nur mit einem **Samsung-Zertifikat** zu, das an den Fernseher gebunden ist. Das ist einmalig etwas Arbeit:

1. **Tizen Studio** am Computer installieren (https://developer.tizen.org/development/tizen-studio/download). Im *Package Manager* unter „Extension SDK“ die **Samsung Certificate Extension** und die **TV Extensions** dazu installieren.
2. **Entwicklermodus am Fernseher:** *Apps* öffnen, auf der Fernbedienung nacheinander **1 2 3 4 5** eingeben, „Developer mode“ auf **On**, bei „Host PC IP“ die IP-Adresse des Computers eintragen. Fernseher ganz aus- und wieder einschalten.
3. **Verbinden:** Im Tizen Studio *Device Manager* den Fernseher per IP hinzufügen – oder in der Befehlszeile `sdb connect <IP des Fernsehers>`. `sdb devices` zeigt danach den Gerätenamen.
4. **Zertifikat anlegen:** *Tools → Certificate Manager → +* → **Samsung** → **TV** → neues Autor-Zertifikat (Name und Passwort frei wählbar, **gut aufheben**) → mit dem Samsung-Konto anmelden → Distributor-Zertifikat erstellen. Ist der Fernseher verbunden, wird seine Geräte-ID (DUID) automatisch eingetragen. Das Profil z. B. `quallenkino` nennen.
5. **Signieren und installieren** (Tizen-Befehlszeile aus `tizen-studio/tools/ide/bin`):
   ```
   tizen package -t wgt -s quallenkino -- quallenkino-tizen.wgt
   tizen install -n quallenkino-tizen.wgt -t <Gerätename>
   tizen run -p QKinoTzn01.Quallenkino -t <Gerätename>
   ```

**Updates:** Eine Selbst-Aktualisierung gibt es auf Samsung ohne Store nicht. Die App prüft beim Öffnen (abschaltbar in den Einstellungen), ob es eine neue Version gibt, und zeigt einen Hinweis. Dann die neue `quallenkino-tizen.wgt` laden und Schritt 5 wiederholen – mit **demselben** Zertifikatsprofil, dann bleiben Einstellungen und Anmeldung erhalten.

## Häufige Probleme

Hürden, auf die wir selbst gestoßen sind – jeweils mit Symptom, Ursache und Lösung.

### LG (webOS)

**App ist nach einigen Tagen verschwunden**
- *Ursache:* Die Developer-Mode-Sitzung ist abgelaufen; der Fernseher entfernt dann selbst installierte Apps.
- *Lösung:* In der Developer-Mode-App rechtzeitig verlängern oder automatisch verlängern lassen (siehe „Entwicklermodus automatisch verlängern“). Danach die IPK erneut installieren.

**Update-Hinweis, aber „Homebrew Channel nicht gefunden“**
- *Ursache:* Updates laufen über den Homebrew Channel, der auf dem Fernseher fehlt.
- *Lösung:* Homebrew Channel installieren und dort unter Einstellungen → Repositories die Quelle aus „Updates“ eintragen – oder die neue IPK wie beim ersten Mal per `ares-install` aufspielen.

### Ton und Untertitel (LG und Samsung)

**Film mit DTS- oder TrueHD-Ton: Server rechnet um**
- *Ursache:* Neuere LG- und Samsung-Fernseher spielen DTS und TrueHD nicht ab.
- *Lösung:* Nichts zu tun – der Server wandelt nur den Ton in Dolby Digital 5.1 um, das Bild bleibt unverändert. Das kostet etwas Rechenzeit auf dem Server.

**Bild-Untertitel (PGS, DVD) machen den Film langsam**
- *Ursache:* Bild-Untertitel kann die App nicht selbst anzeigen; der Server brennt sie ins Bild ein und muss dafür das Video neu kodieren.
- *Lösung:* Wenn möglich Text-Untertitel (SRT) wählen. Für häufig genutzte Titel hilft eine SRT-Spur neben der Datei.

**Erzwungene Untertitel („Forced“) werden nicht erkannt**
- *Ursache:* Viele MKV-Dateien nennen die Spur „Forced“, setzen aber das Forced-Flag nicht.
- *Lösung:* Ab 1.9.1 erkennt die App solche Spuren auch am Namen („Forced“, „erzwungen“, „nur fremdsprachige“). In der Datei korrigieren: `mkvpropedit datei.mkv --edit track:sN --set flag-forced=1` (N = Nummer der Untertitelspur), danach die Metadaten in Jellyfin aktualisieren. *Achtung:* Viele Dateien auf einmal zu ändern, löst ein Neueinlesen in Jellyfin und in Sonarr/Radarr aus – besser gestaffelt.

**Schauspielerseite zeigt nur Titel aus der eigenen Bibliothek**
- *Ursache:* Die weiteren Filme und Serien einer Person kommen aus Jellyseerr (Filmografie von TMDb). Fehlt eine Voraussetzung, zeigt die App nur, was auf dem Server liegt.
- *Voraussetzungen:* Quallenkino ab 1.8.1 (Trennung Bibliothek/weitere Titel); auf dem Server das Plugin [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) mit eingerichteter Jellyseerr-Anbindung; die Person hat in Jellyfin eine TMDb-Id (Metadaten aus TMDb – sonst bei der Person „Metadaten aktualisieren“).
- *Ergebnis:* Oben „In deiner Bibliothek“, darunter „Weitere Filme“ und „Weitere Serien“ mit Stand und Anfrage-Knopf.

### Samsung (Tizen) – Installation

**Entwicklermodus: Bei „1 2 3 4 5“ passiert nichts oder die Ziffern landen im Suchfeld**
- *Ursache:* Die Eingabe ist zeitkritisch und funktioniert nur, wenn der Fokus auf einer App-Kachel liegt.
- *Lösung:* Auf der Apps-Seite eine App-Kachel auswählen (nicht die Suche) und die Ziffern zügig hintereinander eingeben – innerhalb von etwa 2 Sekunden. Bei der Smart Remote ohne Zifferntasten über die Taste „123“ bzw. das Ziffernfeld auf dem Bildschirm; alternativ die Fernbedienung in der SmartThings-App. Danach den Fernseher neu starten: Ein/Aus gedrückt halten, bis das Logo erscheint.
- *Tipp:* Im Browser `http://<IP des Fernsehers>:8001/api/v2/` aufrufen – „developerMode“ und „developerIP“ zeigen, ob der Modus aktiv ist und welcher Rechner eingetragen ist.

**Fernseher taucht in Tizen Studio / `sdb` nicht auf**
- *Ursache:* Der Entwicklermodus erlaubt nur Verbindungen vom eingetragenen Rechner.
- *Lösung:* Apps → **1 2 3 4 5** → Developer mode **On** und bei „Host PC IP“ die IP genau des Rechners eintragen, von dem installiert wird; danach den Fernseher ganz aus- und wieder einschalten.

**Installation scheitert mit Zertifikatsfehler**
- *Ursache:* Samsung-Fernseher nehmen nur Apps an, die mit einem **Samsung-Zertifikat** signiert sind; das Distributor-Zertifikat muss die Geräte-ID (DUID) des Fernsehers enthalten.
- *Lösung:* Im Certificate Manager ein Profil vom Typ **Samsung → TV** anlegen (Samsung-Konto nötig), dabei muss der Fernseher verbunden sein, damit die DUID übernommen wird. Bei einem weiteren Fernseher das Distributor-Zertifikat mit beiden DUIDs neu erstellen.

**Package Manager meldet „Network disconnected“**
- *Beobachtet:* Mit dem Package Manager des Tizen SDK 10 unter Windows (auch ohne Proxy).
- *Lösung:* **Tizen Studio 6.1** (Variante „web-ide“) verwenden – damit ließen sich die Erweiterungen installieren.

**Certificate Manager startet nicht bzw. Erweiterung lässt sich unter Linux nicht installieren**
- *Ursache:* Der Certificate Manager braucht eine grafische Oberfläche (kein Betrieb ohne Bildschirm/Server ohne Desktop). Die Erweiterung „TV-SAMSUNG-Extension-Tools“ ließ sich unter Linux über die Befehlszeile nicht installieren.
- *Lösung:* Zertifikat und Erweiterungen am Desktop-Rechner (Windows oder Linux mit Oberfläche) über den Package Manager einrichten; signieren und installieren geht danach auch per Befehlszeile.

**`tizen package` bricht unter Linux ab (NoClassDefFoundError `org.tizen.core.gputil.XMLUtil`)**
- *Beobachtet:* Tizen-Befehlszeile aus Tizen Studio 6.1 unter Linux; das fehlende Paket („Baseline-SDK“) ließ sich per `package-manager-cli` nicht nachinstallieren.
- *Lösung:* Unter Windows signieren (`tizen package …` läuft dort fehlerfrei) und die signierte `.wgt` dann von Windows oder Linux aus installieren – `tizen install` funktioniert auch unter Linux.

**Certificate Manager startet unter Windows nicht**
- *Ursache:* Die mitgelieferte Java-8-Laufzeit kennt eine Startoption in der Konfiguration nicht.
- *Lösung:* In `tools\certificate-manager\eclipse.ini` (im Tizen-Studio-Ordner) die Zeile `--add-modules=ALL-SYSTEM` entfernen und den Certificate Manager neu starten.

**Update eingespielt, aber Anmeldung weg**
- *Ursache:* Mit einem anderen Zertifikatsprofil signiert – für den Fernseher ist das eine andere App.
- *Lösung:* Für Updates immer dasselbe Zertifikatsprofil verwenden (Autor-Zertifikat sichern).

## Selbst bauen

```
npm ci
npm test
npm run build              # → dist/ (webOS)
npx ares-package dist -o out
npm run build:tizen        # → dist-tizen/ (Samsung, mit config.xml)
```

GitHub Actions baut bei jedem Push auf `main` und legt das IPK als Artefakt ab. „Run workflow“ mit „release“ erstellt ein Release `v{Version aus package.json}`.

## Herkunft von Code

Die App ist eigenständig geschrieben, auch der Player: Abspiel-Fähigkeiten des Fernsehers, Direkt abspielen oder Umrechnen und die Untertitel stammen aus eigenem Code, ohne Code aus [jellyfin-web](https://github.com/jellyfin/jellyfin-web). Wird später doch Code von dort übernommen (GPL-2.0), trägt die Datei am Anfang einen Herkunftshinweis und steht in [NOTICE](NOTICE).

## Datenquellen

Daten und Bilder: [TMDB](https://www.themoviedb.org). Dieses Produkt nutzt die TMDB-API, ist aber nicht von TMDB unterstützt oder zertifiziert. Der Hinweis steht auch in der App unter „Über“.

## Unterstützen

Die Entwicklung kostet Zeit und Geld (Server, Testgeräte, KI-Werkzeuge). Wenn dir das Projekt gefällt, freue ich mich über eine kleine Spende:

[![Spenden via PayPal](https://img.shields.io/badge/Spenden-PayPal-0070ba?logo=paypal&logoColor=white)](https://paypal.me/DrdotHouse)

### 🎮 Auch eine Zocker-Ader?

Dann ist vielleicht mein anderes Projekt genau das Richtige für dich: **[ZockerDB](https://zockerdb.de)** –
deine Spielesammlung an einem Platz. Spiele, Konsolen und Zubehör erfassen (auch per Barcode-Scan mit
dem Handy), bewerten und verwalten, mit Preisverlauf, Editionen und PAL/USK-Angaben. Direkt auf
[zockerdb.de](https://zockerdb.de) nutzen oder als [ZockerDB Basis](https://github.com/DrdotHouse2106/ZockerDBBasis) auf dem eigenen Server hosten.

## Lizenz

GPL v2 (siehe [LICENSE](LICENSE)). „Jellyfin“ wird nur beschreibend verwendet; Quallenkino ist kein offizielles Jellyfin-Produkt.
