import { useEffect, useState } from 'preact/hooks'
import type { ServerInfo } from './api/server'
import { checkSession, type Session, type UserSummary } from './api/users'
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
          saved={state.sessions.map(s => ({ Id: s.userId, Name: s.name, PrimaryImageTag: s.imageTag }))}
          onPick={pickProfile}
          onOther={() => setView({ name: 'login' })}
          onChangeServer={() => setView({ name: 'server' })}
          onEmpty={() => setView({ name: 'login', direct: true })}
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
            setState(s => withoutSession(s, view.session.userId))
            setView({ name: 'profiles' })
          }}
        />
      )
  }
}
