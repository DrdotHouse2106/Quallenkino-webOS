/** Einstellungen dieser App auf diesem Fernseher (nicht am Server). */

/** Untertitel beim Start: intelligent (wie Android), immer deutsche oder aus. */
export type SubtitleMode = 'smart' | 'always' | 'off'

/** Tonspur beim Start: deutsche bevorzugen oder den Originalton. */
export type AudioMode = 'own' | 'original'

export interface Settings {
  subtitles: SubtitleMode
  audio: AudioMode
  /** Trailer-Vorschau auf Startseite und Detailseite. */
  trailers: boolean
  /** Bildschirmschoner nach so vielen Minuten ohne Tastendruck; 0 = aus. */
  screensaver: number
  /** Teaser bzw. Trailer im Bildschirmschoner (wie Android, ab Werk aus). */
  screensaverTrailers: boolean
  /** Ton der Teaser im Bildschirmschoner: 0 = stumm, sonst Lautstärke (0–1). */
  screensaverVolume: number
  /** Beim Öffnen nach einer neuen Version suchen (GitHub, höchstens alle 20 Stunden). */
  updateCheck: boolean
  /** HDR: automatisch (nur was der Fernseher kann direkt), immer umwandeln oder immer direkt. */
  hdr: import('./player/hdr').HdrMode
}

const KEY = 'qk.settings'
const DEFAULTS: Settings = { subtitles: 'smart', audio: 'own', trailers: true, screensaver: 2, screensaverTrailers: false, screensaverVolume: 0, updateCheck: true, hdr: 'auto' }
let memory: Settings | null = null

export function loadSettings(): Settings {
  if (memory) return memory
  try {
    memory = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    memory = { ...DEFAULTS }
  }
  return memory!
}

export function saveSettings(next: Settings) {
  memory = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ohne Speicher gilt die Einstellung bis zum Neustart
  }
}
