import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Api, Item } from '../api/items'
import { forYou, resultCard, search } from '../api/jellyseerr'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { openItem } from '../nav/open'
import { useRouter } from '../nav/router'
import { Page } from '../pages/Page'
import { TextInput } from '../ui/Focusable'

const DEBOUNCE_MS = 500
/** Plakate je Zeile des Rasters. */
const PER_ROW = 8

/** „Für dich“ bleibt pro Profil erhalten (die Berechnung braucht etliche Anfragen). */
const cachedForYou = new Map<string, Item[]>()
const forYouKey = (api: Api) => `${api.url}|${api.userId}`

/**
 * Entdecken & Anfragen (Jellyseerr): ohne Suchbegriff „Für dich“ (neueste zuerst), sonst die Treffer.
 * Plakate mit Stand (Verfügbar, Teilweise, Angefragt); OK öffnet die Detailseite mit „Anfragen“.
 */
export function DiscoverPage({ api }: { api: Api }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Item[] | null>(cachedForYou.get(forYouKey(api)) ?? null)
  const [results, setResults] = useState<Item[] | null>(null)
  const counter = useRef(0)

  useEffect(() => {
    const key = forYouKey(api)
    const cached = cachedForYou.get(key)
    if (cached) return setSuggestions(cached)
    forYou(api)
      .then(list => {
        const cards = list.map(resultCard)
        cachedForYou.set(key, cards)
        setSuggestions(cards)
      })
      .catch(() => setSuggestions([]))
  }, [api])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults(null)
      return
    }
    const run = ++counter.current
    setResults(null)
    const timer = setTimeout(() => {
      search(api, term)
        .then(list => run === counter.current && setResults(list.map(resultCard)))
        .catch(() => run === counter.current && setResults([]))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const searching = query.trim().length >= 2
  const shown = searching ? results : suggestions
  const rows: Item[][] = []
  for (let i = 0; i < (shown?.length ?? 0); i += PER_ROW) rows.push(shown!.slice(i, i + PER_ROW))

  function toResults(): boolean {
    if (!rows.length) return false
    setFocus('row-discover-0')
    return true
  }

  return (
    <Page focusKey="discover" class="qk-search-page" rail={t.railDiscover} onBackPress={() => (document.activeElement?.tagName === 'INPUT' ? toResults() : false)}>
      <div class="qk-page-main">
        <h1>{t.discoverTitle}</h1>
        <div class="qk-search-field">
          <TextInput focusKey="discover-input" value={query} placeholder={t.discoverPlaceholder} onInput={setQuery} onSubmit={toResults} autoFocus />
        </div>
        <p class="qk-muted">{shown === null ? t.discoverLoading : shown.length === 0 ? (searching ? t.discoverNothing : '') : searching ? '' : t.discoverHint}</p>
        <div class="qk-rows qk-page-rows">
          {rows.map((items, index) => (
            <Row key={`${searching}-${index}`} api={api} row={{ key: `discover-${index}`, title: '', items, kind: 'posters' }} onFocusItem={() => {}} onOpen={item => openItem(router, item)}
              onArrow={index === 0 ? direction => (direction === 'up' ? (setFocus('discover-input'), false) : true) : undefined} />
          ))}
        </div>
      </div>
    </Page>
  )
}
