/**
 * Zielplattform des Builds: LG webOS (Standard) oder Samsung Tizen (`npm run build:tizen`).
 * Fast der ganze Code ist gleich; hier liegen die wenigen Unterschiede (Tasten, Beenden, Gerätename).
 */
export type Platform = 'webos' | 'tizen'

export const PLATFORM: Platform = import.meta.env.VITE_PLATFORM === 'tizen' ? 'tizen' : 'webos'
export const isTizen = PLATFORM === 'tizen'

/** Gerätename im Jellyfin-Dashboard. */
export const DEVICE_NAME = isTizen ? 'Samsung Tizen' : 'LG webOS'

interface TizenApi {
  application: {
    getCurrentApplication(): { exit(): void }
    launchAppControl(control: unknown, appId: string | null, onSuccess?: () => void, onError?: (error: unknown) => void): void
    ApplicationControl?: unknown
  }
  ApplicationControl: new (operation: string, uri?: string | null, mime?: string | null, category?: string | null, data?: unknown[]) => unknown
  ApplicationControlData: new (key: string, value: string[]) => unknown
  tvinputdevice?: {
    registerKey(name: string): void
    getSupportedKeys(): { name: string }[]
  }
}

function tizen(): TizenApi | undefined {
  return (window as unknown as { tizen?: TizenApi }).tizen
}

/** App beenden (Tizen: über die Plattform, webOS: Fenster schließen). */
export function exitApp() {
  const api = tizen()
  if (api) {
    try {
      api.application.getCurrentApplication().exit()
      return
    } catch {
      // weiter mit window.close
    }
  }
  window.close()
}

/**
 * Samsung schickt Medien- und Farbtasten nur an Apps, die sie anmelden. Zurück (10009) und die
 * Pfeiltasten kommen immer an.
 */
const TIZEN_KEYS = ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop', 'MediaRewind', 'MediaFastForward', 'MediaTrackPrevious', 'MediaTrackNext', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue']

export function registerKeys() {
  const input = tizen()?.tvinputdevice
  if (!input) return
  let supported: Set<string>
  try {
    supported = new Set(input.getSupportedKeys().map(key => key.name))
  } catch {
    supported = new Set(TIZEN_KEYS)
  }
  for (const name of TIZEN_KEYS) {
    if (!supported.has(name)) continue
    try {
      input.registerKey(name)
    } catch {
      // Taste gibt es auf dieser Fernbedienung nicht
    }
  }
}

/** Samsung-YouTube-App mit einem Video öffnen; false, wenn das nicht geht. */
export function openTizenYouTube(key: string): Promise<boolean> {
  const api = tizen()
  if (!api) return Promise.resolve(false)
  return new Promise(resolve => {
    try {
      // Video-Adresse plus „PAYLOAD“ (so übergeben Samsung-Apps die Video-Id an die YouTube-App)
      const payload = new api.ApplicationControlData('PAYLOAD', [JSON.stringify({ values: `v=${key}` })])
      const control = new api.ApplicationControl('http://tizen.org/appcontrol/operation/view', `https://www.youtube.com/watch?v=${encodeURIComponent(key)}`, null, null, [payload])
      api.application.launchAppControl(control, '111299001912', () => resolve(true), () => resolve(false))
    } catch {
      resolve(false)
    }
  })
}
