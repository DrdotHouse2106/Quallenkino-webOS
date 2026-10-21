import { request } from './http'
import type { Api } from './items'

/**
 * Verhaltenssignale für das Plugin Local Recommendations (ab 12.36): Suchbegriffe und geöffnete Detailseiten
 * fließen in die Empfehlungen ein, die Empfehlungen richten sich nach der Tageszeit. Gespeichert wird nur auf
 * dem eigenen Server, wenn der Admin es erlaubt und der Benutzer es nicht abgeschaltet hat.
 */

export interface BehaviorMe {
  Enabled: boolean
  RetentionDays?: number
  MaxEntries?: number
}

/** Abweichung der Ortszeit von UTC in Minuten (z. B. 120 im Sommer). */
export const utcOffsetMinutes = () => -new Date().getTimezoneOffset()

const availability = new Map<string, Promise<boolean>>()

export function behaviorAvailable(api: Api): Promise<boolean> {
  let cached = availability.get(api.url)
  if (!cached) {
    cached = request<{ BehaviorSignals?: boolean }>(api.url, '/LocalRecs/Web/Config', { token: api.token })
      .then(config => config?.BehaviorSignals === true)
      .catch(() => false)
    availability.set(api.url, cached)
  }
  return cached
}

let searchTimer: ReturnType<typeof setTimeout> | undefined

/** Suchbegriff melden – erst nach 2,5 s Tipp-Pause, nur 2–80 Zeichen. */
export function reportSearch(api: Api, term: string) {
  clearTimeout(searchTimer)
  const trimmed = term.trim()
  if (trimmed.length < 2 || trimmed.length > 80) return
  searchTimer = setTimeout(async () => {
    if (!(await behaviorAvailable(api))) return
    request(api.url, '/LocalRecs/Behavior/Search', { method: 'POST', token: api.token, body: { Term: trimmed } }).catch(() => {})
  }, 2_500)
}

/** Geöffnete Detailseite eines Films oder einer Serie melden. */
export async function reportView(api: Api, itemId: string) {
  if (!(await behaviorAvailable(api))) return
  request(api.url, '/LocalRecs/Behavior/View', { method: 'POST', token: api.token, body: { ItemId: itemId } }).catch(() => {})
}

/** Reihenfolge der Empfehlungszeilen für die Tageszeit („movies“, „series“, „livetv“); null ohne Plugin. */
export async function daypartOrder(api: Api): Promise<string[] | null> {
  if (!(await behaviorAvailable(api))) return null
  try {
    const result = await request<{ Order?: string[] }>(api.url, `/LocalRecs/Behavior/Daypart?utcOffsetMinutes=${utcOffsetMinutes()}`, { token: api.token, timeoutMs: 1_500 })
    return result?.Order?.length ? result.Order.map(o => o.toLowerCase()) : null
  } catch {
    return null
  }
}

export async function behaviorMe(api: Api): Promise<BehaviorMe | null> {
  if (!(await behaviorAvailable(api))) return null
  return request<BehaviorMe>(api.url, '/LocalRecs/Behavior/Me', { token: api.token }).catch(() => null)
}

export const setBehaviorEnabled = (api: Api, enabled: boolean) =>
  request(api.url, '/LocalRecs/Behavior/Me', { method: 'POST', token: api.token, body: { Enabled: enabled } })

export const deleteBehavior = (api: Api) =>
  request(api.url, '/LocalRecs/Behavior/Me', { method: 'DELETE', token: api.token })

/** Nur die Plätze der Empfehlungszeilen nach der Reihenfolge tauschen, alle anderen bleiben (testbar). */
export function reorderRows<T>(rows: T[], kindOf: (row: T) => string | null, order: string[] | null): T[] {
  if (!order?.length) return rows
  const slots = rows.map((row, i) => (kindOf(row) ? i : -1)).filter(i => i >= 0)
  const rank = (row: T) => {
    const index = order.indexOf(kindOf(row) ?? '')
    return index < 0 ? Number.MAX_SAFE_INTEGER : index
  }
  const sorted = slots.map(i => rows[i]).sort((a, b) => rank(a) - rank(b))
  const result = [...rows]
  slots.forEach((slot, i) => (result[slot] = sorted[i]))
  return result
}
