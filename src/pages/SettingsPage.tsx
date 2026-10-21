import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import type { ServerInfo } from '../api/server'
import type { Session } from '../api/users'
import { t } from '../i18n'
import { loadSettings, saveSettings, type Settings } from '../settings'
import { HOMEBREW_REPO, newerVersion } from '../api/update'
import type { Api } from '../api/items'
import { calendar as loadCalendar, calendarQr, remindersAvailable, type Calendar } from '../api/reminders'
import { avatarsAvailable } from '../api/avatars'
import { behaviorMe, deleteBehavior, setBehaviorEnabled, type BehaviorMe } from '../api/behavior'
import { AvatarPicker } from '../ui/AvatarPicker'
import { toast } from '../ui/Toast'
import { APP_VERSION } from '../brand'
import { About } from '../ui/About'
import { Icon, type IconName } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { Page } from './Page'
import { focusSoon } from '../nav/focus'

interface Props {
  api: Api
  server: ServerInfo
  session: Session
  onSwitchProfile: () => void
  onSignOut: () => void
  onChangeServer: () => void
}

/** Auswahl-Reihen: Einstellung, Überschrift und die Möglichkeiten. */
const CHOICES: { key: keyof Settings; title: string; options: { value: Settings[keyof Settings]; label: string }[] }[] = [
  { key: 'subtitles', title: t.settingsSubtitles, options: [{ value: 'smart', label: t.subtitlesSmart }, { value: 'always', label: t.subtitlesAlways }, { value: 'off', label: t.subtitlesOff }] },
  { key: 'audio', title: t.settingsAudio, options: [{ value: 'own', label: t.audioOwn }, { value: 'original', label: t.audioOriginal }] },
  { key: 'trailers', title: t.settingsTrailers, options: [{ value: true, label: t.trailersOn }, { value: false, label: t.trailersOff }] },
  { key: 'screensaver', title: t.settingsScreensaver, options: [{ value: 2, label: t.minutes(2) }, { value: 5, label: t.minutes(5) }, { value: 10, label: t.minutes(10) }, { value: 0, label: t.trailersOff }] },
  { key: 'screensaverTrailers', title: t.settingsScreensaverTrailers, options: [{ value: true, label: t.trailersOn }, { value: false, label: t.trailersOff }] },
  { key: 'screensaverVolume', title: t.settingsScreensaverVolume, options: [{ value: 0, label: t.volumeMute }, { value: 0.3, label: t.volumeQuiet }, { value: 0.75, label: t.volumeNormal }] },
]

/** Einstellungen: Untertitel, Ton und Trailer, Konto (Profil, Abmelden, Server) und „Über“. */
export function SettingsPage({ api, server, session, onSwitchProfile, onSignOut, onChangeServer }: Props) {
  const [settings, setSettings] = useState(loadSettings)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [avatars, setAvatars] = useState(false)
  // Suchen und angesehene Titel für Empfehlungen (Plugin ab 12.36)
  const [behavior, setBehavior] = useState<BehaviorMe | null>(null)
  useEffect(() => {
    behaviorMe(api).then(setBehavior)
  }, [])
  const toggleBehavior = (enabled: boolean) =>
    setBehaviorEnabled(api, enabled).then(() => setBehavior(b => (b ? { ...b, Enabled: enabled } : b))).catch(() => toast(t.actionFailed))
  const clearBehavior = () => deleteBehavior(api).then(() => toast(t.behaviorDeleted)).catch(() => toast(t.actionFailed))
  const [picking, setPicking] = useState(false)
  useEffect(() => {
    avatarsAvailable(api.url, api.token).then(setAvatars)
  }, [])
  // Erinnerungen aufs Handy: Kalender-Abo per QR-Code (nur wenn der Server es anbietet)
  const [calendar, setCalendar] = useState<Calendar | null>(null)
  const [qrTarget, setQrTarget] = useState<'webcal' | 'https'>('webcal')
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => {
    remindersAvailable(api).then(available => {
      if (available) loadCalendar(api).then(setCalendar).catch(() => {})
    })
  }, [])
  useEffect(() => {
    if (!calendar) return
    setQr(null)
    calendarQr(api, calendar.PageUrl ? 'page' : qrTarget).then(setQr).catch(() => setQr(null))
  }, [calendar?.Url, qrTarget])
  const renewCalendar = () => loadCalendar(api, true).then(next => {
    setCalendar(next)
    toast(t.calendarRenewed)
  }).catch(() => toast(t.actionFailed))
  const checkUpdate = () => {
    setUpdateStatus(t.updateChecking)
    newerVersion()
      .then(version => setUpdateStatus(version ? t.updateAvailable(version) : t.updateCurrent(APP_VERSION)))
      .catch(() => setUpdateStatus(t.updateFailed))
  }
  const update = (key: keyof Settings, value: Settings[keyof Settings]) => {
    const next = { ...settings, [key]: value }
    saveSettings(next)
    setSettings(next)
  }
  if (picking) {
    return <AvatarPicker url={api.url} token={api.token} name={session.name} onClose={() => {
      setPicking(false)
      focusSoon('settings-avatar')
    }} />
  }

  return (
    <Page focusKey="settings" class="qk-settings-page" rail={t.railSettings}>
      <div class="qk-page-main">
        <h1>{t.railSettings}</h1>

        {CHOICES.map(({ key, title, options }, row) => (
          <>
            <h2>{title}</h2>
            <SettingsRow focusKey={`settings-${key}`}>
              {options.map(({ value, label }, index) => (
                <SettingsButton key={String(value)} focusKey={`settings-${key}-${value}`} label={label} selected={settings[key] === value} autoFocus={row === 0 && index === 0} onPress={() => update(key, value)} />
              ))}
            </SettingsRow>
            {key === 'subtitles' && settings.subtitles === 'smart' && <p class="qk-muted">{t.subtitlesSmartHint}</p>}
          </>
        ))}

        {behavior && (
          <>
            <h2>{t.behaviorTitle}</h2>
            <SettingsRow focusKey="settings-behavior">
              <SettingsButton focusKey="settings-behavior-on" label={t.trailersOn} selected={behavior.Enabled} onPress={() => toggleBehavior(true)} />
              <SettingsButton focusKey="settings-behavior-off" label={t.trailersOff} selected={!behavior.Enabled} onPress={() => toggleBehavior(false)} />
              <SettingsButton focusKey="settings-behavior-delete" label={t.behaviorDelete} onPress={clearBehavior} />
            </SettingsRow>
            <p class="qk-muted">{t.behaviorHint(behavior.RetentionDays ?? 365, behavior.MaxEntries ?? 1000)}</p>
          </>
        )}

        <h2>{t.settingsAccount}</h2>
        <SettingsRow focusKey="settings-account">
          <SettingsButton focusKey="settings-profile" icon="person" label={`${t.switchProfile} (${session.name})`} onPress={onSwitchProfile} />
          {avatars && <SettingsButton focusKey="settings-avatar" icon="person" label={t.avatarChoose} onPress={() => setPicking(true)} />}
          <SettingsButton focusKey="settings-signout" label={t.signOut} onPress={onSignOut} />
          <SettingsButton focusKey="settings-server" label={`${t.changeServer} (${server.name})`} onPress={onChangeServer} />
        </SettingsRow>

        {calendar && (
          <>
            <h2>{t.calendarTitle}</h2>
            <SettingsRow focusKey="settings-calendar">
              {/* Mit Abo-Seite (LocalRecs ab 12.23) ein QR-Code für alle Handys, sonst Auswahl iPhone/andere */}
              {!calendar.PageUrl && <SettingsButton focusKey="settings-calendar-webcal" label={t.calendarIphone} selected={qrTarget === 'webcal'} onPress={() => setQrTarget('webcal')} />}
              {!calendar.PageUrl && <SettingsButton focusKey="settings-calendar-https" label={t.calendarOther} selected={qrTarget === 'https'} onPress={() => setQrTarget('https')} />}
              <SettingsButton focusKey="settings-calendar-renew" label={t.calendarRenew} onPress={renewCalendar} />
            </SettingsRow>
            <div class="qk-settings-calendar">
              <div class="qk-qr">{qr && <img src={qr} alt="" />}</div>
              <div>
                <p>{t.calendarHint}</p>
                <p class="qk-muted">{calendar.PageUrl ?? (qrTarget === 'webcal' ? calendar.WebcalUrl : calendar.Url)}</p>
              </div>
            </div>
          </>
        )}

        <h2>{t.settingsUpdates}</h2>
        <SettingsRow focusKey="settings-updates">
          <SettingsButton focusKey="settings-update-check" label={t.updateCheck} onPress={checkUpdate} />
        </SettingsRow>
        {updateStatus && <p>{updateStatus}</p>}
        <p class="qk-muted">{t.updateHowTo}</p>
        <p class="qk-muted">{HOMEBREW_REPO}</p>

        <h2>{t.settingsAbout}</h2>
        <div class="qk-settings-about">
          <Logo size={72} />
          <About server={server} />
        </div>
      </div>
    </Page>
  )
}

function SettingsRow({ focusKey, children }: { focusKey: string; children: ComponentChildren }) {
  const { ref, focusKey: key } = useFocusable({ focusKey, trackChildren: true, saveLastFocusedChild: true })
  return (
    <FocusContext.Provider value={key}>
      <div ref={ref} class="qk-settings-row">{children}</div>
    </FocusContext.Provider>
  )
}

function SettingsButton({ focusKey, label, icon, selected, autoFocus, onPress }: { focusKey: string; label: string; icon?: IconName; selected?: boolean; autoFocus?: boolean; onPress: () => void }) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
    onEnterPress: onPress,
    // Lange Seite: die gewählte Zeile ins Bild holen
    onFocus: layout => (layout.node as HTMLElement).scrollIntoView({ block: 'nearest' }),
  })
  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => focusSelf())
  }, [])
  return (
    <div ref={ref} class={`qk-osd-button ${focused ? 'focused' : ''} ${selected ? 'selected' : ''}`} onClick={onPress} onMouseEnter={() => focusSelf()}>
      {selected && <Icon name="check" size={22} />}
      {icon && <Icon name={icon} size={24} />}
      <span>{label}</span>
    </div>
  )
}
