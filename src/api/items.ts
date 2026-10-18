import { request } from './http'

/** Die Felder eines Titels, die die App braucht (Auszug aus BaseItemDto). */
export interface Item {
  Id: string
  Name?: string
  Type?: string
  SeriesName?: string
  SeriesId?: string
  IndexNumber?: number
  ParentIndexNumber?: number
  Overview?: string
  ProductionYear?: number
  OfficialRating?: string
  RunTimeTicks?: number
  CommunityRating?: number
  Genres?: string[]
  ImageTags?: Record<string, string>
  BackdropImageTags?: string[]
  ParentBackdropItemId?: string
  ParentBackdropImageTags?: string[]
  ParentThumbItemId?: string
  ParentThumbImageTag?: string
  ParentLogoItemId?: string
  ParentLogoImageTag?: string
  SeriesThumbImageTag?: string
  SeriesPrimaryImageTag?: string
  LocalTrailerCount?: number
  RemoteTrailers?: { Url?: string; Name?: string }[]
  UserData?: { PlayedPercentage?: number; PlaybackPositionTicks?: number; Played?: boolean; Likes?: boolean | null; IsFavorite?: boolean }
  Taglines?: string[]
  People?: Person[]
  PremiereDate?: string
  /** Personen: Rolle in einem Titel bzw. Geburtsdatum/-ort auf der Personenseite. */
  Role?: string
  ProductionLocations?: string[]
  ChildCount?: number
  // Live-TV: Sendungen und Sender
  ChannelId?: string
  ChannelName?: string
  ChannelNumber?: string
  ChannelPrimaryImageTag?: string
  Number?: string
  StartDate?: string
  EndDate?: string
  EpisodeTitle?: string
  IsMovie?: boolean
  IsSeries?: boolean
  IsNews?: boolean
  IsKids?: boolean
  IsSports?: boolean
  IsPremiere?: boolean
  IsLive?: boolean
  IsRepeat?: boolean
  CurrentProgram?: Item
  ProviderIds?: Record<string, string>
  Studios?: { Id?: string; Name: string }[]
  /** Nur in der App: fertige Bildadresse (z. B. TMDB-Plakat aus Jellyseerr) und Hinweis oben rechts. */
  ImageUrl?: string | null
  Badge?: { label: string; color: string }
  /** Nur in der App: Eintrag aus Jellyseerr (Titel bzw. Person). */
  Seerr?: { type: 'movie' | 'tv' | 'person'; id: number }
  /** Nur in der App: Karte einer Welt (Startseite). */
  World?: import('./worlds').World
}

export interface Person {
  Id: string
  Name: string
  Role?: string
  Type?: string
  PrimaryImageTag?: string
}

interface QueryResult {
  Items: Item[]
  TotalRecordCount?: number
}

export interface Api {
  url: string
  token: string
  userId: string
}

/** Felder für Karten und Infobereich. */
const FIELDS = 'Overview,Genres,PrimaryImageAspectRatio,ProductionYear,OfficialRating,CommunityRating'
const IMAGES = 'EnableImageTypes=Primary,Backdrop,Thumb,Logo&ImageTypeLimit=1'

export function get<T>(api: Api, path: string): Promise<T> {
  return request<T>(api.url, path, { token: api.token })
}

export async function items(api: Api, path: string): Promise<Item[]> {
  const result = await get<QueryResult | Item[]>(api, path)
  return Array.isArray(result) ? result : result?.Items ?? []
}

export const resume = (api: Api, limit = 30) =>
  items(api, `/UserItems/Resume?userId=${api.userId}&limit=${limit}&MediaTypes=Video&Fields=${FIELDS}&${IMAGES}`)

export const nextUp = (api: Api, limit = 30) =>
  items(api, `/Shows/NextUp?userId=${api.userId}&limit=${limit}&Fields=${FIELDS}&${IMAGES}`)

export const latest = (api: Api, limit = 30) =>
  items(api, `/Users/${api.userId}/Items/Latest?limit=${limit}&IncludeItemTypes=Movie,Series&Fields=${FIELDS}&${IMAGES}`)

/** Empfehlungen des Plugins Local Recommendations (ohne Plugin: leer). */
export const recommendations = (api: Api, type: 'movies' | 'series', limit = 30) =>
  items(api, `/LocalRecs/Recommendations?type=${type}&limit=${limit}`).catch(() => [] as Item[])

/** Top 10 aller Benutzer der letzten 60 Tage (Plugin). */
export const top10 = (api: Api) =>
  items(api, '/LocalRecs/Top10?type=all&days=60&limit=10').catch(() => [] as Item[])

/** Titel in der angegebenen Reihenfolge mit allen Feldern laden. */
export async function byIds(api: Api, ids: string[]): Promise<Item[]> {
  if (ids.length === 0) return []
  const loaded = await items(api, `/Users/${api.userId}/Items?Ids=${ids.join(',')}&Fields=${FIELDS}&${IMAGES}`)
  const byId = new Map(loaded.map(item => [item.Id, item]))
  return ids.map(id => byId.get(id)).filter((item): item is Item => !!item)
}

export const item = (api: Api, id: string) => get<Item>(api, `/Users/${api.userId}/Items/${id}`)

/** Vollständiger Titel für die Detailseite (mit Besetzung, Taglines, Bewertung). */
export const fullItem = (api: Api, id: string) =>
  get<Item>(api, `/Users/${api.userId}/Items/${id}?Fields=${FIELDS},People,Taglines,ProductionLocations,ChildCount,RemoteTrailers`)

/** Ähnliche Titel („Das könnte dir auch gefallen“). */
export const similar = (api: Api, id: string, limit = 20) =>
  items(api, `/Items/${id}/Similar?userId=${api.userId}&limit=${limit}&Fields=${FIELDS}&${IMAGES}`).catch(() => [] as Item[])

export const seasons = (api: Api, seriesId: string) =>
  items(api, `/Shows/${seriesId}/Seasons?userId=${api.userId}&${IMAGES}`).catch(() => [] as Item[])

export const episodes = (api: Api, seriesId: string, seasonId: string) =>
  items(api, `/Shows/${seriesId}/Episodes?userId=${api.userId}&seasonId=${seasonId}&Fields=${FIELDS}&${IMAGES}`).catch(() => [] as Item[])

/** Filme bzw. Serien mit dieser Person, neueste zuerst. */
export const personItems = (api: Api, personId: string, type: 'Movie' | 'Series') =>
  items(api, `/Users/${api.userId}/Items?PersonIds=${personId}&IncludeItemTypes=${type}&Recursive=true&SortBy=PremiereDate,ProductionYear,SortName&SortOrder=Descending&limit=60&Fields=${FIELDS}&${IMAGES}`).catch(() => [] as Item[])

/** Suche in Filmen und Serien. */
export const searchItems = (api: Api, term: string, type: 'Movie' | 'Series') =>
  items(api, `/Users/${api.userId}/Items?searchTerm=${encodeURIComponent(term)}&IncludeItemTypes=${type}&Recursive=true&limit=40&Fields=${FIELDS}&${IMAGES}`)

/** Personen suchen (Schauspieler, Regie). */
export const searchPeople = (api: Api, term: string) =>
  items(api, `/Persons?userId=${api.userId}&searchTerm=${encodeURIComponent(term)}&limit=20&${IMAGES}`).catch(() => [] as Item[])

/**
 * Daumen hoch/runter: true = gefällt mir, false = nichts für mich, null = entfernen.
 * Folgen werden über ihre Serie bewertet (fließt so in die Empfehlungen ein).
 */
export async function setRating(api: Api, id: string, likes: boolean | null): Promise<boolean | null> {
  const path = `/UserItems/${id}/Rating?userId=${api.userId}`
  const result = likes === null
    ? await request<{ Likes?: boolean | null }>(api.url, path, { method: 'DELETE', token: api.token })
    : await request<{ Likes?: boolean | null }>(api.url, `${path}&likes=${likes}`, { method: 'POST', token: api.token })
  return result?.Likes ?? null
}

/** Was bewertet wird: bei Folgen die Serie, sonst der Titel. */
export function ratingTarget(target: Item): string | null {
  if (target.Type === 'Episode' || target.Type === 'Season') return target.SeriesId ?? null
  if (target.Type === 'Movie' || target.Type === 'Series') return target.Id
  return null
}

/** Personen der Besetzung als Karten (Schauspieler zuerst, dann Regie, Drehbuch). */
export function castOf(target: Item, limit = 30): Item[] {
  const order: Record<string, number> = { Actor: 0, GuestStar: 1, Director: 2, Writer: 3 }
  return (target.People ?? [])
    .filter(p => p.Type === undefined || p.Type in order)
    .sort((a, b) => (order[a.Type ?? 'Actor'] ?? 9) - (order[b.Type ?? 'Actor'] ?? 9))
    .slice(0, limit)
    .map(p => ({ Id: p.Id, Name: p.Name, Type: 'Person', Role: p.Role || (p.Type === 'Director' ? 'Regie' : p.Type === 'Writer' ? 'Drehbuch' : undefined), ImageTags: p.PrimaryImageTag ? { Primary: p.PrimaryImageTag } : undefined }))
}

/** Neueste Filme und Serien mit Hintergrundbild (für das Banner ohne Plugin). */
export const newestWithBackdrop = (api: Api, limit = 8) =>
  items(api, `/Users/${api.userId}/Items?IncludeItemTypes=Movie,Series&Recursive=true&SortBy=DateCreated&SortOrder=Descending&ImageTypes=Backdrop&limit=${limit}&Fields=${FIELDS}&${IMAGES}`)

/** Begründungen der Empfehlungen: Id ohne Bindestriche (klein) → Text. */
export async function reasons(api: Api): Promise<Record<string, string>> {
  try {
    const result = await get<Record<string, unknown>>(api, '/LocalRecs/Recommendations/Reasons')
    const map: Record<string, string> = {}
    for (const [key, value] of Object.entries(result ?? {})) {
      if (typeof value === 'string' && value.trim()) map[key.replace(/-/g, '').toLowerCase()] = value.trim()
    }
    return map
  } catch {
    return {}
  }
}

export const reasonKey = (id: string) => id.replace(/-/g, '').toLowerCase()

/** Adresse des ersten lokalen Trailers (vom Server, nicht YouTube) – oder null. */
export async function localTrailerUrl(api: Api, target: Item): Promise<string | null> {
  if (!target.LocalTrailerCount) return null
  try {
    const trailers = await get<Item[]>(api, `/Users/${api.userId}/Items/${target.Id}/LocalTrailers`)
    const trailer = trailers?.[0]
    if (!trailer) return null
    return `${api.url.replace(/\/+$/, '')}/Videos/${trailer.Id}/stream?static=true&api_key=${encodeURIComponent(api.token)}`
  } catch {
    return null
  }
}
