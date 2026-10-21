# Privacy policy – Quallenkino for LG TVs (webOS)

*Last updated: 18 October 2026* · [Deutsche Fassung](PRIVACY.md)

Quallenkino ("the app") is an app for LG TVs with webOS for watching media from **your own Jellyfin server**. It is not an official product of the Jellyfin project.

## In short

- The developer of the app **receives no data** from you. There are no developer servers, no developer account, **no ads, no tracking and no usage analytics**.
- The app connects to the **Jellyfin server you enter yourself** (your own server or one run by someone you trust). What happens to data there is up to the operator of that server.

## Data the app sends to your Jellyfin server

- **Sign-in data** (user name and password or Quick Connect code).
- **Device information**: device name, a random device ID, app name and version, supported video and audio formats (so the server can play media correctly).
- **Playback**: what is played, progress, pauses, watched status, thumbs up/down.
- **Requests** for movies and shows, if Jellyseerr is set up on the server (forwarded by the server).

This data goes only to the server you entered, never to the developer.

## Data on the TV

The app stores the server address, the sign-in per profile (an access token, not your password) and your settings on the TV. "Sign out" (Settings → Account or "Who's watching?") also revokes the sign-in on the server and removes it from the TV; the same happens for all profiles when switching to another server. Uninstalling the app removes everything. For server names the app only connects encrypted (https); plain http only for an IP address or when you explicitly type "http://" – the sign-in screen then shows a warning.

## Third-party services

- **Images from TMDB**: for titles not yet on your server (e.g. under "Discover"), the app loads posters directly from `image.tmdb.org`. TMDB thereby learns your connection's IP address; TMDB's privacy policy applies.
- **Searches and viewed titles** (with the Local Recommendations plugin 12.36 or newer): your search terms (after a short typing pause) and the movie and series detail pages you open are sent to your Jellyfin server to improve your recommendations, together with your time offset from UTC for time-of-day suggestions. The server only stores this if the admin enabled it and you did not turn it off – under Settings → "Use searches and viewed titles for recommendations" you can turn it off and delete what was stored; the retention period (default 365 days) is shown there.
- **Update check**: at most every 20 hours the app asks GitHub's public release list (`api.github.com`) for a newer version; GitHub receives the usual connection data (including the IP address). The result is stored on the TV.
- **YouTube trailers**: YouTube trailers are shown with the official YouTube player, embedded through a small page on GitHub Pages (`drdothouse2106.github.io`). GitHub and Google/YouTube receive the usual connection data (including the IP address); Google's privacy policy applies to YouTube. With Settings → Trailer preview "Off", no trailer starts on its own; YouTube is then only loaded when you press the "Trailer" button.

The app contains no third-party services for advertising or analytics.

## Children

The app is not directed at children and collects no data itself. Which content is visible is decided by the operator of the Jellyfin server through its user accounts.

## Your rights

As the developer holds no data about you, there is nothing to disclose or delete. For data on a Jellyfin server, contact its operator. To remove your data from the TV, uninstall the app (to remove just one profile's sign-in: "Sign out").

## Source code and contact

The app is open source (GPL v2): <https://github.com/DrdotHouse2106/Quallenkino-webOS>  
Privacy questions: <https://github.com/DrdotHouse2106/Quallenkino-webOS/issues>

Changes to this policy are published in this repository.
