import { useState } from 'preact/hooks'
import { findServer, type ServerInfo } from '../api/server'
import { t } from '../i18n'
import { Button, TextInput } from '../ui/Focusable'
import { Logo } from '../ui/Logo'
import { Screen } from '../ui/Screen'

/** Erster Start: Adresse des Servers eingeben (https/http und Port werden selbst ausprobiert). */
export function ServerScreen({ initial, onConnected }: { initial?: string; onConnected: (server: ServerInfo) => void }) {
  const [address, setAddress] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect() {
    if (!address.trim() || busy) return
    setBusy(true)
    setError(null)
    const server = await findServer(address)
    setBusy(false)
    if (server) onConnected(server)
    else setError(t.serverNotFound)
  }

  return (
    <Screen focusKey="server" class="qk-center">
      <Logo size={140} />
      <h1>{t.serverTitle}</h1>
      <p class="qk-muted">{t.serverHint}</p>
      <div class="qk-form">
        <TextInput focusKey="server-address" value={address} placeholder={t.serverPlaceholder} type="url" onInput={setAddress} onSubmit={connect} autoFocus />
        <Button focusKey="server-connect" onPress={connect}>{busy ? t.connecting : t.connect}</Button>
      </div>
      {error && <p class="qk-error">{error}</p>}
    </Screen>
  )
}
