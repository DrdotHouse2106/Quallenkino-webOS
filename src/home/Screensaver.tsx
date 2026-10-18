import { useEffect, useState } from 'preact/hooks'
import { byIds, items, localTrailerUrl, recommendations, type Api, type Item } from '../api/items'
import { backdropUrl, logoUrl } from '../api/images'
import { t } from '../i18n'
import { TrailerVideo } from './TrailerVideo'
import { title } from './format'

/** So lange bleibt ein Bild stehen; ein Trailer läuft höchstens so lange (wie Android). */
const IMAGE_MS = 12_000
const MAX_TRAILER_MS = 180_000

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
 * Bildschirmschoner: Hintergrundbilder mit langsamer Kamerafahrt, Logo bzw. Titel und Uhr; liegt ein
 * Trailer auf dem Server, läuft er ohne Ton. OK öffnet den gezeigten Titel, jede andere Taste beendet.
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

  // Je Titel: Trailer vom Server (ohne Ton), sonst nach einiger Zeit das nächste Bild
  useEffect(() => {
    if (!item) return
    setTrailer(null)
    let active = true
    let timer = setTimeout(() => setIndex(i => i + 1), IMAGE_MS)
    if (item.LocalTrailerCount) {
      localTrailerUrl(api, item).then(url => {
        if (!active || !url) return
        clearTimeout(timer)
        setTrailer(url)
        timer = setTimeout(() => setIndex(i => i + 1), MAX_TRAILER_MS)
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
      {backdrop && <img key={`${item!.Id}-${index}`} class="qk-screensaver-image" src={backdrop} alt="" />}
      {trailer && <TrailerVideo key={trailer} url={trailer} muted onEnded={() => setIndex(i => i + 1)} onPlayingChange={() => {}} />}
      <div class="qk-screensaver-shade" />
      {item && (
        <div class="qk-screensaver-info" key={item.Id}>
          {logo ? <img class="qk-screensaver-logo" src={logo} alt={title(item)} /> : <div class="qk-screensaver-title">{title(item)}</div>}
          <div class="qk-muted">{t.screensaverHint}</div>
        </div>
      )}
      <div class="qk-screensaver-clock">{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  )
}
