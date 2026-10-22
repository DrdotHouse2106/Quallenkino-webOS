import { FocusContext, setFocus, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'preact/hooks'
import { localTrailerUrl, type Api, type Item } from '../api/items'
import {
  backdropImage,
  badge,
  details as loadDetails,
  jellyfinItem,
  personCard,
  recommendationsFor,
  requestMedia,
  RequestError,
  resultCard,
  type Details,
  type MediaType,
} from '../api/jellyseerr'
import { cleanOverview } from '../home/format'
import { HeroBackdrop } from '../home/Hero'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { openItem } from '../nav/open'
import { useRouter } from '../nav/router'
import { ActionButton, ActionRow } from '../pages/ActionButton'
import { Page } from '../pages/Page'
import { Icon } from '../ui/Icon'
import { toast } from '../ui/Toast'
import { YouTubeInline } from '../ui/YouTubeInline'
// Samsung: keine eingebettete YouTube-Vorschau (ruckelt dort), Trailer über die YouTube-App
import { isTizen } from '../platform/platform'
import { loadSettings } from '../settings'
import { focusSoon } from '../nav/focus'

/**
 * Titel aus Jellyseerr: Eckdaten, Regie bzw. Idee, Beschreibung; „In Jellyfin öffnen“, wenn er schon
 * da ist, sonst „Anfragen“ (Serien: alle offenen oder ausgewählte Staffeln). Darunter Staffeln mit
 * Stand, Besetzung und „Das könnte dir auch gefallen“.
 */
export function RequestPage({ api, type, id, covered }: { api: Api; type: MediaType; id: number; covered: boolean }) {
  const router = useRouter()
  const [info, setInfo] = useState<Details | null>(null)
  const [local, setLocal] = useState<Item | null>(null)
  const [similar, setSimilar] = useState<Item[]>([])
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null)

  // Trailer vom Server automatisch im Hintergrund (nach 2 s, wie Android); sonst YouTube oben rechts
  useEffect(() => {
    setTrailerUrl(null)
    if (!local?.LocalTrailerCount || covered || !loadSettings().trailers) return
    let active = true
    const timer = setTimeout(() => localTrailerUrl(api, local).then(url => active && setTrailerUrl(url)), 2_000)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [local?.Id, covered])

  useEffect(() => {
    let active = true
    loadDetails(api, type, id)
      .then(loaded => {
        if (!active) return
        setInfo(loaded)
        focusSoon('r-buttons')
        if (loaded.status === 'available' || loaded.status === 'partial') jellyfinItem(api, loaded).then(found => active && setLocal(found))
      })
      .catch(() => active && setFailed(true))
    recommendationsFor(api, type, id).then(list => active && setSimilar(list.slice(0, 20).map(resultCard)))
    return () => {
      active = false
    }
  }, [type, id])

  const openSeasons = info?.type === 'tv' ? info.seasons.filter(s => s.status === 'none') : []
  const canRequest = !!info && (info.type === 'movie' ? info.status === 'none' : openSeasons.length > 0)

  async function send(seasons?: number[]) {
    if (!info || busy) return
    setBusy(true)
    try {
      await requestMedia(api, info.type, info.id, info.type === 'tv' ? seasons ?? openSeasons.map(s => s.number) : undefined)
      toast(t.seerrRequested_(info.title))
      const requested = new Set(seasons ?? openSeasons.map(s => s.number))
      setInfo({ ...info, status: 'requested', seasons: info.seasons.map(s => (requested.has(s.number) ? { ...s, status: 'requested' } : s)) })
      requestAnimationFrame(() => setFocus('r-buttons'))
    } catch (error) {
      const reason = error instanceof RequestError ? error.reason : 'other'
      toast(reason === 'duplicate' ? t.seerrDuplicate : reason === 'forbidden' ? t.seerrForbidden : t.seerrFailed)
    } finally {
      setBusy(false)
    }
  }

  /** Trailer vom eigenen Server, sonst der YouTube-Trailer im eigenen Fenster. */
  async function playTrailer() {
    const url = local?.LocalTrailerCount ? await localTrailerUrl(api, local) : null
    if (url) return router.push({ name: 'trailer', url })
    if (info?.trailer) router.push({ name: 'youtube', key: info.trailer.key })
  }

  const meta = info
    ? [
        info.year,
        info.certification && `FSK ${info.certification}`,
        info.runtime && `${info.runtime} Min.`,
        info.seasonCount && t.seerrSeasonCount(info.seasonCount),
        info.rating && `★ ${info.rating.toFixed(1).replace('.', ',')}`,
      ].filter(Boolean)
    : []
  const status = info ? badge(info.status) : undefined

  return (
    <Page focusKey="request" class="qk-details" onBackPress={() => (picking ? (setPicking(false), requestAnimationFrame(() => setFocus('r-buttons')), true) : false)}>
      <HeroBackdrop api={api} item={null} image={backdropImage(info?.backdropPath)} trailerUrl={covered ? null : trailerUrl} onTrailerEnd={() => setTrailerUrl(null)} onTrailerPlaying={() => {}} />
      {info?.trailer && !local?.LocalTrailerCount && !covered && !isTizen && loadSettings().trailers && <YouTubeInline key={info.trailer.key} videoKey={info.trailer.key} label={info.trailer.label || undefined} />}
      <div class="qk-page-main">
        {failed && <p class="qk-error">{t.detailsFailed}</p>}
        {info && (
          <div class="qk-details-top">
            <div class="qk-hero-info">
              <div class="qk-hero-title">{info.title}</div>
              {info.originalTitle && <div class="qk-hero-subtitle">{info.originalTitle}</div>}
              {status && <div class="qk-hero-reason" style={{ color: status.color }}>{status.label}</div>}
              <div class="qk-hero-facts">{meta.join('  ·  ')}</div>
              {info.genres.length > 0 && <div class="qk-hero-facts">{info.genres.join(', ')}</div>}
              {info.creators.length > 0 && <div class="qk-hero-credits">{info.type === 'movie' ? t.seerrDirector : t.seerrCreator}: {info.creators.join(', ')}</div>}
              {info.overview && <div class="qk-hero-overview">{cleanOverview(info.overview)}</div>}
            </div>
            <ActionRow focusKey="r-buttons">
              {local && <ActionButton focusKey="r-open" icon="play" label={t.seerrOpen} onPress={() => openItem(router, local)} />}
              {canRequest && <ActionButton focusKey="r-request" icon="add" label={info.type === 'tv' && info.seasons.length > 1 ? t.seerrRequestAll : t.seerrRequest} onPress={() => send()} />}
              {canRequest && openSeasons.length > 1 && <ActionButton focusKey="r-seasons" label={t.seerrPickSeasons} onPress={() => setPicking(true)} />}
              {local?.LocalTrailerCount || info.trailer ? <ActionButton focusKey="r-trailer" icon="trailer" label={!local?.LocalTrailerCount && info.trailer?.label ? `${t.trailer} (${info.trailer.label})` : t.trailer} onPress={playTrailer} /> : null}
              {!local && !canRequest && !info.trailer && <ActionButton focusKey="r-back" label={t.back} onPress={() => router.pop()} />}
            </ActionRow>
          </div>
        )}
        <div class="qk-rows qk-page-rows">
          {info && info.seasons.length > 0 && <SeasonList seasons={info.seasons} />}
          {info && info.cast.length > 0 && <Row api={api} row={{ key: 'r-cast', title: t.cast, items: info.cast.map(personCard), kind: 'people' }} onFocusItem={() => {}} onOpen={item => openItem(router, item)} />}
          {similar.length > 0 && <Row api={api} row={{ key: 'r-similar', title: t.similar, items: similar, kind: 'posters' }} onFocusItem={() => {}} onOpen={item => openItem(router, item)} />}
        </div>
      </div>
      {picking && info && <SeasonPicker seasons={openSeasons} onCancel={() => { setPicking(false); requestAnimationFrame(() => setFocus('r-buttons')) }} onRequest={numbers => { setPicking(false); send(numbers) }} />}
    </Page>
  )
}

/** Staffeln mit Zahl der Folgen und Stand (nur zur Ansicht, als Reihe von Kärtchen). */
function SeasonList({ seasons }: { seasons: Details['seasons'] }) {
  return (
    <div class="qk-row">
      <div class="qk-row-title">{t.seerrSeasons}</div>
      <div class="qk-season-list">
        {seasons.map(s => {
          const b = badge(s.status)
          return (
            <div class="qk-season-chip">
              <span>{s.name}</span>
              {s.episodes ? <span class="qk-muted"> · {t.seerrEpisodes(s.episodes)}</span> : null}
              {b && <span class="qk-badge inline" style={{ background: b.color }}>{b.label}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Staffeln zum Anfragen auswählen; alle sind vorausgewählt. */
function SeasonPicker({ seasons, onCancel, onRequest }: { seasons: Details['seasons']; onCancel: () => void; onRequest: (numbers: number[]) => void }) {
  const [chosen, setChosen] = useState(() => new Set(seasons.map(s => s.number)))
  const { ref, focusKey } = useFocusable({ focusKey: 'season-picker', isFocusBoundary: true, trackChildren: true })
  useEffect(() => {
    requestAnimationFrame(() => setFocus(`pick-${seasons[0]?.number}`))
  }, [])
  const toggle = (n: number) => {
    const next = new Set(chosen)
    if (next.has(n)) next.delete(n)
    else next.add(n)
    setChosen(next)
  }
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-tracks qk-season-picker">
        <div class="qk-tracks-column">
          <div class="qk-tracks-title">{t.seerrPickSeasons}</div>
          {seasons.map(s => <PickButton key={s.number} focusKey={`pick-${s.number}`} label={s.name} selected={chosen.has(s.number)} onPress={() => toggle(s.number)} />)}
          <div class="qk-season-picker-actions">
            <PickButton focusKey="pick-request" label={t.seerrRequest} onPress={() => chosen.size && onRequest([...chosen].sort((a, b) => a - b))} />
            <PickButton focusKey="pick-cancel" label={t.seerrCancel} onPress={onCancel} />
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  )
}

function PickButton({ focusKey, label, selected, onPress }: { focusKey: string; label: string; selected?: boolean; onPress: () => void }) {
  const { ref, focused, focusSelf } = useFocusable({ focusKey, onEnterPress: onPress })
  return (
    <div ref={ref} class={`qk-osd-button ${focused ? 'focused' : ''} ${selected ? 'selected' : ''}`} onClick={onPress} onMouseEnter={() => focusSelf()}>
      {selected !== undefined && <Icon name={selected ? 'check' : 'add'} size={22} />}
      <span>{label}</span>
    </div>
  )
}
