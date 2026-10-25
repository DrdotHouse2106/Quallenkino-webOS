import { useEffect, useState } from 'preact/hooks'
import {
  byIds,
  latest,
  newestWithBackdrop,
  nextUp,
  reasons as loadReasons,
  recommendations,
  resume,
  top10,
  type Api,
  type Item,
} from '../api/items'
import { backdropUrl } from '../api/images'
import { tvForYou } from '../api/livetv'
import { worldCard, worlds } from '../api/worlds'
import { t } from '../i18n'
import { interleave } from './format'
import { serverBillboard } from '../api/billboard'
import { discover, moments, movieSeries, rowSettings, seasonal, upcoming } from '../api/sections'
import type { RowData } from './Rows'
import { daypartOrder, reorderRows } from '../api/behavior'

const DAYPART_KIND: Record<string, string> = { 'recs-movies': 'movies', 'recs-series': 'series', tv: 'livetv' }

const BILLBOARD_SIZE = 8

/**
 * „Als Nächstes“ ohne das, was schon in „Weiterschauen“ steht – weder dieselbe Folge noch eine
 * weitere Folge derselben Serie (sonst sind beide Reihen fast gleich).
 */
export function withoutResumed(nextup: RowData | undefined, resume: RowData | undefined): RowData | undefined {
  if (!nextup || !resume) return nextup
  const ids = new Set(resume.items.map(i => i.Id))
  const series = new Set(resume.items.map(i => i.SeriesId).filter(Boolean))
  return { ...nextup, items: nextup.items.filter(i => !ids.has(i.Id) && !(i.SeriesId && series.has(i.SeriesId))) }
}

/** Banner-Vorschläge: zuerst aus den Empfehlungen, sonst die neuesten Filme und Serien. */
const POOL = 30
// Etwas mehr als 4 je Typ, weil Titel ohne Hintergrundbild noch herausfallen
const PICK_PER_TYPE = 6

/** Seed für die Banner-Auswahl: lokales Datum und Profil – gleicher Tag, gleiche Auswahl. */
function dailySeed(userId: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}|${userId}`
}

/** Kleiner deterministischer Zufallsgenerator (mulberry32) aus einem Text-Seed. */
function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let x = Math.imul(h ^ (h >>> 15), 1 | h)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * `count` Einträge gewichtet ziehen, ohne Zurücklegen: Rang r hat Gewicht 1/(r+2), vordere Empfehlungen
 * kommen also öfter, aber nicht immer dran. Gleicher Seed ergibt dieselbe Auswahl.
 */
export function dailyPick<T>(list: T[], count: number, seed: string): T[] {
  const random = seededRandom(seed)
  // Efraimidis-Spirakis: Schlüssel u^(1/w) = u^(r+2), die größten gewinnen
  return list
    .map((value, rank) => ({ value, key: Math.pow(random(), rank + 2) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map(e => e.value)
}

interface BillboardResult {
  items: Item[]
  reasons: Record<string, string>
}

async function loadBillboard(api: Api): Promise<BillboardResult> {
  // Auswahl vom Server (Plugin ab 12.41) – Reihenfolge kommt von dort, nicht umsortieren
  const server = await serverBillboard(api, BILLBOARD_SIZE)
  if (server?.ids.length) {
    const found = await byIds(api, server.ids).catch(() => [] as Item[])
    const byId = new Map(found.map(i => [i.Id, i]))
    const items = server.ids.map(id => byId.get(id)).filter((i): i is Item => !!i && !!backdropUrl(api, i)).slice(0, BILLBOARD_SIZE)
    if (items.length) return { items, reasons: server.reasons }
  }
  return { items: await clientBillboard(api), reasons: {} }
}

async function clientBillboard(api: Api): Promise<Item[]> {
  // Täglich wechselnde Auswahl aus den ersten 30 Empfehlungen je Typ (nicht immer die obersten)
  const [movies, series] = await Promise.all([recommendations(api, 'movies', POOL), recommendations(api, 'series', POOL)])
  const seed = dailySeed(api.userId)
  const ids = [...dailyPick(movies, PICK_PER_TYPE, `${seed}|movies`), ...dailyPick(series, PICK_PER_TYPE, `${seed}|series`)].map(i => i.Id)
  const items = ids.length ? await byIds(api, ids).catch(() => []) : await newestWithBackdrop(api, BILLBOARD_SIZE).catch(() => [])
  return interleave(items.filter(i => backdropUrl(api, i))).slice(0, BILLBOARD_SIZE)
}

const CACHE_PREFIX = 'qk.billboard.'

function cachedBillboard(userId: string): Item[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_PREFIX + userId) ?? '[]') as Item[]
  } catch {
    return []
  }
}

/**
 * Daten der Startseite. Alle Zeilen laden gleichzeitig und erscheinen, sobald sie da sind
 * (in fester Reihenfolge). Das Banner vom letzten Start ist sofort da.
 */
export function useHomeData(api: Api) {
  const [billboard, setBillboard] = useState<Item[]>(() => cachedBillboard(api.userId))
  const [rows, setRows] = useState<Record<string, RowData>>({})
  const [daypart, setDaypart] = useState<string[] | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [seriesReasons, setSeriesReasons] = useState<Record<string, string>>({})
  const [momentKeys, setMomentKeys] = useState<string[]>([])
  const [discoverKeys, setDiscoverKeys] = useState<string[]>([])
  const [rowConfig, setRowConfig] = useState<{ movies?: string; series?: string; liveTv?: string; liveTvRow: boolean }>({ liveTvRow: true })
  /** Banner fertig geladen (auch wenn leer) – erst dann darf der Startfokus in die Reihen. */
  const [billboardDone, setBillboardDone] = useState(false)
  const [billboardReasons, setBillboardReasons] = useState<Record<string, string>>({})
  const [billboardVersion, setBillboardVersion] = useState(0)

  useEffect(() => {
    let active = true
    loadBillboard(api).catch(() => ({ items: [] as Item[], reasons: {} })).then(({ items, reasons: badges }) => {
      if (!active) return
      setBillboardDone(true)
      setBillboardReasons(badges)
      if (items.length === 0) return
      setBillboard(items)
      try {
        localStorage.setItem(CACHE_PREFIX + api.userId, JSON.stringify(items))
      } catch {
        // Speicher voll – egal
      }
    })
    return () => {
      active = false
    }
  }, [api.url, api.userId, api.token, billboardVersion])

  useEffect(() => {
    let active = true
    loadReasons(api).then(map => active && setReasons(map))
    daypartOrder(api).then(value => active && setDaypart(value))

    const sources: Array<[string, string, RowData['kind'], () => Promise<Item[]>]> = [
      ['resume', t.rowResume, 'cards', () => resume(api)],
      ['nextup', t.rowNextUp, 'cards', () => nextUp(api)],
      ['recs-movies', t.rowRecommendedMovies, 'cards', () => recommendations(api, 'movies')],
      ['recs-series', t.rowRecommendedSeries, 'cards', () => recommendations(api, 'series')],
      ['tv', t.rowTvForYou, 'cards', () => tvForYou(api)],
      ['worlds', t.rowWorlds, 'worlds', () => worlds(api).then(list => list.map(worldCard))],
      ['top10', t.rowTop10, 'top10', () => top10(api)],
      ['latest', t.rowLatest, 'cards', () => latest(api)],
    ]
    // Plugin ab 12.45: Filmreihen und Saison-Zeile (Titel kommt vom Server)
    movieSeries(api, t.rowMovieSeries).then(section => {
      if (!active || !section) return
      setSeriesReasons(current => ({ ...current, ...section.reasons }))
      setRows(current => ({ ...current, 'movie-series': { key: 'movie-series', title: section.title, kind: 'cards', items: section.items } }))
    }).catch(() => {})
    moments(api).then(list => {
      if (!active || !list.length) return
      setMomentKeys(list.map(m => `moment-${m.key}`))
      setSeriesReasons(current => ({ ...current, ...Object.assign({}, ...list.map(m => m.reasons)) }))
      // (ohne Object.fromEntries – das kennt Chromium 69 auf Samsung 2020 nicht)
      setRows(current => list.reduce<Record<string, RowData>>((all, m) => ({ ...all, [`moment-${m.key}`]: { key: `moment-${m.key}`, title: m.title, kind: 'cards', items: m.items } }), { ...current }))
    }).catch(() => {})
    upcoming(api).then(items => {
      if (active && items.length) setRows(current => ({ ...current, upcoming: { key: 'upcoming', title: t.rowUpcoming, kind: 'cards', items } }))
    }).catch(() => {})
    // Entdecken-Reihen (Kinostarts, Neu dieses Jahr; Plugin ab 12.54) nach „Demnächst“
    discover(api).then(list => {
      if (!active || !list.length) return
      setDiscoverKeys(list.map((_, index) => `discover-${index}`))
      setRows(current => list.reduce<Record<string, RowData>>((all, section, index) => ({ ...all, [`discover-${index}`]: { key: `discover-${index}`, title: section.title, kind: 'cards', items: section.items } }), { ...current }))
    }).catch(() => {})
    // Zeilentitel und Live-TV-Schalter wie im Web (Plugin ab 12.48)
    rowSettings(api).then(settings => active && setRowConfig(settings)).catch(() => {})
    seasonal(api).then(section => {
      if (!active || !section) return
      setRows(current => ({ ...current, seasonal: { key: 'seasonal', title: section.title, kind: 'cards', items: section.items } }))
    }).catch(() => {})

    for (const [key, title, kind, load] of sources) {
      load()
        .then(async items => {
          // Plugin-Zeilen liefern nicht alle Felder – dann vollständig nachladen
          const complete = key.startsWith('recs') || key === 'top10' ? await byIds(api, items.map(i => i.Id)).catch(() => items) : items
          if (active) setRows(current => ({ ...current, [key]: { key, title, kind, items: complete } }))
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [api.url, api.userId, api.token])

  // Empfehlungszeilen in der Reihenfolge der Tageszeit (Plugin ab 12.36), „tv“ = Live-TV für dich
  const order = reorderRows(['resume', 'nextup', 'seasonal', 'recs-movies', 'recs-series', ...momentKeys, 'movie-series', 'upcoming', ...discoverKeys, ...(rowConfig.liveTvRow ? ['tv'] : []), 'worlds', 'top10', 'latest'], key => DAYPART_KIND[key] ?? null, daypart)
  const titled = (row: RowData | undefined): RowData | undefined => {
    const title = row?.key === 'recs-movies' ? rowConfig.movies : row?.key === 'recs-series' ? rowConfig.series : row?.key === 'tv' ? rowConfig.liveTv : undefined
    return row && title ? { ...row, title } : row
  }
  const orderedRows = order.map(key => titled(key === 'nextup' ? withoutResumed(rows.nextup, rows.resume) : rows[key])).filter((row): row is RowData => !!row && row.items.length > (row.kind === 'top10' ? 2 : 0))
  /** „Später“: Titel sofort aus dem Banner nehmen und die Auswahl neu laden. */
  const dropFromBillboard = (id: string) => {
    setBillboard(list => list.filter(i => i.Id !== id))
    setBillboardVersion(v => v + 1)
  }

  return { billboard, billboardDone, billboardReasons, dropFromBillboard, rows: orderedRows, reasons: { ...reasons, ...seriesReasons } }
}
