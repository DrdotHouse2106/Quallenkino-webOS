# Quallenkino for LG TVs (webOS)

Standalone TV app for **LG TVs running webOS** that talks to your own media server (Jellyfin) – cinematic home screen, personal recommendations, worlds and live TV. It is its own codebase (TypeScript, Preact, remote-control navigation), **not** a fork of the Jellyfin web client. The sister app for Android TV and Fire TV is [Quallenkino](https://github.com/DrdotHouse2106/Jellyfin-TV-Client).

German documentation (main): [README.md](README.md) · Changes: [CHANGELOG.md](CHANGELOG.md)

**Server plugins** (all optional): [Local Recommendations](https://github.com/DrdotHouse2106/Lokal-Vorschlag-Jellyfin) (recommendations with reasons, Top 10, worlds, live TV cast), [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) with Jellyseerr (requests), [Intro Skipper](https://github.com/intro-skipper/intro-skipper) (skip intro/credits).

## Status

Version 0.3 – stage 3 of 7: app shell and branding, server connection (tries https/http and default ports), "Who's watching?" profile picker, sign-in with password or Quick Connect, home screen with billboard (trailer preview, recommendation reasons), Continue watching, Next up, recommendations, Top 10, recently added, detail page (background trailer, thumbs up/down, seasons and episodes, cast, similar titles), person page, search. Next: player, live TV, worlds, requests.

## Install (Developer Mode)

Install the **Developer Mode** app on the TV, enable Dev Mode, then with `@webos-tools/cli`: `ares-setup-device`, `ares-novacom --device lgtv --getkey`, `ares-install --device lgtv quallenkino-webos.ipk`. The Dev Mode session expires after a while and must be extended in the Developer Mode app.

Latest build: https://github.com/DrdotHouse2106/Quallenkino-webOS/releases/latest/download/quallenkino-webos.ipk

## Build

`npm ci && npm test && npm run build && npx ares-package dist -o out`

## Code origin

Written from scratch. From stage 4 on, playback logic (device profile, direct play/transcoding, subtitles) is adapted from [jellyfin-web](https://github.com/jellyfin/jellyfin-web) (GPL-2.0); those files carry an origin header and are listed in [NOTICE](NOTICE).

## Data sources

Data and images: [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB. The notice is also shown in the app under "About".

## Support the project

Development costs time and money (servers, test devices, AI tools). If you like the project, a small donation is very welcome:

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-0070ba?logo=paypal&logoColor=white)](https://paypal.me/DrdotHouse)

## License

GPL v2 (see [LICENSE](LICENSE)). "Jellyfin" is used descriptively only; Quallenkino is not an official Jellyfin product.
