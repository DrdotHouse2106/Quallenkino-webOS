import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useRef, useState } from 'preact/hooks'
import { searchItems, searchPeople, type Api, type Item } from '../api/items'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { useRouter } from '../nav/router'
import { TextInput } from '../ui/Focusable'
import { Page } from './Page'

/** Kurz warten, bis zu Ende getippt ist. */
const DEBOUNCE_MS = 400

interface Results {
  movies: Item[]
  series: Item[]
  people: Item[]
}

/** Suche: Ergebnisse schon beim Tippen; „Runter“ (bzw. „Zurück“ nach dem Tippen) führt zu den Treffern. */
export function SearchPage({ api }: { api: Api }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const counter = useRef(0)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults(null)
      return
    }
    const run = ++counter.current
    const timer = setTimeout(async () => {
      const [movies, series, people] = await Promise.all([
        searchItems(api, term, 'Movie').catch(() => []),
        searchItems(api, term, 'Series').catch(() => []),
        searchPeople(api, term),
      ])
      if (run === counter.current) setResults({ movies, series, people })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const rows = results
    ? [
        { key: 's-movies', title: t.movies, items: results.movies, kind: 'posters' as const },
        { key: 's-series', title: t.series, items: results.series, kind: 'posters' as const },
        { key: 's-people', title: t.people, items: results.people.map(p => ({ ...p, Type: 'Person' })), kind: 'people' as const },
      ].filter(r => r.items.length)
    : []

  function toResults(): boolean {
    if (!rows.length) return false
    setFocus(`row-${rows[0].key}`)
    return true
  }

  return (
    <Page focusKey="search" class="qk-search-page" onBackPress={() => (document.activeElement?.tagName === 'INPUT' ? toResults() : false)}>
      <div class="qk-page-main">
        <h1>{t.search}</h1>
        <div class="qk-search-field">
          <TextInput focusKey="search-input" value={query} placeholder={t.searchPlaceholder} onInput={setQuery} onSubmit={toResults} autoFocus />
        </div>
        <p class="qk-muted">{results && !rows.length ? t.searchNothing : t.searchHint}</p>
        <div class="qk-rows qk-page-rows">
          {rows.map(row => (
            <Row key={row.key} api={api} row={row} onFocusItem={() => {}}
              onOpen={i => router.push(i.Type === 'Person' ? { name: 'person', id: i.Id } : { name: 'details', id: i.Id })} />
          ))}
        </div>
      </div>
    </Page>
  )
}
