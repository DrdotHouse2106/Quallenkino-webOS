import { useEffect, useRef, useState } from 'preact/hooks'
import type { ServerInfo } from '../api/server'
import {
  quickConnectCheck,
  quickConnectEnabled,
  quickConnectFinish,
  quickConnectStart,
  signIn,
  type Session,
} from '../api/users'
import { t } from '../i18n'
import { Button, TextInput } from '../ui/Focusable'
import { Screen } from '../ui/Screen'

const QUICK_CONNECT_POLL_MS = 3_000

interface Props {
  server: ServerInfo
  /** Vorausgewähltes Profil (aus „Wer schaut gerade?“); sonst Benutzername eingeben. */
  username?: string
  onSignedIn: (session: Session) => void
  onBack: () => void
}

/** Anmeldung mit Passwort oder Quick Connect (Code auf dem Handy bestätigen). */
export function LoginScreen({ server, username: preset, onSignedIn, onBack }: Props) {
  const [username, setUsername] = useState(preset ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickCode, setQuickCode] = useState<string | null>(null)
  const [quickAvailable, setQuickAvailable] = useState(false)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = null
  }
  useEffect(() => stopPolling, [])

  useEffect(() => {
    quickConnectEnabled(server.url).then(setQuickAvailable)
  }, [server.url])

  async function submit() {
    if (!username.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await signIn(server.url, username.trim(), password))
    } catch {
      setError(t.signInFailed)
    } finally {
      setBusy(false)
    }
  }

  async function startQuickConnect() {
    setError(null)
    try {
      const state = await quickConnectStart(server.url)
      setQuickCode(state.Code)
      // Warten, bis der Code auf dem Handy bestätigt wurde
      const secret = state.Secret
      stopPolling()
      pollTimer.current = setInterval(async () => {
        try {
          const current = await quickConnectCheck(server.url, secret)
          if (current.Authenticated) {
            stopPolling()
            onSignedIn(await quickConnectFinish(server.url, secret))
          }
        } catch {
          stopPolling()
          setQuickCode(null)
          setError(t.quickConnectUnavailable)
        }
      }, QUICK_CONNECT_POLL_MS)
    } catch {
      setError(t.quickConnectUnavailable)
    }
  }

  return (
    <Screen focusKey="login" class="qk-center" onBack={() => { stopPolling(); onBack(); return true }}>
      <h1>{preset ? t.signInAs(preset) : t.signInTitle}</h1>
      <p class="qk-muted">{server.name}</p>
      {quickCode ? (
        <div class="qk-form">
          <p>{t.quickConnectHint}</p>
          <div class="qk-code">{quickCode}</div>
          <p class="qk-muted">{t.quickConnectWaiting}</p>
          <Button focusKey="login-back" onPress={() => { stopPolling(); setQuickCode(null) }} autoFocus>{t.back}</Button>
        </div>
      ) : (
        <div class="qk-form">
          {!preset && <TextInput focusKey="login-user" value={username} placeholder={t.username} onInput={setUsername} autoFocus />}
          <TextInput focusKey="login-password" value={password} placeholder={t.password} type="password" onInput={setPassword} onSubmit={submit} autoFocus={!!preset} />
          <Button focusKey="login-submit" onPress={submit}>{busy ? t.signingIn : t.signIn}</Button>
          {quickAvailable && <Button focusKey="login-quick" onPress={startQuickConnect}>{t.quickConnect}</Button>}
        </div>
      )}
      {error && <p class="qk-error">{error}</p>}
    </Screen>
  )
}
