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

/** Zeit je Versuch; alle Versuche laufen gleichzeitig. */
const PROBE_TIMEOUT_MS = 3_000

const isIpAddress = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')

/**
 * Mögliche Adressen zu einer Eingabe, die wahrscheinlichste zuerst. Ohne „http(s)://“ wird https und
 * http probiert, ohne Port zusätzlich die Standard-Ports 8920 (https) und 8096 (http).
 * Bei einer IP-Adresse zuerst http://…:8096 – so läuft Jellyfin im Heimnetz meistens.
 */
export function candidateUrls(input: string): string[] {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (!trimmed) return []
  if (/^https?:\/\//i.test(trimmed)) return [trimmed]
  const [hostPort, ...rest] = trimmed.split('/')
  const path = rest.length ? '/' + rest.join('/') : ''
  const hasPort = /:\d+$/.test(hostPort)
  const host = hostPort.replace(/:\d+$/, '')
  if (isIpAddress(host)) {
    if (hasPort) return [`http://${trimmed}`, `https://${trimmed}`]
    return [`http://${host}:8096${path}`, `http://${trimmed}`, `https://${host}:8920${path}`, `https://${trimmed}`]
  }
  // Namen (z. B. kino.example.de) nur verschlüsselt – http nur bei IP-Adressen oder ausdrücklichem „http://“,
  // sonst könnte das Passwort unbemerkt im Klartext übertragen werden
  const urls = [`https://${trimmed}`]
  if (!hasPort) urls.push(`https://${host}:8920${path}`)
  return urls
}

async function probe(url: string): Promise<ServerInfo | null> {
  try {
    const info = await request<PublicSystemInfo>(url, '/System/Info/Public', { timeoutMs: PROBE_TIMEOUT_MS })
    return info?.Id ? { url, id: info.Id, name: info.ServerName, version: info.Version } : null
  } catch {
    return null
  }
}

/**
 * Erreichbare Adresse mit einem Jellyfin-Server dahinter. Alle Versuche laufen gleichzeitig;
 * gewählt wird die erste in der Reihenfolge von candidateUrls, die antwortet (höchstens ~3 s).
 */
export async function findServer(input: string): Promise<ServerInfo | null> {
  const attempts = candidateUrls(input).map(probe)
  for (const attempt of attempts) {
    const found = await attempt
    if (found) return found
  }
  return null
}
