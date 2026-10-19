# Quallenkino for LG TVs (webOS)

[![Buy me a coffee](https://img.shields.io/badge/☕_Buy_me_a_coffee-PayPal-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/DrdotHouse)

Standalone TV app for **LG TVs running webOS** that talks to your own media server (Jellyfin) – cinematic home screen, personal recommendations, worlds and live TV. It is its own codebase (TypeScript, Preact, remote-control navigation), **not** a fork of the Jellyfin web client. The sister app for Android TV and Fire TV is [Quallenkino](https://github.com/DrdotHouse2106/Jellyfin-TV-Client).

German documentation (main): [README.md](README.md) · Changes: [CHANGELOG.md](CHANGELOG.md)

**Server plugins** (all optional): [Local Recommendations](https://github.com/DrdotHouse2106/Lokal-Vorschlag-Jellyfin) (recommendations with reasons, Top 10, worlds, live TV cast), [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) with Jellyseerr (requests), [Intro Skipper](https://github.com/intro-skipper/intro-skipper) (skip intro/credits).

## Status

Version 1.0 – all 7 stages: app shell and branding, server connection (tries https/http and default ports), "Who's watching?" profile picker, sign-in with password or Quick Connect, home screen with billboard (trailer preview, recommendation reasons), Continue watching, Next up, recommendations, Top 10, recently added, detail page (background trailer, thumbs up/down, seasons and episodes, cast, similar titles), person page, search, player (direct play or server transcoding, resume, smart subtitles, audio & subtitles dialog, skip intro, next episode), live TV (TV for you today, programme guide with filters and favourite channels, programme details with director and cast, watch a channel), worlds (tiles with logo and trailer, world page), discover & request via Jellyseerr (for you, search, choose seasons), settings (subtitles and audio at start, trailer preview, switch profile/server, sign out, about). Plus a personal screensaver (recommendations and started movies, server trailers), an exit prompt on Back from the home screen, and YouTube trailers inside the app (automatic preview top right, full screen via the Trailer button).

## Install (Developer Mode)

Install the **Developer Mode** app on the TV, enable Dev Mode, then with `@webos-tools/cli`: `ares-setup-device`, `ares-novacom --device lgtv --getkey`, `ares-install --device lgtv quallenkino-webos.ipk`. The Dev Mode session expires after a while and must be extended in the Developer Mode app.

Latest build: https://github.com/DrdotHouse2106/Quallenkino-webOS/releases/latest/download/quallenkino-webos.ipk

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
[zockerdb.de](https://zockerdb.de) or self-host ZockerDB Basis on your own server.

## License

GPL v2 (see [LICENSE](LICENSE)). "Jellyfin" is used descriptively only; Quallenkino is not an official Jellyfin product.
