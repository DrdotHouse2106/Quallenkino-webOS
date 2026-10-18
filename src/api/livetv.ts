import { request } from './http'
import { byIds, items, type Api, type Item } from './items'

/** Live-TV: Sender, Sendungen, „Heute im TV für dich“ und Besetzung (Plugin Local Recommendations). */

const PROGRAM_FIELDS = 'Overview,Genres,ProductionYear,OfficialRating,ChannelInfo'

/** Alle Sender mit laufender Sendung, Favoriten zuerst. */
export const channels = (api: Api) =>
  items(api, `/LiveTv/Channels?userId=${api.userId}&addCurrentProgram=true&enableFavoriteSorting=true&SortBy=SortName&SortOrder=Ascending&EnableImageTypes=Primary&ImageTypeLimit=1&Fields=ChannelInfo`)

/** Sendungen der Sender zwischen `from` und `to` (für den Programmführer). */
export const programs = (api: Api, channelIds: string[], from: Date, to: Date) =>
  items(api, `/LiveTv/Programs?userId=${api.userId}&channelIds=${channelIds.join(',')}&minEndDate=${from.toISOString()}&maxStartDate=${new Date(to.getTime() - 1000).toISOString()}&sortBy=StartDate&enableImages=false&Fields=${PROGRAM_FIELDS}`)

export const program = (api: Api, id: string) =>
  request<Item>(api.url, `/LiveTv/Programs/${id}?userId=${api.userId}`, { token: api.token })

/** „Heute im TV für dich“ (Plugin); ohne Plugin leer. Kommende und laufende Sendungen. */
export async function tvForYou(api: Api, limit = 30): Promise<Item[]> {
  const list = await items(api, `/LocalRecs/Recommendations?type=livetv&limit=${limit}`).catch(() => [] as Item[])
  // Das Plugin liefert nicht immer alle Felder – dann vollständig nachladen
  const incomplete = list.some(i => !i.StartDate || !i.ChannelName)
  const complete = incomplete ? await byIds(api, list.map(i => i.Id)).catch(() => list) : list
  const now = Date.now()
  return complete.filter(i => !i.EndDate || Date.parse(i.EndDate) > now)
}

/** Besetzung einer Sendung aus den Programmdaten (Plugin). */
export interface Credits {
  actors: { name: string; role?: string }[]
  directors: string[]
  writers: string[]
  year?: number
}

interface CreditsResponse {
  Matched?: boolean
  Actors?: { Name: string; Role?: string }[]
  Directors?: string[]
  Writers?: string[]
  Year?: number
}

export async function credits(api: Api, programId: string): Promise<Credits | null> {
  try {
    const result = await request<CreditsResponse>(api.url, `/LocalRecs/LiveTv/Program/${programId.replace(/-/g, '')}/Credits`, { token: api.token, timeoutMs: 8_000 })
    const actors = (result?.Actors ?? []).filter(a => a.Name).map(a => ({ name: a.Name, role: a.Role || undefined }))
    const directors = result?.Directors ?? []
    if (!result?.Matched || (actors.length === 0 && directors.length === 0)) return null
    return { actors, directors, writers: result.Writers ?? [], year: result.Year }
  } catch {
    return null
  }
}

/** „Regie: A, B“ und „Mit: X (Rolle), Y“ (höchstens vier Darsteller), wie im Android-Popup. */
export function creditLines(value: Credits | null, maxActors = 4): string[] {
  if (!value) return []
  const lines: string[] = []
  if (value.directors.length) lines.push(`Regie: ${value.directors.join(', ')}`)
  if (value.actors.length) lines.push(`Mit: ${value.actors.slice(0, maxActors).map(a => (a.role ? `${a.name} (${a.role})` : a.name)).join(', ')}`)
  return lines
}

/** Sender als Favorit markieren bzw. entfernen. */
export const setFavorite = (api: Api, id: string, favorite: boolean) =>
  request(api.url, `/UserFavoriteItems/${id}?userId=${api.userId}`, { method: favorite ? 'POST' : 'DELETE', token: api.token })

// --- Zeiten ---

const pad = (n: number) => String(n).padStart(2, '0')

/** „20:15“ (24 Stunden). */
export function clock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** „20:15–21:45“. */
export function timeRange(item: Item): string {
  if (!item.StartDate || !item.EndDate) return ''
  return `${clock(new Date(item.StartDate))}–${clock(new Date(item.EndDate))}`
}

/**
 * Relative Zeit wie in der Android-App: ab 59,5 Minuten auf ganze Stunden gerundet, sonst Minuten.
 * „in 20 Minuten“, „in 2 Stunden“, „vor 5 Minuten“, „jetzt“.
 */
export function relative(target: Date, now = new Date()): string {
  const minutes = (target.getTime() - now.getTime()) / 60_000
  const abs = Math.abs(minutes)
  if (abs < 0.5) return 'jetzt'
  const [value, unit] = abs >= 59.5 ? [Math.round(abs / 60), 'Stunde'] : [Math.round(abs), 'Minute']
  const text = `${value} ${unit}${value === 1 ? '' : 'n'}`
  return minutes > 0 ? `in ${text}` : `vor ${text}`
}

/** Tag der Sendung: „Heute“, „Morgen“ oder „Mi., 21.10.“. */
export function dayLabel(date: Date, now = new Date()): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((start(date) - start(now)) / 86_400_000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Morgen'
  if (days === -1) return 'Gestern'
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

/** Zeile unter einer Sendung: „Heute 20:15–21:45 · in 2 Stunden · Das Erste“ bzw. „Läuft · noch 25 Min. · ZDF“. */
export function airing(item: Item, now = new Date()): string {
  if (!item.StartDate) return item.ChannelName ?? ''
  const start = new Date(item.StartDate)
  const end = item.EndDate ? new Date(item.EndDate) : null
  const parts: string[] = []
  if (start <= now && end && end > now) {
    parts.push('Läuft', `noch ${Math.max(1, Math.round((end.getTime() - now.getTime()) / 60_000))} Min.`)
  } else {
    parts.push(`${dayLabel(start, now)} ${end ? timeRange(item) : clock(start)}`, relative(start, now))
  }
  if (item.ChannelName) parts.push(item.ChannelName)
  return parts.join(' · ')
}

/** Fortschritt einer laufenden Sendung in Prozent, sonst null. */
export function programProgress(item: Item, now = Date.now()): number | null {
  if (!item.StartDate || !item.EndDate) return null
  const start = Date.parse(item.StartDate)
  const end = Date.parse(item.EndDate)
  if (now < start || now >= end) return null
  return ((now - start) / (end - start)) * 100
}

/** Art der Sendung für die Filter im Programmführer. */
export type GuideFilter = 'all' | 'favorites' | 'movies' | 'series' | 'news' | 'kids' | 'sports'

export function matchesFilter(program: Item, filter: GuideFilter): boolean {
  switch (filter) {
    case 'movies': return !!program.IsMovie
    case 'series': return !!program.IsSeries
    case 'news': return !!program.IsNews
    case 'kids': return !!program.IsKids
    case 'sports': return !!program.IsSports
    default: return true
  }
}
