import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { allTitles, type AllTitlesSort, type AllTitlesType, type Api, type Item } from '../api/items'
import { HeroBackdrop, HeroInfo } from '../home/Hero'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { focusSoon } from '../nav/focus'
import { openItem } from '../nav/open'
import { useRouter } from '../nav/router'
import { ActionButton, ActionRow } from './ActionButton'
import { Page } from './Page'

/** Titel je Zeile und je nachgeladener Seite. */
const PER_ROW = 5
const PAGE = 60

/**
 * „Alle Titel“ (Link ganz unten auf der Startseite): alle Filme und Serien als Banner-Karten, der große Infobereich
 * oben zeigt den ausgewählten Titel – so blättert man durch die Banner. Filter Filme/Serien, Sortierung, lädt beim
 * Weiterscrollen nach.
 */
export function AllTitlesPage({ api }: { api: Api }) {
  const router = useRouter()
  const [type, setType] = useState<AllTitlesType>('Movie,Series')
  const [sort, setSort] = useState<AllTitlesSort>('SortName')
  const [list, setList] = useState<Item[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [focused, setFocused] = useState<Item | null>(null)
  const loading = useRef(false)
  const version = useRef(0)

  async function load(reset: boolean) {
    if (loading.current && !reset) return
    const run = ++version.current
    loading.current = true
    const start = reset ? 0 : list.length
    const result = await allTitles(api, type, sort, start, PAGE).catch(() => ({ items: [] as Item[], total: 0 }))
    if (run !== version.current) return
    loading.current = false
    setTotal(result.total)
    setList(current => (reset ? result.items : [...current, ...result.items]))
    if (reset && result.items.length) {
      setFocused(result.items[0])
      focusSoon('row-all-0')
    }
  }

  useEffect(() => {
    load(true)
  }, [type, sort])

  const rows = useMemo(() => {
    const chunks: Item[][] = []
    for (let i = 0; i < list.length; i += PER_ROW) chunks.push(list.slice(i, i + PER_ROW))
    return chunks
  }, [list])

  function onFocusItem(item: Item, rowIndex: number) {
    setFocused(item)
    // Kurz vor dem Ende die nächste Seite laden
    if (total !== null && list.length < total && rowIndex >= rows.length - 3) load(false)
  }

  return (
    <Page focusKey="all-titles" class="qk-home qk-all-titles">
      <HeroBackdrop api={api} item={focused} trailerUrl={null} onTrailerEnd={() => {}} onTrailerPlaying={() => {}} />
      <div class="qk-home-main">
        <div class="qk-home-top">
          {focused ? <HeroInfo api={api} item={focused} /> : <div class="qk-hero-info"><div class="qk-hero-title">{t.allTitles}</div></div>}
          <div class="qk-hero-facts qk-all-count">{t.allTitles}{total !== null ? ` · ${t.allTitlesCount(total)}` : ''}</div>
          <ActionRow focusKey="all-filter">
            <ActionButton focusKey="all-type-all" label={t.allTitlesAll} active={type === 'Movie,Series'} onPress={() => setType('Movie,Series')} />
            <ActionButton focusKey="all-type-movie" label={t.allTitlesMovies} active={type === 'Movie'} onPress={() => setType('Movie')} />
            <ActionButton focusKey="all-type-series" label={t.allTitlesSeries} active={type === 'Series'} onPress={() => setType('Series')} />
            <ActionButton focusKey="all-sort-name" label={t.allTitlesSortName} active={sort === 'SortName'} onPress={() => setSort('SortName')} />
            <ActionButton focusKey="all-sort-added" label={t.allTitlesSortAdded} active={sort === 'DateCreated'} onPress={() => setSort('DateCreated')} />
            <ActionButton focusKey="all-sort-year" label={t.allTitlesSortYear} active={sort === 'ProductionYear'} onPress={() => setSort('ProductionYear')} />
            <ActionButton focusKey="all-sort-rating" label={t.allTitlesSortRating} active={sort === 'CommunityRating'} onPress={() => setSort('CommunityRating')} />
          </ActionRow>
        </div>
        <div class="qk-rows">
          {total === null && <p class="qk-muted">{t.loading}</p>}
          {rows.map((items, index) => (
            <Row key={`all-${index}-${items[0]?.Id}`} api={api} row={{ key: `all-${index}`, title: '', items, kind: 'cards' }}
              onFocusItem={item => onFocusItem(item, index)} onOpen={item => openItem(router, item)} />
          ))}
        </div>
      </div>
    </Page>
  )
}
