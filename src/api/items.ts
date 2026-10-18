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
  UserData?: { PlayedPercentage?: number; PlaybackPositionTicks?: number; Played?: boolean }
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

function get<T>(api: Api, path: string): Promise<T> {
  return request<T>(api.url, path, { token: api.token })
}

async function items(api: Api, path: string): Promise<Item[]> {
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
