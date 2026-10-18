import type { Item } from '../api/items'

/** Haupttitel: bei Folgen der Serienname. */
export function title(item: Item): string {
  return item.Type === 'Episode' ? item.SeriesName ?? item.Name ?? '' : item.Name ?? ''
}

/** Zweite Zeile bei Folgen: „S1:F3 · Titel“. */
export function subtitle(item: Item): string | null {
  if (item.Type !== 'Episode') return null
  const code = item.ParentIndexNumber != null && item.IndexNumber != null ? `S${item.ParentIndexNumber}:F${item.IndexNumber}` : null
  return [code, item.Name].filter(Boolean).join(' · ') || null
}

/** Eckdaten: Jahr, FSK, Laufzeit, Bewertung, Genres. */
export function facts(item: Item): string[] {
  const list: string[] = []
  if (item.ProductionYear) list.push(String(item.ProductionYear))
  if (item.OfficialRating?.trim()) list.push(item.OfficialRating.trim())
  if (item.RunTimeTicks && item.RunTimeTicks > 0 && item.Type !== 'Series') {
    const minutes = Math.round(item.RunTimeTicks / 600_000_000)
    list.push(minutes >= 60 ? `${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.` : `${minutes} Min.`)
  }
  if (item.CommunityRating) list.push('★ ' + item.CommunityRating.toFixed(1).replace('.', ','))
  if (item.Genres?.length) list.push(item.Genres.slice(0, 2).join(', '))
  return list
}

/** Beschreibung ohne Markdown-Links, HTML-Reste und wörtliche „\n“. */
export function cleanOverview(text?: string): string {
  return (text ?? '')
    .replace(/\\n/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Filme und Serien abwechselnd (Banner). */
export function interleave(items: Item[]): Item[] {
  const movies = items.filter(i => i.Type !== 'Series')
  const series = items.filter(i => i.Type === 'Series')
  const result: Item[] = []
  while (movies.length || series.length) {
    const m = movies.shift()
    if (m) result.push(m)
    const s = series.shift()
    if (s) result.push(s)
  }
  return result
}

/** Fortschritt in Prozent (Weiterschauen), sonst null. */
export function progress(item: Item): number | null {
  const percent = item.UserData?.PlayedPercentage
  return percent && percent > 0 && percent < 100 ? percent : null
}
