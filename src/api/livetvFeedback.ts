import { request } from './http'
import type { Api, Item } from './items'

/**
 * „Heute im TV für dich“: Rückmeldung „Seltener vorschlagen“, „Weniger <Genre>“ und „Nie mehr vorschlagen“
 * (Plugin Local Recommendations ab 12.58, POST/DELETE /LocalRecs/LiveTv/Feedback). Gilt auf dem Server für
 * die ganze Sendung bzw. Serie – also auch im Web und auf anderen Geräten.
 */
export type FeedbackKind = 'weniger' | 'genre_weniger' | 'nie'

export interface FeedbackMark {
  kind: FeedbackKind
  key?: string
  genre?: string
}

/** Diese Genres sagen nichts über den Geschmack (wie auf dem Server übersprungen). */
const GENERIC = ['series', 'movie', 'sports', 'news', 'kids', 'serie', 'film', 'sport', 'nachrichten', 'kinder']

export function feedbackGenre(item: Item): string | undefined {
  return (item.Genres ?? []).map(g => g.trim()).find(g => g && !GENERIC.includes(g.toLowerCase()))
}

export function feedbackTitle(item: Item): string | undefined {
  return (item.SeriesName ?? item.Name)?.trim() || undefined
}

export function feedbackBody(item: Item, kind: FeedbackKind): Record<string, string> {
  const body: Record<string, string> = { ProgramId: item.Id }
  if (item.SeriesId) body.SeriesId = item.SeriesId
  const title = feedbackTitle(item)
  if (title) body.Title = title
  const genre = kind === 'genre_weniger' ? feedbackGenre(item) : undefined
  if (genre) body.Genre = genre
  body.Art = kind
  return body
}

export function undoPath(mark: FeedbackMark, item: Item): string {
  if (mark.kind === 'genre_weniger') return `/LocalRecs/LiveTv/Feedback?genre=${encodeURIComponent(mark.genre ?? feedbackGenre(item) ?? '')}`
  if (mark.key) return `/LocalRecs/LiveTv/Feedback?key=${encodeURIComponent(mark.key)}`
  return `/LocalRecs/LiveTv/Feedback?programId=${encodeURIComponent(item.Id)}`
}

/** Auf der Startseite ausgeblendete Sendungen (bis zur nächsten Server-Antwort bzw. „Rückgängig“). */
const hiddenIds = new Set<string>()
const hiddenTitles = new Set<string>()

export function isHiddenProgram(item: Item): boolean {
  if (item.Type !== 'Program') return false
  return hiddenIds.has(item.Id) || hiddenTitles.has((feedbackTitle(item) ?? '').toLowerCase())
}

function hide(item: Item, kind: FeedbackKind, visible: boolean) {
  const title = (feedbackTitle(item) ?? '').toLowerCase()
  const ids = visible ? (id: string) => hiddenIds.delete(id) : (id: string) => hiddenIds.add(id)
  ids(item.Id)
  if (kind !== 'genre_weniger' && title) {
    if (visible) hiddenTitles.delete(title)
    else hiddenTitles.add(title)
  }
}

export async function sendFeedback(api: Api, item: Item, kind: FeedbackKind): Promise<FeedbackMark> {
  const result = await request<{ Key?: string; Genre?: string }>(api.url, '/LocalRecs/LiveTv/Feedback', {
    method: 'POST', token: api.token, body: feedbackBody(item, kind),
  })
  hide(item, kind, false)
  return { kind, key: result?.Key || undefined, genre: result?.Genre || undefined }
}

export async function undoFeedback(api: Api, item: Item, mark: FeedbackMark): Promise<void> {
  await request(api.url, undoPath(mark, item), { method: 'DELETE', token: api.token }).catch(error => {
    // 404: war schon nicht (mehr) markiert
    if (!(error && (error as { status?: number }).status === 404)) throw error
  })
  hide(item, mark.kind, true)
}
