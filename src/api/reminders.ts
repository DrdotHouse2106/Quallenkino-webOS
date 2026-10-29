import { authorizationHeader, deviceId } from './auth'
import { HttpError, request } from './http'
import type { Api } from './items'

/** Live-TV-Erinnerungen (Plugin Local Recommendations ab 12.20): Sendungen merken, Kalender aufs Handy. */

export interface Calendar {
  Url: string
  WebcalUrl: string
  /** Abo-Seite (ab LocalRecs 12.23): Ziel des QR-Codes für alle Handys. */
  PageUrl?: string
}

/** Id ohne Bindestriche, klein (so liefert das Plugin sie zurück). */
export const reminderKey = (id: string) => id.replace(/-/g, '').toLowerCase()

const availability = new Map<string, Promise<boolean>>()

/** Bietet der Server Erinnerungen an? (GET /LocalRecs/Web/Config → „Reminders“: true) */
export function remindersAvailable(api: Api): Promise<boolean> {
  let cached = availability.get(api.url)
  if (!cached) {
    cached = request<{ Reminders?: boolean }>(api.url, '/LocalRecs/Web/Config', { token: api.token })
      .then(config => config?.Reminders === true)
      // Nur eine echte Antwort merken (auch 404 = Plugin fehlt); nach einem Aussetzer beim nächsten Mal neu fragen
      .catch((error: { status?: number }) => {
        if (error?.status !== 404) availability.delete(api.url)
        return false
      })
    availability.set(api.url, cached)
  }
  return cached
}

/** Gemerkte Sendungen: Id → aus einer gemerkten Serie? */
export function parseReminders(list: { ProgramId?: string; IsSeries?: boolean }[] | undefined): Map<string, boolean> {
  return new Map((list ?? []).filter(r => r.ProgramId).map(r => [reminderKey(r.ProgramId!), r.IsSeries === true]))
}

export async function reminders(api: Api): Promise<Map<string, boolean>> {
  return parseReminders(await request<{ ProgramId?: string; IsSeries?: boolean }[]>(api.url, '/LocalRecs/Reminders', { token: api.token }))
}

/** Sendung merken (true) oder vergessen (false). Fehler als HttpError (409 vorbei, 403 kein Live-TV). */
export async function setReminder(api: Api, programId: string, remember: boolean) {
  await request(api.url, `/LocalRecs/Reminders/${reminderKey(programId)}`, { method: remember ? 'POST' : 'DELETE', token: api.token })
}

/** Serie dieser Sendung merken oder vergessen. */
export async function setSeriesReminder(api: Api, programId: string, remember: boolean) {
  await request(api.url, `/LocalRecs/Reminders/Series/${reminderKey(programId)}`, { method: remember ? 'POST' : 'DELETE', token: api.token })
}

/** Abo-Links für den Kalender; renew erzeugt einen neuen Token (der alte Link gilt dann nicht mehr). */
export function calendar(api: Api, renew = false): Promise<Calendar> {
  return request<Calendar>(api.url, renew ? '/LocalRecs/Calendar/Renew' : '/LocalRecs/Calendar', { method: renew ? 'POST' : 'GET', token: api.token })
}

/** QR-Code als SVG (target „page“ Abo-Seite, „webcal“ fürs iPhone, „https“ für andere) – als Bildadresse. */
export async function calendarQr(api: Api, target: 'page' | 'webcal' | 'https'): Promise<string> {
  const response = await fetch(`${api.url.replace(/\/+$/, '')}/LocalRecs/Calendar/Qr?target=${target}`, {
    headers: { Authorization: authorizationHeader(deviceId(), api.token) },
  })
  if (!response.ok) throw new HttpError(response.status, `HTTP ${response.status}`)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await response.text())}`
}
