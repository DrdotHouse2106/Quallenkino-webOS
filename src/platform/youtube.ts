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
