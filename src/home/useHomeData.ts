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
import type { RowData } from './Rows'

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
async function loadBillboard(api: Api): Promise<Item[]> {
  const [movies, series] = await Promise.all([recommendations(api, 'movies', BILLBOARD_SIZE / 2), recommendations(api, 'series', BILLBOARD_SIZE / 2)])
  const ids = [...movies, ...series].map(i => i.Id)
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
  const [reasons, setReasons] = useState<Record<string, string>>({})
  /** Banner fertig geladen (auch wenn leer) – erst dann darf der Startfokus in die Reihen. */
  const [billboardDone, setBillboardDone] = useState(false)

  useEffect(() => {
    let active = true
    loadBillboard(api).catch(() => [] as Item[]).then(items => {
      if (!active) return
      setBillboardDone(true)
      if (items.length === 0) return
      setBillboard(items)
      try {
        localStorage.setItem(CACHE_PREFIX + api.userId, JSON.stringify(items))
      } catch {
        // Speicher voll – egal
      }
    })
    loadReasons(api).then(map => active && setReasons(map))

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

  const order = ['resume', 'nextup', 'recs-movies', 'recs-series', 'tv', 'worlds', 'top10', 'latest']
  const orderedRows = order.map(key => (key === 'nextup' ? withoutResumed(rows.nextup, rows.resume) : rows[key])).filter((row): row is RowData => !!row && row.items.length > (row.kind === 'top10' ? 2 : 0))
  return { billboard, billboardDone, rows: orderedRows, reasons }
}
