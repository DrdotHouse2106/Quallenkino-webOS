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

export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  getPlayerState(): number
  setVolume(volume: number): void
  getIframe(): HTMLIFrameElement
  destroy(): void
}

interface YTNamespace {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer
}

type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }

/** Offizielle YouTube-IFrame-API einmal laden. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  const win = window as YTWindow
  if (win.YT?.Player) return Promise.resolve(win.YT)
  return new Promise((resolve, reject) => {
    const previous = win.onYouTubeIframeAPIReady
    win.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (win.YT) resolve(win.YT)
    }
    if (!document.querySelector('script[data-youtube-api]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.dataset.youtubeApi = 'true'
      script.onerror = () => reject(new Error('YouTube-API nicht erreichbar'))
      document.head.appendChild(script)
    }
  })
}
