import { useEffect, useState } from 'preact/hooks'
import type { ServerInfo } from './api/server'
import { checkSession, logout, type Session, type UserSummary } from './api/users'
import { Shell } from './home/Shell'
import { LoginScreen } from './screens/LoginScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ServerScreen } from './screens/ServerScreen'
import { loadState, saveState, withSession, withoutSession, type SavedState } from './store'

type View =
  | { name: 'server' }
  | { name: 'profiles' }
  | { name: 'login'; username?: string; direct?: boolean }
  | { name: 'home'; session: Session }

/** So lange darf die App im Hintergrund sein, ohne dass beim Zurückkehren neu gefragt wird. */
const ASK_AGAIN_MS = 10 * 60 * 1000

/**
 * Ablauf: Server → „Wer schaut gerade?“ → (Anmeldung, falls nötig) → Startseite. Beim Start wird nie
 * automatisch das letzte Profil angemeldet; gespeicherte Anmeldungen gelten ohne PIN per Klick.
 */
export function App() {
  const [state, setState] = useState<SavedState>(() => loadState())
  const [view, setView] = useState<View>(() => (state.server ? { name: 'profiles' } : { name: 'server' }))

  useEffect(() => saveState(state), [state])

  // „Wer schaut?“ auch nach einer längeren Pause (App im Hintergrund), nicht während der Wiedergabe
  useEffect(() => {
    let hiddenSince = 0
    const onVisibility = () => {
      if (document.hidden) {
        hiddenSince = Date.now()
        return
      }
      const away = hiddenSince ? Date.now() - hiddenSince : 0
      hiddenSince = 0
      if (away > ASK_AGAIN_MS && state.server && !document.querySelector('.qk-player video')) setView({ name: 'profiles' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [state.server])

  const server = state.server

  async function pickProfile(user: UserSummary) {
    if (!server) return
    // Schon angemeldet? Dann ohne Passwort weiter – wenn die Anmeldung noch gilt
    const saved = state.sessions.find(s => s.userId === user.Id)
    if (saved && (await checkSession(server.url, saved))) {
      // Profilbild kann sich geändert haben (z. B. „Profilbild wählen“)
      const session = { ...saved, imageTag: user.PrimaryImageTag ?? saved.imageTag }
      setState(s => ({ ...withSession(s, session), lastUserId: saved.userId }))
      setView({ name: 'home', session })
      return
    }
    if (saved) setState(s => withoutSession(s, saved.userId))
    setView({ name: 'login', username: user.Name })
  }

  function signedIn(session: Session) {
    setState(s => withSession(s, session))
    setView({ name: 'home', session })
  }

  /** Profil abmelden: Token beim Server widerrufen, dann lokal vergessen. */
  function signOut(userId: string) {
    const session = state.sessions.find(s => s.userId === userId)
    if (session && server) void logout(server.url, session.token)
    setState(s => withoutSession(s, userId))
  }

  function connected(next: ServerInfo) {
    // Anderer Server: alte Anmeldungen gelten dort nicht – beim alten Server widerrufen
    if (state.server && state.server.id !== next.id) {
      const old = state.server
      state.sessions.forEach(s => void logout(old.url, s.token))
    }
    setState(s => (s.server?.id === next.id ? { ...s, server: next } : { server: next, sessions: [] }))
    setView({ name: 'profiles' })
  }

  if (!server || view.name === 'server') return <ServerScreen initial={server?.url} onConnected={connected} />

  switch (view.name) {
    case 'profiles':
      return (
        <ProfileScreen
          server={server}
          saved={state.sessions.map(s => ({ Id: s.userId, Name: s.name, PrimaryImageTag: s.imageTag }))}
          onPick={pickProfile}
          onOther={() => setView({ name: 'login' })}
          onChangeServer={() => setView({ name: 'server' })}
          onEmpty={() => setView({ name: 'login', direct: true })}
          signedIn={state.sessions.map(s => s.userId)}
          onSignOut={user => signOut(user.Id)}
          tokenFor={user => state.sessions.find(s => s.userId === user.Id)?.token}
        />
      )
    case 'login':
      return <LoginScreen server={server} username={view.username} onSignedIn={signedIn} onBack={() => setView(view.direct ? { name: 'server' } : { name: 'profiles' })} />
    case 'home':
      return (
        <Shell
          server={server}
          session={view.session}
          onSwitchProfile={() => setView({ name: 'profiles' })}
          onChangeServer={() => setView({ name: 'server' })}
          onSignOut={() => {
            signOut(view.session.userId)
            setView({ name: 'profiles' })
          }}
        />
      )
  }
}
