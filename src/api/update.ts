import { APP_VERSION } from '../brand'

const LATEST_URL = 'https://api.github.com/repos/DrdotHouse2106/Quallenkino-webOS/releases/latest'
const LAST_CHECK = 'qk.updateCheck'
const INTERVAL_MS = 20 * 60 * 60 * 1000

/** Paketquelle für den Homebrew Channel (GitHub Pages, wird bei jedem Release neu erzeugt). */
export const HOMEBREW_REPO = 'https://drdothouse2106.github.io/Quallenkino-webOS/homebrew/apps.json'

/** „1.0.10“ > „1.0.9“; „v“ vorne und Zusätze („-beta“) zählen nicht. */
export function isNewer(remote: string, local: string): boolean {
  const parts = (value: string) => value.trim().replace(/^v/, '').split('-')[0].split('.').map(n => Number(n) || 0)
  const a = parts(remote)
  const b = parts(local)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/** Neueste Version aus den GitHub-Releases, wenn sie neuer ist als diese App; sonst null. */
export async function newerVersion(): Promise<string | null> {
  const response = await fetch(LATEST_URL, { headers: { Accept: 'application/vnd.github+json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const tag = ((await response.json()) as { tag_name?: string }).tag_name
  return tag && isNewer(tag, APP_VERSION) ? tag.replace(/^v/, '') : null
}

/** Homebrew Channel (dort steht Quallenkino mit „Update“, wenn die Quelle eingetragen ist). */
export const HOMEBREW_APP = 'org.webosbrew.hbchannel'

const CHECK_CACHE = 'qk.updateResult'

/**
 * Beim Öffnen still prüfen; null ohne neue Version oder bei Fehlern. GitHub wird höchstens alle 20 Stunden
 * gefragt, dazwischen gilt das gemerkte Ergebnis.
 */
export async function autoCheck(): Promise<string | null> {
  try {
    const cached = JSON.parse(localStorage.getItem(CHECK_CACHE) ?? 'null') as { at: number; version: string | null } | null
    if (cached && Date.now() - cached.at < INTERVAL_MS) return cached.version && isNewer(cached.version, APP_VERSION) ? cached.version : null
  } catch {
    // ohne Speicher einfach fragen
  }
  try {
    const version = await newerVersion()
    try {
      localStorage.setItem(CHECK_CACHE, JSON.stringify({ at: Date.now(), version }))
    } catch {
      // nicht schlimm
    }
    return version
  } catch {
    return null
  }
}

/** Nach „Später“ für diese Version einen Tag lang nicht mehr fragen (der Knopf in der Navigation bleibt). */
export function shouldAsk(version: string): boolean {
  try {
    const [skipped, at] = (localStorage.getItem(LAST_CHECK) ?? '').split('|')
    return !(skipped === version && Date.now() - Number(at) < INTERVAL_MS)
  } catch {
    return true
  }
}

export function postpone(version: string) {
  try {
    localStorage.setItem(LAST_CHECK, `${version}|${Date.now()}`)
  } catch {
    // ohne Speicher wird beim nächsten Öffnen wieder gefragt
  }
}
