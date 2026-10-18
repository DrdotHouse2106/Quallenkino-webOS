import { useEffect, useState } from 'preact/hooks'
import type { ServerInfo } from '../api/server'
import { publicUsers, userImageUrl, type UserSummary } from '../api/users'
import { t } from '../i18n'
import { Button } from '../ui/Focusable'
import { Group, Screen } from '../ui/Screen'
import { focusSoon } from '../nav/focus'

/** Farben der Profil-Kacheln ohne eigenes Bild (wie in der Android-App). */
const TILE_COLORS = ['#7F76D6', '#2E96E0', '#E0662E', '#2EB67D', '#D6476B', '#C9A227']

export function tileColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return TILE_COLORS[hash % TILE_COLORS.length]
}

interface Props {
  server: ServerInfo
  /** Auf diesem Fernseher angemeldete Profile – auch versteckte, die der Server nicht öffentlich zeigt. */
  saved?: UserSummary[]
  onPick: (user: UserSummary) => void
  onOther: () => void
  onChangeServer: () => void
  /** Keine Profile sichtbar (versteckte Benutzer): direkt zur Anmeldung. */
  onEmpty?: () => void
  /** Profile, die auf diesem Fernseher angemeldet sind (zeigen „Abmelden“). */
  signedIn?: string[]
  onSignOut?: (user: UserSummary) => void
}

/** Öffentliche Profile plus gemerkte, die nicht öffentlich sind. */
export function mergeProfiles(publicList: UserSummary[], saved: UserSummary[]): UserSummary[] {
  return [...publicList, ...saved.filter(user => !publicList.some(p => p.Id === user.Id))]
}

/** „Wer schaut gerade?“ – große Profil-Kacheln, OK wählt aus. */
export function ProfileScreen({ server, saved = [], onPick, onOther, onChangeServer, onEmpty, signedIn = [], onSignOut }: Props) {
  const [users, setUsers] = useState<UserSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    publicUsers(server.url)
      .then(list => {
        const all = mergeProfiles(list, saved)
        if (all.length === 0 && onEmpty) onEmpty()
        else setUsers(all)
      })
      .catch(() => {
        setUsers(saved)
        setFailed(true)
      })
  }, [server.url])

  return (
    <Screen focusKey="profiles" class="qk-center">
      <h1 class="qk-title-large">{t.whoIsWatching}</h1>
      {users === null && <p class="qk-muted">{t.loadingProfiles}</p>}
      {failed && <p class="qk-error">{t.profilesFailed}</p>}
      <Group focusKey="profiles-row" class="qk-profiles">
        {(users ?? []).map((user, index) => (
          <div key={user.Id} class="qk-profile-col">
            <Button focusKey={`profile-${user.Id}`} onPress={() => onPick(user)} class="qk-profile" autoFocus={index === 0}>
              <div class="qk-avatar" style={{ background: tileColor(user.Name) }}>
                {user.PrimaryImageTag
                  ? <img src={userImageUrl(server.url, user.Id, user.PrimaryImageTag)} alt="" />
                  : <span>{user.Name.charAt(0).toUpperCase()}</span>}
              </div>
              <div class="qk-profile-name">{user.Name}</div>
            </Button>
            {/* Auf diesem Fernseher angemeldet: hier abmelden („Runter“ von der Kachel) */}
            {signedIn.includes(user.Id) && onSignOut && (
              <Button focusKey={`profile-signout-${user.Id}`} onPress={() => {
                onSignOut(user)
                focusSoon(`profile-${user.Id}`)
              }} class="qk-link qk-profile-signout">{t.signOut}</Button>
            )}
          </div>
        ))}
        <Button focusKey="profile-other" onPress={onOther} class="qk-profile" autoFocus={users !== null && users.length === 0}>
          <div class="qk-avatar qk-avatar-add"><span>+</span></div>
          <div class="qk-profile-name">{t.otherProfile}</div>
        </Button>
      </Group>
      <Button focusKey="profiles-server" onPress={onChangeServer} class="qk-link">{t.changeServer} · {server.name}</Button>
    </Screen>
  )
}
