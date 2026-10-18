import { authorizationHeader, deviceId } from './auth'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  token?: string
  timeoutMs?: number
}

/** Anfrage an den Server; JSON hin und zurück, Fehler als HttpError. */
export async function request<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000)
  try {
    const response = await fetch(baseUrl.replace(/\/+$/, '') + path, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authorizationHeader(deviceId(), options.token),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
    if (!response.ok) throw new HttpError(response.status, `HTTP ${response.status}`)
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  } finally {
    clearTimeout(timer)
  }
}
