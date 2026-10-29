import { request } from './http'
import type { Api } from './items'
import { utcOffsetMinutes } from './behavior'

/**
 * Banner-Auswahl vom Server (Plugin Local Recommendations ab 12.41): täglich wechselnd, gemischt mit gerade
 * Passendem (Weiterschauen, neue Folgen). „Später“ legt einen Titel für einige Wochen aus dem Banner,
 * ohne als Ablehnung zu zählen.
 */

export interface BillboardSelection {
  ids: string[]
  /** Badge je Titel (Id ohne Bindestriche, klein) → „Weiterschauen“, „Neue Folgen“ … */
  reasons: Record<string, string>
}

export interface LaterEntry {
  ItemId: string
  Name?: string
  Until?: string
}

const availability = new Map<string, Promise<boolean>>()

export function billboardAvailable(api: Api): Promise<boolean> {
  let cached = availability.get(api.url)
  if (!cached) {
    cached = request<{ Billboard?: boolean }>(api.url, '/LocalRecs/Web/Config', { token: api.token })
      .then(config => config?.Billboard === true)
      // Nur eine echte Antwort merken (auch 404 = Plugin fehlt); nach einem Aussetzer beim nächsten Mal neu fragen
      .catch((error: { status?: number }) => {
        if (error?.status !== 404) availability.delete(api.url)
        return false
      })
    availability.set(api.url, cached)
  }
  return cached
}

export function parseBillboard(raw: { Items?: { Id?: string }[]; Reasons?: Record<string, string> } | null): BillboardSelection {
  const ids = (raw?.Items ?? []).map(i => i.Id).filter((id): id is string => !!id)
  const reasons: Record<string, string> = {}
  for (const [id, text] of Object.entries(raw?.Reasons ?? {})) {
    if (typeof text === 'string' && text.trim()) reasons[id.replace(/-/g, '').toLowerCase()] = text.trim()
  }
  return { ids, reasons }
}

/** Auswahl für heute; null ohne Plugin oder bei Fehler (dann wählt die App selbst). */
export async function serverBillboard(api: Api, limit: number): Promise<BillboardSelection | null> {
  if (!(await billboardAvailable(api))) return null
  try {
    const raw = await request<{ Items?: { Id?: string }[]; Reasons?: Record<string, string> }>(
      api.url,
      `/LocalRecs/Billboard?limit=${limit}&utcOffsetMinutes=${utcOffsetMinutes()}`,
      { token: api.token },
    )
    return parseBillboard(raw)
  } catch {
    return null
  }
}

/** Titel für `days` Tage aus dem Banner nehmen. */
export async function billboardLater(api: Api, itemId: string, days = 21): Promise<void> {
  await request(api.url, '/LocalRecs/Billboard/Later', { method: 'POST', token: api.token, body: { ItemId: itemId, Days: days } })
}

/** Weggelegte Titel („Wieder zeigen“ in den Einstellungen); null ohne Plugin. */
export async function billboardLaterList(api: Api): Promise<LaterEntry[] | null> {
  if (!(await billboardAvailable(api))) return null
  try {
    return (await request<LaterEntry[]>(api.url, '/LocalRecs/Billboard/Later', { token: api.token })) ?? []
  } catch {
    return null
  }
}

export async function billboardShowAgain(api: Api, itemId: string): Promise<void> {
  await request(api.url, `/LocalRecs/Billboard/Later/${itemId.replace(/-/g, '')}`, { method: 'DELETE', token: api.token })
}
