import { request } from './http'
import { get, items, type Api, type Item } from './items'
import { normalizeName } from './names'
import { t } from '../i18n'

/**
 * Entdecken und Anfragen über Jellyseerr – wie in der Android-App über das Plugin Jellyfin Enhanced
 * ({Server}/JellyfinEnhanced/jellyseerr), angemeldet mit dem Jellyfin-Token des Benutzers.
 */

export type MediaType = 'movie' | 'tv'
/** Stand in Jellyseerr: verfügbar, teilweise, angefragt oder nichts. */
export type Status = 'available' | 'partial' | 'requested' | 'none'

export interface Result {
  id: number
  type: MediaType
  title: string
  year?: string
  overview?: string
  posterPath?: string
  status: Status
  jellyfinId?: string
}

const TMDB = 'https://image.tmdb.org/t/p/'
export const posterUrl = (path?: string | null) => (path ? `${TMDB}w342${path}` : null)
export const backdropImage = (path?: string | null) => (path ? `${TMDB}w1280${path}` : null)
export const profileUrl = (path?: string | null) => (path ? `${TMDB}w185${path}` : null)

const ROOT = '/JellyfinEnhanced/jellyseerr'

function call<T>(api: Api, path: string, body?: unknown): Promise<T> {
  return request<T>(api.url, ROOT + path, { token: api.token, timeoutMs: 10_000, method: body === undefined ? 'GET' : 'POST', body })
}

/** Ist Jellyseerr über das Plugin erreichbar und der Benutzer dort bekannt? */
export async function available(api: Api): Promise<boolean> {
  try {
    const [status, user] = await Promise.all([
      call<{ active?: boolean }>(api, '/status'),
      call<{ active?: boolean; userFound?: boolean }>(api, '/user-status'),
    ])
    return !!status?.active && !!user?.active && !!user?.userFound
  } catch {
    return false
  }
}

export function statusOf(code?: number): Status {
  if (code === 5) return 'available'
  if (code === 4) return 'partial'
  if (code === 2 || code === 3) return 'requested'
  return 'none'
}

interface RawResult {
  id: number
  mediaType?: string
  title?: string
  name?: string
  releaseDate?: string
  firstAirDate?: string
  overview?: string
  posterPath?: string
  mediaInfo?: { status?: number; jellyfinMediaId?: string }
}

export function toResult(raw: RawResult, fallbackType?: MediaType): Result | null {
  const type = (raw.mediaType ?? fallbackType) as MediaType | undefined
  if (type !== 'movie' && type !== 'tv') return null
  const date = raw.releaseDate || raw.firstAirDate
  return {
    id: raw.id,
    type,
    title: raw.title ?? raw.name ?? '',
    year: date ? date.slice(0, 4) : undefined,
    overview: raw.overview,
    posterPath: raw.posterPath,
    status: statusOf(raw.mediaInfo?.status),
    jellyfinId: raw.mediaInfo?.jellyfinMediaId,
  }
}

const results = (list: RawResult[] | undefined, type?: MediaType) =>
  (list ?? []).map(r => toResult(r, type)).filter((r): r is Result => !!r)

/** Suche; eine Jahreszahl am Ende („Dune 2021“) filtert die Treffer (ohne Treffer: alle). */
export async function search(api: Api, query: string): Promise<Result[]> {
  const match = query.trim().match(/^(.*\S)\s+\(?((?:19|20)\d{2})\)?$/)
  const term = (match ? match[1] : query.trim()).slice(0, 256)
  const response = await call<{ results?: RawResult[] }>(api, `/search?query=${encodeURIComponent(term)}&page=1&language=de`)
  const list = results(response?.results)
  if (!match) return list
  const sameYear = list.filter(r => r.year === match[2])
  return sameYear.length ? sameYear : list
}

export async function recommendationsFor(api: Api, type: MediaType, id: number): Promise<Result[]> {
  const response = await call<{ results?: RawResult[] }>(api, `/${type}/${id}/recommendations?page=1`).catch(() => null)
  return results(response?.results, type).filter(r => r.id !== id)
}

export interface Details extends Result {
  originalTitle?: string
  backdropPath?: string
  tagline?: string
  genres: string[]
  runtime?: number
  seasonCount?: number
  rating?: number
  certification?: string
  creators: string[]
  cast: { id: number; name: string; character?: string; profilePath?: string }[]
  seasons: { number: number; name: string; episodes?: number; status: Status }[]
  /** YouTube-Trailer: Schlüssel und Kennzeichnung („“ = deutsch, sonst „OmU“, „EN“ …). */
  trailer?: { key: string; label: string }
}

/** Detailseite: Eckdaten, FSK (Deutschland), Regie bzw. Idee, Besetzung, Staffeln mit Stand. */
export async function details(api: Api, type: MediaType, id: number): Promise<Details> {
  const raw = await call<Record<string, any>>(api, `/${type}/${id}?language=de`)
  const base = toResult({ ...raw, id, mediaType: type } as RawResult, type)!
  const de = (list: any[] | undefined) => (list ?? []).find(r => r.iso_3166_1 === 'DE')
  const certification = type === 'movie'
    ? (de(raw.releases?.results)?.release_dates ?? []).map((d: any) => d.certification).find((c: string) => !!c)
    : de(raw.contentRatings?.results)?.rating
  const seasonStatus = new Map<number, number>((raw.mediaInfo?.seasons ?? []).map((s: any) => [s.seasonNumber, s.status]))
  return {
    ...base,
    originalTitle: [raw.originalTitle, raw.originalName].find(t => t && t !== base.title),
    backdropPath: raw.backdropPath,
    tagline: raw.tagline || undefined,
    genres: (raw.genres ?? []).map((g: any) => g.name),
    runtime: raw.runtime || raw.episodeRunTime?.[0] || undefined,
    seasonCount: raw.numberOfSeasons,
    rating: raw.voteAverage > 0 ? raw.voteAverage : undefined,
    certification: certification || undefined,
    creators: type === 'movie'
      ? (raw.credits?.crew ?? []).filter((c: any) => c.job === 'Director').map((c: any) => c.name)
      : (raw.createdBy ?? []).map((c: any) => c.name),
    cast: (raw.credits?.cast ?? []).slice(0, 15).map((c: any) => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profilePath })),
    seasons: (raw.seasons ?? [])
      .filter((s: any) => s.seasonNumber > 0)
      .map((s: any) => ({ number: s.seasonNumber, name: s.name || `Staffel ${s.seasonNumber}`, episodes: s.episodeCount, status: statusOf(seasonStatus.get(s.seasonNumber)) })),
    trailer: pickTrailer(raw.relatedVideos ?? [], raw.originalLanguage),
  }
}

export class RequestError extends Error {
  constructor(public reason: 'duplicate' | 'forbidden' | 'other') {
    super(reason)
  }
}

/** Anfragen; bei Serien alle oder bestimmte Staffeln. */
export async function requestMedia(api: Api, type: MediaType, id: number, seasons?: number[] | 'all') {
  const body: Record<string, unknown> = { mediaType: type, mediaId: id }
  if (type === 'tv') body.seasons = seasons ?? 'all'
  try {
    await call(api, '/request', body)
  } catch (error) {
    const status = (error as { status?: number }).status
    throw new RequestError(status === 409 ? 'duplicate' : status === 403 ? 'forbidden' : 'other')
  }
}

export interface PersonDetails {
  id: number
  name: string
  birthday?: string
  placeOfBirth?: string
  biography?: string
  profilePath?: string
  movies: Result[]
  series: Result[]
}

/** Person mit Filmen und Serien (neueste zuerst; ohne Datum oder Plakat ans Ende). */
export async function person(api: Api, id: number): Promise<PersonDetails> {
  const [raw, credits] = await Promise.all([
    call<Record<string, any>>(api, `/person/${id}?language=de`),
    call<{ cast?: RawResult[]; crew?: RawResult[] }>(api, `/person/${id}/combined_credits?language=de`).catch(() => ({ cast: [], crew: [] } as { cast?: RawResult[]; crew?: RawResult[] })),
  ])
  const all = results([...(credits?.cast ?? []), ...(credits?.crew ?? [])])
  const seen = new Set<string>()
  const unique = all.filter(r => {
    const key = `${r.type}-${r.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const sorted = unique.sort((a, b) => rank(b) - rank(a))
  return {
    id,
    name: raw.name,
    birthday: raw.birthday || undefined,
    placeOfBirth: raw.placeOfBirth || undefined,
    biography: raw.biography || undefined,
    profilePath: raw.profilePath || undefined,
    movies: sorted.filter(r => r.type === 'movie'),
    series: sorted.filter(r => r.type === 'tv'),
  }
}

const rank = (r: Result) => (r.year && r.posterPath ? Number(r.year) : -1)

/** Person zu einem Namen (Live-TV-Besetzung): nur bei genau einem gleichen Namen. */
export async function findPerson(api: Api, name: string): Promise<number | null> {
  try {
    const response = await call<{ results?: (RawResult & { name?: string })[] }>(api, `/search?query=${encodeURIComponent(name)}&page=1&language=de`)
    const wanted = normalizeName(name)
    const matches = (response?.results ?? []).filter(r => r.mediaType === 'person' && normalizeName(r.name ?? '') === wanted)
    return matches.length === 1 ? matches[0].id : null
  } catch {
    return null
  }
}

// --- „Für dich“ ---

let libraryIds: Promise<Set<string>> | null = null

/** TMDB-Ids aller Filme und Serien auf dem Server (einmal je App-Start). */
function library(api: Api): Promise<Set<string>> {
  libraryIds ??= items(api, `/Users/${api.userId}/Items?IncludeItemTypes=Movie,Series&Recursive=true&Fields=ProviderIds&EnableImages=false`)
    .then(list => new Set(list.flatMap(i => (i.ProviderIds?.Tmdb ? [`${i.Type === 'Series' ? 'tv' : 'movie'}-${i.ProviderIds.Tmdb}`] : []))))
    .catch(() => new Set<string>())
  return libraryIds
}

/** Ausgangstitel: Favoriten/„Gefällt mir“ zuerst, dann zuletzt gesehene Filme und Serien. */
async function seeds(api: Api): Promise<{ type: MediaType; id: number }[]> {
  const q = `/Users/${api.userId}/Items?Recursive=true&Fields=ProviderIds&SortOrder=Descending&EnableImages=false`
  const [favorites, movies, episodes] = await Promise.all([
    items(api, `${q}&Filters=IsFavoriteOrLikes&IncludeItemTypes=Movie,Series&SortBy=DateCreated&Limit=10`).catch(() => [] as Item[]),
    items(api, `${q}&Filters=IsPlayed&IncludeItemTypes=Movie&SortBy=DatePlayed&Limit=6`).catch(() => [] as Item[]),
    items(api, `${q}&Filters=IsPlayed&IncludeItemTypes=Episode&SortBy=DatePlayed&Limit=40`).catch(() => [] as Item[]),
  ])
  const seriesIds = [...new Set(episodes.map(e => e.SeriesId).filter((id): id is string => !!id))].slice(0, 6)
  const series = seriesIds.length ? await items(api, `/Users/${api.userId}/Items?Ids=${seriesIds.join(',')}&Fields=ProviderIds&EnableImages=false`).catch(() => [] as Item[]) : []
  const recent: Item[] = []
  for (let i = 0; i < Math.max(movies.length, series.length); i++) {
    if (movies[i]) recent.push(movies[i])
    if (series[i]) recent.push(series[i])
  }
  const list = [...favorites, ...recent].filter(i => i.UserData?.Likes !== false && i.ProviderIds?.Tmdb)
  const seen = new Set<string>()
  const result: { type: MediaType; id: number }[] = []
  for (const item of list) {
    const type: MediaType = item.Type === 'Series' ? 'tv' : 'movie'
    const key = `${type}-${item.ProviderIds!.Tmdb}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ type, id: Number(item.ProviderIds!.Tmdb) })
    if (result.length >= 8) break
  }
  return result
}

/**
 * „Für dich“: Empfehlungen zu den Ausgangstiteln, ohne Titel, die schon auf dem Server oder angefragt
 * sind; neueste zuerst, dann wie oft empfohlen. Höchstens 60.
 */
export async function forYou(api: Api): Promise<Result[]> {
  const [start, owned] = await Promise.all([seeds(api), library(api)])
  const lists = await Promise.all(start.map(s => recommendationsFor(api, s.type, s.id)))
  const seedKeys = new Set(start.map(s => `${s.type}-${s.id}`))
  const counts = new Map<string, { result: Result; count: number }>()
  for (const result of lists.flat()) {
    const key = `${result.type}-${result.id}`
    if (result.status !== 'none' || owned.has(key) || seedKeys.has(key)) continue
    const entry = counts.get(key)
    if (entry) entry.count++
    else counts.set(key, { result, count: 1 })
  }
  return [...counts.values()]
    .sort((a, b) => Number(b.result.year ?? 0) - Number(a.result.year ?? 0) || b.count - a.count)
    .slice(0, 60)
    .map(e => e.result)
}

/** Passender Titel auf dem Jellyfin-Server (nur bei „verfügbar“ bzw. „teilweise“). */
export async function jellyfinItem(api: Api, result: Result): Promise<Item | null> {
  if (result.jellyfinId) {
    const found = await get<Item>(api, `/Users/${api.userId}/Items/${result.jellyfinId}`).catch(() => null)
    if (found) return found
  }
  const list = await items(api, `/Users/${api.userId}/Items?searchTerm=${encodeURIComponent(result.title)}&IncludeItemTypes=${result.type === 'tv' ? 'Series' : 'Movie'}&Recursive=true&Fields=ProviderIds&Limit=50`).catch(() => [] as Item[])
  return list.find(i => i.ProviderIds?.Tmdb === String(result.id)) ?? null
}

/** Hinweis oben rechts auf dem Plakat (Farben wie Android). */
export function badge(status: Status): Item['Badge'] {
  if (status === 'available') return { label: t.seerrAvailable, color: '#2E7D32' }
  if (status === 'partial') return { label: t.seerrPartial, color: '#1F5FBF' }
  if (status === 'requested') return { label: t.seerrRequested, color: '#C9961A' }
  return undefined
}

/** Ergebnis als Karte für die Reihen der App. */
export function resultCard(result: Result): Item {
  return {
    Id: `seerr-${result.type}-${result.id}`,
    Name: result.title,
    Type: 'Seerr',
    ProductionYear: result.year ? Number(result.year) : undefined,
    Overview: result.overview,
    ImageUrl: posterUrl(result.posterPath),
    Badge: badge(result.status),
    Seerr: { type: result.type, id: result.id },
  }
}

export function personCard(person: { id: number; name: string; character?: string; profilePath?: string }): Item {
  return { Id: `seerr-person-${person.id}`, Name: person.name, Role: person.character, ImageUrl: profileUrl(person.profilePath), Seerr: { type: 'person', id: person.id } }
}

interface Video {
  site?: string
  key?: string
  type?: string
  name?: string
  iso_639_1?: string
  language?: string
}

const isGerman = (v: Video) => (v.iso_639_1 ?? v.language) === 'de' || /deutsch|german|offiziell|kinostart/i.test(v.name ?? '')

/**
 * Trailer wie in der Android-App: nur YouTube, Trailer vor Teaser, deutsche zuerst. Fremdsprachige
 * werden gekennzeichnet: „OmU“ (untertitelt bzw. Japanisch, Koreanisch, Chinesisch), sonst die Sprache.
 */
export function pickTrailer(videos: Video[], originalLanguage?: string): { key: string; label: string } | undefined {
  const usable = videos.filter(v => v.site === 'YouTube' && v.key && (v.type === 'Trailer' || v.type === 'Teaser'))
  const score = (v: Video) => (isGerman(v) ? 0 : 2) + (v.type === 'Trailer' ? 0 : 1)
  const best = [...usable].sort((a, b) => score(a) - score(b))[0]
  if (!best) return undefined
  if (isGerman(best)) return { key: best.key!, label: '' }
  const language = best.iso_639_1 ?? best.language
  const omu = /subtitled|\bsubs?\b|omu/i.test(best.name ?? '') || ['ja', 'ko', 'zh'].includes(originalLanguage ?? '')
  return { key: best.key!, label: omu ? 'OmU' : !language || language === 'en' ? 'EN' : language.toUpperCase() }
}
