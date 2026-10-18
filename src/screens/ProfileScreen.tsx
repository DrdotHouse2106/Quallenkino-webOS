import { useEffect, useState } from 'preact/hooks'
import type { ServerInfo } from '../api/server'
import { publicUsers, userImageUrl, type UserSummary } from '../api/users'
import { t } from '../i18n'
import { Button } from '../ui/Focusable'
import { Group, Screen } from '../ui/Screen'

/** Farben der Profil-Kacheln ohne eigenes Bild (wie in der Android-App). */
const TILE_COLORS = ['#7F76D6', '#2E96E0', '#E0662E', '#2EB67D', '#D6476B', '#C9A227']

export function tileColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return TILE_COLORS[hash % TILE_COLORS.length]
}

interface Props {
  server: ServerInfo
  onPick: (user: UserSummary) => void
  onOther: () => void
  onChangeServer: () => void
}

/** „Wer schaut gerade?“ – große Profil-Kacheln, OK wählt aus. */
export function ProfileScreen({ server, onPick, onOther, onChangeServer }: Props) {
  const [users, setUsers] = useState<UserSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    publicUsers(server.url).then(setUsers).catch(() => {
      setUsers([])
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
          <Button key={user.Id} focusKey={`profile-${user.Id}`} onPress={() => onPick(user)} class="qk-profile" autoFocus={index === 0}>
            <div class="qk-avatar" style={{ background: tileColor(user.Name) }}>
              {user.PrimaryImageTag
                ? <img src={userImageUrl(server.url, user.Id, user.PrimaryImageTag)} alt="" />
                : <span>{user.Name.charAt(0).toUpperCase()}</span>}
            </div>
            <div class="qk-profile-name">{user.Name}</div>
          </Button>
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
