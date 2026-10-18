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
}

const KEY = 'qk.settings'
const DEFAULTS: Settings = { subtitles: 'smart', audio: 'own', trailers: true, screensaver: 5, screensaverTrailers: false, screensaverVolume: 0 }
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
