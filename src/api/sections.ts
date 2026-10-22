import { request } from './http'
import { byIds, type Api, type Item } from './items'
import { utcOffsetMinutes } from './behavior'

/**
 * Weitere Abschnitte des Plugins Local Recommendations (ab 12.45):
 * Filmreihen („Weiter mit Teil 3“) und eine Saison-Zeile (Weihnachten, Halloween …), nur wenn aktiv.
 */

interface SectionsConfig {
  Moments?: boolean
  MovieSeries?: boolean
  MovieSeriesTitle?: string
  Seasonal?: boolean
}

interface RawSeries {
  Id?: string
  Name?: string
  Reason?: string
  Next?: Item
}

export interface Section {
  title: string
  items: Item[]
  /** Begründung je Titel (Id ohne Bindestriche, klein), z. B. „Weiter mit Teil 3“. */
  reasons: Record<string, string>
}

const configs = new Map<string, Promise<SectionsConfig>>()

function sectionsConfig(api: Api): Promise<SectionsConfig> {
  let cached = configs.get(api.url)
  if (!cached) {
    cached = request<SectionsConfig>(api.url, '/LocalRecs/Web/Config', { token: api.token }).then(c => c ?? {}).catch(() => ({}))
    configs.set(api.url, cached)
  }
  return cached
}

const key = (id: string) => id.replace(/-/g, '').toLowerCase()

/** Antwort von GET /LocalRecs/MovieSeries: je Reihe der Teil zum Weiterschauen (testbar). */
export function parseMovieSeries(raw: { Items?: RawSeries[] } | null): { items: Item[]; reasons: Record<string, string> } {
  const items: Item[] = []
  const reasons: Record<string, string> = {}
  for (const series of raw?.Items ?? []) {
    if (!series.Next?.Id) continue
    items.push(series.Next)
    reasons[key(series.Next.Id)] = series.Reason || series.Name || ''
  }
  return { items, reasons }
}

/** Zeile „Filmreihen für dich“; null ohne Plugin oder ohne Reihen. */
export async function movieSeries(api: Api, fallbackTitle: string): Promise<Section | null> {
  const config = await sectionsConfig(api)
  if (!config.MovieSeries) return null
  const raw = await request<{ Items?: RawSeries[] }>(api.url, '/LocalRecs/MovieSeries?limit=12', { token: api.token }).catch(() => null)
  const { items, reasons } = parseMovieSeries(raw)
  if (!items.length) return null
  // Mit allen Feldern der App nachladen, Reihenfolge der Reihen behalten
  const full = await byIds(api, items.map(i => i.Id)).catch(() => items)
  const byId = new Map(full.map(i => [i.Id, i]))
  return { title: config.MovieSeriesTitle || fallbackTitle, items: items.map(i => byId.get(i.Id) ?? i), reasons }
}

/** Saison-Zeile (z. B. „Weihnachtsfilme“) – nur wenn der Server sie gerade aktiv meldet. */
export async function seasonal(api: Api): Promise<Section | null> {
  const config = await sectionsConfig(api)
  if (!config.Seasonal) return null
  const raw = await request<{ Active?: boolean; Title?: string; Items?: Item[] }>(
    api.url,
    `/LocalRecs/Seasonal?utcOffsetMinutes=${utcOffsetMinutes()}`,
    { token: api.token },
  ).catch(() => null)
  if (!raw?.Active || !raw.Title || !raw.Items?.length) return null
  const full = await byIds(api, raw.Items.map(i => i.Id)).catch(() => raw.Items!)
  const byId = new Map(full.map(i => [i.Id, i]))
  return { title: raw.Title, items: raw.Items.map(i => byId.get(i.Id) ?? i), reasons: {} }
}

/** Detailseite eines Films: alle Teile der Reihe in Erscheinungsreihenfolge (leer ohne Reihe). */
export async function seriesParts(api: Api, itemId: string): Promise<Item[]> {
  const config = await sectionsConfig(api)
  if (!config.MovieSeries) return []
  const raw = await request<{ Parts?: Item[] }>(api.url, `/LocalRecs/MovieSeries/ByItem/${key(itemId)}`, { token: api.token }).catch(() => null)
  const parts = raw?.Parts ?? []
  if (parts.length < 2) return []
  const full = await byIds(api, parts.map(i => i.Id)).catch(() => parts)
  const byId = new Map(full.map(i => [i.Id, i]))
  return parts.map(i => byId.get(i.Id) ?? i)
}

interface RawMoment {
  Key?: string
  Title?: string
  Items?: Item[]
  Reasons?: Record<string, string>
}

export interface Moment extends Section {
  key: string
}

/** Antwort von GET /LocalRecs/Moments: Zeilen in Anzeigereihenfolge, leere fallen weg (testbar). */
export function parseMoments(raw: { Rows?: RawMoment[] } | null): Moment[] {
  return (raw?.Rows ?? [])
    .filter(row => row.Title && row.Items?.length)
    .map(row => {
      const reasons: Record<string, string> = {}
      for (const [id, text] of Object.entries(row.Reasons ?? {})) if (text) reasons[key(id)] = text
      return { key: row.Key ?? '', title: row.Title!, items: row.Items!, reasons }
    })
}

/**
 * Zeitabhängige Zeilen (Plugin ab 12.46): „Läuft heute im TV – hier ohne Werbung“, „Neu diese Woche“,
 * „Vor dem Kinostart“, „Heute vor X Jahren“ … – Auswahl und Reihenfolge vom Server.
 */
export async function moments(api: Api): Promise<Moment[]> {
  const config = await sectionsConfig(api)
  if (!config.Moments) return []
  const raw = await request<{ Rows?: RawMoment[] }>(api.url, `/LocalRecs/Moments?utcOffsetMinutes=${utcOffsetMinutes()}`, { token: api.token }).catch(() => null)
  const rows = parseMoments(raw)
  // Mit allen Feldern der App nachladen (eine Abfrage für alle Zeilen), Reihenfolge behalten
  const ids = [...new Set(rows.flatMap(row => row.items.map(i => i.Id)))]
  const full = ids.length ? await byIds(api, ids).catch(() => [] as Item[]) : []
  const byId = new Map(full.map(i => [i.Id, i]))
  return rows.map(row => ({ ...row, items: row.items.map(i => byId.get(i.Id) ?? i) }))
}
