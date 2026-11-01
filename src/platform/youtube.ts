import { isTizen, openTizenYouTube } from './platform'

/**
 * YouTube-Trailer in der YouTube-App des Fernsehers öffnen (wie die Android-App die YouTube-App startet).
 * Die App zeigt das Video selbst – Quallenkino legt nichts darüber und greift nicht in den Stream ein.
 */
interface ServiceBridge {
  onservicecallback: (message: string) => void
  call: (uri: string, parameters: string) => void
}

const YOUTUBE_APP = 'youtube.leanback.v4'

export function openYouTube(key: string): Promise<boolean> {
  if (isTizen) return openTizenYouTube(key)
  return launchApp(YOUTUBE_APP, { contentTarget: `https://www.youtube.com/tv?v=${encodeURIComponent(key)}` })
}

/** Andere App auf dem Fernseher starten; false, wenn das nicht geht (z. B. nicht installiert). */
export function launchApp(id: string, params: Record<string, unknown> = {}): Promise<boolean> {
  const Bridge = (window as unknown as { PalmServiceBridge?: new () => ServiceBridge }).PalmServiceBridge
  if (!Bridge) return Promise.resolve(false)
  return new Promise(resolve => {
    const bridge = new Bridge()
    bridge.onservicecallback = message => {
      try {
        resolve(JSON.parse(message).returnValue === true)
      } catch {
        resolve(false)
      }
    }
    bridge.call(
      'luna://com.webos.applicationManager/launch',
      JSON.stringify({ id, params }),
    )
  })
}

/**
 * Player-Seite auf GitHub Pages (site/yt.html): YouTube bettet nur mit echter Herkunft ein, die App
 * selbst läuft unter file:// (sonst Fehler 153).
 */
export const PLAYER_PAGE = 'https://drdothouse2106.github.io/Quallenkino-webOS/yt.html'
const PLAYER_ORIGIN = new URL(PLAYER_PAGE).origin

/** cc=1: deutsche Untertitel an (nur fremdsprachige Trailer); cc=0: keine erzwingen. */
export function playerUrl(key: string, volume: number, subtitles = false): string {
  return `${PLAYER_PAGE}?v=${encodeURIComponent(key)}&vol=${Math.round(volume * 100)}&cc=${subtitles ? 1 : 0}`
}

const GERMAN = ['de', 'deu', 'ger', 'german', 'deutsch']

/**
 * Deutsche Untertitel nur bei fremdsprachigen Trailern: Sprache aus /LocalRecs/Discover („de“, „OmU“,
 * „en“ …) oder die Kennzeichnung („EN“, „OmU“; leer = deutsch). Deutsch, OmU (meist eingebrannt) und
 * Unbekanntes: keine.
 */
export function subtitlesFor(language?: string | null): boolean {
  const lang = (language ?? '').trim().toLowerCase()
  return lang !== '' && lang !== 'omu' && !GERMAN.includes(lang.split(/[-_]/)[0])
}

/** „Trailer ansehen (EN)“ bzw. „(OmU)“ wie im Web; deutsche oder unbekannte ohne Zusatz. */
export function trailerButtonLabel(text: string, language?: string | null): string {
  const lang = (language ?? '').trim()
  if (lang.toLowerCase() === 'omu') return `${text} (OmU)`
  return subtitlesFor(lang) ? `${text} (${lang.toUpperCase()})` : text
}

/** Meldung der Player-Seite: bereit, Zustand (1 läuft, 2 Pause, 0 Ende) oder Fehler. */
export type PlayerEvent = { event: 'ready' } | { event: 'state'; data: number } | { event: 'error'; data: number }

/** Meldungen genau dieses Player-Fensters empfangen; gibt die Abmeldung zurück. */
export function listenToPlayer(frame: () => HTMLIFrameElement | null, onEvent: (event: PlayerEvent) => void): () => void {
  const handler = (message: MessageEvent) => {
    if (message.origin !== PLAYER_ORIGIN || message.source !== frame()?.contentWindow) return
    const data = message.data as { qk?: string; event?: string; data?: number } | null
    if (data?.qk === 'yt' && data.event) onEvent({ event: data.event, data: data.data } as PlayerEvent)
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}

/** Befehl an das Player-Fenster: abspielen, anhalten oder umschalten. */
export function commandPlayer(frame: HTMLIFrameElement | null, cmd: 'play' | 'pause' | 'toggle') {
  frame?.contentWindow?.postMessage({ qk: 'yt', cmd }, PLAYER_ORIGIN)
}
