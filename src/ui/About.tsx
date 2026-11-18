import type { ServerInfo } from '../api/server'
import { APP_NAME, APP_VERSION } from '../brand'
import { t } from '../i18n'

/** „Über“: Version, Server und die Pflichtnennung der Datenquelle TMDB. */
export function About({ server }: { server: ServerInfo }) {
  return (
    <div class="qk-about">
      <div>{APP_NAME} {APP_VERSION} · {server.name} ({server.version})</div>
      {/* Unverschlüsselt (meist http://IP:8096 im Heimnetz): Passwort und Anmeldung gehen im Klartext durchs Netz */}
      {server.url.startsWith('http://') && <div class="qk-muted">{t.serverInsecure}</div>}
      <div>Dieses Produkt nutzt die TMDB-API, ist aber nicht von TMDB unterstützt oder zertifiziert.</div>
    </div>
  )
}
