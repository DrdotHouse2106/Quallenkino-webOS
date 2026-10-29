import { request } from './http'

/** Profilbilder (Plugin Local Recommendations ab 12.22): Figur und Farbe wählen, das Bild erzeugt der Server. */

export interface AvatarIcon {
  Id: string
  Name: string
  Fit?: 'contain' | 'cover'
  ImageUrl: string
}

export interface AvatarCatalog {
  Name?: string
  License?: string
  Colors: string[]
  Categories: { Id: string; Name: string; Icons: AvatarIcon[] }[]
  Current?: { Icon: string; Color: string } | null
}

const availability = new Map<string, Promise<boolean>>()

/** Bietet der Server Profilbilder an? (GET /LocalRecs/Web/Config → „Avatars“: true) */
export function avatarsAvailable(url: string, token: string): Promise<boolean> {
  let cached = availability.get(url)
  if (!cached) {
    cached = request<{ Avatars?: boolean }>(url, '/LocalRecs/Web/Config', { token })
      .then(config => config?.Avatars === true)
      // Nur eine echte Antwort merken (auch 404 = Plugin fehlt); nach einem Aussetzer beim nächsten Mal neu fragen
      .catch((error: { status?: number }) => {
        if (error?.status !== 404) availability.delete(url)
        return false
      })
    availability.set(url, cached)
  }
  return cached
}

/** Katalog laden; Bildadressen vollständig, leere Kategorien weg. */
export async function avatarCatalog(url: string, token: string): Promise<AvatarCatalog> {
  return normalizeCatalog(await request<AvatarCatalog>(url, '/LocalRecs/Avatars', { token }), url)
}

export function normalizeCatalog(catalog: AvatarCatalog, url: string): AvatarCatalog {
  const base = url.replace(/\/+$/, '')
  return {
    ...catalog,
    Colors: catalog.Colors ?? [],
    Categories: (catalog.Categories ?? [])
      .map(category => ({
        ...category,
        Icons: (category.Icons ?? []).map(icon => ({ ...icon, ImageUrl: /^https?:/.test(icon.ImageUrl) ? icon.ImageUrl : `${base}/${icon.ImageUrl.replace(/^\/+/, '')}` })),
      }))
      .filter(category => category.Icons.length > 0),
  }
}

/** Bild erzeugen lassen und als eigenes Profilbild setzen (gilt für den Benutzer des Tokens). */
export async function applyAvatar(url: string, token: string, icon: string, color: string): Promise<string | undefined> {
  const result = await request<{ PrimaryImageTag?: string }>(url, '/LocalRecs/Avatars/Me', { method: 'POST', token, body: { Icon: icon, Color: color } })
  return result?.PrimaryImageTag
}
