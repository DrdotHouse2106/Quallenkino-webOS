import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'preact/hooks'
import {
  castOf,
  episodes as loadEpisodes,
  fullItem,
  localTrailerUrl,
  ratingTarget,
  reasonKey,
  seasons as loadSeasons,
  setRating,
  similar as loadSimilar,
  type Api,
  type Item,
} from '../api/items'
import { HeroBackdrop, HeroInfo } from '../home/Hero'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { useRouter } from '../nav/router'
import { toast } from '../ui/Toast'
import { ActionButton } from './ActionButton'
import { Page } from './Page'
import { startPlayback } from '../player/start'
import { youtubeKey } from './YouTubePage'
import { YouTubeInline } from '../ui/YouTubeInline'
import { loadSettings } from '../settings'
import { focusSoon } from '../nav/focus'

/** Trailer startet auf der Detailseite nach kurzer Zeit im Hintergrund (wie Android). */
const AUTO_TRAILER_MS = 2_000

interface Props {
  api: Api
  id: string
  /** Vorausgewählte Staffel (Staffelkarte geöffnet). */
  season?: string
  reasons: Record<string, string>
  /** Eine weitere Seite liegt darüber – dann keinen Trailer abspielen. */
  covered: boolean
}

export function DetailsPage({ api, id, season: initialSeason, reasons, covered }: Props) {
  const router = useRouter()
  const [item, setItem] = useState<Item | null>(null)
  const [similar, setSimilar] = useState<Item[]>([])
  const [seasons, setSeasons] = useState<Item[]>([])
  const [season, setSeason] = useState<string | null>(null)
  const [episodes, setEpisodes] = useState<Item[]>([])
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null)
  const [likes, setLikes] = useState<boolean | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    fullItem(api, id).then(loaded => {
      if (!active) return
      setItem(loaded)
      setLikes(loaded.UserData?.Likes ?? null)
      focusSoon('d-play')
    }).catch(() => active && setFailed(true))
    loadSimilar(api, id).then(list => active && setSimilar(list))
    return () => {
      active = false
    }
  }, [id])

  // Serie: Staffeln, dann die Folgen der gewählten Staffel
  useEffect(() => {
    if (item?.Type !== 'Series') return
    loadSeasons(api, item.Id).then(list => {
      setSeasons(list)
      if (list.length) setSeason(list.find(s => s.Id === initialSeason)?.Id ?? list[0].Id)
    })
  }, [item?.Id])
  useEffect(() => {
    if (!item || !season) return
    loadEpisodes(api, item.Id, season).then(setEpisodes)
  }, [season])

  // Trailer im Hintergrund (nur vom Server); pausiert, solange eine andere Seite darüber liegt
  useEffect(() => {
    setTrailerUrl(null)
    if (!item || covered || !loadSettings().trailers) return
    let active = true
    const timer = setTimeout(async () => {
      const url = await localTrailerUrl(api, item)
      if (active) setTrailerUrl(url)
    }, AUTO_TRAILER_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [item?.Id, covered])

  async function rate(value: boolean) {
    if (!item) return
    const target = ratingTarget(item)
    if (!target) return
    try {
      setLikes(await setRating(api, target, likes === value ? null : value))
    } catch {
      toast(t.ratingFailed)
    }
  }

  async function openTrailer() {
    if (!item) return
    const url = await localTrailerUrl(api, item)
    if (url) return router.push({ name: 'trailer', url })
    // Ohne Trailer auf dem Server: YouTube-Trailer aus den Metadaten im eigenen Fenster
    const key = remoteTrailerKey(item)
    if (key) router.push({ name: 'youtube', key })
    else toast(t.noTrailer)
  }

  const resumable = (item?.UserData?.PlaybackPositionTicks ?? 0) > 0
  const cast = item ? castOf(item) : []

  return (
    <Page focusKey="details" class="qk-details">
      {item && <HeroBackdrop api={api} item={item} trailerUrl={covered ? null : trailerUrl} onTrailerEnd={() => setTrailerUrl(null)} onTrailerPlaying={() => {}} />}
      {/* Ohne Trailer auf dem Server: YouTube-Trailer oben rechts (wie Android) */}
      {item && !item.LocalTrailerCount && !covered && loadSettings().trailers && remoteTrailerKey(item) && <YouTubeInline key={item.Id} videoKey={remoteTrailerKey(item)!} />}
      <div class="qk-page-main">
        {failed && <p class="qk-error">{t.detailsFailed}</p>}
        {item && (
          <div class="qk-details-top">
            <HeroInfo api={api} item={item} reason={reasons[reasonKey(item.Id)]}>
              {item.Taglines?.[0] && <div class="qk-tagline">{item.Taglines[0]}</div>}
            </HeroInfo>
            <ButtonRow>
              <ActionButton focusKey="d-play" icon="play" label={resumable ? t.resume : t.play} onPress={() => startPlayback(api, router, item)} />
              {resumable && <ActionButton focusKey="d-restart" icon="replay" label={t.fromStart} onPress={() => startPlayback(api, router, item, true)} />}
              <ActionButton focusKey="d-trailer" icon="trailer" label={t.trailer} dimmed={!item.LocalTrailerCount && !remoteTrailerKey(item)} onPress={openTrailer} />
              {ratingTarget(item) && <ActionButton focusKey="d-like" icon="thumbUp" label={t.like} active={likes === true} onPress={() => rate(true)} />}
              {ratingTarget(item) && <ActionButton focusKey="d-dislike" icon="thumbDown" label={t.dislike} active={likes === false} onPress={() => rate(false)} />}
            </ButtonRow>
          </div>
        )}
        <div class="qk-rows qk-page-rows">
          {seasons.length > 1 && <SeasonTabs seasons={seasons} current={season} onPick={setSeason} />}
          {episodes.length > 0 && (
            <Row api={api} row={{ key: 'd-episodes', title: seasons.find(s => s.Id === season)?.Name ?? t.episodes, items: episodes, kind: 'episodes' }}
              onFocusItem={() => {}} onOpen={episode => startPlayback(api, router, episode)} />
          )}
          {cast.length > 0 && (
            <Row api={api} row={{ key: 'd-cast', title: t.cast, items: cast, kind: 'people' }}
              onFocusItem={() => {}} onOpen={person => router.push({ name: 'person', id: person.Id })} />
          )}
          {similar.length > 0 && (
            <Row api={api} row={{ key: 'd-similar', title: t.similar, items: similar, kind: 'posters' }}
              onFocusItem={() => {}} onOpen={other => router.push({ name: 'details', id: other.Id })} />
          )}
        </div>
      </div>
    </Page>
  )
}

function ButtonRow({ children }: { children: preact.ComponentChildren }) {
  const { ref, focusKey } = useFocusable({ focusKey: 'd-buttons', trackChildren: true, saveLastFocusedChild: true })
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-billboard-buttons">{children}</div>
    </FocusContext.Provider>
  )
}

/** Staffel-Auswahl als Reihe von Knöpfen. */
function SeasonTabs({ seasons, current, onPick }: { seasons: Item[]; current: string | null; onPick: (id: string) => void }) {
  const { ref, focusKey } = useFocusable({ focusKey: 'd-seasons', trackChildren: true, saveLastFocusedChild: true })
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-row qk-season-tabs">
        {seasons.map(s => <ActionButton key={s.Id} focusKey={`d-season-${s.Id}`} label={s.Name ?? ''} active={s.Id === current} onPress={() => onPick(s.Id)} />)}
      </div>
    </FocusContext.Provider>
  )
}

/** YouTube-Trailer aus den Metadaten (deutscher zuerst, wenn der Name es verrät). */
function remoteTrailerKey(item: Item): string | null {
  const trailers = item.RemoteTrailers ?? []
  const german = trailers.find(tr => /deutsch|german/i.test(tr.Name ?? ''))
  for (const trailer of german ? [german, ...trailers] : trailers) {
    const key = youtubeKey(trailer.Url)
    if (key) return key
  }
  return null
}
