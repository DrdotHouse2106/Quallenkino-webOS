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
      JSON.stringify({ id: YOUTUBE_APP, params: { contentTarget: `https://www.youtube.com/tv?v=${encodeURIComponent(key)}` } }),
    )
  })
}

/**
 * Player-Seite auf GitHub Pages (site/yt.html): YouTube bettet nur mit echter Herkunft ein, die App
 * selbst läuft unter file:// (sonst Fehler 153).
 */
export const PLAYER_PAGE = 'https://drdothouse2106.github.io/Quallenkino-webOS/yt.html'
const PLAYER_ORIGIN = new URL(PLAYER_PAGE).origin

export function playerUrl(key: string, volume: number): string {
  return `${PLAYER_PAGE}?v=${encodeURIComponent(key)}&vol=${Math.round(volume * 100)}`
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
