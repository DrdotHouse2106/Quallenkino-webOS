import { useEffect, useState } from 'preact/hooks'
import { authorizationHeader, deviceId } from '../api/auth'
import type { Api } from '../api/items'

/** Geladene Bilder (Adresse → Objekt-URL), damit jedes Bild nur einmal geholt wird. */
const loaded = new Map<string, Promise<string | null>>()

/**
 * Bild vom eigenen Server mit Anmeldung im Header laden (statt „ApiKey=“ in der Adresse) und als
 * Objekt-URL zurückgeben. Fremde Adressen bleiben unverändert.
 */
export function authorizedImage(api: Api, url: string): Promise<string | null> {
  const base = api.url.replace(/\/+$/, '')
  if (!url.startsWith(`${base}/`)) return Promise.resolve(url)
  let cached = loaded.get(url)
  if (!cached) {
    cached = fetch(url, { headers: { Authorization: authorizationHeader(deviceId(), api.token) } })
      .then(response => (response.ok ? response.blob() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then(blob => URL.createObjectURL(blob))
      .catch(() => {
        loaded.delete(url)
        return null
      })
    loaded.set(url, cached)
  }
  return cached
}

/** Hook: Bildadresse mit Anmeldung; null, solange es lädt oder fehlt. */
export function useAuthorizedImage(api: Api, url: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    setSrc(null)
    if (!url) return
    let active = true
    authorizedImage(api, url).then(value => active && setSrc(value))
    return () => {
      active = false
    }
  }, [url])
  return src
}
