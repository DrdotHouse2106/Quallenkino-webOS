# Quallenkino for LG TVs (webOS) and Samsung (Tizen)

[![Buy me a coffee](https://img.shields.io/badge/☕_Buy_me_a_coffee-PayPal-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/DrdotHouse)

Standalone TV app for **LG TVs running webOS** that talks to your own media server (Jellyfin) – cinematic home screen, personal recommendations, worlds and live TV. It is its own codebase (TypeScript, Preact, remote-control navigation), **not** a fork of the Jellyfin web client. The sister app for Android TV and Fire TV is [Quallenkino](https://github.com/DrdotHouse2106/Jellyfin-TV-Client).

German documentation (main): [README.md](README.md) · Changes: [CHANGELOG.md](CHANGELOG.md)

**Server plugins** (all optional): [Local Recommendations](https://github.com/DrdotHouse2106/Lokal-Vorschlag-Jellyfin) (recommendations with reasons, Top 10, worlds, live TV cast), [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) with Jellyseerr (requests), [Intro Skipper](https://github.com/intro-skipper/intro-skipper) (skip intro/credits).

## Status

1.19.1: fixes – sign-in kept on server restart, transcoding fallback on playback errors, spacing on webOS 6, HDR profile like Jellyfin Web, player reporting.

New in 1.19.0 (Local Recommendations 12.55+): worlds such as Star Trek can be shown chronologically by story time.

New in 1.18.0: trailer preview also when the selection rests on a card in a row (can be switched off).

New in 1.17.0 (Local Recommendations 12.54+): discover rows "In cinemas soon" and "New this year – movies/series", like Jellyfin Web.

New in 1.16.0: HDR is only played directly if the TV can show it (otherwise the server tone-maps to SDR); setting "HDR": Automatic, Always convert, Always direct.

1.15.1: correct air times in the device time zone and "Next: S03E06 on Sun 01.11." (Local Recommendations 12.52.2+).

New in 1.15.0 (Local Recommendations 12.52+): series page shows episodes released today ("New: S02E05", marked in the episode list) and the next episode with date, network and title, like Jellyfin Web.

1.14.1: the seasonal row (e.g. "Halloween") now shows reliably, like in Jellyfin Web.

New in 1.14.0 (Local Recommendations 12.49+): web-style "Upcoming" – date on the card; an episode opens a view with season/episode, day, time, network, overview and "Go to series".

New in 1.13.0 (Local Recommendations 12.48+): "Upcoming" row (new episodes from Sonarr, movies from Radarr); recommendation row titles and the live TV row switch now come from the server, matching Jellyfin Web.

New in 1.12.0: web-style movie series cards (series image, progress, "x of y watched · continue with part n") opening a series page with all parts and a "Continue with part n" button; moments cards show their reason as a caption.

New in 1.11.0 (Local Recommendations 12.46+): time-based "moments" rows from the server (on TV today – here without ads, new this week, before the cinema release, years ago today …).

New in 1.10.0 (Local Recommendations 12.45+): "Movie series for you" with the next part, "More parts of the series" on a movie's detail page, and a seasonal row (e.g. Christmas movies) when active.

Version 1.0 – all 7 stages: app shell and branding, server connection (tries https/http and default ports), "Who's watching?" profile picker (at every start and after more than 10 minutes in the background; never signs in automatically, saved sign-ins with one click, no PIN), sign-in with password or Quick Connect, home screen with billboard (trailer preview, recommendation reasons), Continue watching, Next up, recommendations, Top 10, recently added, detail page (background trailer, thumbs up/down, seasons and episodes, cast, similar titles), person page, search, player (direct play or server transcoding, resume, smart subtitles, audio & subtitles dialog, skip intro, next episode), live TV (TV for you today, programme guide with filters and favourite channels, programme details with director and cast, watch a channel), worlds (tiles with logo and trailer, world page), discover & request via Jellyseerr (for you, search, choose seasons), settings (subtitles and audio at start, trailer preview, switch profile/server, sign out, about). Plus a personal screensaver (recommendations and started movies, server trailers), an exit prompt on Back from the home screen, and YouTube trailers inside the app (automatic preview top right, full screen via the Trailer button).

## Install (Developer Mode)

Install the **Developer Mode** app on the TV, enable Dev Mode, then with `@webos-tools/cli`: `ares-setup-device`, `ares-novacom --device lgtv --getkey`, `ares-install --device lgtv quallenkino-webos.ipk`. The Dev Mode session expires after a while and must be extended in the Developer Mode app.

Latest build: https://github.com/DrdotHouse2106/Quallenkino-webOS/releases/latest/download/quallenkino-webos.ipk

**Extend Dev Mode automatically:** run `scripts/devmode-refresh.sh` daily (cron) on a machine at home. Read the token once with `ares-novacom --device lgtv --run "cat /var/luna/preferences/devmode_enabled"` and store it in `~/.config/quallenkino/devmode-token` (keep it secret, never commit it).

**Updates:** the app checks once a day and shows a hint; Settings → Updates checks on demand. Updates install via the **Homebrew Channel**: add the repository `https://drdothouse2106.github.io/Quallenkino-webOS/homebrew/apps.json` there, then Quallenkino shows an “Update” button.

## Samsung TVs (Tizen)

Quallenkino is also built for **Samsung TVs running Tizen** (target: 2020 models and newer, Tizen 5.5) – same app, same code, different package. **New and not yet tested on a Samsung TV.**

Download (unsigned): https://github.com/DrdotHouse2106/Quallenkino-webOS/releases/latest/download/quallenkino-tizen.wgt

Samsung only accepts apps signed with a **Samsung certificate** bound to the TV: install Tizen Studio with the Samsung Certificate Extension and TV Extensions, enable Developer mode on the TV (Apps → 1 2 3 4 5 → On, enter the PC's IP, restart the TV), `sdb connect <TV-IP>`, create a Samsung TV certificate profile in the Certificate Manager (keep the author certificate!), then `tizen package -t wgt -s <profile> -- quallenkino-tizen.wgt`, `tizen install -n quallenkino-tizen.wgt -t <device>`. Updates: the app shows a hint when a new version exists; repeat the last two commands with the same certificate profile. Details (German): [README.md](README.md#samsung-fernseher-tizen).

## Troubleshooting

- **webOS app disappeared:** the Developer Mode session expired – extend it (or automatically, see above) and reinstall the IPK.
- **DTS/TrueHD:** newer LG and Samsung TVs can't play them; the server converts only the audio to Dolby Digital 5.1.
- **Picture subtitles (PGS/DVD):** the server burns them in and re-encodes the video – prefer text subtitles (SRT).
- **Forced subtitles not detected:** many MKVs only name the track "Forced"; since 1.9.1 the name is enough. Fix the file with `mkvpropedit file.mkv --edit track:sN --set flag-forced=1` and refresh the item (stagger bulk changes).
- **Actor page shows only titles from your library:** the full filmography comes from Jellyseerr (TMDb). Requires version 1.8.1 or newer, the [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) plugin with Jellyseerr configured, and a TMDb id on the person in Jellyfin (refresh the person's metadata if missing).
- **Samsung Developer mode does nothing / digits go to the search field:** on the Apps page focus an app tile (not search) and type 1 2 3 4 5 quickly (within ~2 s); on a Smart Remote without digits use the "123" key or the SmartThings app remote; then restart the TV (hold power until the logo appears). `http://<tv-ip>:8001/api/v2/` shows "developerMode" and "developerIP".
- **Samsung:** the TV only accepts the PC whose IP is entered in Developer mode (Apps → 12345); signing needs a Samsung TV certificate with the TV's DUID; the Tizen SDK 10 package manager on Windows reported "Network disconnected" – Tizen Studio 6.1 (web-ide) worked; the Certificate Manager needs a desktop GUI, and the TV extension could not be installed via CLI on Linux; always sign updates with the same certificate profile. On Linux, `tizen package` (Tizen Studio 6.1 CLI) failed with NoClassDefFoundError `org.tizen.core.gputil.XMLUtil` – sign on Windows instead; `tizen install` works on Linux. If the Certificate Manager does not start on Windows (bundled Java 8), remove the line `--add-modules=ALL-SYSTEM` from `tools\certificate-manager\eclipse.ini`.

Details (German): [README.md](README.md#häufige-probleme).

## Build

`npm ci && npm test && npm run build && npx ares-package dist -o out`

## Code origin

Written from scratch, including the player (device profile, direct play/transcoding, subtitles) – no code from [jellyfin-web](https://github.com/jellyfin/jellyfin-web) so far. Should code be adapted from there later (GPL-2.0), those files will carry an origin header and be listed in [NOTICE](NOTICE).

## Data sources

Data and images: [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB. The notice is also shown in the app under "About".

## Support the project

Development costs time and money (servers, test devices, AI tools). If you like the project, a small donation is very welcome:

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-0070ba?logo=paypal&logoColor=white)](https://paypal.me/DrdotHouse)

### 🎮 Got a gamer streak too?

Then my other project might be just right for you: **[ZockerDB](https://zockerdb.de)** – your game
collection in one place. Track games, consoles and accessories (including barcode scanning with your
phone), rate and manage them, with price history, editions and PAL/USK details. Use it directly at
[zockerdb.de](https://zockerdb.de) or self-host [ZockerDB Basis](https://github.com/DrdotHouse2106/ZockerDBBasis) on your own server.

## License

GPL v2 (see [LICENSE](LICENSE)). "Jellyfin" is used descriptively only; Quallenkino is not an official Jellyfin product.
