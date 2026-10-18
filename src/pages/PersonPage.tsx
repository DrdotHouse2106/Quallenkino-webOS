import { useEffect, useState } from 'preact/hooks'
import { item as loadItem, personItems, type Api, type Item } from '../api/items'
import { primaryUrl } from '../api/images'
import { cleanOverview } from '../home/format'
import { initials, Row } from '../home/Rows'
import { t } from '../i18n'
import { useRouter } from '../nav/router'
import { Page } from './Page'
import { Img } from '../ui/Img'
import { focusSoon } from '../nav/focus'

/** „1952-06-07T00:00:00Z“ → „7.6.1952“. */
export function formatDate(iso?: string): string | null {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${Number(match[3])}.${Number(match[2])}.${match[1]}` : null
}

/** Personenseite: Foto, Geburtstag, Biografie und die Filme und Serien auf dem Server. */
export function PersonPage({ api, id }: { api: Api; id: string }) {
  const router = useRouter()
  const [person, setPerson] = useState<Item | null>(null)
  const [movies, setMovies] = useState<Item[] | null>(null)
  const [series, setSeries] = useState<Item[] | null>(null)

  useEffect(() => {
    loadItem(api, id).then(setPerson).catch(() => {})
    personItems(api, id, 'Movie').then(setMovies)
    personItems(api, id, 'Series').then(setSeries)
  }, [id])

  // Fokus auf die erste Reihe, sobald es Titel gibt
  useEffect(() => {
    if (movies === null || series === null) return
    if (movies.length) focusSoon('row-p-movies')
    else if (series.length) focusSoon('row-p-series')
  }, [movies === null, series === null])

  const photo = person ? primaryUrl(api, person, 400) : null
  const born = formatDate(person?.PremiereDate)
  const place = person?.ProductionLocations?.[0]
  return (
    <Page focusKey="person" class="qk-person-page">
      <div class="qk-page-main">
        <div class="qk-person-head">
          <div class="qk-person-photo large"><Img src={photo} lazy={false} fallback={<span>{initials(person?.Name ?? '')}</span>} /></div>
          <div class="qk-person-info">
            <div class="qk-hero-title">{person?.Name}</div>
            {(born || place) && <div class="qk-hero-facts">{[born && t.born(born), place].filter(Boolean).join('  ·  ')}</div>}
            {person?.Overview && <div class="qk-hero-overview long">{cleanOverview(person.Overview)}</div>}
          </div>
        </div>
        <div class="qk-rows qk-page-rows">
          {movies && movies.length > 0 && <Row api={api} row={{ key: 'p-movies', title: t.movies, items: movies, kind: 'posters' }} onFocusItem={() => {}} onOpen={i => router.push({ name: 'details', id: i.Id })} />}
          {series && series.length > 0 && <Row api={api} row={{ key: 'p-series', title: t.series, items: series, kind: 'posters' }} onFocusItem={() => {}} onOpen={i => router.push({ name: 'details', id: i.Id })} />}
        </div>
      </div>
    </Page>
  )
}
