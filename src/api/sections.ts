import { request } from './http'
import { byIds, type Api, type Item } from './items'
import { timeZoneParameter, utcOffsetMinutes } from './behavior'

/**
 * Weitere Abschnitte des Plugins Local Recommendations (ab 12.45):
 * Filmreihen („Weiter mit Teil 3“) und eine Saison-Zeile (Weihnachten, Halloween …), nur wenn aktiv.
 */

interface SectionsConfig {
  Upcoming?: boolean
  MoviesTitle?: string
  SeriesTitle?: string
  LiveTvTitle?: string
  LiveTvRow?: boolean
  Moments?: boolean
  MovieSeries?: boolean
  MovieSeriesTitle?: string
  Seasonal?: boolean
}

interface RawSeries {
  Id?: string
  Name?: string
  Total?: number
  Watched?: number
  NextIndex?: number
  Reason?: string
  HasBackdrop?: boolean
  HasPoster?: boolean
  Next?: Item
}

/** Filmreihe für Karte und Reihen-Seite. */
export interface SeriesInfo {
  Id: string
  Name: string
  Total: number
  Watched: number
  NextIndex: number
  Reason?: string
  HasBackdrop?: boolean
}

export interface SeriesDetail extends SeriesInfo {
  Parts: Item[]
}

/** Bild der Reihe (ohne Anmeldung); null, wenn der Server keins hat. */
export function seriesImage(api: Api, series: SeriesInfo): string | null {
  return series.HasBackdrop ? `${api.url.replace(/\/+$/, '')}/LocalRecs/MovieSeries/${encodeURIComponent(series.Id)}/Images/Backdrop` : null
}

/** „2 von 4 gesehen · Weiter mit Teil 3“ bzw. „4 Teile“ (testbar). */
export function seriesCaption(series: SeriesInfo): string {
  if (series.Watched > 0 && series.Watched < series.Total) return `${series.Watched} von ${series.Total} gesehen · Weiter mit Teil ${series.NextIndex + 1}`
  if (series.Watched >= series.Total && series.Total > 0) return `Alle ${series.Total} Teile gesehen`
  return series.Reason || `${series.Total} Teile`
}

function info(raw: RawSeries): SeriesInfo {
  return {
    Id: String(raw.Id ?? ''),
    Name: raw.Name ?? '',
    Total: raw.Total ?? 0,
    Watched: raw.Watched ?? 0,
    NextIndex: raw.NextIndex ?? 0,
    Reason: raw.Reason,
    HasBackdrop: raw.HasBackdrop,
  }
}

/** Reihen-Seite: GET /LocalRecs/MovieSeries/{Id} – alle Teile in Erscheinungsreihenfolge. */
export async function seriesDetail(api: Api, seriesId: string): Promise<SeriesDetail | null> {
  const raw = await request<RawSeries & { Parts?: Item[] }>(api.url, `/LocalRecs/MovieSeries/${encodeURIComponent(seriesId)}`, { token: api.token }).catch(() => null)
  if (!raw) return null
  const parts = raw.Parts ?? []
  const full = parts.length ? await byIds(api, parts.map(i => i.Id)).catch(() => parts) : []
  const byId = new Map(full.map(i => [i.Id, i]))
  return { ...info(raw), Parts: parts.map(i => byId.get(i.Id) ?? i) }
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
    // Fehlschläge nicht merken – sonst blieben nach einem Aussetzer beim Start alle Zeilen bis zum Neustart aus
    cached = request<SectionsConfig>(api.url, '/LocalRecs/Web/Config', { token: api.token })
      .then(c => c ?? {})
      .catch((error: { status?: number }) => {
        // 404: Plugin fehlt oder ist zu alt – das ist eine Antwort und darf bleiben
        if (error?.status !== 404) configs.delete(api.url)
        return {}
      })
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
    const meta = info(series)
    items.push({ ...series.Next, Series: meta, Caption: seriesCaption(meta) })
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
  return { title: config.MovieSeriesTitle || fallbackTitle, items: items.map(i => ({ ...(byId.get(i.Id) ?? i), Series: i.Series, Caption: i.Caption })), reasons }
}

/** Saison-Zeile (z. B. „Weihnachtsfilme“) – nur wenn der Server sie gerade aktiv meldet. */
export async function seasonal(api: Api): Promise<Section | null> {
  const config = await sectionsConfig(api)
  // Fehlt der Schalter, trotzdem fragen: der Endpunkt meldet selbst, ob gerade eine Saison aktiv ist
  if (config.Seasonal === false) return null
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
  // Begründung als Untertitel der Karte (wie im Web)
  return rows.map(row => ({ ...row, items: row.items.map(i => ({ ...(byId.get(i.Id) ?? i), Caption: row.reasons[key(i.Id)] })) }))
}

/** Titel und Schalter der Empfehlungszeilen wie im Web (Plugin ab 12.48); fehlende Werte = App-Vorgabe. */
export async function rowSettings(api: Api): Promise<{ movies?: string; series?: string; liveTv?: string; liveTvRow: boolean }> {
  const config = await sectionsConfig(api)
  return { movies: config.MoviesTitle || undefined, series: config.SeriesTitle || undefined, liveTv: config.LiveTvTitle || undefined, liveTvRow: config.LiveTvRow !== false }
}

interface RawUpcoming {
  Kind?: 'Episode' | 'Movie'
  ReleaseType?: string
  Title?: string
  Subtitle?: string
  Date?: string
  LocalDate?: string
  Network?: string
  EpisodeOverview?: string
  SeasonNumber?: number
  EpisodeNumber?: number
  EpisodeTitle?: string
  MoreEpisodes?: number
  LocalTime?: string
  NextAfter?: { Text?: string }
  Series?: Item
  Movie?: { RadarrId?: number; TmdbId?: number; ImdbId?: string; Year?: number; Overview?: string; OfficialRating?: string; PosterUrl?: string; BackdropUrl?: string }
}

/**
 * Antwort von GET /LocalRecs/Upcoming als Karten (testbar): Folgen als Karte ihrer Serie (Klick öffnet die
 * Serie), Filme aus Radarr mit eigenen Bildern (Klick zeigt Titel, Jahr und Beschreibung).
 */
export function parseUpcoming(baseUrl: string, raw: { Items?: RawUpcoming[] } | null): Item[] {
  const abs = (path?: string) => (path ? `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}` : undefined)
  const items: Item[] = []
  for (const entry of raw?.Items ?? []) {
    if (entry.Kind === 'Episode' && entry.Series?.Id) {
      items.push({
        ...entry.Series,
        Caption: entry.Subtitle,
        UpcomingEpisode: {
          seriesId: entry.Series.Id,
          seriesName: entry.Title ?? entry.Series.Name ?? '',
          season: entry.SeasonNumber,
          episode: entry.EpisodeNumber,
          episodeTitle: entry.EpisodeTitle,
          date: entry.Date,
          network: entry.Network,
          overview: entry.EpisodeOverview,
          more: typeof entry.MoreEpisodes === 'number' ? entry.MoreEpisodes : undefined,
          localTime: entry.LocalTime || undefined,
          nextAfter: entry.NextAfter?.Text || undefined,
          subtitle: entry.Subtitle,
        },
      })
    } else if (entry.Kind === 'Movie' && entry.Movie) {
      const movie = entry.Movie
      const backdrop = abs(movie.BackdropUrl)
      items.push({
        Id: `upcoming-${movie.TmdbId ?? movie.RadarrId ?? entry.Title}`,
        Name: entry.Title ?? '',
        Type: 'Movie',
        ProductionYear: movie.Year,
        Overview: movie.Overview,
        OfficialRating: movie.OfficialRating,
        ImageUrl: backdrop ?? abs(movie.PosterUrl) ?? null,
        BackdropUrl: backdrop,
        Caption: entry.Subtitle,
        Upcoming: true,
      })
    }
  }
  return items
}

/** Zeile „Demnächst“ (Sonarr/Radarr über das Plugin ab 12.48); leer ohne Plugin oder ohne Einträge. */
export async function upcoming(api: Api): Promise<Item[]> {
  const config = await sectionsConfig(api)
  if (!config.Upcoming) return []
  const raw = await request<{ Items?: RawUpcoming[] }>(api.url, `/LocalRecs/Upcoming?utcOffsetMinutes=${utcOffsetMinutes()}${timeZoneParameter()}`, { token: api.token }).catch(() => null)
  return parseUpcoming(api.url, raw)
}

/** Kommende Folge aus „Demnächst“ (Plugin ab 12.49). */
export interface UpcomingEpisode {
  seriesId: string
  seriesName: string
  season?: number
  episode?: number
  episodeTitle?: string
  date?: string
  network?: string
  overview?: string
  more?: number
  /** Uhrzeit vom Server in der Zone des Fernsehers (ab 12.52.2), z. B. „15:30 Uhr MEZ“. */
  localTime?: string
  /** „Danach: S03E06 am So. 01.11.“ (ab 12.52.2). */
  nextAfter?: string
  subtitle?: string
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const pad = (n: number) => String(n).padStart(2, '0')

/** „S02E05 · Folgentitel“ (testbar). */
export function episodeLine(episode: UpcomingEpisode): string {
  const code = episode.season != null && episode.episode != null ? `S${pad(episode.season)}E${pad(episode.episode)}` : ''
  return [code, episode.episodeTitle].filter(Boolean).join(' · ')
}

/** „Samstag, 24.10.2026 · 21:00 Uhr · Paramount+“ in der Ortszeit des Fernsehers (testbar). */
export function episodeWhen(episode: UpcomingEpisode, toLocal: (iso: string) => Date = iso => new Date(iso)): string {
  const parts: string[] = []
  if (episode.date) {
    // Termin in UTC; ohne Zonenangabe ebenfalls UTC (sonst läse der Browser ihn als Ortszeit)
    const iso = /(Z|[+-]\d\d:?\d\d)$/.test(episode.date) ? episode.date : `${episode.date}Z`
    const d = toLocal(iso)
    if (!isNaN(d.getTime())) {
      parts.push(`${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`)
      // Uhrzeit bevorzugt vom Server (in der Zone des Fernsehers berechnet)
      parts.push(episode.localTime ? (episode.localTime.includes('Uhr') ? episode.localTime : `${episode.localTime} Uhr`) : `${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`)
    }
  } else if (episode.localTime) {
    parts.push(episode.localTime)
  }
  if (episode.network) parts.push(episode.network)
  return parts.join(' · ')
}

interface RawSeriesUpcoming {
  Text?: string
  MoreText?: string
  NewText?: string
  NewToday?: { ItemId?: string }[]
}

/** Hinweis auf kommende bzw. heute neue Folgen auf der Serienseite (Plugin ab 12.52). */
export interface SeriesUpcoming {
  /** „Neue Folge heute · 21:00 Uhr · Paramount+ · S02E05 Folgentitel · +2 weitere bis 07.11.“ */
  next?: string
  /** „Neu: S02E05“ */
  newText?: string
  /** Heute erschienene, schon vorhandene Folgen (Id ohne Bindestriche, klein). */
  newIds: string[]
}

/** Antwort von GET /LocalRecs/Upcoming/Series/{id} (testbar); null bei 204 oder ohne Inhalt. */
export function parseSeriesUpcoming(raw: RawSeriesUpcoming | null | undefined): SeriesUpcoming | null {
  if (!raw) return null
  const next = [raw.Text, raw.MoreText].filter(Boolean).join(' · ') || undefined
  const newIds = (raw.NewToday ?? []).map(e => (e.ItemId ? key(e.ItemId) : '')).filter(Boolean)
  const newText = raw.NewText || undefined
  return next || newText || newIds.length ? { next, newText, newIds } : null
}

/** Serienseite: nächste Folge aus Sonarr und heute neue Folgen; null ohne Plugin, ohne Sonarr oder ohne Termin. */
export async function seriesUpcoming(api: Api, seriesId: string): Promise<SeriesUpcoming | null> {
  const raw = await request<RawSeriesUpcoming | undefined>(
    api.url,
    `/LocalRecs/Upcoming/Series/${key(seriesId)}?utcOffsetMinutes=${utcOffsetMinutes()}${timeZoneParameter()}`,
    { token: api.token },
  ).catch(() => null)
  return parseSeriesUpcoming(raw)
}
