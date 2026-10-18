import { useEffect, useState } from 'preact/hooks'
import type { ServerInfo } from './api/server'
import { checkSession, type Session, type UserSummary } from './api/users'
import { HomeScreen } from './home/HomeScreen'
import { LoginScreen } from './screens/LoginScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ServerScreen } from './screens/ServerScreen'
import { loadState, saveState, withSession, withoutSession, type SavedState } from './store'

type View =
  | { name: 'server' }
  | { name: 'profiles' }
  | { name: 'login'; username?: string }
  | { name: 'home'; session: Session }

/** Ablauf: Server → „Wer schaut gerade?“ → (Anmeldung, falls nötig) → Startseite. */
export function App() {
  const [state, setState] = useState<SavedState>(() => loadState())
  const [view, setView] = useState<View>(() => (state.server ? { name: 'profiles' } : { name: 'server' }))

  useEffect(() => saveState(state), [state])

  const server = state.server

  async function pickProfile(user: UserSummary) {
    if (!server) return
    // Schon angemeldet? Dann ohne Passwort weiter – wenn die Anmeldung noch gilt
    const saved = state.sessions.find(s => s.userId === user.Id)
    if (saved && (await checkSession(server.url, saved))) {
      setState(s => ({ ...s, lastUserId: saved.userId }))
      setView({ name: 'home', session: saved })
      return
    }
    if (saved) setState(s => withoutSession(s, saved.userId))
    setView({ name: 'login', username: user.Name })
  }

  function signedIn(session: Session) {
    setState(s => withSession(s, session))
    setView({ name: 'home', session })
  }

  function connected(next: ServerInfo) {
    // Anderer Server: alte Anmeldungen gelten dort nicht
    setState(s => (s.server?.id === next.id ? { ...s, server: next } : { server: next, sessions: [] }))
    setView({ name: 'profiles' })
  }

  if (!server || view.name === 'server') return <ServerScreen initial={server?.url} onConnected={connected} />

  switch (view.name) {
    case 'profiles':
      return (
        <ProfileScreen
          server={server}
          onPick={pickProfile}
          onOther={() => setView({ name: 'login' })}
          onChangeServer={() => setView({ name: 'server' })}
        />
      )
    case 'login':
      return <LoginScreen server={server} username={view.username} onSignedIn={signedIn} onBack={() => setView({ name: 'profiles' })} />
    case 'home':
      return (
        <HomeScreen
          server={server}
          session={view.session}
          onSwitchProfile={() => setView({ name: 'profiles' })}
          onSignOut={() => {
            setState(s => withoutSession(s, view.session.userId))
            setView({ name: 'profiles' })
          }}
        />
      )
  }
}
