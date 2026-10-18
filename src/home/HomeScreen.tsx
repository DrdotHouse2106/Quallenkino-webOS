import { FocusContext, setFocus, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { item as loadItem, localTrailerUrl, reasonKey, type Api, type Item } from '../api/items'
import type { ServerInfo } from '../api/server'
import { userImageUrl, type Session } from '../api/users'
import { t } from '../i18n'
import { onBack } from '../nav/keys'
import { About } from '../ui/About'
import { Logo } from '../ui/Logo'
import { toast } from '../ui/Toast'
import { HeroBackdrop, HeroInfo } from './Hero'
import { Rail } from './Rail'
import { Row } from './Rows'
import { useHomeData } from './useHomeData'

/** Wechsel der Banner-Vorschläge und Wartezeit bis zur Trailer-Vorschau (wie Android). */
const ROTATION_MS = 9_000
const TRAILER_DELAY_MS = 3_000
/** Beim Wechsel zwischen den Knöpfen ist der Fokus kurz „weg“ – so lange nichts neu starten. */
const FOCUS_DEBOUNCE_MS = 500

interface Props {
  server: ServerInfo
  session: Session
  onSwitchProfile: () => void
  onSignOut: () => void
}

export function HomeScreen({ server, session, onSwitchProfile, onSignOut }: Props) {
  const api: Api = useMemo(() => ({ url: server.url, token: session.token, userId: session.userId }), [server.url, session])
  const { billboard, billboardDone, rows, reasons } = useHomeData(api)

  const [index, setIndex] = useState(0)
  const [rowItem, setRowItem] = useState<Item | null>(null)
  const [billboardFocused, setBillboardFocused] = useState(false)
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null)
  const [trailerPlaying, setTrailerPlaying] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [overviews, setOverviews] = useState<Record<string, string>>({})

  const billboardItem = billboard.length ? billboard[index % billboard.length] : null
  // Infobereich: im Banner der Vorschlag, in den Reihen die ausgewählte Karte
  const shown = billboardFocused || !rowItem ? billboardItem : rowItem

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
  useEffect(() => {
    setTrailerUrl(null)
    if (!stableFocus || !billboardItem) return
    let active = true
    const timer = setTimeout(async () => {
      const url = await localTrailerUrl(api, billboardItem)
      if (active) setTrailerUrl(url)
    }, TRAILER_DELAY_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [stableFocus, billboardItem?.Id])

  // Vorschläge wechseln – während ein Trailer läuft, erst nach dessen Ende
  useEffect(() => {
    if (!stableFocus || trailerPlaying || billboard.length < 2) return
    const timer = setTimeout(() => setIndex(i => (i + 1) % billboard.length), ROTATION_MS)
    return () => clearTimeout(timer)
  }, [stableFocus, trailerPlaying, index, billboard.length])

  // Fehlende Beschreibung (manche Reihen liefern keine) beim Fokus nachladen
  useEffect(() => {
    if (!shown || shown.Overview || overviews[shown.Id] !== undefined) return
    let active = true
    const timer = setTimeout(() => {
      loadItem(api, shown.Id)
        .then(full => active && setOverviews(o => ({ ...o, [shown.Id]: full.Overview ?? '' })))
        .catch(() => {})
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [shown?.Id])

  useEffect(() => onBack(() => {
    if (showAbout) {
      setShowAbout(false)
      return true
    }
    onSwitchProfile()
    return true
  }), [showAbout])

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

  const reason = shown ? reasons[reasonKey(shown.Id)] : undefined
  const avatar = session.imageTag ? userImageUrl(server.url, session.userId, session.imageTag, 96) : null

  return (
    <div class="qk-home">
      <HeroBackdrop
        api={api}
        item={shown}
        trailerUrl={billboardFocused || stableFocus ? trailerUrl : null}
        onTrailerEnd={() => setTrailerUrl(null)}
        onTrailerPlaying={setTrailerPlaying}
      />
      <Rail
        preferred={t.railHome}
        onRight={() => setFocus(billboard.length ? 'bb-play' : rows[0] ? `row-${rows[0].key}` : 'bb-play')}
        items={[
          { id: 'profile', label: t.railProfile, icon: avatar ? <img src={avatar} alt="" /> : session.name.charAt(0).toUpperCase(), onPress: onSwitchProfile },
          { id: 'home', label: t.railHome, icon: '⌂', active: true, onPress: () => setFocus('bb-play') },
          { id: 'about', label: t.railAbout, icon: 'i', onPress: () => setShowAbout(true) },
        ]}
      />
      <div class="qk-home-main">
        <div class="qk-home-top">
          {shown ? <HeroInfo api={api} item={shown} reason={reason} overview={overviews[shown.Id]} /> : <div class="qk-hero-info"><Logo size={96} /><p class="qk-muted">{t.loadingHome}</p></div>}
          <BillboardButtons
            visible={billboardFocused}
            hasTrailer={!!billboardItem?.LocalTrailerCount}
            canStepBack={index % Math.max(billboard.length, 1) > 0}
            onFocusChange={setBillboardFocused}
            onStep={step}
            onPlay={() => toast(t.comingPlayer)}
            onInfo={() => toast(t.comingDetails)}
            onTrailer={playTrailerNow}
            count={billboard.length}
            current={index % Math.max(billboard.length, 1)}
          />
        </div>
        <div class="qk-rows">
          {rows.map(row => (
            <Row key={row.key} api={api} row={row} onFocusItem={setRowItem} onOpen={() => toast(t.comingDetails)} />
          ))}
        </div>
      </div>
      <Clock />
      {showAbout && (
        <div class="qk-overlay">
          <Logo size={120} />
          <About server={server} />
          <div class="qk-actions">
            <OverlayButton label={t.signOut} onPress={onSignOut} />
          </div>
        </div>
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
}

/** Knöpfe des Banners: nur sichtbar, solange der Fokus hier ist; Links/Rechts am Rand blättern. */
function BillboardButtons(props: ButtonsProps) {
  const { ref, focusKey, hasFocusedChild } = useFocusable({ focusKey: 'billboard', trackChildren: true, saveLastFocusedChild: false })
  useEffect(() => props.onFocusChange(hasFocusedChild), [hasFocusedChild])
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class={`qk-billboard-buttons ${props.visible ? '' : 'hidden'}`}>
        <BillboardButton focusKey="bb-play" label={t.play} icon="▶" onPress={props.onPlay}
          onArrow={dir => (dir === 'left' && props.canStepBack ? !props.onStep(-1) : true)} />
        <BillboardButton focusKey="bb-info" label={t.moreInfo} icon="i" onPress={props.onInfo} />
        <BillboardButton focusKey="bb-trailer" label={t.trailer} icon="◉" dimmed={!props.hasTrailer} onPress={props.onTrailer}
          onArrow={dir => (dir === 'right' ? !props.onStep(1) : true)} />
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
  icon: string
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
      <span class="qk-bb-icon">{icon}</span>
      {label}
    </div>
  )
}

function OverlayButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { ref, focused, focusSelf } = useFocusable({ focusKey: 'overlay-button', onEnterPress: onPress })
  useEffect(() => focusSelf(), [])
  return <div ref={ref} class={`qk-button ${focused ? 'focused' : ''}`} onClick={onPress}>{label}</div>
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
