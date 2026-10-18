import { useEffect, useState } from 'preact/hooks'
import { byIds, items, recommendations, type Api, type Item } from '../api/items'
import { loadSettings } from '../settings'
import { backdropUrl, logoUrl } from '../api/images'
import { t } from '../i18n'
import { TrailerVideo } from './TrailerVideo'
import { title } from './format'

/** So lange bleibt ein Bild stehen; ein Teaser läuft seine Länge plus Nachlauf, höchstens 3 Minuten (wie Android). */
const IMAGE_MS = 12_000
const DEFAULT_TEASER_MS = 120_000
const MAX_TEASER_MS = 180_000
const AFTER_TEASER_MS = 3_000
/** Bis zu dieser Länge gilt ein Video als Teaser. */
const MAX_TEASER_SECONDS = 100

/**
 * Teaser auswählen (wie Android): Name bzw. Pfad mit „Teaser“ zuerst, sonst das kürzeste Video bis
 * 100 Sekunden; sonst der erste Trailer. Kurz und ohne viel zu verraten.
 */
export function pickTeaser(trailers: Item[], extras: Item[]): Item | null {
  const videos = [...trailers, ...extras]
  const named = videos.find(v => /teaser/i.test(`${v.Name ?? ''} ${v.Path ?? ''}`))
  if (named) return named
  const short = videos
    .filter(v => (v.RunTimeTicks ?? Infinity) < MAX_TEASER_SECONDS * TICKS)
    .sort((a, b) => (a.RunTimeTicks ?? 0) - (b.RunTimeTicks ?? 0))[0]
  return short ?? trailers[0] ?? null
}

const TICKS = 10_000_000

/** Teaser bzw. Trailer eines Titels vom Server (Trailer und Extras), mit Länge. */
async function teaser(api: Api, item: Item): Promise<{ url: string; ms: number } | null> {
  if (item.Type !== 'Movie' && item.Type !== 'Series') return null
  const [trailers, extras] = await Promise.all([
    items(api, `/Users/${api.userId}/Items/${item.Id}/LocalTrailers`).catch(() => [] as Item[]),
    items(api, `/Users/${api.userId}/Items/${item.Id}/SpecialFeatures`).catch(() => [] as Item[]),
  ])
  const video = pickTeaser(trailers, extras)
  if (!video) return null
  const ms = video.RunTimeTicks ? (video.RunTimeTicks / TICKS) * 1000 : DEFAULT_TEASER_MS
  return {
    url: `${api.url.replace(/\/+$/, '')}/Videos/${video.Id}/stream?static=true&api_key=${encodeURIComponent(api.token)}`,
    ms: Math.min(ms + AFTER_TEASER_MS, MAX_TEASER_MS),
  }
}

/**
 * Titel für den Bildschirmschoner (wie Android): persönliche Empfehlungen und angefangene Filme,
 * nur mit Hintergrundbild, gemischt.
 */
export async function screensaverItems(api: Api): Promise<Item[]> {
  const [movies, series, resume] = await Promise.all([
    recommendations(api, 'movies', 30),
    recommendations(api, 'series', 30),
    items(api, `/UserItems/Resume?userId=${api.userId}&limit=10&MediaTypes=Video&IncludeItemTypes=Movie&EnableImageTypes=Backdrop,Logo&ImageTypeLimit=1`).catch(() => [] as Item[]),
  ])
  const recommended = await byIds(api, [...movies, ...series].map(i => i.Id)).catch(() => [] as Item[])
  const seen = new Set<string>()
  const list = [...recommended, ...resume].filter(i => backdropUrl(api, i) && !seen.has(i.Id) && seen.add(i.Id))
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/**
 * Bildschirmschoner: Hintergrundbilder mit langsamer Kamerafahrt, Logo bzw. Titel und Uhr. Mit
 * „Teaser im Bildschirmschoner“ läuft ein Teaser vom Server (Ton laut Einstellung, ab Werk stumm). OK öffnet den gezeigten Titel, jede andere Taste beendet.
 */
export function Screensaver({ api, onOpen, onClose }: { api: Api; onOpen: (item: Item) => void; onClose: () => void }) {
  const [list, setList] = useState<Item[] | null>(null)
  const [index, setIndex] = useState(0)
  const [trailer, setTrailer] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    screensaverItems(api).then(setList).catch(() => setList([]))
    const clock = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(clock)
  }, [api])

  const item = list?.length ? list[index % list.length] : null
  const [loaded, setLoaded] = useState<string | null>(null)

  // Nächstes Hintergrundbild schon vorladen, damit der Wechsel nicht schwarz beginnt
  useEffect(() => {
    if (!list?.length) return
    const next = list[(index + 1) % list.length]
    const url = backdropUrl(api, next, 1920)
    if (url) new Image().src = url
  }, [list, index])

  // Je Titel: Trailer vom Server (ohne Ton), sonst nach einiger Zeit das nächste Bild
  useEffect(() => {
    if (!item) return
    setTrailer(null)
    let active = true
    let timer = setTimeout(() => setIndex(i => i + 1), IMAGE_MS)
    if (loadSettings().screensaverTrailers) {
      teaser(api, item).then(found => {
        if (!active || !found) return
        clearTimeout(timer)
        setTrailer(found.url)
        timer = setTimeout(() => setIndex(i => i + 1), found.ms)
      })
    }
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [item?.Id, index])

  // Jede Taste beendet den Bildschirmschoner; OK öffnet den Titel. Die Taste löst sonst nichts aus.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.keyCode === 13 && item) onOpen(item)
      else onClose()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [item?.Id])

  const backdrop = item ? backdropUrl(api, item, 1920) : null
  const logo = item ? logoUrl(api, item) : null
  return (
    <div class="qk-screensaver" onClick={onClose}>
      {/* Erst zeigen, wenn das Bild geladen ist (sonst kurz nur Logo auf Schwarz) */}
      {backdrop && <img key={`${item!.Id}-${index}`} class={`qk-screensaver-image ${loaded === backdrop ? 'loaded' : ''}`} src={backdrop} alt="" onLoad={() => setLoaded(backdrop)} />}
      {trailer && <TrailerVideo key={trailer} url={trailer} volume={loadSettings().screensaverVolume} onEnded={() => setIndex(i => i + 1)} onPlayingChange={() => {}} />}
      <div class="qk-screensaver-shade" />
      {item && loaded === backdrop && (
        <div class="qk-screensaver-info" key={item.Id}>
          {logo ? <img class="qk-screensaver-logo" src={logo} alt={title(item)} /> : <div class="qk-screensaver-title">{title(item)}</div>}
          <div class="qk-muted">{t.screensaverHint}</div>
        </div>
      )}
      <div class="qk-screensaver-clock">{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  )
}
