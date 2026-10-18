import { request } from './http'

export interface ServerInfo {
  url: string
  id: string
  name: string
  version: string
}

interface PublicSystemInfo {
  Id: string
  ServerName: string
  Version: string
  ProductName?: string
}

/**
 * Mögliche Adressen zu einer Eingabe. Ohne „http(s)://“ wird zuerst https, dann http probiert,
 * ohne Port zusätzlich die Standard-Ports 8920 (https) und 8096 (http).
 */
export function candidateUrls(input: string): string[] {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (!trimmed) return []
  if (/^https?:\/\//i.test(trimmed)) return [trimmed]
  const hasPort = /:\d+(\/|$)/.test(trimmed)
  const urls = [`https://${trimmed}`, `http://${trimmed}`]
  if (!hasPort) {
    const [host, ...rest] = trimmed.split('/')
    const path = rest.length ? '/' + rest.join('/') : ''
    urls.push(`https://${host}:8920${path}`, `http://${host}:8096${path}`)
  }
  return urls
}

/** Erste erreichbare Adresse mit einem Jellyfin-Server dahinter. */
export async function findServer(input: string): Promise<ServerInfo | null> {
  for (const url of candidateUrls(input)) {
    try {
      const info = await request<PublicSystemInfo>(url, '/System/Info/Public', { timeoutMs: 5_000 })
      if (info?.Id) return { url, id: info.Id, name: info.ServerName, version: info.Version }
    } catch {
      // nächste Adresse probieren
    }
  }
  return null
}
