import type { ServerInfo } from '../api/server'
import type { Session } from '../api/users'
import { APP_NAME, APP_VERSION } from '../brand'
import { t } from '../i18n'
import { Button } from '../ui/Focusable'
import { Logo } from '../ui/Logo'
import { Screen } from '../ui/Screen'

interface Props {
  server: ServerInfo
  session: Session
  onSwitchProfile: () => void
  onSignOut: () => void
}

/** Platzhalter bis Etappe 2: Begrüßung, Profil wechseln, Abmelden und „Über“ mit Datenquellen. */
export function HomeScreen({ server, session, onSwitchProfile, onSignOut }: Props) {
  return (
    <Screen focusKey="home" class="qk-center" onBack={() => { onSwitchProfile(); return true }}>
      <Logo size={120} />
      <h1>{t.hello(session.name)}</h1>
      <p class="qk-muted">{t.homeComingSoon}</p>
      <div class="qk-actions">
        <Button focusKey="home-switch" onPress={onSwitchProfile} autoFocus>{t.switchProfile}</Button>
        <Button focusKey="home-signout" onPress={onSignOut}>{t.signOut}</Button>
      </div>
      <About server={server} />
    </Screen>
  )
}

/** „Über“: Version, Server und die Pflichtnennung der Datenquelle TMDB. */
export function About({ server }: { server: ServerInfo }) {
  return (
    <div class="qk-about">
      <div>{APP_NAME} {APP_VERSION} · {server.name} ({server.version})</div>
      <div>Dieses Produkt nutzt die TMDB-API, ist aber nicht von TMDB unterstützt oder zertifiziert.</div>
    </div>
  )
}
