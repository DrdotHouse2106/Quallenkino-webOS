import { FocusContext, getCurrentFocusKey, setFocus, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useRef, useState } from 'preact/hooks'
import { backdropUrl } from '../api/images'
import { item as loadItem, localTrailerUrl, reasonKey, type Api, type Item } from '../api/items'
import { clientLog } from '../api/behavior'
import { userImageUrl, type Session } from '../api/users'
import { t } from '../i18n'
import { onBack } from '../nav/keys'
import { useRouter } from '../nav/router'
import { focusSoon } from '../nav/focus'
import { openItem } from '../nav/open'
import { Logo } from '../ui/Logo'
import { Icon, type IconName } from '../ui/Icon'
import { toast } from '../ui/Toast'
import { billboardAvailable, billboardLater } from '../api/billboard'
import { HeroBackdrop, HeroInfo } from './Hero'
import { Rail } from './Rail'
import { Row } from './Rows'
import { useHomeData } from './useHomeData'
import { worldBackdrop, worldLogo, type World } from '../api/worlds'
import { available as seerrAvailable } from '../api/jellyseerr'
import { startPlayback } from '../player/start'
import { useAuthorizedImage } from '../ui/authImage'
import { autoCheck, HOMEBREW_APP, postpone, shouldAsk } from '../api/update'
import { launchApp } from '../platform/youtube'
import { exitApp, isTizen } from '../platform/platform'
import { loadSettings } from '../settings'

/** Ruhezeit, bevor der Infobereich zur ausgewählten Karte wechselt. */
const HERO_DEBOUNCE_MS = 300

/** Wechsel der Banner-Vorschläge und Wartezeit bis zur Trailer-Vorschau (wie Android). */
const ROTATION_MS = 9_000
const TRAILER_DELAY_MS = 3_000
/** Titel, zu denen „kein Trailer“ schon gemeldet ist (einmal je Sitzung). */
const reportedMissing = new Set<string>()
/** Beim Wechsel zwischen den Knöpfen ist der Fokus kurz „weg“ – so lange nichts neu starten. */
const FOCUS_DEBOUNCE_MS = 500

interface Props {
  api: Api
  session: Session
  /** Eine Seite liegt darüber: keine Trailer, kein Wechsel, kein eigenes „Zurück“. */
  covered: boolean
  onSwitchProfile: () => void
  onSignOut: () => void
}

export function HomeScreen({ api, session, covered, onSwitchProfile, onSignOut }: Props) {
  const router = useRouter()
  const { billboard, billboardDone, billboardReasons, dropFromBillboard, rows, reasons } = useHomeData(api)
  const [laterAvailable, setLaterAvailable] = useState(false)
  useEffect(() => {
    billboardAvailable(api).then(setLaterAvailable)
  }, [api])

  const [index, setIndex] = useState(0)
  const [rowItem, setRowItem] = useState<Item | null>(null)
  const [rowTitle, setRowTitle] = useState<string | null>(null)
  const [billboardFocused, setBillboardFocused] = useState(false)
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null)
  const [trailerPlaying, setTrailerPlaying] = useState(false)
  /** Jellyseerr erreichbar? Nur dann gibt es „Entdecken“ (wie Android). */
  const [seerr, setSeerr] = useState(false)
  useEffect(() => {
    seerrAvailable(api).then(setSeerr)
  }, [api])
  // Neue Version: beim Öffnen fragen und Download-Knopf in der Navigation zeigen
  const [update, setUpdate] = useState<string | null>(null)
  useEffect(() => {
    if (!loadSettings().updateCheck) return
    const timer = setTimeout(() => autoCheck().then(version => {
      if (!version) return
      setUpdate(version)
      if (shouldAsk(version) && !dialog) openDialog('update')
    }), 4_000)
    return () => clearTimeout(timer)
  }, [])
  async function installUpdate() {
    setDialog(null)
    // Samsung: kein Store und kein Homebrew – die neue Version wird vom PC aus installiert (Anleitung in den Einstellungen)
    if (isTizen) {
      router.push({ name: 'settings' })
      return
    }
    if (!(await launchApp(HOMEBREW_APP))) {
      toast(t.updateNoHomebrew)
      router.push({ name: 'settings' })
    }
  }
  const [overviews, setOverviews] = useState<Record<string, string>>({})

  const billboardItem = billboard.length ? billboard[index % billboard.length] : null
  // Infobereich: im Banner der Vorschlag, in den Reihen die ausgewählte Karte
  const shown = billboardFocused || !rowItem ? billboardItem : rowItem
  // Hintergrund und Logo erst nach kurzer Ruhe wechseln – beim schnellen Durchblättern keine Bilderflut
  const [heroItem, setHeroItem] = useState<Item | null>(shown)
  useEffect(() => {
    if (!heroItem) return setHeroItem(shown)
    const timer = setTimeout(() => setHeroItem(shown), HERO_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [shown?.Id])
  // Nächstes Bannerbild schon vorladen
  useEffect(() => {
    if (billboard.length < 2) return
    const next = billboard[(index + 1) % billboard.length]
    const url = next && backdropUrl(api, next)
    if (url) new Image().src = url
  }, [index, billboard.length])

  // Fokus kurz entprellt, damit ein Knopfwechsel Trailer und Wechsel nicht neu startet
  const [stableFocus, setStableFocus] = useState(true)
  useEffect(() => {
    if (billboardFocused) {
      setStableFocus(true)
      return
    }
    const timer = setTimeout(() => setStableFocus(false), FOCUS_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [billboardFocused])

  // Start: Fokus auf „Abspielen“, sobald das Banner da ist (sonst auf die erste Reihe)
  const startFocused = useRef(false)
  useEffect(() => {
    if (startFocused.current) return
    // Erst nach dem Zeichnen, damit die Knöpfe bei der Navigation angemeldet sind
    if (billboard.length) {
      startFocused.current = true
      requestAnimationFrame(() => setFocus('bb-play'))
    } else if (billboardDone && rows.length) {
      startFocused.current = true
      requestAnimationFrame(() => setFocus(`row-${rows[0].key}`))
    }
  }, [billboard.length, billboardDone, rows.length])

  // Trailer-Vorschau: nur solange das Banner ausgewählt ist, nach kurzer Zeit auf demselben Titel
  // – oder solange eine Welt ausgewählt ist (Trailer eines Titels der Welt)
  const world = !billboardFocused ? rowItem?.World ?? null : null
  // – oder (abschaltbar) solange eine Film-/Serienkarte in einer Reihe ausgewählt ist
  const rowSource = !billboardFocused && rowItem && !rowItem.World && !rowItem.Upcoming && !rowItem.Discover && (rowItem.Type === 'Movie' || rowItem.Type === 'Series') && loadSettings().rowTrailers ? rowItem : null
  const trailerSource: Item | null = stableFocus ? billboardItem : world?.TrailerItemId ? { Id: world.TrailerItemId, LocalTrailerCount: 1 } : rowSource
  useEffect(() => {
    setTrailerUrl(null)
    if (!trailerSource || covered || !loadSettings().trailers) return
    let active = true
    const timer = setTimeout(async () => {
      const url = await localTrailerUrl(api, trailerSource)
      if (active) setTrailerUrl(url)
      // Ohne Trailer bleibt das Bild – einmal je Titel ins Client-Log
      if (active && !url && trailerSource === rowSource && !reportedMissing.has(trailerSource.Id)) {
        reportedMissing.add(trailerSource.Id)
        void clientLog(api, `Trailer-Vorschau: kein Trailer – Reihe „${rowTitle ?? '?'}“, „${trailerSource.Name ?? ''}“ (${trailerSource.Id}): ${trailerSource.LocalTrailerCount === 0 ? 'kein lokaler Trailer' : 'kein Trailer ab 15 s oder nicht abrufbar'}`)
      }
    }, TRAILER_DELAY_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [trailerSource?.Id, covered])

  // Vorschläge wechseln – während ein Trailer läuft, erst nach dessen Ende
  useEffect(() => {
    if (!stableFocus || trailerPlaying || billboard.length < 2 || covered) return
    const timer = setTimeout(() => setIndex(i => (i + 1) % billboard.length), ROTATION_MS)
    return () => clearTimeout(timer)
  }, [stableFocus, trailerPlaying, index, billboard.length, covered])

  // Fehlende Beschreibung (manche Reihen liefern keine) beim Fokus nachladen
  useEffect(() => {
    if (!shown || shown.World || shown.Upcoming || shown.Discover || shown.Overview || overviews[shown.Id] !== undefined) return
    let active = true
    const timer = setTimeout(() => {
      loadItem(api, shown.Id)
        // Staffeln/Folgen ohne Text (z. B. Folgestaffeln aus AniDB): Beschreibung der Serie
        .then(async full => full.Overview || !full.SeriesId ? full.Overview : (await loadItem(api, full.SeriesId).catch(() => null))?.Overview)
        .then(text => active && setOverviews(o => ({ ...o, [shown.Id]: text ?? '' })))
        .catch(() => {})
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [shown?.Id])

  // „Zurück“ auf der Startseite: fragen, ob die App beendet werden soll (Vorgabe für LG-Apps)
  // Profil in der Navigation: „Profil wechseln“ oder „Abmelden“
  const [dialog, setDialog] = useState<'exit' | 'profile' | 'update' | null>(null)
  const focusBeforeDialog = useRef<string | null>(null)
  function openDialog(which: 'exit' | 'profile' | 'update') {
    focusBeforeDialog.current = getCurrentFocusKey()
    setDialog(which)
  }
  function closeDialog() {
    setDialog(null)
    if (focusBeforeDialog.current) focusSoon(focusBeforeDialog.current)
  }
  useEffect(() => onBack(() => {
    if (covered) return false
    if (dialog) closeDialog()
    else openDialog('exit')
    return true
  }), [covered, dialog])

  function step(delta: number): boolean {
    if (billboard.length < 2) return false
    setTrailerPlaying(false)
    setIndex(i => (i + delta + billboard.length) % billboard.length)
    return true
  }

  function playTrailerNow() {
    if (!billboardItem?.LocalTrailerCount) {
      toast(t.noTrailer)
      return
    }
    localTrailerUrl(api, billboardItem).then(url => (url ? setTrailerUrl(url) : toast(t.noTrailer)))
  }

  /** „Später“: Titel für drei Wochen aus dem Banner nehmen (keine Ablehnung). */
  function laterNow() {
    const current = billboardItem
    if (!current) return
    billboardLater(api, current.Id)
      .then(() => {
        toast(t.billboardLaterDone)
        setTrailerPlaying(false)
        dropFromBillboard(current.Id)
      })
      .catch(() => toast(t.actionFailed))
  }

  // Badge der Banner-Auswahl („Weiterschauen“, „Neue Folgen“) geht vor
  const reason = heroItem ? billboardReasons[reasonKey(heroItem.Id)] ?? reasons[reasonKey(heroItem.Id)] : undefined
  const avatar = session.imageTag ? userImageUrl(api.url, session.userId, session.imageTag, 96) : null

  return (
    <div class="qk-home">
      <HeroBackdrop
        api={api}
        item={heroItem}
        image={world ? worldBackdrop(api, world, 1280) : undefined}
        trailerUrl={!covered && (billboardFocused || stableFocus || world) ? trailerUrl : null}
        onTrailerEnd={() => setTrailerUrl(null)}
        onTrailerPlaying={setTrailerPlaying}
      />
      <Rail
        preferred={t.railHome}
        onRight={() => router.resume() || setFocus(billboard.length ? 'bb-play' : rows[0] ? `row-${rows[0].key}` : 'bb-play')}
        items={[
          { id: 'profile', label: t.railProfile, icon: avatar ? <img src={avatar} alt="" /> : <Icon name="person" />, onPress: () => openDialog('profile') },
          { id: 'search', label: t.railSearch, icon: <Icon name="search" />, onPress: () => router.push({ name: 'search' }) },
          { id: 'home', label: t.railHome, icon: <Icon name="home" />, active: true, onPress: () => {
            router.forget()
            setFocus('bb-play')
          } },
          { id: 'livetv', label: t.railLiveTv, icon: <Icon name="liveTv" />, onPress: () => router.push({ name: 'guide' }) },
          ...(seerr ? [{ id: 'discover', label: t.railDiscover, icon: <Icon name="add" />, onPress: () => router.push({ name: 'discover' }) }] : []),
          { id: 'settings', label: t.railSettings, icon: <Icon name="settings" />, onPress: () => router.push({ name: 'settings' }) },
          ...(update ? [{ id: 'update', label: t.updateRail(update), icon: <Icon name="download" />, highlight: true, onPress: installUpdate }] : []),
        ]}
      />
      <div class="qk-home-main">
        <div class="qk-home-top">
          {world ? <WorldInfo api={api} world={world} /> : heroItem ? <HeroInfo api={api} item={heroItem} reason={reason} overview={overviews[heroItem.Id]} /> : <div class="qk-hero-info"><Logo size={96} /><p class="qk-muted">{t.loadingHome}</p></div>}
          <BillboardButtons
            visible={billboardFocused}
            hasTrailer={!!billboardItem?.LocalTrailerCount}
            canStepBack={index % Math.max(billboard.length, 1) > 0}
            onFocusChange={setBillboardFocused}
            onStep={step}
            onPlay={() => billboardItem && startPlayback(api, router, billboardItem)}
            onInfo={() => billboardItem && router.push({ name: 'details', id: billboardItem.Id })}
            onTrailer={playTrailerNow}
            onLater={laterAvailable ? laterNow : undefined}
            count={billboard.length}
            current={index % Math.max(billboard.length, 1)}
          />
        </div>
        <div class="qk-rows">
          {rows.map(row => (
            <Row key={row.key} api={api} row={row} onFocusItem={focused => { setRowItem(focused); setRowTitle(row.title) }} onOpen={opened => openItem(router, opened)} />
          ))}
        </div>
      </div>
      <Clock />
      {dialog === 'exit' && (
        <ChoiceDialog
          title={t.exitTitle}
          initial="cancel"
          choices={[
            { key: 'exit', label: t.exitApp, onPress: exitApp },
            { key: 'profile', label: t.switchProfile, onPress: () => { setDialog(null); onSwitchProfile() } },
            { key: 'cancel', label: t.cancel, onPress: closeDialog },
          ]}
        />
      )}
      {dialog === 'update' && update && (
        <ChoiceDialog
          title={t.updateAvailable(update)}
          initial="install"
          choices={[
            { key: 'install', label: isTizen ? t.updateShowHowTo : t.updateOpenHomebrew, onPress: installUpdate },
            { key: 'later', label: t.updateLater, onPress: () => { postpone(update); closeDialog() } },
          ]}
        />
      )}
      {dialog === 'profile' && (
        <ChoiceDialog
          title={session.name}
          initial="switch"
          choices={[
            { key: 'switch', label: t.switchProfile, onPress: () => { setDialog(null); onSwitchProfile() } },
            { key: 'signout', label: t.signOut, onPress: () => { setDialog(null); onSignOut() } },
            { key: 'cancel', label: t.cancel, onPress: closeDialog },
          ]}
        />
      )}
    </div>
  )
}

interface ButtonsProps {
  visible: boolean
  hasTrailer: boolean
  canStepBack: boolean
  count: number
  current: number
  onFocusChange: (focused: boolean) => void
  onStep: (delta: number) => boolean
  onPlay: () => void
  onInfo: () => void
  onTrailer: () => void
  /** „Später“ (nur mit Plugin ab 12.41) */
  onLater?: () => void
}

/** Knöpfe des Banners: nur sichtbar, solange der Fokus hier ist; Links/Rechts am Rand blättern. */
function BillboardButtons(props: ButtonsProps) {
  const { ref, focusKey, hasFocusedChild } = useFocusable({ focusKey: 'billboard', trackChildren: true, saveLastFocusedChild: false })
  useEffect(() => props.onFocusChange(hasFocusedChild), [hasFocusedChild])
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class={`qk-billboard-buttons ${props.visible ? '' : 'hidden'}`}>
        <BillboardButton focusKey="bb-play" label={t.play} icon="play" onPress={props.onPlay}
          onArrow={dir => (dir === 'left' && props.canStepBack ? !props.onStep(-1) : true)} />
        <BillboardButton focusKey="bb-info" label={t.moreInfo} icon="info" onPress={props.onInfo} />
        <BillboardButton focusKey="bb-trailer" label={t.trailer} icon="trailer" dimmed={!props.hasTrailer} onPress={props.onTrailer}
          onArrow={dir => (dir === 'right' && !props.onLater ? !props.onStep(1) : true)} />
        {props.onLater && (
          <BillboardButton focusKey="bb-later" label={t.billboardLater} icon="later" onPress={props.onLater}
            onArrow={dir => (dir === 'right' ? !props.onStep(1) : true)} />
        )}
        {props.visible && props.count > 1 && (
          <div class="qk-dots">
            {Array.from({ length: props.count }, (_, i) => <span class={i === props.current ? 'active' : ''} />)}
          </div>
        )}
      </div>
    </FocusContext.Provider>
  )
}

interface BillboardButtonProps {
  focusKey: string
  label: string
  icon: IconName
  dimmed?: boolean
  onPress: () => void
  onArrow?: (direction: string) => boolean
}

function BillboardButton({ focusKey, label, icon, dimmed, onPress, onArrow }: BillboardButtonProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
    onEnterPress: onPress,
    // „Hoch“ aus dem Banner führt nirgendwohin
    onArrowPress: direction => (direction === 'up' ? false : onArrow ? onArrow(direction) : true),
  })
  return (
    <div ref={ref} class={`qk-bb-button ${focused ? 'focused' : ''} ${dimmed ? 'dimmed' : ''}`} onClick={onPress} onMouseEnter={() => focusSelf()}>
      <Icon name={icon} />
      {label}
    </div>
  )
}

/** Infobereich einer Welt: Logo (bzw. Name) und Zahl der Titel. */
function WorldInfo({ api, world }: { api: Api; world: World }) {
  const logo = useAuthorizedImage(api, worldLogo(api, world))
  const [failed, setFailed] = useState(false)
  return (
    <div class="qk-hero-info" key={world.Id}>
      {logo && !failed ? <img class="qk-hero-logo qk-world-logo" src={logo} alt={world.Name} onError={() => setFailed(true)} /> : null}
      <div class={logo && !failed ? 'qk-hero-subtitle' : 'qk-hero-title'}>{world.Name}</div>
      {world.ItemCount ? <div class="qk-hero-facts">{t.worldCount(world.ItemCount)}</div> : null}
    </div>
  )
}

interface Choice {
  key: string
  label: string
  onPress: () => void
}

/** Kleine Auswahl über der Startseite (Beenden, Profil); „Zurück“ schließt sie (bei der Startseite). */
function ChoiceDialog({ title, choices, initial }: { title: string; choices: Choice[]; initial: string }) {
  const { ref, focusKey } = useFocusable({ focusKey: 'choice-dialog', isFocusBoundary: true, trackChildren: true })
  useEffect(() => focusSoon(`choice-${initial}`), [])
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-overlay">
        <Logo size={120} />
        <h1>{title}</h1>
        <div class="qk-actions">
          {choices.map(choice => <DialogButton key={choice.key} focusKey={`choice-${choice.key}`} label={choice.label} onPress={choice.onPress} />)}
        </div>
      </div>
    </FocusContext.Provider>
  )
}

function DialogButton({ focusKey, label, onPress }: { focusKey: string; label: string; onPress: () => void }) {
  const { ref, focused, focusSelf } = useFocusable({ focusKey, onEnterPress: onPress })
  return <div ref={ref} class={`qk-button ${focused ? 'focused' : ''}`} onClick={onPress} onMouseEnter={() => focusSelf()}>{label}</div>
}

/** Uhr oben rechts (24 Stunden). */
function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(timer)
  }, [])
  return <div class="qk-clock">{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
}
