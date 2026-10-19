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

/** Beim Start höchstens einmal am Tag still prüfen. */
export async function autoCheck(): Promise<string | null> {
  try {
    const last = Number(localStorage.getItem(LAST_CHECK) ?? 0)
    if (Date.now() - last < INTERVAL_MS) return null
    localStorage.setItem(LAST_CHECK, String(Date.now()))
  } catch {
    // ohne Speicher trotzdem prüfen
  }
  return newerVersion().catch(() => null)
}
