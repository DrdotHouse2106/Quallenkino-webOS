import { APP_NAME, APP_VERSION } from '../brand'

const DEVICE_ID_KEY = 'qk.deviceId'

const memory = new Map<string, string>()
const memoryStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) }

/** Feste Geräte-Id dieses Fernsehers (einmal erzeugt, dann gespeichert). */
export function deviceId(storage: Pick<Storage, 'getItem' | 'setItem'> = typeof localStorage !== 'undefined' ? localStorage : memoryStorage): string {
  let id = storage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = 'qk-' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    storage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

function quote(value: string): string {
  return value.replace(/"/g, "'")
}

/** Authorization-Header im Jellyfin-Format; mit Token, sobald angemeldet. */
export function authorizationHeader(device: string, token?: string, deviceName = 'LG webOS'): string {
  const parts = [
    `Client="${quote(APP_NAME)}"`,
    `Device="${quote(deviceName)}"`,
    `DeviceId="${quote(device)}"`,
    `Version="${quote(APP_VERSION)}"`,
  ]
  if (token) parts.push(`Token="${quote(token)}"`)
  return 'MediaBrowser ' + parts.join(', ')
}
