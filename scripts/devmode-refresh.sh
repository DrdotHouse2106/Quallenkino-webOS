#!/bin/sh
# Verlängert die Developer-Mode-Sitzung eines LG-Fernsehers (sonst deaktiviert der Fernseher nach
# Ablauf selbst installierte Apps wie Quallenkino). Gedacht für einen täglichen Aufruf per cron/Timer.
#
# Das Token ist ein Geheimnis: nie ins Repository, nie ins Log. Einmalig auslesen:
#   ares-novacom --device lgtv --run "cat /var/luna/preferences/devmode_enabled" > ~/.config/quallenkino/devmode-token
#   chmod 600 ~/.config/quallenkino/devmode-token
#
# Aufruf: devmode-refresh.sh [Token-Datei]   (Standard: ~/.config/quallenkino/devmode-token)
set -eu
TOKEN_FILE="${1:-$HOME/.config/quallenkino/devmode-token}"
TOKEN=$(tr -d ' \r\n' < "$TOKEN_FILE")
[ -n "$TOKEN" ] || { echo "Kein Token in $TOKEN_FILE" >&2; exit 1; }

BASE="https://developer.lge.com/secure"
# Sitzung verlängern, dann Restlaufzeit abfragen (Antwort: {"result":"success","errorMsg":"999:59:59"})
curl -fsS --max-time 30 "$BASE/ResetDevModeSession.dev?sessionToken=$TOKEN" > /dev/null
REST=$(curl -fsS --max-time 30 "$BASE/CheckDevModeSession.dev?sessionToken=$TOKEN" | sed -n 's/.*"errorMsg" *: *"\([^"]*\)".*/\1/p')
echo "Developer Mode verlängert, Restlaufzeit: ${REST:-unbekannt}"
