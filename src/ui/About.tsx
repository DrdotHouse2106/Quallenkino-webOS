import type { ServerInfo } from '../api/server'
import { APP_NAME, APP_VERSION } from '../brand'

/** „Über“: Version, Server und die Pflichtnennung der Datenquelle TMDB. */
export function About({ server }: { server: ServerInfo }) {
  return (
    <div class="qk-about">
      <div>{APP_NAME} {APP_VERSION} · {server.name} ({server.version})</div>
      <div>Dieses Produkt nutzt die TMDB-API, ist aber nicht von TMDB unterstützt oder zertifiziert.</div>
    </div>
  )
}
