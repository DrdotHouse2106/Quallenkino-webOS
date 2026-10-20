import { useEffect, useState } from 'preact/hooks'
import { avatarCatalog, applyAvatar, type AvatarCatalog, type AvatarIcon } from '../api/avatars'
import { t } from '../i18n'
import { Button } from './Focusable'
import { Group, Screen } from './Screen'
import { toast } from './Toast'

interface Props {
  url: string
  token: string
  name: string
  /** Fertig: neues Bild-Tag nach dem Speichern, sonst undefined. */
  onClose: (imageTag?: string) => void
}

/** Rundes Profilbild: Kreis in der Farbe, darauf die Figur (80 % bei „contain“, randfüllend bei „cover“). */
export function AvatarPreview({ icon, color, size }: { icon?: AvatarIcon; color: string; size: number }) {
  return (
    <div class="qk-avatar-preview" style={{ width: `${size}px`, height: `${size}px`, background: color }}>
      {icon && <img src={icon.ImageUrl} alt="" class={icon.Fit === 'cover' ? 'cover' : ''} />}
    </div>
  )
}

/** Profilbild wählen: Figur und Hintergrundfarbe aus dem Katalog des Servers. */
export function AvatarPicker({ url, token, name, onClose }: Props) {
  const [catalog, setCatalog] = useState<AvatarCatalog | null>(null)
  const [failed, setFailed] = useState(false)
  const [icon, setIcon] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    avatarCatalog(url, token)
      .then(loaded => {
        setCatalog(loaded)
        setIcon(loaded.Current?.Icon ?? loaded.Categories[0]?.Icons[0]?.Id ?? null)
        setColor(loaded.Current?.Color ?? loaded.Colors[0] ?? null)
      })
      .catch(() => setFailed(true))
  }, [url, token])

  const all = catalog?.Categories.flatMap(c => c.Icons) ?? []
  const selected = all.find(i => i.Id === icon)

  async function save() {
    if (saving || !icon || !color) return
    setSaving(true)
    try {
      const tag = await applyAvatar(url, token, icon, color)
      toast(t.avatarSaved)
      onClose(tag ?? '')
    } catch {
      toast(t.avatarFailed)
      setSaving(false)
    }
  }

  return (
    <Screen focusKey="avatar-picker" class="qk-avatar-picker" onBack={() => {
      onClose()
      return true
    }}>
      <div class="qk-avatar-head">
        <AvatarPreview icon={selected} color={color ?? '#2e96e0'} size={160} />
        <div>
          <h1>{t.avatarTitle(name)}</h1>
          <Group focusKey="avatar-actions" class="qk-settings-row">
            <Button focusKey="avatar-save" onPress={save} autoFocus>{t.save}</Button>
            <Button focusKey="avatar-cancel" onPress={() => onClose()}>{t.cancel}</Button>
          </Group>
        </div>
      </div>
      {failed && <p class="qk-error">{t.avatarFailed}</p>}
      {catalog && (
        <>
          <h2>{t.avatarColor}</h2>
          <Group focusKey="avatar-colors" class="qk-avatar-row">
            {catalog.Colors.map(value => (
              <Button key={value} focusKey={`avatar-color-${value}`} onPress={() => setColor(value)} class={`qk-avatar-color ${value === color ? 'selected' : ''}`}>
                <span style={{ background: value }} />
              </Button>
            ))}
          </Group>
          {catalog.Categories.map(category => (
            <>
              <h2>{category.Name}</h2>
              <Group focusKey={`avatar-cat-${category.Id}`} class="qk-avatar-row">
                {category.Icons.map(item => (
                  <Button key={item.Id} focusKey={`avatar-icon-${item.Id}`} onPress={() => setIcon(item.Id)} class={`qk-avatar-choice ${item.Id === icon ? 'selected' : ''}`}>
                    <AvatarPreview icon={item} color={color ?? '#2e96e0'} size={104} />
                    <div class="qk-profile-name">{item.Name}</div>
                  </Button>
                ))}
              </Group>
            </>
          ))}
          {catalog.License && <p class="qk-muted">{catalog.License}</p>}
        </>
      )}
    </Screen>
  )
}
